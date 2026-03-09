# Architecture Research: Deployment Models for the Therapist Portfolio Manager

## Current State Assessment

After examining the full codebase:

- **Total codebase**: ~4,100 lines across 14 files (5 HTML pages, 8 JS modules, 1 CSS file)
- **Architecture**: Vanilla HTML/CSS/JS, no build tools, no package manager, no framework
- **Data layer**: IndexedDB via a clean `PortfolioDB` IIFE namespace in `assets/db.js` (169 lines, ~12 CRUD operations)
- **UI layer**: Custom component system (toasts, modals, severity scales, toggle groups) in `assets/app.js` (161 lines)
- **i18n**: Full English/Hebrew support with RTL, ~155 translation keys per language in `assets/i18n.js`
- **Data model**: Two stores -- `clients` (name, age, type, photo, notes, heartWall) and `sessions` (clientId, date, issues with severity before/after, trapped emotions, comments)
- **Import/Export**: JSON export/import already exists (clears and replaces entire DB on import)
- **No build process, no tests, no backend, no authentication**

The clean separation between data access (`db.js`), shared UI (`app.js`), i18n (`i18n.js`), and page-specific logic makes it a good candidate for migration.

---

## Option A: SaaS Web Application

### How It Would Work
Build a Python backend (FastAPI or Django) that serves the existing HTML/CSS/JS frontend, replacing IndexedDB with a server-side database. Each therapist gets a user account; data is stored centrally.

### Technical Details

**Backend**: FastAPI is the strongest match -- modern, async-native, excellent for a solo Python developer, less boilerplate than Django. Django would be overkill for 10-20 users with two data tables.

**Database**: PostgreSQL is the standard for multi-tenant SaaS, but for 10-20 users, SQLite would actually work fine. You could start with SQLite and migrate later.

**Authentication**: At this scale, simple email/password auth with session cookies is sufficient. Libraries like `fastapi-users` or `authlib` provide this.

**Multi-tenancy**: Shared database with a `user_id` column on every row. No need for schema-per-tenant at this scale.

**Hosting costs**:
| Platform | Monthly Cost | Notes |
|----------|-------------|-------|
| Railway | $5-15/mo | Usage-based, easiest deploy |
| Fly.io | $5-10/mo | Free tier may cover it |
| Hetzner VPS + Coolify | $5-6/mo | Most cost-effective, more setup |
| Render | $7-15/mo | Simple, PostgreSQL included |

**Migration effort**: Replace each IndexedDB function with a REST API call. The `PortfolioDB` namespace has 12 functions -- each becomes an API endpoint. Moderate but straightforward work.

### Evaluation
| Criterion | Rating | Notes |
|-----------|--------|-------|
| Code reuse | ~60-70% | HTML/CSS/JS stays; `db.js` replaced with API calls |
| Skill match | Strong | Python backend is developer's strength |
| Effort to MVP | Medium-High | Auth, API, database, hosting, deployment |
| Maintenance | Medium | Server uptime, backups, security patches, SSL |
| Data privacy | Centralized | Developer becomes data custodian |
| User experience | Low friction | Users visit a URL and log in |

### Key Risk
You become responsible for the data of 10-20 therapists' client records. This is sensitive health-adjacent data with significant legal implications (see Legal Research).

---

## Option B: Desktop Application

### Sub-Options

**B1: Tauri (Recommended desktop path)**
- Uses system's native WebView (not bundled Chromium), apps are tiny (~2-10 MB)
- Existing HTML/CSS/JS works directly
- Backend logic in Rust (minimal needed for this app)
- Bundles as `.dmg` for Mac, `.msi` for Windows
- Tauri 2.0 is stable and production-ready
- **Downside**: Rust is a new language; small community compared to Electron

