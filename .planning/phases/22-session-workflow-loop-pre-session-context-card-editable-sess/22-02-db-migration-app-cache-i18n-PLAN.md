---
phase: 22-session-workflow-loop-pre-session-context-card-editable-sess
plan: 02
type: execute
wave: 1
depends_on: []
files_modified:
  - assets/db.js
  - assets/app.js
  - assets/i18n-en.js
  - assets/i18n-de.js
  - assets/i18n-he.js
  - assets/i18n-cs.js
autonomous: true
requirements:
  - REQ-2
  - REQ-3
  - REQ-4
  - REQ-6
  - REQ-11
  - REQ-17
  - REQ-19
user_setup: []

must_haves:
  truths:
    - "PortfolioDB exposes getAllTherapistSettings(), setTherapistSetting(record), clearTherapistSettings()"
    - "Opening the app on an existing v3 database upgrades cleanly to v4 without data loss in clients/sessions stores"
    - "App.getSectionLabel(sectionKey, defaultI18nKey) returns the user's custom label if set, otherwise falls back to App.t(defaultI18nKey)"
    - "App.isSectionEnabled(sectionKey) returns true by default and false only when the user has explicitly disabled the section"
    - "App.initCommon() eagerly loads therapist settings into an in-memory Map BEFORE setLanguage() runs"
    - "BroadcastChannel 'sessions-garden-settings' is opened in initCommon and dispatches 'app:settings-changed' DOM event when a peer tab posts an update"
    - "All Settings page i18n keys exist in en/de/he/cs (header.settings.label, settings.page.title, settings.page.helper, settings.row.{key}.description x9, settings.indicator.disabled, settings.syncMessage.heading, settings.syncMessage.body, settings.discard.*, settings.saved.toast, settings.rename.tooLong, settings.rename.empty)"
  artifacts:
    - path: "assets/db.js"
      provides: "DB_VERSION = 4, MIGRATIONS[4] creates therapistSettings store, public API getAllTherapistSettings/setTherapistSetting/clearTherapistSettings, clearAll() includes therapistSettings"
      contains: "const DB_VERSION = 4"
    - path: "assets/app.js"
      provides: "App.getSectionLabel, App.isSectionEnabled, eager cache load in initCommon, BroadcastChannel listener"
      contains: "function getSectionLabel"
    - path: "assets/i18n-en.js"
      provides: "Settings page i18n keys (en) per UI-SPEC Copywriting Contract"
    - path: "assets/i18n-de.js"
      provides: "Same key set as en, German values from UI-SPEC"
    - path: "assets/i18n-he.js"
      provides: "Same key set as en, Hebrew values from UI-SPEC"
    - path: "assets/i18n-cs.js"
      provides: "Same key set as en, Czech values from UI-SPEC"
  key_links:
    - from: "assets/app.js getSectionLabel"
      to: "_sectionLabelCache"
      via: "Map.get + fallback to t(defaultI18nKey)"
      pattern: "_sectionLabelCache\\.get"
    - from: "assets/app.js initCommon"
      to: "PortfolioDB.getAllTherapistSettings"
      via: "await before setLanguage"
      pattern: "PortfolioDB\\.getAllTherapistSettings"
    - from: "assets/app.js BroadcastChannel listener"
      to: "DOM event app:settings-changed"
      via: "document.dispatchEvent on incoming peer message"
      pattern: "app:settings-changed"
    - from: "assets/db.js MIGRATIONS[4]"
      to: "therapistSettings object store"
      via: "createObjectStore in upgradeneeded"
      pattern: "createObjectStore\\(['\"]therapistSettings"
---

<objective>
Establish the persistence + cache + i18n foundation for Feature A. After this plan, any page that calls `App.initCommon()` will:
1. Find a `therapistSettings` IndexedDB store (auto-migrated from v3 to v4 with no data loss).
2. Have `App.getSectionLabel(key, fallbackI18nKey)` and `App.isSectionEnabled(key)` available.
3. Listen for cross-tab updates via BroadcastChannel `sessions-garden-settings`.

Purpose: Single label-resolution layer required by Constraint "Single label-resolution layer" in 22-SPEC.md.

Output: db.js v4 migration + new public DB API + App namespace getters + BroadcastChannel wiring + 4 i18n files with all Settings/indicator/sync-banner/discard keys.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-SPEC.md
@.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-CONTEXT.md
@.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-UI-SPEC.md
@.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-PATTERNS.md
@assets/db.js
@assets/app.js
@assets/i18n-en.js

