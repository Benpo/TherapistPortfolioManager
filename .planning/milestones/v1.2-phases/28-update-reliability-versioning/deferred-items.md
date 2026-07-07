# Deferred Items — Phase 28

Out-of-scope discoveries logged during plan execution (SCOPE BOUNDARY rule).
Not fixed here — they are pre-existing and unrelated to the plan's changes.

## 28-04 — Pre-existing PDF test-environment failures (NOT introduced by this plan)

Discovered during the Task 3 full-suite regression sweep. These 7 tests fail
because the local `tests/` PDF suite depends on `jsdom` + the native `canvas`
npm package and a `Blob.arrayBuffer` polyfill that are absent in this
environment — an environment/dependency gap, not a code defect. None of these
tests reference any file modified by plan 28-04
(`version.js`, `shared-chrome.js`, `app.css`, `app.js`):

- `tests/pdf-bold-rendering.test.js` — `HTMLCanvasElement.prototype.getContext` not implemented (needs `canvas` npm pkg)
- `tests/pdf-digit-order.test.js`
- `tests/pdf-glyph-coverage.test.js`
- `tests/pdf-latin-regression.test.js`
- `tests/quick-260522-iwr-ordered-list-export.test.js`
- `tests/quick-260608-c8x-pdf-list-typed-ordinal-and-rtl-prefix.test.js`
- `tests/quick-260608-cx5-pdf-rtl-ordered-list-unified-row-regression.test.js`

Representative error: `HTMLCanvasElement.prototype.getContext (without installing the canvas npm package)` and `TypeError: blob.arrayBuffer is not a function`.

**Action for Ben (optional, not blocking 28-04):** to run the PDF suite
locally, install the dev deps the jsdom-based PDF tests expect (`canvas`) in the
test environment, or run them where those deps already exist. No source change
required.
