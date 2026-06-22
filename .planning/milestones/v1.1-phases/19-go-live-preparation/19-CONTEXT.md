# Phase 19: Go-Live Preparation - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Complete all remaining prerequisites to take Sessions Garden live on Cloudflare Pages: legal compliance (Impressum research + full content), separate per-language legal pages, deployment pipeline, license page UX polish, landing page behavior for activated users, encrypted backups, security guidance messaging, and innovator research for v1.2 backlog.

</domain>

<decisions>
## Implementation Decisions

### Legal page file structure (LIVE-02)
- **D-01:** All three legal pages (Impressum, Datenschutz, Disclaimer/Terms) get separate HTML files per language — not JSON i18n. Legal documents are long-form prose where each language version can differ structurally. Disclaimer is included despite LIVE-02 only naming Impressum/Datenschutz — Ben challenged "why is disclaimer any different?" and it isn't. Same pattern for all legal pages, done in one pass to avoid future rework.
- **D-02:** Naming convention (Option 3): primary file stays as-is (German authoritative), language variants get suffixed. E.g., `impressum.html` (DE), `impressum-en.html`, `impressum-he.html`, `impressum-cs.html`. Same pattern for datenschutz and disclaimer.
- **D-03:** Full duplication per file — each is a complete standalone HTML page (header, content, footer). No shared shell or template mechanism. 12 files total (3 pages x 4 languages). Simple to read, edit, hand to a lawyer.
- **D-04:** Language switcher stays on legal pages — navigates between language versions of the same page (links to sibling files).
- **D-05:** Non-German versions get a "courtesy translation" banner at the top: "This is a courtesy translation. In case of discrepancies, the [German version] is legally binding." Styled as a subtle aside (soft background, border, rounded corners, small text) — matching SapphireHealing's pattern. Links to the German version.
- **D-06:** Current single-file legal pages (impressum.html, datenschutz.html, disclaimer.html) are replaced entirely. The current Impressum is a skeleton, not a finished page — rebuild from scratch with full legal content per LIVE-01 research.

### Deployment pipeline (LIVE-03)
- **D-07:** Option 2 — separate `deploy` branch in the same repo. GH Action syncs app-only files on push to `main`. CF Pages watches `deploy` branch only. One repo, clean separation — CF never sees `.planning/` or `.claude/`.
- **D-08:** Files deployed (included in deploy branch):

  | Include | Reason |
  |---------|--------|
  | `_headers` | CF Pages headers config |
  | All `*.html` files | App + legal + landing pages |
  | `assets/` (entire dir) | JS, CSS, fonts, images, demo data |
  | `manifest.json` | PWA manifest |
  | `sw.js` | Service worker |

- **D-09:** Files excluded from deploy branch:

  | Exclude | Reason |
  |---------|--------|
  | `.claude/` | Dev tooling |
  | `.planning/` | Dev planning |
  | `.env`, `.env.*` | Secrets |
  | `.gitignore` | Dev-only |
  | `.DS_Store` | macOS junk |
  | `CLAUDE.md` | Dev instructions |

- **D-10:** Push to `main` triggers automatic deploy. No staging branch at launch — add later when needed. CF Pages gives free preview deployments on non-production branches if staging is added later.

### License page chrome (LIVE-05)
- **D-11:** License page is context-aware based on `portfolioLicenseActivated` in localStorage:
  - **Activated user:** Gets full app navigation (nav bar matching other app pages). "Home" = `index.html`.
  - **Non-activated user:** Gets legal page pattern (topbar with logo, language switcher, back-to-landing link). "Home" = `landing.html`.
- **D-12:** Inline i18n stays for the license page — content is short UI text (form labels, status, buttons), not legal prose.

### License gate hardening (discovered during discussion)
- **D-13:** The existing gate chain is structurally sound: no terms → disclaimer.html, terms but no license → license.html, both present → app loads. However, the license check on all 5 app pages only checks `localStorage.getItem('portfolioLicenseActivated')` — existence only, not validity. Setting this single flag to "1" in DevTools bypasses all gates without any license key or instance ID.
- **D-14:** Fix: update inline gate script on all 5 app pages (index, add-client, add-session, sessions, reporting) to also require `portfolioLicenseInstance` to exist (matching what `isLicensed()` in license.js already checks). Raises the bar from "set one flag" to "understand the data model." Still not uncrackable (client-side JS never is), but proportional.