<interfaces>
PortfolioDB additions:
  async function getAllTherapistSettings(): Promise<Array<{ sectionKey, customLabel, enabled }>>
  async function setTherapistSetting(record): Promise<void>
  async function clearTherapistSettings(): Promise<void>

App additions:
  function getSectionLabel(sectionKey, defaultI18nKey): string
  function isSectionEnabled(sectionKey): boolean

The 9 canonical sectionKeys (locked here; downstream plans use these exact strings):
  trapped, insights, limitingBeliefs, additionalTech, heartShield, heartShieldEmotions, issues, comments, nextSession

Their default i18n keys:
  session.form.trapped, session.form.insights, session.form.limitingBeliefs, session.form.additionalTech,
  session.form.heartShield, session.form.heartShieldEmotions, session.form.issuesHeading,
  session.form.comments, session.form.nextSession
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add MIGRATIONS[4] therapistSettings store + public DB API</name>
  <files>assets/db.js</files>
  <read_first>
    - assets/db.js (full file)
    - .planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-PATTERNS.md (section "assets/db.js (modified)")
    - .planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-CONTEXT.md (D-08)
  </read_first>
  <action>
    Bump `const DB_VERSION = 3` to `const DB_VERSION = 4` (line 4 of assets/db.js).

    Add MIGRATIONS[4] inside the existing MIGRATIONS object after migration 3 — purely additive, no data mutation:

      4: function therapistSettingsStore(db /*, transaction */) {
        if (!db.objectStoreNames.contains("therapistSettings")) {
          db.createObjectStore("therapistSettings", { keyPath: "sectionKey" });
        }
      },

    Add three new public functions before the IIFE return block, mirroring the withStore/clearStore patterns:

      /**
       * setTherapistSetting — stores a record. customLabel is stored verbatim.
       * Consumers MUST render via .textContent or .value (never innerHTML) to prevent XSS.
       */
      async function setTherapistSetting(record) {
        if (!record || typeof record.sectionKey !== "string") {
          throw new Error("setTherapistSetting: record.sectionKey required");
        }
        var customLabel = (record.customLabel === undefined ? null : record.customLabel);
        if (typeof customLabel === "string") {
          var trimmed = customLabel.trim();
          customLabel = trimmed.length > 0 ? trimmed : null;
        }
        return withStore("therapistSettings", "readwrite", function (store) {
          return store.put({
            sectionKey: record.sectionKey,
            customLabel: customLabel,
            enabled: (record.enabled === undefined ? true : !!record.enabled),
          });
        });
      }

      async function getAllTherapistSettings() {
        const db = await openDB();
        return new Promise((resolve, reject) => {
          const tx = db.transaction("therapistSettings", "readonly");
          const store = tx.objectStore("therapistSettings");
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result || []);
          request.onerror = () => reject(request.error);
        });
      }

      async function clearTherapistSettings() {
        return withStore("therapistSettings", "readwrite", function (store) {
          return store.clear();
        });
      }

    Extend the existing clearAll() to also clear therapistSettings:

      async function clearAll() {
        await clearStore("sessions");
        await clearStore("clients");
        await clearStore("therapistSettings");
      }

    Add the three new functions to the IIFE return block (existing return at lines ~486-499):
      return {
        // ... all existing exports unchanged ...
        getAllTherapistSettings,
        setTherapistSetting,
        clearTherapistSettings,
      };

    Do NOT modify migrations 1, 2, or 3.
  </action>
  <verify>
    <automated>grep -n "const DB_VERSION = 4" assets/db.js && grep -nE "createObjectStore\\([\"']therapistSettings" assets/db.js && grep -cE "getAllTherapistSettings|setTherapistSetting|clearTherapistSettings" assets/db.js | awk '$1 >= 6 { print "ok" }' | grep ok && node -c assets/db.js</automated>
  </verify>
  <acceptance_criteria>
    - assets/db.js contains literal `const DB_VERSION = 4`
    - assets/db.js contains a `4:` key in MIGRATIONS object: `grep -E "^\s*4:\s*function" assets/db.js` matches
    - assets/db.js contains `createObjectStore("therapistSettings"` (or single-quoted equivalent)
    - assets/db.js mentions getAllTherapistSettings, setTherapistSetting, clearTherapistSettings each at least twice
    - assets/db.js clearAll function body contains `clearStore("therapistSettings")`
    - File parses: `node -c assets/db.js`
    - JSDoc above setTherapistSetting contains both "verbatim" and "innerHTML"
  </acceptance_criteria>
  <done>db.js is at v4. The three new functions are public on PortfolioDB. clearAll() includes therapistSettings. Migration 4 is a pure additive store creation with no data mutation on existing users.</done>
