---
phase: 22-session-workflow-loop-pre-session-context-card-editable-sess
reviewed: 2026-05-06T17:38:45Z
depth: standard
files_reviewed: 15
files_reviewed_list:
  - add-session.html
  - assets/add-session.js
  - assets/app.css
  - assets/app.js
  - assets/backup.js
  - assets/db.js
  - assets/i18n-cs.js
  - assets/i18n-de.js
  - assets/i18n-en.js
  - assets/i18n-he.js
  - assets/md-render.js
  - assets/pdf-export.js
  - assets/settings.js
  - settings.html
  - sw.js
findings:
  critical: 0
  warning: 4
  info: 6
  total: 10
status: issues_found
---

# Phase 22: Code Review Report

**Reviewed:** 2026-05-06T17:38:45Z
**Depth:** standard
**Files Reviewed:** 15
**Status:** issues_found

## Summary

Phase 22 ships Feature A (editable section titles via Settings page) and Feature B (session-to-document export with PDF + Markdown + Web Share). The implementation is generally sound: XSS surfaces use `textContent`/`.value` discipline, the Markdown render utility escapes HTML before structural rules, the IndexedDB v3→v4 migration is purely additive, the backup restore path is defensive (whitelist + type coercion + per-row try/catch), and all 4 i18n bundles include the new keys with consistent shapes. Service-worker `CACHE_NAME` is bumped to v53 and `PRECACHE_URLS` correctly lists the new files.

The most consequential finding is a timing race in `add-session.js`: `App.initCommon()` was made async in this phase to eager-load the therapist-settings cache, but the page's DOMContentLoaded handler does not await it. As a result, `applySectionVisibility()` may run with an empty cache on first paint, briefly showing sections that the therapist has disabled. Three smaller hardening items (PDF font fallback, BroadcastChannel close-after-post, unguarded innerHTML on a container that gets repopulated) round out the warnings.

No Critical findings. Four Warnings, six Info items.

## Warnings

### WR-01: `App.initCommon()` is async but called without `await`, racing the section-visibility cache

**File:** `assets/add-session.js:9` (also `assets/settings.js:397`)
**Issue:** Phase 22 changed `App.initCommon` from sync to async (it now eager-loads `therapistSettings` from IndexedDB into `_sectionLabelCache` before `setLanguage` runs — see `assets/app.js:312, 357-366`). However, callers were not updated:

```js
document.addEventListener("DOMContentLoaded", async () => {
  App.initCommon();          // returns a Promise — not awaited
  ...
  applySectionVisibility(false);   // line 1485 — cache may still be empty
});
```

Because the IndexedDB read in `initCommon` is async, the rest of the DOMContentLoaded handler (including `applySectionVisibility(true|false)` at lines 1481 and 1485) can fire before the cache is populated. `App.isSectionEnabled(sectionKey)` then returns the default `true` for every section, which means:

- New-session form: a section the therapist disabled in Settings is briefly rendered until/unless `app:settings-changed` later fires (it does not fire on initial load — only on cross-tab broadcast or Settings save). REQ-3 acceptance criterion is conditional on luck-of-the-IDB-microtask-ordering.
- Past-session form: REQ-5's "show disabled-but-populated section as editable with badge" path can flip the wrong way for the same reason.

The page does run multiple awaits before reaching `applySectionVisibility` (e.g. `loadClients` at line 358, `PortfolioDB.getSession` at line 1473), so in practice the cache often *does* finish first — but the timing is not guaranteed and depends on how busy IDB is.

**Fix:** Await `initCommon()` so the cache is guaranteed populated before any code that depends on `getSectionLabel` / `isSectionEnabled` runs:

```js
document.addEventListener("DOMContentLoaded", async () => {
  await App.initCommon();   // ← add await
  ...
});
```

Apply the same `await` in `assets/settings.js:397` (and any other entry point that reads `App.getSectionLabel` or `App.isSectionEnabled` immediately after `initCommon`). Alternative: dispatch a `app:settings-changed` event at the end of `initCommon` so existing listeners pick it up — but that is a wider change and the `await` fix is one line.

---

### WR-02: PDF font registration silently no-ops if base64 globals fail to define, then `setFont` throws on first use

