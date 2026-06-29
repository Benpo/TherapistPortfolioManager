# Sessions Garden

A privacy-first session management app for energy healing practitioners. Track clients, document sessions, and monitor progress — all stored locally on the device, with no backend and no data ever leaving the browser.

> **This README is the maintainer guide.** It is written for the owner working with AI coding agents (cloud or local), and it lives in-repo as agent context. It is **not** published at the product URL. The center of gravity here is *run / deploy / make a change* — for deeper architecture, follow the pointers to `.planning/codebase/*.md` at the end.

## What It Does

- **Client Management** — Organize clients with notes, contact info, and session history
- **Session Documentation** — Record trapped emotions, severity levels, insights, and Heart Shield work
- **Reporting** — View practice statistics and client activity at a glance
- **Encrypted Backups** — Export AES-256-GCM encrypted `.sgbackup` files with passphrase protection
- **Offline-First** — Works without internet after initial setup (PWA with service worker)
- **Multi-Language** — English, German, Hebrew (RTL), and Czech

## Privacy by Design

All data stays in the browser's IndexedDB. Nothing is sent to any server. The developer has zero access to client data. No cookies, no tracking, no analytics.

The only external connections are:
- **Lemon Squeezy API** — one-time license activation
- **Cloudflare Pages** — static file hosting

## Tech Stack

- Vanilla HTML/CSS/JavaScript — no framework, **no build step**, zero runtime dependencies
- IndexedDB for data storage (store `sessions_garden`)
- Web Crypto API for encrypted backups
- JSZip for backup file packaging; jsPDF + bidi for PDF export
- Service Worker for offline caching

---

## Run locally

```bash
python3 -m http.server 8080
# then open http://localhost:8080/landing.html
```

**Why localhost matters:** the encrypted-backup features use the Web Crypto API, which only works in a *secure context* — `localhost` or HTTPS. Opening the files directly over `file://` will load the UI but the backup encrypt/decrypt paths will fail. Always serve over `localhost` when testing anything backup-related.

Any static file server works; `python3 -m http.server` is just the zero-install default.

## Deploy and ship a change

The deploy pipeline is fully automatic — there is no manual build.

1. Commit and **push to `main`**.
2. `.github/workflows/deploy.yml` runs: it stages app-only files into `deploy-staging/` (an explicit allow-list — `_headers`, `_redirects`, `LICENSE`, `*.html`, `assets/`, `manifest.json`, `sw.js`), then `sed`-stamps the `__BUILD_TOKEN__` placeholder in the **staging copy** of `assets/version.js` with the git short-hash (`${GITHUB_SHA::7}`). This is a single deliberate text substitution, **not** a bundler.
3. The action force-pushes the result to the ephemeral `deploy` branch.
4. **Cloudflare Pages** watches `deploy` and serves it at the product URL.
5. The action purges the Cloudflare cache so the new build is live immediately.

Dev files (`.planning/`, `.claude/`, `CLAUDE.md`, `.env`) are never staged, and a "Verify no sensitive files" step in the workflow hard-fails the deploy if any slip through. The committed `assets/version.js` keeps its placeholder (it resolves to a `'dev'` token when unstamped, e.g. for local `file://` opens).

**Service-worker upkeep when you touch precached files:** if you add or rename a file in `assets/`, add its exact deployed path to `PRECACHE_URLS` in `sw.js` (see the "add a new JS module" recipe). The SW `CACHE_NAME` auto-derives from `INTEGRITY_TOKEN`, so you never hand-edit a cache number — but be aware of the **pre-commit hook gotcha**: the hook skips its cache-name bump whenever `sw.js` is itself in the diff, so a `PRECACHE_URLS` edit needs a manual follow-up commit if you were relying on the hook. The real upkeep is keeping the `PRECACHE_URLS` list accurate, not editing a number.

## Current file-map

Built fresh against the post-refactor `assets/` layout. For the authoritative deeper map, see `.planning/codebase/STRUCTURE.md`.

