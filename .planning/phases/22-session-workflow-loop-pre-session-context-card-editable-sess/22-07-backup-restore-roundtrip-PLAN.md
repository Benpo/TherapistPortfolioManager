---
phase: 22-session-workflow-loop-pre-session-context-card-editable-sess
plan: 07
type: execute
wave: 3
depends_on:
  - 02   # Needs PortfolioDB.getAllTherapistSettings + setTherapistSetting
files_modified:
  - assets/backup.js
autonomous: true
requirements:
  - REQ-18   # Backup/restore extended to round-trip therapist settings; backward-compat with pre-Phase-22 backups
user_setup: []

must_haves:
  truths:
    - "Backup ZIP manifest includes a therapistSettings array with the full row set from PortfolioDB.getAllTherapistSettings"
    - "Manifest version bumps from 1 to 2"
    - "normalizeManifest defaults manifest.therapistSettings to [] when missing (pre-Phase-22 backups)"
    - "Restore loop iterates manifest.therapistSettings and calls PortfolioDB.setTherapistSetting per row AFTER db.clearAll() has run"
    - "Restoring a v0 or v1 backup (no therapistSettings field) succeeds without errors and applies all-defaults silently"
    - "Restoring a v2 backup with custom labels + disabled sections preserves those values exactly"
    - "Encrypted-backup path inherits this support automatically because it wraps the same exportBackup/importBackup primitives"
  artifacts:
    - path: "assets/backup.js"
      provides: "manifest version 2, therapistSettings field in export, normalizeManifest defaults to [], restore loop calls setTherapistSetting"
      contains: "therapistSettings"
  key_links:
    - from: "assets/backup.js exportBackup"
      to: "PortfolioDB.getAllTherapistSettings"
      via: "await before manifest construction"
      pattern: "getAllTherapistSettings"
    - from: "assets/backup.js importBackup restore loop"
      to: "PortfolioDB.setTherapistSetting"
      via: "for-loop over manifest.therapistSettings"
      pattern: "setTherapistSetting"
    - from: "assets/backup.js normalizeManifest"
      to: "default empty array"
      via: "if (!manifest.therapistSettings) manifest.therapistSettings = []"
      pattern: "manifest\\.therapistSettings"
---

<objective>
Extend backup.js so therapist settings (custom labels + disabled flags) survive a backup/restore cycle. Backward compatibility is non-negotiable: a backup created in Phase 21 (no therapistSettings field) MUST restore cleanly with all sections defaulted to enabled.

Purpose: REQ-18 is part of the SPEC's Cross-cutting integrations. Without this, a therapist who restores from backup loses their customization.

Output: Single file modified — assets/backup.js — with manifest v2 export, normalizeManifest defaults, and the restore loop extension.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-SPEC.md
@.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-CONTEXT.md
@.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-PATTERNS.md
@assets/backup.js

<interfaces>
PortfolioDB API used (from Plan 02):
  await PortfolioDB.getAllTherapistSettings()
  await PortfolioDB.setTherapistSetting(record)
  await PortfolioDB.clearAll()  // already includes therapistSettings clear in Plan 02

Manifest schema after this plan:
  {
    version: 2,
    exportedAt: ISO,
    appVersion: "1.0",
    clients: [...],
    sessions: [...],
    therapistSettings: [{ sectionKey, customLabel, enabled }, ...],   // NEW
    settings: { language, theme }
  }