</task>

<task type="auto">
  <name>Task 2: Add App.getSectionLabel + App.isSectionEnabled + eager cache load + BroadcastChannel listener</name>
  <files>assets/app.js</files>
  <read_first>
    - assets/app.js (full file)
    - .planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-PATTERNS.md (section "assets/app.js (modified)")
    - .planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-CONTEXT.md (D-09, D-10, D-11)
  </read_first>
  <action>
    Add a module-private cache and two getters near the top of the App IIFE (after the i18n block ~line 32):

      // Phase 22: section-label cache. Populated in initCommon BEFORE setLanguage runs.
      let _sectionLabelCache = new Map();

      function getSectionLabel(sectionKey, defaultI18nKey) {
        const entry = _sectionLabelCache.get(sectionKey);
        if (entry && typeof entry.customLabel === "string" && entry.customLabel.trim().length > 0) {
          return entry.customLabel;
        }
        return t(defaultI18nKey);
      }

      function isSectionEnabled(sectionKey) {
        const entry = _sectionLabelCache.get(sectionKey);
        return entry ? entry.enabled !== false : true;
      }

    Convert initCommon signature to `async function initCommon()`. BEFORE the existing `setLanguage(savedLang)` call, insert the eager cache load and BroadcastChannel listener:

      // Phase 22: eager-load therapist settings.
      try {
        if (typeof PortfolioDB !== "undefined" && typeof PortfolioDB.getAllTherapistSettings === "function") {
          const rows = await PortfolioDB.getAllTherapistSettings();
          _sectionLabelCache = new Map(rows.map(r => [r.sectionKey, r]));
        }
      } catch (err) {
        console.warn("Therapist settings unavailable on initCommon:", err);
        _sectionLabelCache = new Map();
      }

      // Phase 22: cross-tab sync via BroadcastChannel.
      if (typeof BroadcastChannel !== "undefined") {
        try {
          const ch = new BroadcastChannel("sessions-garden-settings");
          ch.addEventListener("message", async (e) => {
            if (e && e.data && e.data.type === "therapist-settings-changed") {
              try {
                const rows = await PortfolioDB.getAllTherapistSettings();
                _sectionLabelCache = new Map(rows.map(r => [r.sectionKey, r]));
                document.dispatchEvent(new CustomEvent("app:settings-changed"));
              } catch (err) {
                console.warn("BroadcastChannel refresh failed:", err);
              }
            }
          });
        } catch (err) {
          console.warn("BroadcastChannel unavailable:", err);
        }
      }

    Add the two getters to the App IIFE return block:
      return {
        // ... all existing exports unchanged ...
        getSectionLabel,
        isSectionEnabled,
      };

    `_sectionLabelCache` is module-private — do not export it.
  </action>
  <verify>
    <automated>grep -cE "function getSectionLabel|function isSectionEnabled" assets/app.js | awk '$1 >= 2 { print "ok" }' | grep ok && grep -n "_sectionLabelCache = new Map" assets/app.js && grep -n 'BroadcastChannel("sessions-garden-settings"' assets/app.js && grep -n 'CustomEvent("app:settings-changed"' assets/app.js && node -c assets/app.js</automated>
  </verify>
  <acceptance_criteria>
    - `grep -E "function getSectionLabel|function isSectionEnabled" assets/app.js` returns at least 2 matches (declarations)
    - `grep "_sectionLabelCache = new Map" assets/app.js` returns at least one match
    - `grep 'BroadcastChannel("sessions-garden-settings"' assets/app.js` returns one match
    - `grep 'CustomEvent("app:settings-changed"' assets/app.js` returns one match
    - `grep "async function initCommon" assets/app.js` returns one match
    - Return block of the IIFE includes `getSectionLabel` and `isSectionEnabled` exports
    - File parses: `node -c assets/app.js`
  </acceptance_criteria>
  <done>App.getSectionLabel and App.isSectionEnabled are public. initCommon eagerly loads the cache and opens the BroadcastChannel. app:settings-changed events fire on cross-tab updates.</done>
</task>

