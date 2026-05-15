window.PortfolioDB = (() => {
  const DB_NAME = window.name === "demo-mode" ? "demo_portfolio" : "sessions_garden";
  const OLD_DB_NAME = "emotion_code_portfolio";
  const DB_VERSION = 5;
  const DELETED_SEEDS_KEY = "snippetsDeletedSeeds";

  let _migrationDone = false;
  let _seedingDone = false;
  let _seedingPromise = null;

  /**
   * One-time migration: copies data from "emotion_code_portfolio" to "sessions_garden"
   * for existing users after the rebrand. Safe to call multiple times (idempotent).
   */
  async function migrateOldDB() {
    // Only run once per page load, and never in demo mode
    if (_migrationDone || DB_NAME !== "sessions_garden") {
      _migrationDone = true;
      return;
    }
    _migrationDone = true;

    try {
      // Detect whether the old DB exists
      let oldDBExists = false;

      if (typeof indexedDB.databases === "function") {
        // Modern browsers: enumerate databases
        const dbs = await indexedDB.databases();
        oldDBExists = dbs.some((d) => d.name === OLD_DB_NAME);
      } else {
        // Firefox < 126 fallback: attempt to open without triggering upgradeneeded
        oldDBExists = await new Promise((resolve) => {
          const probe = indexedDB.open(OLD_DB_NAME, 1);
          let isNew = false;
          probe.onupgradeneeded = () => {
            // DB did not exist — it is being created fresh; mark as new and abort
            isNew = true;
            probe.result.close();
            probe.transaction.abort();
          };
          probe.onsuccess = () => {
            const db = probe.result;
            const hasStores = db.objectStoreNames.length > 0;
            db.close();
            if (!hasStores) {
              // Empty DB was accidentally created; clean it up
              indexedDB.deleteDatabase(OLD_DB_NAME);
              resolve(false);
            } else {
              resolve(true);
            }
          };
          probe.onerror = () => resolve(false);
          // onblocked fires if another tab already has old DB open
          probe.onblocked = () => resolve(false);
          // Give the probe result time; if upgradeneeded fired, mark as not existing
          setTimeout(() => {
            if (isNew) resolve(false);
          }, 0);
        });
      }

      if (!oldDBExists) return;

      // Open the new DB first so its schema is ready
      const newDB = await openDB();

      // Check idempotency: if new DB already has clients, migration already ran
      const existingClients = await new Promise((resolve, reject) => {
        const tx = newDB.transaction("clients", "readonly");
        const req = tx.objectStore("clients").count();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });

      if (existingClients > 0) {
        newDB.close();
        // Old DB still exists but new DB has data — just delete the old DB
        indexedDB.deleteDatabase(OLD_DB_NAME);
        console.log("Skipped migration: sessions_garden already has data. Deleted emotion_code_portfolio.");
        return;
      }

      // Open the old DB (read-only; no upgradeneeded since it exists at its current version)
      const oldDB = await new Promise((resolve, reject) => {
        // Open without specifying a version so we get whatever version it is at
        const req = indexedDB.open(OLD_DB_NAME);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        req.onupgradeneeded = () => {
          // Should not happen since we confirmed the DB exists; abort to be safe
          req.transaction.abort();
          reject(new Error("Unexpected upgradeneeded on old DB during migration"));
        };
      });

      // Copy clients
      const clients = await new Promise((resolve, reject) => {
        if (!oldDB.objectStoreNames.contains("clients")) return resolve([]);
        const tx = oldDB.transaction("clients", "readonly");
        const req = tx.objectStore("clients").getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });

      // Copy sessions
      const sessions = await new Promise((resolve, reject) => {
        if (!oldDB.objectStoreNames.contains("sessions")) return resolve([]);
        const tx = oldDB.transaction("sessions", "readonly");
        const req = tx.objectStore("sessions").getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });

      oldDB.close();

      // Write clients to new DB
      if (clients.length > 0) {
        await new Promise((resolve, reject) => {
          const tx = newDB.transaction("clients", "readwrite");
          const store = tx.objectStore("clients");
          clients.forEach((c) => store.put(c));
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      }

      // Write sessions to new DB
      if (sessions.length > 0) {
        await new Promise((resolve, reject) => {
          const tx = newDB.transaction("sessions", "readwrite");
          const store = tx.objectStore("sessions");
          sessions.forEach((s) => store.put(s));
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      }

      newDB.close();

      // Delete the old database
      indexedDB.deleteDatabase(OLD_DB_NAME);

      console.log("Migrated database from emotion_code_portfolio to sessions_garden");
    } catch (err) {
      // Migration failure is non-fatal: user keeps their data in new (empty) DB;
      // log for debugging but do not surface to user
      console.error("DB name migration failed (non-fatal):", err);
    }
  }

  const DB_STRINGS = {
    en: {
      blocked: "Please close other tabs of this app to continue.",
      versionChanged: "A newer version of this app is open. Please refresh to continue.",
      refresh: "Refresh",
      migrationFailed: "Database update failed. Your data is safe. Please refresh the page to try again.",
      refreshPage: "Refresh page"
    },
    he: {
      blocked: "נא לסגור כרטיסיות אחרות של האפליקציה כדי להמשיך.",
      versionChanged: "גרסה חדשה יותר של האפליקציה פתוחה. נא לרענן כדי להמשיך.",
      refresh: "רענון",
      migrationFailed: "עדכון מסד הנתונים נכשל. הנתונים שלך בטוחים. נא לרענן את הדף ולנסות שוב.",
      refreshPage: "רענון דף"
    },
    de: {
      blocked: "Bitte schliesse andere Tabs dieser App, um fortzufahren.",
      versionChanged: "Eine neuere Version dieser App ist geoeffnet. Bitte aktualisiere, um fortzufahren.",
      refresh: "Aktualisieren",
      migrationFailed: "Datenbankaktualisierung fehlgeschlagen. Deine Daten sind sicher. Bitte lade die Seite neu und versuche es erneut.",
      refreshPage: "Seite aktualisieren"
    },
    cs: {
      blocked: "Pro pokracovani prosim zavri ostatni karty teto aplikace.",
      versionChanged: "Je otevrena novejsi verze teto aplikace. Pro pokracovani prosim obnov stranku.",
      refresh: "Obnovit",
      migrationFailed: "Aktualizace databaze se nezdarila. Tvoje data jsou v bezpeci. Prosim obnov stranku a zkus to znovu.",
      refreshPage: "Obnovit stranku"
    }
  };

  function dbStr(key) {
    var lang = localStorage.getItem('portfolioLang') || 'en';
    var strings = DB_STRINGS[lang] || DB_STRINGS.en;
    return strings[key] || DB_STRINGS.en[key] || key;
  }

  const MIGRATIONS = {
    1: function initializeSchema(db) {
      // v1: original schema — only runs on fresh installs (oldVersion === 0)
      if (!db.objectStoreNames.contains("clients")) {
        const store = db.createObjectStore("clients", { keyPath: "id", autoIncrement: true });
        store.createIndex("name", "name", { unique: false });
      }
      if (!db.objectStoreNames.contains("sessions")) {
        const store = db.createObjectStore("sessions", { keyPath: "id", autoIncrement: true });
        store.createIndex("clientId", "clientId", { unique: false });
        store.createIndex("date", "date", { unique: false });
      }
    },
    2: function expandDataModel(db, transaction) {
      // Migrate existing clients with type "human" to "adult"
      const clientStore = transaction.objectStore("clients");
      const cursorReq = clientStore.openCursor();
      cursorReq.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          const record = cursor.value;
          if (record.type === "human") {
            cursor.update({ ...record, type: "adult" });
          }
          cursor.continue();
        }
      };
    },
    3: function heartShieldRedesign(db, transaction) {
      // Migrate sessions: convert heartWallCleared -> isHeartShield + shieldRemoved
      const sessionStore = transaction.objectStore("sessions");
      const sessionCursorReq = sessionStore.openCursor();
      sessionCursorReq.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          const record = cursor.value;
          if ("heartWallCleared" in record) {
            record.isHeartShield = true;
            record.shieldRemoved = !!record.heartWallCleared;
            delete record.heartWallCleared;
            cursor.update(record);
          }
          cursor.continue();
        }
      };
      // Migrate clients: remove heartWall field
      const clientStore = transaction.objectStore("clients");
      const clientCursorReq = clientStore.openCursor();
      clientCursorReq.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          const record = cursor.value;
          if ("heartWall" in record) {
            delete record.heartWall;
            cursor.update(record);
          }
          cursor.continue();
        }
      };
    },
    4: function therapistSettingsStore(db /*, transaction */) {
      // Phase 22: additive migration — creates the therapistSettings object store.
      // No data mutation on existing clients/sessions stores.
      if (!db.objectStoreNames.contains("therapistSettings")) {
        db.createObjectStore("therapistSettings", { keyPath: "sectionKey" });
      }
    },
    5: function snippetsStore(db /*, transaction */) {
      // Phase 24 D-08: additive migration — creates the snippets object store.
      // Schema: { id, trigger, expansions:{he,en,cs,de}, tags:[], origin, createdAt, updatedAt }
      // Triggers must be lowercase a-z0-9- (enforced by validateSnippetShape), so a
      // direct unique index on trigger gives case-insensitive uniqueness for free.
      // Seed-pack populate is deferred to seedSnippetsIfNeeded(db) — see openDB success.
      if (!db.objectStoreNames.contains("snippets")) {
        const store = db.createObjectStore("snippets", { keyPath: "id" });
        store.createIndex("trigger", "trigger", { unique: true });
        store.createIndex("origin", "origin", { unique: false });
      }
    },
  };

  async function openDB() {
    await migrateOldDB();
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        const transaction = event.target.transaction;
        const oldVersion = event.oldVersion; // 0 for brand-new installs
        const newVersion = event.newVersion;

        try {
          // Run each migration in order from oldVersion+1 to newVersion
          // This handles skipped versions: v1→v3 runs migration 2 then migration 3
          for (let v = oldVersion + 1; v <= newVersion; v++) {
            if (MIGRATIONS[v]) {
              MIGRATIONS[v](db, transaction);
            }
          }
        } catch (err) {
          // Abort the upgrade transaction so the DB stays at oldVersion
          transaction.abort();
          showDBMigrationError(err);
          reject(err);
        }
      };

      request.onblocked = () => {
        // Another tab has this DB open at an older version
        // The current tab requested a version upgrade that is blocked
        showDBBlockedMessage();
      };

      request.onsuccess = (event) => {
        const db = event.target.result;

        // When another tab upgrades the DB, close this connection so the upgrade can proceed
        db.onversionchange = () => {
          db.close();
          showDBVersionChangedMessage();
        };

        // Phase 24 D-10: idempotent seed populate runs AFTER upgrade transaction
        // completes. First open pays the cost; subsequent calls short-circuit via
        // _seedingDone. Concurrent first-opens share _seedingPromise.
        seedSnippetsIfNeeded(db)
          .then(() => resolve(db))
          .catch((err) => {
            console.error("seed populate failed:", err);
            // Resolve anyway — the app still works without snippets seeded.
            resolve(db);
          });
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * seedSnippetsIfNeeded — populates the snippets store from window.SNIPPETS_SEED
   * the FIRST time this DB is opened on this page load. Idempotent across:
   *   - Subsequent openDB() calls on the same page load (short-circuits via _seedingDone).
   *   - Re-running the migration (records compared by id; existing ids skipped).
   *   - User-deleted seeds (tracked in therapistSettings[snippetsDeletedSeeds].deletedIds).
   *
   * Identifier-resolution note: window.SNIPPETS_SEED is referenced with an explicit
   * window. prefix. snippets-seed.js loads BEFORE db.js on every page that loads db.js,
   * so the global exists by the time this function runs.
   */
  async function seedSnippetsIfNeeded(db) {
    if (_seedingDone) return;
    if (_seedingPromise) return _seedingPromise;

    _seedingPromise = (async () => {
      try {
        // 1) Read existing snippet ids in this DB.
        const existing = await new Promise((resolve, reject) => {
          const tx = db.transaction("snippets", "readonly");
          const store = tx.objectStore("snippets");
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => reject(req.error);
        });
        const existingIds = new Set(existing.map((s) => s.id));

        // 2) Read deletedSeedIds from therapistSettings.
        const deletedRec = await new Promise((resolve, reject) => {
          const tx = db.transaction("therapistSettings", "readonly");
          const store = tx.objectStore("therapistSettings");
          const req = store.get(DELETED_SEEDS_KEY);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
        const deletedIds = new Set((deletedRec && deletedRec.deletedIds) || []);

        // 3) Determine which seeds to add.
        const seed = (typeof window !== "undefined" && window.SNIPPETS_SEED) || [];
        const toAdd = [];
        for (const s of seed) {
          if (!existingIds.has(s.id) && !deletedIds.has(s.id)) toAdd.push(s);
        }

        // 4) Add missing seeds in one transaction.
        if (toAdd.length > 0) {
          await new Promise((resolve, reject) => {
            const tx = db.transaction("snippets", "readwrite");
            const store = tx.objectStore("snippets");
            for (const s of toAdd) store.add(s);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
          });
        }

        _seedingDone = true;
      } finally {
        _seedingPromise = null;
      }
    })();

    return _seedingPromise;
  }

  function showDBBlockedMessage() {
    // Show a persistent banner (not just a toast) because user must take action
    const existing = document.getElementById("dbBlockedBanner");
    if (existing) return; // Already showing

    const banner = document.createElement("div");
    banner.id = "dbBlockedBanner";
    banner.setAttribute("role", "alert");
    banner.className = "db-error-banner db-error-banner--blocked";
    banner.textContent = dbStr('blocked');
    document.body.prepend(banner);
  }

  function showDBVersionChangedMessage() {
    // The DB was upgraded by another tab — this tab must reload
    const existing = document.getElementById("dbVersionChangedBanner");
    if (existing) return;

    const banner = document.createElement("div");
    banner.id = "dbVersionChangedBanner";
    banner.setAttribute("role", "alert");
    banner.className = "db-error-banner db-error-banner--version";

    const msg = document.createElement("span");
    msg.textContent = dbStr('versionChanged');

    const btn = document.createElement("button");
    btn.textContent = dbStr('refresh');
    btn.className = "db-error-btn";
    btn.onclick = () => location.reload();

    banner.append(msg, btn);
    document.body.prepend(banner);
  }

  function showDBMigrationError(err) {
    console.error("IndexedDB migration failed:", err);

    const existing = document.getElementById("dbMigrationErrorBanner");
    if (existing) return;

    const banner = document.createElement("div");
    banner.id = "dbMigrationErrorBanner";
    banner.setAttribute("role", "alert");
    banner.className = "db-error-banner db-error-banner--migration";

    const msg = document.createElement("span");
    msg.textContent = dbStr('migrationFailed');

    const btn = document.createElement("button");
    btn.textContent = dbStr('refreshPage');
    btn.className = "db-error-btn";
    btn.onclick = () => location.reload();

    banner.append(msg, btn);
    document.body.prepend(banner);
  }

  async function withStore(storeName, mode, callback) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const result = callback(store);
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
    });
  }

  async function addRecord(storeName, record) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const request = store.add(record);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function addClient(client) {
    return addRecord("clients", client);
  }

  async function updateClient(client) {
    return withStore("clients", "readwrite", (store) => store.put(client));
  }

  async function getClient(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("clients", "readonly");
      const store = tx.objectStore("clients");
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function getAllClients() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("clients", "readonly");
      const store = tx.objectStore("clients");
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Phase 25 Plan 07 — PURE photo-storage size estimator.
  // Sums (b64 length × 0.75) across every client whose photoData (or legacy
  // `photo`) starts with a data: URL prefix. No IDB call — caller supplies
  // the clients array (typically from PortfolioDB.getAllClients()). Powers
  // the Photos Settings tab usage display AND the bulk-optimize savings
  // preview. Non-string, non-data:, null, and number values contribute 0.
  function estimatePhotosBytes(clients) {
    if (!Array.isArray(clients)) return 0;
    let total = 0;
    for (let i = 0; i < clients.length; i++) {
      const c = clients[i] || {};
      const photo = c.photoData || c.photo;
      if (typeof photo !== "string") continue;
      if (!photo.startsWith("data:")) continue;
      const commaIdx = photo.indexOf(",");
      if (commaIdx < 0) continue;
      const b64 = photo.slice(commaIdx + 1);
      total += Math.floor(b64.length * 0.75);
    }
    return total;
  }

  async function getSession(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("sessions", "readonly");
      const store = tx.objectStore("sessions");
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function addSession(session) {
    return addRecord("sessions", session);
  }

  async function updateSession(session) {
    return withStore("sessions", "readwrite", (store) => store.put(session));
  }

  async function deleteSession(id) {
    return withStore("sessions", "readwrite", (store) => store.delete(id));
  }

  async function getAllSessions() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("sessions", "readonly");
      const store = tx.objectStore("sessions");
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async function clearStore(storeName) {
    return withStore(storeName, "readwrite", (store) => store.clear());
  }

  async function clearAll() {
    await clearStore("sessions");
    await clearStore("clients");
    await clearStore("therapistSettings");
    if ((await openDB()).objectStoreNames.contains("snippets")) {
      await clearStore("snippets");
    }
    // Allow the next openDB() to repopulate the seed pack (debug-wipe flow).
    _seedingDone = false;
    _seedingPromise = null;
  }

  // ────────────────────────────────────────────────────────────────────
  // Snippets (Phase 24 Plan 04)
  // ────────────────────────────────────────────────────────────────────

  /**
   * validateSnippetShape — pure-function validator. Throws on any rejection
   * branch. Called by addSnippet/updateSnippet, by backup importer, and by
   * Plan 05 Settings UI before persisting user edits.
   *
   * Unknown locale keys in expansions (e.g., expansions.fr) are silently
   * allowed — the validator only enforces types for he/en/cs/de IF PRESENT
   * and requires the object itself.
   */
  function validateSnippetShape(snippet) {
    if (!snippet || typeof snippet !== "object" || Array.isArray(snippet)) {
      throw new Error("validateSnippetShape: snippet must be a non-array object");
    }
    if (typeof snippet.id !== "string" || snippet.id.length === 0) {
      throw new Error("validateSnippetShape: id must be a non-empty string");
    }
    if (typeof snippet.trigger !== "string" || !/^[a-z0-9-]{2,32}$/.test(snippet.trigger)) {
      throw new Error("validateSnippetShape: trigger must match /^[a-z0-9-]{2,32}$/ (got \"" + snippet.trigger + "\")");
    }
    if (!snippet.expansions || typeof snippet.expansions !== "object" || Array.isArray(snippet.expansions)) {
      throw new Error("validateSnippetShape: expansions must be a non-array object");
    }
    ["he", "en", "cs", "de"].forEach((loc) => {
      if (loc in snippet.expansions && typeof snippet.expansions[loc] !== "string") {
        throw new Error("validateSnippetShape: expansion " + loc + " must be a string (got " + typeof snippet.expansions[loc] + ")");
      }
    });
    if (!Array.isArray(snippet.tags)) {
      throw new Error("validateSnippetShape: tags must be an array");
    }
    snippet.tags.forEach((t, i) => {
      if (typeof t !== "string") {
        throw new Error("validateSnippetShape: tag " + i + " must be a string");
      }
    });
    if (snippet.origin !== "seed" && snippet.origin !== "user") {
      throw new Error("validateSnippetShape: origin must be \"seed\" or \"user\" (got " + JSON.stringify(snippet.origin) + ")");
    }
  }

  async function getAllSnippets() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("snippets", "readonly");
      const store = tx.objectStore("snippets");
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async function getSnippet(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("snippets", "readonly");
      const store = tx.objectStore("snippets");
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function addSnippet(snippet) {
    validateSnippetShape(snippet);
    return withStore("snippets", "readwrite", (store) => store.add(snippet));
  }

  async function updateSnippet(snippet) {
    validateSnippetShape(snippet);
    return withStore("snippets", "readwrite", (store) => store.put(snippet));
  }

  // Internal: read the deletedSeedIds list from therapistSettings.
  async function _getDeletedSeedIds() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("therapistSettings", "readonly");
      const store = tx.objectStore("therapistSettings");
      const request = store.get(DELETED_SEEDS_KEY);
      request.onsuccess = () => {
        const rec = request.result;
        resolve((rec && rec.deletedIds) || []);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Internal: write the deletedSeedIds list.
  async function _setDeletedSeedIds(ids) {
    return withStore("therapistSettings", "readwrite", (store) => {
      return store.put({ sectionKey: DELETED_SEEDS_KEY, deletedIds: ids });
    });
  }

  async function deleteSnippet(id) {
    const snippet = await getSnippet(id);
    if (snippet && snippet.origin === "seed") {
      // Persist the deletion so seedSnippetsIfNeeded does not re-add this seed
      // on next page load.
      const list = await _getDeletedSeedIds();
      if (!list.includes(id)) {
        await _setDeletedSeedIds(list.concat([id]));
      }
    }
    return withStore("snippets", "readwrite", (store) => store.delete(id));
  }

  /**
   * resetSeedSnippet — restores a seed snippet from window.SNIPPETS_SEED and
   * removes it from the deletedSeedIds list. Used by Plan 05 Settings UI
   * "Reset to default" action.
   *
   * Identifier-resolution note: window.SNIPPETS_SEED is accessed explicitly
   * via the window. prefix (matches seedSnippetsIfNeeded's discipline).
   */
  async function resetSeedSnippet(id) {
    const seed = (typeof window !== "undefined" && window.SNIPPETS_SEED) || [];
    const original = seed.find((s) => s.id === id);
    if (!original) {
      throw new Error("resetSeedSnippet: id \"" + id + "\" not found in seed pack");
    }
    await withStore("snippets", "readwrite", (store) => store.put(original));
    const list = await _getDeletedSeedIds();
    const filtered = list.filter((x) => x !== id);
    if (filtered.length !== list.length) {
      await _setDeletedSeedIds(filtered);
    }
  }

  // Phase 25 Plan 10 (CR-02 fix) — allow-set for the dedicated sentinel write
  // path. Kept narrow on purpose: any new sentinel record (non-section
  // therapistSettings row) MUST be added here AND in
  // backup.js#ALLOWED_SENTINEL_KEYS, in lock-step.
  const _SENTINEL_KEYS = new Set([DELETED_SEEDS_KEY]); // 'snippetsDeletedSeeds'

  /**
   * _writeTherapistSentinel — raw `put` into the therapistSettings store for
   * sentinel records that do NOT carry the {sectionKey, customLabel, enabled}
   * shape (e.g. snippetsDeletedSeeds with a deletedIds array).
   *
   * Why a separate path: setTherapistSetting coerces customLabel/enabled and
   * would store {sectionKey, customLabel:null, enabled:true, deletedIds:...}
   * which silently loses the sentinel semantics on read (the existing
   * _getDeletedSeedIds reader looks at .deletedIds which would survive, BUT
   * the customLabel/enabled fields polluting the row would confuse any future
   * code that walks therapistSettings looking only at section rows). This is
   * also a defence-in-depth boundary: section writes go through validation
   * (Phase 22 T-22-07-03), sentinels go through a tightly-scoped allow-set.
   *
   * Used by:
   *   - assets/backup.js importBackup loop (Plan 25-10 fix for CR-02)
   *
   * Input contract:
   *   record.sectionKey  — must be in _SENTINEL_KEYS
   *   record.deletedIds  — array (non-array → coerced to []); non-string
   *                        entries filtered silently (matches the discipline
   *                        in _setDeletedSeedIds).
   *
   * Returns: same promise shape as withStore put.
   */
  async function _writeTherapistSentinel(record) {
    if (!record || typeof record.sectionKey !== "string") {
      throw new Error("_writeTherapistSentinel: record.sectionKey required");
    }
    if (!_SENTINEL_KEYS.has(record.sectionKey)) {
      throw new Error("_writeTherapistSentinel: sectionKey '" +
        record.sectionKey + "' is not a registered sentinel");
    }
    const rawIds = Array.isArray(record.deletedIds) ? record.deletedIds : [];
    const cleanIds = rawIds.filter((x) => typeof x === "string");
    return withStore("therapistSettings", "readwrite", function (store) {
      return store.put({
        sectionKey: record.sectionKey,
        deletedIds: cleanIds,
      });
    });
  }

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

  async function getSessionsByClient(clientId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("sessions", "readonly");
      const store = tx.objectStore("sessions");
      const index = store.index("clientId");
      const request = index.getAll(clientId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async function deleteClientAndSessions(clientId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(["clients", "sessions"], "readwrite");
      const clientStore = tx.objectStore("clients");
      const sessionStore = tx.objectStore("sessions");
      clientStore.delete(clientId);
      const index = sessionStore.index("clientId");
      const range = IDBKeyRange.only(clientId);
      const request = index.openCursor(range);
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  return {
    addClient,
    updateClient,
    getClient,
    getAllClients,
    // Phase 25 Plan 07 — pure storage-size estimator
    estimatePhotosBytes,
    addSession,
    updateSession,
    deleteSession,
    getSession,
    getAllSessions,
    getSessionsByClient,
    deleteClientAndSessions,
    clearAll,
    getAllTherapistSettings,
    setTherapistSetting,
    // Phase 25 Plan 10 (CR-02) — raw sentinel write path; see definition above.
    _writeTherapistSentinel,
    clearTherapistSettings,
    // Phase 24 Plan 04 — snippets API
    validateSnippetShape,
    getAllSnippets,
    getSnippet,
    addSnippet,
    updateSnippet,
    deleteSnippet,
    resetSeedSnippet,
  };
})();
