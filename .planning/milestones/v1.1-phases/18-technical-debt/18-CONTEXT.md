# Phase 18: Technical Debt - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Address deferred technical debt from Phase 15 audit: license key obfuscation, shared code cleanup, refund handling SOP, dir attribute standardization. Plus a new item discovered during discussion: license page two-mode UX (activated vs. not-activated views with self-service deactivation).

</domain>

<decisions>
## Implementation Decisions

### License key obfuscation (DEBT-01)
- **D-01:** Base64 encode `portfolioLicenseKey` and `portfolioLicenseInstance` in localStorage. Decode on read.
- **D-02:** No salt, no device-derivation, no XOR. This is cosmetic tidiness — prevents casual DevTools inspection but not determined reverse-engineering.
- **D-03:** Lemon Squeezy 2-device activation limit is the real security mechanism. Base64 is "professional appearance" not actual protection.
- **D-04:** All code paths that read/write these two localStorage keys must go through encode/decode helpers (license.js, disclaimer.js receipt generation).
- **D-05:** Receipt continues to show the real (decoded) key — the customer needs to know their key, same as buying Office or Windows.

### Business logic cleanup (DEBT-02) — Downscoped
- **D-06:** No new utils.js file. Phase 16 already extracted the real duplicated functions (formatSessionType, readFileAsDataURL, setSubmitLabel) into app.js.
- **D-07:** Lightweight cleanup pass of existing `window.App` API in app.js — organize, ensure consistent naming, verify JSDoc comments on public functions.
- **D-08:** Single-use functions like `getClientMetrics()`, `averageDaysBetween()`, `countSessionsThisMonth()` stay in their respective files. Extracting functions with exactly one consumer adds complexity for zero benefit in a ~50KB vanilla JS app.

### Refund handling (DEBT-03)
- **D-09:** SOP document only. No Cloudflare Worker, no webhook, no periodic license revalidation check.
- **D-10:** Enforcement mechanism: deactivate the license key in LS dashboard on refund. Existing installs keep working (local app, can't reach in), but user cannot activate on any new device/browser, and clearing browser data locks them out.
- **D-11:** This is the same model as old-school desktop software. Proportional for EUR 119 one-time purchase at early launch volume.

### Dir attribute standardization (DEBT-04)
- **D-12:** Standardize all pages to set `dir` attribute on `<html>` element (not `<body>`). This matches W3C guidance and the pattern license.js already uses.
- **D-13:** Update `App.setLanguage()` in app.js (line 28) to set `dir` on `document.documentElement` instead of `document.body`.
- **D-14:** Update CSS selectors that target `body[dir="rtl"]` to target `html[dir="rtl"]` or `:dir(rtl)`.
- **D-15:** Landing page, impressum, datenschutz hardcode `dir="ltr"` on `<html>` — these need dynamic update when language changes (same as license.js approach).

### License page two-mode UX (DEBT-05) — New
- **D-16:** License page gets two modes. Mode A (not activated): current activation form, unchanged. Mode B (already activated): green "Licensed" status with checkmark, masked license key display (e.g. `XXXX-....-7F3A`), and "Deactivate This Device" button.
- **D-17:** Deactivation calls LS API directly from client (`POST /v1/licenses/deactivate` with `license_key` + `instance_id`). No server needed — same public endpoint pattern as activation.
- **D-18:** Deactivation confirmation dialog with bold red text about consequences: "You'll need to re-activate with an internet connection. This frees up one of your 2 device slots."
- **D-19:** After deactivation: clear localStorage keys, drop back to Mode A (activation form) on the same page.
- **D-20:** Update device-limit error message to: "You've reached the device limit. Deactivate a device from within the app on that device, or contact contact@sessionsgarden.app if you no longer have access to it."
- **D-21:** DEBT-05 implementation MUST use the `frontend-design` skill to design the activated view — this is a user-facing page that needs polished, distinctive styling matching the app's garden aesthetic, not generic markup.
- **D-22:** License page chrome (header, logo, footer, language selector, back-to-homepage) is OUT OF SCOPE for this phase — captured as todo for later.

### Claude's Discretion
- Base64 helper function naming and placement (in license.js or app.js)
- Exact CSS selectors to update for dir attribute change
- SOP document format and location
- App.js cleanup specifics (ordering, grouping of public API)
- Deactivation loading/error states UX

</decisions>

<specifics>
## Specific Ideas

- "Base64 sounds more clean and professional" — the motivation is appearance, not security
- License page activated view should follow Sublime Text / Sketch pattern: status + masked key + deactivate button
- Deactivation confirmation must have BOLD and RED font about consequences
- Device-limit error should mention both self-service (on old device) and contact email (if lost access)
- Receipt shows real decoded key — "the customer needs to know it, similar to buying Office"

</specifics>

<canonical_refs>
## Canonical References

### Audit findings (source of all DEBT items)
- `.planning/phases/15-architecture-and-ui-audit/15-CONSOLIDATED-FINDINGS.md` — Deferred Items section defines DEBT-01 through DEBT-04
- `.planning/phases/15-architecture-and-ui-audit/15-01-REPORT-security-code-architecture.md` — Original security and architecture findings with line numbers

### License implementation
- `assets/license.js` — Current license activation logic, localStorage keys (lines 181-183), isLicensed() check (lines 110-117), LS API call pattern (lines 137-186)
- `assets/disclaimer.js:183` — License key read for receipt generation

### Dir attribute current state
- `assets/app.js:20-31` — setLanguage() sets dir on body (line 28) — needs changing to documentElement
- `assets/license.js:196-203` — Already uses correct pattern (dir on html element)

### Existing shared code
- `assets/app.js:375-394` — Current App.formatSessionType, App.setSubmitLabel, App.readFileAsDataURL (Phase 16 extractions)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `activateLicenseKey()` in license.js — API call pattern reusable for deactivation (same fetch structure, same endpoint base)
- `App.confirmDialog()` in app.js — existing confirmation dialog, usable for deactivation warning
- `LICENSE_I18N` object in license.js — i18n pattern for license page strings, extend with deactivation strings

### Established Patterns
- LS API calls use `application/x-www-form-urlencoded` with URLSearchParams body
- License page manages its own i18n via `LICENSE_I18N` object (doesn't use App.t() since it loads before the app)
- localStorage keys: `portfolioLicenseKey`, `portfolioLicenseInstance`, `portfolioLicenseActivated`

### Integration Points
- Base64 encode/decode must wrap all reads/writes of `portfolioLicenseKey` and `portfolioLicenseInstance` across license.js and disclaimer.js
- Dir attribute change in app.js affects all app pages; CSS selectors in app.css targeting `body[dir="rtl"]` must be updated
- Deactivation needs internet — must handle offline gracefully (show error, don't clear local state)

</code_context>

<deferred>
## Deferred Ideas

- License page UI chrome (header, logo, footer, language selector, back-to-homepage) — captured as todo: `.planning/todos/pending/2026-03-24-license-page-ui-polish-add-app-chrome.md`
- Periodic license revalidation ping (30-day check) — only build if abuse patterns emerge post-launch
- Full utils.js module extraction — not justified at current codebase size

</deferred>

---

*Phase: 18-technical-debt*
*Context gathered: 2026-03-24*