**B2: PyWebView (Best skill match)**
- Python wrapper around native WebView
- Existing HTML/CSS/JS loads directly
- Backend is Python (developer's strength)
- Package with PyInstaller or py2app (~20 MB)
- **Downside**: Smaller community; packaging can be finicky; manual auto-update

**B3: Electron (Most mature, heaviest)**
- Ships full Chromium (~100+ MB, ~200 MB memory)
- Maximum compatibility with existing code
- Excellent tooling (electron-builder, auto-updater)
- **Downside**: Absurdly heavy for a 4,100-line app

### Database Migration
All desktop options replace IndexedDB with SQLite. The `db.js` module (169 lines) would be rewritten. The data model maps cleanly -- two IndexedDB stores become two SQLite tables.

### Distribution
- Mac: `.dmg` file via download link or Google Drive
- Windows: `.msi` or `.exe` installer
- macOS may require notarization for Gatekeeper

### Evaluation
| Criterion | Rating | Notes |
|-----------|--------|-------|
| Code reuse | ~85-90% | HTML/CSS/JS virtually unchanged; only `db.js` rewritten |
| Skill match | Good (PyWebView) / Learning curve (Tauri) | Python vs Rust |
| Effort to MVP | Medium | Rewrite `db.js`, packaging, distribution testing |
| Maintenance | Low | No server to maintain |
| Data privacy | Excellent | Data stays on user's machine |
| User experience | Medium friction | Download, install, Gatekeeper warnings |

---

## Option C: Progressive Web App (PWA)

### How It Would Work
Add a `manifest.json` and service worker to the existing app. Users visit a URL, browser offers "Install" prompt, app installs to home screen/dock. Data stays in IndexedDB. Optionally add a lightweight backend for backup/sync later.

### What Changes
1. **Create `manifest.json`**: App name, icons, theme color, display mode. ~20 lines.
2. **Create `service-worker.js`**: Cache the 14 static files for offline. ~30-50 lines.
3. **Add registration code**: One `<script>` block in each HTML page. ~5 lines.
4. **Serve over HTTPS**: Host on GitHub Pages, Netlify, Vercel, or Cloudflare Pages (all free).
5. **Create app icons**: Required sizes (192x192, 512x512 minimum).

### What Stays the Same
**Everything.** The entire existing codebase is untouched.

### Optional: Backup Endpoint
A tiny FastAPI endpoint (~50 lines) that stores encrypted JSON blobs. Users remain in control of their data but have a safety net.

### Limitations
- **iOS install friction**: No automatic install prompt; users must use "Add to Home Screen"
- **Storage limits**: IndexedDB typically 50MB+, can request persistent storage via `StorageManager.persist()`
- **No auto-update UI**: Service worker handles it automatically but with slight delay
- **No native file system**: Export/import via blob downloads works fine

### Evaluation
| Criterion | Rating | Notes |
|-----------|--------|-------|
| Code reuse | **~98%** | Only additions, no modifications |
| Skill match | Strong | Just HTML/JS |
| Effort to MVP | **Low** | ~2-4 hours of work |
| Maintenance | **Very Low** | Static hosting, no server |
| Data privacy | Excellent | Data stays in browser IndexedDB |
| User experience | Low-Medium friction | Share a URL; install or use in browser |

---

## Option D: Local-First Architecture (CRDTs)

### Technologies
- **Fireproof**: Pure JS CRDT database, browser-native, E2E encryption
- **Y.js / Automerge**: Lower-level CRDT libraries for collaborative editing
- **ElectricSQL**: Syncs Postgres to local SQLite (not yet production-ready)
- **PowerSync**: Syncs Postgres/MongoDB to local SQLite (requires backend)

### Reality Check
For 10-20 solo practitioners who each have their own data (no collaboration), **CRDTs solve a problem you don't have.** CRDTs excel at conflict resolution when multiple users edit the same data simultaneously. Your users each work with their own client list -- there is no shared state to conflict.

### Evaluation
| Criterion | Rating | Notes |
|-----------|--------|-------|
| Code reuse | ~50-60% | Data layer completely replaced |
| Skill match | Poor | CRDTs are conceptually complex; thin docs |
| Effort to MVP | High | Steep learning curve + integration |
| Maintenance | Medium | Fast-moving ecosystem |
| Data privacy | Excellent | Data on-device with optional encrypted sync |
| User experience | Good (once set up) | Offline-first |

**Not recommended** for this use case.

---

## Option E: Self-Hosted per User

### Sub-Options

**E1: User runs Docker locally** -- Non-starter for non-technical therapists.

**E2: Developer deploys per-user instances** -- 10-20 Docker containers on a VPS ($5-10/mo), each user gets their own URL.

### Evaluation
| Criterion | Rating | Notes |
|-----------|--------|-------|
| Code reuse | ~70% | Same as SaaS but simpler (no multi-tenancy) |
| Skill match | Medium | Docker + deployment automation |
| Effort to MVP | Medium-High | Backend + Docker + automation |
| Maintenance | **High** | Managing 10-20 separate deployments |
| Data privacy | Good | Per-user data isolation |
| User experience | Low friction | Users visit personal URL |

**Not recommended** -- strictly worse than SaaS (Option A) with higher maintenance.

---

## Comparison Matrix

| Criterion | A: SaaS | B: Desktop | C: PWA | D: Local-First | E: Self-Hosted |
|-----------|---------|------------|--------|-----------------|----------------|
| **Code reuse** | 60-70% | 85-90% | **98%** | 50-60% | 70% |
| **Skill match** | Strong | Good-Medium | **Strong** | Poor | Medium |
| **Effort to MVP** | Medium-High | Medium | **Low** | High | Medium-High |
| **Maintenance** | Medium | Low | **Very Low** | Medium | High |
| **Data privacy** | You hold data | **On-device** | **On-device** | **On-device** | You hold data |
| **User friction** | **Low** (URL + login) | Medium (install) | **Low** (URL) | Medium | **Low** (URL) |
| **Offline** | No | Yes | **Yes** | Yes | No |
| **Monthly cost** | $5-15 | $0 | **$0** | $0-10 | $5-15 |
| **Scales to 100+** | Yes | Yes | With limits | Yes | Poorly |

---

## Recommendation

### Primary: Option C (PWA) -- Start Here

**Why:**
1. **Near-zero code changes**: Add manifest, service worker, deploy to free hosting
2. **Data privacy preserved**: Each user's data stays in their browser. Zero liability for data breaches
3. **Distribution is trivial**: Send a URL. Users install or just bookmark
4. **Matches learning trajectory**: Web fundamentals (service workers, manifests) are universally useful
5. **Doesn't close doors**: PWA is a stepping stone. Later add a backend for backup, or wrap in Tauri for desktop

### Secondary: Option B (Desktop via PyWebView) -- If Users Need It

Only if PWA doesn't meet user needs. PyWebView over Tauri because Python is the developer's strength.

### Explicitly Not Recommended: Options D and E

- **Option D**: Solves the wrong problem. No collaboration = no need for CRDTs.
- **Option E**: Strictly dominated by Option A.

### When to Consider Option A (SaaS)

Only if users explicitly need: multi-device sync, centralized backup, or collaboration features.

### Suggested Roadmap

```
Phase 1 (Now):      PWA conversion -- manifest, service worker, static hosting
                     Effort: 2-4 hours | Cost: $0

Phase 2 (If needed): Optional backup endpoint
                     Effort: 1-2 days | Cost: $0-5/mo

Phase 3 (If needed): Desktop wrapper (PyWebView) for users who prefer it
                     Effort: 2-3 days | Cost: $0

Phase 4 (If needed): Full SaaS with auth and multi-device sync
                     Effort: 2-4 weeks | Cost: $5-15/mo
```

Each phase builds on the previous one. No work is thrown away.

---

## Sources

- [Tauri vs Electron (2026)](https://blog.nishikanta.in/tauri-vs-electron-the-complete-developers-guide-2026)
- [Tauri vs Electron Comparison (RaftLabs)](https://www.raftlabs.com/blog/tauri-vs-electron-pros-cons/)
- [PWA on iOS (2025)](https://brainhub.eu/library/pwa-on-ios)
- [PWA Guide (Senorit)](https://senorit.de/en/blog/progressive-web-apps-guide-2025)
- [PWA Installability (MDN)](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)
- [Local-First Frameworks (Neon)](https://neon.com/blog/comparing-local-first-frameworks-and-approaches)
- [PyWebView](https://pywebview.flowrl.com/)
- [Railway Pricing](https://railway.com/pricing)
