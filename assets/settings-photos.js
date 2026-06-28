// ────────────────────────────────────────────────────────────────────────
// Phase 25 Plan 07 — Photos Settings tab
//
// Owns the Settings → Photos tab body. Two bulk operations:
//   - Optimize all photos (D-24): walks every client.photoData through the
//     same CropModule.resizeToMaxDimension(blob, 800, 0.75) that powers new
//     uploads (D-30 single-source-of-truth). Only persists when the new size
//     is strictly smaller than the original — no-op on already-optimized
//     photos. Confirm dialog uses tone:'neutral' (irreversible but not
//     destructive: visual quality stays the same).
//   - Delete all photos (D-25): walks every client and clears photoData via
//     PortfolioDB.updateClient — same write path as the existing edit-client
//     save (D-30). Confirm dialog uses tone:'danger'.
//
// Storage usage line reads PortfolioDB.estimatePhotosBytes(clients) for the
// photo-only number; falls back to navigator.storage.estimate() top-level
// usage when no photos exist. Photos tab also hides the action sections and
// surfaces an empty state when no client has photoData.
//
// Two testable loop helpers live INSIDE the IIFE and are exposed on
// window.__PhotosTabHelpers (mirror of the Plan 24 __SnippetEditorHelpers
// pattern). Tests inject getAllClients + updateClient (+ resize + dataURL
// adapters for the optimize loop) as function dependencies — no IDB.
// ────────────────────────────────────────────────────────────────────────
(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }

  // ── humanBytes — display formatter (KB/MB) per RESEARCH pattern. ──
  function humanBytes(n) {
    if (n == null || isNaN(n)) return '—';
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / (1024 * 1024)).toFixed(1) + ' MB';
  }

  // Phase 25 Plan 12 post-UAT fix (bug 3, 2026-05-15) — per-photo
  // "already-optimized" threshold. A photo that has been through the
  // resize-to-800px @ q=0.75 pipeline typically lands in the 30-80 KB
  // range. Anything below 100 KB is treated as already-optimized and
  // contributes 0 to the savings estimate. Photos at or above 100 KB
  // are assumed to have ~60% room to shrink (matches the historical
  // heuristic, but now applied per-photo instead of to the total).
  //
  // Why a constant (vs. a deeper dry-run): a true dry-run would decode
  // every photo, run resizeToMaxDimension, encode, and measure — that
  // is expensive enough to delay the confirm dialog noticeably for
  // larger portfolios. The threshold heuristic is fast, schema-free,
  // and accurate enough for the user-facing "Estimated savings: ~XX"
  // line; the actual loop still only persists when the new size is
  // strictly smaller, so the heuristic can never cause data corruption.
  var PHOTO_OPTIMIZED_BYTES_THRESHOLD = 100 * 1024; // 100 KB

  // Phase 25 Plan 12 round-2 post-UAT fix (Change B, 2026-05-15) —
  // display floor for the savings estimate. When estimatePhotoSavings
  // returns < ESTIMATE_DISPLAY_FLOOR_BYTES, the UI (refreshPhotosTab
  // inline preview + handleOptimize confirm dialog) renders the
  // friendly i18n string `photos.optimize.minimal` instead of a tiny
  // raw byte count. Below ~1 KB the user gains no signal from the
  // number itself — the optimize button still runs and still saves
  // ~50 bytes of metadata, but the friendly text is more honest about
  // the magnitude. 1 KB feels right next to the 100 KB threshold above:
  // sub-KB is "not worth showing as bytes," KB-scale is worth showing.
  var ESTIMATE_DISPLAY_FLOOR_BYTES = 1024; // 1 KB

  // Phase 25 round-5 post-UAT (Change 3, 2026-05-15) — the
  // optimize-estimate VERDICT threshold. Folded into the storage-usage
  // line as a 3-tier verdict recomputed on every refreshPhotosTab:
  //   S < ESTIMATE_DISPLAY_FLOOR_BYTES (1 KB)      → "already compact"
  //   ESTIMATE_DISPLAY_FLOOR_BYTES ≤ S < this (2 MB) → "optional"
  //   S ≥ OPTIMIZE_RECOMMEND_THRESHOLD_BYTES (2 MB) → "recommended"
  // 2 MB is the point where shrinking photos is worth a deliberate
  // recommendation (a few hundred KB is "nice to have"; multi-MB is a
  // meaningful local-storage + app-speed win for a therapist on a phone).
  var OPTIMIZE_RECOMMEND_THRESHOLD_BYTES = 2 * 1024 * 1024; // 2 MB

  /**
   * estimatePhotoSavings — per-photo savings estimate with a threshold
   * gate. Photos already at or below PHOTO_OPTIMIZED_BYTES_THRESHOLD
   * contribute 0 (they are assumed already-optimized).
   *
   * @param {Array<{photoData?:string, photo?:string}>} clients
   * @returns {number} estimated saved bytes
   */
  function estimatePhotoSavings(clients) {
    if (!Array.isArray(clients)) return 0;
    var total = 0;
    for (var i = 0; i < clients.length; i++) {
      var c = clients[i] || {};
      var photo = c.photoData || c.photo;
      if (typeof photo !== 'string') continue;
      if (photo.indexOf('data:') !== 0) continue;
      var commaIdx = photo.indexOf(',');
      if (commaIdx < 0) continue;
      var b64 = photo.slice(commaIdx + 1);
      var bytes = Math.floor(b64.length * 0.75);
      if (bytes > PHOTO_OPTIMIZED_BYTES_THRESHOLD) {
        total += Math.floor(bytes * 0.6);
      }
    }
    return total;
  }

  // ── dataURL ↔ Blob conversion (both directions for the optimize loop). ──
  function dataURLToBlob(dataURL) {
    var commaIdx = dataURL.indexOf(',');
    var header = dataURL.slice(0, commaIdx);
    var b64 = dataURL.slice(commaIdx + 1);
    var mime = (header.match(/data:([^;]+)/) || [])[1] || 'image/jpeg';
    var bytes = atob(b64);
    var arr = new Uint8Array(bytes.length);
    for (var i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }
  function blobToDataURL(blob) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () { resolve(fr.result); };
      fr.onerror = function () { reject(new Error('FileReader failed')); };
      fr.readAsDataURL(blob);
    });
  }

  // ──────────────────────────────────────────────────────────────────
  // Pure loop helpers — testable via injected function dependencies.
  // Exposed on window.__PhotosTabHelpers for the regression tests.
  // ──────────────────────────────────────────────────────────────────

  /**
   * _deleteAllPhotosLoop — clears photoData on every client that has one.
   * @param {() => Promise<Client[]>} getAllClients
   * @param {(c: Client) => Promise<void>} updateClient
   * @returns {Promise<{success:number, failed:number}>}
   */
  async function _deleteAllPhotosLoop(getAllClients, updateClient) {
    var success = 0;
    var failed = 0;
    var clients = await getAllClients();
    for (var i = 0; i < clients.length; i++) {
      var c = clients[i];
      if (!c || !c.photoData) continue;          // skip clients without photos
      try {
        var updated = Object.assign({}, c, { photoData: '' });
        await updateClient(updated);
        success++;
      } catch (_) {
        failed++;
      }
    }
    return { success: success, failed: failed };
  }

  /**
   * _optimizeAllPhotosLoop — re-runs the resize-on-upload pipeline for every
   * stored photo. Only persists when the new size is strictly smaller, so
   * already-optimized photos are a no-op (avoids bloat regression).
   *
   * @param {() => Promise<Client[]>} getAllClients
   * @param {(c: Client) => Promise<void>} updateClient
   * @param {(blob: Blob, maxEdge: number, quality: number) => Promise<Blob>} resize
   *        — CropModule.resizeToMaxDimension (D-30 single-source-of-truth with Plan 06).
   * @param {(blob: Blob) => Promise<string>} blobToDataURLFn
   * @param {(dataURL: string) => Blob} dataURLToBlobFn
   * @returns {Promise<{success:number, failed:number, savedBytes:number}>}
   */
  async function _optimizeAllPhotosLoop(getAllClients, updateClient, resize, blobToDataURLFn, dataURLToBlobFn) {
    var success = 0;
    var failed = 0;
    var savedBytes = 0;
    var clients = await getAllClients();
    for (var i = 0; i < clients.length; i++) {
      var c = clients[i];
      if (!c || typeof c.photoData !== 'string' || !c.photoData.startsWith('data:')) continue;
      try {
        var origCommaIdx = c.photoData.indexOf(',');
        var origBytes = Math.floor(((c.photoData.slice(origCommaIdx + 1)) || '').length * 0.75);
        var inBlob = dataURLToBlobFn(c.photoData);
        var outBlob = await resize(inBlob, 800, 0.75);
        var outDataURL = await blobToDataURLFn(outBlob);
        var newCommaIdx = outDataURL.indexOf(',');
        var newBytes = Math.floor(((outDataURL.slice(newCommaIdx + 1)) || '').length * 0.75);
        // Only persist if it actually got smaller — avoid bloating
        // already-optimized photos that re-encode to the same or larger size.
        if (newBytes < origBytes) {
          var updated = Object.assign({}, c, { photoData: outDataURL });
          await updateClient(updated);
          savedBytes += (origBytes - newBytes);
          success++;
        }
      } catch (_) {
        failed++;
      }
    }
    return { success: success, failed: failed, savedBytes: savedBytes };
  }

  // Expose for unit tests (mirrors __SnippetEditorHelpers at settings.js:762).
  if (typeof window !== 'undefined') {
    window.__PhotosTabHelpers = {
      _deleteAllPhotosLoop: _deleteAllPhotosLoop,
      _optimizeAllPhotosLoop: _optimizeAllPhotosLoop,
      // Adapters re-exposed so the Task-2 UI handlers (defined below) and
      // future maintainers share the same conversion code path.
      humanBytes: humanBytes,
      dataURLToBlob: dataURLToBlob,
      blobToDataURL: blobToDataURL,
      // Plan 12 post-UAT fix (bug 3): per-photo savings estimator used
      // by handleOptimize for the confirm-dialog estimate. Replaces the
      // flat photoBytes*0.6 heuristic that produced stale estimates
      // after the first optimize pass.
      estimatePhotoSavings: estimatePhotoSavings,
      PHOTO_OPTIMIZED_BYTES_THRESHOLD: PHOTO_OPTIMIZED_BYTES_THRESHOLD,
      // Plan 12 round-2 post-UAT fix (Change B): expose the display
      // floor so the UI layers (refreshPhotosTab + handleOptimize) share
      // the same value (D-30 single-source) and tests can read it back.
      ESTIMATE_DISPLAY_FLOOR_BYTES: ESTIMATE_DISPLAY_FLOOR_BYTES,
      // Round-5 post-UAT (Change 3): the "recommended" verdict threshold
      // (2 MB). Single-source so refreshPhotosTab's 3-tier verdict and any
      // future caller agree, and tests can read it back.
      OPTIMIZE_RECOMMEND_THRESHOLD_BYTES: OPTIMIZE_RECOMMEND_THRESHOLD_BYTES,
    };
  }

  // Task 2 (UI wiring) is appended below this IIFE.
})();

