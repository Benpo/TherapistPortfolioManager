# Phase 19: Go-Live Preparation - Research

**Researched:** 2026-03-24
**Domain:** Legal compliance (German Impressum), Web Crypto encryption, GitHub Actions CI/CD, Cloudflare Pages deployment, client-side license hardening
**Confidence:** HIGH (legal sections MEDIUM — requires lawyer review post-launch)

## Summary

Phase 19 covers six distinct technical domains: German legal page compliance, per-language HTML file architecture, encrypted backup via Web Crypto API, GitHub Actions deployment pipeline to Cloudflare Pages, license gate hardening, and landing page auto-detection UX. The app is a vanilla JS PWA with no build step, no backend, and no new dependencies allowed.

The highest-risk domain is the Impressum content — German law (DDG SS5) mandates specific sections, and the Kleinunternehmer status creates a particular situation where neither USt-IdNr nor Wirtschafts-ID may be available yet (Wirtschafts-ID rollout is phased through 2025-2026). The encrypted backup domain is well-served by the Web Crypto API with established PBKDF2+AES-256-GCM patterns. The deployment pipeline is straightforward — Cloudflare's recommended approach via `wrangler-action` supports direct upload from a prepared directory, which aligns perfectly with the deploy-branch strategy.

**Primary recommendation:** Implement Impressum with all legally required sections (see detailed breakdown below), use PBKDF2 with 310,000 iterations + AES-256-GCM with 96-bit IV for encrypted backups, and use `cloudflare/wrangler-action@v3` with a simple rsync-to-staging-dir step for the GH Action.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01 through D-06:** All three legal pages (Impressum, Datenschutz, Disclaimer) get separate HTML files per language. Naming: `impressum.html` (DE), `impressum-en.html`, `impressum-he.html`, `impressum-cs.html`. Full duplication per file — complete standalone HTML pages. Language switcher navigates between sibling files. Non-German versions get courtesy translation banner. Current single-file pages replaced entirely.
- **D-07 through D-10:** Deploy branch in same repo. GH Action syncs app-only files on push to main. CF Pages watches deploy branch. Specific include/exclude lists defined.
- **D-11, D-12:** License page is context-aware (activated = app nav, non-activated = legal page topbar). Inline i18n stays.
- **D-13, D-14:** License gate hardening — all 5 app pages must check both `portfolioLicenseActivated` AND `portfolioLicenseInstance`.
- **D-15, D-16:** Landing page shows as-is for all users. "Already bought?" link auto-detects active license and redirects to app.
- **D-17:** LIVE-07 requires zero implementation.
- **D-18 through D-22:** Encrypted backup export/import via Web Crypto API (AES-256-GCM, PBKDF2). Custom `.sgbackup` extension. Passphrase not stored. Old `.zip` imports still work.
- **D-23 through D-26:** Security guidance messaging must appear multiple times across user journey. Requires dedicated UX design pass via frontend-design skill.
- **D-28:** LIVE-09 is research task only.

### Claude's Discretion
- GH Action workflow specifics (trigger config, file sync mechanism)
- Cloudflare Pages project setup steps
- Exact AES-256-GCM encryption parameters (salt length, iteration count)
- `.sgbackup` file format details (header structure for version/salt/IV)
- Legal page HTML/CSS structure (following established legal-page pattern)
- Innovator research prompts and backlog format

### Deferred Ideas (OUT OF SCOPE)
- Full IndexedDB encryption with PIN/passphrase — v1.2 milestone
- PWA install guidance + user manual — post-launch
- Browser/device terminology fix across all touchpoints — separate todo
- Staging branch / preview environment for CF Pages
- Periodic license revalidation ping

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LIVE-01 | Impressum legal research for Kleinunternehmer selling PWA software | German Impressum legal requirements section below — DDG SS5 required fields, VSBG wording, Wirtschafts-ID situation |
| LIVE-02 | Per-language legal HTML files (3 pages x 4 languages = 12 files) | Architecture Patterns section — file structure, courtesy banner pattern from SapphireHealing, SW cache updates |
| LIVE-03 | Deploy branch + GitHub Action for CF Pages deployment | Deployment Pipeline section — wrangler-action workflow, rsync approach, file include/exclude |
| LIVE-04 | End-to-end purchase-activate-use flow validation | Manual testing checklist in Common Pitfalls — not automatable, requires real LS checkout |
| LIVE-05 | License page chrome (context-aware navigation) | Architecture Patterns — isLicensed() detection, conditional nav rendering |
| LIVE-06 | Landing page auto-detect + redirect for activated users | Code Examples — localStorage check pattern, redirect with message |
| LIVE-07 | Demo data cleanup | Zero implementation — confirmed separate IndexedDB databases |
| LIVE-08 | Encrypted backup export/import + security guidance messaging | Web Crypto API section — PBKDF2 parameters, AES-GCM code, .sgbackup format, UX design pass needed |
| LIVE-09 | Innovator research for v1.2 backlog | Research-only task, no technical implementation |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Web Crypto API | Built-in | PBKDF2 key derivation + AES-256-GCM encryption | Browser-native, zero dependencies, supported in all target browsers |
| JSZip | 3.10.1 (already in project) | ZIP creation/extraction for backup files | Already used in backup.js — encryption wraps the ZIP blob |
| cloudflare/wrangler-action | v3 | GitHub Action for CF Pages deployment | Official Cloudflare action, replaces deprecated pages-action |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| actions/checkout | v4 | Git checkout in GH Action | Standard for all GH Actions workflows |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Web Crypto API | Stanford JS Crypto Library (sjcl) | Web Crypto is native and faster; sjcl adds a dependency, violating "no new deps" constraint |
| wrangler-action | cloudflare/pages-action | pages-action is DEPRECATED — wrangler-action is the current official path |
| Deploy branch | Direct upload from GH Action | Deploy branch gives CF Pages native git integration (commit SHAs, preview URLs) — direct upload loses this |