normalizeManifest must handle three input cases:
  1. version: 0 — legacy, no top-level version field. Add therapistSettings: [].
  2. version: 1 — Phase 7 ZIP era, no therapistSettings. Add therapistSettings: [].
  3. version: 2 — Phase 22+. Validate therapistSettings is an array; default to [] if missing/malformed.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Extend exportBackup, normalizeManifest, importBackup restore loop in assets/backup.js</name>
  <files>assets/backup.js</files>
  <read_first>
    - assets/backup.js (full file — exportBackup at lines 357-420; manifest construction at 391-401; normalizeManifest at 326-343; importBackup at 503-610; restore loop at 599-604; clearAll call at line 597)
    - .planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-PATTERNS.md (section "assets/backup.js (modified) — round-trip therapistSettings, backward-compat" — full code excerpts for all three changes)
    - .planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-02-db-migration-app-cache-i18n-PLAN.md (verifies clearAll includes therapistSettings)
  </read_first>
  <action>
    Apply THREE changes inside assets/backup.js. Do NOT modify any other functions.

    A. exportBackup() — extend manifest construction (around lines 391-401):

       Find the existing block:
         var allClients = await db.getAllClients();
         var allSessions = await db.getAllSessions();
         // ...
         var manifest = {
           version: 1,
           exportedAt: new Date().toISOString(),
           appVersion: "1.0",
           clients: clientsClean,
           sessions: allSessions,
           settings: { language: ..., theme: ... },
         };

       Modify to:
         var allClients = await db.getAllClients();
         var allSessions = await db.getAllSessions();
         var allTherapistSettings = [];
         try {
           if (typeof db.getAllTherapistSettings === "function") {
             allTherapistSettings = await db.getAllTherapistSettings();
           }
         } catch (e) {
           console.warn("Backup: therapistSettings read failed; exporting empty:", e);
           allTherapistSettings = [];
         }
         // ...
         var manifest = {
           version: 2,                              // bumped from 1
           exportedAt: new Date().toISOString(),
           appVersion: "1.0",
           clients: clientsClean,
           sessions: allSessions,
           therapistSettings: allTherapistSettings, // NEW
           settings: { language: ..., theme: ... },
         };

    B. normalizeManifest(manifest) — extend (around lines 326-343):

       Add defaulting + validation for therapistSettings BEFORE the existing version: 0 fallback path:
         function normalizeManifest(manifest) {
           if (!manifest || typeof manifest !== "object") {
             throw new Error("Invalid backup manifest");
           }
           // Phase 22: ensure therapistSettings exists and is an array.
           if (!Array.isArray(manifest.therapistSettings)) {
             manifest.therapistSettings = [];
           }
           if (!manifest.version) {
             return {
               version: 0,
               exportedAt: manifest.exportedAt || null,
               appVersion: manifest.appVersion || null,
               clients: manifest.clients || [],
               sessions: manifest.sessions || [],
               therapistSettings: [],   // explicit empty for v0 legacy
               settings: manifest.settings || null,
             };
           }
           return manifest;
         }

       Validate per-row schema lazily — the restore loop in (C) wraps each setTherapistSetting in a try/catch so a malformed row does not abort the whole restore.

    C. importBackup() restore loop — extend (around lines 599-604):

       Find the existing block (after `await db.clearAll();`):
         for (var i = 0; i < manifest.clients.length; i++) await db.addClient(manifest.clients[i]);
         for (var j = 0; j < manifest.sessions.length; j++) await db.addSession(manifest.sessions[j]);

       Add a third loop AFTER the sessions loop:
         for (var k = 0; k < manifest.therapistSettings.length; k++) {
           var rec = manifest.therapistSettings[k];
           if (!rec || typeof rec !== "object" || typeof rec.sectionKey !== "string") {
             console.warn("Backup restore: skipping malformed therapistSettings row", rec);
             continue;
           }
           // Whitelist sectionKey to prevent storing arbitrary keys from a crafted backup.
           var ALLOWED_KEYS = ["trapped","insights","limitingBeliefs","additionalTech","heartShield","heartShieldEmotions","issues","comments","nextSession"];
           if (ALLOWED_KEYS.indexOf(rec.sectionKey) === -1) {
             console.warn("Backup restore: ignoring unknown sectionKey", rec.sectionKey);
             continue;
           }
           // Type-coerce safely. customLabel must be string|null; enabled must be boolean.
           var cleanRec = {
             sectionKey: rec.sectionKey,
             customLabel: (typeof rec.customLabel === "string") ? rec.customLabel : null,
             enabled: (typeof rec.enabled === "boolean") ? rec.enabled : true,
           };
           try {
             await db.setTherapistSetting(cleanRec);
           } catch (e) {
             console.warn("Backup restore: setTherapistSetting failed for", cleanRec.sectionKey, e);
           }
         }

       db.clearAll() (already extended in Plan 02 to clear therapistSettings) handles the wipe BEFORE this loop runs.

    Do NOT change the encrypted-backup path — encrypted backups call exportBackup() / importBackup() under the hood, so they inherit this change automatically.

    Do NOT alter the ZIP file structure (the same manifest.json file inside the ZIP carries the new field).
  </action>
  <verify>
    <automated>grep -q "therapistSettings: allTherapistSettings\|therapistSettings:\s*allTherapistSettings" assets/backup.js && grep -q "version: 2" assets/backup.js && grep -q "Array.isArray(manifest.therapistSettings)" assets/backup.js && grep -q "db.setTherapistSetting" assets/backup.js && grep -q "ALLOWED_KEYS" assets/backup.js && grep -q "manifest.therapistSettings.length" assets/backup.js && node -c assets/backup.js</automated>
  </verify>
  <acceptance_criteria>
    - assets/backup.js contains literal `version: 2,` (manifest version bump)
    - assets/backup.js contains `getAllTherapistSettings` (export side)
    - assets/backup.js contains `Array.isArray(manifest.therapistSettings)` in normalizeManifest
    - assets/backup.js contains `setTherapistSetting` call in restore loop
    - assets/backup.js contains an `ALLOWED_KEYS` array with all 9 sectionKeys (whitelist defense against malformed/malicious backups)
    - assets/backup.js contains `manifest.therapistSettings.length` (loop bound)
    - File parses: `node -c assets/backup.js`
    - exportBackup wraps the getAllTherapistSettings call in a try/catch so a missing function (transitional) does not abort backup
    - Restore loop iterates AFTER sessions loop (verify by line order: `grep -n "manifest.sessions.length" assets/backup.js` line < `grep -n "manifest.therapistSettings.length" assets/backup.js` line)
  </acceptance_criteria>
  <done>Backup ZIP includes therapistSettings; restore reads it back and applies via PortfolioDB.setTherapistSetting; pre-Phase-22 backups load with defaults silently. Whitelist guards against crafted backups.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| backup ZIP file → manifest.json parse | An attacker-controlled backup file could craft a manifest with malicious therapistSettings rows |
