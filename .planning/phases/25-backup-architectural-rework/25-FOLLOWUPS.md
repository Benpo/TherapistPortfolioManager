# Phase 25 — Deferred follow-ups

Captured 2026-05-16. The HIGH item is a deliberate Ben deferral (not
non-blocking by nature) — flagged for a decision before the app is actively
marketed to therapists. The code-review items are minor.

## Promoted to its own ROADMAP phase

- **Phase 27 — Backup & Restore modal visual cohesion (UI-SPEC pass).**
  Phase 25 UAT item #1 (Ben: modal has "too many colors/formats/styling,
  not thought through"). Agreed 2026-05-16 to defer the visual redesign to
  a dedicated `/gsd-ui-phase 27` while Phase 25 shipped the functional
  fixes. Full scope in `.planning/ROADMAP.md` → "Phase 27".

## HIGH — deferred by decision (Ben, 2026-05-16)

- **GAP-25-H1 — Web Share "send to myself" broken on desktop Safari.**
  `navigator.canShare({files})` false-positives on Safari macOS for the
  application/octet-stream `.sgbackup`; `navigator.share()` then resolves
  WITHOUT delivering the file and does NOT throw, so the throw/AbortError
  fallback at `assets/backup.js:780-788` never fires. Result on Sapir's
  platform (Safari macOS): Share→Mail composes an empty email; Share→Messages
  never opens. Export/download + restore + crypto are unaffected and work.
  Web Share file delivery is effectively mobile-only.
  - **Decision still open:** desktop UX — (a) hide Share on desktop + add an
    honest "Email to myself" (download + mailto with manual-attach copy), or
    (b) desktop = Export-download only, no mailto. Ben deferred this product
    call 2026-05-16.
  - **Recommended:** make Web Share strictly mobile-gated (do NOT trust
    `canShare` on desktop — also require coarse-pointer / maxTouchPoints);
    desktop falls to the reliable Export path. Pick (a) vs (b) when resumed.
  - Files: `assets/backup.js` (isShareSupported / shareBackup),
    `assets/backup-modal.js` (probeShareSupport gating).
  - Tracked in `25-HUMAN-UAT.md` (GAP-25-H1) — resurfaces in `/gsd-progress`
    until `/gsd-verify-work 25`.
- **#2 mailto fallback — UNVERIFIED (not failed).** No Firefox available to
  test the no-Web-Share path. Carry forward; verify on a Web-Share-less
  browser before relying on it.

## LOW — code-review minor items (non-blocking by nature)

- **WR-02** `assets/app.js` (~786-792): `confirmDialog` placeholder path
  strips `data-i18n` from the shared modal, so an open dialog won't
  re-translate if the user switches language mid-dialog. Edge case.
- **WR-03** `assets/settings.js` (~2504-2509): `{n}` photo count and `{size}`
  savings estimate use different photo-field coverage (`photoData` only vs
  `photoData || photo`), so the count and the size can disagree slightly.
  Cosmetic — no data corruption.
- **Info-1** markup duplication (static index.html modal + injected copy —
  intentional, static wins; cosmetic dedupe only).
- **Info-2** stale comment.
- **Info-3** dead pre-reload DOM work.
- **Info-4** pre-existing `tx.onabort` gap (not introduced by phase 25).
