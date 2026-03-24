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
      'backup.passphrase.skipEncryption': 'Skip encryption',
      'backup.passphrase.goBack': 'Go back',
      'backup.passphrase.encryptAndSave': 'Encrypt and save',
      'backup.passphrase.decrypt': 'Decrypt'
    };
    return fallbacks[key] || key;
  }

  function _showPassphraseModal(opts) {
    // opts: { mode: 'encrypt'|'decrypt', onConfirm: fn(passphrase), onCancel: fn() }
    var overlay = document.createElement('div');
    overlay.className = 'passphrase-modal-overlay';

    var modal = document.createElement('div');
    modal.className = 'passphrase-modal';

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
    modal.appendChild(heading);

    var warning = document.createElement('div');
    warning.className = 'passphrase-warning';
    warning.textContent = _t(isEncrypt ? 'backup.passphrase.warningEncrypt' : 'backup.passphrase.warningDecrypt');
    modal.appendChild(warning);

    if (isEncrypt) {
      var irreversible = document.createElement('div');
      irreversible.className = 'passphrase-irreversible';
      irreversible.textContent = _t('backup.passphrase.irreversible');
      modal.appendChild(irreversible);
    }

    var input1 = document.createElement('input');
    input1.type = 'password';
    input1.className = 'passphrase-input';
    input1.placeholder = _t('backup.passphrase.placeholder');
    input1.autocomplete = 'off';
    modal.appendChild(input1);

    var input2 = null;
    if (isEncrypt) {
      input2 = document.createElement('input');
      input2.type = 'password';
      input2.className = 'passphrase-input';
      input2.placeholder = _t('backup.passphrase.confirmPlaceholder');
      input2.autocomplete = 'off';
      modal.appendChild(input2);
    }

    var errorEl = document.createElement('div');
    errorEl.className = 'passphrase-error';
    errorEl.hidden = true;
    modal.appendChild(errorEl);

    var actions = document.createElement('div');
    actions.className = 'passphrase-actions';

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

    modal.appendChild(actions);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    setTimeout(function() { input1.focus(); }, 50);

    function validate() {
      var v1 = input1.value;
      if (!v1) { confirmBtn.disabled = true; return; }
      if (isEncrypt && input2) {
        confirmBtn.disabled = v1 !== input2.value || !v1;
      } else {
        confirmBtn.disabled = false;
      }
    }
    input1.addEventListener('input', validate);
    if (input2) input2.addEventListener('input', validate);

    function cleanup() { overlay.remove(); }

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
      cleanup();
      if (opts.onCancel) opts.onCancel();
    });

    modal.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !confirmBtn.disabled) confirmBtn.click();
      if (e.key === 'Escape') cancelBtn.click();
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
    if (!manifest.version) {
      // Old JSON-only format
      return {
        version: 0,
        exportedAt: manifest.exportedAt || null,
        appVersion: manifest.appVersion || null,
        clients: manifest.clients || [],
        sessions: manifest.sessions || [],
        settings: manifest.settings || null,
      };
    }
    // version 1 or future — trust the manifest
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
      version: 1,
      exportedAt: new Date().toISOString(),
      appVersion: "1.0",
      clients: clientsClean,
      sessions: allSessions,
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
   * Returns a Promise that resolves to:
   *   true  — user confirmed and file downloaded
   *   false — user clicked "Skip encryption"
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
            a.download = 'sessions-garden-' + dateStr + '.sgbackup';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(function() { URL.revokeObjectURL(url); }, 10000);
            localStorage.setItem("portfolioLastExport", String(Date.now()));
            resolve(true);
          } catch (err) {
            console.error('Encrypted backup failed:', err);
            reject(err);
          }
        },
        onCancel: function() { resolve(false); }
      });
    });
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
  // sendToMyself — download + open mailto
  // ---------------------------------------------------------------------------

  /**
   * Download the backup ZIP, then open the user's email client with a reminder
   * to attach the just-downloaded file.
   */
  async function sendToMyself(blob, filename) {
    // Trigger download first so the file is available for the user to attach
    triggerDownload(blob, filename);

    var today = new Date();
    var dateStr =
      today.getFullYear() +
      "-" +
      String(today.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(today.getDate()).padStart(2, "0");

    var subject = encodeURIComponent("Sessions Garden backup - " + dateStr);
    var body = encodeURIComponent(
      "Hi,\n\n" +
      "Please find attached the Sessions Garden backup file: " + filename + "\n\n" +
      "To restore from this backup, open Sessions Garden and use the Import option.\n\n" +
      "(This message was generated automatically by Sessions Garden)"
    );

    window.location.href = "mailto:?subject=" + subject + "&body=" + body;
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
  // Public API
  // ---------------------------------------------------------------------------

  return {
    exportBackup: exportBackup,
    exportEncryptedBackup: exportEncryptedBackup,
    triggerDownload: triggerDownload,
    importBackup: importBackup,
    sendToMyself: sendToMyself,
    pickBackupFolder: pickBackupFolder,
    autoSaveToFolder: autoSaveToFolder,
    normalizeManifest: normalizeManifest,
    isAutoBackupSupported: isAutoBackupSupported,
    isAutoBackupActive: isAutoBackupActive,
  };
})();
