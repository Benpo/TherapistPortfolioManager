---
phase: 25-backup-architectural-rework
plan: 06
subsystem: photos
tags: [crop, canvas, createImageBitmap, exif, idb-storage, photos, security, tdd]

requires:
  - phase: 22-session-workflow-loop
    provides: CropModule.openCropModal (shared crop modal)
  - phase: 22-session-workflow-loop
    provides: App.readFileAsDataURL (FileReader Promise wrapper)
provides:
  - CropModule.resizeToMaxDimension(blob, maxEdge, quality) - EXIF-aware low-memory photo resize
  - Crop output JPEG quality standardized to 0.75 (was 0.85)
  - add-client photo upload pipeline: resize-then-crop (original never persisted)
  - Soft 25 MB upload-size warning (no hard cap per D-23)
  - 2 i18n keys × 4 locales: photos.upload.warning, photos.upload.tooLarge
  - Two behavior tests guarding D-21 (resize-pure) and D-22 (crop-only persistence)
affects:
  - 25-07 (bulk-optimize will call CropModule.resizeToMaxDimension in a loop over existing clients)
  - 25-01 (smaller per-client backup payloads via D-22 crop-only storage)
  - 25-02 (Backup-contents modal lists "Photos (cropped, optimized)" — now actually true)

tech-stack:
  added: []
  patterns:
    - "Two-pass createImageBitmap (probe → decide → re-decode with resizeWidth/resizeHeight) — canonical pattern for EXIF-aware low-memory photo resize on iOS Safari"
    - "Behavior tests via vm-sandbox + stubbed createImageBitmap (capture opts arg) — no node-canvas required"
    - "Behavior tests via vm-sandbox + spied PortfolioDB.addClient + tagged Blob sentinels — proves end-to-end pipeline contracts without IDB"

key-files:
  created:
    - tests/25-06-resize-pure.test.js
    - tests/25-06-crop-only.test.js
    - .planning/phases/25-backup-architectural-rework/25-06-SUMMARY.md
  modified:
    - assets/crop.js (added resizeToMaxDimension; toDataURL 0.85 → 0.75)
    - assets/add-client.js (photoInput handler: resize-then-crop; SOFT_SIZE_CAP_BYTES)
    - assets/i18n-en.js (2 new keys)
    - assets/i18n-he.js (2 new keys, noun-phrase form per D-27)
    - assets/i18n-de.js (2 new keys)
    - assets/i18n-cs.js (2 new keys)
    - sw.js (CACHE_NAME bump x2 via pre-commit hook — assets/crop.js and assets/add-client.js changed)

key-decisions:
  - "Two-pass createImageBitmap chosen over single-pass-with-target-dims because the canonical resizeWidth/resizeHeight option requires knowing the target dimensions, which requires reading source dimensions first. Two passes accept the small CPU cost (decode-probe-discard) to keep peak memory under control on iPhone."
  - "SOFT_SIZE_CAP_BYTES is local to the photoInput handler scope, NOT a module export. 25 MB chosen as the point where most phones still decode but the user perceives latency. Decision per D-23: warn, do not refuse."
  - "Test sandbox patch: leading `const CropModule = (...)` in assets/crop.js is rewritten to `this.CropModule = (...)` so the IIFE result attaches to the vm context global. Same pattern as tests/24-04-app-cache.test.js's `App.` patch."
  - "D-22 behavior test uses synthetic CropModule (resize → tagged sentinel Blob, openCropModal → synchronous onSave invocation). The real CropModule resize+EXIF behavior is verified separately by tests/25-06-resize-pure.test.js. This separation lets each test cleanly target a single decision."
  - "Pre-commit CACHE_NAME bump fired on every assets/* commit (v141 → v142 → v143). No PRECACHE_URLS additions needed — only existing files changed."

patterns-established:
  - "Pattern: behavior tests for canvas/image pipeline code via stubbed createImageBitmap that captures the opts argument. Avoids node-canvas while still proving the algorithm (not just the shape)."
  - "Pattern: behavior tests for IDB write contracts via tagged Blob sentinels (rawOriginal.__id = 'RAW_ORIGINAL_2MB' + cropped output.__id = 'CROPPED_SENTINEL_BLOB'). Exhaustive leak detection via JSON.stringify probe + per-field Blob duck-type check."

requirements-completed: [D-21, D-22, D-23, D-27, D-28]

duration: 32min
completed: 2026-05-15
---

# Phase 25 Plan 06: Resize-on-upload, crop-only photo storage, EXIF strip Summary