### Landing page for activated users (LIVE-06)
- **D-15:** Landing page shows as-is for all users — it's public marketing, useful for sharing with colleagues.
- **D-16:** "Already bought?" link in header auto-detects active license (check `portfolioLicenseActivated` + `portfolioLicenseInstance`). If active → redirect to app with brief "Active license detected" message/banner. If not active → navigate to license.html as before.

### Demo data cleanup (LIVE-07)
- **D-17:** LIVE-07 requires **zero implementation**. Demo data uses ephemeral seeding (demo-seed.js resets on each load into `demo_portfolio` DB). The main app uses `portfolio` DB. These are completely separate IndexedDB databases — demo data never touches the real app database. No cleanup needed on activation. Planners: do NOT create tasks for LIVE-07.

### Encrypted backups (LIVE-08 — rescoped)
- **D-18:** Full IndexedDB encryption deferred to v1.2 (too risky to rush before launch — touches entire data layer).
- **D-19:** Encrypted backup export/import for v1.1 launch: Web Crypto API (AES-256-GCM, passphrase → PBKDF2 → key). Zero new dependencies.
- **D-20:** Export flow: user clicks Export → prompted for passphrase → ZIP generated normally → entire blob encrypted → saved as `.sgbackup` (custom extension signals it's encrypted, not a plain ZIP).
- **D-21:** Import flow: detect file type by extension/magic bytes → if `.sgbackup`, prompt for passphrase → decrypt → process ZIP as normal. Old `.zip` imports still work unencrypted for backward compatibility.
- **D-22:** Passphrase is NOT stored anywhere. User must remember it. Lost passphrase = backup is unrecoverable (by design).

### Security guidance messaging (LIVE-08 — rescoped)
- **D-23:** In-app security/privacy messaging must appear **multiple times** across the user journey — not a one-time dismissable tooltip. Ben was explicit: "appear multiple times." Key touchpoints: first launch after activation, every backup reminder, and accessible from a persistent location (settings or help). The motivation: therapists are non-technical users who will handle data carelessly unless repeatedly reminded. This is about protecting users from themselves, not just compliance.
- **D-24:** Content must communicate: data lives only in this browser, clearing browser data deletes everything, backups are essential, use device encryption, lock your device. Tone: empathetic ("protect your clients' privacy") not alarming.
- **D-25:** Backup reminder messaging improved to communicate risks clearly — what's at stake if browser data is cleared, why regular backups matter. Current backup reminder is functional but doesn't convey urgency or consequences.
- **D-26:** **CRITICAL: Security guidance notes require a dedicated UX design pass** — use `frontend-design` skill or UI research agent, informed by app screenshots and user context. This is a product/UX concern about communicating risk to non-technical therapists. NOT left to the executor agent to decide copy and placement. The designer needs to see the actual app screens where messages will appear.

### Browser/device terminology (captured as todo)
- **D-27:** The app currently says "devices" for activation limits, but the 2-activation limit is per browser, not per device. Two browsers on one laptop = two activations. All user-facing text about activation limits must use accurate browser/endpoint language. Captured as separate todo — cross-cuts license page, landing page, LS product description, terms, and post-purchase email.

### Innovator research (LIVE-09)
- **D-28:** Research task only — run innovator agent to explore v1.2 feature candidates, collect in backlog. No implementation in this phase.

### Claude's Discretion
- GH Action workflow specifics (trigger config, file sync mechanism)
- Cloudflare Pages project setup steps
- Exact AES-256-GCM encryption parameters (salt length, iteration count)
- `.sgbackup` file format details (header structure for version/salt/IV)
- Legal page HTML/CSS structure (following established legal-page pattern)
- Innovator research prompts and backlog format

</decisions>

<specifics>
## Specific Ideas

- "Already bought?" auto-redirect: brief intermediate message or banner, not an abrupt redirect — user should understand what happened
- SapphireHealing courtesy translation banner: `<aside>` with soft background, border, rounded, small text, link to German version
- Backup passphrase prompt should explain clearly: "This passphrase encrypts your backup. If you forget it, the backup cannot be recovered."
- Security notes should be empathetic, not alarming — therapists aren't tech people, frame as care for their clients' privacy
- License page activated view already built in Phase 18 (two-mode UX) — Phase 19 adds the chrome/navigation wrapper around it

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Legal content (LIVE-01, LIVE-02)
- `.planning/phases/15-architecture-and-ui-audit/15-CONSOLIDATED-FINDINGS.md` — BIZ-02 gap: Impressum missing Umsatzsteuer, Verbraucherstreitbeilegung, Haftung, Urheberrecht sections
- `.planning/phases/17-audit-fix-business/17-CONTEXT.md` — D-04 through D-06: Sapir's business details, Kleinunternehmer status
- `impressum.html` — Current skeleton (to be replaced entirely)
- `datenschutz.html` — Current content (to be split into per-language files)
- `disclaimer.html` — Current single-file with inline i18n (to be split into per-language files)
- SapphireHealing courtesy banner pattern: `/Users/ben/Claude-Code-Sandbox/SapphireHealing/src/pages/en/terms.astro` lines 9-11

### License and gate system (LIVE-05, D-13/D-14)
- `index.html:5-9` — Current gate scripts (terms + license check)
- `assets/license.js:171-178` — `isLicensed()` function (checks both flag AND instance)
- `assets/license.js:240-250` — Activation flow (sets localStorage keys)
- `.planning/phases/18-technical-debt/18-CONTEXT.md` — D-16 through D-22: License page two-mode UX decisions
- `.planning/todos/pending/2026-03-24-license-page-ui-polish-add-app-chrome.md` — Original todo for license page chrome

### Deployment (LIVE-03, LIVE-04)
- `_headers` — CF Pages headers config (must be in deploy branch)
- `sw.js` — Service worker cache list (must match deployed files)
- `manifest.json` — PWA manifest

### Backup system (LIVE-08)
- `assets/backup.js` — Current ZIP export/import logic (add encryption layer here)
- `assets/jszip.min.js` — JSZip library (does NOT support ZIP encryption — hence Web Crypto approach)

### Landing page (LIVE-06)
- `landing.html:57` — "Already have a license?" link
- `assets/landing.js:4` — LS_CHECKOUT_URL constant

### Existing patterns
- `assets/globe-lang.js` / `assets/globe-lang.css` — Reusable language switcher component (used on legal pages)
- `.planning/phases/14-i18n-bugs-legal-footer-cleanup-and-contact-email-update/14-CONTEXT.md` — Legal page patterns established in Phase 14

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `globe-lang.js` + `globe-lang.css` — Language switcher component, already used on impressum/datenschutz. Reuse on per-language legal pages (switcher navigates to sibling language file).
- `legal-page` CSS classes in impressum.html — Topbar, footer, content layout. Copy to all per-language legal page files.
- `disclaimer-page` CSS classes in disclaimer.html — Similar pattern, adapt for per-language split.
- `isLicensed()` in license.js — Context-aware check for license page chrome switching.
- `Web Crypto API` — Built into all modern browsers. `crypto.subtle.deriveKey()` for PBKDF2, `crypto.subtle.encrypt()` for AES-GCM. Zero dependencies.

### Established Patterns
- Legal pages: topbar (logo + brand + globe + back link) + content area + footer (3 legal links with `?lang=` params)
- App pages: nav bar with page links, different structure from legal pages
- Gate scripts: inline `<script>` blocks in `<head>` before any other content loads — redirect pattern
- Backup: `BackupManager` class in backup.js handles ZIP create/extract via JSZip

### Integration Points
- Per-language legal files need SW cache updates (`sw.js` precache list grows from 3 legal pages to 12)
- All cross-links between legal pages (footer links, and links from app/landing pages) must be updated to point to the correct language variant (e.g., `impressum-he.html` not `impressum.html?lang=he`)
- GH Action needs access to repo — standard GitHub Actions permissions, no special config
- Encrypted backup: wrap existing `BackupManager.exportBackup()` output with encrypt step, unwrap on `importBackup()` input
- License page chrome: detect `isLicensed()` on page load → render app nav or legal-page topbar accordingly
- Gate hardening: 5 HTML files need identical inline script update

</code_context>

<deferred>
## Deferred Ideas

- Full IndexedDB encryption with PIN/passphrase — v1.2 milestone. Captured: `.planning/todos/pending/2026-03-24-v12-full-indexeddb-encryption.md`
- PWA install guidance + user manual — post-launch. Captured: `.planning/todos/pending/2026-03-24-pwa-install-guidance-and-user-manual.md`
- Browser/device terminology fix across all touchpoints — captured: `.planning/todos/pending/2026-03-24-device-browser-terminology-fix.md`
- Staging branch / preview environment for CF Pages — add when needed
- Periodic license revalidation ping — only if abuse patterns emerge post-launch

</deferred>

---

*Phase: 19-go-live-preparation*
*Context gathered: 2026-03-24*
