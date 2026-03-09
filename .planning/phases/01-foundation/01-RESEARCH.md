# Phase 1: Foundation - Research

**Researched:** 2026-03-09
**Domain:** CSS design tokens, self-hosted web fonts, IndexedDB migration infrastructure, browser storage persistence, backup reminder UX
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Design Tokens - Architecture:**
- Separate file `assets/tokens.css` loaded first on every page (before app.css)
- Two-tier architecture: primitives (raw values) + semantic tokens (meaning)
- Phase 1 covers colors only — typography and spacing added in Phase 2 as needed
- Variable names in plain English: `--color-primary`, `--color-background`, `--color-surface`, `--color-text`, etc.
- Raw token names: `--color-green-700`, `--color-cream-100`, etc.
- Dark mode implemented via `data-theme="dark"` attribute on `<html>` element

**Design Tokens - Conversion Scope:**
- All existing colors in `assets/app.css` replaced with token references
- Phase 2 adds real garden values (cream, garden green, orange) — this phase only removes hardcoded colors

**Fonts - Self-hosting:**
- Download Rubik (WOFF2) and store locally in `assets/fonts/`
- Nunito: Claude decides based on what exists in code — if Phase 2 replaces with Rubik only, no point downloading Nunito
- Google Fonts CDN link removed from all HTML files
- Fallback stack: `Rubik, system-ui, sans-serif`

**Backup Reminder - UX:**
- Style: non-blocking banner at top of page — appears immediately on app open, stays until addressed
- Snooze: two options — "tomorrow" (24 hours) and "1 week" (7 days)
- Trigger: 7 days since last use of export, stored in localStorage
- Banner buttons: "Back up now" (triggers export action) | "Postpone to tomorrow" | "Postpone 1 week" | X (close without snooze — edge case)

**IndexedDB Migration - Infrastructure:**
- Migration handler that upgrades through multiple versions sequentially (v1→v2→v3, etc.)
- When DB is blocked (two tabs open simultaneously): clear message to user "Close other tabs to continue"
- When upgrading versions: migration runs silently in background (if successful)
- When migration fails: clear error message + "Refresh page" button
- No DB reset UI — Claude will not add this unless there is absolute clarity

### Claude's Discretion
- Choosing temporary color values for tokens in this phase (Phase 2 will replace them anyway)
- Defining what resets the backup reminder timer (export action)
- Handling hard migration errors (recovery strategy)
- Whether to download Nunito or not (based on code usage)
- Format of the message when DB is blocked

### Deferred Ideas (OUT OF SCOPE)
None — the discussion stayed within Phase 1 boundaries.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FOUND-01 | CSS design token system with two-tier architecture (primitives + semantic tokens) replacing hardcoded colors | CSS custom properties, two-tier naming conventions, dark mode via data-theme attribute |
| FOUND-02 | Self-hosted Rubik font (WOFF2) eliminating Google Fonts CDN dependency | Google Fonts download workflow, @font-face declarations, WOFF2 format details |
| FOUND-03 | IndexedDB migration infrastructure with version upgrade handlers, onblocked/onversionchange support | IndexedDB onupgradeneeded sequential migration pattern, blocking behavior, error recovery |
| FOUND-04 | Backup reminder system — weekly prompt with snooze, persistent across sessions | localStorage timestamp pattern, non-blocking banner, navigator.storage.persist() on first load |
</phase_requirements>

---

## Summary