**Installation:**
```bash
# No npm install needed — vanilla JS PWA with no build step
# GH Action dependencies are declared in workflow YAML
```

## Architecture Patterns

### Legal Pages File Structure
```
/ (project root)
  impressum.html          # DE (authoritative)
  impressum-en.html       # EN
  impressum-he.html       # HE
  impressum-cs.html       # CS
  datenschutz.html        # DE (authoritative)
  datenschutz-en.html     # EN
  datenschutz-he.html     # HE
  datenschutz-cs.html     # CS
  disclaimer.html         # DE (authoritative)
  disclaimer-en.html      # EN
  disclaimer-he.html      # HE
  disclaimer-cs.html      # CS
```

### Deployment Pipeline Structure
```
.github/
  workflows/
    deploy.yml            # GH Action: main -> deploy branch
/ (deploy branch - auto-managed)
  *.html                  # All HTML files
  assets/                 # Full assets directory
  manifest.json           # PWA manifest
  sw.js                   # Service worker
  _headers                # CF Pages headers config
```

### Pattern 1: Courtesy Translation Banner
**What:** Non-German legal pages display a subtle banner linking to the authoritative German version.
**When to use:** All non-DE legal page files (EN, HE, CS).
**Example:**
```html
<!-- Source: SapphireHealing /src/pages/en/terms.astro lines 9-11 -->
<aside class="courtesy-banner">
  <p>This is a courtesy translation. In case of discrepancies, the
  <a href="./impressum.html">German version</a> is legally binding.</p>
</aside>
```
```css
.courtesy-banner {
  margin-bottom: 2rem;
  padding: 1rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}
```

### Pattern 2: Encrypted Backup File Format (.sgbackup)
**What:** Binary file containing version header + salt + IV + AES-256-GCM ciphertext of the ZIP blob.
**When to use:** All encrypted backup exports.
**Format:**
```
Bytes 0-3:    Magic bytes "SG01" (4 bytes — version identifier)
Bytes 4-19:   Salt (16 bytes — PBKDF2 salt)
Bytes 20-31:  IV (12 bytes — AES-GCM initialization vector)
Bytes 32+:    Ciphertext (AES-256-GCM encrypted ZIP blob, includes 16-byte auth tag appended by Web Crypto)
```
**Why this format:** Simple binary concatenation. No JSON wrapper overhead. Magic bytes enable instant format detection on import (check first 4 bytes before prompting for passphrase). Version byte allows future format evolution.

### Pattern 3: Context-Aware License Page Chrome
**What:** License page renders different navigation depending on activation status.
**When to use:** On license.html page load.
**Example:**
```javascript
// Source: existing isLicensed() in license.js:171-178
if (isLicensed()) {
  // Show app navigation bar (matches index.html, sessions.html, etc.)
  renderAppNav();
} else {
  // Show legal-page topbar (matches impressum.html pattern)
  renderLegalTopbar();
}
```

### Pattern 4: License Gate Hardening
**What:** Inline head scripts on all 5 app pages check both localStorage keys.
**When to use:** index.html, add-client.html, add-session.html, sessions.html, reporting.html.
**Example:**
```html
<script>
  (function(){try{
    if(localStorage.getItem('portfolioTermsAccepted')
       && !localStorage.getItem('portfolioLicenseActivated')
       || (localStorage.getItem('portfolioTermsAccepted')
           && localStorage.getItem('portfolioLicenseActivated')
           && !localStorage.getItem('portfolioLicenseInstance'))){
      window.location.replace('./license.html');
    }
  }catch(e){}})();
</script>
```
**Simplified logic:** If terms accepted but EITHER license flag missing OR instance ID missing, redirect to license page. This matches `isLicensed()` in license.js which checks both keys.

