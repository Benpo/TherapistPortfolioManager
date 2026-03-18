# Phase 7: Investigate Data Backup Strategy - Research

**Researched:** 2026-03-18
**Domain:** Browser-native ZIP backup/restore, File System Access API, IndexedDB export
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Export as ZIP archive: small JSON (text data only) + separate photo files (PNG/JPG) in a `photos/` subfolder
- Photos extracted from base64 in IndexedDB; JSON contains filename references instead of embedded base64
- Backup includes EVERYTHING in IndexedDB: clients, sessions, photos, settings — no exceptions
- Both backup triggers together: (1) periodic reminder banner (7-day, keep as-is), (2) automatic save to user-chosen folder via File System Access API
- Manual export button always available
- "Send backup to myself" button: downloads ZIP then opens email client via `mailto:` with reminder to attach it — no file is auto-attached
- Photos stored separately in ZIP (this is the core file-size fix)
- On import: ZIP unpacked, JSON read, photos re-stored in IndexedDB as base64 — single-click restore
- User experience identical to current import flow from user's perspective
- No external server, no additional payments

### Claude's Discretion
- Failure handling: graceful, with clear user-facing messages and guidance
- Import conflict (merge vs replace): decide the best approach during planning
- Version compatibility: backups from older app versions must work with newer; decide migration strategy during planning
- Device migration: ZIP naturally enables this (export old, import new)
- Backup controls placement in UI: place where they fit best

### Deferred Ideas (OUT OF SCOPE)
- Email-based backup delivery (requires server)
- Cloud backup (v2, PLAT-02)
- Auto-save drafts (separate feature/phase)
</user_constraints>

---

## Summary

This phase replaces the current JSON export (which embeds all photos as base64, causing enormous file sizes) with a ZIP-based backup format. The ZIP contains a lightweight JSON for text data and a `photos/` subfolder with individual image files. This eliminates the file-size problem while keeping the local-only, zero-server constraint.

The technical implementation has two distinct new capabilities: (1) ZIP creation and extraction in-browser using JSZip (a self-hostable, MIT-licensed library), and (2) optional automatic save to a user-chosen folder using the File System Access API (Chromium-only; Safari/Firefox need a graceful fallback). The "send to myself" feature is a UX enhancement using `mailto:` — it downloads the ZIP and prompts the user to attach it themselves, since browsers cannot auto-attach files to email for security reasons.

The project is vanilla JS with zero npm dependencies. JSZip can be downloaded as a single `dist/jszip.min.js` file (~29.8 kB minified, ~11 kB gzipped) and self-hosted alongside other assets — no bundler required.

**Primary recommendation:** Self-host JSZip 3.10.1 as `assets/jszip.min.js`. For the automatic-save feature, use `showDirectoryPicker()` with a graceful degradation to manual download on unsupported browsers. On import, always replace (not merge) to keep restore predictable and safe.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| JSZip | 3.10.1 | Create and read ZIP archives in the browser | MIT-licensed, battle-tested, no dependencies, works as a plain script tag, supports ArrayBuffer/Blob for both generate and load |

### Supporting
| API | Availability | Purpose | When to Use |
|-----|-------------|---------|-------------|
| File System Access API (`showDirectoryPicker`) | Chrome 86+, Edge 86+ | Auto-save to user-chosen folder | Only when `'showDirectoryPicker' in window` — detect and fall back gracefully |
| FileReader API | All browsers | Read a ZIP Blob from `<input type="file">` | Import flow: read selected .zip file as ArrayBuffer, pass to `JSZip.loadAsync()` |
| `URL.createObjectURL` | All browsers | Trigger download of generated ZIP Blob | Export flow: existing pattern, already used for JSON download |
| `mailto:` URI | All browsers | Open user's email app with reminder subject/body | "Send to myself" button — downloads ZIP separately, then opens mail |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| JSZip (self-hosted) | CDN-hosted JSZip | CDN violates offline/privacy principle — self-host only |
| JSZip | client-zip (streaming, smaller) | client-zip is write-only — cannot read/import ZIPs, so unsuitable |
| Replace-on-import | Merge-on-import | Merge requires matching client IDs across devices — fragile. Replace is safe and predictable for this single-user app |
| File System Access API | `<input webkitdirectory>` | webkitdirectory opens a folder for read, not write — cannot auto-save to a folder |