```
TherapistPortfolioManager_app/
├── index.html              # App home — client overview, search, filters
├── sessions.html           # Session list for a client
├── add-client.html         # Add / edit a client
├── add-session.html        # Add / edit a session
├── settings.html           # Settings — snippets, photos, backup, schedule
├── reporting.html          # Reporting / analytics
├── report.html             # Diagnostic / "report a problem" page
├── landing.html            # Marketing page + Lemon Squeezy checkout entry
├── license.html            # License activation
├── disclaimer*.html        # Terms of use (de default + -en/-he/-cs)
├── impressum*.html         # Impressum (de default + -en/-he/-cs)
├── datenschutz*.html       # Privacy policy (de default + -en/-he/-cs)
├── demo.html               # Demo mode entry (stale; not a source of truth)
├── assets/
│   ├── version.js          # AppVersion — APP_VERSION + deploy-stamped INTEGRITY_TOKEN; SW cache + integrity self-check
│   ├── crashlog.js         # CrashLog — local crash log (IDB + localStorage mirror)
│   ├── app.js              # App — i18n, nav, theme, toasts, section-label cache
│   ├── db.js               # PortfolioDB — ALL IndexedDB I/O, migrations, connection pool
│   ├── backup.js           # BackupManager — ZIP export/import + AES-256-GCM
│   ├── backup-modal.js     # Backup options modal
│   ├── shared-chrome.js    # SharedChrome — footer / nav chrome / localized legal links
│   ├── overview.js         # index.html page module
│   ├── sessions.js         # sessions.html page module
│   ├── add-client.js       # add-client.html page module
│   ├── add-session.js      # add-session.html page module (boots the export modal)
│   ├── export-modal.js     # Extracted: export dialog + markdown builders for add-session
│   ├── settings.js         # settings.html controller (slimmed — coordinates tab modules)
│   ├── settings-snippets.js# Extracted: snippets settings tab
│   ├── settings-photos.js  # Extracted: photo-management settings tab
│   ├── reporting.js        # reporting.html page module
│   ├── license.js          # license.html — Lemon Squeezy activation/deactivation
│   ├── landing.js          # landing.html page module
│   ├── snippets.js         # Snippets — quick-paste picker UI
│   ├── snippets-seed.js    # SNIPPETS_SEED — default snippet pack
│   ├── crop.js             # CropModule — photo crop canvas modal
│   ├── pdf-export.js       # PDFExport — bidi-aware PDF generation
│   ├── md-render.js        # MdRender — markdown → HTML/text renderer
│   ├── report.js / disclaimer.js / globe-lang.js   # report page / terms gate / language picker
│   ├── i18n.js             # i18n loader stub
│   ├── i18n-en|he|de|cs.js # Translation dictionaries (window.I18N.*)
│   ├── i18n-disclaimer.js  # Legal-page strings
│   ├── jspdf.min.js / jszip.min.js / bidi.min.js   # Vendor libs (PDF / ZIP / bidi)
│   ├── tokens.css / app.css / landing.css / demo.css / globe-lang.css
│   ├── fonts/ branding/ illustrations/
├── tests/                  # Node test suite + run-all.js (no browser; npm test)
├── scripts/                # cf-purge-cache.sh and other CI/ops scripts
├── .github/workflows/      # deploy.yml — stamp build token, deploy to CF Pages
├── sw.js                   # Service worker — precache list, cache-first; never touches IndexedDB
├── manifest.json           # PWA manifest
├── _headers / _redirects   # Cloudflare Pages header + redirect rules
├── package.json            # Dev/test only (jsdom) — never ships to production
└── README.md               # This maintainer guide (repo-only)
```

## How do I…

Each recipe below is truth-checked against the live file it documents. If a file changes, re-verify the recipe rather than trusting memory.

### …run the tests?

```bash
npm test                     # node tests/run-all.js — runs every tests/*.test.js in isolated child processes
node tests/<file>.test.js    # run a single test file
```

Node `>=18` is required (see `package.json` `engines`). The only dev dependency is `jsdom`; it is dev/test tooling and **never ships to production**.

### …ship a change?

See "Deploy and ship a change" above: push to `main`, the GitHub Action stages app-only files, stamps the build token into the staging `version.js`, force-pushes the `deploy` branch, Cloudflare Pages serves it, and the CF cache is purged. Remember the `PRECACHE_URLS` upkeep and the pre-commit SW-bump gotcha if your change touches `assets/` files or `sw.js`.

### …bump the app version?

`assets/version.js` is the single source of truth. Edit the **`APP_VERSION`** constant (a hand-set semver, touched only at a release boundary). It drives three things at once:
- the footer version label,
- the service-worker `CACHE_NAME` (via `INTEGRITY_TOKEN`),
- the runtime integrity self-check.

Do **not** hand-edit a cache number anywhere else. `INTEGRITY_TOKEN` is **deploy-stamped** (the git short-hash, substituted by the deploy action) — never set it by hand; locally it falls back to `'dev'`.

### …add or edit a translation string?

Add the key to **all four** dictionaries: `assets/i18n-en.js`, `assets/i18n-he.js`, `assets/i18n-de.js`, `assets/i18n-cs.js`. Then reference it with `data-i18n="key"` in HTML, or `App.t('key')` in JS. Keep keys grouped/alphabetical within their section. If a translation is not yet available for a language, leave a `// TODO i18n: translate to <lang>` marker on the placeholder so untranslated keys are greppable.

