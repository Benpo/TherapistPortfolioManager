window.PortfolioDB = (() => {
  const DB_NAME = "emotion_code_portfolio";
  const DB_VERSION = 1;

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
    // Phase 3 will add version 2 here when schema changes are needed:
    // 2: function addReferralSource(db, transaction) { ... },
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
    banner.style.cssText = [
      "position:fixed",
      "top:0",
      "left:0",
      "right:0",
      "z-index:9999",
      "background:var(--color-danger, #ea4b4b)",
      "color:#fff",
      "padding:12px 16px",
      "text-align:center",
      "font-family:Rubik,system-ui,sans-serif",
      "font-size:14px",
    ].join(";");
    banner.textContent = "Please close other tabs of this app to continue.";
    document.body.prepend(banner);
  }

  function showDBVersionChangedMessage() {
    // The DB was upgraded by another tab — this tab must reload
    const existing = document.getElementById("dbVersionChangedBanner");
    if (existing) return;

    const banner = document.createElement("div");
    banner.id = "dbVersionChangedBanner";
    banner.setAttribute("role", "alert");
    banner.style.cssText = [
      "position:fixed",
      "top:0",
      "left:0",
      "right:0",
      "z-index:9999",
      "background:var(--color-primary, #7c66ff)",
      "color:#fff",
      "padding:12px 16px",
      "text-align:center",
      "font-family:Rubik,system-ui,sans-serif",
      "font-size:14px",
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "gap:12px",
    ].join(";");

    const msg = document.createElement("span");
    msg.textContent = "A newer version of this app is open. Please refresh to continue.";

    const btn = document.createElement("button");
    btn.textContent = "Refresh";
    btn.style.cssText = "background:#fff;color:var(--color-primary,#7c66ff);border:none;border-radius:6px;padding:4px 12px;cursor:pointer;font-weight:600;";
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
    banner.style.cssText = [
      "position:fixed",
      "top:0",
      "left:0",
      "right:0",
      "z-index:9999",
      "background:var(--color-danger, #ea4b4b)",
      "color:#fff",
      "padding:12px 16px",
      "text-align:center",
      "font-family:Rubik,system-ui,sans-serif",
      "font-size:14px",
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "gap:12px",
    ].join(";");

    const msg = document.createElement("span");
    msg.textContent = "Database update failed. Your data is safe. Please refresh the page to try again.";

    const btn = document.createElement("button");
    btn.textContent = "Refresh page";
    btn.style.cssText = "background:#fff;color:var(--color-danger,#ea4b4b);border:none;border-radius:6px;padding:4px 12px;cursor:pointer;font-weight:600;";
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
    return new Promise(async (resolve, reject) => {
      const db = await openDB();
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
    return new Promise(async (resolve, reject) => {
      const db = await openDB();
      const tx = db.transaction("clients", "readonly");
      const store = tx.objectStore("clients");
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function getAllClients() {
    return new Promise(async (resolve, reject) => {
      const db = await openDB();
      const tx = db.transaction("clients", "readonly");
      const store = tx.objectStore("clients");
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async function getSession(id) {
    return new Promise(async (resolve, reject) => {
      const db = await openDB();
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
    return new Promise(async (resolve, reject) => {
      const db = await openDB();
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
    return new Promise(async (resolve, reject) => {
      const db = await openDB();
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
