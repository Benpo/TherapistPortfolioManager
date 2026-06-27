---
phase: 30-test-harness-coverage
reviewed: 2026-06-27T00:00:00Z
depth: standard
files_reviewed: 22
files_reviewed_list:
  - tests/_helpers/app-stub.js
  - tests/_helpers/base64-codec.js
  - tests/_helpers/jsdom-pdf-env.js
  - tests/_helpers/mock-portfolio-db.js
  - tests/25-11-toast-behavior.test.js
  - tests/30-autogrow-wiring.test.js
  - tests/30-backups-helper-gate.test.js
  - tests/30-client-spotlight.test.js
  - tests/30-export-stepper.test.js
  - tests/30-fake-test-detector.test.js
  - tests/30-field-copy.test.js
  - tests/30-form-dirty-revert.test.js
  - tests/30-issue-delta.test.js
  - tests/30-photos-optimize-loop.test.js
  - tests/30-read-mode.test.js
  - tests/30-save-redirect.test.js
  - tests/30-section-visibility.test.js
  - tests/30-settings-save-failed-toast.test.js
  - tests/30-settings-saved-notice.test.js
  - tests/30-snippet-import-merge.test.js
  - tests/30-snippet-wiring.test.js
  - tests/run-all.js
findings:
  critical: 0
  warning: 6
  info: 4
  total: 10
status: issues_found
---

# Phase 30: Code Review Report

**Reviewed:** 2026-06-27
**Depth:** standard
**Files Reviewed:** 22
**Status:** issues_found

## Summary

This is a test-harness phase whose explicit goal is a *trustworthy* safety net for the Phase 31 god-module refactor: replace source-slicing "fake" tests with tests that EXECUTE the real `assets/*.js` modules and assert observable behavior, plus a permanent gate that prevents fakes from recurring.

The characterization tests themselves are strong. I traced each one for the failure modes that matter in this domain (vacuous/tautological assertions, wrong-target assertions, silent no-ops, leaked state, swallowed rejections) and they hold up well: every test genuinely evals/vm-runs the real module, drives observable DOM/persistence side effects, gates against vacuous-green with a hard `EXPECTED_COUNT` guard, and the documented mutation-kills are real (each can fail on the regression it claims to guard). The shared codec (`base64-codec.js`) is a faithful mirror of the real `dataURLToBlob`/`blobToDataURL` adapters in `assets/settings.js` (verified: `readAsDataURL`+`onload`, `atob`, base64 byte math all match), so the photos-optimize byte assertions are sound. `run-all.js`'s new spawn timeout handling is correct: a timed-out child is SIGKILL'd, `result.signal` is set, and the `status === 0 && signal == null` check classifies it as FAIL (it does not silently pass or hang the gate).

The defects cluster in two places: (1) **the fake-test-detector gate is narrower than its own claim** — its doc asserts it "makes the class non-recurring," but its candidate/marker heuristics are evadable by a deliberately-written fake; and (2) **two helper fidelity gaps** in `mock-portfolio-db.js` plus **one missing vacuous-green guard** in the older `25-11` test that breaks the consistency the rest of the suite relies on. None are security or data-loss issues; all are correctness/robustness of the safety net itself, which is exactly what this phase ships.

## Warnings

### WR-01: Fake-test-detector candidate gate is evaded by moving `readFileSync` into a helper

