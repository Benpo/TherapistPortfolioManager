---
created: 2026-07-10T21:40:00Z
title: "Header popovers are not mutually exclusive — '?' and language menus can overlap"
area: header-chrome
severity: minor
source: Ben, v1.3.0 go-live evening testing (2026-07-10)
---

## Problem

Clicking "?" and then immediately the language (globe) selector leaves BOTH
popovers open, overlapping each other (language list peeks out from under the
help menu — screenshot in session). Each popover closes on outside-click /
its own toggle, but opening one does not close the other. The help popover
reused the globe-popover pattern (Phase 39) — the two instances don't know
about each other; same likely applies to any future popover siblings.

## Fix direction

Small: when any header popover opens, close all other open header popovers
first (shared close-siblings helper or a document-level "popover-open" event).
Check the demo header variant too. Add a jsdom case: open globe → open "?" →
assert globe popover is closed (and vice versa).

## Scope note

Ben triaged as minor, fix-tomorrow (2026-07-10). Not part of the go-live
incident (present in v1.3.0 as shipped; both popovers work individually).
