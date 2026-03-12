---
created: 2026-03-12T11:57:45.893Z
title: Add scheduled backup reminder and auto-backup setting
area: ui
files: []
---

## Problem

Currently there is no way for the user to schedule automatic backups or receive reminders to back up their data. Users may forget to back up important portfolio/client data, risking data loss.

## Solution

Add a settings screen option where the user can:
1. **Set a fixed reminder interval** — choose how often to receive a backup reminder notification (e.g., daily, weekly, monthly)
2. **Enable automatic backup** — toggle auto-backup that runs on the chosen schedule without manual intervention
3. Support configurable backup frequency (time interval selection)
4. Persist the user's backup preferences in app settings
5. Trigger local notifications for backup reminders when auto-backup is not enabled