<task type="auto">
  <name>Task 3: Add Settings page i18n keys to all 4 language files</name>
  <files>assets/i18n-en.js, assets/i18n-de.js, assets/i18n-he.js, assets/i18n-cs.js</files>
  <read_first>
    - assets/i18n-en.js (existing structure)
    - assets/i18n-de.js (existing structure)
    - assets/i18n-he.js (existing structure)
    - assets/i18n-cs.js (existing structure)
    - .planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-UI-SPEC.md (Copywriting Contract)
    - .planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-PATTERNS.md (section "assets/i18n-*.js")
  </read_first>
  <action>
    Append the following key set to each of the 4 language files, before the final closing `};` of the window.I18N.{lang} object literal. Use a comment header "// Phase 22 — Settings page" before the block.

    English values (assets/i18n-en.js):
      "header.settings.label": "Settings",
      "settings.page.title": "Settings",
      "settings.page.helper": "Customize section names and choose which sections appear in your sessions. Changes are saved on this device.",
      "settings.syncMessage.heading": "About saved settings",
      "settings.syncMessage.body": "Saved labels appear immediately here. Open session forms will pick up the new labels on next page navigation. Refresh other tabs to see changes immediately.",
      "settings.row.trapped.description": "Released emotions logged during the session",
      "settings.row.insights.description": "Physical or somatic notes from the session",
      "settings.row.limitingBeliefs.description": "Beliefs surfaced or worked on this session",
      "settings.row.additionalTech.description": "Other tools or techniques used in this session",
      "settings.row.heartShield.description": "Heart Shield session toggle and controls",
      "settings.row.heartShieldEmotions.description": "Emotions found inside the Heart Shield",
      "settings.row.issues.description": "The issues addressed and their before/after severity",
      "settings.row.comments.description": "Free-form notes and observations",
      "settings.row.nextSession.description": "What to focus on or carry into the next session",
      "settings.indicator.disabled": "Disabled in Settings",
      "settings.discard.title": "Discard unsaved changes?",
      "settings.discard.body": "Your renames and toggles won't be saved.",
      "settings.discard.confirm": "Yes, discard",
      "settings.discard.cancel": "Keep editing",
      "settings.saved.toast": "Settings saved",
      "settings.rename.tooLong": "Section name is too long. Maximum 60 characters.",
      "settings.rename.empty": "Enter a name or leave blank to use the default.",
      "settings.reset.tooltip": "Reset to default name",
      "settings.action.save": "Save changes",
      "settings.action.discard": "Discard changes",

    German values (assets/i18n-de.js) — from UI-SPEC Copywriting Contract:
      "header.settings.label": "Einstellungen",
      "settings.page.title": "Einstellungen",
      "settings.page.helper": "Passen Sie Abschnittsnamen an und wählen Sie, welche Abschnitte in Ihren Sitzungen erscheinen. Änderungen werden auf diesem Gerät gespeichert.",
      "settings.syncMessage.heading": "Über gespeicherte Einstellungen",
      "settings.syncMessage.body": "Gespeicherte Bezeichnungen erscheinen hier sofort. Geöffnete Sitzungsformulare übernehmen die neuen Bezeichnungen beim nächsten Seitenwechsel. Andere Tabs neu laden, um Änderungen sofort zu sehen.",
      "settings.row.trapped.description": "Freigegebene Emotionen während der Sitzung",
      "settings.row.insights.description": "Körperliche oder somatische Notizen aus der Sitzung",
      "settings.row.limitingBeliefs.description": "Glaubenssätze, die in dieser Sitzung aufgetaucht oder bearbeitet wurden",
      "settings.row.additionalTech.description": "Weitere Werkzeuge oder Techniken in dieser Sitzung",
      "settings.row.heartShield.description": "Heart-Shield-Sitzung umschalten und Steuerung",
      "settings.row.heartShieldEmotions.description": "Emotionen innerhalb des Heart Shields",
      "settings.row.issues.description": "Behandelte Themen und ihre Vorher/Nachher-Schweregrade",
      "settings.row.comments.description": "Freie Notizen und Beobachtungen",
      "settings.row.nextSession.description": "Worauf in der nächsten Sitzung der Fokus liegen soll",
      "settings.indicator.disabled": "In Einstellungen deaktiviert",
      "settings.discard.title": "Ungespeicherte Änderungen verwerfen?",
      "settings.discard.body": "Ihre Umbenennungen und Umschaltungen werden nicht gespeichert.",
      "settings.discard.confirm": "Ja, verwerfen",
      "settings.discard.cancel": "Weiter bearbeiten",
      "settings.saved.toast": "Einstellungen gespeichert",
      "settings.rename.tooLong": "Abschnittsname ist zu lang. Maximal 60 Zeichen.",
      "settings.rename.empty": "Namen eingeben oder leer lassen für Standard.",
      "settings.reset.tooltip": "Auf Standardnamen zurücksetzen",
      "settings.action.save": "Änderungen speichern",
      "settings.action.discard": "Änderungen verwerfen",

    Hebrew values (assets/i18n-he.js) — gender-neutral where natural:
      "header.settings.label": "הגדרות",
      "settings.page.title": "הגדרות",
      "settings.page.helper": "התאם שמות מקטעים ובחר אילו מקטעים יופיעו במפגשים. השינויים נשמרים במכשיר זה.",
      "settings.syncMessage.heading": "על הגדרות שמורות",
      "settings.syncMessage.body": "תוויות שמורות מופיעות כאן מיד. טפסי מפגש פתוחים יקלטו את התוויות החדשות בניווט הבא. רענן כרטיסיות אחרות כדי לראות שינויים מיד.",
      "settings.row.trapped.description": "רגשות משוחררים שנרשמו במהלך המפגש",
      "settings.row.insights.description": "הערות גופניות או סומטיות מהמפגש",
      "settings.row.limitingBeliefs.description": "אמונות שעלו או טופלו במפגש",
      "settings.row.additionalTech.description": "כלים או טכניקות נוספים במפגש זה",
      "settings.row.heartShield.description": "מתג ובקרות מפגש Heart Shield",
      "settings.row.heartShieldEmotions.description": "רגשות שנמצאו בתוך Heart Shield",
      "settings.row.issues.description": "הנושאים שטופלו וחומרתם לפני ואחרי",
      "settings.row.comments.description": "הערות חופשיות ותצפיות",
      "settings.row.nextSession.description": "על מה למקד או להמשיך במפגש הבא",
      "settings.indicator.disabled": "מושבת בהגדרות",
      "settings.discard.title": "לבטל שינויים שלא נשמרו?",
      "settings.discard.body": "שינויי השמות וההפעלה/השבתה לא יישמרו.",
      "settings.discard.confirm": "כן, בטל",
      "settings.discard.cancel": "המשך עריכה",
      "settings.saved.toast": "ההגדרות נשמרו",
      "settings.rename.tooLong": "שם המקטע ארוך מדי. מקסימום 60 תווים.",
      "settings.rename.empty": "הזן שם או השאר ריק לברירת המחדל.",
      "settings.reset.tooltip": "אפס לשם ברירת המחדל",
      "settings.action.save": "שמור שינויים",
      "settings.action.discard": "בטל שינויים",

    Czech values (assets/i18n-cs.js):
      "header.settings.label": "Nastavení",
      "settings.page.title": "Nastavení",
      "settings.page.helper": "Přizpůsobte názvy sekcí a vyberte, které sekce se zobrazí ve vašich sezeních. Změny se ukládají na tomto zařízení.",
      "settings.syncMessage.heading": "O uložených nastaveních",
      "settings.syncMessage.body": "Uložené štítky se zde objeví okamžitě. Otevřené formuláře sezení převezmou nové štítky při příští navigaci. Obnovte jiné karty pro okamžité zobrazení změn.",
      "settings.row.trapped.description": "Uvolněné emoce zaznamenané během sezení",
      "settings.row.insights.description": "Fyzické nebo somatické poznámky ze sezení",
      "settings.row.limitingBeliefs.description": "Přesvědčení, která se objevila nebo byla zpracována",
      "settings.row.additionalTech.description": "Další nástroje nebo techniky použité v tomto sezení",
      "settings.row.heartShield.description": "Přepínač a ovládání sezení Heart Shield",
      "settings.row.heartShieldEmotions.description": "Emoce nalezené uvnitř Heart Shieldu",
      "settings.row.issues.description": "Řešené problémy a jejich závažnost před/po",
      "settings.row.comments.description": "Volné poznámky a pozorování",
      "settings.row.nextSession.description": "Na co se zaměřit v dalším sezení",
      "settings.indicator.disabled": "Zakázáno v Nastavení",
      "settings.discard.title": "Zahodit neuložené změny?",
      "settings.discard.body": "Vaše přejmenování a přepnutí nebudou uloženy.",
      "settings.discard.confirm": "Ano, zahodit",
      "settings.discard.cancel": "Pokračovat v úpravách",
      "settings.saved.toast": "Nastavení uloženo",
      "settings.rename.tooLong": "Název sekce je příliš dlouhý. Maximum 60 znaků.",
      "settings.rename.empty": "Zadejte název nebo nechte prázdné pro výchozí.",
      "settings.reset.tooltip": "Obnovit výchozí název",
      "settings.action.save": "Uložit změny",
      "settings.action.discard": "Zahodit změny",

    All 4 files MUST have the SAME set of keys (Phase 14 standard).
  </action>
  <verify>
    <automated>for L in en de he cs; do grep -c "settings.row" assets/i18n-$L.js | awk -v lang=$L '$1 < 9 { print "FAIL_"lang; exit 1 } END { print "ok_"lang }'; done && for L in en de he cs; do grep -q "header.settings.label" assets/i18n-$L.js && grep -q "settings.indicator.disabled" assets/i18n-$L.js && grep -q "settings.syncMessage.heading" assets/i18n-$L.js || { echo "MISSING_$L"; exit 1; }; done && for L in en de he cs; do node -c assets/i18n-$L.js || exit 1; done && echo "all_ok"</automated>
  </verify>
  <acceptance_criteria>
    - Each of the 4 files contains 9 settings.row.{key}.description keys: `grep -c "settings.row" assets/i18n-{lang}.js` >= 9
    - Each file contains: header.settings.label, settings.page.title, settings.page.helper, settings.syncMessage.heading, settings.syncMessage.body, settings.indicator.disabled, settings.discard.title, settings.discard.body, settings.discard.confirm, settings.discard.cancel, settings.saved.toast, settings.rename.tooLong, settings.rename.empty, settings.reset.tooltip, settings.action.save, settings.action.discard
    - All 4 files parse: `node -c assets/i18n-{en,de,he,cs}.js`
    - Hebrew file (i18n-he.js) settings.action.save value contains "שמור"
    - German file (i18n-de.js) settings.action.save value contains "speichern"
    - Czech file (i18n-cs.js) settings.action.save value contains "Uložit"
  </acceptance_criteria>
  <done>All 4 i18n files have the complete Settings page key set with locale-correct values. Key parity holds across en/de/he/cs.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| therapist input → IndexedDB | customLabel strings entered on Settings page are persisted; could contain HTML/script-like text |