### …add a new JS module?

1. Create `assets/newmodule.js` as an **IIFE** that registers its public surface on `window.*` (the app has no `import`/`export` — everything is global via `window`).
2. Add a `<script>` tag for it in **each HTML page that uses it**, at the correct load-order position (after its dependencies — see "Rules an agent must not break").
3. Add its exact deployed path (`/assets/newmodule.js`) to `PRECACHE_URLS` in `sw.js`.
4. Mind the pre-commit SW-bump follow-up if `sw.js` is in the same diff.

### …add a client-side DB operation?

Add the method to the `PortfolioDB` IIFE in `assets/db.js` and export it in the `return {}` block. Never open `indexedDB` directly from a page module — always route through `PortfolioDB` so the connection pool and migrations stay intact. A schema change means incrementing `DB_VERSION` and adding a versioned migration.

## Rules an agent must not break

These are load-bearing invariants. Violating one ships a broken or unsafe build.

- **Zero runtime dependencies in production.** Production ships only static `assets/*` to Cloudflare Pages. `package.json`, `node_modules`, and `jsdom` are **dev/test only** and must never be referenced by shipped code. Do not add a bundler, transpiler, or `import`/`require` to any `assets/*.js`.
- **No external network calls from the app.** The offline/privacy promise is the product. No `fetch`, XHR, dynamic `import()`, CDN `<script>`, or analytics in app code. The only sanctioned external call is the Lemon Squeezy license activation in `assets/license.js`.
- **Respect the script load order / cross-`window.*` resolution chain.** There are no ES modules. Each page's `<script>` sequence *is* the dependency graph: `version.js` first (the SW also imports it) → `crashlog.js` → `i18n-*.js` → `app.js` → `db.js` → other deps → the page module. Modules communicate only through globals: `App.*` (app.js), `PortfolioDB.*` (db.js, the sole IndexedDB choke-point), `BackupManager.*` (backup.js), `Snippets.*` / `SNIPPETS_SEED` / `I18N`. A module placed before what it depends on throws a `ReferenceError` at boot.
- **Never use `innerHTML` for user data or i18n strings.** Use `textContent` / `.value` and `createElement`. Setting `innerHTML` from a translated key or client data is an XSS hole and reverses a deliberate mitigation.
- **The service worker never touches IndexedDB.** `sw.js` manages only the HTTP/cache layer; all client data lives in IndexedDB and is independent of SW installs/updates. Keep the two strictly separated.
- **Keep `PRECACHE_URLS` accurate and mind the pre-commit SW-bump gotcha.** When you add/rename a precached file, update `PRECACHE_URLS`. The cache name auto-derives from `INTEGRITY_TOKEN`; the hook skips its bump when `sw.js` is in the diff, so a precache edit may need a manual follow-up commit.
- **No secrets in client code.** All assets are served publicly. `STORE_ID` / `PRODUCT_ID` are public IDs; the only secret value is the user-provided license key, validated at runtime and kept in `localStorage`.

## Troubleshoot / get help

- **"My fix did nothing after deploy."** Almost always a **stale service-worker cache**, not the fix. A hard refresh does not bypass the SW. Confirm the new build token is live, verify the changed file is in `PRECACHE_URLS`, and check Cloudflare's Browser Cache TTL. On an installed PWA, you may need to close all tabs/instances so the SW can activate the new version. (Background: `memory/reference-pwa-sw-cache-updates.md`.)
- **Backup encrypt/decrypt fails locally.** You are probably on `file://`. Serve over `localhost` (Web Crypto needs a secure context).
- **`ReferenceError: App is not defined` (or PortfolioDB / Snippets / I18N).** A `<script>` is loaded out of order or missing on that page — check the load-order chain above.
- **A recipe here doesn't match the code.** Trust the live file, fix the recipe. Every recipe is anchored to a specific file; re-verify against it.

## Deeper architecture

This README is intentionally operational. For deeper background, see the codebase maps (kept in `.planning/codebase/`, not duplicated here so they cannot drift out of sync):

- `.planning/codebase/ARCHITECTURE.md` — module responsibilities, architectural constraints, anti-patterns
- `.planning/codebase/STRUCTURE.md` — full directory layout and "where to add new code"
- `.planning/codebase/CONVENTIONS.md` — naming, comment, and IIFE-module conventions
- `.planning/codebase/TESTING.md` — the test runner and suite layout

## License

Proprietary. Single-user license sold via [Sessions Garden](https://sessionsgarden.app).
