# Phase 25: Backup Architectural Rework — Context

**Gathered:** 2026-05-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Rework the app's backup architecture end-to-end: fix the "Send to myself" security/UX hole, consolidate the overview backup cluster into a single Backup & Restore surface, fold scheduled-backup into the rework, add backup-health awareness signals (chip + in-modal indicator + test-password dry-run), and reduce backup payload size by reworking photo handling (resize-on-upload + crop-only storage + dedicated Photos settings section).

The phase has expanded well beyond the original N7 bug because the user explicitly asked to "expand wherever possible" — every expansion serves the same domain (backup trustworthiness, portability, and discoverability for a sellable v1.1 product).

New capabilities outside this domain (in-app onboarding/help, full IDB encryption) belong in their own phases.

</domain>

<decisions>
## Implementation Decisions

### Area 1 — Send-to-Myself Fix

- **D-01:** Remove the "Send backup to myself" button entirely from the overview. **Reason:** the current `BackupManager.sendToMyself()` (assets/backup.js:882) calls the unencrypted `exportBackup()` directly, bypassing the encrypt/skip-encryption modal that the regular Export flow goes through. This is a security regression, not just a UX bug. Removing it closes a privacy hole.
- **D-02:** Add **Web Share API** as a destination *inside* the existing encrypt-aware export dialog (the passphrase/skip modal from Phase 22-15). On platforms supporting `navigator.share({ files: [...] })` (iOS Safari, Chrome Android, Safari macOS 13+), invoke the share sheet so the file actually attaches to whatever destination the user picks (Mail / Drive / AirDrop / etc.). Fallback for unsupported browsers: download + open mailto with an HONEST body ("Backup downloaded to your Downloads folder. Please attach `<filename>` to this email manually.")
- **D-03:** Rename the share affordance to **"Share backup"** (4-locale: EN "Share backup" / HE "שיתוף גיבוי" noun form per Phase 24 D-05 / DE "Backup teilen" / CS "Sdílet zálohu"). Honest under both Web Share and mailto-fallback paths.
- **D-04:** All "Share" paths INHERIT the encryption choice made in the export dialog — if user chose encrypted, the shared file is `.sgbackup`; if user explicitly skipped encryption, it's the unencrypted ZIP. Never a separate "skip encryption" path hidden inside Share.

### Area 2 — 3-Button Consolidation + Entry Point

- **D-05:** **Single "Backup & Restore" surface** opened from the overview. The 3 dominant buttons (Export, Import, Send) collapse to ONE entry point.
- **D-06:** Implementation pattern: **modal**, NOT a separate page. Reasons: keeps backup co-located with overview where the user actually thinks about their data; reuses the existing modal/dialog plumbing (`assets/app.js` modal helpers); cleanest 4-locale story; preserves PWA install-screen real estate. (Recommendation B from N7 confirmed.)
- **D-07:** Modal layout: **Export prominent (top, full visual weight) + Import secondary (bottom section, smaller, with a clear destructive warning).** NOT a 50/50 dual-pane split. Reason: export should drive habit (frequent, encouraged), import is rare and destructive — equal visual weight risks mis-clicks. Co-location preserved so the new-device-restore flow is still discoverable.
- **D-08:** Entry point on overview: **one clearly-labeled button** ("Backup & Restore" or "Backup") replacing the current 3-button cluster. Position: same card area as today, but the button cluster shrinks. Exact placement (header chip vs in-card vs nav) — planner's discretion within the constraint that it must be highly noticeable.

### Area 3 — Surface Contents (What Goes Inside the Modal)

- **D-09:** **Backup contents visibility** — the modal explicitly shows what is inside the backup file, with checkmark icons + brief one-line descriptions:
  - ✓ Clients
  - ✓ Sessions
  - ✓ Snippets (Phase 24)
  - ✓ Settings (therapistSettings rows)
  - ✓ Photos (cropped, optimized)
  Builds user trust + flags if anything's missing in future phases. Must update whenever a new IDB store is added.