This phase establishes four foundational infrastructure pieces that all subsequent phases depend on. None of them change visible appearance (that is Phase 2's job), but all of them are either required for Phase 2 to work correctly (design tokens, fonts) or address data-safety risks that cannot be deferred (migration infrastructure, backup reminder).

The codebase is a vanilla HTML/CSS/JS app with zero dependencies. All four requirements are implementable with standard browser APIs and zero new libraries. The primary risk areas are: (1) IndexedDB's `onupgradeneeded`/`onblocked` event model requires careful sequential logic; (2) the Google Fonts CDN import is in `app.css` via `@import`, not in HTML `<link>` tags — a subtlety that affects where the fix is applied; (3) the backup reminder needs to integrate cleanly with the existing `exportData()` function in `overview.js` without coupling pages together.

**Primary recommendation:** Implement all four requirements as independent, additive changes. `tokens.css` and font self-hosting are the simplest and should be done first to unblock Phase 2 planning. Migration infrastructure is the most complex and should be approached as a wrapper around the existing `openDB()` function. The backup reminder is the highest data-safety priority and should be wired to `localStorage` timestamps independently of page-specific JS.

---

## Standard Stack

### Core (all browser-native, zero dependencies)

| Capability | API / Feature | Version / Support | Why Standard |
|------------|--------------|-------------------|--------------|
| Design tokens | CSS Custom Properties (`--var`) | All modern browsers, baseline 2017 | Native, no tooling needed, cascade-aware |
| Dark mode theming | `[data-theme="dark"]` on `<html>` | All browsers | Explicit toggle vs system preference; allows user control |
| Self-hosted fonts | `@font-face` with `local()` + `url()` | All browsers | Standard web font loading, WOFF2 is the correct format |
| Font format | WOFF2 | Chrome 36+, Firefox 39+, Safari 12+, Edge 14+ | Smallest file size (~30% smaller than WOFF), universal modern support |
| IndexedDB migrations | `onupgradeneeded` with `event.oldVersion` | All modern browsers | The only correct way to do IndexedDB schema migrations |
| DB blocking | `onblocked` + `onversionchange` | All browsers | Standard IndexedDB multi-tab coordination |
| Persistent storage | `navigator.storage.persist()` | Chrome 52+, Firefox 55+, Safari 15.2+ | Requests exemption from storage eviction; returns a Promise<boolean> |
| Backup timer | `localStorage` with timestamp | All browsers | Already in use in this codebase for language preference |

### Font Download Source

Google Fonts provides a download page at fonts.google.com. For Rubik, the needed weights are 400, 600, 700 (matching the current CDN request). The WOFF2 files can be downloaded directly or via the `google-webfonts-helper` tool at `gwfh.mranftl.com` which provides ready-to-use `@font-face` CSS snippets with WOFF2 + WOFF fallbacks.

**Nunito decision:** Nunito is used as the default body font for non-RTL languages (`font-family: "Nunito", "Avenir", "Trebuchet MS", sans-serif`). Since Phase 2 will replace the entire font stack with Rubik only, downloading Nunito would be wasted work. Recommendation: do NOT self-host Nunito. Phase 1 should replace the default `font-family` with `Rubik, system-ui, sans-serif` immediately, removing Nunito references entirely. This aligns with the CONTEXT.md decision and avoids a throwaway download.

---

## Architecture Patterns

### Recommended File Structure Changes

```
assets/
├── tokens.css          # NEW — loaded first, before app.css
├── app.css             # MODIFIED — @import removed, hardcoded colors replaced
├── fonts/              # NEW directory
│   ├── Rubik-Regular.woff2      # weight 400
│   ├── Rubik-SemiBold.woff2     # weight 600
│   └── Rubik-Bold.woff2         # weight 700
├── db.js               # MODIFIED — migration wrapper added
└── app.js              # MODIFIED — backup reminder logic added
```

All 5 HTML files: add `<link rel="stylesheet" href="./assets/tokens.css">` before existing `app.css` link.

### Pattern 1: Two-Tier CSS Token Architecture

**What:** Primitive tokens hold raw values; semantic tokens reference primitives by meaning.

**When to use:** Always. Semantic tokens are what app code uses. Primitive tokens are only referenced by semantic tokens.

**Structure:**

```css
/* assets/tokens.css */

/* === PRIMITIVE TOKENS === */
/* Raw values — never used directly in app CSS */
:root {
  --color-purple-600: #7c66ff;
  --color-purple-50: #efeafe;
  --color-cream-50: #f6f3fb;
  --color-white: #ffffff;
  --color-dark-900: #2f2d38;
  --color-dark-600: #5f5c72;
  --color-green-500: #2fb37d;
  --color-red-500: #ea4b4b;
  --color-pink-600: #e83d6d;
}

/* === SEMANTIC TOKENS (light mode default) === */
:root {
  --color-primary: var(--color-purple-600);
  --color-primary-soft: var(--color-purple-50);
  --color-background: var(--color-cream-50);
  --color-surface: var(--color-white);
  --color-text: var(--color-dark-900);
  --color-text-muted: var(--color-dark-600);
  --color-success: var(--color-green-500);
  --color-danger: var(--color-red-500);
  --color-heart: var(--color-pink-600);
  /* Shadow tokens use current light-mode primitives */
  --shadow-soft: 0 18px 40px rgba(36, 24, 72, 0.08);
  --shadow-card: 0 12px 26px rgba(36, 24, 72, 0.1);
}

/* === DARK MODE === */
[data-theme="dark"] {
  --color-background: #1a1825;
  --color-surface: #252235;
  --color-text: #f0eeff;
  --color-text-muted: #a8a0c8;
  --color-primary: #9b88ff;
  --color-primary-soft: #2e2850;
  --shadow-soft: 0 18px 40px rgba(0, 0, 0, 0.3);
  --shadow-card: 0 12px 26px rgba(0, 0, 0, 0.35);
}
```

**Note:** The dark mode color values above are Phase 1 placeholders. Phase 2 will replace ALL values (both light and dark) with the garden theme palette. The architecture is what matters here, not the specific colors.

**Migration of app.css:** Replace existing `:root` variables with semantic token references:
- `--page-bg` → becomes `--color-background` in tokens.css; `app.css` uses `var(--color-background)`
- `--card-bg` → `--color-surface`
- `--text-main` → `--color-text`
- `--text-muted` → `--color-text-muted`
- `--accent` → `--color-primary`
- `--accent-soft` → `--color-primary-soft`
- `--success` → `--color-success`
- `--danger` → `--color-danger`
- `--shadow-soft`, `--shadow-card` → move to tokens.css

All hardcoded hex/rgba colors throughout `app.css` (not in `:root`) must also be tokenized or replaced with token references. A full audit is required — there are approximately 25 hardcoded color values in the existing CSS outside the `:root` block.

### Pattern 2: Self-Hosted Font Loading

**What:** Replace the CDN `@import` at line 1 of `app.css` with `@font-face` declarations pointing to local WOFF2 files.

```css
/* In tokens.css or at the top of app.css, replacing the @import line */
@font-face {
  font-family: 'Rubik';
  src: url('./fonts/Rubik-Regular.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Rubik';
  src: url('./fonts/Rubik-SemiBold.woff2') format('woff2');
  font-weight: 600;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Rubik';
  src: url('./fonts/Rubik-Bold.woff2') format('woff2');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}
```

**`font-display: swap`** is correct here — it shows fallback text immediately and swaps when Rubik loads. For a local file this swap happens near-instantly.

**font-family references in app.css:** Replace both existing `font-family` declarations:
- `"Nunito", "Avenir", "Trebuchet MS", sans-serif` → `Rubik, system-ui, sans-serif`
- `"Rubik", "Noto Sans Hebrew", sans-serif` → `Rubik, system-ui, sans-serif`

The RTL-specific font override is no longer needed because Rubik supports Latin and Hebrew characters.

**Where to place `@font-face` declarations:** In `tokens.css`, before the primitive token block. This keeps the font loading centralized in the file that loads first.

### Pattern 3: IndexedDB Sequential Migration

**What:** Restructure `openDB()` in `db.js` to handle sequential version upgrades, plus `onblocked` and `onversionchange` events.

**How IndexedDB upgrade versions work:**
- `event.oldVersion` = version currently in the user's browser (0 if fresh install)
- `event.newVersion` = the `DB_VERSION` constant in code
- The handler must apply ALL migrations from `oldVersion` to `newVersion` in order
- If a user skips from v1 to v3, the handler runs v1→v2 AND v2→v3 sequentially

```javascript
// In assets/db.js

const DB_NAME = "emotion_code_portfolio";
const DB_VERSION = 1; // Increment this when schema changes

// Migration functions indexed by target version
// Each function receives (db, transaction) — transaction allows data migration
const MIGRATIONS = {
  1: function initializeSchema(db) {
    // Original v1 schema — only runs on fresh installs (oldVersion === 0)
    if (!db.objectStoreNames.contains("clients")) {
      const store = db.createObjectStore("clients", { keyPath: "id", autoIncrement: true });
      store.createIndex("name", "name", { unique: false });
    }
    if (!db.objectStoreNames.contains("sessions")) {
      const store = db.createObjectStore("sessions", { keyPath: "id", autoIncrement: true });
      store.createIndex("clientId", "clientId", { unique: false });
      store.createIndex("date", "date", { unique: false });
    }
  },
  // Future versions added here:
  // 2: function addReferralSource(db, transaction) { ... },
  // 3: function expandClientTypes(db, transaction) { ... },
};

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      const transaction = event.target.transaction;
      const oldVersion = event.oldVersion;
      const newVersion = event.newVersion;

      // Run each migration sequentially from oldVersion+1 to newVersion
      for (let v = oldVersion + 1; v <= newVersion; v++) {
        if (MIGRATIONS[v]) {
          MIGRATIONS[v](db, transaction);
        }
      }
    };

    request.onblocked = () => {
      // Another tab has this DB open at an older version
      showDBBlockedMessage();
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      // Listen for version changes triggered by another tab upgrading
      db.onversionchange = () => {
        db.close();
        showDBVersionChangedMessage();
      };
      resolve(db);
    };

    request.onerror = () => reject(request.error);
  });
}
```

**`showDBBlockedMessage()` and `showDBVersionChangedMessage()`** are new functions that display messages using the existing `App.showToast()` or a dedicated banner. Given the context decisions, the blocked message should say "Close other tabs to continue" and the version change message should say "A newer version of this page is open — please refresh."

**Key implementation detail:** The current `db.js` calls `openDB()` on every database operation (connection per operation). This is fine for correctness but means `onblocked` fires on every operation attempt when another tab is blocking. The `onversionchange` handler only fires on connections that are already open. Both behaviors are correct with the current pattern.

### Pattern 4: Backup Reminder System

**What:** On each page load, check if 7+ days have passed since the last export. If yes, show a non-blocking banner. Store timestamps in localStorage.

**localStorage keys (new):**
- `portfolioLastExport` — ISO timestamp of last successful export
- `portfolioBackupSnoozedUntil` — ISO timestamp; if Date.now() < this value, the banner is suppressed

**Integration point:** The banner logic runs in `App.initCommon()` (called by every page) or as a standalone function called at the end of `initCommon()`. The "Back up now" button must trigger `exportData()` from `overview.js`. The cleanest pattern is to dispatch a custom event: the banner dispatches `app:requestExport`, and `overview.js` listens for it on pages where `exportData()` is available. On other pages, the button redirects to `index.html` where the export is available.

**Banner HTML structure:**

```html
<!-- Injected into DOM by JS, at top of .app-shell -->
<div id="backupBanner" class="backup-banner" role="alert" aria-live="polite">
  <span class="backup-banner-message" data-i18n="backup.message"></span>
  <div class="backup-banner-actions">
    <button class="button backup-banner-export" data-i18n="backup.exportNow"></button>
    <button class="button ghost backup-banner-tomorrow" data-i18n="backup.tomorrow"></button>
    <button class="button ghost backup-banner-week" data-i18n="backup.week"></button>
    <button class="backup-banner-close" aria-label="Close" data-i18n-aria="backup.close">✕</button>
  </div>
</div>
```

**Timer reset logic:**
- When export is performed (via `downloadJSON()`): set `portfolioLastExport = Date.now()`
- "Tomorrow" snooze: set `portfolioBackupSnoozedUntil = Date.now() + 86400000`
- "1 week" snooze: set `portfolioBackupSnoozedUntil = Date.now() + 604800000`
- X close (no snooze): hide banner for this page load only — do not update localStorage

**`navigator.storage.persist()` call:**
Call this once on first app load. The result (granted/denied) can be stored in localStorage so it is not re-requested every time. This is a "fire and forget" enhancement — if denied or unsupported, the app works normally.

```javascript
async function requestPersistentStorage() {
  const alreadyRequested = localStorage.getItem('portfolioStoragePersistRequested');
  if (alreadyRequested) return;
  if (navigator.storage && navigator.storage.persist) {
    await navigator.storage.persist();
    localStorage.setItem('portfolioStoragePersistRequested', 'true');
  }
}
```

This runs once in `App.initCommon()` on first page load.

### Anti-Patterns to Avoid

- **Using `:root [data-theme="dark"]`** (space between `:root` and `[data-theme]`): This selects descendants of `:root` with that attribute, not `:root` itself. Use `[data-theme="dark"]` directly (no `:root` prefix) or `html[data-theme="dark"]`.
- **Hardcoded colors in box-shadow values**: `box-shadow: 0 12px 22px rgba(124, 102, 255, 0.28)` — the `rgba` here is a hardcoded primary color. These must become token references too. The current `app.css` has at least 6 such shadow values with hardcoded brand colors.
- **Using `@import` in `tokens.css`**: Do not use `@import url()` inside `tokens.css` — it causes an extra render-blocking request. Use `@font-face` directly in `tokens.css` or in `app.css`.
- **Calling `openDB()` from within `onupgradeneeded`**: Never open a new connection inside the upgrade handler — it will be blocked by the ongoing upgrade.
- **Setting `portfolioLastExport` at export button click**: Set it only after `downloadJSON()` successfully completes (i.e., after the Blob URL is created and the download is triggered), not at button press.
- **Two-tab blocking during version 1**: Since DB_VERSION is staying at 1 in Phase 1, `onblocked` will never fire from a version upgrade. However, implementing `onblocked` now is correct infrastructure work — it will be needed in Phase 3 when DATA fields are added.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Font format conversion | Converting TTF/OTF to WOFF2 manually | Download WOFF2 directly from Google Fonts or gwfh.mranftl.com | WOFF2 files are available pre-built; conversion tools introduce potential quality issues |
| CSS variable tooling | A JS preprocessor for design tokens | Native CSS custom properties | Browser-native, zero build step, cascade-aware, works with existing tooling |
| IndexedDB migration library | Custom migration runner | Vanilla sequential migration in `onupgradeneeded` | The codebase has zero dependencies; the pattern is 20 lines of vanilla JS; Dexie.js would be overkill and incompatible with the no-npm constraint |
| Storage quota monitoring | Custom quota checker | `navigator.storage.estimate()` if needed | But YAGNI — `navigator.storage.persist()` is sufficient for Phase 1 |
| Banner animation library | Custom CSS animation | Simple CSS `transition` on `max-height` or `transform` | Already used throughout app.css; consistent with existing patterns |

**Key insight:** This is a zero-dependency vanilla JS app. Every "don't hand-roll" item above already has a browser-native solution. The risk is over-engineering: adding libraries, build steps, or elaborate abstractions where 20 lines of plain JS would do.

---

## Common Pitfalls

### Pitfall 1: Google Fonts CDN Is in app.css, Not HTML

**What goes wrong:** Developer looks for `<link>` tags in HTML files expecting to find the Google Fonts reference. It is not there — it is a CSS `@import` on line 1 of `assets/app.css`.

**Why it happens:** The app was built this way from the start. All 5 HTML files only have a single `<link>` to `app.css`.

**How to avoid:** Remove the `@import url("https://fonts.googleapis.com/css2?...")` line from `app.css`. Replace it (or add to `tokens.css`) with `@font-face` declarations. Do not look for it in HTML.

**Warning signs:** If fonts stop loading after the change, check that the WOFF2 file paths in `@font-face` are correct relative to the CSS file location (`assets/fonts/` relative to `assets/app.css` = `./fonts/Rubik-Regular.woff2`).

### Pitfall 2: Dark Mode Selector Syntax

**What goes wrong:** Writing `[data-theme="dark"] :root { }` or `.dark :root { }` instead of `[data-theme="dark"] { }` directly on the `:root` element.

**Why it happens:** Unfamiliarity with CSS specificity for attribute selectors on the root element.

**How to avoid:** The `data-theme="dark"` attribute is placed on `<html>`. The dark mode override block is `html[data-theme="dark"] { }` or simply `[data-theme="dark"] { }`. Both work; the latter has lower specificity and is sufficient here.

### Pitfall 3: Hardcoded Colors Scattered Throughout app.css

**What goes wrong:** Replacing only the `:root` variables and declaring "done" — but app.css has ~25 hardcoded hex/rgba values OUTSIDE the `:root` block (in rules like `.session-item`, `.sessions-table tbody tr:nth-child(even)`, `.issue-line`, `.client-spotlight-placeholder`, etc.).

**Why it happens:** The audit step gets skipped.

**How to avoid:** Grep `app.css` for `#[0-9a-fA-F]` and `rgba(` before finishing. Count should be near zero after tokenization. Any remaining colors that don't have a semantic meaning should either get a new token or use an existing token.

**Known hardcoded colors in app.css (outside :root):**
- `#faf8ff` — background gradient start color (body radial-gradient)
- `#f2effb` — background gradient end color
- `rgba(86, 78, 120, 0.2)` — border color (appears ~8 times)
- `rgba(86, 78, 120, 0.1)` and `rgba(86, 78, 120, 0.08)` — subtle borders/backgrounds
- `#f7f4ff` — session item background
- `#3a3452` — session meta text
- `rgba(124, 102, 255, 0.35)` — brand-mark shadow
- `rgba(124, 102, 255, 0.28)` — button shadow
- `rgba(234, 75, 75, 0.28)` — danger button shadow
- `#4a4166` — dark purple (used in multiple components)
- `#f3efff` — secondary button background
- `#f8f6ff` — toggle card background
- `#efeafe` — toggle card active / issue-line background (same as --accent-soft but hardcoded)
- `#ede8ff` — client spotlight media background
- `linear-gradient(135deg, #8b7cff, #c6b9ff)` — placeholder gradient
- `rgba(26, 24, 35, 0.4)` — modal overlay
- `rgba(36, 24, 72, 0.2)` — modal card shadow
- `#f5f2ff` — issue summary readonly background
- `#fbf9ff` — table even row background
- `rgba(86, 78, 120, 0.12)` — section divider / issue-block border
- `rgba(86, 78, 120, 0.25)` — ghost button border
- `#2e2a38` — toast background
- `#f3f0ff` — modal-close and issue-remove background
- `#f0ecff` — client avatar background
- `#e6defc` — issue-remove hover
- `#f9f7ff` — disabled input background

These should all become token references. Some are variants of the primary purple already in `:root`; others need new tokens.

### Pitfall 4: IndexedDB onblocked Never Fires for Same-Version Tabs

**What goes wrong:** Implementing `onblocked` and being confused when it never fires during testing.

**Why it happens:** `onblocked` only fires when the requested DB_VERSION is higher than what another open connection has. If all tabs are using the same version, no upgrade is triggered and `onblocked` is never called.

**How to avoid:** This is expected behavior. The handler is correct but can only be tested by: (1) opening two tabs, (2) bumping DB_VERSION in code, (3) reloading one tab. Since Phase 1 keeps DB_VERSION at 1, this test is only possible manually. The infrastructure is still correct to implement now.

### Pitfall 5: localStorage Key Collision

**What goes wrong:** Backup reminder keys collide with existing localStorage usage.

**Why it happens:** The app already uses `portfolioLang` — a new key without the `portfolio` prefix might collide with other browser extensions or sites.

**How to avoid:** Use the established `portfolio` prefix: `portfolioLastExport`, `portfolioBackupSnoozedUntil`, `portfolioStoragePersistRequested`.

### Pitfall 6: navigator.storage.persist() Must Be Called in User Gesture Context (Safari)

**What goes wrong:** `navigator.storage.persist()` may be silently denied if called outside a user gesture on some browsers (particularly Safari).

**Why it happens:** Some browsers treat the persistent storage prompt as a permission request that requires user interaction.

**How to avoid:** Call it from within the first user interaction if possible, or accept that it may be auto-denied on Safari. The behavior is: Chrome usually grants it for installed PWAs or frequently visited sites; Firefox shows a permission prompt; Safari is the most restrictive. Log the result but do not block the user experience on the outcome.

---

## Code Examples

### Complete @font-face Block for Rubik

```css
/* Source: Google Fonts download + standard @font-face pattern */
/* Relative path from assets/tokens.css to assets/fonts/ */

@font-face {
  font-family: 'Rubik';
  src: url('./fonts/Rubik-Regular.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Rubik';
  src: url('./fonts/Rubik-SemiBold.woff2') format('woff2');
  font-weight: 600;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Rubik';
  src: url('./fonts/Rubik-Bold.woff2') format('woff2');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}
```

### HTML Link Order (all 5 pages)

```html
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Emotion Code Portfolio</title>
  <!-- tokens.css FIRST — defines all variables before app.css uses them -->
  <link rel="stylesheet" href="./assets/tokens.css" />
  <link rel="stylesheet" href="./assets/app.css" />
</head>
```

### Sequential Migration Pattern

```javascript
// Source: MDN IndexedDB Using_IndexedDB + standard sequential migration pattern
request.onupgradeneeded = (event) => {
  const db = event.target.result;
  const transaction = event.target.transaction;
  const oldVersion = event.oldVersion; // 0 for brand-new installs
  const newVersion = event.newVersion;

  for (let v = oldVersion + 1; v <= newVersion; v++) {
    if (MIGRATIONS[v]) {
      MIGRATIONS[v](db, transaction);
    }
  }
};
```

### Backup Reminder Check (runs in initCommon)

```javascript
function checkBackupReminder() {
  const snoozedUntil = localStorage.getItem('portfolioBackupSnoozedUntil');
  if (snoozedUntil && Date.now() < Number(snoozedUntil)) return;

  const lastExport = localStorage.getItem('portfolioLastExport');
  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  if (!lastExport || Date.now() - Number(lastExport) > sevenDays) {
    showBackupBanner();
  }
}
```

### navigator.storage.persist() Call

```javascript
// Source: MDN Storage API — StorageManager.persist()
async function requestPersistentStorage() {
  if (localStorage.getItem('portfolioStoragePersistRequested')) return;
  if (!navigator.storage || !navigator.storage.persist) return;
  await navigator.storage.persist(); // returns boolean — granted or not
  localStorage.setItem('portfolioStoragePersistRequested', 'true');
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact for This Phase |
|--------------|-----------------|--------------|----------------------|
| Google Fonts CDN `@import` | Self-hosted WOFF2 with `@font-face` | Standard practice since ~2020 (GDPR concerns + offline requirements) | Remove CDN import, add local @font-face |
| Hardcoded CSS color values | CSS Custom Properties (design tokens) | Widely adopted 2017-2020 | Entire app.css color audit required |
| Single `:root` color block | Two-tier token architecture (primitives + semantic) | Industry best practice ~2019-2022 | New file structure, new naming conventions |
| No IndexedDB migration strategy | Sequential migration via `event.oldVersion` loop | IndexedDB spec has always supported this; widely documented | Wrapper around existing `openDB()` |
| No backup reminder | localStorage timestamp + non-blocking banner | UX pattern for data-safety prompts | New feature, integrates with existing export function |

**Deprecated/outdated in this codebase:**
- `@import url("https://fonts.googleapis.com/...")` in CSS: Google Fonts CDN, breaks offline, makes external network call
- `"Nunito"` font family: will be fully replaced by Rubik in Phase 2; Phase 1 removes it from app.css immediately
- Hardcoded CSS variable names (`--page-bg`, `--card-bg`, `--text-main`, `--accent`): to be replaced by semantic token names in `tokens.css`

---

## Open Questions

1. **Where exactly to call `showBackupBanner()` relative to page-specific JS initialization**
   - What we know: `App.initCommon()` is called first in every page's `DOMContentLoaded` handler
   - What's unclear: Should the banner logic check if `exportData()` is available (overview page only) or redirect to index.html on other pages?
   - Recommendation: The "Back up now" button dispatches `app:requestExport` custom event. `overview.js` listens and calls `exportData()`. On pages where overview.js is not loaded, the button either links to `index.html` or calls a shared export function moved to `app.js`. Moving `exportData()` + `downloadJSON()` to `app.js` is cleaner and available everywhere.

2. **WOFF2 file naming convention from Google Fonts download**
   - What we know: Google Fonts download provides files; exact names vary
   - What's unclear: Will downloaded files have the variable font format or individual weight files?
   - Recommendation: Use `gwfh.mranftl.com` (Google Web Fonts Helper) which provides individual WOFF2 files per weight with consistent naming. Download Rubik weights 400, 600, 700 and place as `Rubik-Regular.woff2`, `Rubik-SemiBold.woff2`, `Rubik-Bold.woff2`.

3. **Whether to keep the existing CSS variable names as aliases in tokens.css**
   - What we know: `app.css` uses `--page-bg`, `--card-bg`, `--accent`, etc.
   - What's unclear: Rename to `--color-background`, `--color-primary` immediately (cleaner, as decided), or keep old names as aliases temporarily?
   - Recommendation: Rename immediately. Phase 1 is the right time — there is no external code depending on these variable names, and Phase 2 will rework everything anyway. Search-and-replace in app.css is mechanical work.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None currently installed |
| Config file | None — Wave 0 must create infrastructure |
| Quick run command | Manual browser verification (no test runner) |
| Full suite command | Manual browser verification |

**Note:** FOUND-05 (Playwright test suite) is assigned to Phase 6, not Phase 1. Phase 1 validation is manual browser verification per success criteria. Wave 0 for this phase has no test file gaps to fill for automated tests.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Notes |
|--------|----------|-----------|-------------------|-------|
| FOUND-01 | No hardcoded color values remain in CSS | manual | grep for `#[0-9a-fA-F]` and `rgba(` in app.css | Can be scripted as a grep check |
| FOUND-01 | All color values reference CSS variables | manual | Visual inspection across all 5 pages | - |
| FOUND-01 | Dark mode toggles correctly via `data-theme="dark"` | manual | Set attribute in devtools, verify appearance | - |
| FOUND-02 | Rubik loads from local WOFF2, no network requests | manual | Network tab in devtools — 0 external font requests | - |
| FOUND-02 | Font renders correctly in both LTR and RTL | manual | Switch to Hebrew, verify Rubik renders | - |
| FOUND-03 | DB opens successfully on fresh install | manual | Clear IndexedDB in devtools, reload | - |
| FOUND-03 | Migration runs correctly v1→v1 (same version) | manual | Reload page, check console for errors | - |
| FOUND-03 | `onblocked` message appears on second tab | manual | Open two tabs, bump DB_VERSION in devtools override | Manual only |
| FOUND-04 | Banner appears after 7 days without export | manual | Set `portfolioLastExport` to 8 days ago in localStorage | - |
| FOUND-04 | Snooze "tomorrow" suppresses banner for 24h | manual | Trigger banner, click tomorrow, verify localStorage | - |
| FOUND-04 | Snooze "1 week" suppresses banner for 7 days | manual | Trigger banner, click week, verify localStorage | - |
| FOUND-04 | "Back up now" triggers export and resets timer | manual | Click button, verify download + localStorage update | - |
| FOUND-04 | `navigator.storage.persist()` called on first load | manual | Check `portfolioStoragePersistRequested` in localStorage | - |

### Grep-Based Verification Commands

These can be run after implementation to verify FOUND-01:

```bash
# Should return 0 hardcoded hex colors in app.css after tokenization
grep -c '#[0-9a-fA-F]\{3,6\}' assets/app.css

# Should return 0 hardcoded rgba colors in app.css
grep -c 'rgba(' assets/app.css

# Should return 0 Google Fonts references anywhere in assets/
grep -r 'fonts.googleapis.com' assets/
```

### Wave 0 Gaps

- [ ] No automated test runner — all verification is manual or grep-based
- [ ] No Playwright setup — this is deferred to Phase 6 (FOUND-05)

*No Wave 0 automated test files needed for this phase. All verification is manual browser + devtools inspection.*

---

## Sources

### Primary (HIGH confidence)
- MDN Web Docs: [CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties) — design token patterns, cascade behavior
- MDN Web Docs: [IndexedDB API — onupgradeneeded](https://developer.mozilla.org/en-US/docs/Web/API/IDBOpenDBRequest/onupgradeneeded) — migration handler spec
- MDN Web Docs: [IDBVersionChangeEvent](https://developer.mozilla.org/en-US/docs/Web/API/IDBVersionChangeEvent) — oldVersion/newVersion properties
- MDN Web Docs: [StorageManager.persist()](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist) — persistent storage API
- MDN Web Docs: [font-display](https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/font-display) — WOFF2 loading behavior
- Existing project research: `.planning/research/PITFALLS.md` — IndexedDB migration, multi-tab blocking, font offline issues (HIGH confidence, project-specific)

### Secondary (MEDIUM confidence)
- Google Web Fonts Helper (`gwfh.mranftl.com`) — WOFF2 download tool, consistent file naming
- `.planning/research/03-architecture.md` — Codebase analysis confirming current state (project-specific)

### Tertiary (LOW confidence — noted but not relied upon)
- General CSS design token naming conventions — influenced by W3C Color Level 5 naming patterns and open-source design systems (Radix, Material) but applied to this codebase specifically

---

## Metadata

**Confidence breakdown:**
- Standard stack (CSS custom properties, @font-face, IndexedDB): HIGH — all browser-native APIs, well-documented on MDN
- Architecture patterns (two-tier tokens, sequential migration): HIGH — well-established patterns verified against MDN and codebase analysis
- Hardcoded color audit: HIGH — directly verified by reading app.css
- Pitfalls: HIGH — confirmed by reading actual codebase files
- Backup reminder UX pattern: MEDIUM — implementation approach is clear; exact multi-page export wiring needs decision (see Open Questions)

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (stable APIs; 30-day validity)