**CropModule.resizeToMaxDimension delivers EXIF-aware two-pass createImageBitmap resize (longest edge ≤ 800px at JPEG q=0.75); add-client photo upload is rewired so only the cropped output reaches IndexedDB and the raw upload is never persisted — proven by a behavior test that drives the full pipeline end-to-end.**

## Performance

- **Duration:** 32 min
- **Started:** 2026-05-15T08:48Z
- **Completed:** 2026-05-15T09:20Z
- **Tasks:** 1 (single-task plan; TDD cycle produced 4 atomic commits)
- **Files modified:** 7 (assets/crop.js, assets/add-client.js, 4 × assets/i18n-*.js, sw.js auto-bumped)
- **Files created:** 3 (tests/25-06-resize-pure.test.js, tests/25-06-crop-only.test.js, this SUMMARY)

## Accomplishments

- New `CropModule.resizeToMaxDimension(blob, maxEdge, quality)` helper. Uses a two-pass `createImageBitmap` pattern: the probe pass reads EXIF-rotated source dimensions (`imageOrientation: 'from-image'`), the resize pass re-decodes with `resizeWidth`/`resizeHeight`/`resizeQuality: 'high'` hints so the browser downscales DURING decode — the canonical Pitfall 3 (iPhone OOM on multi-MB camera photos) mitigation. `bitmap.close()` frees the decoder buffer immediately on both passes.
- Crop confirm handler quality lowered from 0.85 to 0.75 per D-21. The 0.85 literal is purged from `assets/crop.js`. New uploads AND the bulk-optimize path (Plan 07) will share the same q=0.75 ceiling — D-30 single-source-of-truth.
- `add-client.js` photoInput handler rewired to resize-then-crop. The raw uploaded File is referenced only inside the `resizeToMaxDimension` call; it is garbage-collected as soon as the call returns. The resulting Blob is converted to a data URL and fed to `openCropModal` exactly like before — minimal disruption to the existing crop UX.
- `SOFT_SIZE_CAP_BYTES` (25 MB) warning toast — surfaces `photos.upload.warning` but proceeds with the upload. Per D-23 the cap is intentionally NOT a hard refusal. The `createImageBitmap` failure path (genuine OOM or unsupported codec) catches and surfaces `photos.upload.tooLarge`, then clears the file input.
- Two new i18n keys × 4 locales (EN/HE/DE/CS): `photos.upload.warning` and `photos.upload.tooLarge`. Hebrew uses noun-phrase / declarative forms per D-27 ("תמונה גדולה", "התמונה גדולה מכדי") — no imperatives.
- **Threat T-25-06-01 mitigated** (EXIF/GPS exfiltration in shared backups): canvas re-encode via `toBlob('image/jpeg', q)` strips ALL EXIF metadata including GPS. Future backups exported via Plan 01's `shareBackup` cannot leak photo GPS because GPS was never persisted to begin with. Manual smoke item recorded for the checker pass (upload an iPhone photo with location enabled, export backup, inspect with `exiftool`).
- **Behavior test for D-21** (`tests/25-06-resize-pure.test.js`): four sub-cases (smoke / portrait 3024×4032 / landscape 4032×3024 / no-downscale 400×300). Captures the `opts` argument passed to `createImageBitmap` and asserts the 800px longest-edge ceiling is enforced algorithmically — proportional scale evaluates to 600px on the short edge for both portrait and landscape inputs, and the second-pass opts are bare (no `resizeWidth`/`resizeHeight`) when the source is already under 800px (the `if (scale < 1)` guard). Closes the gap flagged by project memory `feedback-behavior-verification.md`.
- **Behavior test for D-22** (`tests/25-06-crop-only.test.js`): three sub-cases (smoke handler-registration / full-pipeline crop-only IDB write / cancelled-crop regression). Drives the change event with a tagged "raw original" 2 MB Blob, runs the synthetic resize → readFileAsDataURL → openCropModal → onSave → form submit chain, and inspects the spied `PortfolioDB.addClient` call. The load-bearing assertion: `record.photoData === '__CROPPED_SENTINEL_DATA_URL__'`. Exhaustive leak detection: `JSON.stringify(record)` does NOT contain the rawOriginal's tag at any nested path, AND no field of `record` is a Blob/File reference (duck-type check on `value.arrayBuffer`). Closes the D-22 gap per VALIDATION.md line 56.

## Task Commits

The plan has one task; TDD produced 4 atomic commits:

1. **RED — failing behavior test for D-21** — `261852e` (test)
2. **GREEN — resizeToMaxDimension + crop quality bump** — `941b246` (feat) — sw.js CACHE_NAME bumped v141 → v142 via pre-commit hook
3. **add-client pipeline rewire + i18n keys** — `5399e19` (feat) — sw.js CACHE_NAME bumped v142 → v143 via pre-commit hook
4. **D-22 crop-only behavior test** — `f1fe263` (test) — no production code changes; the existing pipeline already satisfied the contract, the test is a permanent regression gate

