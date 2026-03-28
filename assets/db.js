window.PortfolioDB = (() => {
  const DB_NAME = window.name === "demo-mode" ? "demo_portfolio" : "sessions_garden";
  const OLD_DB_NAME = "emotion_code_portfolio";
  const DB_VERSION = 3;

  let _migrationDone = false;

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

        resolve(db);
      };

      request.onerror = () => reject(request.error);
    });
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
    addSession,
    updateSession,
    deleteSession,
    getSession,
    getAllSessions,
    getSessionsByClient,
    deleteClientAndSessions,
    clearAll
  };
})();