### Anti-Patterns to Avoid
- **Shared HTML template engine for legal pages:** Don't build a template system. 12 standalone files are easier to hand to a lawyer, translate manually, and reason about.
- **Storing passphrase in localStorage:** Never store the encryption passphrase. User must enter it each time they import.
- **Reusing IV with same key:** Each encryption MUST generate a fresh random IV. Web Crypto API makes this easy with `crypto.getRandomValues()`.
- **Using the same GH Action secret for account ID and API token:** These are separate secrets. Account ID is not sensitive but API token is.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Encryption | Custom XOR/cipher | Web Crypto API (PBKDF2 + AES-256-GCM) | Cryptography is notoriously easy to get wrong; Web Crypto is audited, hardware-accelerated |
| ZIP handling | Custom archive format | JSZip (already in project) | ZIP is the standard, JSZip handles compression and cross-platform compat |
| CF Pages deployment | Custom deploy script with rsync/ssh | cloudflare/wrangler-action@v3 | Official action handles auth, upload, and deployment atomicity |
| Impressum content | AI-generated legal text without research | Research-based content following DDG SS5 checklist | Legal text has specific required sections; missing one = up to EUR 50,000 fine |
| Language detection for legal pages | New language detection system | Existing `globe-lang.js` component | Already built and tested across impressum/datenschutz pages |

**Key insight:** This phase is integration-heavy, not invention-heavy. Every component either exists in the browser (Web Crypto), in the project (JSZip, globe-lang.js, legal page CSS), or in the CI/CD ecosystem (wrangler-action). The work is assembly, not creation.

## German Impressum Legal Requirements (LIVE-01)

### Legal Basis
Since May 14, 2024: **DDG SS5** (Digitale-Dienste-Gesetz) replaces the old TMG SS5. Same requirements, new law name. References in Impressum should cite DDG SS5, not TMG SS5.

### Required Sections for Sapir's Kleinunternehmer Situation

**Confidence: MEDIUM** — researched from multiple German legal sources but not verified by a lawyer.

#### 1. Angaben gemaess SS 5 DDG (MANDATORY)
```
Sapir Ben-Porath
Pettenkoferstr. 4E
10247 Berlin
```
Full name + full postal address. PO box is NOT sufficient. Must be a "ladungsfaehige Anschrift" (address where legal process can be served).

#### 2. Kontakt (MANDATORY)
```
E-Mail: contact@sessionsgarden.app
Telefon: +49 178 6858230
```
Email MUST allow direct, unrestricted communication (Munich Regional Court I, 25 Feb 2025 ruling). Auto-replies that only redirect to other contact methods are NOT compliant.

#### 3. Umsatzsteuer-ID / Wirtschafts-ID (SITUATIONAL)
**Current situation for Sapir:**
- No USt-IdNr (Kleinunternehmer, SS19 UStG exempt)
- Wirtschafts-ID: Being rolled out in phases since Nov 2024. Kleinunternehmer were in the first wave. Sapir may or may not have received one yet — check ELSTER account.

**What to put in Impressum:**
- If Wirtschafts-ID received: `Wirtschafts-Identifikationsnummer: DE[number]`
- If not yet received: Omit the section entirely. There is no legal obligation to display a number you have not been assigned. Do NOT display the personal Steuernummer — it is not required and exposes private tax information.
- Once Wirtschafts-ID arrives, it MUST be added promptly.

#### 4. Verbraucherstreitbeilegung / VSBG (MANDATORY for B2C)
SS36 VSBG requires all B2C businesses to state whether they participate in consumer dispute resolution. Standard formulation:

```
Verbraucherstreitbeilegung/Universalschlichtungsstelle

Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren
vor einer Verbraucherschlichtungsstelle teilzunehmen.
```

**Important 2025 change:** The EU Online Dispute Resolution (ODR) platform at ec.europa.eu/consumers/odr is being shut down on July 20, 2025. Do NOT include a link to the ODR platform — it will be dead. Remove any existing ODR links.

#### 5. Haftungsausschluss (RECOMMENDED — standard practice)
Not strictly required by DDG SS5 but universally included in German Impressums. Two standard sections:

**Haftung fuer Inhalte:**
Disclaimer for own content accuracy per SSSS 7-10 DDG (replaces old TMG reference).

**Haftung fuer Links:**
Disclaimer for linked external content. Standard text disclaims responsibility for third-party content while noting obligation to remove known illegal content.

#### 6. Urheberrecht (RECOMMENDED — standard practice)
Copyright notice for content, code, and design. Standard section stating content is protected under German copyright law (Urheberrechtsgesetz).

#### 7. Redaktionell Verantwortlich (OPTIONAL)
Only required if the site publishes journalistic/editorial content. A software product page arguably does not require this. Omit unless adding a blog.

### What the Current Impressum is Missing
The existing `impressum.html` only has sections 1 and 2 (name/address/contact). Missing:
- Wirtschafts-ID (once available)
- Verbraucherstreitbeilegung/VSBG statement
- Haftungsausschluss (Inhalte + Links)
- Urheberrecht

### Key Legal Risk
Fines up to EUR 50,000 for non-compliant Impressum. The VSBG statement is the most commonly missed section and a frequent Abmahnung (cease-and-desist) target.

## Web Crypto API: Encryption Parameters (LIVE-08)

### Recommended Parameters

**Confidence: HIGH** — based on OWASP 2025 guidelines, MDN documentation, and NIST SP800-38D.

