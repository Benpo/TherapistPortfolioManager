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
 *   clients              : array     default []           — getAllClients return
 *   sessions             : array     default []           — getAllSessions return
 *   therapistSettings    : array     default []           — getAllTherapistSettings return
 *   snippets             : array     default []           — getAllSnippets return
 *   validateSnippetShape : function  default returns true — pure validator behavior
 */

'use strict';

const WRITE_METHODS = [
  'clearAll',
  'addClient',
  'addSession',
  'setTherapistSetting',
  'updateSnippet',
];

const READ_METHODS = [
  'getAllClients',
  'getAllSessions',
  'getAllTherapistSettings',
  'getAllSnippets',
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

  function makeWriteSpy(name) {
    return function () {
      const args = Array.prototype.slice.call(arguments).map(deepCopy);
      calls.get(name).push(args);
      return Promise.resolve();
    };
  }

  function makeReadSpy(name, defaultValue) {
    return function () {
      calls.get(name).push([]);
      return Promise.resolve(defaultValue);
    };
  }

  const mock = {
    __calls: calls,

    // Writes (spied)
    clearAll: makeWriteSpy('clearAll'),
    addClient: makeWriteSpy('addClient'),
    addSession: makeWriteSpy('addSession'),
    setTherapistSetting: makeWriteSpy('setTherapistSetting'),
    updateSnippet: makeWriteSpy('updateSnippet'),

    // Reads (return configured arrays; spied call-shape)
    getAllClients: makeReadSpy('getAllClients', opts.clients || []),
    getAllSessions: makeReadSpy('getAllSessions', opts.sessions || []),
    getAllTherapistSettings: makeReadSpy('getAllTherapistSettings', opts.therapistSettings || []),
    getAllSnippets: makeReadSpy('getAllSnippets', opts.snippets || []),

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
