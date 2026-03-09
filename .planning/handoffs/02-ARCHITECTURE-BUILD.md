# Handoff 2: Architecture & Build (Claude Conversation)

**Start a new Claude conversation. Copy everything below as your first message.**
**Start this AFTER completing the legal research in Handoff 1.**

---

## Context

I'm building a therapist portfolio management tool for Emotion Code practitioners. I need to convert my existing app to a distributable, sellable product. I'm learning full-stack development — strong in Python, learning web.

### Project location
`/Users/ben/Claude-Code-Sandbox/TherapistPortfolioManager_app`

### Current app state
- **Stack:** Vanilla HTML/CSS/JS, no framework, no build tools, no npm
- **Pages:** 5 HTML files — index (overview dashboard), add-client, add-session, sessions list, reporting
- **Data layer:** IndexedDB via `assets/db.js` (169 lines, 12 CRUD operations in a `PortfolioDB` IIFE namespace)
- **UI components:** Custom toasts, modals, severity scales, toggle groups in `assets/app.js` (161 lines)
- **i18n:** Full English + Hebrew with RTL support, ~155 keys per language in `assets/i18n.js`
- **Data model:** Two stores:
  - `clients`: name, age, type (emotion code/body code/both), photo, notes, heartWall
  - `sessions`: clientId, date, issues (with severity before/after), trapped emotions, comments
- **Existing features:** JSON export/import (full database), client CRUD, session CRUD, reporting
- **Missing:** No auth, no encryption, no tests, no service worker, no manifest, no backend

### Research completed (read these files for full context)
- `.planning/research/00-SYNTHESIS.md` — Cross-cutting analysis
- `.planning/research/01-legal-compliance.md` — GDPR, German law
- `.planning/research/02-ux-deployment.md` — UX analysis for therapist users
- `.planning/research/03-architecture.md` — 5 deployment models compared
- `.planning/research/04-tech-maintainability.md` — Tech stack analysis
- `.planning/research/05-open-questions.md` — 48 open questions (many now answered)

### Key decisions
- **Price:** EUR 99 one-time purchase
- **Users:** 5-20 alternative therapy practitioners, non-technical, use phones/tablets primarily
- **Must work:** Offline, on mobile, in Hebrew + English
- **Hosting for static files:** Netlify (free tier) or Cloudflare Pages
- **Developer has existing Gewerbe in Germany, Kleinunternehmer**

### Architecture choice

**IMPORTANT: Delete the options below that DON'T apply. Keep only the one you chose based on the Handoff 1 legal research.**

---

**OPTION A: PWA Only (Local Data, No Backend)**

Legal research confirmed: serving only app code = not a data processor. No backend needed.

**Build scope:**
1. PWA conversion
   - Create `manifest.json` (app name, icons, theme, display mode)
   - Create service worker (cache all 14 static files for offline)
   - Register service worker in each HTML page
   - Generate app icons (192px, 512px minimum)
   - Add `StorageManager.persist()` to prevent IndexedDB eviction

2. Security features
   - PIN/password screen on app launch (store hashed PIN in localStorage)
   - Auto-lock after X minutes of inactivity
   - Encrypt IndexedDB data using Web Crypto API (AES-256-GCM, key derived from PIN via PBKDF2)
   - Encrypt JSON exports with password

3. GDPR compliance features
   - "Delete Client" that fully purges client + all their sessions
   - Data export per client (not just full database)
   - Consent tracking: checkbox per client "Client consented to data storage on [date]"
   - Datenschutzerklaerung and Impressum pages in the app

4. UX improvements
   - Verify mobile responsiveness (test all 5 pages on phone viewport)
   - Fix any mobile layout issues
   - Add "Back up your data" reminder (if no export in last 30 days)
   - Add iOS "Add to Home Screen" instructional overlay for first-time mobile visitors

5. Deploy
   - Push to GitHub
   - Connect to Netlify or Cloudflare Pages
   - Configure custom domain (if purchased)
   - Test: offline mode, install on iPhone, install on Android, desktop

---

**OPTION B: PWA + Encrypted Backup Endpoint**

Legal research confirmed: encrypted blobs I can't decrypt = acceptable risk.

**Build scope: Everything from Option A, PLUS:**

6. Backup backend (small Python service)
   - FastAPI or Django (developer knows Python)
   - Endpoints: POST /register, PUT /backup/{user_id}, GET /backup/{user_id}
   - User identified by a random UUID (no email, no personal info)
   - Stores encrypted blobs in Cloudflare R2 or S3-compatible storage
   - No decryption capability on server — blobs are opaque
   - Rate limiting, size limits (e.g., max 50MB per user)

7. Client-side encryption for backup
   - Derive encryption key from user's PIN using PBKDF2 (high iteration count)
   - Encrypt full database dump with AES-256-GCM before upload
   - Store encrypted blob on server
   - On restore: download blob, decrypt with PIN, import into IndexedDB

8. Backup UX
   - "Back Up Now" button
   - "Last backup: [date/time]" indicator
   - "Restore from Backup" flow (enter PIN, download, decrypt, confirm replace)
   - Clear warning: "If you forget your PIN, your backup cannot be recovered"

9. Deploy backend
   - Host on Railway or Fly.io (EU region, ~$5/month)
   - Set up Cloudflare R2 bucket for blob storage
   - GitHub Actions CI/CD for backend

---

**OPTION C: Full Django Backend**

Legal research confirmed requirements. I accept the processor obligations.

**Build scope:**

6. Django project setup
   - Models matching current IndexedDB schema (Client, Session)
   - User model with therapist profile
   - Django auth (registration, login, password reset)
   - Django admin configured for user management

7. Page-by-page migration
   - Convert each HTML page to Django template + view
   - Replace `db.js` IndexedDB calls with Django views (HTMX for partial updates)
   - Existing `app.css` carries over directly
   - Convert i18n dictionary to Django `.po` files
   - Alpine.js for client-side interactivity (severity scales, toggle groups)

8. Security
   - Field-level encryption: `django-encrypted-model-fields` for session notes, trapped emotions, customer summaries
   - SQLite + Litestream for continuous backup to Cloudflare R2
   - Django security settings (HSTS, secure cookies, CSRF, etc.)
   - `django-axes` for login rate limiting
   - `pip-audit` in CI

9. Data migration
   - Import script that reads current JSON export format
   - Map to Django models
   - Migrate wife's existing data

10. Deploy
    - Railway or Fly.io (EU region)
    - GitHub Actions CI/CD
    - Sentry free tier for error tracking

11. Legal documents
    - DPA (Auftragsverarbeitungsvertrag) template for each therapist
    - Datenschutzerklaerung, Nutzungsbedingungen, Impressum

---

### What I need from Claude

1. **Read the existing codebase first** — understand the current implementation before changing anything
2. **Plan the implementation** — create a phased plan with clear steps
3. **Build step by step** — explain decisions as you go (I'm learning)
4. **Test thoroughly** — mobile, offline, data encryption, export/import
5. **Deploy** — help me get it live on the chosen hosting