| manifest.therapistSettings → PortfolioDB.setTherapistSetting | Persisted to user's IndexedDB without further validation if not whitelisted |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-22-07-01 | Tampering | Crafted backup writes arbitrary sectionKey to IndexedDB | mitigate | ALLOWED_KEYS whitelist in restore loop. Unknown sectionKey is logged and skipped. |
| T-22-07-02 | XSS / Tampering | Crafted backup includes customLabel containing `<script>` | mitigate | Storage layer is verbatim (per Plan 02 contract). Render-time escape is enforced by Plans 04/06 acceptance criteria (.textContent/.value, never innerHTML for labels). The threat is closed at render, not at storage — backup restore does not change the threat surface. |
| T-22-07-03 | Tampering | Type-confused fields (e.g., `enabled: "true"` string instead of boolean) | mitigate | Type coercion in cleanRec: customLabel must be string|null, enabled must be boolean. Other types fall back to defaults. |
| T-22-07-04 | DoS | Massive therapistSettings array (millions of rows) bloats IDB | mitigate | The set is bounded to 9 sectionKeys via the whitelist. Even if the manifest contains a million rows, only the 9 allowed keys are written. The whitelist also short-circuits the loop early via continue. |
| T-22-07-05 | Information disclosure | Backup ZIP leaks customLabels (which may contain user-chosen language they consider private) | accept | The user is exporting their own backup. Same threat surface as today's backup of clients + sessions (which contain far more sensitive data). |
| T-22-07-06 | Tampering | Forward-compat: future v3 manifest opened by current code | mitigate | normalizeManifest does not reject unknown version numbers; it preserves the manifest structure and lets the restore loops handle their fields. A future field outside the loops is silently ignored. Acceptance: a v2 backup roundtrips losslessly. |
| T-22-07-07 | Repudiation | Backup partial-restore leaves DB in inconsistent state | mitigate | clearAll() runs first, then the three loops in sequence. If a setTherapistSetting throws, the loop continues (logged warning) — clients/sessions are already restored. The therapistSettings rows that did succeed remain. The user sees a successful restore (no exception bubble); console warnings document the skipped rows. |

**Residual risk:** Low. The whitelist closes the most material threat (arbitrary key injection). Type coercion handles the second-order tampering vector.
</threat_model>

<verification>
- node -c assets/backup.js
- Smoke 1: export with no custom settings → manifest contains `therapistSettings: []` and `version: 2`.
- Smoke 2: set custom labels in Plan 04 Settings page → export → wipe IDB → import → confirm labels restored.
- Smoke 3: load a Phase-21-era ZIP (version: 1, no therapistSettings) → import succeeds → all sections render with defaults.
- Smoke 4: craft a manifest with `therapistSettings: [{sectionKey: "evil", customLabel: "x"}]` → import → console warning, no row written.
</verification>

<success_criteria>
- A round-trip backup (export → wipe → import) preserves custom labels and disabled flags exactly.
- A v0 or v1 backup imports without errors and applies defaults.
- Crafted backups with unknown sectionKeys are silently filtered.
</success_criteria>

<output>
Create `.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-07-backup-restore-roundtrip-SUMMARY.md` after completion.
</output>
