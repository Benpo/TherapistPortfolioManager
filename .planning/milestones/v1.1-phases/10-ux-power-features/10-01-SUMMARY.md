---
phase: 10-ux-power-features
plan: "01"
subsystem: add-client
tags: [ux, photo, crop, canvas, i18n]
dependency_graph:
  requires: []
  provides: [photo-crop-modal]
  affects: [add-client.html, assets/add-client.js, assets/app.css]
tech_stack:
  added: []
  patterns: [Canvas API, Pointer Events API, devicePixelRatio rendering]
key_files:
  created: []
  modified:
    - add-client.html
    - assets/add-client.js
    - assets/app.css
    - assets/i18n-en.js
    - assets/i18n-he.js
    - assets/i18n-de.js
    - assets/i18n-cs.js
decisions:
  - "Pure Canvas API with no external libraries — keeps bundle size zero"
  - "Cover-fit base scale ensures image always fills the rounded-square crop frame"
  - "JPEG at 85% quality for cropped output — good quality/size balance for avatars"
  - "Pointer Events (not Mouse/Touch) for unified desktop+mobile drag handling"
  - "devicePixelRatio canvas sizing for sharp rendering on retina displays"
  - "clampOffset() constrains pan so image always covers the frame (no black edges)"
  - "cropIsRecrop flag makes cancel non-destructive: reverts on new upload, keeps old on recrop"
metrics:
  duration: 15min
  completed_date: "2026-03-19"
  tasks_completed: 2
  files_modified: 7
---

# Phase 10 Plan 01: Photo Crop Modal Summary

**One-liner:** Canvas-based photo crop modal with cover-fit, pointer-event drag, zoom slider, and non-destructive cancel flow — pure Canvas API, no libraries.

## What Was Built

Added a full photo crop/reposition modal to the add-client page. After a user uploads a photo, a modal opens with a 300x300 canvas where they can drag to reposition and scroll/pinch/use a slider to zoom. Confirming the crop extracts the visible region as a JPEG (85% quality) and saves it as `photoData`. A "Recrop" button on existing photos allows re-editing at any time.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Crop modal HTML, CSS, and i18n keys | 37d930b | add-client.html, app.css, 4x i18n files |
| 2 | Canvas crop logic with drag, zoom, confirm/cancel | 1317e73 | assets/add-client.js |

## Key Implementation Details

**Canvas rendering:** Uses `devicePixelRatio` for sharp output on retina displays. The canvas DOM element is always 300x300 CSS pixels; the internal bitmap is scaled by DPR.

**Cover-fit base scale:** `Math.max(canvasW / img.naturalWidth, canvasH / img.naturalHeight)` ensures the image always covers the crop frame without black edges. Slider min is locked to this base scale so users can't zoom out below cover.

**Offset clamping:** `clampOffset()` constrains pan offsets so no canvas area is ever uncovered, preventing black borders in the cropped output.

**Zoom with center tracking:** When zoom changes via slider, offsets are recalculated to keep the canvas center point fixed, producing natural zoom behavior.

**Cancel behavior:**
- New upload cancel: clears `photoData`, hides preview, resets file input
- Recrop cancel: keeps existing `photoData` unchanged

**Edit mode recrop:** When editing an existing client that already has a photo, the recrop button is shown immediately.

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED
