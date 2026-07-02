// ────────────────────────────────────────────────────────────────────────
// report.js — "Report a problem" controller
//
// OWNS: the report page — assembles crash-log entries (CrashLog.getEntries)
//   + diagnostic context into a multi-line text report, runs a best-effort
//   redaction pass, and renders it into an EDITABLE <textarea> so the user's
//   own eyes are the final privacy gate before anything leaves the device.
//   Two user-initiated affordances: "Copy report" (full multi-line log to
//   clipboard) and "Open email" (SHORT mailto: template — never the full log,
//   to avoid URL-length limits and mail-client history leakage). If mailto:
//   proves unreliable in the installed PWA, the screen degrades to copy-only
//   + a visible support address.
// PUBLIC SURFACE: Report (also assigned to self/globalThis) with
//   { init, assembleReport, redactReport, copyReport, openSupportEmail,
//     copyTextToClipboard, SUPPORT_ADDRESS }.
// DEPENDENCIES: CrashLog.{getEntries, clStr} — crash entries + fallback
//   strings. App.{t, showToast} — i18n + toasts. AppVersion.APP_VERSION,
//   PortfolioDB.DB_VERSION — diagnostic context. Clipboard idiom mirrors
//   add-session.js:738-763 (SecureContext + execCommand fallback).
// CONSTRAINTS: nothing is transmitted automatically — Copy and mailto only;
//   the user always reviews the redacted preview before anything leaves the
//   device. Redaction is a best-effort floor, not a guarantee — the editable
//   textarea is the real gate. ZERO network calls. Every DOM + storage op
//   is guarded; never throws.
// ────────────────────────────────────────────────────────────────────────
var Report = (function () {
  'use strict';

  // The Impressum support address. Single constant, no user
  // input — low risk, hardcoded.
  var SUPPORT_ADDRESS = 'contact@sessionsgarden.app';

  // ──────────────────────────────────────────────────────────────────────
  // i18n helper — Surface A (full app). Falls back to the CrashLog 4-language
  // strings for the empty-state heading/body if i18n.js is absent,
  // then to a hardcoded EN literal. Never throws.
  // ──────────────────────────────────────────────────────────────────────
  function t(key, fallback) {
    try {
      if (typeof window !== 'undefined' && window.App && typeof window.App.t === 'function') {
        var v = window.App.t(key);
        if (v && v !== key) return v;
      }
    } catch (e) {}
    return fallback != null ? fallback : key;
  }

  function clStr(key, fallback) {
    try {
      if (typeof window !== 'undefined' && window.CrashLog && typeof window.CrashLog.clStr === 'function') {
        var v = window.CrashLog.clStr(key);
        if (v && v !== key) return v;
      }
    } catch (e) {}
    return fallback != null ? fallback : key;
  }

  function warn(msg, err) {
    try { console.warn('[report] ' + msg, err); } catch (_) {}
  }

  // ──────────────────────────────────────────────────────────────────────
  // Clipboard — verbatim from add-session.js:738-763. Carries the full
  // multi-line log. SecureContext path + execCommand fallback.
  // ──────────────────────────────────────────────────────────────────────
  function copyTextToClipboard(text) {
    if (typeof navigator !== 'undefined' && navigator.clipboard &&
        typeof window !== 'undefined' && window.isSecureContext) {
      return Promise.resolve(navigator.clipboard.writeText(text))
        .then(function () { return true; })
        .catch(function () { return false; });
    }
    try {
      var textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.top = '-1000px';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      textarea.remove();
      return Promise.resolve(ok);
    } catch (e) {
      warn('execCommand copy fallback failed', e);
      return Promise.resolve(false);
    }
  }

  // ──────────────────────────────────────────────────────────────────────
  // Diagnostic context — basic device/app facts. All behind redaction. The
  // exact field set is builder's discretion (plan): app version, UI language,
  // userAgent, DB version, and the crash-entry count.
  // ──────────────────────────────────────────────────────────────────────
  function getLang() {
    try {
      return (typeof localStorage !== 'undefined' && localStorage.getItem('portfolioLang')) || 'en';
    } catch (e) { return 'en'; }
  }

  function appVersion() {
    try {
      if (typeof window !== 'undefined' && window.AppVersion && window.AppVersion.APP_VERSION) {
        return String(window.AppVersion.APP_VERSION);
      }
    } catch (e) {}
    return 'unknown';
  }

  function dbVersion() {
    try {
      if (typeof window !== 'undefined' && window.PortfolioDB && window.PortfolioDB.DB_VERSION != null) {
        return String(window.PortfolioDB.DB_VERSION);
      }
    } catch (e) {}
    return 'unknown';
  }

  function userAgent() {
    try { return (typeof navigator !== 'undefined' && navigator.userAgent) || 'unknown'; }
    catch (e) { return 'unknown'; }
  }

  function buildDiagnosticHeader(entryCount) {
    var lines = [
      'Sessions Garden — problem report',
      '────────────────────────────',
      'App version: ' + appVersion(),
      'DB version: ' + dbVersion(),
      'UI language: ' + getLang(),
      'User agent: ' + userAgent(),
      'Logged problems: ' + entryCount,
      '────────────────────────────',
      ''
    ];
    return lines.join('\n');
  }

  // ──────────────────────────────────────────────────────────────────────
  // assembleReport — build the multi-line text from diagnostic context + the
  // crash entries. Returns a Promise<string>. Never throws.
  // ──────────────────────────────────────────────────────────────────────
  function formatEntry(entry, idx) {
    var ts = '';
    try { ts = new Date(entry.timestamp).toISOString(); } catch (e) { ts = String(entry.timestamp); }
    var parts = [
      '[' + (idx + 1) + '] ' + ts + (entry.source ? ' (' + entry.source + ')' : ''),
      'Message: ' + (entry.message || ''),
    ];
    if (entry.url) parts.push('URL: ' + entry.url);
    if (entry.stack) parts.push('Stack:\n' + entry.stack);
    parts.push('');
    return parts.join('\n');
  }

  function assembleReport() {
    var getEntries = (typeof window !== 'undefined' && window.CrashLog && window.CrashLog.getEntries)
      ? window.CrashLog.getEntries
      : null;
    if (!getEntries) return Promise.resolve({ entries: [], text: '' });
    return Promise.resolve(getEntries())
      .then(function (list) {
        var entries = Array.isArray(list) ? list : [];
        if (entries.length === 0) return { entries: entries, text: '' };
        var body = buildDiagnosticHeader(entries.length);
        for (var i = 0; i < entries.length; i++) {
          body += formatEntry(entries[i], i) + '\n';
        }
        return { entries: entries, text: body };
      })
      .catch(function (e) {
        warn('assembleReport failed', e);
        return { entries: [], text: '' };
      });
  }

  // ──────────────────────────────────────────────────────────────────────
  // redactReport — best-effort scrub of obvious client-identifying tokens
  // (best-effort floor — the editable preview is the real gate).
  // Heuristics (builder's discretion):
  //   - email addresses
  //   - phone-number-like digit runs
  //   - capitalised two-word names embedded in messages/stacks (e.g. a client
  //     name that leaked into an error string)
  // The diagnostic header (app/DB version, language, UA) is preserved — those
  // are non-identifying device facts. The UA string in particular contains
  // capitalised multi-word tokens (e.g. "Intel Mac OS X") that the name
  // heuristic below would otherwise destroy. So we EXTRACT the "User agent:"
  // line before redacting and re-stitch its original value afterward.
  // ──────────────────────────────────────────────────────────────────────
  var UA_LINE_RE = /^(User agent:\s?).*$/m;

  function redactReport(text) {
    if (!text) return text;
    var out = text;
    try {
      // Pull the User-agent line out before redaction so the heuristics
      // can't clobber its (non-identifying) value, then put it back verbatim.
      var uaLine = null;
      var uaMatch = out.match(UA_LINE_RE);
      if (uaMatch) {
        uaLine = uaMatch[0];
        out = out.replace(UA_LINE_RE, 'UA_PLACEHOLDER');
      }
      // Emails.
      out = out.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[redacted-email]');
      // Long digit runs (phone / id-like), 7+ digits.
      out = out.replace(/\b\d{7,}\b/g, '[redacted-number]');
      // Capitalised multi-word personal-name-like tokens (2-3 words, each
      // starting uppercase, Unicode-letter aware). Conservative: requires at
      // least two such words in a row. This is a floor heuristic — it will miss
      // some names and over-redact some legitimate phrases; the editable
      // preview lets the user fix both directions.
      // Inter-word separator is space/tab ONLY (never a newline) so a name
      // heuristic can't span structurally-separate lines (e.g. "...marker ZZZ"
      // followed by a "Stack:" line must NOT be read as one two-word name).
      out = out.replace(
        /\b[A-ZÀ-ÖØ-Þ֐-׿][\p{L}'-]+(?:[ \t]+[A-ZÀ-ÖØ-Þ֐-׿][\p{L}'-]+){1,2}\b/gu,
        function (match) {
          // Preserve a small allowlist of known non-PII multi-word tokens that
          // appear in the diagnostic header / common error strings.
          var keep = ['Sessions Garden', 'App version', 'DB version', 'UI language',
                      'User agent', 'Logged problems', 'Unhandled Rejection',
                      'Unhandled promise', 'Type Error', 'Reference Error',
                      'Range Error', 'Syntax Error', 'Internal Error'];
          for (var k = 0; k < keep.length; k++) {
            if (match === keep[k]) return match;
          }
          return '[redacted-name]';
        }
      );
      // Re-stitch the original User-agent line so its value survives.
      if (uaLine != null) {
        out = out.replace(/ ?UA_PLACEHOLDER ?/, uaLine);
      }
    } catch (e) {
      warn('redactReport failed; returning unredacted (preview is still the gate)', e);
      return text;
    }
    return out;
  }

  // ──────────────────────────────────────────────────────────────────────
  // DOM refs + render.
  // ──────────────────────────────────────────────────────────────────────
  function $(id) {
    try { return (typeof document !== 'undefined') ? document.getElementById(id) : null; }
    catch (e) { return null; }
  }

  function showEmptyState() {
    var empty = $('reportEmptyState');
    var heading = $('reportEmptyHeading');
    var body = $('reportEmptyBody');
    var preview = $('reportPreview');
    var copyBtn = $('reportCopyBtn');

    if (heading) heading.textContent = clStr('emptyHeading', 'No problems logged');
    if (body) {
      body.textContent = t('report.empty.body',
        clStr('emptyBody',
          'Nothing has gone wrong on this device recently. If you’re seeing an issue anyway, you can still describe it in an email to support.'));
    }
    if (empty) empty.hidden = false;
    // Hide the error preview + Copy (nothing to copy). The email button stays so
    // the user can still describe an issue manually.
    if (preview) { preview.value = ''; preview.hidden = true; }
    if (copyBtn) copyBtn.hidden = true;
  }

  function showPreview(text) {
    var empty = $('reportEmptyState');
    var preview = $('reportPreview');
    var copyBtn = $('reportCopyBtn');

    if (empty) empty.hidden = true;
    if (preview) {
      preview.hidden = false;
      preview.value = text;
    }
    if (copyBtn) copyBtn.hidden = false;
  }

  function toast(message) {
    try {
      if (typeof window !== 'undefined' && window.App && typeof window.App.showToast === 'function') {
        window.App.showToast(message);
        return;
      }
    } catch (e) {}
  }

  // ──────────────────────────────────────────────────────────────────────
  // Actions.
  // ──────────────────────────────────────────────────────────────────────
  function copyReport() {
    var preview = $('reportPreview');
    // COPY THE CURRENT textarea value (the user may have edited it — those
    // edits are honored), NOT a stale assembled string.
    var current = preview ? String(preview.value || '') : '';
    if (!current) return Promise.resolve(false);
    return copyTextToClipboard(current).then(function (ok) {
      if (ok) {
        toast(t('report.copy.success', 'Report copied — paste it into your email to support'));
      } else {
        toast(t('report.copy.failed', 'Couldn’t copy automatically — select the text and copy it manually'));
      }
      return ok;
    });
  }

  function openSupportEmail() {
    // SHORT body only — the full log goes via Copy. The body is
    // a "paste below this line" template, never the assembled log.
    var subject = t('report.email.subject', 'Sessions Garden — problem report');
    var body = t('report.email.body',
      'Please describe what happened here, then paste your copied report below this line.\n\n---\n');
    try {
      window.location.href = 'mailto:' + SUPPORT_ADDRESS +
        '?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(body);
    } catch (e) {
      // If mailto: navigation throws, surface the address visibly.
      warn('mailto navigation failed; showing visible support address', e);
      degradeToVisibleAddress();
    }
  }

  // Make the support address visible so the user can
  // copy it manually if the email button is unreliable in the installed PWA.
  function degradeToVisibleAddress() {
    var addr = $('reportSupportAddress');
    var emailBtn = $('reportEmailBtn');
    if (addr) {
      addr.textContent = SUPPORT_ADDRESS;
      try { addr.setAttribute('href', 'mailto:' + SUPPORT_ADDRESS); } catch (e) {}
      addr.hidden = false;
    }
    if (emailBtn) emailBtn.hidden = true;
  }

  function wireActions() {
    var copyBtn = $('reportCopyBtn');
    var emailBtn = $('reportEmailBtn');
    if (copyBtn) copyBtn.onclick = function () { return copyReport(); };
    if (emailBtn) emailBtn.onclick = function () { return openSupportEmail(); };
  }

  // ──────────────────────────────────────────────────────────────────────
  // init — assemble → redact → render preview (or empty state) → wire actions.
  // Returns a Promise that resolves after the first render. Never throws.
  // ──────────────────────────────────────────────────────────────────────
  function init() {
    try {
      // Intro/privacy copy (data-i18n on the page also covers this; we set it
      // defensively in case i18n.js applied before CrashLog strings were ready).
      var intro = $('reportIntro');
      if (intro && !intro.textContent) {
        intro.textContent = t('report.intro',
          'Nothing is sent automatically. Review the report below, copy it, then paste it into an email to support. Your data stays on this device.');
      }
      wireActions();
      return assembleReport().then(function (assembled) {
        if (!assembled.entries || assembled.entries.length === 0) {
          showEmptyState();
          return { empty: true };
        }
        var redacted = redactReport(assembled.text);
        showPreview(redacted);
        return { empty: false };
      }).catch(function (e) {
        warn('init render failed; showing empty state', e);
        showEmptyState();
        return { empty: true, error: true };
      });
    } catch (e) {
      warn('init threw', e);
      try { showEmptyState(); } catch (_) {}
      return Promise.resolve({ empty: true, error: true });
    }
  }

  // Auto-init on DOM ready when running in a real page (not under the test,
  // which calls Report.init() explicitly).
  try {
    if (typeof document !== 'undefined' && typeof window !== 'undefined' && !window.__REPORT_NO_AUTOINIT__) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { init(); });
      } else {
        // Defer a tick so i18n.js / CrashLog have settled.
        setTimeout(function () { init(); }, 0);
      }
    }
  } catch (e) { warn('auto-init wiring failed', e); }

  var exported = {
    SUPPORT_ADDRESS: SUPPORT_ADDRESS,
    init: init,
    assembleReport: assembleReport,
    redactReport: redactReport,
    copyReport: copyReport,
    openSupportEmail: openSupportEmail,
    copyTextToClipboard: copyTextToClipboard
  };

  (typeof self !== 'undefined' ? self
    : typeof globalThis !== 'undefined' ? globalThis
    : this).Report = exported;

  return exported;
})();