| Parameter | Value | Source |
|-----------|-------|--------|
| Key derivation | PBKDF2 | Web Crypto API standard |
| PBKDF2 hash | SHA-256 | OWASP 2025 recommendation |
| PBKDF2 iterations | 310,000 | OWASP Password Storage Cheat Sheet 2025 |
| Salt length | 16 bytes (128 bits) | NIST minimum; sufficient for this use case |
| Encryption algorithm | AES-GCM | Authenticated encryption — integrity + confidentiality |
| Key length | 256 bits | AES-256 |
| IV length | 12 bytes (96 bits) | NIST SP800-38D recommendation for AES-GCM |
| Tag length | 128 bits (default) | Maximum authentication tag, no reason to reduce |

### Why 310,000 iterations (not 600,000)
OWASP 2025 recommends 310,000 for PBKDF2-SHA256. The 600,000 figure applies to PBKDF2-HMAC-SHA256 in password storage contexts where server-side hashing has different performance constraints. For client-side file encryption on a user's device, 310,000 provides good security while keeping derivation time under 200ms on most devices. This is a backup passphrase, not a password hash stored server-side.

### Browser Compatibility

| Browser | Web Crypto Support | PBKDF2 | AES-GCM |
|---------|-------------------|--------|---------|
| Chrome 37+ | Yes | Yes | Yes |
| Firefox 34+ | Yes | Yes | Yes |
| Safari 11+ | Yes | Yes | Yes |
| Edge 79+ | Yes | Yes | Yes |

All target browsers for this PWA support the full Web Crypto API chain. No polyfills needed.

## Deployment Pipeline (LIVE-03, LIVE-04)

### GitHub Action Workflow

**Confidence: HIGH** — based on official Cloudflare documentation and wrangler-action repo.

Two deployment approaches are viable. The CONTEXT.md decision (D-07) chose the deploy-branch approach. Here is how to implement it:

#### Approach: GH Action syncs to deploy branch, CF Pages watches branch

```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: write  # Needed to push to deploy branch
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for branch operations

      - name: Prepare deploy directory
        run: |
          mkdir -p deploy-staging
          # Copy included files per D-08
          cp _headers deploy-staging/
          cp *.html deploy-staging/
          cp -r assets deploy-staging/
          cp manifest.json deploy-staging/
          cp sw.js deploy-staging/

      - name: Deploy to branch
        run: |
          cd deploy-staging
          git init
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git checkout -b deploy
          git add -A
          git commit -m "Deploy from ${{ github.sha }}"
          git remote add origin https://x-access-token:${{ secrets.GITHUB_TOKEN }}@github.com/${{ github.repository }}.git
          git push -f origin deploy
```

CF Pages project is configured to watch the `deploy` branch as production.

### Required GitHub Secrets
| Secret | Value | Source |
|--------|-------|--------|
| `GITHUB_TOKEN` | Auto-provided | GitHub Actions built-in — no manual setup needed |

### Required Cloudflare Configuration
- Create CF Pages project connected to the GitHub repo
- Set production branch to `deploy`
- Custom domain: sessionsgarden.app (or subdomain)

### _headers File Enhancement
The current `_headers` file should be enhanced with security headers for production:

```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
/*.html
  Cache-Control: no-cache
/*.js
  Cache-Control: public, max-age=86400
/*.css
  Cache-Control: public, max-age=86400
/sw.js
  Cache-Control: no-cache
```

Note: CSP is already handled via `<meta>` tags in HTML files. Do NOT duplicate in _headers — meta tags take precedence for inline scripts, and _headers CSP would be additive (more restrictive), potentially breaking inline scripts.

## Common Pitfalls

### Pitfall 1: Reusing AES-GCM IV
**What goes wrong:** If the same IV is used with the same key for two different encryption operations, the authentication guarantee of GCM is completely broken, and key recovery may be possible.
**Why it happens:** Developer generates salt once and reuses it, or caches the derived key and forgets to regenerate IV.
**How to avoid:** Generate fresh `crypto.getRandomValues(new Uint8Array(12))` for EVERY encrypt call. Salt can be reused across sessions if stored, but IV must NEVER be reused with the same key.
**Warning signs:** IV stored in a constant rather than generated per-call.

### Pitfall 2: Not Handling Web Crypto Errors Gracefully
**What goes wrong:** `crypto.subtle.decrypt()` throws `DOMException: The operation failed for an operation-specific reason` when the passphrase is wrong. This is opaque and confuses users.
**Why it happens:** AES-GCM authentication fails silently at the crypto level — no "wrong password" error, just a generic decryption failure.
**How to avoid:** Catch the DOMException from decrypt and show a user-friendly "Incorrect passphrase or corrupted file" message. Do not expose the raw error.
**Warning signs:** Unhandled promise rejection in console during import with wrong password.

### Pitfall 3: Service Worker Cache Not Updated for 12 New Legal Pages
**What goes wrong:** New legal page HTML files (9 new files beyond the 3 existing) are not added to `sw.js` PRECACHE_URLS. Users who installed the PWA see 404s for language-specific legal pages when offline.
**Why it happens:** SW cache list is manually maintained and easy to forget.
**How to avoid:** When creating legal page files, immediately update `sw.js` PRECACHE_URLS. Bump CACHE_NAME version.
**Warning signs:** Legal pages work in browser but fail when app is offline/installed.

