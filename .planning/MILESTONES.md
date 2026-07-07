# Milestones

## v1.2 Codebase Health & Reliability (Shipped: 2026-07-07)

**Phases completed:** 11 phases, 82 plans, 108 tasks
**Timeline:** 2026-06-22 → 2026-07-07 (15 days) · **Commits:** 550 · **Diff:** 495 files, +78,008 / -6,463

**Key accomplishments:**

- **Reliable updates & self-check (P28):** a single `version.js` source of truth now drives the footer, the SW `CACHE_NAME`, and a runtime integrity self-check that detects a stale/mismatched build — field-verified fix for installed-Safari PWA update delivery (the v209 failure mode can no longer happen silently), shipped as v1.2.1.
- **Observability & recovery (P29):** zero-network crash logging to IndexedDB, a "Report a problem" copy-to-clipboard screen, and a "reset & recover" escape hatch so a failed IndexedDB migration can no longer trap a user in an infinite refresh loop.
- **Test safety net (P30):** the project's first `package.json` + `npm test`, the 7 previously-broken PDF tests fixed, an RTL regression guard, and behavior tests characterizing `settings.js`/`add-session.js` before refactoring — all executing real code, not source-slicing fakes.
- **God-module refactor (P31):** `settings.js` (2,827→~1,000 lines) and `add-session.js` (2,173→~1,500 lines) decomposed into cohesive IIFE modules (SnippetsUI, Photos/StorageUsage, export-modal) behind the green Phase 30 suite, plus `openDB()` connection pooling and `innerHTML`→DOM hardening.
- **Maintainer docs (P32) + DE/CS i18n (P33):** an in-repo, agent-readable README (no longer published to the product URL) with four-slot code-comment banners piloted on the refactored modules, and the last 13 English-fallback export-modal keys translated to native German and Czech.
- **PDF visual redesign (P34):** the client-facing session-export PDF rebuilt in the Sessions Garden brand (header band, client card, two-bar severity, derived chronological session ordinal) with Hebrew RTL/bidi fully preserved.
- **Demo refresh (P35) + full comment coverage (P36):** the demo app brought back to schema/version parity with the real app (Heart-Wall arc, self-freshening dates, locked-down export/license controls), and banner comments extended to all remaining core production modules.
- **Canonical date engine + personalization (P37):** one local-time date parser kills the UTC off-by-one bug app-wide, a new Personalization Settings tab adds 6 date formats and a two-tier session-type list, and a terminology/filter pass relabels Session Format / Heart-Wall with new Overview/Sessions filters and sortable columns.
- **Next-session date (P38):** an optional native date-picker for the next session, its own sortable/overdue-aware Overview column, PDF/markdown export, and demo/backup parity — closed out through two UAT gap-closure rounds (partial-date save guard, Hebrew RTL date-segment order, bidi name+date isolation, error-tone toasts), all approved on-device in real Safari.

Full per-plan detail: `milestones/v1.2-ROADMAP.md`. Requirements: 64/65 complete, 1 deliberately descoped (PDFX-03 — invalid premise, see `milestones/v1.2-REQUIREMENTS.md`). Full audit: `milestones/v1.2-MILESTONE-AUDIT.md`.

---

## v1.1 Final Polish & Launch (Shipped: 2026-06-22)

**Phases completed:** 20 phases, 90 plans, 130 tasks

**Key accomplishments:**

