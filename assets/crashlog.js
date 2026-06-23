/**
 * crashlog.js — OBS-01 local crash-log capture module (Phase 29).
 *
 * Captures uncaught errors (`window.onerror`) and unhandled promise rejections
 * (`unhandledrejection`) and persists the most recent entries entirely ON the
 * user's device. Two stores back the log (D-02):
 *
 *   - PRIMARY: an IndexedDB `crashlog` object store (db.js v6) — structured,
 *     holds the full bounded set.
 *   - MIRROR : the last few entries written DIRECTLY to localStorage under
 *     `crashlogBuffer`. The mirror exists precisely so that an IndexedDB
 *     open/migration failure — the exact scenario OBS-03 recovers from — is
 *     STILL captured and reportable. The mirror write therefore NEVER routes
 *     through openDB(); it is a plain guarded localStorage.setItem.
 *
 * Retention (D-03) is prune-on-write: on every append we drop entries older
 * than 30 days AND trim to the 50 most-recent (whichever bound is tighter).
 * No timer — a pure filter + slice each append.
 *
 * The module installs its handlers in its body so they catch errors thrown by
 * scripts that load AFTER it. A tiny inline <head> handler on each page (see
 * Task 2) buffers errors thrown BEFORE this file loads into the same
 * `crashlogBuffer` key; on load this module ingests that early buffer so
 * nothing is lost.
 *
 * Stable seam: `CrashLog.logError(entry)` is the entry point Phase 28's
 * integrity self-check (28-CONTEXT D-12) and the Phase 29 report screen call.
 * It normalizes the entry, runs it through the same append/prune/dual-store
 * path, and NEVER throws.
 *
 * Constraints honored verbatim: zero-build, zero-npm, IIFE-global served as-is,
 * IndexedDB only, and ZERO network calls — no fetch, no XMLHttpRequest, no
 * dynamic import anywhere in this file (VER-06 carry-over). Every handler and
 * every storage operation is wrapped in the never-throwing guard idiom from
 * version.js so the logger can never itself crash a page.
 */