// ────────────────────────────────────────────────────────────────────────
// Phase 25 Plan 07 Task 2 — Photos Settings tab UI wiring
//
// Reads PortfolioDB.estimatePhotosBytes + navigator.storage.estimate to
// render the usage line, hides the action sections + surfaces an empty
// state when no photos exist, and invokes the testable loop helpers
// (window.__PhotosTabHelpers) on button clicks behind confirm dialogs.
//
// Optimize-all confirm uses tone:'neutral' (UI-SPEC: irreversible but the
// visual quality stays the same — not a destructive action). Delete-all
// confirm uses tone:'danger'.
// ────────────────────────────────────────────────────────────────────────
(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }

  function tt(key, fallback) {
    if (typeof App !== 'undefined' && typeof App.t === 'function') {
      var v = App.t(key);
      if (v && v !== key) return v;
    }
    return fallback || key;
  }

  function readHumanBytes(n) {
    var h = window.__PhotosTabHelpers;
    if (h && typeof h.humanBytes === 'function') return h.humanBytes(n);
    if (n == null || isNaN(n)) return '—';
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / (1024 * 1024)).toFixed(1) + ' MB';
  }

  /**
   * refreshPhotosTab — re-renders the storage usage line, empty state, and
   * optimize/delete sections based on the current set of clients.
   */
  async function refreshPhotosTab() {
    var usageEl = $('photosStorageUsage');
    var emptyEl = $('photosEmpty');
    var optimizeBtn = $('photosOptimizeBtn');
    var deleteAllBtn = $('photosDeleteAllBtn');
    var previewEl = $('photosOptimizePreview');
    var optimizeSection = $('photosOptimizeSection');
    var deleteSection = $('photosDeleteAllSection');
    if (!usageEl) return; // not on this page

    var clients = [];
    try {
      if (typeof PortfolioDB !== 'undefined' && typeof PortfolioDB.getAllClients === 'function') {
        clients = await PortfolioDB.getAllClients();
      }
    } catch (_) {}

    var photoBytes = 0;
    if (typeof PortfolioDB !== 'undefined' && typeof PortfolioDB.estimatePhotosBytes === 'function') {
      photoBytes = PortfolioDB.estimatePhotosBytes(clients);
    }
    var hasPhotos = photoBytes > 0;

    if (emptyEl && optimizeSection && deleteSection) {
      if (hasPhotos) {
        emptyEl.classList.add('is-hidden');
        optimizeSection.removeAttribute('hidden');
        deleteSection.removeAttribute('hidden');
      } else {
        emptyEl.classList.remove('is-hidden');
        optimizeSection.setAttribute('hidden', '');
        deleteSection.setAttribute('hidden', '');
      }
    }

    // Storage usage line: prefer the photo-only number; only fall back to
    // navigator.storage.estimate top-level when no photos exist.
    var displayBytes = photoBytes;
    if (!hasPhotos && typeof navigator !== 'undefined' &&
        navigator.storage && typeof navigator.storage.estimate === 'function') {
      try {
        var est = await navigator.storage.estimate();
        if (est && typeof est.usage === 'number') {
          displayBytes = est.usage; // total app storage, not photo-only
        }
      } catch (_) {}
    }

    if (hasPhotos) {
      usageEl.removeAttribute('data-i18n');
      // Phase 25 round-5 post-UAT (Change 3, 2026-05-15) — fold a 3-tier
      // optimize VERDICT into the storage-usage line, recomputed on every
      // refreshPhotosTab() call. Replaces the standalone savings-preview /
      // "Minimal savings expected" line (UAT-C3's photos.usage.body is
      // kept as a back-compat fallback but the live render now selects
      // compact / optional / recommended):
      //
      //   S < ESTIMATE_DISPLAY_FLOOR_BYTES (1 KB)   → photos.usage.compact
      //   1 KB ≤ S < OPTIMIZE_RECOMMEND (2 MB)       → photos.usage.optional
      //   S ≥ OPTIMIZE_RECOMMEND_THRESHOLD (2 MB)    → photos.usage.recommended
      //
      // Estimate routes through __PhotosTabHelpers.estimatePhotoSavings
      // (D-30 single-source with handleOptimize). {size} = total photo
      // storage; {savings} = estimated freeable bytes.
      var _ph = (typeof window !== 'undefined' && window.__PhotosTabHelpers) || null;
      var estimated = (_ph && typeof _ph.estimatePhotoSavings === 'function')
        ? _ph.estimatePhotoSavings(clients)
        : Math.floor(photoBytes * 0.6);
      var floorBytes = (_ph && typeof _ph.ESTIMATE_DISPLAY_FLOOR_BYTES === 'number')
        ? _ph.ESTIMATE_DISPLAY_FLOOR_BYTES
        : 1024;
      var recommendBytes = (_ph && typeof _ph.OPTIMIZE_RECOMMEND_THRESHOLD_BYTES === 'number')
        ? _ph.OPTIMIZE_RECOMMEND_THRESHOLD_BYTES
        : 2 * 1024 * 1024;

      var verdictKey, verdictFallback, verdictTier;
      if (estimated < floorBytes) {
        verdictKey = 'photos.usage.compact';
        verdictFallback = 'Photos use {size} of your browser storage. Already compact — optimizing won\'t help.';
        verdictTier = 'compact';
      } else if (estimated < recommendBytes) {
        verdictKey = 'photos.usage.optional';
        verdictFallback = 'Photos use {size} of your browser storage. Optimizing could free about {savings} (optional).';
        verdictTier = 'optional';
      } else {
        verdictKey = 'photos.usage.recommended';
        verdictFallback = 'Photos use {size} of your browser storage. Optimizing could free about {savings} — recommended.';
        verdictTier = 'recommended';
      }
      var verdictTemplate = tt(verdictKey, verdictFallback);
      usageEl.textContent = verdictTemplate
        .replace('{size}', readHumanBytes(displayBytes))
        .replace('{savings}', readHumanBytes(estimated));
      // Phase 25 round-6 (Ben 2026-05-15): the folded verdict lost the
      // green treatment the old standalone savings line had and read as
      // dead static text. Tag the line with a tier class so it visibly
      // reads as a live recommendation, not a fixed caption.
      usageEl.classList.remove(
        'photos-usage-verdict--compact',
        'photos-usage-verdict--optional',
        'photos-usage-verdict--recommended'
      );
      usageEl.classList.add('photos-usage-verdict', 'photos-usage-verdict--' + verdictTier);

      // The standalone savings-preview line is absorbed into the verdict
      // above. Keep #photosOptimizePreview hidden during a normal render —
      // handleOptimize (UAT-D4) still writes the post-optimize result
      // there for ~8s, so we don't remove the element, just clear it.
      if (previewEl && !previewEl.classList.contains('photos-savings-preview--result')) {
        previewEl.textContent = '';
        previewEl.setAttribute('hidden', '');
      }
    } else {
      usageEl.setAttribute('data-i18n', 'photos.usage.unavailable');
      usageEl.textContent = tt('photos.usage.unavailable', 'Storage usage is not available in this browser.');
      usageEl.classList.remove(
        'photos-usage-verdict',
        'photos-usage-verdict--compact',
        'photos-usage-verdict--optional',
        'photos-usage-verdict--recommended'
      );
      if (previewEl) previewEl.setAttribute('hidden', '');
    }
  }

  /**
   * handleOptimize — confirm via App.confirmDialog (tone:'neutral'), then
   * invoke _optimizeAllPhotosLoop with the production dependencies:
   *   - PortfolioDB.getAllClients
   *   - PortfolioDB.updateClient (same write path as edit-client save — D-30)
   *   - CropModule.resizeToMaxDimension (same resize as add-client — D-30)
   */
  async function handleOptimize() {
    var btn = $('photosOptimizeBtn');
    if (!btn) return;

    var clients = [];
    try {
      if (typeof PortfolioDB !== 'undefined' && typeof PortfolioDB.getAllClients === 'function') {
        clients = await PortfolioDB.getAllClients();
      }
    } catch (_) {}

    var photoBytes = (typeof PortfolioDB !== 'undefined' && typeof PortfolioDB.estimatePhotosBytes === 'function')
      ? PortfolioDB.estimatePhotosBytes(clients) : 0;
    if (photoBytes === 0) {
      if (typeof App !== 'undefined' && typeof App.showToast === 'function') {
        App.showToast('', 'photos.empty');
      }
      return;
    }

    // Phase 25 Plan 12 UAT-C2: count photos AND compute estimated savings up
    // front so we can pass them through the confirmDialog placeholders bag.
    // The dialog title carries {n} and the body carries {n} + {size}; both
    // must be substituted BEFORE render — see App.confirmDialog placeholders
    // option (Plan 12 extension).
    var photoCount = 0;
    for (var pi = 0; pi < clients.length; pi++) {
      var c = clients[pi];
      if (c && typeof c.photoData === 'string' && c.photoData.indexOf(',') !== -1) {
        photoCount++;
      }
    }
    // Phase 25 Plan 12 post-UAT fix (bug 3, 2026-05-15): use the
    // per-photo threshold heuristic from __PhotosTabHelpers.estimatePhotoSavings
    // instead of the flat `photoBytes * 0.6`. Already-optimized photos
    // (each below PHOTO_OPTIMIZED_BYTES_THRESHOLD = 100 KB) contribute 0
    // to the estimate, so a second optimize click after the photos have
    // been shrunk shows a near-zero estimate instead of the stale MB-scale
    // number the flat heuristic produced. The actual loop still only
    // persists when the new size is strictly smaller, so the estimate
    // remains advisory — it can never cause data corruption.
    var _photosHelpers = (typeof window !== 'undefined' && window.__PhotosTabHelpers) || null;
    var estimatedSavings;
    if (_photosHelpers && typeof _photosHelpers.estimatePhotoSavings === 'function') {
      estimatedSavings = _photosHelpers.estimatePhotoSavings(clients);
    } else {
      // Defensive fallback (should never hit in production — the helper
      // is exported above and runs in the same settings.js bundle).
      estimatedSavings = Math.floor(photoBytes * 0.6);
    }
    // Phase 25 Plan 12 round-2 post-UAT fix (Change B, 2026-05-15):
    // when the estimate is below the display floor (~1 KB), pass the
    // friendly i18n string `photos.optimize.minimal` as the {size}
    // placeholder instead of a raw byte amount. The dialog still opens
    // and the user can still confirm — the optimize loop continues to
    // skip photos that wouldn't shrink (avoiding the bloat regression).
    var floorBytes = (_photosHelpers && typeof _photosHelpers.ESTIMATE_DISPLAY_FLOOR_BYTES === 'number')
      ? _photosHelpers.ESTIMATE_DISPLAY_FLOOR_BYTES
      : 1024;
    var estimatedSavingsLabel = (estimatedSavings >= floorBytes)
      ? readHumanBytes(estimatedSavings)
      : tt('photos.optimize.minimal', 'Minimal savings expected');

    var confirmed = false;
    if (typeof App !== 'undefined' && typeof App.confirmDialog === 'function') {
      try {
        confirmed = await App.confirmDialog({
          titleKey: 'photos.optimize.confirm.title',
          messageKey: 'photos.optimize.confirm.body',
          confirmKey: 'photos.optimize.confirm.yes',
          cancelKey: 'confirm.cancel',
          tone: 'neutral',    // UI-SPEC: irreversible but visual quality stays the same.
          // UAT-C2: substitute {n} and {size} in title + body before render.
          placeholders: { n: String(photoCount), size: estimatedSavingsLabel }
        });
      } catch (_) { confirmed = false; }
    } else {
      return; // No confirm available → refuse rather than mass-mutate silently.
    }
    if (!confirmed) return;

    if (typeof CropModule === 'undefined' || typeof CropModule.resizeToMaxDimension !== 'function') {
      if (typeof App !== 'undefined' && typeof App.showToast === 'function') {
        App.showToast('', 'photos.optimize.unavailable');
      }
      return;
    }

    btn.disabled = true;
    try {
      var h = window.__PhotosTabHelpers || {};
      var result = await h._optimizeAllPhotosLoop(
        function () { return PortfolioDB.getAllClients(); },
        function (c) { return PortfolioDB.updateClient(c); },
        function (b, m, q) { return CropModule.resizeToMaxDimension(b, m, q); },
        h.blobToDataURL,
        h.dataURLToBlob
      );
      var msgKey = (result.failed > 0) ? 'photos.optimize.partialFailure' : 'photos.optimize.success';
      var template = tt(msgKey, msgKey);
      var msg = template
        .replace('{success}', String(result.success))
        .replace('{failed}', String(result.failed))
        .replace('{size}', readHumanBytes(result.savedBytes));

      // Phase 25 Plan 12 UAT-D4: surface the savings number INLINE next to
      // the Optimize button so the cause→effect link is obvious. The toast
      // remains as a secondary cross-page signal. The inline pill persists
      // for 8 seconds — enough to read the savings number even on a slow
      // glance. refreshPhotosTab() runs FIRST (which can re-populate the
      // preview element with the pre-flight savings line); we then
      // overwrite it with the result message and re-arm the persistence
      // timer so the result wins over the pre-flight estimate.
      await refreshPhotosTab();
      var inlinePreview = $('photosOptimizePreview');
      if (inlinePreview) {
        // Stop any previous pre-flight rendering from claiming the slot.
        inlinePreview.removeAttribute('data-i18n');
        inlinePreview.removeAttribute('hidden');
        inlinePreview.textContent = msg;
        inlinePreview.classList.add('photos-savings-preview--result');
        if (typeof window !== 'undefined' && window.__photosOptimizeResultTimer) {
          try { clearTimeout(window.__photosOptimizeResultTimer); } catch (_) {}
        }
        var clearTimer = setTimeout(function () {
          var el = $('photosOptimizePreview');
          if (el) {
            el.classList.remove('photos-savings-preview--result');
            el.textContent = '';
            el.setAttribute('hidden', '');
          }
        }, 8000);
        if (typeof window !== 'undefined') window.__photosOptimizeResultTimer = clearTimer;
      }

      // Keep the toast for cross-page legibility — same shape Plan 11
      // settled on (literal msg in arg 0, '' in arg 1 because the message
      // is already an i18n-resolved + substituted string).
      if (typeof App !== 'undefined' && typeof App.showToast === 'function') {
        App.showToast(msg, '');
      }
    } catch (err) {
      if (typeof console !== 'undefined' && console.error) console.error('Optimize all failed:', err);
      if (typeof App !== 'undefined' && typeof App.showToast === 'function') {
        App.showToast('', 'photos.optimize.failed');
      }
    } finally {
      btn.disabled = false;
    }
  }

  /**
   * handleDeleteAll — destructive confirm (tone:'danger'), then invoke
   * _deleteAllPhotosLoop. Same updateClient write path as edit-client (D-30).
   */
  async function handleDeleteAll() {
    var btn = $('photosDeleteAllBtn');
    if (!btn) return;

    var confirmed = false;
    if (typeof App !== 'undefined' && typeof App.confirmDialog === 'function') {
      try {
        confirmed = await App.confirmDialog({
          titleKey: 'photos.deleteAll.confirm.title',
          messageKey: 'photos.deleteAll.confirm.body',
          confirmKey: 'photos.deleteAll.confirm.yes',
          cancelKey: 'confirm.cancel',
          tone: 'danger'
        });
      } catch (_) { confirmed = false; }
    } else {
      return;
    }
    if (!confirmed) return;

    btn.disabled = true;
    try {
      var h = window.__PhotosTabHelpers || {};
      await h._deleteAllPhotosLoop(
        function () { return PortfolioDB.getAllClients(); },
        function (c) { return PortfolioDB.updateClient(c); }
      );
      if (typeof App !== 'undefined' && typeof App.showToast === 'function') {
        App.showToast('', 'photos.deleteAll.success');
      }
      await refreshPhotosTab();
    } catch (err) {
      if (typeof console !== 'undefined' && console.error) console.error('Delete all failed:', err);
      if (typeof App !== 'undefined' && typeof App.showToast === 'function') {
        App.showToast('', 'photos.deleteAll.failed');
      }
    } finally {
      btn.disabled = false;
    }
  }

  function bindPhotosTab() {
    var optBtn = $('photosOptimizeBtn');
    var delBtn = $('photosDeleteAllBtn');
    if (!optBtn && !delBtn) return; // tab not present on this page
    if (optBtn) optBtn.addEventListener('click', handleOptimize);
    if (delBtn) delBtn.addEventListener('click', handleDeleteAll);
    refreshPhotosTab();
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', bindPhotosTab);
    // Phase 25 Plan 12 post-UAT fix (bug 4, 2026-05-15): refreshPhotosTab
    // sets usageEl.textContent directly and removes the data-i18n
    // attribute (so applyTranslations() does not try to replace the
    // substituted value with the bare template at next setLanguage()
    // pass). The trade-off: applyTranslations() also won't re-render the
    // storage line when the language changes. Listen on the `app:language`
    // custom event (dispatched by app.js setLanguage at line 126) and
    // re-run refreshPhotosTab so the storage line picks up the new
    // locale's "photos.usage.body" / "photos.usage.unavailable" template
    // along with the rest of the UI. The re-run is idempotent — the same
    // clients are fetched, the same DOM elements are populated.
    document.addEventListener('app:language', function () {
      // refreshPhotosTab is async but the listener doesn't need to await;
      // applyTranslations() runs synchronously and the photo-tab re-render
      // can complete in its own microtask without blocking the rest of
      // the language switch.
      try { refreshPhotosTab(); } catch (_) {}
    });
  }
})();
