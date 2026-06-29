---
created: 2026-03-24T23:35:00.000Z
title: Redesign app header — wider layout with consistent controls
area: ui
files: []
---

## Problem

The in-app header has several UX issues:
1. **Language selector inconsistency** — the app uses a different language selector style than the landing/legal pages. Should be unified.
2. **Two-row header** — the current header is too narrow, causing nav items to wrap into two rows (see screenshot: 5 nav tabs + "Add Session" overflow to second row).
3. **Dark/light mode toggle** — currently a standalone moon icon, not visually grouped with other controls.
4. **Manage license key** — currently a small key icon, not clearly identifiable as a button.

## Solution

Widen the app header to use more horizontal space, and in this redesign:
- **Language selector**: Replace with the same component used on landing/legal pages for consistency
- **Dark/light mode toggle**: Place next to language selector as a clear, equally-sized button
- **Manage license key**: Convert from small icon to a real-size button matching the language and dark/light controls
- This wider layout should also eliminate the two-row wrapping issue for navigation tabs
