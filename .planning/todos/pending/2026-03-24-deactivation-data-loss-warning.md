---
title: Show stronger deactivation warning when client data exists
priority: medium
source: UAT Phase 19
created: 2026-03-24
---

## Issue

When a user deactivates their license, data is NOT deleted — it stays in IndexedDB. But the user might think it is. The current confirmation dialog only warns about re-activation needing internet.

## Proposed Fix

Before showing the deactivation confirmation:
1. Open the IndexedDB `portfolio` database
2. Count clients in the `clients` object store
3. If clients > 0, show an enhanced "ARE YOU REALLY SURE?" dialog with:
   - "You have {N} clients and their session data in this browser"
   - "Your data will NOT be deleted, but you will need to reactivate to access it"
   - "We strongly recommend exporting a backup before deactivating"
   - Two-step confirmation (checkbox + button)

## Context

Data persists in IndexedDB after deactivation. The license gate prevents access but doesn't delete anything. A backup before deactivation ensures the user has a copy.
