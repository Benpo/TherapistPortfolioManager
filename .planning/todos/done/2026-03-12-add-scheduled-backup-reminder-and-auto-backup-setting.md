---
created: 2026-03-12T11:57:45.893Z
title: Add scheduled auto-backup and backup settings UI
area: ui
files: []
---

## Problem

The 7-day backup reminder banner and manual backup-to-folder feature already exist. What's missing is **scheduled automatic backups** and a **settings UI** to configure backup preferences. Users can't set a backup interval or have backups run automatically.

## What's Already Done
- 7-day passive reminder banner (shows after 7 days without backup)
- Folder picker for manual auto-save destination
- Encrypted backup (.sgbackup) with AES-256-GCM

## Remaining Work
1. **Settings UI** — backup frequency selector (daily/weekly/monthly)
2. **Scheduled auto-backup** — interval-based automatic backup to chosen folder
3. **Configurable reminder frequency** — let user choose reminder interval instead of hardcoded 7 days
