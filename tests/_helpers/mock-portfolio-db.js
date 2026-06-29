/**
 * tests/_helpers/mock-portfolio-db.js
 *
 * Reusable spy-instrumented PortfolioDB mock for Phase 25 backup tests.
 *
 * Plan 25-03 (testBackupPassword no-mutation tests) and Plan 25-08
 * (round-trip integration test) share this helper.
 *
 * Every write method records its invocations on a `__calls` Map keyed by
 * method name. Read methods return [] by default (configurable via opts).
 *
 * Usage:
 *   const { createMockPortfolioDB, assertNoWrites } = require('./_helpers/mock-portfolio-db');
 *   const mockDb = createMockPortfolioDB();
 *   sandbox.window.PortfolioDB = mockDb;
 *   // ... drive code under test ...
 *   assertNoWrites(mockDb);                 // throws if any write fired
 *   mockDb.__calls.get('clearAll');         // [] (empty) means no calls
 *
 * Options:
 *   clients              : array     default []           — getAllClients / getClient store
 *   sessions             : array     default []           — getAllSessions / getSession store
 *   therapistSettings    : array     default []           — getAllTherapistSettings return
 *   snippets             : array     default []           — getAllSnippets store
 *   validateSnippetShape : function  default returns true — pure validator behavior
 *
 * Phase 30 Plan 07 (Task 0 / G2) — store-backed extension. The mock is now
 * backed by in-memory clients/sessions/snippets stores seeded from `opts`, so
 * the add-session / settings characterization tests (and all of wave 2:
 * 30-08..30-12) can drive the REAL page methods instead of re-adding them
 * locally and colliding on this shared file. Four new methods are exposed:
 *
 *   getSession(id)  : read  — looks up the seeded session store by id, records
 *                     the call on the read ledger, resolves the record or null.
 *   getClient(id)   : read  — same, against the client store.
 *   addSnippet(s)   : write — pushes into the snippet store, recorded; in
 *                     WRITE_METHODS so assertNoWrites covers it.
 *   deleteSnippet(id): write — removes from the snippet store by id, recorded;
 *                     in WRITE_METHODS.
 *
 * getAllSnippets now reads back the LIVE snippet store (so a write is observable
 * on the next read), and updateSnippet mutates that same store by id while
 * keeping its existing __calls spy behavior. All additive — existing consumers
 * (25-03, 25-08, 30-01..06) that only assert the __calls ledger stay green.
 */

'use strict';

const WRITE_METHODS = [
  'clearAll',
  'addClient',
  'addSession',
  'setTherapistSetting',
  'updateSnippet',
  // Phase 30 Plan 07 (Task 0 / G2) — store-backed snippet mutations. In
  // WRITE_METHODS so assertNoWrites covers them for the no-mutation tests.
  'addSnippet',
  'deleteSnippet',
  // Phase 25 Plan 10 (CR-02) — sentinel write path. Added to the shared
  // helper so Plan 25-08 round-trip test can assert sentinel survival
  // without duplicating mock plumbing. assertNoWrites picks this up
  // automatically (any mutation MUST be opt-in for no-mutation tests).
  '_writeTherapistSentinel',
];

const READ_METHODS = [
  'getAllClients',
  'getAllSessions',
  'getAllTherapistSettings',
  'getAllSnippets',
  // Phase 30 Plan 07 (Task 0 / G2) — id-keyed reads against the seeded stores.
  'getSession',
  'getClient',
  // Phase 34 Plan 04 (Wave 0 / FN-1) — client-scoped session read backing the
  // 34-session-ordinal.test.js ordinal-derivation gate. Mirrors the REAL
  // PortfolioDB.getSessionsByClient (db.js:976-986): index.getAll(clientId),
  // returned UNSORTED (primary-key/store order — NOT date order) so the
  // derivation under test must do the date sort + id tie-break itself.
  'getSessionsByClient',
];

