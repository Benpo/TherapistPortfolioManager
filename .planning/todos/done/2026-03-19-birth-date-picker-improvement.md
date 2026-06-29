---
created: 2026-03-19T12:00:00.000Z
title: Improve birth date picker — faster year selection for distant years
area: ux
priority: medium
files:
  - assets/add-client.js
  - add-client.html
---

## Problem

The current date picker for client birth date requires scrolling/dragging backward month by month, which is very slow for selecting dates decades in the past. Not efficient for the therapist.

## Solution

Options:
1. Add a separate year dropdown/input alongside the date picker
2. Use a date input that allows direct typing (YYYY-MM-DD)
3. Replace with a custom picker that has year/month jump controls

## Origin

Sapir requested during Phase 10 discuss-phase — deferred as separate UX improvement.