**Installation (self-hosted, no npm):**
```bash
# Download once and place in assets/
curl -o assets/jszip.min.js https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js
```

Add to HTML pages that need backup (index.html, demo.html — before app.js):
```html
<script src="assets/jszip.min.js"></script>
```

---

## Architecture Patterns

### Recommended Module Structure

The backup logic is self-contained and should live in a new dedicated file:

```
assets/
├── backup.js          # New: all ZIP export/import logic (BackupManager module)
├── app.js             # Modified: replace downloadJSON/exportData with BackupManager calls
├── overview.js        # Modified: wire exportBtn, importInput, new "send to myself" btn
├── jszip.min.js       # New: self-hosted JSZip 3.10.1
└── db.js              # Unchanged: PortfolioDB API is sufficient
```

### Pattern 1: Export — Build ZIP and Download

**What:** Collect all IndexedDB data, strip photos from client records, write JSON + individual photo files into a ZIP Blob, then trigger download.

**When to use:** "Export Data" button click, "Back up now" banner button click.

```javascript
// Source: JSZip official docs + project patterns

async function exportBackup() {
  const clients = await window.PortfolioDB.getAllClients();
  const sessions = await window.PortfolioDB.getAllSessions();
  const zip = new JSZip();
  const photos = {};

  // Strip photos from client records, save separately
  const clientsClean = clients.map((client) => {
    const c = { ...client };
    if (c.photo) {
      const filename = `client-${c.id}.jpg`;
      // base64 data URL → raw base64 string
      const base64Data = c.photo.replace(/^data:image\/\w+;base64,/, "");
      zip.folder("photos").file(filename, base64Data, { base64: true });
      c.photo = `photos/${filename}`; // replace with filename reference
    }
    return c;
  });

  const manifest = {
    version: 1,
    exportedAt: new Date().toISOString(),
    appVersion: "1.0",
    clients: clientsClean,
    sessions,
  };

  zip.file("backup.json", JSON.stringify(manifest, null, 2));

  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  const filename = `sessions-garden-backup-${new Date().toISOString().slice(0, 10)}.zip`;
  triggerDownload(blob, filename);
  localStorage.setItem("portfolioLastExport", String(Date.now()));
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

### Pattern 2: Import — Restore from ZIP

**What:** User selects a `.zip` file, parse it with JSZip, restore JSON data and photos to IndexedDB. Always replace (clear first).

**When to use:** Import button file input change event.

```javascript
// Source: JSZip read docs + FileReader API

async function importBackup(file) {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  const jsonFile = zip.file("backup.json");
  if (!jsonFile) throw new Error("Invalid backup: backup.json not found");

  const jsonText = await jsonFile.async("string");
  const manifest = JSON.parse(jsonText);

  if (!manifest.clients || !manifest.sessions) {
    throw new Error("Invalid backup format");
  }

  // Restore photos: filename reference → base64 data URL
  const clients = await Promise.all(
    manifest.clients.map(async (client) => {
      if (client.photo && client.photo.startsWith("photos/")) {
        const photoFile = zip.file(client.photo);
        if (photoFile) {
          const base64 = await photoFile.async("base64");
          client.photo = `data:image/jpeg;base64,${base64}`;
        } else {
          client.photo = null; // Photo missing in ZIP — clear gracefully
        }
      }
      return client;
    })
  );

  // Replace strategy: clear then restore
  await PortfolioDB.clearAll();
  for (const client of clients) {
    await PortfolioDB.addClient(client);
  }
  for (const session of manifest.sessions) {
    await PortfolioDB.addSession(session);
  }
}
```

### Pattern 3: Auto-Save to Folder (File System Access API)

**What:** On first use, call `showDirectoryPicker()` to let user choose a folder, then save future exports there automatically. Store the handle in IndexedDB (handles are not serializable to localStorage).

**When to use:** Only when `'showDirectoryPicker' in window`. Silently skip for Safari/Firefox.

```javascript
// Source: Chrome Developers / File System Access API docs

