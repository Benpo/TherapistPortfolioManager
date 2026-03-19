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

When a user uploads a client photo, it gets displayed as-is. There's no way to reposition, crop, or center the photo. If the photo is off-center or poorly framed, the user is stuck with it.

## Solution

Add a photo editing step after upload:
1. Show the uploaded image in a draggable/zoomable crop area
2. Let the user move and center the photo within a circular or square frame
3. Save the cropped result as the client photo

## Origin

Sapir requested this — discussed in conversation, not previously tracked.