**File:** `tests/30-fake-test-detector.test.js:130-132`
**Issue:** A test is only treated as a *candidate* when its own raw text contains the literal token `readFileSync` AND an `assets/*.js` path literal:
```js
function readsAssetJs(raw) {
  return /readFileSync/.test(raw) && (RE_LITERAL_ASSET_JS.test(raw) || RE_JOIN_ASSET_JS.test(raw));
}
```
A source-slicing fake can read the asset text through a `_helpers/` module (helpers are never scanned — they aren't `.test.js`) and assert on the returned source string. The test file then contains the `'assets/x.js'` literal but NOT `readFileSync`, so `readsAssetJs` returns false and the file is never inspected. This is the exact "pin shape, not behavior" class the gate exists to stop, so the doc-block claim that the gate "makes the class non-recurring" is overstated.
**Fix:** Trigger candidacy on any asset-source acquisition, not just inline `readFileSync`:
```js
function readsAssetJs(raw) {
  var readsText = /readFileSync|readFile\b|fs\.promises|readAsset|readSrc|readSource/.test(raw);
  return readsText && (RE_LITERAL_ASSET_JS.test(raw) || RE_JOIN_ASSET_JS.test(raw));
}
```

### WR-02: Fake-test-detector marker check is satisfied by a dummy token; `.indexOf`-based slicers slip through

**File:** `tests/30-fake-test-detector.test.js:233, 199-228`
**Issue:** Flagging path (a) only fires when NO execution marker (`vm|eval|jsdom|runInContext`) survives comment/string stripping. A fake can defeat this by placing an unused marker token in *code* — e.g. `var jsdom = null;` — which makes `hasMarker` true. Path (b) then only catches the narrow case of an *equality* assertion over a source-derived value; it deliberately does NOT flag `assert.ok(SRC.indexOf('function name(') !== -1)`-style slicers (documented at :36-46 as a false-positive tradeoff). So a new fake that (i) declares a stray `jsdom`/`vm` variable and (ii) asserts via `.indexOf`/`.ok` instead of equality passes the gate untouched. The two removed fakes happened to use equality; the broader source-slicing class is not actually closed.
**Fix:** Require the marker to be associated with EXECUTING an asset-source var rather than merely present anywhere in code — reuse the existing `assetSourceVars`/`executedVars` machinery so a bare `var jsdom = null` no longer counts as execution.

### WR-03: `mock-portfolio-db.getAllTherapistSettings` returns a SHARED mutable reference, unlike every other read

**File:** `tests/_helpers/mock-portfolio-db.js:112-117, 169`
**Issue:** `getAllClients`/`getAllSessions`/`getAllSnippets` return `store.map(deepCopy)` (fresh copies per call), but `getAllTherapistSettings` uses `makeReadSpy`, which resolves the SAME array instance every call:
```js
function makeReadSpy(name, defaultValue) {
  return function () { calls.get(name).push([]); return Promise.resolve(defaultValue); };
}
getAllTherapistSettings: makeReadSpy('getAllTherapistSettings', opts.therapistSettings || []),
```
The real IndexedDB-backed `getAllTherapistSettings` returns fresh objects each call. If code under test (e.g. `app.js initCommon` building `_sectionLabelCache`, exercised by `30-section-visibility` Case 4) mutates a returned row, the mutation persists into the seed and contaminates later reads — masking or manufacturing an order-dependent result on the very read path that test depends on.
**Fix:** Make it store-backed like the others:
```js
const therapistStore = (opts.therapistSettings || []).map(deepCopy);
getAllTherapistSettings: makeStoreReadSpy('getAllTherapistSettings', therapistStore),
```

### WR-04: `mock-portfolio-db.getSession`/`getClient` coerce ids to strings — more lenient than the real numeric-keyed store

**File:** `tests/_helpers/mock-portfolio-db.js:93, 121-127`
**Issue:** Id matching uses `sameId(a,b) { return String(a) === String(b); }`, so `getSession('51')` matches a seeded `{id: 51}` and vice versa. Production gates on `Number.isInteger(sessionId)` and the real IndexedDB key lookup is type-sensitive (a string key would NOT hit a numeric record). The mock accepts id-type mismatches the real store rejects, hiding a Phase-31 regression that passes a stringified id into `getSession`. The read-mode / form-dirty / client-spotlight tests all rely on `getSession`/`getClient` resolving the seeded record, so the leniency is load-bearing.
**Fix:** Match the real store's key semantics — compare without coercion (`a === b`) so a type mismatch resolves to `null` exactly as IndexedDB would, or add a strict-id companion assertion documenting the intent.

### WR-05: `25-11-toast-behavior.test.js` lacks the `EXPECTED_COUNT` vacuous-green guard every sibling test enforces

**File:** `tests/25-11-toast-behavior.test.js:387-595`
**Issue:** This file is in Phase 30 scope (Scenario 5 was removed here for GAP-15). Every 30-* test ends with `assert.strictEqual(passed + failed, EXPECTED_COUNT)` so a silently-dropped `await test(...)` cannot pass green; this file has none (confirmed: 0 occurrences of `EXPECTED_COUNT`). Its `test()` runner swallows all errors into `.catch` and never rejects, so deleting or commenting out an `await test(...)` line still exits 0 with fewer scenarios run — the exact vacuous-green trap hardened everywhere else, and the failure class recorded in `feedback-test-coverage-count-not-real.md`.
**Fix:** Add the standard guard before the report:
```js
var EXPECTED_COUNT = 5; // scenarios 1,2,3,4,6
if (passed + failed !== EXPECTED_COUNT) {
  console.error('count guard: expected ' + EXPECTED_COUNT + ', ran ' + (passed + failed));
  process.exit(1);
}
```

### WR-06: `app-stub.refreshSnippetCache` and the snippet tests rely on mutable `global.PortfolioDB`, cleared only on the success/guard paths

**File:** `tests/_helpers/app-stub.js:185-199`, `tests/30-snippet-wiring.test.js:113,278`, `tests/30-snippet-import-merge.test.js:101,206`
**Issue:** `refreshSnippetCache` reaches into process-wide state: `(typeof window !== 'undefined' && window.PortfolioDB) || (typeof global !== 'undefined' && global.PortfolioDB)`. Because the stub runs in Node module scope (not the jsdom window), the snippet tests must set `global.PortfolioDB = mockDb` and `delete` it afterward. The cleanup runs only on normal-completion and F-A-guard paths; a throw between the assignment and the `delete` leaves the global set, and within a single file each `buildEnv` silently re-points it. It is mitigated (one process per file) but is shared mutable global state inside a helper that unrelated tests also instantiate.
**Fix:** Pass the DB into `refreshSnippetCache` explicitly (e.g. a `dbResolver` override) instead of reaching into `global`, or wrap each snippet test body in `try { ... } finally { delete global.PortfolioDB; }`.

## Info

### IN-01: Inconsistent top-level error handling across the test IIFEs

**File:** `tests/30-export-stepper.test.js:409`, `tests/30-issue-delta.test.js:415`, `tests/30-section-visibility.test.js:362`, `tests/30-settings-saved-notice.test.js:242`, `tests/30-snippet-wiring.test.js:282`, `tests/30-snippet-import-merge.test.js:210`
**Issue:** Some suite IIFEs end with `})().catch(... process.exit(1))` (client-spotlight, form-dirty, read-mode, save-redirect, settings-save-failed) while others end with a bare `})();` and lean on Node's "unhandled rejection exits non-zero" default to surface a top-level (non-`test()`) failure. The per-test try/catch + count guard mostly cover it, but the inconsistency is a latent footgun.
**Fix:** Standardize every suite IIFE to the explicit `.catch(... process.exit(1))` tail.

### IN-02: `base64-codec.partToBuffer` comment says "copy" but returns a shared view

**File:** `tests/_helpers/base64-codec.js:45-48`
**Issue:** `Buffer.from(part.buffer, part.byteOffset, part.byteLength)` for a typed-array view returns a Buffer that SHARES the underlying ArrayBuffer; the comment claims it copies "the exact view window." Harmless today because the next step (`Buffer.concat`) copies, but the comment misleads future maintainers who might rely on isolation.
**Fix:** Copy explicitly (`Buffer.from(part.buffer.slice(part.byteOffset, part.byteOffset + part.byteLength))`) or correct the comment.

### IN-03: Fake-test-detector ALLOWLIST keyed by exact basenames is silently fragile

**File:** `tests/30-fake-test-detector.test.js:73-78`
**Issue:** The allowlist matches stripped basenames (e.g. `25-08-single-source-audit`). If an allowlisted guard file is renamed, it silently drops off the allowlist and either trips the gate (red) or falls out of coverage with no signal.
**Fix:** Add a startup assertion that every allowlisted basename resolves to an existing `tests/<base>.test.js`, failing loudly otherwise.

### IN-04: `base64-codec.FileReader` only implements `readAsDataURL` — a future adapter change would hang, not fail clearly

**File:** `tests/_helpers/base64-codec.js:69-99`
**Issue:** The fake `FileReader` supports `readAsDataURL` + `onload`/`onerror` only. Current `assets/settings.js blobToDataURL` uses exactly that path (verified), so fidelity is correct today. But if Phase 31 reworks the adapter to `readAsArrayBuffer`/`onloadend`, the promise never resolves and `30-photos-optimize-loop` would HANG (now bounded by run-all's 120s SIGKILL → FAIL) rather than fail with a clear message.
**Fix:** Add `readAsArrayBuffer`/`onloadend` stubs that throw `new Error('base64-codec FileReader: unsupported read method')` synchronously, so a contract drift surfaces as an immediate, legible failure instead of a timeout.

---

_Reviewed: 2026-06-27_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

---

## Resolution Log (2026-06-27, post-review)

Worked test-first; each fix verified by a falsifying test (mutation-kill) before commit.

| Finding | Status | Commit | Notes |
|---|---|---|---|
| **WR-05** (25-11 lacks `EXPECTED_COUNT` guard) | ✅ Resolved | `184075a` | Added count guard; mutation-kill proven (dropping a scenario → exit 1). |
| **WR-01** (detector candidacy dodged by helper-read) | ✅ Resolved | `f0b935b` | Candidacy now keyed on asset-source assignment (any reader), union'd with legacy. Falsifying self-test fixture. |
| **WR-02** (dead execution-marker word exonerates) | ✅ Resolved | `f0b935b` | Flagging (a) now requires a var actually passed to an execution sink (`executedVars`), not a bare word. Self-test fixtures + mutation-kills. |
| **25-02** (latent source-slicer surfaced by hardening) | ✅ Cleaned | `ac5192e` | Removed its two `assets/app.js` source-pins (+ dead `require('vm')`); kept the 6 static index.html structural checks; added a count guard. |
| **WR-03 / WR-04** (`mock-portfolio-db` fidelity gaps) | ⏳ Open | — | Shared mutable ref in `getAllTherapistSettings`; lenient `String()` id coercion. Verifier judged low Phase-31 risk. |
| **WR-06 + IN-01..04** (global state, catch tails, comment, allowlist fragility, FileReader contract) | ⏳ Open | — | Quality/robustness; no current incorrectness. |

**Known residual (documented in the detector header):** static fake-detection is heuristic — a deliberately-crafted fake (dummy var passed to a live sink, or an execution call hidden in a comment) can still evade. Covered by human code review, not the gate alone. The two *reported, accidental* evasions are now closed and self-verified.

**Out-of-scope follow-up noted:** `assets/app.js`'s cloud-button mount (`mountBackupCloudButton` from `initCommon`) has no EXECUTING test — formerly only shape-pinned by 25-02. Low priority (app.js is not refactored in Phase 31); belongs to the future app.js coverage work.