let savedDirHandle = null; // in-memory; re-requested each session

async function pickBackupFolder() {
  if (!("showDirectoryPicker" in window)) return null;
  try {
    const handle = await window.showDirectoryPicker({ mode: "readwrite" });
    savedDirHandle = handle;
    localStorage.setItem("portfolioAutoBackupEnabled", "true");
    return handle;
  } catch (err) {
    if (err.name === "AbortError") return null; // User cancelled — not an error
    throw err;
  }
}

async function autoSaveToFolder(blob, filename) {
  if (!savedDirHandle) return false;
  try {
    // Verify permission is still valid
    const permission = await savedDirHandle.queryPermission({ mode: "readwrite" });
    if (permission !== "granted") {
      await savedDirHandle.requestPermission({ mode: "readwrite" });
    }
    const fileHandle = await savedDirHandle.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
    return true;
  } catch (err) {
    console.warn("Auto-save to folder failed:", err);
    return false;
  }
}
```

**Important:** `FileSystemDirectoryHandle` cannot be stored in localStorage (not serializable). The user must re-pick the folder each browser session. This is a known limitation of the API. Store only the `portfolioAutoBackupEnabled` flag in localStorage to show the "folder backup is active" UI state.

### Pattern 4: "Send to Myself" Button

**What:** Trigger the ZIP download (user saves it locally), then open `mailto:` to prompt them to attach it.

**Why mailto: cannot auto-attach:** Browsers block `attach=` in mailto links for security — this was a real exploit vector in email clients (2020 vulnerability). The UX here is intentional: download first, then prompt user.

```javascript
async function sendToMyself() {
  // Step 1: download the backup
  await exportBackup();

  // Step 2: open email client with guidance
  const subject = encodeURIComponent("Sessions Garden backup - " + new Date().toLocaleDateString());
  const body = encodeURIComponent(
    "Hi,\n\nI just exported my Sessions Garden backup file.\n" +
    "Please attach the .zip file you just downloaded and send this email to yourself for safekeeping.\n\n" +
    "Keep this file somewhere safe!"
  );
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
}
```

### Pattern 5: Version Compatibility (Backup Schema Versioning)

**What:** Manifest includes a `version` field. On import, apply a compatibility shim if version is older.

```javascript
function normalizeManifest(manifest) {
  // v0: old JSON export — no version field, photos embedded as base64 in clients
  if (!manifest.version) {
    // Old format: photos are already inline base64 strings — no transformation needed
    return {
      version: 0,
      clients: manifest.clients || [],
      sessions: manifest.sessions || [],
    };
  }
  // v1+: current ZIP format — photos are filename references, handled during import
  return manifest;
}
```

Start at `version: 1` for the new ZIP format. The old JSON format is treated as `version: 0` for import compatibility (photos are already inline base64 — no special handling needed).

### Anti-Patterns to Avoid

- **Embedding base64 photos in JSON:** The root cause of the file size problem. Never embed photos in the JSON manifest.
- **Storing DirectoryHandle in localStorage:** Handles are not serializable — they will throw a `DOMException`. Keep them in memory only.
- **Blocking the UI thread during ZIP generation:** `zip.generateAsync()` returns a Promise — always `await` it, never use the synchronous APIs.
- **Using a CDN for JSZip:** Violates the offline and local-only principles of the project.
- **Auto-attaching to mailto:** Browsers block this for security. Present as a two-step UX: download, then open mail.
- **Merging on import:** IDs from different devices will collide. Replace is the safe default for a single-user local app.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ZIP creation | Custom binary encoder | JSZip | ZIP format has complex headers, CRC32, compression — hundreds of edge cases |
| ZIP extraction | Custom binary parser | JSZip.loadAsync() | ZIP has multiple compression algorithms, local headers vs central directory |
| Folder picking | Custom file picker UI | `showDirectoryPicker()` | OS-integrated picker with proper permission model |
| File download trigger | Custom approach | `URL.createObjectURL` + `<a download>` | Already proven pattern in this codebase |

**Key insight:** ZIP is a binary format with complex internals. JSZip has handled every edge case (encoding, compression, large files, streaming) for years. Custom ZIP code always breaks on real data.

---

## Common Pitfalls

### Pitfall 1: Photos With Mixed MIME Types
**What goes wrong:** Client photos may be PNG or JPEG. Using `data:image/jpeg;base64,` blindly on PNG photos corrupts them on restore.
**Why it happens:** The photo's original MIME type is embedded in the data URL but is lost when you strip the base64 prefix.
**How to avoid:** Parse the MIME type from the data URL before saving: `const mime = photo.match(/^data:(image\/\w+);base64,/)[1]`. Use it to name the file (`client-1.png` vs `client-1.jpg`) and reconstruct the correct data URL on import.
**Warning signs:** Restored photos render as broken images.

### Pitfall 2: File System Access API Requires User Gesture
**What goes wrong:** Calling `showDirectoryPicker()` outside a user interaction (e.g., on page load) throws `SecurityError`.
**Why it happens:** Browser security policy — picker APIs require a user gesture (click event).
**How to avoid:** Only call `showDirectoryPicker()` inside a button click handler, never on `DOMContentLoaded`.
**Warning signs:** `SecurityError: Must be handling a user gesture to show a file picker`.

### Pitfall 3: DirectoryHandle Permission Expires
**What goes wrong:** Auto-save silently fails after browser restarts because `FileSystemDirectoryHandle` permissions are not persisted.
**Why it happens:** The File System Access API requires re-requesting permission each browser session. The handle object itself may survive if stored in IndexedDB (some browsers support this), but permission still needs re-granting.
**How to avoid:** Always call `queryPermission()` before writing. If not granted, call `requestPermission()` — which requires a user gesture too. Design the UI so the user understands they may need to re-confirm folder access. Simplest solution: re-pick on each session if needed.
**Warning signs:** Auto-save silently does nothing. Log the result of `autoSaveToFolder()` to detect false returns.

### Pitfall 4: Large ZIP Generation Freezes UI
**What goes wrong:** Generating a ZIP with many large photos blocks the main thread.
**Why it happens:** JSZip's `generateAsync()` is Promise-based but still CPU-bound; DEFLATE compression for images is expensive.
**How to avoid:** Use `STORE` compression for photos (images are already compressed; DEFLATE won't help and wastes CPU). Use `DEFLATE` only for the JSON text file.
```javascript
zip.folder("photos").file(filename, base64Data, { base64: true, compression: "STORE" });
zip.file("backup.json", jsonText, { compression: "DEFLATE" });
```
**Warning signs:** Browser "Page Unresponsive" dialog on large datasets.

### Pitfall 5: Old JSON Backups Fail to Import
**What goes wrong:** User tries to import their old `.json` backup after the upgrade to ZIP format. The new import handler expects `.zip` and rejects it.
**Why it happens:** Import flow changed format.
**How to avoid:** Detect file extension in the import handler. If `.json`, run the old `importData()` path unchanged. If `.zip`, run the new ZIP path. Update `<input accept=".zip,.json">` so both are selectable.
**Warning signs:** "Invalid backup" errors from users after update.

### Pitfall 6: Demo DB Receives Import
**What goes wrong:** User imports data while in the demo iframe, overwriting demo data.
**Why it happens:** Demo uses a separate `demo_portfolio` IndexedDB (by `window.name === "demo-mode"` check in db.js). Import would hit the demo DB.
**How to avoid:** Disable import in demo mode. The demo page already distinguishes itself — add a guard in the import handler: `if (window.name === 'demo-mode') return;`.

---

## Code Examples

Verified patterns from official sources:

### Generate ZIP as Blob (with photo compression optimization)
```javascript
// Source: JSZip official docs — https://stuk.github.io/jszip/documentation/examples.html
const blob = await zip.generateAsync({
  type: "blob",
  compression: "DEFLATE",
  compressionOptions: { level: 6 },
});
```

### Load ZIP from File Input
```javascript
// Source: JSZip read docs — https://stuk.github.io/jszip/documentation/howto/read_zip.html
const file = event.target.files[0]; // File from <input type="file">
const arrayBuffer = await file.arrayBuffer(); // Modern, no FileReader callback needed
const zip = await JSZip.loadAsync(arrayBuffer);
const text = await zip.file("backup.json").async("string");
const base64 = await zip.file("photos/client-1.jpg").async("base64");
```

### Check File System Access API Support
```javascript
// Source: MDN — https://developer.mozilla.org/en-US/docs/Web/API/Window/showDirectoryPicker
const supportsAutoBackup = "showDirectoryPicker" in window;
// Render "Set backup folder" button only when supportsAutoBackup === true
```

### Reconstruct Data URL from Photo MIME Type
```javascript
// Pattern derived from base64 data URL format specification
function extractPhotoForZip(dataUrl) {
  const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) return null;
  return { mime: match[1], base64: match[2] };
}

