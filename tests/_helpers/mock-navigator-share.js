/**
 * tests/_helpers/mock-navigator-share.js
 *
 * Reusable Web Share API mock for Phase 25 backup tests.
 * Shared between Plan 01 (share fallback / encryption-inherit) and Plan 08
 * (round-trip test).
 *
 * Usage:
 *   const { createShareMock } = require('./_helpers/mock-navigator-share');
 *   const mock = createShareMock({ canShareReturns: true, shareReturns: Promise.resolve() });
 *   sandboxNavigator.canShare = mock.canShare;
 *   sandboxNavigator.share    = mock.share;
 *   // ... drive code under test ...
 *   assert.deepEqual(mock.calls[0].files[0].name, 'expected.sgbackup');
 *
 * Options:
 *   canShareReturns : boolean | (args) => boolean   default true
 *   shareThrows     : Error                          if set, share() rejects with this
 *   shareReturns    : Promise                        default Promise.resolve()
 */

'use strict';

function createShareMock(opts) {
  opts = opts || {};
  const calls = [];

  const canShare = function (data) {
    // Record canShare probes too so tests can verify the feature-detect call shape
    if (typeof opts.canShareReturns === 'function') {
      return !!opts.canShareReturns(data);
    }
    // default: true
    if (typeof opts.canShareReturns === 'undefined') return true;
    return !!opts.canShareReturns;
  };

  const share = function (data) {
    // Record a SAFE snapshot of the call (don't capture the live File object —
    // we record name/type/size for assertions; the actual File reference is
    // also kept on `data.files` if a test needs it).
    const filesSnapshot = Array.isArray(data && data.files)
      ? data.files.map(function (f) {
          return { name: f && f.name, type: f && f.type, size: f && f.size };
        })
      : [];
    calls.push({
      files: filesSnapshot,
      title: data && data.title,
      text: data && data.text,
      raw: data,
    });
    if (opts.shareThrows) {
      return Promise.reject(opts.shareThrows);
    }
    if (opts.shareReturns) return opts.shareReturns;
    return Promise.resolve();
  };

  return { canShare: canShare, share: share, calls: calls };
}

module.exports = { createShareMock: createShareMock };
