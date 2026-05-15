/**
 * backup-modal.js — the Backup & Restore modal, available on EVERY app page.
 *
 * Phase 25 round-5 post-UAT (Change 1 / UAT-D2, Ben 2026-05-15).
 *
 * BEFORE: the modal markup lived only in index.html and its handlers only
 * in overview.js. On settings.html / add-client.html / add-session.html the
 * header cloud-icon click had no window.openBackupModal, so it NAVIGATED to
 * ./index.html?openBackup=1 — bouncing the user away from the page they were
 * on. Ben explicitly chose "modal opens in-place everywhere" over a seamless
 * redirect or lazy-load.
 *
 * AFTER: this single module owns
 *   - the modal markup (injected into <body> if #backupModal is absent so
 *     index.html's static markup still wins and no duplicate is created),
 *   - all modal handlers (export / import / share / test-password / close /
 *     Esc / ?openBackup=1 auto-open),
 *   - window.openBackupModal / window.renderLastBackupSubtitle /
 *     window.openExportFlow / window.closeBackupModal.
 * It is loaded on index.html, settings.html, add-client.html and
 * add-session.html (after backup.js + jszip.min.js + app.js).
 *
 * overview.js no longer defines these — it registers a
 * window.__afterBackupRestore hook so the overview list refreshes after an
 * in-place restore (other pages simply reload via location.reload()).
 *
 * Dependencies: window.App (app.js), window.BackupManager (backup.js),
 * JSZip (jszip.min.js — only needed when the user actually exports/imports).
 * Every external touch is defensive so a page that somehow loads this
 * without a dependency degrades to a no-op rather than throwing.
 */
