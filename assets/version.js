/**
 * version.js — Single source of truth for the app version (VER-02)
 *
 * Exposes ONE constant object, `AppVersion`, readable from BOTH the page
 * (`window`) and the service-worker (`self`) global scopes — a service worker
 * has no `window`, so this assigns to `self`/`globalThis`.
 *
 * Two values are exposed:
 *   - APP_VERSION    : the hand-set semver (D-01). Touched only at a release
 *                      boundary. This milestone ships as v1.2.0.
 *   - INTEGRITY_TOKEN: a deploy-stamped git short-hash (D-02). The deploy
 *                      GitHub Action sed-replaces the placeholder below with
 *                      ${GITHUB_SHA::7}. When unreplaced (local / file:// open
 *                      where the deploy step never ran) it falls back to 'dev'.
 *
 * The SW derives CACHE_NAME from INTEGRITY_TOKEN, so a deploy never requires
 * hand-editing a cache number again (kills the v209 stale-cache failure class).
 *
 * Pure-synchronous, side-effect-free beyond assigning the global. Zero network
 * calls — no fetch, no XHR, no dynamic import (VER-06).
 */
var AppVersion = (function() {
  'use strict';

  var APP_VERSION = '1.2.2';

  // Deploy-stamped at build time by .github/workflows/deploy.yml. The literal
  // below is the placeholder the sed step replaces; if it is still its
  // unreplaced value, INTEGRITY_TOKEN resolves to 'dev'.
  var BUILD_TOKEN = '__BUILD_TOKEN__';
  var INTEGRITY_TOKEN = (BUILD_TOKEN === ('__BUILD' + '_TOKEN__')) ? 'dev' : BUILD_TOKEN;

  // ──────────────────────────────────────────────────────────────────────
  // Runtime integrity self-check (VER-03, D-08) — fully local, zero network.
  //
  // resolveIntegrityState is a PURE function of its four arguments so the
  // honest-state machine (UI-SPEC "Three honest states") is unit-testable
  // without a service worker, a DOM, or a network. It reads NO globals — the
  // runtime entrypoint below gathers the real inputs and passes them in.
  //
  //   loadedToken        : the deploy token the actually-running/cached pieces
  //                        report (derived locally from the active SW cache name)
  //   sourceToken        : AppVersion.INTEGRITY_TOKEN (the source of truth)
  //   online             : navigator.onLine
  //   recoveryAttempted  : have we already run the genuine recovery this load?
  //
  // States (VER-06: none of these branches touch the network):
  //   tokens match                     → 'clean'   (no nudge; footer stays clean)
  //   differ + offline (any recovery)  → 'offline' (no completion promise, D-11)
  //   differ + online + recovered      → 'wedged'  (no false "refresh", D-12)
  //   differ + online + not recovered  → 'online'  (genuine recovery available)
  // ──────────────────────────────────────────────────────────────────────
  function resolveIntegrityState(input) {
    var loadedToken = input.loadedToken;
    var sourceToken = input.sourceToken;
    var online = input.online;
    var recoveryAttempted = input.recoveryAttempted;

    // Agreement = clean. This is checked FIRST so the footer renders clean
    // optimistically and only ever UPGRADES to a warning (D-09).
    if (loadedToken === sourceToken) {
      return 'clean';
    }
    // Offline: there is nothing to complete the update WITH, so we never make
    // a completion promise — even if a recovery was already attempted (D-11).
    if (!online) {
      return 'offline';
    }
    // Online but a genuine recovery already ran and the mismatch persists:
    // promising another "refresh to complete" would be the looped lie D-12
    // forbids. Degrade to honest guidance (hands off to Phase 29).
    if (recoveryAttempted) {
      return 'wedged';
    }
    // Online, mismatch, recovery not yet attempted: the genuine recovery CAN
    // fetch fresh assets, so "Refresh to complete" is a true promise.
    return 'online';
  }

  // Determine the actually-loaded deploy token from LOCAL sources only — the
  // active SW's cache is named 'sessions-garden-<token>' (see sw.js), so the
  // cache key tells us which deploy's assets are genuinely being served. This
  // uses the CacheStorage API (caches.keys()), which is fully local — NO fetch,
  // NO phone-home (VER-06). Resolves to null when it cannot be determined
  // (no SW / file://), in which case the caller treats the load as clean
  // (optimistic — never cry wolf without evidence).
  function readLoadedToken() {
    return new Promise(function (resolve) {
      try {
        if (typeof caches === 'undefined' || !caches.keys) {
          resolve(null);
          return;
        }
        caches.keys().then(function (names) {
          var prefix = 'sessions-garden-';
          for (var i = 0; i < names.length; i++) {
            if (names[i].indexOf(prefix) === 0) {
              resolve(names[i].slice(prefix.length));
              return;
            }
          }
          resolve(null);
        }).catch(function () { resolve(null); });
      } catch (e) {
        resolve(null);
      }
    });
  }

  // Module-level "have we already attempted recovery this load?" flag. Set by
  // the genuine-recovery action (added in the page-side block below) and read
  // by the runtime entrypoint to distinguish 'online' (first try) from
  // 'wedged' (recovery already failed).
  var _recoveryAttempted = false;

  // Runtime entrypoint: gather the real LOCAL inputs and resolve the state.
  // Returns a Promise<state>. Never throws; never touches the network.
  function checkIntegrity() {
    return readLoadedToken().then(function (loadedToken) {
      // No evidence of a loaded token (no SW / file://) → treat as clean.
      if (loadedToken === null || loadedToken === undefined) {
        return 'clean';
      }
      var online = (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean')
        ? navigator.onLine : true;
      return resolveIntegrityState({
        loadedToken: loadedToken,
        sourceToken: INTEGRITY_TOKEN,
        online: online,
        recoveryAttempted: _recoveryAttempted
      });
    });
  }

  // ──────────────────────────────────────────────────────────────────────
  // Early-lifecycle inline 4-language strings (VER-03, UI-SPEC Copywriting
  // Contract). The integrity check may run BEFORE i18n.js loads, so these
  // strings live HERE (colocated, never routed through i18n.js/t()), mirroring
  // db.js's DB_STRINGS + dbStr. HE is gender-neutral (Phase 18). Tone for
  // "your data is safe" / "refresh" reuses DB_STRINGS.migrationFailed /
  // DB_STRINGS.refresh for consistency.
  // ──────────────────────────────────────────────────────────────────────
  var INTEGRITY_STRINGS = {
    en: {
      onlineBody: "This app didn't update cleanly. Refresh to finish updating.",
      onlineCta: "Refresh to complete",
      offlineBody: "Update pending — reconnect to finish updating.",
      wedgedBody: "Couldn't finish updating automatically. Your data is safe.",
      wedgedCta: "Recover the app",
      wedgedReport: "Report a problem",
      dismiss: "Dismiss",
      footerWarn: "Version may not be running correctly — see the update notice above."
    },
    he: {
      onlineBody: "האפליקציה לא התעדכנה במלואה. רענון ישלים את העדכון.",
      onlineCta: "רענון להשלמה",
      offlineBody: "העדכון ממתין — יש להתחבר מחדש כדי להשלים את העדכון.",
      wedgedBody: "לא ניתן היה להשלים את העדכון אוטומטית. הנתונים שלך בטוחים.",
      wedgedCta: "שחזור האפליקציה",
      wedgedReport: "דיווח על תקלה",
      dismiss: "סגירה",
      footerWarn: "ייתכן שהגרסה אינה פועלת כראוי — ראו את הודעת העדכון למעלה."
    },
    de: {
      onlineBody: "Die App wurde nicht vollständig aktualisiert. Aktualisieren, um das Update abzuschliessen.",
      onlineCta: "Aktualisieren zum Abschliessen",
      offlineBody: "Update ausstehend — neu verbinden, um das Update abzuschliessen.",
      wedgedBody: "Update konnte nicht automatisch abgeschlossen werden. Deine Daten sind sicher.",
      wedgedCta: "App wiederherstellen",
      wedgedReport: "Problem melden",
      dismiss: "Schliessen",
      footerWarn: "Version läuft möglicherweise nicht korrekt — siehe Update-Hinweis oben."
    },
    cs: {
      onlineBody: "Aplikace se plně neaktualizovala. Obnovením dokončíte aktualizaci.",
      onlineCta: "Obnovit pro dokončení",
      offlineBody: "Aktualizace čeká — pro dokončení se znovu připojte.",
      wedgedBody: "Aktualizaci se nepodařilo dokončit automaticky. Tvoje data jsou v bezpeci.",
      wedgedCta: "Obnovit aplikaci",
      wedgedReport: "Nahlásit problém",
      dismiss: "Zavřít",
      footerWarn: "Verze nemusí běžet správně — viz oznámení o aktualizaci výše."
    }
  };

  function integStr(key) {
    var lang = 'en';
    try { lang = (typeof localStorage !== 'undefined' && localStorage.getItem('portfolioLang')) || 'en'; } catch (e) {}
    var strings = INTEGRITY_STRINGS[lang] || INTEGRITY_STRINGS.en;
    return strings[key] || INTEGRITY_STRINGS.en[key] || key;
  }

  // ──────────────────────────────────────────────────────────────────────
  // The genuine recovery (D-10). NOT a cosmetic location.reload() — a plain
  // reload just re-serves the stale cache. This: registration.update() →
  // delete stale HTTP/asset caches (reusing the sw.js activate-handler idiom)
  // → reload to pick up the fresh SW. IndexedDB is NEVER touched (only HTTP
  // caches). Flips the module-level recovery-attempted flag so a persistent
  // mismatch escalates to 'wedged' on the next check (D-12). No new network
  // call beyond the SW's own update mechanism (VER-06).
  // ──────────────────────────────────────────────────────────────────────
  function runGenuineRecovery() {
    _recoveryAttempted = true;
    var swReady = (typeof navigator !== 'undefined' && navigator.serviceWorker && navigator.serviceWorker.ready)
      ? navigator.serviceWorker.ready : Promise.resolve(null);
    return swReady
      .then(function (reg) {
        return (reg && reg.update) ? reg.update() : null;
      })
      .then(function () {
        if (typeof caches === 'undefined' || !caches.keys) return null;
        return caches.keys().then(function (names) {
          var prefix = 'sessions-garden-';
          var sourceName = prefix + INTEGRITY_TOKEN;
          // Delete every app cache that is NOT the source-of-truth deploy's
          // cache — i.e. the stale 'Frankenstein' caches.
          return Promise.all(names
            .filter(function (n) { return n.indexOf(prefix) === 0 && n !== sourceName; })
            .map(function (n) { return caches.delete(n); }));
        });
      })
      .catch(function (err) {
        try { console.warn('[integrity] genuine recovery failed:', err && err.message); } catch (e) {}
      })
      .then(function () {
        try { if (typeof location !== 'undefined' && location.reload) location.reload(); } catch (e) {}
      });
  }

  // ──────────────────────────────────────────────────────────────────────
  // Nudge DOM builder (D-10/D-11/D-12) — a severity variant of the
  // .db-error-banner family (createElement + textContent, NEVER innerHTML;
  // role="alert"; document.body.prepend; getElementById duplicate guard).
  // The body copy + button set are BOUND to the resolved state so the words
  // can never disagree with what the button does:
  //   online  → info band, genuine-recovery CTA, completion promise
  //   offline → warning band, NO CTA, reconnect-only copy (D-11)
  //   wedged  → danger band, recover + report CTAs (no false "refresh", D-12)
  // ──────────────────────────────────────────────────────────────────────
  function buildNudge(state) {
    if (typeof document === 'undefined') return null;
    var existing = document.getElementById('integrityNudge');
    if (existing) return existing; // duplicate-render guard (db.js:409-410)

    var nudge = document.createElement('div');
    nudge.id = 'integrityNudge';
    nudge.setAttribute('role', 'alert');
    nudge.className = 'integrity-nudge integrity-nudge--' + state;
    // Set dir defensively from portfolioLang (banner may render before page dir).
    try {
      var lang = (typeof localStorage !== 'undefined' && localStorage.getItem('portfolioLang')) || 'en';
      nudge.dir = (lang === 'he') ? 'rtl' : 'ltr';
    } catch (e) {}

    var bodyKey = state === 'offline' ? 'offlineBody'
      : state === 'wedged' ? 'wedgedBody'
      : 'onlineBody';
    var msg = document.createElement('span');
    msg.className = 'integrity-nudge-body';
    msg.textContent = integStr(bodyKey);
    nudge.append(msg);

    if (state === 'online') {
      var cta = document.createElement('button');
      cta.className = 'integrity-nudge-btn';
      cta.setAttribute('data-role', 'cta');
      cta.textContent = integStr('onlineCta');
      cta.onclick = function () { return runGenuineRecovery(); };
      nudge.append(cta);
    } else if (state === 'wedged') {
      var recover = document.createElement('button');
      recover.className = 'integrity-nudge-btn';
      recover.setAttribute('data-role', 'cta');
      recover.textContent = integStr('wedgedCta');
      // Phase 29 OBS-03: route the wedged "couldn't finish automatically" path
      // to the real reset & recover escape hatch (db.js showDBMigrationError,
      // Plan 02) — a surface that lets the user export-around-failure and then
      // wipe+reload, instead of the cosmetic reload that re-runs the failing
      // migration forever. Fall back to the genuine recovery if the hatch is
      // unavailable (e.g. PortfolioDB not loaded), never making the false
      // "refresh to complete" promise.
      recover.onclick = function () {
        try {
          var DB = (typeof window !== 'undefined' && window.PortfolioDB) || null;
          if (DB && typeof DB._showDBMigrationError === 'function') {
            DB._showDBMigrationError(new Error('integrity wedged: manual recovery requested'));
            return;
          }
        } catch (e) { /* fall through to genuine recovery */ }
        return runGenuineRecovery();
      };
      var report = document.createElement('button');
      report.className = 'integrity-nudge-btn integrity-nudge-btn--secondary';
      report.setAttribute('data-role', 'report');
      report.textContent = integStr('wedgedReport');
      // Phase 29 OBS-02: route the wedged report stub to the dedicated report
      // screen so the user can hand a diagnostic log to support.
      report.onclick = function () {
        try { window.location.href = './report.html'; } catch (e) {}
      };
      nudge.append(recover, report);
    }
    // offline: NO action button (D-11) — reconnect copy only.

    // Dismiss affordance (real <button>, RTL-safe inset-inline-end via CSS).
    var close = document.createElement('button');
    close.className = 'integrity-nudge-close';
    close.setAttribute('data-role', 'close');
    close.setAttribute('aria-label', integStr('dismiss'));
    close.textContent = '✕'; // ✕
    close.onclick = function () {
      var el = document.getElementById('integrityNudge');
      if (el && el.parentNode && el.parentNode.removeChild) el.parentNode.removeChild(el);
    };
    nudge.append(close);

    document.body.prepend(nudge);
    return nudge;
  }

  // One-directional footer marker (D-09): once a mismatch is detected the
  // footer ⚠ may NOT downgrade back to clean within the same load. Given the
  // previous marked state and a freshly-resolved state, returns whether the
  // footer should show the ⚠ marker.
  function footerMarkerForState(prevMarked, state) {
    if (prevMarked) return true;                 // never downgrade within a load
    return state !== 'clean';                    // upgrade on any non-clean state
  }

  var exported = {
    APP_VERSION: APP_VERSION,
    INTEGRITY_TOKEN: INTEGRITY_TOKEN,
    resolveIntegrityState: resolveIntegrityState,
    readLoadedToken: readLoadedToken,
    checkIntegrity: checkIntegrity,
    INTEGRITY_STRINGS: INTEGRITY_STRINGS,
    integStr: integStr,
    buildNudge: buildNudge,
    runGenuineRecovery: runGenuineRecovery,
    footerMarkerForState: footerMarkerForState,
    // Recovery-attempted flag accessors (the recovery action sets it; the
    // entrypoint reads it). Exposed so the page-side nudge code can flip it.
    _markRecoveryAttempted: function () { _recoveryAttempted = true; },
    _wasRecoveryAttempted: function () { return _recoveryAttempted; }
  };

  // Assign to a global readable from both page (window) and worker (self) scope.
  (typeof self !== 'undefined' ? self
    : typeof globalThis !== 'undefined' ? globalThis
    : this).AppVersion = exported;

  return exported;
})();
