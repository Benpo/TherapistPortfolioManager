# Phase 7: Investigate Data Backup Strategy - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Investigate and implement a robust data backup/restore strategy for the therapist portfolio app. The current JSON export includes base64-encoded photos, creating unreasonably large files (7 demo clients made a file too heavy for VSCode). This phase must solve file size, add automatic backup to a user-chosen folder, and ensure reliable import/export — all without external servers or additional costs.

</domain>

<decisions>
## Implementation Decisions

### Backup Format
- Export as ZIP archive containing: small JSON (text data only) + separate photo files (PNG/JPG)
- Photos extracted from base64 in IndexedDB and saved as individual image files in a `photos/` subfolder within the ZIP
- JSON contains references to photo filenames instead of embedded base64 data
- Backup includes EVERYTHING in IndexedDB: clients, sessions, photos, settings — no exceptions

### Backup Trigger
- Both mechanisms together:
  1. **Periodic reminder** (existing 7-day banner) — keep as-is
  2. **Automatic save to user-chosen folder** via File System Access API — user picks a folder once, backups save there automatically
- Manual export button also always available
- **"Send backup to myself" button** — downloads the ZIP and opens the user's email client (mailto:) with a reminder to attach it. Not automatic, but gives the user an off-device copy without any server. Key selling point: answers the "what if my device is stolen?" objection.

### Photo Handling
- Photos stored separately in ZIP, not as base64 in JSON
- This is the core fix for the file size problem that triggered this phase
- On import: ZIP is unpacked, JSON is read, photos are re-stored in IndexedDB as base64

### Import/Restore
- Single-click import: user selects ZIP file, everything restores automatically (data + photos)
- Must feel identical to current import flow from user's perspective
- ZIP is opened in-browser, no external tools needed

### Failure Handling
- Claude's Discretion — handle gracefully with clear user-facing messages and guidance

### Import Conflict (merge vs replace)
- Claude's Discretion — decide the best approach during planning (merge, replace, or user choice)

### Version Compatibility
- Claude's Discretion — backups from older versions should work with newer app versions; decide migration strategy during planning

### Device Migration
- Claude's Discretion — the export/import ZIP naturally enables device migration (export on old device, import on new device)

### Backup Location in UI
- Claude's Discretion — place backup controls where they fit best in the app interface

</decisions>

<specifics>
## Specific Ideas

- Sapir's original idea: automatic backup sent to user-configured email. Not feasible (requires server, violates local-only principle, GDPR risk with clinical data). **Alternative chosen:** File System Access API for automatic local saves — achieves the same "set once, forget" goal without a server.
- The triggering concern: 7 fictitious demo clients created a backup file too large for VSCode to handle. This is unacceptable for real therapists with hundreds of sessions.
- All protection layers are important to the user — no shortcuts on data safety.
- User explicitly wants: no external server, no additional payments from her side.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `exportData()` in app.js (line 235): Collects all clients + sessions from IndexedDB — basis for new export
- `downloadJSON()` in app.js (line 246): Creates Blob and triggers download — needs replacement with ZIP logic
- Backup reminder banner (app.js line 278+): 7-day reminder already working — keep and enhance
- `window.PortfolioDB.getAllClients()` / `getAllSessions()`: IndexedDB access methods already exist

### Established Patterns
- Local-only: Zero network calls, no external dependencies — backup must follow same principle
- IndexedDB storage: All data stored locally via PortfolioDB wrapper
- Client photos stored as base64 data URLs in IndexedDB client records
- Vanilla JS, zero npm dependencies — ZIP library must be bundled or implemented without npm

### Integration Points
- Export/import buttons in app UI (existing)
- Backup reminder banner (existing, triggered after 7 days)
- File System Access API for automatic save — new capability, browser-dependent (Chrome/Edge support, Safari limited)
- Service worker (sw.js) may need awareness of backup files for offline support

</code_context>

<deferred>
## Deferred Ideas

- Email-based backup delivery — requires server infrastructure, out of scope for local-only app. Could revisit if a backend is ever added (v2+).
- Cloud backup (encrypted) — already listed as PLAT-02 in v2 requirements.
- **Auto-save drafts** — save form data to IndexedDB every few seconds so unsaved work survives unexpected shutdowns (battery death, crash). No cost, negligible performance impact. Should be its own phase/feature.

</deferred>

---

*Phase: 07-investigate-data-backup-strategy*
*Context gathered: 2026-03-18*