(function () {
  'use strict';

  // ───────────────────────────────────────────────────────────────────
  // Modal markup — byte-for-byte the Phase 25 Plan 02/03/12 block that
  // previously lived only in index.html (lines 182-269). Kept here as the
  // single source of truth; index.html still ships its own static copy so
  // first paint has the modal without waiting for this script, and the
  // injector below skips when a #backupModal already exists.
  // ───────────────────────────────────────────────────────────────────
  var MODAL_HTML = [
    '<div id="backupModal" class="modal is-hidden" role="dialog" aria-modal="true" aria-labelledby="backupModalTitle">',
    '  <div class="modal-overlay"></div>',
    '  <div class="modal-card backup-modal-card">',
    '    <button class="modal-close" type="button" aria-label="Close" id="backupModalClose"></button>',
    '    <div class="backup-modal-header">',
    '      <h2 id="backupModalTitle" class="backup-modal-title" data-i18n="backup.modal.title">Backup &amp; Restore</h2>',
    '      <p class="backup-modal-subtitle" id="backupModalLastBackup" data-i18n="backup.modal.lastBackupNever">Last backup: never</p>',
    '    </div>',
    '    <section class="backup-modal-section backup-modal-section--contents">',
    '      <h3 class="backup-modal-section-heading" data-i18n="backup.contents.heading">What&#39;s in your backup</h3>',
    '      <p class="backup-modal-section-helper helper-text" data-i18n="backup.contents.helper">Every export includes everything below. Restoring replaces all current data with this list.</p>',
    '      <ul class="backup-contents-list">',
    '        <li class="backup-contents-item"><span class="backup-contents-check" aria-hidden="true">&#10003;</span> <span data-i18n="backup.contents.item.clients">Clients</span></li>',
    '        <li class="backup-contents-item"><span class="backup-contents-check" aria-hidden="true">&#10003;</span> <span data-i18n="backup.contents.item.sessions">Sessions</span></li>',
    '        <li class="backup-contents-item"><span class="backup-contents-check" aria-hidden="true">&#10003;</span> <span data-i18n="backup.contents.item.snippets">Snippets</span></li>',
    '        <li class="backup-contents-item"><span class="backup-contents-check" aria-hidden="true">&#10003;</span> <span data-i18n="backup.contents.item.settings">Settings</span></li>',
    '        <li class="backup-contents-item"><span class="backup-contents-check" aria-hidden="true">&#10003;</span> <span data-i18n="backup.contents.item.photos">Photos (cropped, optimized)</span></li>',
    '      </ul>',
    '    </section>',
    '    <section class="backup-modal-section backup-modal-section--export">',
    '      <h3 class="backup-modal-section-heading" data-i18n="backup.export.heading">Export backup</h3>',
    '      <p class="backup-modal-section-helper helper-text" data-i18n="backup.export.helper">Save a copy of all your data. Encrypt it with a password (recommended), or save it unprotected.</p>',
    '      <div class="backup-modal-button-row backup-modal-actions">',
    '        <button type="button" class="button" id="backupModalExport" data-i18n="backup.action.export">Export backup</button>',
    '        <button type="button" class="button ghost is-hidden" id="backupModalShare" data-i18n="backup.action.share">Share backup</button>',
    '      </div>',
    '    </section>',
    '    <section class="backup-modal-section backup-modal-section--import">',
    '      <h3 class="backup-modal-section-heading" data-i18n="backup.import.heading">Import backup</h3>',
    '      <p class="backup-modal-section-helper helper-text" data-i18n="backup.import.helper">Restoring replaces all current data with the contents of the backup file. This cannot be undone.</p>',
    '      <div class="backup-modal-import-warning" role="alert">',
    '        <span data-i18n="backup.import.warning">&#9888; Replaces all current data</span>',
    '      </div>',
    '      <div class="backup-modal-button-row backup-modal-actions">',
    '        <label class="button ghost import-label">',
    '          <span data-i18n="backup.action.import">Choose backup file</span>',
    '          <input id="backupModalImportInput" type="file" accept=".zip,.json,.sgbackup" class="is-hidden" />',
    '        </label>',
    '      </div>',
    '    </section>',
    '    <section class="backup-modal-section backup-modal-section--test" id="backupModalTestPasswordSection">',
    '      <div class="backup-test-password-card">',
    '        <h3 class="backup-modal-section-heading" data-i18n="backup.testPassword.heading">Test backup password</h3>',
    '        <p class="backup-modal-section-helper helper-text" data-i18n="backup.testPassword.helper">Check that you can decrypt a backup file with your password. Your current data is not touched.</p>',
    '        <div class="form-field">',
    '          <label class="button ghost backup-test-password-filebtn import-label" for="backupTestPasswordFile">',
    '            <span id="backupTestPasswordFileLabel" data-i18n="backup.testPassword.filePlaceholder">Drop a backup file here, or click to choose one.</span>',
    '            <input id="backupTestPasswordFile" type="file" accept=".sgbackup" class="is-hidden" />',
    '          </label>',
    '        </div>',
    '        <div class="form-field">',
    '          <input id="backupTestPasswordInput" class="input" type="password" autocomplete="off" data-i18n-placeholder="backup.testPassword.passwordPlaceholder" placeholder="Backup password" />',
    '        </div>',
    '        <div class="backup-modal-button-row backup-modal-actions">',
    '          <button type="button" class="button" id="backupTestPasswordRun" data-i18n="backup.testPassword.run" disabled>Test password</button>',
    '        </div>',
    '        <p id="backupTestPasswordResult" class="backup-test-password-result" role="status" aria-live="polite" hidden></p>',
    '      </div>',
    '    </section>',
    '    <section class="backup-modal-section backup-modal-section--reminders">',
    '      <details class="backup-reminders-explainer">',
    '        <summary class="backup-modal-section-heading" data-i18n="reminders.helper.heading">How reminders work</summary>',
    '        <div class="helper-text" data-i18n="reminders.helper.body">A gentle 7-day reminder banner appears on the overview if you haven\'t exported a backup in the last week. When you set up a schedule, Sessions Garden prompts you in-app at your chosen interval and the 7-day banner stays quiet so you only get one channel. If you turn the schedule off, the 7-day reminder banner becomes active again.</div>',
    '      </details>',
    '    </section>',
    '    <footer class="backup-modal-footer">',
    '      <a href="./settings.html?tab=backups" id="backupModalScheduleLink" class="text-link" data-i18n="backup.modal.scheduleFooter">Set up a schedule in Settings &rarr; Backups so you don&#39;t have to remember.</a>',
    '    </footer>',
    '  </div>',
    '</div>',
  ].join('\n');

  /**
   * Inject the modal markup into <body> when no #backupModal exists yet.
   * Idempotent — index.html ships the static copy so this is a no-op there;
   * on other pages it adds exactly one #backupModal. Returns the element.
   */
  function ensureBackupModalMarkup() {
    var existing = document.getElementById('backupModal');
    if (existing) return existing;
    if (!document.body) return null;
    var wrap = document.createElement('div');
    wrap.innerHTML = MODAL_HTML;
    var node = wrap.firstElementChild || wrap.firstChild;
    if (node) document.body.appendChild(node);
    return document.getElementById('backupModal');
  }

  // App / BackupManager accessors — resolved lazily so this file has no
  // hard load-order dependency. All callers null-check.
  function getApp() { return (typeof window !== 'undefined' && window.App) ? window.App : null; }
  function getBM() { return (typeof window !== 'undefined' && window.BackupManager) ? window.BackupManager : null; }

  /**
   * Localized relative-time formatter ("3 days ago" / "moments ago").
   * Returns null when the timestamp is missing/NaN.
   */
  function formatRelativeTime(timestampMs) {
    if (!timestampMs || isNaN(timestampMs)) return null;
    var elapsed = Date.now() - Number(timestampMs);
    var lang = 'en';
    try { lang = (localStorage.getItem('portfolioLang')) || 'en'; } catch (_) {}
    var rtf;
    try { rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' }); }
    catch (_) { rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' }); }
    var dayMs = 24 * 60 * 60 * 1000;
    var hourMs = 60 * 60 * 1000;
    var minMs = 60 * 1000;
    if (elapsed >= dayMs) return rtf.format(-Math.floor(elapsed / dayMs), 'day');
    if (elapsed >= hourMs) return rtf.format(-Math.floor(elapsed / hourMs), 'hour');
    if (elapsed >= minMs) return rtf.format(-Math.floor(elapsed / minMs), 'minute');
    return rtf.format(-Math.floor(elapsed / 1000), 'second');
  }

  /** Update the modal subtitle (#backupModalLastBackup) from localStorage. */
  function renderLastBackupSubtitle() {
    var el = document.getElementById('backupModalLastBackup');
    if (!el) return;
    var App = getApp();
    if (!App || typeof App.t !== 'function') return;
    var ts = NaN;
    try { ts = Number(localStorage.getItem('portfolioLastExport')); } catch (_) {}
    var rel = formatRelativeTime(ts);
    if (rel === null) {
      el.setAttribute('data-i18n', 'backup.modal.lastBackupNever');
      el.textContent = App.t('backup.modal.lastBackupNever');
    } else {
      el.removeAttribute('data-i18n');
      el.textContent = App.t('backup.modal.lastBackup').replace('{relative}', rel);
    }
  }

  /** Probe Web Share API capability and show/hide the Share button. */
  function probeShareSupport() {
    var btn = document.getElementById('backupModalShare');
    if (!btn) return;
    var BM = getBM();
    if (!BM || typeof BM.isShareSupported !== 'function') { btn.classList.add('is-hidden'); return; }
    try {
      var probe = new File(
        [new Blob(['x'], { type: 'application/octet-stream' })],
        'probe.sgbackup',
        { type: 'application/octet-stream' }
      );
      if (BM.isShareSupported(probe)) btn.classList.remove('is-hidden');
      else btn.classList.add('is-hidden');
    } catch (_) {
      btn.classList.add('is-hidden');
    }
  }
  if (typeof window !== 'undefined') window.formatRelativeTime = formatRelativeTime;

  /** Open the Backup & Restore modal in-place — refresh subtitle + Share + i18n. */
  function openBackupModal() {
    var modal = document.getElementById('backupModal') || ensureBackupModalMarkup();
    if (!modal) return;
    renderLastBackupSubtitle();
    probeShareSupport();
    modal.classList.remove('is-hidden');
    var App = getApp();
    if (App) {
      if (typeof App.lockBodyScroll === 'function') App.lockBodyScroll();
      if (typeof App.applyTranslations === 'function') App.applyTranslations(modal);
    }
  }

  /** Close the Backup & Restore modal + reset the Test-password sub-card. */
  function closeBackupModal() {
    var modal = document.getElementById('backupModal');
    if (!modal) return;
    modal.classList.add('is-hidden');
    var App = getApp();
    if (App && typeof App.unlockBodyScroll === 'function') App.unlockBodyScroll();
    var tpFile = document.getElementById('backupTestPasswordFile');
    var tpInput = document.getElementById('backupTestPasswordInput');
    var tpLabel = document.getElementById('backupTestPasswordFileLabel');
    var tpRun = document.getElementById('backupTestPasswordRun');
    var tpResult = document.getElementById('backupTestPasswordResult');
    if (tpFile) tpFile.value = '';
    if (tpInput) tpInput.value = '';
    if (tpLabel && App && typeof App.t === 'function') {
      tpLabel.setAttribute('data-i18n', 'backup.testPassword.filePlaceholder');
      tpLabel.textContent = App.t('backup.testPassword.filePlaceholder');
    }
    if (tpResult) {
      tpResult.hidden = true;
      tpResult.textContent = '';
      tpResult.className = 'backup-test-password-result';
    }
    if (tpRun) tpRun.disabled = true;
  }

  /** Export flow — preserves the encrypt-or-skip behavior + Share chaining. */
  function openExportFlow(opts) {
    opts = opts || {};
    var App = getApp();
    var BM = getBM();
    if (!BM || !App) return Promise.resolve(null);
    return Promise.resolve()
      .then(function () { return BM.exportEncryptedBackup(); })
      .then(function (result) {
        if (result && result.cancelled) return null;
        var producedBlob = null;
        var producedFilename = null;
        var chain = Promise.resolve();
        if (result && result.skip) {
          chain = chain
            .then(function () { return BM.exportBackup(); })
            .then(function (unenc) {
              BM.triggerDownload(unenc.blob, unenc.filename);
              producedBlob = unenc.blob;
              producedFilename = unenc.filename;
              if (typeof BM.isAutoBackupActive === 'function' && BM.isAutoBackupActive()
                  && typeof BM.autoSaveToFolder === 'function') {
                return BM.autoSaveToFolder(unenc.blob, unenc.filename);
              }
            });
        } else if (result && result.ok) {
          producedBlob = result.blob;
          producedFilename = result.filename;
        }
        return chain.then(function () {
          probeShareSupport();
          if (typeof App.showToast === 'function') App.showToast('', 'toast.exportSuccess');
          renderLastBackupSubtitle();
          if (typeof App.updateBackupCloudState === 'function') {
            App.updateBackupCloudState(document.getElementById('backupCloudBtn'));
          }
          var after = Promise.resolve();
          if (typeof opts.afterExport === 'function' && producedBlob) {
            after = Promise.resolve(opts.afterExport({ blob: producedBlob, filename: producedFilename }));
          }
          return after.then(function () { return { blob: producedBlob, filename: producedFilename }; });
        });
      })
      .catch(function (err) {
        if (typeof console !== 'undefined' && console.error) console.error('Backup export failed:', err);
        var msg = (err && err.message) ? err.message : String(err);
        if (msg.indexOf('subtle') !== -1 || msg.indexOf('crypto') !== -1) {
          msg = 'Encrypted backup requires HTTPS or localhost. Try accessing via localhost instead of IP.';
        }
        if (typeof App.showToast === 'function') App.showToast(msg, 'toast.exportError');
        return null;
      });
  }

  /** Import flow — destructive-replace confirm, then refresh in-place. */
  function openImportFlow(file) {
    if (!file) return Promise.resolve();
    var App = getApp();
    var BM = getBM();
    if (!App || !BM) return Promise.resolve();
    if (typeof window !== 'undefined' && window.name === 'demo-mode') {
      if (typeof App.showToast === 'function') App.showToast('', 'toast.importDisabledDemo');
      return Promise.resolve();
    }
    return Promise.resolve()
      .then(function () {
        if (typeof App.confirmDialog !== 'function') return false;
        return App.confirmDialog({
          messageKey: 'backup.confirmReplace',
          confirmKey: 'confirm.import',
          cancelKey: 'confirm.cancel',
        });
      })
      .then(function (confirmed) {
        if (!confirmed) return;
        return Promise.resolve(BM.importBackup(file)).then(function () {
          if (typeof App.showToast === 'function') App.showToast('', 'toast.importSuccess');
          // Page-agnostic post-restore refresh. overview.js registers a
          // hook to re-render its list without a reload; other pages reload
          // so their stale DOM reflects the restored data.
          var hook = (typeof window !== 'undefined') ? window.__afterBackupRestore : null;
          var refresh = Promise.resolve();
          if (typeof hook === 'function') {
            refresh = Promise.resolve(hook());
          } else if (typeof window !== 'undefined' && window.location && typeof window.location.reload === 'function') {
            // Defer the reload so the success toast is visible briefly.
            setTimeout(function () { try { window.location.reload(); } catch (_) {} }, 600);
          }
          return refresh.then(function () {
            renderLastBackupSubtitle();
            if (typeof App.updateBackupCloudState === 'function') {
              App.updateBackupCloudState(document.getElementById('backupCloudBtn'));
            }
            closeBackupModal();
          });
        });
      })
      .catch(function (err) {
        if (err === null) return; // passphrase modal cancelled
        if (typeof console !== 'undefined' && console.error) console.error('Import failed:', err);
        var msg = (err && err.message) ? err.message : '';
        if (typeof App.showToast === 'function') {
          App.showToast(msg || (typeof App.t === 'function' ? App.t('toast.importError') : 'Import failed'));
        }
      });
  }

  // Expose the public surface on window so the cloud icon (app.js), the
  // scheduled-backup prompt (backup.js checkBackupSchedule) and any future
  // caller can open the modal in-place from ANY page.
  if (typeof window !== 'undefined') {
    window.openBackupModal = openBackupModal;
    window.closeBackupModal = closeBackupModal;
    window.renderLastBackupSubtitle = renderLastBackupSubtitle;
    window.openExportFlow = openExportFlow;
  }

  // ───────────────────────────────────────────────────────────────────
  // Wire the modal handlers. Idempotent: a guard flag prevents double
  // binding if both this module and a legacy caller try to wire (during
  // the overview.js migration window).
  // ───────────────────────────────────────────────────────────────────
  function bindBackupModal() {
    if (typeof window !== 'undefined' && window.__backupModalWired) return;

    var modal = document.getElementById('backupModal') || ensureBackupModalMarkup();
    if (!modal) return;
    if (typeof window !== 'undefined') window.__backupModalWired = true;

    // Auto-open from ?openBackup=1 (defensive path retained: the cloud
    // icon now opens in-place, but a redirected legacy link still works).
    try {
      var params = new URLSearchParams(window.location.search);
      if (params.get('openBackup') === '1') {
        setTimeout(function () { openBackupModal(); }, 0);
        params.delete('openBackup');
        var newUrl = window.location.pathname +
          (params.toString() ? '?' + params.toString() : '') + window.location.hash;
        if (window.history && typeof window.history.replaceState === 'function') {
          window.history.replaceState({}, '', newUrl);
        }
      }
    } catch (_) { /* bad URL state — skip auto-open */ }

    var closeBtn = document.getElementById('backupModalClose');
    if (closeBtn) closeBtn.addEventListener('click', closeBackupModal);

    var overlay = modal.querySelector('.modal-overlay');
    if (overlay) overlay.addEventListener('click', closeBackupModal);

    var exportBtn = document.getElementById('backupModalExport');
    if (exportBtn) exportBtn.addEventListener('click', function () { openExportFlow(); });

    var shareBtn = document.getElementById('backupModalShare');
    if (shareBtn) {
      shareBtn.addEventListener('click', function () {
        openExportFlow({
          afterExport: function (payload) {
            var BM = getBM();
            if (BM && typeof BM.shareBackup === 'function') {
              return BM.shareBackup(payload.blob, payload.filename);
            }
          },
        });
      });
    }

    var importInput = document.getElementById('backupModalImportInput');
    if (importInput) {
      importInput.addEventListener('change', function () {
        var file = importInput.files && importInput.files[0];
        Promise.resolve(openImportFlow(file)).then(function () { importInput.value = ''; });
      });
    }

    // Test-password sub-card.
    var tpFile = document.getElementById('backupTestPasswordFile');
    var tpFileLabel = document.getElementById('backupTestPasswordFileLabel');
    var tpInput = document.getElementById('backupTestPasswordInput');
    var tpRun = document.getElementById('backupTestPasswordRun');
    var tpResult = document.getElementById('backupTestPasswordResult');

    function refreshTpButtonState() {
      var hasFile = !!(tpFile && tpFile.files && tpFile.files.length > 0);
      var hasPwd = !!(tpInput && tpInput.value.length > 0);
      if (tpRun) tpRun.disabled = !(hasFile && hasPwd);
    }
    function showTpResult(kind, text) {
      if (!tpResult) return;
      tpResult.className = 'backup-test-password-result ' + kind;
      tpResult.textContent = text;
      tpResult.hidden = false;
    }
    function clearTpResult() {
      if (!tpResult) return;
      tpResult.hidden = true;
      tpResult.textContent = '';
      tpResult.className = 'backup-test-password-result';
    }

    if (tpFile && tpFileLabel) {
      tpFile.addEventListener('change', function () {
        var App = getApp();
        var f = tpFile.files && tpFile.files[0];
        if (f) {
          tpFileLabel.removeAttribute('data-i18n');
          tpFileLabel.textContent = f.name;
        } else if (App && typeof App.t === 'function') {
          tpFileLabel.setAttribute('data-i18n', 'backup.testPassword.filePlaceholder');
          tpFileLabel.textContent = App.t('backup.testPassword.filePlaceholder');
        }
        clearTpResult();
        refreshTpButtonState();
      });
    }
    if (tpInput) {
      tpInput.addEventListener('input', function () { clearTpResult(); refreshTpButtonState(); });
    }
    if (tpRun) {
      tpRun.addEventListener('click', function () {
        var App = getApp();
        var BM = getBM();
        var f = tpFile && tpFile.files && tpFile.files[0];
        var pwd = tpInput ? tpInput.value : '';
        if (!f || !pwd || !BM || !App) return;
        tpRun.disabled = true;
        Promise.resolve()
          .then(function () { return BM.testBackupPassword(f, pwd); })
          .then(function (r) {
            var lang = 'en';
            try { lang = localStorage.getItem('portfolioLang') || 'en'; } catch (_) {}
            var dateStr = r.exportedAt ? new Date(r.exportedAt).toLocaleDateString(lang) : '—';
            var successText = App.t('backup.testPassword.success')
              .replace('{date}', dateStr)
              .replace('{clients}', String(r.clientCount))
              .replace('{sessions}', String(r.sessionCount));
            showTpResult('success', successText);
          })
          .catch(function (err) {
            var msg = (err && err.message) ? err.message
              : (typeof App.t === 'function' ? App.t('backup.testPassword.invalid') : 'Invalid');
            showTpResult('error', msg);
          })
          .then(function () { refreshTpButtonState(); });
      });
    }

    // Esc closes the modal when open (registered once via the wired guard).
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var m = document.getElementById('backupModal');
      if (m && !m.classList.contains('is-hidden')) closeBackupModal();
    });
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', bindBackupModal);
    } else {
      bindBackupModal();
    }
  }
})();