- **D-10:** **Last-backup-at indicator inside the modal header** — "Last backup: 3 days ago" (or "Never"). Reinforces the habit at the moment the user opens the dialog. Source: existing `localStorage.portfolioLastBackup` (or equivalent — planner picks).
- **D-11:** **Backup folder picker** is NOT a standalone overview button anymore. It moves INSIDE the scheduled-backup settings (the folder is the destination for scheduled writes — they're a single logical concept now).
- **D-12:** **Test-backup-password dry-run** — a "Test backup password" action inside the modal (or in Settings — planner picks the cleanest home). User uploads a backup file + enters the password; the app verifies the password decrypts the file but does NOT restore anything. Safety net against the worst-case "I have my backup but forgot the password" scenario. Clear instructions: "This only checks your password works. Your current data is not touched."

### Area 4 — Backup Awareness on Overview (Chip)

- **D-13:** **Passive "last backup" chip on overview**, color-thresholded. Always present (not only when overdue) — gives positive reinforcement when fresh.
- **D-14:** **Color thresholds couple to schedule state:**
  - Schedule OFF (default): green ≤7 days, warning ≤14 days, danger >14 days.
  - Schedule ON: green ≤ chosen interval, warning ≤ interval × 1.5, danger > interval × 2.
- **D-15:** **Schedule ↔ banner ↔ chip coupling:**
  - Schedule OFF: existing 7-day reminder banner stays as today. Chip provides passive signal.
  - Schedule ON: **suppress the 7-day reminder banner entirely** — the scheduled interval-end prompt IS the reminder. Banner-and-schedule never compete. Chip remains as the constant indicator across both modes.

### Area 5 — Scheduled-Backup Fold (Folded from TODO 2026-03-12)

- **D-16:** **Frequency selector** — Off (default for new users) / Daily / Weekly / Monthly / Custom days. Lives in Settings (new "Backups" section or under the existing Backup modal — planner picks the cleanest home).
- **D-17:** **Interval-end prompt** — when the chosen interval elapses, a modal pops asking the user to back up now. Always downloads (no silent folder-write in this phase — that's a follow-up). Pre-fills filename + offers Share.
- **D-18:** **Password mandatory for scheduled backups** — user CANNOT enable a schedule without setting up a backup password. Reason (user-stated): "Data is sensitive and crucial, and people won't express the importance themselves if we allow them to skip passwords." Forces the encryption nudge for users who opt into automation.
- **D-19:** **Suppress 7-day banner when schedule is ON** (coupling decision, also in D-15). Once schedule is enabled, the banner is muted permanently. Re-enables if user turns schedule off again.
- **D-20:** **Auto-save to chosen folder is OUT of scope this phase.** Surface-only: scheduled prompts always download via the browser. Silent folder-write can be added later as a power-user opt-in if there's demand.

### Area 6 — Photo Handling (Resize + Crop-Only Storage)

- **D-21:** **Resize on upload** — when a photo is selected (`add-client.js` / crop flow), draw it onto a canvas at **max 800px on long edge** and re-export as **JPEG at quality 0.75**. Typical output: 80-120KB per photo. 100 clients = ~10MB total. No external library needed — uses the canvas API already present for cropping. (Confirmed by user 2026-05-15.)
- **D-22:** **Store only the final cropped/positioned photo, NOT the original.** The app only ever renders the cropped view; the original is dead weight. Crop UI runs once at upload time against a temporary canvas — only the final cropped 800px/0.75 JPEG hits IndexedDB. Re-cropping later = re-upload. Maximum storage win. **This means future plans should NOT restore the "store original + crop metadata" pattern even if it appears in prior phase docs.**
- **D-23:** **No hard upload-size cap on original input.** Browsers can handle multi-MB phone photos through canvas resize without issue. Aggressive downscale + crop-only storage make the input size effectively irrelevant. (If we hit memory issues in testing, planner can add a safety cap, but it should not be the primary defense.)
- **D-24:** **Existing photos:** add an optional one-time **"Optimize photos"** action — NOT auto-migration. User explicit consent + clear preview of savings. Lives in the new Photos Settings section (D-25).
- **D-25:** **New dedicated "Photos" section in Settings** with:
  - Current photo storage usage display ("Photos are using 47 MB of your storage")
  - "Optimize all photos" button — shows **estimated savings before running** ("Saves approximately 35 MB"). Confirmation prompt. Runs all photos through the same canvas resize pipeline.
  - "Delete all photos" button — destructive, with a strong warning ("This removes all client photos. Client records stay. Cannot be undone.").
  - Toast on success/failure for each operation.

### Cross-Cutting Requirements

- **D-26:** **Every new surface (modal, Settings section, prompt) MUST have clear headers + instructions.** No bare button grids. Every section gets a one-line description of what it does and what happens when the user clicks. The app currently has minimal in-app guidance; Phase 25 deliberately raises that bar for backup-related surfaces (Phase 26 will tackle the rest of the app via the onboarding/help system).
- **D-27:** **Hebrew strings use noun/infinitive forms (per Phase 24 D-05).** No imperatives in Hebrew. Inherited convention — non-negotiable.
- **D-28:** **4-locale parity (EN/HE/DE/CS) for every new UI string.** Existing convention.
- **D-29:** **Backup round-trip completeness** is a hard acceptance criterion. The export must include every IDB store currently defined in `assets/db.js` (clients, sessions, therapistSettings, snippets, photos), and import must restore all of them losslessly. This is a regression-guard: future stores added to db.js MUST be added to `BackupManager.exportBackup` and `normalizeManifest` in the same change.
- **D-30:** **Single-source-of-truth pattern** (per Phase 24 D-01) — any logic touched by both the new export dialog and Settings (e.g., password validation, schedule fire, photo resize) should be one function with multiple callers.

### Claude's Discretion

- **Exact modal layout** — within the constraint that Export is prominent and Import is secondary, the planner picks the specific visual treatment.
- **Where the "Test backup password" feature lives** — inside the Backup modal vs. inside Settings. Planner picks whichever creates the cleanest information architecture.
- **Where the "Backup folder" picker UI lives** — inside scheduled-backup Settings section vs. inside the Backup modal. Constraint: it must be co-located with the schedule it serves.
- **Storage-usage display unit** — MB vs KB, formatting precision. Planner picks human-friendly defaults.
- **Modal entry button label & position on overview** — within the constraint that it must be visually prominent enough that users remember to back up. Could be a labeled button, a labeled icon button, or a "card-style" affordance.

### Folded Todos

1. **`2026-03-12-add-scheduled-backup-reminder-and-auto-backup-setting.md`** — scheduled auto-backup + settings UI + configurable reminder frequency. Folded fully (D-16 through D-20). Original cross-reference in the N7 todo flagged it as a fold candidate. The fold scope: frequency selector + interval-end prompt + password-mandatory rule + banner suppression. Silent folder-write is intentionally deferred (D-20).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & origin
- `.planning/ROADMAP.md` §"Phase 25: Backup architectural rework" — original scope statement (N7 fix + 3-button consolidation) before expansion.
- `.planning/todos/pending/2026-05-13-backup-architectural-rework-N7.md` — source TODO with bug detail and original A/B/C/D fix options.
- `.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-HUMAN-UAT.md` §N7 — original user-reported finding with full reasoning.

### Folded TODO
- `.planning/todos/pending/2026-03-12-add-scheduled-backup-reminder-and-auto-backup-setting.md` — the scheduled-backup TODO that's been folded into this phase (D-16 through D-20).

### Code touchpoints (mandatory reads for the planner)
- `assets/backup.js` — BackupManager module. Key functions: `exportBackup` (line 518), `exportEncryptedBackup` (line 643), `sendToMyself` (line 882, to be removed), `normalizeManifest` (line 472, must continue to handle every store), `pickBackupFolder` (line 928), `autoSaveToFolder` (line 949), `isAutoBackupSupported` (line 912).
- `assets/db.js` — IndexedDB schema. Current `DB_VERSION = 5`. Stores: `clients` (line 193), `sessions` (line 197), `therapistSettings` (line 253), `snippets` (line 263). Phase 25 should NOT bump DB_VERSION unless a new store is genuinely required (planner: prefer scoping into existing stores).
- `assets/crop.js` — photo crop utility. Where photo resize-on-upload (D-21) and crop-only storage (D-22) integrate.
- `assets/add-client.js` — client photo upload entry point.
- `index.html` lines 99-115 — the current 5-button overview cluster (the consolidation target).
- `assets/overview.js` lines 60-135 — handlers for `exportBtn`, `importInput`, `sendBackupBtn`, `autoBackupBtn` (the JS side of the cluster).
- `assets/i18n-{en,he,de,cs}.js` — 4-locale string files. Every new UI string lands in all four. Existing keys to retire: `overview.sendBackup` (D-01 removes the button). Existing keys to keep/extend: `overview.export`, `overview.import`, `overview.autoBackup`.

### Prior phase conventions that apply
- `.planning/phases/24-pre-launch-final-cleanup/24-CONTEXT.md` §Item 2 D-05 — Hebrew noun/infinitive convention (applies to all new strings).
- `.planning/phases/24-pre-launch-final-cleanup/24-CONTEXT.md` §Item 1 D-01 — single-source-of-truth pattern (applies to any logic shared between modal + Settings).
- `.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-CONTEXT.md` — encryption UX work N11/N12. Phase 25 must NOT regress.

### Project state
- `.planning/PROJECT.md` — Sessions Garden core value: "data never leaves the device." Phase 25 reinforces this; no backend send is added (D-01 explicitly rejects backend SMTP).
- `.planning/STATE.md` — current milestone status.
- `CLAUDE.md` (project root) — Lemon Squeezy store note, git pull rule.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`BackupManager.exportEncryptedBackup` (backup.js:643)** — already shows passphrase modal, builds ZIP, encrypts to `.sgbackup`. The Web Share API integration (D-02) hooks in AFTER this returns the encrypted blob, before the download is triggered. Same insertion point handles the unencrypted path through `exportBackup`.
- **`BackupManager.normalizeManifest` (backup.js:472)** — already defensively handles new stores (Phase 22 added therapistSettings, Phase 24 added snippets via defaults). Continue this pattern: any new store gets defaulted here so old backups stay restorable.
- **`navigator.share` with files** — supported on iOS Safari 15+, Safari macOS 13+, Chrome Android 75+, Chrome desktop 89+. Feature-detect with `navigator.canShare({ files: [...] })`. Fallback path: existing mailto-with-honest-body.
- **`navigator.storage.estimate()`** — built-in browser API, returns `{ usage, quota }` in bytes. Use for the Photos Settings storage-usage display (D-25) without rolling our own accounting.
- **Canvas API used by `assets/crop.js`** — already drawing to canvas. Resize-on-upload (D-21) extends the same drawing pipeline with a max-dimension calculation before `.toBlob('image/jpeg', 0.75)`. No new library.
- **`showDirectoryPicker` / File System Access API** — already wrapped in `pickBackupFolder` / `autoSaveToFolder`. Moves into scheduled-backup settings UI per D-11.
- **`localStorage` keys** — `portfolioLang`, `portfolioAutoBackupEnabled`, plus whatever last-backup-timestamp key already exists (planner: check `assets/backup.js` and `assets/overview.js` for the existing 7-day reminder logic to find the canonical key).

### Established Patterns

- **Modal helpers** — `assets/app.js` has the confirm-card pattern (Phase 21) used for destructive actions. The Backup & Restore modal (D-06) can reuse this.
- **Toast notifications** — `App.showToast(messageOrEmpty, i18nKey)` (called throughout backup.js) for success/failure feedback. Used for D-25 photo optimize/delete results.
- **i18n key lookup** — `data-i18n="key.path"` attributes resolved by `assets/i18n.js`. All new strings follow this pattern, no inline English.
- **Defensive store reads** — `try { db.getAllX() } catch { use empty }` pattern in backup.js. Continue for any new store touch points.
- **4-locale parity** — every new UI string lands in all of `i18n-en.js`, `i18n-he.js`, `i18n-de.js`, `i18n-cs.js`. Hebrew specifically uses noun/infinitive forms (Phase 24 D-05).
- **Pre-commit `sw.js` CACHE_NAME bump** — automatic when asset files change. If `PRECACHE_URLS` needs to grow (new assets added), follow up with a manual chore commit.

### Integration Points

- **Overview backup cluster (`index.html:99-115`) → single button.** Most-removed code area. The new entry point replaces the cluster; surrounding `inline-actions` flex container stays.
- **Export dialog (`backup.js:exportEncryptedBackup`) → add Share-via-Web-Share-API hook.** Hooks into the existing passphrase-or-skip path. Existing UX preserved if Share is unavailable.
- **`add-client.js` photo upload → resize pipeline.** Insertion is at the moment a photo blob is ready, before it's stored. Crop UI now operates on the in-memory canvas and the result (only) is persisted.
- **New Settings section "Photos"** — sits alongside existing Settings rows. Reuses `therapistSettings` if any state is persisted there (e.g., "I dismissed the optimize prompt"); otherwise pure UI calling Backup/Photo utility functions.
- **Scheduled-backup logic** — new module or extension to `backup.js`. Fires the interval-end prompt; checks `portfolioLang` for locale; pre-fills filename; reuses the existing encryption dialog.

</code_context>

<specifics>
## Specific Ideas

- **"Test backup password" must be obviously safe** — the modal explicitly states the user's current data is NOT touched. Worst-case scenario this protects against: therapist has a backup file but forgets the password and only discovers this when they actually need to restore.
- **Schedule modes must be presented as opt-in, not default.** New users default to "Off" so we don't surprise them with prompts.
- **Photo crop-only storage is a hard decision, not a soft one.** Future phases should not regress this by re-introducing original-file storage. Crop = canonical.
- **Honest copy on every share path.** No "Please find attached" lies. Either the share sheet actually attaches (Web Share API path) or the body says "downloaded — please attach manually" (mailto fallback path).
- **Backup-contents checklist must update when new stores are added.** Make this an enforceable convention — if a new IDB store ships without updating the backup-contents display, that's a regression.

</specifics>

<deferred>
## Deferred Ideas

- **Silent auto-save to chosen folder on schedule fire** — D-20 explicitly defers this. Reason: keeping user in the loop on every backup is privacy-respecting and avoids surprises (folder permissions can lapse, file collisions, etc.). Revisit if a power-user demand emerges.
- **In-app onboarding / help system** — separate Phase 26 (see ROADMAP.md and TODO `2026-05-15-in-app-onboarding-overview-help.md`). The "every surface needs clear headers + instructions" rule in Phase 25 (D-26) is a local instance of that broader concern; Phase 26 tackles the rest of the app.
- **v12 full IndexedDB encryption** — `2026-03-24-v12-full-indexeddb-encryption.md`. Out of scope per ROADMAP. Separate huge phase.
- **PWA install guidance + user manual** — `2026-03-24-pwa-install-guidance-and-user-manual.md`. Folds into Phase 26, not Phase 25.
- **Re-crop UI on existing photos** — D-22's crop-only storage means re-crop = re-upload. If users frequently want to re-crop without re-uploading, a future phase could keep a low-res "original" alongside the cropped version. Out of scope for now.
- **Per-client photo size budget / quotas** — could be a future concern if the dedicated Photos settings (D-25) reveals power users with many photos. Out of scope for now.
- **Backend-mediated send** (option D from N7) — explicitly rejected. Would add a data processor, expand GDPR scope, require Datenschutz update. Sessions Garden core value ("data never leaves the device") rules this out.

### Reviewed Todos (not folded)

- **`2026-03-24-pwa-install-guidance-and-user-manual.md`** — overlapping with the cross-cutting requirement D-26 ("every surface needs clear headers + instructions"), but the broader scope (PWA install + user manual + activation/deactivation flows) is too large for Phase 25 and belongs in Phase 26. The local requirement D-26 satisfies the Phase 25 portion.
- **`2026-03-24-v12-full-indexeddb-encryption.md`** — out of scope per ROADMAP.
- **`2026-03-24-deactivation-data-loss-warning.md`** — adjacent (data preservation context) but distinct from backup architecture; left in pending queue.

</deferred>

---

*Phase: 25-backup-architectural-rework*
*Context gathered: 2026-05-15*
