---
created: 2026-03-24T23:29:39.733Z
title: "CRITICAL: Fix demo section — obsolete version and broken mobile layout"
area: ui
priority: critical
files: []
---

## Problem

The Demo section on the main/landing page has multiple issues:
1. **Obsolete app version** — the demo shows an old version of the app, not the current one
2. **Broken mobile layout** — table is trimmed on mobile, headers extend beyond the table boundaries
3. **Missing translations** — column names show raw i18n keys (e.g. "overview.table.actions") instead of translated text

## Solution

1. Update the demo to reflect the current app version
2. Fix responsive table layout for mobile viewports (consider horizontal scroll or stacked layout)
3. Ensure all i18n keys in the demo table are properly resolved
