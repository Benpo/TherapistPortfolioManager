/**
 * backup.js — BackupManager module
 *
 * Handles ZIP-based export and import of all therapist data.
 * Photos are stored as separate files in a photos/ subfolder inside the ZIP,
 * not embedded as base64 in the JSON — this is the core file-size fix.
 *
 * Exposes: window.BackupManager
 *
 * Dependencies (loaded via <script> before this file):
 *   - jszip.min.js  (JSZip 3.10.1)
 *   - db.js         (window.PortfolioDB)
 */

window.BackupManager = (function () {
  "use strict";

  // Module-scoped handle for the auto-backup directory (File System Access API)
  let _savedDirHandle = null;

  // ---------------------------------------------------------------------------
  // Encryption constants — .sgbackup format (AES-256-GCM via PBKDF2)
  // ---------------------------------------------------------------------------

  var SGBACKUP_MAGIC = new Uint8Array([0x53, 0x47, 0x30, 0x31]); // "SG01"
  var PBKDF2_ITERATIONS = 310000;
  var SALT_LENGTH = 16;
  var IV_LENGTH = 12;

  // ---------------------------------------------------------------------------
  // Key derivation — PBKDF2 SHA-256 → AES-256-GCM key
  // ---------------------------------------------------------------------------

  async function _deriveKey(passphrase, salt) {
    if (!crypto || !crypto.subtle) {
      throw new Error('Web Crypto API not available. Encrypted backups require HTTPS or localhost.');
    }
    var enc = new TextEncoder();
    var keyMaterial = await crypto.subtle.importKey(
      'raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  // ---------------------------------------------------------------------------
  // Encrypt a ZIP Blob → .sgbackup Blob
  // Format: [4B magic][16B salt][12B IV][ciphertext+GCM tag]
  // ---------------------------------------------------------------------------

  async function _encryptBlob(zipBlob, passphrase) {
    var salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    var iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    var key = await _deriveKey(passphrase, salt);
    var plaintext = await zipBlob.arrayBuffer();
    var ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, plaintext);
    var result = new Uint8Array(SGBACKUP_MAGIC.length + salt.length + iv.length + ciphertext.byteLength);
    result.set(SGBACKUP_MAGIC, 0);
    result.set(salt, 4);
    result.set(iv, 20);
    result.set(new Uint8Array(ciphertext), 32);
    return new Blob([result], { type: 'application/octet-stream' });
  }

  // ---------------------------------------------------------------------------
  // Decrypt a .sgbackup Blob → ZIP Blob (or null if magic mismatch)
  // ---------------------------------------------------------------------------

  async function _decryptBlob(sgbackupBlob, passphrase) {
    var buffer = await sgbackupBlob.arrayBuffer();
    var data = new Uint8Array(buffer);
    for (var i = 0; i < SGBACKUP_MAGIC.length; i++) {
      if (data[i] !== SGBACKUP_MAGIC[i]) return null;
    }
    var salt = data.slice(4, 20);
    var iv = data.slice(20, 32);
    var ciphertext = data.slice(32);
    var key = await _deriveKey(passphrase, salt);
    var plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, ciphertext);
    return new Blob([plaintext], { type: 'application/zip' });
  }

  // ---------------------------------------------------------------------------
  // Passphrase modal — dynamically created and destroyed per use
  // ---------------------------------------------------------------------------

  // i18n helper — use App.t() if available, otherwise English fallback
  function _t(key) {
    if (typeof window.App !== 'undefined' && typeof window.App.t === 'function') {
      return window.App.t(key);
    }
    // English fallbacks for when App isn't loaded
    var fallbacks = {
      'backup.passphrase.headingEncrypt': 'Create a backup passphrase',
      'backup.passphrase.headingDecrypt': 'Enter your backup passphrase',
      'backup.passphrase.warningEncrypt': 'Enter a passphrase to encrypt your backup. If you forget this passphrase, the backup cannot be recovered.',
      'backup.passphrase.warningDecrypt': 'This backup is encrypted. Enter the passphrase you used when creating it.',
      'backup.passphrase.irreversible': 'If you forget your passphrase, this backup cannot be recovered. There is no reset option.',
      'backup.passphrase.placeholder': 'Passphrase',
      'backup.passphrase.confirmPlaceholder': 'Confirm passphrase',
      'backup.passphrase.mismatch': 'Passphrases do not match. Please re-enter both fields.',
      'backup.passphrase.tooShort': 'Passphrase must be at least 6 characters.',
      'backup.passphrase.tooSimple': 'Passphrase is too simple. Use a mix of letters and numbers.',
      'backup.passphrase.skipEncryption': 'Skip encryption',
      'backup.passphrase.goBack': 'Go back',
      'backup.passphrase.encryptAndSave': 'Encrypt and save',
      'backup.passphrase.decrypt': 'Decrypt',
      'backup.passphrase.cancel': 'Cancel',
      // Phase 22-15 (Gap N11 + N12) — fallbacks for the 9 new keys:
      'backup.passphrase.skipConfirm.heading': 'Export without encryption?',
      'backup.passphrase.skipConfirm.body': 'The backup file will contain all your client data unprotected. Anyone with access to the file can read it.',
      'backup.passphrase.skipConfirm.goBack': 'Go back',
      'backup.passphrase.skipConfirm.proceed': 'Yes, export unprotected',
      'backup.passphrase.mismatchHint': "Passwords don't match yet.",
      'backup.passphrase.rules.heading': 'Password must:',
      'backup.passphrase.rules.minLength': 'Be at least 6 characters',
      'backup.passphrase.rules.notRepeated': 'Not be the same character repeated',
      'backup.passphrase.rules.notOnlyDigits': 'Not be only numbers',
      // Phase 25 Plan 01 — Share affordance (D-02, D-03)
      'backup.action.share': 'Share backup',
      'backup.share.title': 'Sessions Garden backup',
      'backup.share.fallback.body': 'Backup downloaded to your Downloads folder. Please attach {filename} to this email manually.',
      // Phase 25 Plan 03 — Test-backup-password dry-run (D-12).
      // ALL 10 keys live in this fallbacks map so testBackupPassword resolves
      // its reject messages BEFORE App is initialized. The 6 reject-path keys
      // (run / success / wrongPassphrase / notEncrypted / invalid / heading)
      // plus the 4 UI keys (action + helper + filePlaceholder + passwordPlaceholder)
      // are listed in <interfaces> in 25-03-PLAN.md.
      'backup.action.testPassword': 'Test backup password',
      'backup.testPassword.heading': 'Test backup password',
      'backup.testPassword.helper': 'Check that you can decrypt a backup file with your password. Your current data is not touched.',
      'backup.testPassword.filePlaceholder': 'Drop a backup file here, or click to choose one.',
      'backup.testPassword.passwordPlaceholder': 'Backup password',
      'backup.testPassword.run': 'Test password',
      'backup.testPassword.success': 'Decrypted successfully. Backup from {date} — {clients} clients, {sessions} sessions.',
      'backup.testPassword.wrongPassphrase': "That password didn't decrypt this file. Double-check the password you used when creating the backup, or try a different file.",
      'backup.testPassword.notEncrypted': "This file isn't an encrypted backup, so no password is needed. You can import it directly from the Import section.",
      'backup.testPassword.invalid': "This file isn't a valid Sessions Garden backup. Try a different file."
    };
    return fallbacks[key] || key;
  }

  function _showPassphraseModal(opts) {
    // opts: { mode: 'encrypt'|'decrypt', onConfirm: fn(passphrase), onCancel: fn(), onSkip?: fn() }
    // For encrypt mode: onCancel = abort; onSkip = continue without encryption.
    // For decrypt mode: only onCancel is meaningful (no skip — file is already encrypted).
    var overlay = document.createElement('div');
    overlay.className = 'passphrase-modal-overlay';

    var modal = document.createElement('div');
    modal.className = 'passphrase-modal';

    // X close button (top-right)
    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'passphrase-modal-close';
    closeBtn.setAttribute('aria-label', _t('common.close') || 'Close');
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', function() {
      cleanup();
      if (opts.onCancel) opts.onCancel();
    });
    modal.appendChild(closeBtn);

    // Phase 22-15 (Gap N11 / D1) — wrap entry-pane children in a single container so the
    // in-modal Skip-Encryption confirmation pane (D1) can detach + re-attach the entry pane
    // as a unit without destroying typed input values. The X close button stays as a direct
    // child of `modal` so it persists across pane swaps.
    var entryPaneWrapper = document.createElement('div');
    entryPaneWrapper.className = 'passphrase-entry-pane';

    // RTL support
    var lang = '';
    try { lang = localStorage.getItem('portfolioLang') || 'en'; } catch(e) {}
    if (lang === 'he') {
      modal.setAttribute('dir', 'rtl');
      modal.style.textAlign = 'right';
    }

    var isEncrypt = opts.mode === 'encrypt';
    var heading = document.createElement('h3');
    heading.textContent = _t(isEncrypt ? 'backup.passphrase.headingEncrypt' : 'backup.passphrase.headingDecrypt');
    entryPaneWrapper.appendChild(heading);

    var warning = document.createElement('div');
    warning.className = 'passphrase-warning';
    warning.textContent = _t(isEncrypt ? 'backup.passphrase.warningEncrypt' : 'backup.passphrase.warningDecrypt');
    entryPaneWrapper.appendChild(warning);

    if (isEncrypt) {
      var irreversible = document.createElement('div');
      irreversible.className = 'passphrase-irreversible';
      irreversible.textContent = _t('backup.passphrase.irreversible');
      entryPaneWrapper.appendChild(irreversible);

      // Phase 22-15 (Gap N12 / D3) — static complexity-rules hint block.
      // Encrypt mode only (decrypt has no rules — user is entering an existing password).
      // The three list items mirror isWeakPassphrase() one-to-one:
      //   - p.length < 6                   → rules.minLength
      //   - /^(.)\1+$/.test(p)             → rules.notRepeated
      //   - /^\d+$/.test(p)                → rules.notOnlyDigits
      // Static (does NOT update reactively as the user types). The reactive feedback
      // is already provided by errorEl via validate().
      var rulesBlock = document.createElement('div');
      rulesBlock.className = 'passphrase-rules';

      var rulesHeading = document.createElement('div');
      rulesHeading.className = 'passphrase-rules-heading';
      rulesHeading.textContent = _t('backup.passphrase.rules.heading');
      rulesBlock.appendChild(rulesHeading);

      var rulesList = document.createElement('ul');
      rulesList.className = 'passphrase-rules-list';

      var rulesKeys = [
        'backup.passphrase.rules.minLength',
        'backup.passphrase.rules.notRepeated',
        'backup.passphrase.rules.notOnlyDigits'
      ];
      rulesKeys.forEach(function(key) {
        var li = document.createElement('li');
        li.textContent = _t(key);
        rulesList.appendChild(li);
      });
      rulesBlock.appendChild(rulesList);

      // Append the .passphrase-rules block to the entry pane (between irreversible-warning and input1).
      entryPaneWrapper.appendChild(rulesBlock);
    }

    var input1 = document.createElement('input');
    input1.type = 'password';
    input1.className = 'passphrase-input';
    input1.placeholder = _t('backup.passphrase.placeholder');
    input1.autocomplete = 'off';
    entryPaneWrapper.appendChild(input1);

    var input2 = null;
    if (isEncrypt) {
      input2 = document.createElement('input');
      input2.type = 'password';
      input2.className = 'passphrase-input';
      input2.placeholder = _t('backup.passphrase.confirmPlaceholder');
      input2.autocomplete = 'off';
      entryPaneWrapper.appendChild(input2);
    }

    var errorEl = document.createElement('div');
    errorEl.className = 'passphrase-error';
    errorEl.hidden = true;
    entryPaneWrapper.appendChild(errorEl);

    var actions = document.createElement('div');
    actions.className = 'passphrase-actions';

    var dismissBtn = document.createElement('button');
    dismissBtn.type = 'button';
    dismissBtn.className = 'passphrase-btn-dismiss';
    dismissBtn.textContent = _t('backup.passphrase.cancel');
    dismissBtn.addEventListener('click', function() {
      cleanup();
      if (opts.onCancel) opts.onCancel();
    });
    actions.appendChild(dismissBtn);

    var cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'passphrase-btn-cancel';
    cancelBtn.textContent = _t(isEncrypt ? 'backup.passphrase.skipEncryption' : 'backup.passphrase.goBack');
    actions.appendChild(cancelBtn);

    var confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.className = 'passphrase-btn-confirm';
    confirmBtn.textContent = _t(isEncrypt ? 'backup.passphrase.encryptAndSave' : 'backup.passphrase.decrypt');
    confirmBtn.disabled = true;
    actions.appendChild(confirmBtn);

    entryPaneWrapper.appendChild(actions);
    modal.appendChild(entryPaneWrapper);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    if (typeof App !== 'undefined' && App.lockBodyScroll) App.lockBodyScroll();

    setTimeout(function() { input1.focus(); }, 50);

    // Phase 22-15 (Gap N11 / D1) — activePane state + lazy-built skip-confirm pane.
    // Used by the rewired cancelBtn handler and the Escape-key branch below.
    // 'entry' is the default; 'confirm' is the destructive skip-confirm pane.
    var activePane = 'entry';
    var skipConfirmPaneWrapper = null;

    function buildSkipConfirmPane() {
      var pane = document.createElement('div');
      pane.className = 'passphrase-skip-confirm';

      var paneHeading = document.createElement('h3');
      paneHeading.textContent = _t('backup.passphrase.skipConfirm.heading');
      pane.appendChild(paneHeading);

      var paneBody = document.createElement('div');
      paneBody.className = 'passphrase-warning';
      paneBody.textContent = _t('backup.passphrase.skipConfirm.body');
      pane.appendChild(paneBody);

      var paneActions = document.createElement('div');
      paneActions.className = 'passphrase-actions';

      var goBackBtn = document.createElement('button');
      goBackBtn.type = 'button';
      goBackBtn.className = 'passphrase-btn-dismiss';
      goBackBtn.textContent = _t('backup.passphrase.skipConfirm.goBack');
      goBackBtn.addEventListener('click', swapToEntryPane);
      paneActions.appendChild(goBackBtn);

      var proceedBtn = document.createElement('button');
      proceedBtn.type = 'button';
      proceedBtn.className = 'passphrase-btn-destructive';
      proceedBtn.textContent = _t('backup.passphrase.skipConfirm.proceed');
      proceedBtn.addEventListener('click', function() {
        cleanup();
        if (opts.onSkip) opts.onSkip();
      });
      paneActions.appendChild(proceedBtn);

      pane.appendChild(paneActions);
      return pane;
    }

    function swapToSkipConfirmPane() {
      if (!skipConfirmPaneWrapper) skipConfirmPaneWrapper = buildSkipConfirmPane();
      if (entryPaneWrapper.parentNode) entryPaneWrapper.parentNode.removeChild(entryPaneWrapper);
      modal.appendChild(skipConfirmPaneWrapper);
      activePane = 'confirm';
      setTimeout(function() {
        var btn = skipConfirmPaneWrapper.querySelector('.passphrase-btn-destructive');
        if (btn) btn.focus();
      }, 50);
    }

    function swapToEntryPane() {
      if (skipConfirmPaneWrapper && skipConfirmPaneWrapper.parentNode) {
        skipConfirmPaneWrapper.parentNode.removeChild(skipConfirmPaneWrapper);
      }
      if (!entryPaneWrapper.parentNode) modal.appendChild(entryPaneWrapper);
      activePane = 'entry';
      setTimeout(function() { input1.focus(); }, 50);
    }

    function isWeakPassphrase(p) {
      if (p.length < 6) return _t('backup.passphrase.tooShort');
      // All same character (e.g., "aaaaaa")
      if (/^(.)\1+$/.test(p)) return _t('backup.passphrase.tooSimple');
      // Pure sequential digits (e.g., "123456", "654321")
      if (/^\d+$/.test(p)) return _t('backup.passphrase.tooSimple');
      return null;
    }

    function validate() {
      var v1 = input1.value;
      if (!v1) { confirmBtn.disabled = true; errorEl.hidden = true; return; }
      if (isEncrypt) {
        var weakness = isWeakPassphrase(v1);
        if (weakness) {
          errorEl.textContent = weakness;
          errorEl.hidden = false;
          confirmBtn.disabled = true;
          return;
        }
        // Phase 22-15 (Gap N12 / D2) — mismatch hint after weakness passes.
        // Weakness errors take precedence (handled above). If v1 is strong AND
        // both inputs have content AND they differ, show the lighter mismatch hint
        // and keep confirmBtn disabled. The defensive louder mismatch error inside
        // the confirmBtn click handler stays untouched.
        var v2 = input2 ? input2.value : '';
        if (input2 && v2 && v1 !== v2) {
          errorEl.textContent = _t('backup.passphrase.mismatchHint');
          errorEl.hidden = false;
          confirmBtn.disabled = true;
          return;
        }
        errorEl.hidden = true;
        confirmBtn.disabled = !input2 || v1 !== input2.value || !v1;
      } else {
        confirmBtn.disabled = false;
      }
    }
    input1.addEventListener('input', validate);
    if (input2) input2.addEventListener('input', validate);

    function cleanup() { overlay.remove(); if (typeof App !== 'undefined' && App.unlockBodyScroll) App.unlockBodyScroll(); }

    confirmBtn.addEventListener('click', function() {
      if (isEncrypt && input2 && input1.value !== input2.value) {
        errorEl.textContent = _t('backup.passphrase.mismatch');
        errorEl.hidden = false;
        input1.value = '';
        input2.value = '';
        input1.focus();
        confirmBtn.disabled = true;
        return;
      }
      var passphrase = input1.value;
      cleanup();
      opts.onConfirm(passphrase);
    });

    cancelBtn.addEventListener('click', function() {
      if (isEncrypt) {
        // Phase 22-15 (Gap N11 / D1) — Skip Encryption now opens an in-modal confirm pane.
        // Reaching opts.onSkip() now requires a two-step gesture (this button → destructive primary on the confirm pane).
        swapToSkipConfirmPane();
        return;
      }
      // Decrypt mode keeps the direct-cancel alias behaviour — there is nothing to "skip" when importing an already-encrypted file.
      cleanup();
      if (opts.onCancel) opts.onCancel();
    });

    modal.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !confirmBtn.disabled && activePane === 'entry') confirmBtn.click();
      if (e.key === 'Escape') {
        if (activePane === 'confirm') {
          // Phase 22-15 (Gap N11 / D1) — Escape on the destructive confirm pane returns to the entry pane (no resolve).
          // X close button still aborts (calls opts.onCancel) — Escape and X have different semantics on the confirm pane.
          swapToEntryPane();
          return;
        }
        cleanup();
        if (opts.onCancel) opts.onCancel();
      }
    });
  }

  // ---------------------------------------------------------------------------
  // MIME / extension helpers
  // ---------------------------------------------------------------------------

  /**
   * Given a base64 data URL like `data:image/png;base64,...`
   * return the MIME type string, e.g. "image/png".
   * Returns null if the string is not a valid data URL.
   */
  function _mimeFromDataUrl(dataUrl) {
    if (typeof dataUrl !== "string") return null;
    var m = dataUrl.match(/^data:(image\/\w+);base64,/);
    return m ? m[1] : null;
  }

  /**
   * Map a MIME type to a file extension.
   * jpeg -> jpg, everything else is used as-is.
   */
  function _extFromMime(mime) {
    if (!mime) return ".jpg";
    var sub = mime.split("/")[1] || "jpg";
    return "." + (sub === "jpeg" ? "jpg" : sub);
  }

  /**
   * Map a file extension back to a MIME type for reconstruction.
   * .jpg -> image/jpeg, .png -> image/png, others -> image/jpeg as fallback.
   */
  function _mimeFromExt(ext) {
    if (!ext) return "image/jpeg";
    var lower = ext.toLowerCase().replace(".", "");
    if (lower === "jpg" || lower === "jpeg") return "image/jpeg";
    if (lower === "png") return "image/png";
    if (lower === "webp") return "image/webp";
    if (lower === "gif") return "image/gif";
    return "image/jpeg";
  }

  // ---------------------------------------------------------------------------
  // normalizeManifest — version compatibility
  // ---------------------------------------------------------------------------

  /**
   * Normalise a parsed JSON object to the current backup manifest format.
   *
   * version 0  — old format: no `version` field, photos are inline base64 in
   *              client objects.  No transformation of photos needed — they
   *              will be re-stored in IndexedDB exactly as read.
   * version 1  — current ZIP format: photos are filename references in the
   *              `photos/` subfolder.  Returned as-is.
   */
  function normalizeManifest(manifest) {
    if (!manifest || typeof manifest !== "object") {
      throw new Error("Invalid backup manifest");
    }
    // Phase 22: ensure therapistSettings exists and is an array. Per-row schema
    // is validated lazily inside the restore loop (importBackup) so a single
    // malformed row cannot abort the whole restore.
    if (!Array.isArray(manifest.therapistSettings)) {
      manifest.therapistSettings = [];
    }
    // Phase 24 Plan 04: pre-v1.1 backups have no snippets key. Default to empty
    // array so the restore loop is a no-op AND the v5 migration's seed populate
    // repopulates the seed pack on the destination DB (D-35).
    if (!Array.isArray(manifest.snippets)) {
      manifest.snippets = [];
    }
    if (!manifest.version) {
      // Old JSON-only format
      return {
        version: 0,
        exportedAt: manifest.exportedAt || null,
        appVersion: manifest.appVersion || null,
        clients: manifest.clients || [],
        sessions: manifest.sessions || [],
        therapistSettings: [],
        snippets: [],
        settings: manifest.settings || null,
      };
    }
    // version 1, 2, 3, or future — trust the manifest (therapistSettings and
    // snippets already defaulted above if missing).
    return manifest;
  }

  // ---------------------------------------------------------------------------
  // exportBackup — build and return a ZIP blob
  // ---------------------------------------------------------------------------

  /**
   * Collect all data from PortfolioDB, build a ZIP, and return
   * { blob: Blob, filename: string }.
   *
   * ZIP structure:
   *   backup.json          — manifest (text, DEFLATE compressed)
   *   photos/client-{id}.png  — one file per client with a photo (STORE)
   */
  async function exportBackup() {
    var db = window.PortfolioDB;
    var allClients = await db.getAllClients();
    var allSessions = await db.getAllSessions();

    // Phase 22: include therapist customisations (custom section labels +
    // disabled flags). Wrapped in try/catch so a missing function (transitional
    // builds) does not abort the backup.
    var allTherapistSettings = [];
    try {
      if (typeof db.getAllTherapistSettings === "function") {
        allTherapistSettings = await db.getAllTherapistSettings();
      }
    } catch (e) {
      console.warn("Backup: therapistSettings read failed; exporting empty:", e);
      allTherapistSettings = [];
    }

    // Phase 24 Plan 04: include snippets. Same defensive try/catch pattern.
    var allSnippets = [];
    try {
      if (typeof db.getAllSnippets === "function") {
        allSnippets = await db.getAllSnippets();
      }
    } catch (e) {
      console.warn("Backup: snippets read failed; exporting empty:", e);
      allSnippets = [];
    }

    var zip = new JSZip();
    var photosFolder = zip.folder("photos");

    // Deep-clone clients so we can mutate photo references without
    // touching the in-memory objects from IndexedDB.
    var clientsClean = allClients.map(function (client) {
      var c = Object.assign({}, client);

      // Check both `photo` and `photoData` fields — the app uses `photoData`
      var photoField = c.photo || c.photoData;
      if (photoField) {
        var mime = _mimeFromDataUrl(photoField);
        if (mime) {
          var ext = _extFromMime(mime);
          var filename = "client-" + c.id + ext;
          var base64Data = photoField.replace(/^data:image\/\w+;base64,/, "");
          photosFolder.file(filename, base64Data, {
            base64: true,
            compression: "STORE",
          });
          // Store reference in photoData (the field the app actually uses)
          c.photoData = "photos/" + filename;
          c.photo = "photos/" + filename;
        }
      }

      return c;
    });

    var manifest = {
      version: 3,
      exportedAt: new Date().toISOString(),
      appVersion: "1.1",
      clients: clientsClean,
      sessions: allSessions,
      therapistSettings: allTherapistSettings,
      snippets: allSnippets,
      settings: {
        language: localStorage.getItem("portfolioLang"),
        theme: localStorage.getItem("portfolioTheme"),
      },
    };

    zip.file("backup.json", JSON.stringify(manifest, null, 2), {
      compression: "DEFLATE",
    });

    var blob = await zip.generateAsync({ type: "blob" });

    // Build filename with today's date
    var today = new Date();
    var yyyy = today.getFullYear();
    var mm = String(today.getMonth() + 1).padStart(2, "0");
    var dd = String(today.getDate()).padStart(2, "0");
    var hh = String(today.getHours()).padStart(2, "0");
    var min = String(today.getMinutes()).padStart(2, "0");
    var filename = "Sessions-Garden-" + yyyy + "-" + mm + "-" + dd + "-" + hh + min + ".zip";

    return { blob: blob, filename: filename };
  }

  // ---------------------------------------------------------------------------
  // triggerDownload — create object URL and fire download
  // ---------------------------------------------------------------------------

  /**
   * Trigger a browser file-download for the given Blob.
   * Also records the export timestamp in localStorage.
   */
  function triggerDownload(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 10000);
    localStorage.setItem("portfolioLastExport", String(Date.now()));
  }

  // ---------------------------------------------------------------------------
  // exportEncryptedBackup — passphrase modal → ZIP → encrypt → .sgbackup
  // ---------------------------------------------------------------------------

  /**
   * Show passphrase modal, build ZIP via exportBackup(), encrypt it, download
   * as .sgbackup file.
   *
   * Returns a Promise that resolves to an object describing the outcome:
   *   { ok: true,  skip: false, cancelled: false, blob: <encBlob>, filename: <encFilename> }
   *     — user confirmed; .sgbackup file downloaded; encrypted blob+filename
   *       exposed so the caller can chain into the Share button (D-04 inheritance
   *       for the encrypted path).
   *
   *   { ok: false, skip: true,  cancelled: false, blob: null, filename: null }
   *     — user pressed "Skip encryption"; caller should run the unencrypted
   *       export path itself (overview.js's openExportFlow does exactly this).
   *
   *   { ok: false, skip: false, cancelled: true,  blob: null, filename: null }
   *     — user pressed Cancel / X / Escape; caller MUST abort the entire flow.
   *
   * Refactor history: Plan 02 shipped the original tri-state return (true /
   * false / 'cancel'). Plan 08 replaced it with this object shape so the
   * encrypted-then-share path can pass the encrypted blob through to
   * BackupManager.shareBackup() — closing the Plan 02 deferred limitation.
   * Sole caller (verified by grep): overview.js openExportFlow.
   */
  async function exportEncryptedBackup() {
    return new Promise(function(resolve, reject) {
      _showPassphraseModal({
        mode: 'encrypt',
        onConfirm: async function(passphrase) {
          try {
            var result = await exportBackup();
            var encBlob = await _encryptBlob(result.blob, passphrase);
            var url = URL.createObjectURL(encBlob);
            var a = document.createElement('a');
            a.href = url;
            var dateStr = new Date().toISOString().slice(0, 10);
            var encFilename = 'sessions-garden-' + dateStr + '.sgbackup';
            a.download = encFilename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(function() { URL.revokeObjectURL(url); }, 10000);
            localStorage.setItem("portfolioLastExport", String(Date.now()));
            resolve({ ok: true, skip: false, cancelled: false, blob: encBlob, filename: encFilename });
          } catch (err) {
            console.error('Encrypted backup failed:', err);
            reject(err);
          }
        },
        onSkip: function() { resolve({ ok: false, skip: true, cancelled: false, blob: null, filename: null }); },   // user pressed Skip Encryption
        onCancel: function() { resolve({ ok: false, skip: false, cancelled: true, blob: null, filename: null }); }  // user pressed Cancel / X / Escape — abort
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Web Share API — shareBackup + isShareSupported (Phase 25 Plan 01, D-02..D-04)
  // ---------------------------------------------------------------------------

  /**
   * Feature-probe the Web Share API with the ACTUAL File the caller intends
   * to share. We pass the real File so .sgbackup MIME-type rejection on
   * Safari macOS surfaces here (RESEARCH.md Pitfall 1), not later inside
   * navigator.share().
   *
   * Returns true if the platform can share this specific file, false otherwise.
   * Never throws — a thrown canShare is treated as "not supported".
   */
  function isShareSupported(file) {
    try {
      if (typeof navigator === 'undefined') return false;
      if (typeof navigator.canShare !== 'function') return false;
      if (typeof navigator.share !== 'function') return false;
      return !!navigator.canShare({ files: [file] });
    } catch (e) {
      return false;
    }
  }

  /**
   * Share a precomputed backup blob via the Web Share API, falling back to
   * download + an HONEST mailto on platforms that don't support file share.
   *
   * CRITICAL CONTRACT (D-04, T-25-01-01): this function MUST NOT rebuild the
   * blob via exportBackup() or exportEncryptedBackup(). The blob passed in
   * already reflects the user's encryption choice. Re-deriving the blob
   * here would silently undo that choice (this was the original Phase 22-era
   * security regression that Plan 25-01 closes).
   *
   * Honesty contract (D-02, T-25-01-03): the mailto fallback body MUST NOT
   * claim a file is attached. It directs the user to attach the downloaded
   * file manually.
   *
   * Returns one of:
   *   { ok: true,  via: 'share' }            — share sheet completed
   *   { ok: false, via: 'share', cancelled: true } — user dismissed sheet
   *   { ok: true,  via: 'mailto-fallback' }  — downloaded + opened mailto
   */
  async function shareBackup(blob, filename) {
    // Build a File from the EXACT blob passed in. MIME falls back to
    // application/octet-stream (matches _encryptBlob output and is what most
    // mail clients accept as a generic attachment).
    var fileType = (blob && blob.type) || 'application/octet-stream';
    var file = new File([blob], filename, { type: fileType });

    // Try the Web Share API first.
    if (isShareSupported(file)) {
      try {
        await navigator.share({
          files: [file],
          title: _t('backup.share.title'),
          text: ''
        });
        return { ok: true, via: 'share' };
      } catch (err) {
        if (err && err.name === 'AbortError') {
          // User dismissed the share sheet intentionally — silent (per UI-SPEC).
          return { ok: false, via: 'share', cancelled: true };
        }
        // Other errors (Safari .sgbackup false-positive from canShare, etc.)
        // fall through to the mailto fallback. Log once for diagnostics.
        try { console.warn('BackupManager.shareBackup: navigator.share failed, falling back to mailto:', err); } catch (_) {}
      }
    }

    // Mailto fallback — honest body (T-25-01-03).
    triggerDownload(blob, filename);

    var today = new Date();
    var dateStr = today.getFullYear() + '-' +
      String(today.getMonth() + 1).padStart(2, '0') + '-' +
      String(today.getDate()).padStart(2, '0');
    var subject = 'Sessions Garden backup - ' + dateStr;
    var bodyTemplate = _t('backup.share.fallback.body');
    var body = bodyTemplate.replace('{filename}', filename);
    window.location.href = 'mailto:?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(body);

    return { ok: true, via: 'mailto-fallback' };
  }

  // ---------------------------------------------------------------------------
  // Phase 25 Plan 03 — testBackupPassword: dry-run safety net (D-12, T-25-03-01)
  //
  // Verifies a backup file decrypts with the given passphrase WITHOUT touching
  // IndexedDB or localStorage. The user's current data is NEVER mutated.
  //
  // Contract (load-bearing — tests/25-03-testpassword-no-mutation.test.js
  // is the falsifiable assertion):
  //   - NO call to db.clearAll / addClient / addSession / setTherapistSetting /
  //     updateSnippet.
  //   - NO localStorage.setItem('portfolio*') call (no false-positive "last
  //     export" advance, no settings.language / settings.theme overwrite).
  //   - Returns a memory-only result object describing the manifest header.
  //
  // Reject paths surface honest, distinct error messages (i18n keys resolved
  // via _t with EN fallbacks):
  //   - File extension !== 'sgbackup' (.zip / .json / etc.) → notEncrypted.
  //     This is the V5 input-validation defense (T-25-03-04): we never call
  //     _decryptBlob on a non-encrypted file.
  //   - _decryptBlob returns null (magic bytes mismatch)       → invalid.
  //   - crypto.subtle.decrypt throws OperationError            → wrongPassphrase.
  //   - JSZip.loadAsync resolves but backup.json is missing    → invalid.
  //   - backup.json parses but JSON.parse throws               → invalid.
  // ---------------------------------------------------------------------------

  async function testBackupPassword(file, passphrase) {
    if (!file) throw new Error(_t('backup.testPassword.invalid'));
    var name = file.name || '';
    var ext = name.split('.').pop().toLowerCase();
    if (ext !== 'sgbackup') {
      throw new Error(_t('backup.testPassword.notEncrypted'));
    }
    var zipBlob;
    try {
      zipBlob = await _decryptBlob(file, passphrase);
    } catch (err) {
      if (err && err.name === 'OperationError') {
        throw new Error(_t('backup.testPassword.wrongPassphrase'));
      }
      throw err;
    }
    if (!zipBlob) {
      // _decryptBlob returns null when SGBACKUP_MAGIC does not match — the
      // file claims to be .sgbackup but its header bytes say otherwise.
      throw new Error(_t('backup.testPassword.invalid'));
    }
    var arrayBuffer = await zipBlob.arrayBuffer();
    var zip = await JSZip.loadAsync(arrayBuffer);
    var jsonFile = zip.file('backup.json');
    if (!jsonFile) {
      throw new Error(_t('backup.testPassword.invalid'));
    }
    var text = await jsonFile.async('string');
    var manifest;
    try {
      manifest = JSON.parse(text);
    } catch (_) {
      throw new Error(_t('backup.testPassword.invalid'));
    }
    // Memory-only result. NOT calling normalizeManifest deliberately: that
    // function mutates its argument with defensive defaults — we want the
    // raw manifest header for the result, and an undefined clients/sessions
    // array is treated as count 0.
    return {
      ok: true,
      manifestVersion: manifest.version || null,
      exportedAt: manifest.exportedAt || null,
      clientCount: Array.isArray(manifest.clients) ? manifest.clients.length : 0,
      sessionCount: Array.isArray(manifest.sessions) ? manifest.sessions.length : 0
    };
  }

  // ---------------------------------------------------------------------------
  // importBackup — accept a File, detect format, restore
  // ---------------------------------------------------------------------------

  /**
   * Import a backup file (.sgbackup encrypted, ZIP, or legacy JSON).
   * Does NOT show any confirmation dialog for ZIP/JSON — callers must do that
   * before calling. For .sgbackup files the passphrase modal is shown internally.
   *
   * File input callers should accept: .sgbackup,.zip,.json
   *
   * Steps:
   *  1. Detect format by file extension (.sgbackup → decrypt first)
   *  2. Parse manifest (normalize for version compatibility)
   *  3. If ZIP: reconstruct photo data URLs from the photos/ subfolder
   *  4. clearAll() then addClient() / addSession() for every record
   *  5. Restore settings (language, theme) if present in manifest
   *  6. Set portfolioLastExport = now
   */
  async function importBackup(file) {
    if (!file) throw new Error("No file provided");

    var name = file.name || "";
    var ext = name.split(".").pop().toLowerCase();

    // .sgbackup — encrypted format: prompt for passphrase, decrypt, then
    // re-enter importBackup with the decrypted ZIP blob
    if (ext === "sgbackup") {
      return new Promise(function(resolve, reject) {
        _showPassphraseModal({
          mode: 'decrypt',
          onConfirm: async function(passphrase) {
            try {
              var zipBlob = await _decryptBlob(file, passphrase);
              if (!zipBlob) {
                reject(new Error('Not a valid .sgbackup file'));
                return;
              }
              // Create a File-like object from the decrypted ZIP blob and
              // recursively call importBackup to process via normal ZIP path
              var zipFile = new File([zipBlob], 'backup.zip', { type: 'application/zip' });
              var result = await importBackup(zipFile);
              resolve(result);
            } catch (err) {
              if (err.name === 'OperationError') {
                // AES-GCM authentication failure = wrong passphrase
                reject(new Error(_t('backup.passphrase.wrongPassphrase')));
              } else {
                reject(err);
              }
            }
          },
          onCancel: function() { resolve(null); }
        });
      });
    }

    var manifest;

    if (ext === "json") {
      // Legacy JSON format
      var text = await _readFileAsText(file);
      var parsed = JSON.parse(text);
      manifest = normalizeManifest(parsed);
      // Photos in old format are already inline base64 — nothing to do

    } else if (ext === "zip") {
      // Current ZIP format
      var arrayBuffer = await _readFileAsArrayBuffer(file);
      var zip = await JSZip.loadAsync(arrayBuffer);

      // Extract and parse the manifest JSON
      var jsonFile = zip.file("backup.json");
      if (!jsonFile) {
        throw new Error("Invalid backup: backup.json not found in ZIP");
      }
      var jsonText = await jsonFile.async("string");
      manifest = normalizeManifest(JSON.parse(jsonText));

      // Reconstruct photo data URLs for version-1 manifests
      if (manifest.version >= 1) {
        manifest.clients = await Promise.all(
          manifest.clients.map(async function (client) {
            var c = Object.assign({}, client);
            // Check both fields — photo and photoData
            var photoRef = c.photoData || c.photo;
            if (photoRef && typeof photoRef === "string" && photoRef.startsWith("photos/")) {
              var photoFilename = photoRef.replace(/^photos\//, "");
              var photoExt = photoFilename.split(".").pop();
              var photoEntry = zip.file(photoRef);
              if (photoEntry) {
                var base64Data = await photoEntry.async("base64");
                var mime = _mimeFromExt(photoExt);
                var dataUrl = "data:" + mime + ";base64," + base64Data;
                c.photoData = dataUrl;
                c.photo = dataUrl;
              } else {
                console.warn("BackupManager: missing photo file in ZIP:", photoRef);
                c.photoData = null;
                c.photo = null;
              }
            }
            return c;
          })
        );
      }

    } else {
      throw new Error("Unsupported backup format: ." + ext + ". Please select a .zip or .json file.");
    }

    // Restore data — Replace strategy: clear everything, then add
    var db = window.PortfolioDB;
    await db.clearAll();

    for (var i = 0; i < manifest.clients.length; i++) {
      await db.addClient(manifest.clients[i]);
    }
    for (var j = 0; j < manifest.sessions.length; j++) {
      await db.addSession(manifest.sessions[j]);
    }

    // Phase 22: restore therapist settings (custom labels + disabled flags).
    // Whitelist sectionKey to prevent storing arbitrary keys from a crafted
    // backup (T-22-07-01). Type-coerce customLabel/enabled (T-22-07-03). A row
    // that fails to write is logged and skipped — the restore continues
    // (T-22-07-07: clients/sessions already restored, partial therapistSettings
    // restoration is preferable to a thrown error).
    var ALLOWED_KEYS = [
      "trapped",
      "insights",
      "limitingBeliefs",
      "additionalTech",
      "heartShield",
      "heartShieldEmotions",
      "issues",
      "comments",
      "nextSession",
    ];
    for (var k = 0; k < manifest.therapistSettings.length; k++) {
      var rec = manifest.therapistSettings[k];
      if (!rec || typeof rec !== "object" || typeof rec.sectionKey !== "string") {
        console.warn("Backup restore: skipping malformed therapistSettings row", rec);
        continue;
      }
      if (ALLOWED_KEYS.indexOf(rec.sectionKey) === -1) {
        console.warn("Backup restore: ignoring unknown sectionKey", rec.sectionKey);
        continue;
      }
      var cleanRec = {
        sectionKey: rec.sectionKey,
        customLabel: (typeof rec.customLabel === "string") ? rec.customLabel : null,
        enabled: (typeof rec.enabled === "boolean") ? rec.enabled : true,
      };
      try {
        await db.setTherapistSetting(cleanRec);
      } catch (e) {
        console.warn("Backup restore: setTherapistSetting failed for", cleanRec.sectionKey, e);
      }
    }

    // Phase 24 Plan 04: restore snippets. Each row passes through
    // validateSnippetShape so malformed entries from crafted backups are
    // skipped (logged) rather than aborting the whole restore — matches the
    // partial-restore preference established for therapistSettings.
    if (Array.isArray(manifest.snippets) && manifest.snippets.length > 0 &&
        typeof db.validateSnippetShape === "function" &&
        typeof db.updateSnippet === "function") {
      for (var n = 0; n < manifest.snippets.length; n++) {
        var snip = manifest.snippets[n];
        try {
          db.validateSnippetShape(snip);
          await db.updateSnippet(snip); // put — overwrites if id exists
        } catch (e) {
          console.warn("Backup restore: skipping malformed snippet", snip && snip.id, e && e.message);
        }
      }
      // Refresh the in-memory cache so the trigger engine sees imported snippets.
      try {
        if (window.App && typeof window.App.refreshSnippetCache === "function") {
          await window.App.refreshSnippetCache();
        }
      } catch (_) { /* ignore */ }
    }

    // Restore settings
    if (manifest.settings) {
      if (manifest.settings.language) {
        localStorage.setItem("portfolioLang", manifest.settings.language);
      }
      if (manifest.settings.theme) {
        localStorage.setItem("portfolioTheme", manifest.settings.theme);
      }
    }

    // Record import as a fresh data state
    localStorage.setItem("portfolioLastExport", String(Date.now()));

    return manifest;
  }

  // ---------------------------------------------------------------------------
  // File System Access API — auto-save to user-chosen folder
  // ---------------------------------------------------------------------------

  /**
   * Check whether the File System Access API (showDirectoryPicker) is available.
   */
  function isAutoBackupSupported() {
    return "showDirectoryPicker" in window;
  }

  /**
   * Check whether a folder has been picked and stored this session.
   */
  function isAutoBackupActive() {
    return _savedDirHandle !== null;
  }

  /**
   * Prompt the user to pick a folder for automatic backups.
   * Stores the handle module-internally.
   * Returns the FileSystemDirectoryHandle on success, null if cancelled or unsupported.
   */
  async function pickBackupFolder() {
    if (!isAutoBackupSupported()) return null;

    try {
      var handle = await window.showDirectoryPicker({ mode: "readwrite" });
      _savedDirHandle = handle;
      localStorage.setItem("portfolioAutoBackupEnabled", "true");
      return handle;
    } catch (err) {
      if (err && (err.name === "AbortError" || err.code === 20)) {
        // User cancelled the picker
        return null;
      }
      throw err;
    }
  }

  /**
   * Save a backup blob to the previously-picked folder.
   * Returns true on success, false if no folder is set or on write error.
   */
  async function autoSaveToFolder(blob, filename) {
    if (!_savedDirHandle) return false;

    try {
      // Verify / request write permission
      var perm = await _savedDirHandle.queryPermission({ mode: "readwrite" });
      if (perm !== "granted") {
        perm = await _savedDirHandle.requestPermission({ mode: "readwrite" });
      }
      if (perm !== "granted") return false;

      var fileHandle = await _savedDirHandle.getFileHandle(filename, { create: true });
      var writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      return true;
    } catch (err) {
      console.warn("BackupManager: autoSaveToFolder failed:", err);
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Private file-reading helpers
  // ---------------------------------------------------------------------------

  function _readFileAsText(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function (e) { resolve(e.target.result); };
      reader.onerror = function () { reject(new Error("Failed to read file as text")); };
      reader.readAsText(file);
    });
  }

  function _readFileAsArrayBuffer(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function (e) { resolve(e.target.result); };
      reader.onerror = function () { reject(new Error("Failed to read file as ArrayBuffer")); };
      reader.readAsArrayBuffer(file);
    });
  }

  // ---------------------------------------------------------------------------
  // Phase 25 Plan 02 — Backup contents source-of-truth + recency-state helper
  // ---------------------------------------------------------------------------

  /**
   * Canonical list of IDB stores that round-trip through Export → Import.
   * Consumed by:
   *   - The Backup & Restore modal's "What's in your backup" checklist (D-09)
   *   - tests/25-02-checklist-store-parity.test.js (regression-guard against
   *     a new db.js store shipping without updating exportBackup)
   *   - Plan 08's round-trip test (canonical store list)
   *
   * D-29: when a new IDB store is added to db.js, this array AND exportBackup's
   * manifest object MUST be updated in the same change. The parity test enforces it.
   *
   * 'photos' is special — photos live as files inside the ZIP (photosFolder),
   * not as a top-level manifest key. The parity test handles it separately.
   */
  var BACKUP_CONTENTS_KEYS = ['clients', 'sessions', 'snippets', 'therapistSettings', 'photos'];

  // -------------------------------------------------------------------------
  // Phase 25 Plan 04 — schedule-interval map + chip-state derivation (D-14/D-30)
  // -------------------------------------------------------------------------

  /**
   * Canonical schedule-interval map. Single source of truth (D-30) consumed by:
   *   - computeBackupRecencyState (cloud icon mount-time + post-mount state)
   *   - checkBackupReminder (app.js banner suppression — D-15/D-19)
   *   - Plan 05's schedule-fire scheduler (interval-end prompt)
   */
  var SCHEDULE_INTERVAL_MS = {
    daily:   24 * 60 * 60 * 1000,
    weekly:  7 * 24 * 60 * 60 * 1000,
    monthly: 30 * 24 * 60 * 60 * 1000
  };

  /**
   * Read the active backup-schedule interval in milliseconds.
   *
   * Returns null when no schedule is configured (mode missing, mode='off',
   * or mode is an unrecognized string). Returns a positive number for
   * daily/weekly/monthly/custom (custom falls back to 7 days when the
   * day count is missing/zero/invalid).
   *
   * Defensive: localStorage access is wrapped in try/catch so the helper
   * never throws on pages where storage is disabled.
   */
  function getScheduleIntervalMs() {
    var mode;
    try {
      mode = localStorage.getItem('portfolioBackupScheduleMode') || 'off';
    } catch (_) {
      return null;
    }
    if (mode === 'off') return null;
    if (mode === 'custom') {
      var raw;
      try { raw = Number(localStorage.getItem('portfolioBackupScheduleCustomDays')); }
      catch (_) { raw = NaN; }
      var days = (raw && raw > 0) ? raw : 7;
      return days * 24 * 60 * 60 * 1000;
    }
    return SCHEDULE_INTERVAL_MS[mode] || null;
  }

  /**
   * Pure-function cloud-icon state derivation. Returns one of:
   *   'never' | 'fresh' | 'warning' | 'danger'.
   *
   * Function name retained for code-stability (referenced from VALIDATION.md
   * and the Plan 04 source-of-truth chain). No chip DOM element exists
   * anymore — this helper drives the cloud icon's background color (D-13
   * updated 2026-05-15).
   *
   * Thresholds (D-14 updated 2026-05-15 — Ben confirmed 3-color intent):
   *   intervalMs === null (schedule OFF): fresh ≤7d, warning >7 ≤14d, danger >14d.
   *   intervalMs > 0     (schedule ON):  fresh ≤ intervalMs,
   *                                       warning > intervalMs AND ≤ intervalMs×2,
   *                                       danger > intervalMs×2.
   * Boundary semantics: <= is fresh, > is escalation.
   */
  function getChipState(opts) {
    opts = opts || {};
    var now = (typeof opts.now === 'number') ? opts.now : Date.now();
    var lastExport = opts.lastExport;
    if (lastExport === null || typeof lastExport === 'undefined' || isNaN(lastExport)) {
      return 'never';
    }
    var intervalMs = (typeof opts.intervalMs === 'number') ? opts.intervalMs : null;
    var elapsed = now - Number(lastExport);
    var DAY = 24 * 60 * 60 * 1000;
    var freshLimit, warningLimit;
    if (intervalMs === null) {
      freshLimit = 7 * DAY;
      warningLimit = 14 * DAY;
    } else {
      freshLimit = intervalMs;
      warningLimit = intervalMs * 2;
    }
    if (elapsed <= freshLimit) return 'fresh';
    if (elapsed <= warningLimit) return 'warning';
    return 'danger';
  }

  /**
   * Cloud-icon state surface. Public API — consumed by:
   *   - App.mountBackupCloudButton (Plan 02 mount-time state class)
   *   - App.updateBackupCloudState (Plan 04 post-mount updater)
   *
   * Plan 02 stub body REPLACED in Plan 04 with a one-line delegation to
   * getChipState + getScheduleIntervalMs (D-30 single source of truth).
   * The function name and signature are unchanged so Plan 02's callers
   * keep working.
   *
   * Defensive: any localStorage read failure (e.g., disabled storage on
   * legal pages) falls back to 'never' so the icon never throws at mount.
   */
  function computeBackupRecencyState() {
    try {
      var raw = localStorage.getItem('portfolioLastExport');
      var lastExport = raw ? Number(raw) : null;
      return getChipState({ now: Date.now(), lastExport: lastExport, intervalMs: getScheduleIntervalMs() });
    } catch (_) {
      return 'never';
    }
  }

  // -------------------------------------------------------------------------
  // Phase 25 Plan 05 — Foreground schedule check + password-mandatory gate
  // -------------------------------------------------------------------------

  /**
   * Foreground schedule check (D-17). Called on page load and on
   * visibilitychange='visible' from assets/app.js. When the elapsed time
   * since the last export exceeds the schedule interval AND the 1-hour
   * debounce key is not active, opens the unified Backup & Restore modal
   * via window.openBackupModal() — D-20 prohibits silent folder-write, so
   * the user must press Export themselves.
   *
   * `opts.now` is optional and used by tests to inject a deterministic
   * timestamp; production callers pass nothing and `Date.now()` is used.
   *
   * Defensive: every localStorage access is wrapped in try/catch so a
   * disabled-storage page (e.g., legal disclaimer) never throws here.
   */
  function checkBackupSchedule(opts) {
    opts = opts || {};
    var now = (typeof opts.now === 'number') ? opts.now : Date.now();
    var intervalMs = getScheduleIntervalMs();
    // Schedule OFF — banner-suppression (Plan 04) is also OFF; the legacy
    // 7-day banner handles reminders. Never open the modal unsolicited.
    if (intervalMs === null) return;

    var lastExportRaw;
    try { lastExportRaw = localStorage.getItem('portfolioLastExport'); }
    catch (_) { return; }
    var lastExport = lastExportRaw ? Number(lastExportRaw) : 0;

    var dueAt = lastExport + intervalMs;
    if (now < dueAt) return;

    // 1-hour debounce so the prompt does not re-fire on every visibilitychange
    // flip in the same hour. Keyed on portfolioBackupSchedulePromptedAt.
    var lastPromptKey = 'portfolioBackupSchedulePromptedAt';
    var lastPrompt;
    try { lastPrompt = Number(localStorage.getItem(lastPromptKey)) || 0; }
    catch (_) { lastPrompt = 0; }
    if (now - lastPrompt < 60 * 60 * 1000) return;

    try { localStorage.setItem(lastPromptKey, String(now)); } catch (_) {}

    // Open the unified Backup & Restore modal (Plan 02 exposes
    // window.openBackupModal). The modal's Export section IS the
    // interval-end prompt — clicking Export routes through the encrypt-or-skip
    // flow, which then asks for the scheduled-backup password (D-18 — never
    // persisted, re-prompted every fire).
    try {
      if (typeof window !== 'undefined' && typeof window.openBackupModal === 'function') {
        window.openBackupModal();
      }
    } catch (_) {}
  }

  /**
   * D-18 password-mandatory gate. Returns true when the supplied schedule
   * mode is allowed to be persisted, false when the user has not yet
   * acknowledged that they have a backup password.
   *
   * Pure function — the only side-effect is a localStorage READ (no writes).
   * Consumed by the Settings → Backups handler in assets/settings.js AND
   * exposed for tests.
   */
  function canEnableSchedule(mode) {
    if (mode === 'off') return true;
    try { return localStorage.getItem('portfolioBackupSchedulePasswordAcked') === 'true'; }
    catch (_) { return false; }
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  return {
    exportBackup: exportBackup,
    exportEncryptedBackup: exportEncryptedBackup,
    triggerDownload: triggerDownload,
    importBackup: importBackup,
    shareBackup: shareBackup,
    isShareSupported: isShareSupported,
    testBackupPassword: testBackupPassword,
    pickBackupFolder: pickBackupFolder,
    autoSaveToFolder: autoSaveToFolder,
    normalizeManifest: normalizeManifest,
    isAutoBackupSupported: isAutoBackupSupported,
    isAutoBackupActive: isAutoBackupActive,
    BACKUP_CONTENTS_KEYS: BACKUP_CONTENTS_KEYS,
    computeBackupRecencyState: computeBackupRecencyState,
    getScheduleIntervalMs: getScheduleIntervalMs,
    getChipState: getChipState,
    checkBackupSchedule: checkBackupSchedule,
    canEnableSchedule: canEnableSchedule,
  };
})();
