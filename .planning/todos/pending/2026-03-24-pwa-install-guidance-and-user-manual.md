---
title: PWA install guidance + user manual
priority: medium
source: Phase 19 discuss-phase session
created: 2026-03-24
---

## Problem

Users won't discover PWA "Add to Home Screen" on their own — especially on Safari iOS where there's no automatic prompt. Non-technical therapists need explicit guidance.

## Scope

### In-app install prompt
- Detect if app is installable but not yet installed
- Show a friendly "Install Sessions Garden" banner/card after activation
- Browser-specific instructions (Chrome: click address bar icon, Safari: Share → Add to Home Screen, etc.)
- Dismissable, don't nag

### User manual / getting started guide
- How to access the app (URL, bookmark, PWA install)
- How offline works ("your data never leaves your browser")
- How backups work and why they matter
- How to activate on a new browser (and the 2-activation limit — using correct browser/endpoint terminology)
- How to deactivate and transfer
- Troubleshooting: cleared cache, lost data, re-activation

### Format
- Could be in-app help page, PDF, or hosted guide page
- Should be linkable from post-purchase email and from within the app

## Origin

Discovered during Phase 19 discuss-phase — Ben asked how PWA install works, realized non-technical users need hand-holding for this.
