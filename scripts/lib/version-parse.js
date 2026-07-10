/**
 * version-parse.js — the ONE shared extractor for the app's release-moment
 * version literal. Both callers use this single implementation so no forked copy
 * can drift apart (D-17): scripts/docs-gate.js reads the version at each end of a
 * push range to detect a release, and scripts/lib/invariants.js asserts (fifth
 * invariant) that this extractor still parses the live assets/version.js so
 * GATE-04's release-moment check can never silently, permanently self-disable on
 * a benign version.js reformat (WR-06).
 *
 * Semantics (byte-for-byte with the former local copy in docs-gate.js):
 *   - null on falsy input.
 *   - otherwise the first capture of /APP_VERSION\s*[:=]\s*['"](\d+\.\d+\.\d+)['"]/
 *     (a bare single/double-quoted semver literal), or null when it does not match.
 *
 * Node built-ins only. No packages.
 */

'use strict';

// Extract the APP_VERSION semver literal from a version.js source blob.
function extractAppVersion(src) {
  if (!src) return null;
  var m = /APP_VERSION\s*[:=]\s*['"](\d+\.\d+\.\d+)['"]/.exec(src);
  return m ? m[1] : null;
}

module.exports = {
  extractAppVersion: extractAppVersion,
};