function reconstructDataUrl(mime, base64) {
  return `data:${mime};base64,${base64}`;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| JSON export with inline base64 photos | ZIP with separate photo files | Phase 7 | Eliminates multi-MB files; editors can open the JSON |
| Manual export only | Manual + auto-save to folder + "send to myself" | Phase 7 | Multiple safety nets without a server |
| No version field in export | `version` field in manifest | Phase 7 | Forward-compatible format for future schema changes |

**Deprecated/outdated:**
- `downloadJSON()` in app.js: Replace with `exportBackup()` from BackupManager. Keep as dead code removal.
- `<input accept="application/json">` on importInput: Update to `accept=".zip,.json"` to support both old and new formats.

---

## Open Questions

1. **Settings persistence**
   - What we know: CONTEXT.md says backup includes "settings" but PortfolioDB has no `settings` object store — settings appear to live in `localStorage` (theme, language, snoozed-until, last export).
   - What's unclear: Should localStorage settings be included in the backup? What keys are relevant?
   - Recommendation: During planning, decide which localStorage keys to serialize into the manifest (e.g., `portfolioLanguage`, `portfolioTheme`). Restore them on import. Skip session-specific keys like `portfolioBackupSnoozedUntil`.

2. **Import conflict: merge vs replace**
   - What we know: Replace is safe and predictable for a single-user local app. IDs are auto-incremented integers — merging across devices would collide.
   - What's unclear: Should the user be warned before data is replaced?
   - Recommendation: Always replace, show a confirmation dialog before clearing. "This will replace all your current data with the backup. Continue?"

3. **DirectoryHandle persistence across sessions**
   - What we know: Storing a `FileSystemDirectoryHandle` in IndexedDB is supported in Chromium but the permission is re-requested per session.
   - What's unclear: Is it worth storing the handle in IndexedDB at all, given the permission dance?
   - Recommendation: Skip IndexedDB handle storage in v1. Simpler UX: show a "Set backup folder" button in settings. When clicked, pick folder and save for that session only. Flag auto-backup as "active this session" in UI. On next load, prompt user to re-set if they want auto-save.

---

## Validation Architecture

> nyquist_validation is enabled (config.json)

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright (FOUND-05, Phase 6) |
| Config file | Not yet created — Wave 0 gap |
| Quick run command | `npx playwright test tests/backup.spec.js` |
| Full suite command | `npx playwright test` |

### Phase Requirements → Test Map

No formal requirement IDs were assigned to Phase 7 (the CONTEXT.md notes requirements as TBD). Behaviors to test:

| Behavior | Test Type | Automated Command | File Exists? |
|----------|-----------|-------------------|-------------|
| ZIP contains backup.json and photos/ subfolder | unit/integration | `npx playwright test tests/backup.spec.js::export-format` | Wave 0 |
| Photo data URL stripped from JSON, saved as file in ZIP | integration | `npx playwright test tests/backup.spec.js::photo-extraction` | Wave 0 |
| Import replaces all IndexedDB data correctly | integration | `npx playwright test tests/backup.spec.js::import-replace` | Wave 0 |
| Old JSON backup imports successfully (backwards compat) | integration | `npx playwright test tests/backup.spec.js::legacy-import` | Wave 0 |
| "Send to myself" triggers download + opens mail | manual-only | N/A — `mailto:` and download cannot be automated reliably | N/A |
| Auto-save to folder (File System Access API) | manual-only | N/A — `showDirectoryPicker()` requires user gesture; Playwright can mock | Wave 0 (mock) |

### Wave 0 Gaps
- [ ] `tests/backup.spec.js` — covers export format, photo extraction, import replace, legacy import
- [ ] Playwright install if not present: `npm install --save-dev @playwright/test && npx playwright install chromium`

---

## Sources

### Primary (HIGH confidence)
- [JSZip official docs](https://stuk.github.io/jszip/) — API, examples, browser support, file loading
- [JSZip how to read a zip](https://stuk.github.io/jszip/documentation/howto/read_zip.html) — import pattern
- [JSZip examples](https://stuk.github.io/jszip/documentation/examples.html) — ZIP creation patterns
- [MDN showDirectoryPicker](https://developer.mozilla.org/en-US/docs/Web/API/Window/showDirectoryPicker) — API signature, browser support
- [Can I Use: showDirectoryPicker](https://caniuse.com/mdn-api_window_showdirectorypicker) — confirmed: Chrome 86+, Edge 86+, Firefox: no, Safari: no

### Secondary (MEDIUM confidence)
- [Chrome Developers: File System Access API](https://developer.chrome.com/docs/capabilities/web-apis/file-system-access) — `showDirectoryPicker` usage patterns and permission model
- [client-zip GitHub](https://github.com/Touffy/client-zip) — evaluated as alternative, ruled out (write-only)
- [JSZip npm package](https://www.npmjs.com/package/jszip) — confirmed v3.10.1 is current, 29.8 kB minified

### Tertiary (LOW confidence, noted for awareness)
- [AWARE7: mailto attach exploit](https://aware7.com/mailto-link-can-be-exploited-to-grab-sensitive-files/) — why browsers block auto-attach in mailto links; confirms two-step UX design is correct
- [cdnjs JSZip 3.10.1](https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js) — CDN URL confirmed (for downloading to self-host, not for use at runtime)

---

## Metadata

**Confidence breakdown:**
- Standard stack (JSZip): HIGH — official docs verified, self-hosting confirmed, version confirmed
- File System Access API support matrix: HIGH — caniuse.com confirmed Chrome 86+/Edge 86+ only
- Architecture patterns: HIGH — derived from existing codebase + official API docs
- Import conflict recommendation (replace): HIGH — project is single-user local app, merge would break on ID collision
- Photo MIME type handling: MEDIUM — standard data URL format, pattern is straightforward but not tested yet
- DirectoryHandle session persistence: MEDIUM — documented behavior but complex; simplified approach recommended

**Research date:** 2026-03-18
**Valid until:** 2026-09-18 (JSZip is stable; File System Access API support may expand — check MDN before implementation)