**File:** `assets/pdf-export.js:174-183, 327-328, 359-367`
**Issue:** `registerFonts(doc)` only calls `addFileToVFS` + `addFont` if `window.NotoSans` / `window.NotoSansHebrew` are non-empty strings. If the precached font script loads (script tag's `onload` fires) but the global is missing (corrupt asset, wrong content-type, partial response), `registerFonts` silently skips registration. Subsequent `doc.setFont("NotoSans", "normal")` in `applyFontFor` (line 361, 364) throws because jsPDF cannot find the named font, surfacing as a generic "PDF generation failed" toast (handled at `add-session.js:1077`) with no diagnostic.

This is a degraded-state failure — not a crash with data loss — but the user experience is "PDF won't generate" with no indication of why.

**Fix:** Either (a) fail-fast in `ensureDeps` if the expected globals are not present after script load, or (b) fall back to jsPDF's built-in helvetica when the Noto font is missing:

```js
function applyFontFor(line) {
  if (isRtl(line) && doc.getFontList()["NotoSansHebrew"]) {
    doc.setFont("NotoSansHebrew", "normal");
    doc.setR2L(true);
  } else if (doc.getFontList()["NotoSans"]) {
    doc.setFont("NotoSans", "normal");
    doc.setR2L(false);
  } else {
    doc.setFont("helvetica", "normal");
    doc.setR2L(false);
  }
}
```

(a) is preferable for Hebrew users — silently falling back to helvetica produces a PDF without Hebrew glyphs. Suggested implementation: add an explicit check after the loadScriptOnce chain in `ensureDeps` and reject the promise with a translated error if either global is missing.

---

### WR-03: BroadcastChannel closed immediately after `postMessage` — message delivery race

**File:** `assets/settings.js:351-355`
**Issue:** After saving Settings, the channel is created, the message posted, and the channel closed in the same tick:

```js
var ch = new BroadcastChannel("sessions-garden-settings");
ch.postMessage({ type: "therapist-settings-changed", at: Date.now() });
ch.close();
```

Per the HTML spec, `postMessage` only queues the message; `close()` does not abort already-queued messages, so this *should* work. However, in practice some browser engines (notably older Firefox builds and certain Safari versions) have shipped bugs where `close()` immediately after `postMessage` drops the message before peer tabs receive it. The cross-tab refresh — which is the entire point of the broadcast — would then silently fail.

The receiver-side channel in `app.js:374-385` is kept open for the lifetime of the page, so the issue is only on the sender side.

**Fix:** Either keep the sender-side channel open for the page lifetime (mirror the receiver), or defer the close to a later tick to give the message a chance to flush:

```js
// Option A: lazy module-singleton, never close
if (!_broadcastChannel) {
  _broadcastChannel = new BroadcastChannel("sessions-garden-settings");
}
_broadcastChannel.postMessage({ type: "therapist-settings-changed", at: Date.now() });

// Option B: defer the close one tick (simpler, no module state)
var ch = new BroadcastChannel("sessions-garden-settings");
ch.postMessage({ type: "therapist-settings-changed", at: Date.now() });
setTimeout(function () { ch.close(); }, 0);
```

Option A is the more robust choice — also avoids per-save channel allocation overhead.

---

### WR-04: `exportRenderStep1Rows` clears `container.innerHTML = ""` instead of `textContent = ""`

**File:** `assets/add-session.js:905`
**Issue:** Settings page took the time to switch to `refs.rowsContainer.textContent = ""` (with an explicit comment noting "safe clear (no innerHTML='')") at `assets/settings.js:305`, but the export modal's row container clears via `container.innerHTML = ""` at `add-session.js:905`. Same anti-pattern that the Phase 22 contract explicitly calls out.

For *empty-string* assignment this is functionally equivalent (no parser invocation, no XSS surface), but the Phase 22 contract is "no `innerHTML` writes for repopulated containers — even with empty string — so audits stay grep-clean and a future contributor cannot accidentally start interpolating user data into the same call site."

A second `innerHTML = ""` exists at `add-session.js:1177` (`preview.innerHTML = ""` on dialog open) — same comment applies; that is the *preview* pane which legitimately receives `MdRender.render()` output via `innerHTML` later, so the contract there is "clear before assigning fresh trusted output", which is acceptable.

**Fix:** Change the line to mirror Settings page:

```js
container.textContent = "";   // safe clear — never innerHTML, even with empty string
```

Optional follow-up: leave a `// SECURITY:` comment on the matching line in `exportRenderStep1Rows` so the contract is visible at the call site.

---

## Info

### IN-01: `add-session.js` page-level `applySectionVisibility` does not re-run on language change

**File:** `assets/add-session.js:1461-1470`
**Issue:** The `app:language` listener on the page re-applies translations and resizes textareas but does not call `applySectionVisibility(...)`. This is correct *today* because section enablement does not vary by language — but if the cache loads later than the listener fires (see WR-01) and the language switch is the user's first action, sections that should be hidden remain visible until the next reload. Same root cause as WR-01; flagged separately because it survives even if WR-01 is partially fixed.

**Fix:** Add a single line after `App.applyTranslations()` in the language listener:
```js
applySectionVisibility(!!editingSession);
```
This is cheap (one DOM walk) and self-correcting against any caching race.

---

### IN-02: `confirmDialog` reuses the global confirm modal whose OK button has hardcoded `button danger` styling

**File:** `assets/app.js:443-489` (consumer at `assets/settings.js:237-243`)
**Issue:** The shared `#confirmOkBtn` in `settings.html:93` and `add-session.html:390` has `class="button danger"` baked in. When `settings.js` invokes `confirmDialog` for the non-destructive "Disable this section?" prompt (REQ-21 part b), the OK button reads "Yes, disable" but renders in red — visually equivalent to the delete-session confirmation. Therapists may hesitate at a normal toggle thinking they are about to destroy data, exactly the opposite of the warning copy ("This won't delete existing data").

This is a pre-existing pattern, not new in Phase 22, but Phase 22 is the first non-destructive use of the dialog. Worth filing in `.planning/todos/pending/` rather than fixing here.

**Fix:** Add a `tone: 'neutral' | 'danger'` option to `confirmDialog` that toggles a class on the OK button:
```js
function confirmDialog({ titleKey, messageKey, confirmKey, cancelKey, tone = 'danger' }) {
  ...
  if (confirmBtn) {
    confirmBtn.classList.toggle('danger', tone === 'danger');
    confirmBtn.classList.toggle('button-primary', tone !== 'danger');
  }
  ...
}
```
Then call with `tone: 'neutral'` from the disable-section confirm in `settings.js:237`.

---

### IN-03: `loadScriptOnce` resolves on existing `<script>` tag presence — race if another caller adds the tag asynchronously

**File:** `assets/pdf-export.js:54-71`
**Issue:** If `document.querySelector('script[src="..."]')` finds an existing tag, the function resolves immediately on the assumption that the tag is fully loaded. Two concerns:

1. `ensureDeps` is gated by the `_loadingPromise` cache, so within `pdf-export.js` only the first call enters `loadScriptOnce`. Other Phase 22 modules don't insert these script tags, so the practical risk is near zero today.
2. If a future entry point (e.g. a planned print dialog) injects `jspdf.min.js` directly, an in-flight load would resolve `loadScriptOnce` before `window.jspdf` is defined, and then `buildSessionPDF` would throw `window.jspdf.jsPDF not found` at line 324.

**Fix:** Track loaded src strings in a module-private set and only short-circuit on previously-resolved srcs, not on raw DOM presence:

```js
var _loadedSrcs = new Set();
function loadScriptOnce(src) {
  return new Promise(function (resolve, reject) {
    if (_loadedSrcs.has(src)) { resolve(); return; }
    var s = document.createElement('script');
    s.src = src;
    s.async = false;
    s.onload = function () { _loadedSrcs.add(src); resolve(); };
    s.onerror = function () { reject(new Error('PDFExport: failed to load script ' + src)); };
    document.body.appendChild(s);
  });
}
```

---

### IN-04: PDF page-number footer width approximation does not divide by jsPDF's internal scale factor

**File:** `assets/pdf-export.js:507-509`
**Issue:** The width estimate `getStringUnitWidth(label) * META_SIZE` works for `unit: 'pt'` (scale factor = 1) and produces visually-acceptable centering for the short "Page X of Y" label. For longer footers or different units the formula would need `/ doc.internal.scaleFactor`. Not a bug today (unit is hardcoded `pt` at line 327); flagging as a future-proofing note for whoever changes the page format.

**Fix:** None required for v1. If the unit ever changes, switch to:
```js
var approxWidth = doc.getStringUnitWidth(label) * META_SIZE / doc.internal.scaleFactor;
```
or use jsPDF's `getTextWidth()` helper which abstracts this away.

---

### IN-05: `_extFromMime` falls back to `image/jpeg`/`.jpg` for unknown MIME types — silent corruption risk on exotic photos

**File:** `assets/backup.js:293-311`
**Issue:** Pre-existing — not new in Phase 22. `_extFromMime` and `_mimeFromExt` both default to `jpeg` for anything they don't recognise. If a client photo was saved with `image/heic` or `image/avif` in IndexedDB, the backup ZIP will write `client-1.heic` (correct extension) but `_mimeFromExt("heic")` reconstitutes the data URL as `data:image/jpeg;base64,...`, mismatching the actual byte stream. Downstream `<img>` rendering still works in modern browsers (sniffing), but the metadata is wrong.

**Fix:** None required for Phase 22. File a separate todo: extend `_mimeFromExt` to handle heic/avif explicitly, or capture the original MIME in a sidecar field per photo entry.

---

### IN-06: `console.warn` / `console.error` left in production code paths

**File:** Multiple — `assets/db.js:78,146`; `assets/backup.js:497,603,648,652,663,775`; `assets/pdf-export.js`; `assets/settings.js:300,371`; `assets/add-session.js:1076`; `assets/app.js:367,376,381`.
**Issue:** Forty-plus `console.warn`/`console.error` calls survive into shipped code. This is consistent with the rest of the codebase's diagnostic style and is intentional (the comments explicitly note non-fatal failure modes), so flagging here only as a portfolio-wide observation rather than a Phase 22 regression. No fix recommended for this phase.

---

_Reviewed: 2026-05-06T17:38:45Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
