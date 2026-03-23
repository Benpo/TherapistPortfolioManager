window.PortfolioDB = (() => {
  const DB_NAME = window.name === "demo-mode" ? "demo_portfolio" : "emotion_code_portfolio";
  const DB_VERSION = 3;

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

  function openDB() {
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
