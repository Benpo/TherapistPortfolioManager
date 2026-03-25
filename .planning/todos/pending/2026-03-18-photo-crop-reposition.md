---
created: 2026-03-18T20:00:00.000Z
title: Photo crop/reposition — let user move and center client photo
area: feature
priority: high
files:
  - assets/add-client.js
  - assets/add-client.html
---

## Problem

Photo crop exists on the add-client page but is **buggy when accessed from the session screen** (edit client via add-session page). The crop UI may not initialize properly or fail to save in that context.

Additionally, the crop UX could be improved — let user reposition/center within a frame.

## Known Bug (reported 2026-03-25)

Photo crop breaks when editing a client from the session screen. Needs investigation — likely the crop component isn't initialized when the edit-client flow is triggered from add-session context.

## Solution

1. Fix the crop bug when accessed from session screen
2. Improve crop UX: draggable/zoomable within circular or square frame
3. Ensure crop works consistently from both add-client and edit-client-from-session flows

## Origin

Sapir requested this — discussed in conversation. Bug from session screen reported by Ben 2026-03-25.
