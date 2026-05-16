/* === DEMO SEED DATA === */
/* Fetches demo-seed-data.json, clears demo_portfolio, and seeds it on every load. */
/* Must run AFTER db.js but BEFORE overview.js so the dashboard renders seed data. */

window.demoSeedReady = (function() {
  'use strict';

  if (window.name !== 'demo-mode') return Promise.resolve();

  // Delete and recreate the demo DB, then seed with exported data
  return new Promise(function(resolve) {
    var dbName = 'demo_portfolio';
    var delReq = indexedDB.deleteDatabase(dbName);
    delReq.onsuccess = delReq.onerror = delReq.onblocked = function() {
      fetchAndSeed().then(resolve).catch(function(err) {
        console.warn('Demo seed failed:', err);
        resolve();
      });
    };
  });

  function fetchAndSeed() {
    return fetch('./assets/demo-seed-data.json')
      .then(function(res) { return res.json(); })
      .then(function(data) { return seedData(data.clients || [], data.sessions || []); });
  }

  async function seedData(clients, sessions) {
    // Re-key from 1 so autoIncrement works cleanly for new records
    var clientIdMap = {};
    for (var i = 0; i < clients.length; i++) {
      var oldId = clients[i].id;
      var c = Object.assign({}, clients[i]);
      delete c.id;
      var newId = await PortfolioDB.addClient(c);
      clientIdMap[oldId] = newId;
    }
    for (var j = 0; j < sessions.length; j++) {
      var s = Object.assign({}, sessions[j]);
      delete s.id;
      s.clientId = clientIdMap[s.clientId] || s.clientId;
      await PortfolioDB.addSession(s);
    }
  }

})();
