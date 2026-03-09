window.PortfolioDB = (() => {
  const DB_NAME = "emotion_code_portfolio";
  const DB_VERSION = 1;

  function openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("clients")) {
          const store = db.createObjectStore("clients", { keyPath: "id", autoIncrement: true });
          store.createIndex("name", "name", { unique: false });
        }
        if (!db.objectStoreNames.contains("sessions")) {
          const store = db.createObjectStore("sessions", { keyPath: "id", autoIncrement: true });
          store.createIndex("clientId", "clientId", { unique: false });
          store.createIndex("date", "date", { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
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
