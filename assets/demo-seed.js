// demo-seed.js — fetches demo-seed-data.json, clears and re-seeds demo_portfolio
// on every load; exposes window.demoSeedReady (a Promise). Must run after db.js
// and before overview.js so the dashboard renders the seed data.
window.demoSeedReady = (function() {
  'use strict';

  // ── Relative-date seam ──────────────────────────────────────────────────────
  // Computed-date model: the seed JSON carries a per-session integer `daysAgo`
  // instead of a hardcoded absolute `date`, so the demo self-freshens forever
  // and never looks abandoned. These helpers are PURE (no IndexedDB) and are
  // exposed on window BEFORE the demo-mode early-return below, so tests (and any
  // non-demo context) can exercise the transform without triggering a seed/write.

  // isoDaysAgo(n, now?): YYYY-MM-DD for `n` days before `now` (default live Date),
  // anchored at LOCAL NOON so day-arithmetic + getMonth()/getFullYear() never slip
  // across a UTC/midnight boundary (Pitfall 5 — countSessionsThisMonth re-parses
  // this string with local new Date(session.date)).
  function isoDaysAgo(n, now) {
    var base = now ? new Date(now.getTime()) : new Date();
    base.setHours(12, 0, 0, 0);          // noon anchor — dodges the month-edge tz slip
    base.setDate(base.getDate() - n);
    var y = base.getFullYear();
    var m = String(base.getMonth() + 1).padStart(2, '0');
    var d = String(base.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }

  // applyRelativeDates(sessions, now?): returns COPIES with date = isoDaysAgo(daysAgo)
  // and `daysAgo` removed. Pure — no IndexedDB, safe to call outside demo mode.
  function applyRelativeDates(sessions, now) {
    return sessions.map(function(s) {
      var copy = Object.assign({}, s);
      copy.date = isoDaysAgo(s.daysAgo, now);
      delete copy.daysAgo;
      // Phase 38 (NEXT-07): an optional relative next-appointment offset, mirroring
      // the daysAgo->date conversion above. NEGATIVE values yield a FUTURE date
      // (isoDaysAgo(-6) is 6 days ahead of `now`), so the demo "Next Session"
      // column self-freshens and reads mostly-upcoming instead of drifting
      // all-overdue over time (D-12). Sessions without the helper are untouched
      // (no nextSessionDate injected). Reuses isoDaysAgo — no new date math.
      if (s.nextSessionDaysAgo !== null && s.nextSessionDaysAgo !== undefined) {
        copy.nextSessionDate = isoDaysAgo(s.nextSessionDaysAgo, now);
        delete copy.nextSessionDaysAgo;
      }
      return copy;
    });
  }

  // Expose the seam BEFORE the early-return so it is reachable in any context.
  window.__demoSeedHelpers = { isoDaysAgo: isoDaysAgo, applyRelativeDates: applyRelativeDates };

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
    // Compute each session's absolute date at load time from its relative
    // `daysAgo` offset (live Date → the demo always shows current dates).
    sessions = applyRelativeDates(sessions);
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