_Note: the D-22 test is intentionally a contract test on already-passing code. Per the plan it is the load-bearing gate the project memory `feedback-behavior-verification.md` requires; without it, future regressions could leak the raw File into IDB unnoticed._

## Files Created/Modified

- **`assets/crop.js`** — added `resizeToMaxDimension` (≈40 lines, inside the IIFE, before the public return); changed `toDataURL("image/jpeg", 0.85)` → `0.75`; extended public return to expose `resizeToMaxDimension`.
- **`assets/add-client.js`** — replaced the photoInput change handler body. New flow: soft size warning → `CropModule.resizeToMaxDimension(file, 800, 0.75)` (catch → `photos.upload.tooLarge`) → `App.readFileAsDataURL(resizedBlob)` → `CropModule.openCropModal(resizedDataURL, ...)`. `recropBtn` handler untouched (re-crop operates on already-cropped photoData; original is gone per D-22).
- **`assets/i18n-{en,he,de,cs}.js`** — added `photos.upload.warning` and `photos.upload.tooLarge` adjacent to the existing `toast.export*` block.
- **`tests/25-06-resize-pure.test.js`** — new behavior test (245 lines) for D-21. vm-sandbox-loads `assets/crop.js` with a stubbed `createImageBitmap` that captures the opts argument and a programmable `nextBitmapWidth`/`nextBitmapHeight` per sub-case. Asserts the two-pass decode pattern, EXIF flag on both passes, proportional 800px clamp, and `resizeQuality: 'high'` on the resize pass.
- **`tests/25-06-crop-only.test.js`** — new behavior test (496 lines) for D-22. vm-sandbox-loads `assets/add-client.js` with synthetic `App`, `CropModule`, `PortfolioDB`, full DOM element stubs (clientForm, clientPhoto, clientPhotoPreview, clientFirstName, clientLastName, etc.), and `URLSearchParams`. Drives the DOMContentLoaded init then the change + submit events. Exhaustively asserts the IDB write receives only the cropped sentinel and the raw original tag appears nowhere in the serialized record.
- **`sw.js`** — CACHE_NAME auto-bumped twice by the pre-commit hook (v141 → v142 → v143) when asset files changed. No `PRECACHE_URLS` additions were needed since no new asset files were introduced.

## Decisions Made

- **Two-pass createImageBitmap chosen over alternatives** — the canonical `resizeWidth`/`resizeHeight` options require knowing target dimensions, which requires reading source dimensions first. Two passes accept the small CPU cost (the probe decode is discarded immediately via `.close()`) to keep peak memory under control on iPhone — the entire point of D-21's iPhone OOM mitigation.
- **`SOFT_SIZE_CAP_BYTES` is local to the handler scope** — 25 MB chosen as the point where most phones still decode but the user perceives latency. Decision per D-23: warn, do not refuse. If iPhone OOMs in testing, a follow-up plan can flip this to a hard refusal — but the primary defense is the `createImageBitmap` resize-during-decode pattern, not a size cap.
- **Test sandbox pattern for `const CropModule = ...`** — `vm.runInContext` does not attach lexical declarations to the sandbox global. Patched the source at test load time via `rawSrc.replace(/^const\s+CropModule\s*=/m, 'this.CropModule =')` so the IIFE result attaches to the context. Mirrors the `App.` patch in `tests/24-04-app-cache.test.js`.
- **D-22 behavior test uses synthetic CropModule** — the real CropModule's resize + EXIF behavior is verified by `tests/25-06-resize-pure.test.js`. Splitting concerns lets each test target a single decision cleanly. The crop-only test stubs the resize step to return a tagged sentinel Blob so the test can prove the rawOriginal never flows past `resizeToMaxDimension`.
- **Pre-commit CACHE_NAME bump cadence** — fired on each of the two asset-file commits. No `PRECACHE_URLS` edits needed because only existing files changed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test assertion coerced via boolean for falsy non-Blob fields**
- **Found during:** Sub-case B of `tests/25-06-crop-only.test.js`
- **Issue:** The per-field Blob duck-type check `const isBlob = v && typeof v === 'object' && typeof v.arrayBuffer === 'function'` returned the raw value (e.g., empty string `''`) when the left operand was falsy. `assert.strictEqual('', false)` then failed with `'' !== false` — a false negative on a clearly-not-a-Blob field (`record.lastName === ''`).
- **Fix:** Wrapped the expression in `!!(...)` to coerce to a real boolean: `const isBlob = !!(v && typeof v === 'object' && typeof v.arrayBuffer === 'function');`. The assertion now compares two booleans cleanly.
- **Files modified:** `tests/25-06-crop-only.test.js`
- **Verification:** All three sub-cases of `tests/25-06-crop-only.test.js` exit 0.
- **Committed in:** `f1fe263` (the same commit that introduced the test — caught during RED→GREEN iteration before the commit)

