# Technology Stack

**Analysis Date:** 2026-02-01

## Languages

**Primary:**
- HTML5 - Page structure and markup
- JavaScript (Vanilla ES6+) - Core application logic and interactivity
- CSS3 - Styling and responsive design

**Secondary:**
- JSON - Data serialization for import/export functionality

## Runtime

**Environment:**
- Browser (client-side only) - Modern browsers with ES6 support, IndexedDB API

**No Backend Runtime:**
- This is a client-only single-page application (SPA)
- No server-side processing required

## Frameworks

**Core:**
- Vanilla JavaScript (No framework) - All custom implementation
- HTML5 Web APIs - Including IndexedDB for persistent storage

**Styling:**
- Custom CSS3 - No CSS framework

**Internationalization:**
- Custom i18n system - Implemented in `assets/i18n.js` with English and Hebrew support

## Key Dependencies

**Critical (Built-in APIs):**
- IndexedDB - Browser database for persistent client and session storage
  - Database: `emotion_code_portfolio` with two object stores: `clients` and `sessions`
  - File: `assets/db.js`
- Web Storage API - localStorage for language preference persistence
  - Key: `portfolioLang`
- File API - For client photo uploads and data export/import
- Blob API - For JSON data export functionality

**Infrastructure:**
- Google Fonts CDN - External font loading
  - Fonts: Nunito (400, 600, 700, 800 weights) and Rubik (400, 600, 700 weights)
  - Import: `https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=Rubik:wght@400;600;700&display=swap`

## Configuration

**Environment:**
- No environment variables required
- Browser detection: Application assumes modern browser with ES6, IndexedDB, and File API support

**Build:**
- No build process - Files served as-is (HTML, CSS, JS)
- Static file delivery only

## Data Storage

**Local Storage:**
- IndexedDB database: `emotion_code_portfolio` (version 1)
  - Stores: `clients` (with index on `name`) and `sessions` (with indexes on `clientId` and `date`)
  - All data persists locally in browser only - no server synchronization

**No External Services:**
- No cloud database
- No API backend
- No server-side persistence

## Platform Requirements

**Development:**
- Any modern browser with:
  - ES6+ JavaScript support
  - IndexedDB support
  - Web Storage API (localStorage)
  - File API for photo uploads
  - HTML5 support
- No build tools required
- No package manager required

**Production:**
- Deployment: Static file hosting (any web server, GitHub Pages, etc.)
- No server-side processing required
- No database required beyond browser's IndexedDB

## Browser Compatibility

**Minimum Requirements:**
- Chrome 24+
- Firefox 16+
- Safari 10+
- Edge (all versions)
- Not compatible with IE (uses modern ES6+ syntax)

---

*Stack analysis: 2026-02-01*