| IndexedDB → DOM render | Stored labels are read back and rendered everywhere |
| Cross-tab → BroadcastChannel | Same-origin only; messages from peer tabs trigger cache reload |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-22-02-01 | Tampering / XSS | customLabel persisted via setTherapistSetting | mitigate | setTherapistSetting stores labels verbatim. JSDoc mandates render via .textContent or .value (never innerHTML). Plans 22-04 and 22-06 own enforcement; their acceptance criteria forbid innerHTML on label-render paths. |
| T-22-02-02 | Tampering | DB schema migration | mitigate | DB_VERSION 3→4 uses the existing sequential migration ladder. Migration 4 is purely additive. |
| T-22-02-03 | Information disclosure | BroadcastChannel | accept | Same-origin-restricted. Payload has no PII (only `{type: "therapist-settings-changed"}`). |
| T-22-02-04 | Repudiation | Cache divergence between tabs | mitigate | BroadcastChannel + app:settings-changed event keeps tabs in sync. Sticky info banner explains the refresh behavior. |
| T-22-02-05 | DoS | Very long customLabel | mitigate | UI maxlength=60 (Plan 22-04) + setTherapistSetting trims. Local-only threat model. |
| T-22-02-06 | Information disclosure | i18n strings | accept | Public app strings by definition. No secrets. |

**Residual risk:** Low. XSS surface is owned by render-site plans (22-04, 22-06).
</threat_model>

<verification>
- `node -c assets/db.js && node -c assets/app.js`
- `for L in en de he cs; do node -c assets/i18n-$L.js; done`
- Manual smoke (post-execution): open app on existing v3 DB, observe migration to v4 in DevTools.
</verification>

<success_criteria>
- DB migrates v3 → v4 with no error and no data loss in existing clients/sessions stores
- App.getSectionLabel and App.isSectionEnabled are callable after initCommon awaits complete
- Cross-tab change in another window dispatches `app:settings-changed` event
- All 4 i18n files have key parity for the Settings page key set
</success_criteria>

<output>
Create `.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-02-db-migration-app-cache-i18n-SUMMARY.md` after completion.
</output>