---

**Total deviations:** 1 auto-fixed (1 bug in test assertion logic, caught during pre-commit iteration)
**Impact on plan:** No production-code impact. The behavior tests pass exactly the contracts the plan specified; the boolean coercion was a JS-truthiness gotcha in the test code itself.

## Issues Encountered

- **vm sandbox does not attach top-level `const` to the sandbox global** — resolved with the source-rewrite pattern documented above. Documented in the test file as a comment for the next maintainer.

## Known Stubs

None. `photoData` flows end-to-end from upload through resize through crop through form submit through `PortfolioDB.addClient` — proven by the D-22 behavior test. No mock data, no "coming soon" placeholders.

## TDD Gate Compliance

Plan 06 task has `tdd="true"`. Git log shows the gate sequence:

1. `261852e test(25-06): add failing behavior test for resizeToMaxDimension 800px ceiling` — RED gate ✓
2. `941b246 feat(25-06): add CropModule.resizeToMaxDimension; bump crop output to q=0.75` — GREEN gate ✓ (this is the commit that makes the test exit 0)
3. `5399e19 feat(25-06): rewire add-client photo upload to resize-then-crop pipeline` — supplementary feat (pipeline + i18n)
4. `f1fe263 test(25-06): add crop-only persistence behavior gate (D-22)` — contract gate test (passes against already-shipped code from commit 5399e19; intentional — it locks the D-22 contract for the future)

No REFACTOR commit was created — the implementation was clean as written and did not benefit from a second pass.

## User Setup Required

None — no external service configuration. Manual smoke items below are deferred to the checker pass (cannot be automated without real images / node-canvas).

## Manual Smoke Checklist (deferred to checker)

1. On Sapir's iPhone Safari: upload a 4032×3024 photo (~4–6 MB). Page must NOT blank or OOM. Cropped photo must appear with correct orientation (EXIF respected). Resulting `photoData` length in IDB clients row must be < 200 KB (DevTools → Application → IndexedDB → SessionsGarden → clients).
2. On Chrome desktop: upload the same photo. Same expected behavior.
3. **EXIF strip verification (T-25-06-01)**: upload an iPhone photo with location services enabled. Save the client. Export a backup (Plan 01). Open the `.zip` → `photos/` → inspect the JPEG with `exiftool` or any EXIF viewer. The GPS section must be empty.
4. **Soft-cap test (D-23)**: upload a 30 MB photo (synthetic; `convert -resize 8000x8000 input.jpg`). Warning toast must appear AND the upload must still complete (no hard refusal).
5. **createImageBitmap failure path**: hard to test on demand; trust the catch-and-toast path. Re-test if Plan 07's bulk-optimize surfaces failures.

## Next Phase Readiness

- **Plan 07 (Optimize all photos)**: `CropModule.resizeToMaxDimension(existingDataUrl-as-Blob, 800, 0.75)` is the function Plan 07 will call in a loop over existing client rows. The D-21 behavior test guards the contract for both consumers (new uploads + bulk migration), satisfying D-30 single-source-of-truth.
- **Plan 02 (Backup-contents checklist)**: the "✓ Photos (cropped, optimized)" line in the modal is now true: stored `photoData` is the cropped+resized output, never the raw upload.
- **Plan 08 (round-trip integration)**: D-22 means `photoData` is always a string (data URL), never a Blob — the manifest serializer's photo handling path is now contract-tight.

## Self-Check: PASSED

- FOUND: tests/25-06-resize-pure.test.js (4/4 sub-cases pass)
- FOUND: tests/25-06-crop-only.test.js (3/3 sub-cases pass)
- FOUND: .planning/phases/25-backup-architectural-rework/25-06-SUMMARY.md
- FOUND: commit 261852e (test RED)
- FOUND: commit 941b246 (feat GREEN — crop.js resizeToMaxDimension + q=0.75)
- FOUND: commit 5399e19 (feat — add-client rewire + 4-locale i18n)
- FOUND: commit f1fe263 (test — D-22 crop-only persistence gate)
- VERIFIED: DB_VERSION = 5 unchanged (no schema migration)
- VERIFIED: 0.85 literal purged from assets/crop.js
- VERIFIED: 11/11 grep gates pass

---
*Phase: 25-backup-architectural-rework*
*Completed: 2026-05-15*