- Replaced all clinical patient/treatment language with energy-healing terminology across all 4 i18n files (Hebrew: ~22 string changes; EN/CS: additionalTech field; DE: verified clean)
- SVG clock icon replaces text "פרטים" button; both action icons always visible as circular buttons with translated tooltips in all 4 languages
- IndexedDB migration v3 adds isHeartShield + shieldRemoved fields to sessions, with a toggle UI in the add-session form and validation blocking incomplete Heart Shield entries
- Computed Heart Shield icons in client table, Active/Removed session badges, session type filter dropdown, and reporting counter update using isHeartShield + shieldRemoved fields
- Canvas-based photo crop modal with cover-fit, pointer-event drag, zoom slider, and non-destructive cancel flow — pure Canvas API, no libraries.
- Garden divider between greeting and stats, watering can footer, and animated green moving-border on greeting card — all via pure CSS with dark mode support
- Logo reverted to leaf SVG after visual review; PWA icons updated to watering can; globe icon added to language picker; header actions reorganized vertically
- Full 10-section GDPR Datenschutzerklärung in German and English — covers local-first model, Cloudflare hosting, Lemon Squeezy payments, no cookies/tracking, and all Art. 15-21 rights
- Corrected German Heart Wall terminology (aufgelöst), fixed umlauts, and unified du-form across demo section
- Comprehensive 361-line QA checklist for manual testing of landing page + app across 5 browsers, 3 devices, 4 languages, dark mode, RTL Hebrew, and PWA
- All 41 greeting quotes rewritten across EN/HE/DE/CS — misattributed famous quotes removed, Hebrew gender neutralized, all 4 languages synced in count and theme
- Four user-facing bugs fixed: trust badges now translate in all 4 languages, Hebrew disclaimer drops German parenthetical, language persists across landing/disclaimer navigation, and contact@sessionsgarden.app is the sole email address site-wide.
- Resizable demo window with pointer-drag handles, prominent license CTA button with background color, and globe icon language selector with animated popover replacing native select
- Extracted Impressum and Datenschutz from landing.html accordion into dedicated standalone pages (impressum.html, datenschutz.html) with language detection, updated footer links with lang params, and bumped service worker cache to v15
- Four targeted UAT fixes: ?lang= passthrough to license page, disclaimer brand converted to clickable link, Impressum Hebrew heading added, and license CTA button visually enlarged to match hero CTA prominence.
- Extracted globe language selector into shared globe-lang.css/js component and added to all three legal pages, replacing the native select on disclaimer and adding a selector to impressum and datenschutz.
- Demo resize handles made reliable via pointer capture + wider grab zone; datenschutz.html now provides language-appropriate content for all 4 languages including native HE/CS notices
- Full codebase audit: 0 CRITICAL, 4 HIGH, 8 MEDIUM, 10 LOW findings across security (CSP, postMessage, license storage), dead code (key mismatch, duplicate functions, SW cache gaps), and architecture (async anti-pattern, demo gate bypass)
- Full audit of PWA configuration (font cache mismatch, 4 uncached pages), customer journey (2 blocking gaps: no LS product, undefined post-purchase flow), GDPR compliance (all surfaces compliant), legal placeholders documented, and Lemon Squeezy readiness assessed (code complete, needs account setup)
- Full i18n cross-check: 210 keys 100% covered across EN/HE/DE/CS; found 8 hardcoded English strings in backup/DB banners, 6 missing HE quotes, and 3 dead session-type references
- Service worker corrected to cache 3 actual Rubik weight files (not the non-existent Variable file), app images precached, SW registered on all 11 pages, and CSP meta tags added to all 11 pages.
- Extracted formatSessionType/readFileAsDataURL into shared App API, removed dead i18n keys (overview.table.details/addSession), and replaced hardcoded `#fff` with `--color-text-inverse` design token.
- All 4 language quote arrays brought to parity at 42 quotes each with Sapir's Hebrew adaptations and Pema Chodron removal
- URL param auto-populate for license key, in-app license link with key icon, and Datenschutz GDPR transparency note for Lemon Squeezy API call
- Base64 obfuscation of license credentials in localStorage with backward-compatible migration, plus full alignment of RTL dir attribute to html element across JS and CSS
- Two-mode license page with activated status view, masked key display, and self-service device deactivation via Lemon Squeezy API
- German Kleinunternehmer Impressum with complete DDG §5 content plus EN/HE/CS courtesy translations, all with direct sibling-file language navigation.
- AES-256-GCM encrypted backup export/import via Web Crypto API PBKDF2 key derivation, .sgbackup binary format with passphrase modal — zero new dependencies
- Hardened 5-page license gate to require both localStorage keys, added context-aware app/legal chrome to license page, and implemented 2-second auto-redirect for returning licensed users on landing page
- SW precache expanded to all 12 legal page variants (v25) and landing footer links switched from ?lang= URL params to direct per-language file navigation
- Touchpoint #1 — First-launch note (dismissable)
- GitHub Action deploy workflow syncing app-only files to ephemeral deploy branch via explicit cp whitelist, with production security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) added to _headers for Cloudflare Pages.
- Demo uses `demo_portfolio` database, app uses `sessions_garden` — completely separate IndexedDB instances. Zero implementation needed.
- Backup modal Cancel/X dismiss, dark mode deactivation cleanup, and three-dropdown birth date pickers on all 3 forms
- Globe popover language selector with equal-size dark mode toggle, and shared footer with legal links, contact email, copyright, and version on all 5 app pages
- Z-index token scale, breakpoint consolidation from 4 to 2, modal max-height with dvh fallback, body scroll lock, and 44px mobile touch targets
- Horizontal scrollable nav, full-width form stacking, severity 2-row grid, 4 collapsible accordion sections on add-session, and native mobile date picker
- Vendored jsPDF 2.5.2 UMD plus subsetted Noto Sans (Latin+Extended) and Noto Sans Hebrew base64 fonts as offline-capable, CSP-compliant assets for Plan 22-04's PDF export module.
- IndexedDB v4 with therapistSettings store, App.getSectionLabel/isSectionEnabled getters, eager-loaded cache, BroadcastChannel cross-tab sync, and 35 Settings i18n keys across en/de/he/cs.
- Tiny escape-first Markdown→HTML renderer (window.MdRender.render) for the export modal preview pane — replaces ~50 KB marked.js with ~2.7 KB of pure regex while structurally blocking the OWASP XSS canonical payloads.
- Vanilla-JS Settings page (settings.html + settings.js + Phase 22 CSS) renders 9 section rows with rename/enable/reset controls, persists via PortfolioDB.setTherapistSetting, broadcasts cross-tab updates, and enforces the Phase 22 amendment locked-rename + first-disable-confirm + sticky-banner-with-2-bullets contract.
- `window.PDFExport` IIFE encapsulates jsPDF 2.5.2 — first Export click lazy-loads jspdf.min.js + Noto Sans / Noto Sans Hebrew base64 fonts (~509 KB total), subsequent calls reuse cached scripts; renders A4 portrait PDFs with per-line Hebrew RTL detection, auto page-break, and Page X of Y footer.
- Wires Feature B end-to-end on the session edit page: a 3-step Export modal (selection → editable preview → outputs) producing PDF, plain-text-file (.md), and Web Share — plus closes Feature A's render side by routing every section heading through App.getSectionLabel and gating section visibility per Settings.
- Backup ZIP manifest now round-trips therapist customisations (custom section labels + disabled flags) via a v2 manifest field, with full backward-compat for pre-Phase-22 backups (v0 legacy, v1 Phase-7 ZIPs) and a whitelist-defended restore loop.
- Wires Phase 22 outputs into the PWA shell: bumps SW CACHE_NAME v52 → v53 with 6 new precache URLs (jsPDF, fonts, settings.js, pdf-export.js, md-render.js) plus /settings HTML, and adds a gear-icon entry point to ./settings.html in the shared header chrome that every App.initCommon-using page picks up automatically.
- Confirm dialog gained a `tone` option (danger default) so neutral actions no longer show a red confirm button — the OK button's class swaps on open and is restored on close, with a self-heal path for dialogs that crashed mid-flow.
- When a therapist renames a session section in Settings, `applySectionLabels()` now propagates the rename to descendant `<input>` / `<textarea>` placeholders on `add-session.html`, and restores the i18n default placeholder when the customisation is removed.
- Vendored bidi-js@1.0.3 (12148 bytes, MIT) plus its LICENSE.txt as offline-capable PWA assets, and added them to sw.js PRECACHE_URLS with a CACHE_NAME bump (v81 -> v82) so installed users force-fetch the new precache entry on next service-worker activation. Foundation plan only — does not touch pdf-export.js (that's 23-02's job).
- Replaced jsPDF's broken pseudo-RTL handling (`setR2L` + anchor flip) with a proper UAX #9 bidi pre-shape pipeline using vendored bidi-js@1.0.3 — every `doc.text()` boundary now receives a visual-order string built by `shapeForJsPdf()`, all 3 `setR2L` calls deleted, x-anchor flip preserved.
- Bumped all four A4 margins to the 25.06mm safe zone (71pt) and centered the page-1 title block (client name + meta line) via `doc.text(visual, pageWidth/2, y, { align: 'center' })` — `USABLE_W` recomputes 483pt → 453pt automatically; body content stays left/right-anchored per D4; all 23-02 bidi work preserved.
- Landed two pieces of automated verification scaffolding for Phase 23 — a 12-vector bidi correctness corpus (`tests/pdf-bidi.test.js`, all 12 RESEARCH vectors green first-shot against the live `assets/bidi.min.js`) and a JSDOM-based Latin-regression harness (`tests/pdf-latin-regression.test.js`) that pins both `/CreationDate` AND `/ID` in jsPDF output to produce byte-deterministic SHA-256 baselines for 3 EN/DE/CS fixture sessions. Closes UAT statement T3 on the post-rewrite Phase 23 baseline. Production code (`assets/pdf-export.js`, `sw.js`, `assets/bidi.min.js`) untouched.
- Hebrew body text was rendering off the right edge of the PDF because the RTL x-anchor (set in the pre-Phase-23 setR2L=true world) was not paired with `align: 'right'` after 23-02 removed setR2L; fix adds `align: 'right'` at all 3 RTL `doc.text` sites and adds the Hebrew regression fixture that should have caught it.
- Vendored Heebo Regular as a single Hebrew+Latin font and rewired pdf-export.js to use it everywhere, fixing the silent glyph-drop bug where the prior single-script Noto fonts (NotoSans = Latin only, NotoSansHebrew = Hebrew only) lost ~half the chars on any line that mixed scripts; added a glyph-emission floor regression test that would have caught the bug.
- Two visible bugs from the post-Heebo (23-07) build: digits inside RTL paragraphs displayed reversed ("24" → "42", "2026" → "6202") because jsPDF's internal `__bidiEngine__` re-processed our pre-shaped visual strings; and inline markdown `**bold**` markers displayed literally because `parseMarkdown` only handled block-level syntax. Fixed by adding `{ isInputVisual: false }` to every `doc.text()` call (11 sites) and a `stripInlineMarkdown()` helper run on paragraph + list-item text. Bold styling is intentionally NOT rendered — deferred to a future phase.
- Text-snippet quick-paste engine with a 60-record Emotion Code seed pack (12 cells × 5 emotions × 4 locales), trigger-based caret popover with keyboard navigation, IndexedDB v5 migration, cross-tab sync, and backup round-trip — wired into 7 session textareas.
- Snippet-management Settings UI with two co-equal tabs (custom field names + text snippets), a configurable trigger prefix that persists across tabs, and full snippet-library CRUD with Unicode-aware tag matching across all 4 languages.
- Closed the sendToMyself encryption-bypass + fake-attachment regression by deleting the function and replacing it with an encryption-inheriting shareBackup(blob, filename) that uses Web Share API on supported browsers and falls back to download + an honest mailto.
- Collapsed the 5-button overview cluster to `[Add Client] [Add Session]`, moved the backup entry point into the top header as a 44×44 circular cloud icon mounted on every page, and consolidated Export / Share / Import / contents checklist / last-backup indicator into a single Backup & Restore modal — all with TDD RED→GREEN, 17 new test assertions, and a single-source-of-truth `BACKUP_CONTENTS_KEYS` parity guard.
- Added `BackupManager.testBackupPassword(file, passphrase)` as a memory-only dry-run that decrypts a `.sgbackup` to verify the password works WITHOUT mutating IndexedDB or localStorage (D-12); filled the Plan-02 placeholder sub-card with file-drop + password + result UI; shipped a spy-instrumented `PortfolioDB` mock that proves the safety promise via tests/25-03-testpassword-no-mutation.test.js (the falsifiable contract for T-25-03-01).
- Shipped the four state-color CSS modifier classes for the header cloud icon, the `App.updateBackupCloudState` post-mount updater, the schedule-coupled `BackupManager.getScheduleIntervalMs` + `getChipState` pure helpers (D-30 single source of truth), and the D-15/D-19 7-day banner suppression — all with TDD RED→GREEN, 31 new test assertions including the contracted falsifiable behavior gate for D-15/D-19.
- Shipped the Settings → Backups tab (frequency selector + D-18 password-mandatory gate + D-11 folder picker + neutral-tone disable confirm), the foreground `BackupManager.checkBackupSchedule` helper with a 1-hour debounce, and the page-load + visibilitychange listeners that fire the interval-end prompt by opening the unified Backup & Restore modal — TDD RED→GREEN with 11 new test assertions and a clean D-30 single-source-of-truth audit.
- CropModule.resizeToMaxDimension delivers EXIF-aware two-pass createImageBitmap resize (longest edge ≤ 800px at JPEG q=0.75); add-client photo upload is rewired so only the cropped output reaches IndexedDB and the raw upload is never persisted — proven by a behavior test that drives the full pipeline end-to-end.
- Shipped the Photos Settings tab body — `PortfolioDB.estimatePhotosBytes` (pure size estimator), `_optimizeAllPhotosLoop` + `_deleteAllPhotosLoop` testable bulk operations that reuse Plan 06's `CropModule.resizeToMaxDimension` and the existing `PortfolioDB.updateClient` (D-30 single-source-of-truth), the storage-usage line + savings preview + empty-state UI, and 84 i18n keys (21 × 4 locales) — TDD RED→GREEN with 14 new test assertions and zero regressions across the 34-test project suite.
- Closed D-29 / D-30 / D-04 with three new tests (43 assertions), refactored `exportEncryptedBackup` to expose the encrypted blob+filename so the Share button now works on the encrypted path (closing Plan 02's deferred limitation), and fixed a Wave-6 regression discovery where `settings.html` was silently missing the `backup.js` script tag — making the entire Plan 05 Backups tab non-functional in production.
- Gated `BackupManager.checkBackupSchedule` debounce write on a successful modal-open or cross-page redirect, closing the silent-reminder-loss bug on every non-overview page.

---

## Known deferred items at v1.1 close (2026-06-22)

v1.1 shipped; the app is live and sold. The following were consciously deferred, not lost:

**Real deferrals → backlog** (see ROADMAP "Backlog" + `.planning/todos/pending/`):

- **Phase 21 — mobile (`21-03`)**: crop bug fix (shared module), overlay-close, body scroll lock, iPhone device checkpoint. Parked on physical iOS testing; mobile is not a launch blocker.
- **Phase 26 — help/onboarding build**: design contract approved (`26-UI-SPEC.md`, 6/6 PASS), implementation deferred. The build phase must start from the archived UI-SPEC, not a fresh design.
- **LNCH-04**: landing-page DE/CS translation verification (todo `2026-03-18-verify-landing-page-translations.md`).
- **LNCH-06**: mobile QA — folded into the Phase 21 mobile backlog item.

**Bookkeeping acknowledged (not unfinished work):** the close audit flagged ~11 UAT + 5 VERIFICATION status fields as partial/human-needed and 9 quick-tasks as "unknown", but the underlying work shipped and is live (most UAT entries had 0 pending scenarios). Some requirement checkboxes finished in execution (e.g. LIVE-04/07/09, LNCH-02) were never ticked in REQUIREMENTS.md. These are status-tracking artifacts, not gaps.