### Pitfall 4: Legal Page Cross-Links Not Updated
**What goes wrong:** Footer links on legal pages still point to `impressum.html?lang=he` instead of `impressum-he.html`. Globe language switcher reloads with `?lang=` param instead of navigating to sibling file.
**Why it happens:** The current pattern uses URL params for language; the new pattern uses separate files.
**How to avoid:** Update all footer link generation AND globe-lang.js `onLangChange` callback on legal pages to navigate to `{page}-{lang}.html` instead of `{page}.html?lang={lang}`. German version stays at `{page}.html` (no suffix).
**Warning signs:** Language switching on legal pages reloads the same page instead of navigating to the correct language file.

### Pitfall 5: Deploy Branch Contains .planning Files
**What goes wrong:** Sensitive planning documents, research, and development notes are publicly visible on the deployed site.
**Why it happens:** GH Action copies too many files, or glob pattern is wrong.
**How to avoid:** Use explicit include list (per D-08), not an exclude list. Copy only: `_headers`, `*.html`, `assets/`, `manifest.json`, `sw.js`. Verify deploy branch contents manually after first deployment.
**Warning signs:** Navigating to `sessionsgarden.app/.planning/REQUIREMENTS.md` returns content instead of 404.

### Pitfall 6: Impressum Missing VSBG Statement
**What goes wrong:** A competitor or Abmahnanwalt (warning-letter lawyer) sends a cease-and-desist for missing consumer dispute resolution notice. Typical cost: EUR 1,500-5,000+.
**Why it happens:** VSBG statement is not part of DDG SS5 requirements — it comes from a separate law (VSBG SS36). Easy to miss.
**How to avoid:** Include VSBG section in every Impressum file, in every language.
**Warning signs:** Impressum has name/address/contact but no "Verbraucherstreitbeilegung" section.

### Pitfall 7: GH Action Force-Push Race Condition
**What goes wrong:** Two quick pushes to main trigger two parallel GH Action runs. Both try to force-push the deploy branch. One fails.
**Why it happens:** Force-push to deploy branch is not atomic with the workflow trigger.
**How to avoid:** Add `concurrency` key to the GH Action workflow to cancel in-progress deploys when a new push arrives:
```yaml
concurrency:
  group: deploy
  cancel-in-progress: true
```
**Warning signs:** GH Action run shows "failed to push" error intermittently.

## Code Examples

### Encrypted Backup: Full Encryption/Decryption Flow
```javascript
// Source: OWASP 2025 + MDN Web Crypto API docs + NIST SP800-38D
// Confidence: HIGH

const SGBACKUP_MAGIC = new Uint8Array([0x53, 0x47, 0x30, 0x31]); // "SG01"
const PBKDF2_ITERATIONS = 310000;
const SALT_LENGTH = 16;  // bytes
const IV_LENGTH = 12;    // bytes (96 bits per NIST recommendation)

/**
 * Derive an AES-256-GCM key from a passphrase using PBKDF2.
 */
async function deriveKey(passphrase, salt) {
  var enc = new TextEncoder();
  var keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a ZIP blob into an .sgbackup ArrayBuffer.
 * Format: [4B magic][16B salt][12B IV][ciphertext+tag]
 */
async function encryptBackup(zipBlob, passphrase) {
  var salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  var iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  var key = await deriveKey(passphrase, salt);

  var plaintext = await zipBlob.arrayBuffer();
  var ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    plaintext
  );

  // Concatenate: magic + salt + iv + ciphertext
  var result = new Uint8Array(
    SGBACKUP_MAGIC.length + salt.length + iv.length + ciphertext.byteLength
  );
  result.set(SGBACKUP_MAGIC, 0);
  result.set(salt, 4);
  result.set(iv, 20);
  result.set(new Uint8Array(ciphertext), 32);

  return new Blob([result], { type: 'application/octet-stream' });
}

/**
 * Decrypt an .sgbackup file back into a ZIP Blob.
 * Returns null if magic bytes don't match (not an sgbackup file).
 * Throws on wrong passphrase (DOMException from AES-GCM auth failure).
 */
async function decryptBackup(sgbackupBlob, passphrase) {
  var buffer = await sgbackupBlob.arrayBuffer();
  var data = new Uint8Array(buffer);

  // Check magic bytes
  for (var i = 0; i < SGBACKUP_MAGIC.length; i++) {
    if (data[i] !== SGBACKUP_MAGIC[i]) return null; // Not an sgbackup file
  }

  var salt = data.slice(4, 20);
  var iv = data.slice(20, 32);
  var ciphertext = data.slice(32);

  var key = await deriveKey(passphrase, salt);

  var plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    ciphertext
  );

  return new Blob([plaintext], { type: 'application/zip' });
}
```