var CrashLog = (function () {
  'use strict';

  var MIRROR_KEY = 'crashlogBuffer';
  var MAX_ENTRIES = 50;            // count ceiling (D-03)
  var MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days (D-03)
  var MIRROR_DEPTH = 5;            // last N entries kept in the localStorage mirror

  // ──────────────────────────────────────────────────────────────────────
  // Pre-i18n 4-language strings (Surface B) — the report screen (Wave 2) and
  // the empty state render before i18n.js may exist, so strings live HERE,
  // mirroring db.js DB_STRINGS / version.js INTEGRITY_STRINGS. HE is
  // gender-neutral (Phase 18).
  // ──────────────────────────────────────────────────────────────────────
  var CRASHLOG_STRINGS = {
    en: {
      emptyHeading: 'No problems logged',
      emptyBody: 'Nothing has gone wrong on this device. There is nothing to report.'
    },
    he: {
      emptyHeading: 'לא נרשמו תקלות',
      emptyBody: 'לא אירעה שום תקלה במכשיר הזה. אין על מה לדווח.'
    },
    de: {
      emptyHeading: 'Keine Probleme protokolliert',
      emptyBody: 'Auf diesem Gerät ist nichts schiefgelaufen. Es gibt nichts zu melden.'
    },
    cs: {
      emptyHeading: 'Žádné problémy nezaznamenány',
      emptyBody: 'Na tomto zařízení nic nesehlo špatně. Není co hlásit.'
    }
  };

  function clStr(key) {
    var lang = 'en';
    try {
      lang = (typeof localStorage !== 'undefined' && localStorage.getItem('portfolioLang')) || 'en';
    } catch (e) { /* localStorage unavailable — fall back to en */ }
    var strings = CRASHLOG_STRINGS[lang] || CRASHLOG_STRINGS.en;
    return strings[key] || CRASHLOG_STRINGS.en[key] || key;
  }

  // ──────────────────────────────────────────────────────────────────────
  // Helpers — every one is guarded so the logger can never throw into a page.
  // ──────────────────────────────────────────────────────────────────────

  function warn(msg, err) {
    try { console.warn('[crashlog] ' + msg, err); } catch (_) { /* noop */ }
  }

  function now() {
    try { return Date.now(); } catch (e) { return 0; }
  }

  // A monotonic-ish local id so entries are distinguishable even before the IDB
  // autoIncrement key is assigned (the mirror has no DB key).
  var _seq = 0;
  function nextId() {
    _seq += 1;
    return String(now()) + '-' + _seq;
  }

  // Normalize an arbitrary input into a bounded, plain crash entry. Never throws.
  function normalize(input) {
    var entry = {};
    try {
      input = input || {};
      var ts = input.timestamp;
      if (typeof ts !== 'number') {
        var n = Number(ts);
        ts = isNaN(n) ? now() : n;
      }
      entry.id = input.id != null ? input.id : nextId();
      entry.timestamp = ts;
      entry.message = String(input.message == null ? '' : input.message).slice(0, 2000);
      entry.stack = String(input.stack == null ? '' : input.stack).slice(0, 8000);
      entry.url = String(input.url == null ? '' : input.url).slice(0, 2000);
      entry.source = String(input.source == null ? '' : input.source).slice(0, 200);
    } catch (e) {
      warn('normalize failed', e);
    }
    return entry;
  }

  // Prune-on-write (D-03): drop > 30 days old, then keep the 50 most recent.
  function prune(entries) {
    var out = entries;
    try {
      var cutoff = now() - MAX_AGE_MS;
      out = entries.filter(function (e) {
        return e && typeof e.timestamp === 'number' && e.timestamp >= cutoff;
      });
      // Most-recent-first, then cap at the count ceiling.
      out.sort(function (a, b) { return (b.timestamp || 0) - (a.timestamp || 0); });
      if (out.length > MAX_ENTRIES) out = out.slice(0, MAX_ENTRIES);
    } catch (e) {
      warn('prune failed', e);
    }
    return out;
  }

  // ── localStorage mirror — DIRECT, never via openDB() ───────────────────
  // This is the crash-survival path: it must work even when IndexedDB is the
  // thing that is broken. Hence a plain guarded read/write, no DB involvement.
  function readMirror() {
    try {
      if (typeof localStorage === 'undefined') return [];
      var raw = localStorage.getItem(MIRROR_KEY);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      warn('readMirror failed', e);
      return [];
    }
  }

  function writeMirror(entries) {
    try {
      if (typeof localStorage === 'undefined') return;
      // Mirror only the most-recent few — enough to make an IDB-failure report
      // useful without bloating localStorage.
      var recent = prune(entries).slice(0, MIRROR_DEPTH);
      localStorage.setItem(MIRROR_KEY, JSON.stringify(recent));
    } catch (e) {
      warn('writeMirror failed', e);
    }
  }

  function getDB() {
    try {
      return (typeof window !== 'undefined' && window.PortfolioDB) ||
             (typeof self !== 'undefined' && self.PortfolioDB) || null;
    } catch (e) {
      return null;
    }
  }

  // ── IndexedDB primary write — best-effort. A failure here MUST NOT prevent
  // the mirror write (which already happened) nor throw. ──────────────────
  function persistToIDB(entries) {
    var db = getDB();
    if (!db || typeof db.replaceAllCrashlog !== 'function') {
      return Promise.resolve(false);
    }
    var pruned = prune(entries);
    try {
      return Promise.resolve(db.replaceAllCrashlog(pruned))
        .then(function () { return true; })
        .catch(function (e) { warn('IDB persist failed', e); return false; });
    } catch (e) {
      warn('IDB persist threw', e);
      return Promise.resolve(false);
    }
  }

  // ── Read the merged entries: IDB primary, mirror as fallback when IDB is
  // unavailable or empty. Most-recent-first. Never throws. ────────────────
  function getEntries() {
    var db = getDB();
    var mirror = readMirror();
    if (!db || typeof db.getAllCrashlog !== 'function') {
      return Promise.resolve(prune(mirror));
    }
    try {
      return Promise.resolve(db.getAllCrashlog())
        .then(function (idbEntries) {
          var list = Array.isArray(idbEntries) ? idbEntries : [];
          // If IDB is empty but the mirror has entries (e.g. IDB was just
          // wiped/failed), fall back to the mirror so a report is still useful.
          if (list.length === 0 && mirror.length > 0) list = mirror;
          return prune(list);
        })
        .catch(function (e) {
          warn('getAllCrashlog failed; using mirror', e);
          return prune(mirror);
        });
    } catch (e) {
      warn('getEntries threw; using mirror', e);
      return Promise.resolve(prune(mirror));
    }
  }

  // ── The single append path. Writes the mirror FIRST (crash-survival), then
  // best-effort persists to IDB. Returns a promise that resolves after the IDB
  // attempt settles; resolves (never rejects) even on total failure. ───────
  function append(rawEntry) {
    var entry = normalize(rawEntry);
    var combined;
    // 1) Build the new working set from the current mirror + IDB (best effort).
    // The mirror is the always-available source; IDB is merged when present.
    return getEntries()
      .catch(function () { return readMirror(); })
      .then(function (existing) {
        try {
          combined = prune((existing || []).concat([entry]));
        } catch (e) {
          combined = [entry];
        }
        // 2) Mirror write — synchronous, direct, openDB-free (crash-survival).
        writeMirror(combined);
        // 3) IDB primary — best effort, never blocks or throws.
        return persistToIDB(combined);
      })
      .catch(function (e) {
        // Absolute backstop: even if the merge/read path itself failed, still
        // guarantee the mirror captures this entry.
        warn('append fell back to mirror-only', e);
        try { writeMirror(readMirror().concat([entry])); } catch (_) {}
        return false;
      });
  }

  // ── Public stable seam (28-CONTEXT D-12 / report screen). Never throws. ──
  function logError(entry) {
    try {
      return append(entry);
    } catch (e) {
      warn('logError threw (swallowed)', e);
      return Promise.resolve(false);
    }
  }

  function clear() {
    // Clear both stores. Never throws.
    try {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(MIRROR_KEY);
    } catch (e) { warn('clear mirror failed', e); }
    var db = getDB();
    if (db && typeof db.clearCrashlog === 'function') {
      try {
        return Promise.resolve(db.clearCrashlog())
          .then(function () { return true; })
          .catch(function (e) { warn('clearCrashlog failed', e); return false; });
      } catch (e) {
        warn('clearCrashlog threw', e);
        return Promise.resolve(false);
      }
    }
    return Promise.resolve(true);
  }

  // ──────────────────────────────────────────────────────────────────────
  // Capture-handler installation. Installed in the module body so it catches
  // errors thrown by scripts that load AFTER this one. Each handler is fully
  // guarded; a failure inside the logger degrades to a console.warn and never
  // re-throws into the page.
  // ──────────────────────────────────────────────────────────────────────
  function buildErrorEntry(message, error, url) {
    var stack = '';
    try { stack = (error && error.stack) ? String(error.stack) : ''; } catch (e) {}
    var u = '';
    try {
      u = url || (typeof location !== 'undefined' ? location.href : '');
    } catch (e) {}
    return {
      timestamp: now(),
      message: message != null ? String(message) : (error ? String(error) : 'Unknown error'),
      stack: stack,
      url: u,
      source: 'onerror'
    };
  }

  function installHandlers() {
    if (typeof window === 'undefined') return;
    try {
      // Chain any pre-existing onerror (e.g. the early inline head handler may
      // have set one) so we never silently drop another consumer's handler.
      var priorOnError = window.onerror;
      window.onerror = function (message, source, lineno, colno, error) {
        try {
          logError(buildErrorEntry(message, error));
        } catch (e) { warn('onerror handler failed', e); }
        if (typeof priorOnError === 'function') {
          try { return priorOnError.apply(this, arguments); } catch (e) { warn('prior onerror failed', e); }
        }
        return false; // do not suppress default browser logging
      };
    } catch (e) {
      warn('install window.onerror failed', e);
    }

    try {
      window.addEventListener('unhandledrejection', function (event) {
        try {
          var reason = event && event.reason;
          var error = (reason instanceof Error) ? reason : null;
          var message = error ? (error.message || String(error))
            : (reason != null ? String(reason) : 'Unhandled promise rejection');
          var entry = buildErrorEntry(message, error);
          entry.source = 'unhandledrejection';
          logError(entry);
        } catch (e) { warn('unhandledrejection handler failed', e); }
      });
    } catch (e) {
      warn('install unhandledrejection failed', e);
    }
  }

  // ──────────────────────────────────────────────────────────────────────
  // Early-buffer ingest. The inline <head> handler (Task 2) buffers errors
  // thrown before this file loads into `crashlogBuffer`. On load we read that
  // mirror and fold it into the persistent log so nothing is lost. Because the
  // mirror IS our localStorage source, simply persisting it to IDB once on load
  // drains it into the primary store while leaving the mirror intact for
  // crash-survival.
  // ──────────────────────────────────────────────────────────────────────
  function ingestEarlyBuffer() {
    try {
      var buffered = readMirror();
      if (buffered.length === 0) return;
      // Re-persist the merged set so early entries land in the IDB primary too.
      persistToIDB(prune(buffered));
    } catch (e) {
      warn('ingestEarlyBuffer failed', e);
    }
  }

  // Install + ingest only when a page/window context exists (not in the SW).
  try {
    installHandlers();
    ingestEarlyBuffer();
  } catch (e) {
    warn('init failed', e);
  }

  var exported = {
    logError: logError,
    getEntries: getEntries,
    clear: clear,
    clStr: clStr,
    CRASHLOG_STRINGS: CRASHLOG_STRINGS
  };

  // Assign to a global readable from both page (window) and worker (self) scope
  // — same reason version.js does the triple: the SW scope has no `window`.
  (typeof self !== 'undefined' ? self
    : typeof globalThis !== 'undefined' ? globalThis
    : this).CrashLog = exported;

  return exported;
})();