function createMockPortfolioDB(opts) {
  opts = opts || {};
  const calls = new Map();
  WRITE_METHODS.forEach(function (m) { calls.set(m, []); });
  READ_METHODS.forEach(function (m) { calls.set(m, []); });
  calls.set('validateSnippetShape', []);

  function deepCopy(arg) {
    try { return JSON.parse(JSON.stringify(arg)); } catch (_) { return arg; }
  }

  // Phase 30 Plan 07 (Task 0 / G2) — live in-memory stores seeded from opts.
  // Deep-copied on seed so the caller's seed arrays are never mutated by writes.
  const clientStore = (opts.clients || []).map(deepCopy);
  const sessionStore = (opts.sessions || []).map(deepCopy);
  const snippetStore = (opts.snippets || []).map(deepCopy);

  function sameId(a, b) { return String(a) === String(b); }

  function makeWriteSpy(name) {
    return function () {
      const args = Array.prototype.slice.call(arguments).map(deepCopy);
      calls.get(name).push(args);
      return Promise.resolve();
    };
  }

  // Read spy returning the LIVE store (deep-copied) so writes are observable on
  // the next read. Records the call-shape on the ledger like the legacy spy.
  function makeStoreReadSpy(name, store) {
    return function () {
      calls.get(name).push([]);
      return Promise.resolve(store.map(deepCopy));
    };
  }

  function makeReadSpy(name, defaultValue) {
    return function () {
      calls.get(name).push([]);
      return Promise.resolve(defaultValue);
    };
  }

  // id-keyed read: records [id], resolves the matching record (deep-copied) or
  // null. Mirrors PortfolioDB.getSession / getClient (resolve a single record).
  function makeByIdReadSpy(name, store) {
    return function (id) {
      calls.get(name).push([id]);
      const found = store.find(function (r) { return sameId(r.id, id); });
      return Promise.resolve(found ? deepCopy(found) : null);
    };
  }

  const mock = {
    __calls: calls,

    // Writes (spied)
    clearAll: makeWriteSpy('clearAll'),
    addClient: makeWriteSpy('addClient'),
    addSession: makeWriteSpy('addSession'),
    setTherapistSetting: makeWriteSpy('setTherapistSetting'),
    // updateSnippet: keep the __calls spy AND mutate the live store by id so a
    // round-trip (write → getAllSnippets) reflects the edit.
    updateSnippet: function (snippet) {
      calls.get('updateSnippet').push(Array.prototype.slice.call(arguments).map(deepCopy));
      if (snippet && snippet.id != null) {
        const idx = snippetStore.findIndex(function (s) { return sameId(s.id, snippet.id); });
        if (idx !== -1) { snippetStore[idx] = deepCopy(snippet); }
      }
      return Promise.resolve();
    },
    // Phase 30 Plan 07 (Task 0 / G2) — store-backed snippet add/delete.
    addSnippet: function (snippet) {
      calls.get('addSnippet').push(Array.prototype.slice.call(arguments).map(deepCopy));
      snippetStore.push(deepCopy(snippet));
      return Promise.resolve();
    },
    deleteSnippet: function (id) {
      calls.get('deleteSnippet').push([id]);
      const idx = snippetStore.findIndex(function (s) { return sameId(s.id, id); });
      if (idx !== -1) { snippetStore.splice(idx, 1); }
      return Promise.resolve();
    },
    // Phase 25 Plan 10 (CR-02) — raw sentinel write path for the
    // snippetsDeletedSeeds therapistSettings row. backup.js importBackup
    // calls this BEFORE the snippet-restore loop so seedSnippetsIfNeeded
    // sees the restored deleted-ids.
    _writeTherapistSentinel: makeWriteSpy('_writeTherapistSentinel'),

    // Reads — getAll* now read the LIVE stores (deep-copied); a write is
    // observable on the next read. therapistSettings keeps the legacy shape.
    getAllClients: makeStoreReadSpy('getAllClients', clientStore),
    getAllSessions: makeStoreReadSpy('getAllSessions', sessionStore),
    getAllTherapistSettings: makeReadSpy('getAllTherapistSettings', opts.therapistSettings || []),
    getAllSnippets: makeStoreReadSpy('getAllSnippets', snippetStore),

    // id-keyed reads against the seeded stores.
    getSession: makeByIdReadSpy('getSession', sessionStore),
    getClient: makeByIdReadSpy('getClient', clientStore),

    // Phase 34 Plan 04 (Wave 0 / FN-1) — client-scoped sessions, UNSORTED.
    // Records [clientId] on the ledger; resolves the seeded sessions whose
    // .clientId matches, deep-copied, in STORE (seed-array) order — deliberately
    // NOT date-sorted, mirroring the real index.getAll(clientId). The ordinal
    // derivation under test (34-05 deriveSessionOrdinal) is responsible for the
    // chronological sort + numeric-id tie-break.
    getSessionsByClient: function (clientId) {
      calls.get('getSessionsByClient').push([clientId]);
      var matches = sessionStore.filter(function (s) { return sameId(s.clientId, clientId); });
      return Promise.resolve(matches.map(deepCopy));
    },

    // Pure validator (reading is OK; writing is forbidden). Default = accept.
    validateSnippetShape: function (snippet) {
      calls.get('validateSnippetShape').push([deepCopy(snippet)]);
      if (typeof opts.validateSnippetShape === 'function') {
        return opts.validateSnippetShape(snippet);
      }
      return true;
    },
  };

  return mock;
}

/**
 * Throws if any of the five write methods recorded a call.
 * Use after exercising code that MUST NOT touch IndexedDB.
 */
function assertNoWrites(mock) {
  if (!mock || !mock.__calls) {
    throw new Error('assertNoWrites: not a PortfolioDB mock (missing __calls Map)');
  }
  const violations = [];
  WRITE_METHODS.forEach(function (m) {
    const arr = mock.__calls.get(m) || [];
    if (arr.length > 0) {
      violations.push(m + ' called ' + arr.length + ' time(s)');
    }
  });
  if (violations.length > 0) {
    throw new Error('assertNoWrites FAILED: ' + violations.join(', '));
  }
}

module.exports = {
  createMockPortfolioDB: createMockPortfolioDB,
  assertNoWrites: assertNoWrites,
  WRITE_METHODS: WRITE_METHODS,
  READ_METHODS: READ_METHODS,
};