### Detect File Type on Import
```javascript
// Source: Project pattern from backup.js importBackup()
async function detectBackupType(file) {
  var name = file.name || '';
  var ext = name.split('.').pop().toLowerCase();

  if (ext === 'sgbackup') return 'encrypted';
  if (ext === 'zip') return 'zip';
  if (ext === 'json') return 'legacy-json';
  return 'unknown';
}
```

### Landing Page Auto-Detection (LIVE-06)
```javascript
// Source: Pattern based on existing isLicensed() in license.js
// Add to landing.js or inline on landing.html
var enterLink = document.getElementById('hero-enter-link');
if (enterLink) {
  var hasFlag = localStorage.getItem('portfolioLicenseActivated') === '1';
  var hasInstance = !!localStorage.getItem('portfolioLicenseInstance');
  if (hasFlag && hasInstance) {
    enterLink.textContent = 'Open Sessions Garden'; // or i18n equivalent
    enterLink.href = './index.html';
    // Optional: show a brief "License active" indicator
  }
}
```

### GH Action Workflow with Concurrency
```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]

concurrency:
  group: deploy
  cancel-in-progress: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Prepare deploy directory
        run: |
          mkdir -p deploy-staging
          cp _headers deploy-staging/
          cp *.html deploy-staging/
          cp -r assets deploy-staging/
          cp manifest.json deploy-staging/
          cp sw.js deploy-staging/

      - name: Push to deploy branch
        run: |
          cd deploy-staging
          git init
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git checkout -b deploy
          git add -A
          git commit -m "Deploy from ${GITHUB_SHA::7}"
          git remote add origin https://x-access-token:${{ secrets.GITHUB_TOKEN }}@github.com/${{ github.repository }}.git
          git push -f origin deploy
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| TMG SS5 for Impressum | DDG SS5 | May 14, 2024 | All Impressum citations must reference DDG, not TMG |
| cloudflare/pages-action | cloudflare/wrangler-action@v3 | 2024 | Old action deprecated, new one is official path |
| ODR platform link in Impressum | Remove ODR link | July 20, 2025 | EU ODR platform shutting down — link will be dead |
| PBKDF2 100,000 iterations | PBKDF2 310,000 iterations | OWASP 2025 | Previous OWASP guidance was 100K-600K depending on context |
| Steuernummer in Impressum | Wirtschafts-ID in Impressum | Nov 2024 - ongoing | New W-IdNr replacing Steuernummer for Impressum; rollout phased |

**Deprecated/outdated:**
- TMG SS5: Replaced by DDG SS5 in May 2024. Do not cite TMG in new Impressum.
- cloudflare/pages-action: Officially deprecated. Use wrangler-action@v3.
- EU ODR platform link: Platform shutting down July 20, 2025. Must be removed.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None (no automated test infrastructure) |
| Config file | None |
| Quick run command | Manual browser testing |
| Full suite command | Manual cross-browser testing |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LIVE-01 | Impressum has all required legal sections | manual-only | Visual inspection of all 4 language versions | N/A |
| LIVE-02 | 12 legal page files load correctly, language switcher works | manual-only | Open each file, click language switcher, verify navigation | N/A |
| LIVE-03 | GH Action deploys to deploy branch on push to main | manual-only | Push commit, check GH Actions tab, verify deploy branch | N/A |
| LIVE-04 | Full purchase-activate-use flow works | manual-only | Complete real LS checkout, activate, verify app loads | N/A |
| LIVE-05 | License page shows correct chrome per activation state | manual-only | Test with/without localStorage keys set | N/A |
| LIVE-06 | Landing page auto-detects active license | manual-only | Set localStorage keys, visit landing page, verify redirect | N/A |
| LIVE-07 | No implementation needed | N/A | N/A | N/A |
| LIVE-08 | Encrypted backup export + import with correct/wrong passphrase | manual-only | Export with passphrase, import with correct/wrong passphrase | N/A |
| LIVE-09 | Research output exists | manual-only | Check backlog file | N/A |

**Justification for manual-only:** This is a vanilla JS PWA with no test framework. All testing for this phase is integration/E2E level (browser interactions, real LS API calls, file downloads). Adding Playwright is explicitly deferred to v2 (see REQUIREMENTS.md Future Requirements FOUND-05).

### Sampling Rate
- **Per task commit:** Manual verification of changed behavior in browser
- **Per wave merge:** Cross-browser check (Chrome + Safari minimum)
- **Phase gate:** Full E2E walkthrough before `/gsd:verify-work`

### Wave 0 Gaps
None — existing manual testing approach covers all phase requirements. Automated test infrastructure is explicitly out of scope for v1.1.

## Open Questions

1. **Wirtschafts-ID availability**
   - What we know: Kleinunternehmer were in the first wave (Nov 2024). Sapir's Gewerbe was registered March 2026 — she may be in a later wave.
   - What's unclear: Whether Sapir has received her Wirtschafts-ID. Check ELSTER account.
   - Recommendation: Build Impressum without W-IdNr section. Add it when received. Include a code comment marking where to insert it.

2. **CF Pages custom domain configuration**
   - What we know: CF Pages supports custom domains. DNS must be managed through Cloudflare.
   - What's unclear: Whether sessionsgarden.app DNS is already on Cloudflare, and exact domain setup steps.
   - Recommendation: This is manual CF dashboard configuration, not code. Document steps but don't block planning on it.

3. **PBKDF2 performance on low-end devices**
   - What we know: 310,000 iterations targets ~100ms on modern hardware. Therapists may use older devices.
   - What's unclear: Actual performance on budget Android phones from 2020.
   - Recommendation: Use 310,000 iterations. If user testing reveals unacceptable delay, reduce to 210,000 (still within OWASP range). Show a spinner/progress message during key derivation.

## Sources

### Primary (HIGH confidence)
- [MDN AesGcmParams](https://developer.mozilla.org/en-US/docs/Web/API/AesGcmParams) — AES-GCM parameter specification
- [MDN SubtleCrypto encrypt](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/encrypt) — Web Crypto encrypt API
- [Cloudflare Pages headers docs](https://developers.cloudflare.com/pages/configuration/headers/) — _headers file syntax
- [Cloudflare Pages direct upload CI](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/) — GH Action workflow
- [cloudflare/wrangler-action](https://github.com/cloudflare/wrangler-action) — Official GH Action

### Secondary (MEDIUM confidence)
- [IONOS Impressum requirements 2025](https://www.ionos.com/digitalguide/websites/digital-law/a-case-for-thinking-global-germanys-impressum-laws/) — DDG SS5 requirements
- [eRecht24 Impressum Kleinunternehmer](https://www.e-recht24.de/impressum/13097-impressum-fuer-kleinunternehmer.html) — Kleinunternehmer-specific guidance
- [OWASP PBKDF2 2025 guidance](https://dev.to/securebitchat/why-you-should-use-310000-iterations-with-pbkdf2-in-2025-3o1e) — Iteration count recommendation (cites OWASP cheat sheet)

## Planning Directives (from user review)

**These directives come from Ben's review of the research and MUST be reflected in plan tasks.**

### SW Cache Update — Mandatory Structured Task
The risk of forgetting to update `sw.js` when adding 9 new legal page files is real (Pitfall 3 above). The planner MUST:
1. Create an **explicit task** (not a subtask buried in another task) that updates `sw.js` PRECACHE_URLS with all 12 legal page paths and bumps CACHE_NAME version.
2. Add a **verification step** that counts `*.html` files in the deploy set vs entries in `sw.js` PRECACHE_URLS — mismatch = fail.
3. This task MUST be sequenced AFTER the legal page files are created, not before.

### Legal Page Cross-Links — Structured Task
Switching from `?lang=` URL params to direct file navigation (`impressum-he.html` instead of `impressum.html?lang=he`) is a distinct task, not an afterthought. The planner MUST:
1. Create a **dedicated task** for updating all cross-links: footer link generation, `globe-lang.js` `onLangChange` callbacks on legal pages, any links from app/landing pages to legal pages.
2. Touch points: footer on all legal pages, globe language switcher behavior, landing page legal links, app page legal links.

### GH Action Concurrency — Include in Deploy Task
The `concurrency: { group: deploy, cancel-in-progress: true }` block prevents race conditions when two pushes to `main` happen in quick succession. This is standard practice — include it in the GH Action workflow task, not as a separate concern. Explanation for context: it tells GitHub to cancel an in-progress deploy if a newer push arrives, so two workflows don't fight over force-pushing the deploy branch.

### Legal Content Quality — Two-Pass Approach
Ben's directive: "No reason why a simple app won't be able to get covered legally without a real lawyer." The approach:
1. **First pass (this phase):** Create all legal page content based on research (DDG §5, VSBG §36, standard Haftungsausschluss/Urheberrecht). Draft thoroughly.
2. **Second pass (polishing task):** After all legal pages exist, run a dedicated review/polish pass — potentially using e-recht24 generator output as a cross-reference to validate completeness and wording. This can be a final plan in the phase.
3. The MEDIUM confidence on legal content is acceptable — the content surface is small (simple local-only app, no tracking, no payment processing, Lemon Squeezy is MoR). Lawyer review is optional, not blocking.
- [IHK Nuernberg VSBG](https://www.ihk-nuernberg.de/ihr-unternehmen/rechtsinformationen-fuer-unternehmen/internetrecht-recht-des-e-commerce/verbraucherstreitbeilegungsgesetz) — Consumer dispute resolution notice requirements
- [BZSt Wirtschafts-ID](https://www.bzst.de/DE/Unternehmen/Identifikationsnummern/Wirtschafts-Identifikationsnummer/wirtschaftsidentifikationsnummer_node.html) — W-IdNr rollout timeline
- [eRecht24 Wirtschafts-ID Impressum](https://www.e-recht24.de/news/ecommerce/13369-die-wirtschafts-id-kommt-was-das-fuer-ihr-impressum-bedeutet.html) — W-IdNr in Impressum obligations

### Tertiary (LOW confidence)
- SapphireHealing courtesy banner pattern — inspected directly from codebase, styling adapted for Sessions Garden design tokens

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all tools are browser-native or already in project
- Architecture (legal pages): HIGH — file structure is simple, decided in CONTEXT.md
- Architecture (encryption): HIGH — Web Crypto API is well-documented and stable
- Architecture (deployment): HIGH — standard GH Actions pattern
- Legal content (Impressum sections): MEDIUM — researched from multiple German legal sources but final content should be reviewed by a German lawyer or legal generator (e-recht24.de)
- Pitfalls: HIGH — documented from official sources and project inspection

**Research date:** 2026-03-24
**Valid until:** 2026-04-24 (legal requirements stable; OWASP guidance stable; CF tooling may update)

---

## Addendum: CF Pages Deployment Debugging (2026-03-25)

### Context

Phase 19 was code-complete and deployed via GitHub Actions → `deploy` branch → Cloudflare Pages. The app worked perfectly on localhost but had critical navigation failures on the live CF Pages deployment (sessionsgarden.app). Three debugging sessions across 2026-03-24 and 2026-03-25 resolved all issues.

### CF Pages "Pretty URLs" — The Core Conflict

CF Pages has an always-on "pretty URLs" feature that:
1. **Strips `.html` extensions**: Requesting `/foo.html` returns a **301 redirect** to `/foo`
2. **Treats `index.html` as the root document**: `/index.html` redirects to `/`, not `/index`
3. **Serves content at extensionless paths**: `/foo` serves `foo.html` content directly

This creates two problems for service workers and `_redirects`:

#### Problem 1: SW caching redirected responses
When a service worker precaches `/foo.html` via `cache.add()`, the fetch follows the 301 redirect to `/foo` and stores the final response. But this response has `response.redirected === true`. When the SW later serves this cached response for a **navigation request**, browsers reject it with: *"Response served by service worker has redirections"* (Safari) / similar errors in Chrome.

**Impact:** Every HTML page in the precache list became unnavigable when served from SW cache.

#### Problem 2: `_redirects` + `index.html` = infinite loop
The `_redirects` rule `/ /landing.html 302` was meant to show the marketing page at the root URL. But because CF Pages maps `index.html` → `/`, any navigation to `./index.html` (used throughout the app as the main entry point) triggered:
1. CF Pages: `/index.html` → 301 to `/`
2. `_redirects`: `/` → 302 to `/landing.html`
3. CF Pages: `/landing.html` → 301 to `/landing`
4. User trapped on landing page, never reaches app

**Impact:** ALL links to `./index.html` in the app (license activation redirect, disclaimer "Continue to App", auto-detect redirect) silently failed and sent users to landing.

### Hypotheses Tested

| # | Hypothesis | Result | Why Wrong / Right |
|---|-----------|--------|-------------------|
| 1 | SW caching extensionless URL redirects (v27 fix: skip extensionless navigations) | **Partially correct** | Fixed some cases but `.html` requests are ALSO redirected by CF Pages — the extensionless-only check was too narrow |
| 2 | SW caching ALL navigation redirect responses (v28 fix: skip ALL navigations + remove HTML from precache) | **Correct but insufficient** | Fixed the SW error, but users still looped to landing. The SW was one of two problems. |
| 3 | `_redirects` rule `/ /landing.html 302` conflicting with CF Pages' `index.html` → `/` mapping | **ROOT CAUSE** | CF Pages treats `index.html` as root document, so every `./index.html` link hit the redirect rule and looped to landing. Removing `_redirects` and replacing with a JS gate in `index.html <head>` fixed the issue. |

### Fixes Applied (commits)

| Commit | Fix | Status |
|--------|-----|--------|
| `9883857` | SW v28: skip ALL navigations, remove HTML from precache, never cache redirected responses | Working |
| `d6915cb` | Remove SW registration from landing.html (marketing page doesn't need it) | Working |
| `eabcd39` | **Root cause fix:** Remove `_redirects`, add JS Gate 0 in index.html — redirects unlicensed users to landing via JavaScript instead of CF `_redirects` | Working |

### Architectural Decisions

1. **SW only caches subresources** (CSS, JS, images, fonts, JSON). All page navigations go to network. This is the correct architecture for CF Pages with pretty URLs.
2. **Landing page has no SW** — marketing page should not install or be controlled by the service worker.
3. **Root URL handling via JS gates** — `index.html` has three `<script>` gates in `<head>` (before any rendering):
   - Gate 0: No license → redirect to `./landing.html`
   - Gate 1: No terms accepted → redirect to disclaimer
   - Gate 2: Terms but no license instance → redirect to license page
4. **`_redirects` file emptied** — CF Pages `_redirects` cannot safely redirect `/` when the app's main page is `index.html`, because CF treats them as the same thing.

### Key Takeaway for Future CF Pages Projects

**Never use `_redirects` to redirect `/` when your app lives at `index.html`.** CF Pages pretty URLs map `index.html` to `/`, so any `_redirects` rule targeting `/` will intercept all `./index.html` navigations. Handle root URL routing in JavaScript instead.
