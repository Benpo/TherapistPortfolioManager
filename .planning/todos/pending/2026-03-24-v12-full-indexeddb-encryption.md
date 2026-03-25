---
title: "v1.2: Full IndexedDB encryption with PIN/passphrase"
priority: high
source: Phase 19 discuss-phase session
created: 2026-03-24
---

## What

Encrypt all IndexedDB data at rest using a user-provided PIN or passphrase. Web Crypto API (PBKDF2 key derivation + AES-256-GCM encryption). Every read/write goes through encrypt/decrypt layer.

## Why

Client session data (emotions, severity ratings, personal notes) is sensitive. Even though the app is local-only, data is stored in plaintext on disk. A stolen device with no disk encryption exposes everything. Ben's position: "people are irresponsible and would handle data carelessly."

## Scope

- PIN/passphrase entry on every app open (configurable timeout later)
- All IndexedDB writes encrypted before storage
- All IndexedDB reads decrypted after loading
- Migration path: unencrypted → encrypted (one-time on PIN setup)
- Backup files already encrypted in v1.1 (LIVE-08) — ensure compatibility
- PIN forgotten = data gone forever (by design, no recovery)
- Touches: db.js, backup.js, add-client.js, add-session.js, overview.js, sessions.js, reporting.js

## Why deferred from v1.1

Touches entire data layer. Doing it rushed risks data loss bugs, which is worse than plaintext. Encrypted backups (v1.1) cover the most vulnerable artifact (files that leave the browser).

## Origin

Phase 19 discuss-phase — agreed to defer after discussing scope vs launch timeline.
