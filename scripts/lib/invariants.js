/**
 * invariants.js — the four file-on-disk checks the docs gate runs before it ever
 * looks at a push range, and the same four checks the test suite exercises. One
 * implementation, two callers: the gate gets them for free and npm test catches
 * any drift, because both sides run this module rather than forking its logic.
 *
 * The four invariants:
 *   1. checkHelpMapFresh — the committed HELP-MAP.md byte-matches a fresh regen
 *      (reuses the help-map generator; no map logic is re-implemented here).
 *   2. checkCoversExist — every file named in any EN help topic's covers[] list
 *      actually exists on disk (a dangling covers[] entry is a broken index).
 *   3. checkChangelogSchema — the changelog data source obeys its structural
 *      contract (unique reverse-chronological semver, highlights 2–4 on content
 *      entries, the origin entry tolerated as a one-line marker).
 *   4. checkRoleTable — the role table is internally consistent (nothing is both
 *      denylisted and a trigger; no satisfier is a trigger; the watch set is
 *      exactly the intended types; every denylist entry is a real shipped file).
 *
 * Fail closed: every check THROWS an Error with a descriptive message on any
 * violation and returns quietly on success. Callers wrap in try/catch (the gate)
 * or run inside a test harness (the suite) — either way a violation is impossible
 * to miss. The assets/repo directory is a parameter so the gate can point these
 * at a target repository; it defaults to this module's own repository root.
 *
 * Node built-ins only (fs / path) plus in-repo siblings (help-loader, the help-map
 * generator, the role table). No packages, no jsdom.
 */

'use strict';

var fs = require('fs');
var path = require('path');

var loader = require('./help-loader.js');
var genHelpMap = require('../gen-help-map.js');
var roleTable = require('./role-table.js');

// scripts/lib/ → repo root is two levels up. Callers may override per-check.
var DEFAULT_REPO_ROOT = path.join(__dirname, '..', '..');

function assetsDirFor(repoRoot) {
  return path.join(repoRoot || DEFAULT_REPO_ROOT, 'assets');
}

// ── Invariant 1: HELP-MAP.md freshness ───────────────────────────────────────
// Reuse the generator's buildMap() (the canonicalization substrate that must not
// be duplicated) and compare byte-for-byte against the committed map at the given
// repo root. Throws on any mismatch or a missing map. The repoRoot argument keeps
// the map path co-located with the assets it indexes, so the gate can aim this at
// a target checkout rather than this module's own repo.
function checkHelpMapFresh(repoRoot) {
  var root = repoRoot || DEFAULT_REPO_ROOT;
  var assetsDir = path.join(root, 'assets');
  var mapPath = path.join(root, 'HELP-MAP.md');
  var expected = genHelpMap.buildMap(assetsDir);
  var actual;
  try {
    actual = fs.readFileSync(mapPath, 'utf8');
  } catch (err) {
    throw new Error(
      'HELP-MAP.md is missing at ' + mapPath +
      ' — run `node scripts/gen-help-map.js` and commit the result.'
    );
  }
  if (actual !== expected) {
    throw new Error(
      'HELP-MAP.md is stale (does not match a fresh regeneration) — ' +
      'run `node scripts/gen-help-map.js` and commit the result.'
    );
  }
}

// ── Invariant 2: every covers[] path exists on disk ──────────────────────────
// Load the EN help corpus through the shared loader and assert every repo-relative
// path any topic claims to cover is a real file. A missing target means the index
// points at something that was renamed or deleted. Throws listing the offenders.
function checkCoversExist(assetsDir) {
  var dir = assetsDir || assetsDirFor();
  var repoRoot = path.dirname(dir);
  var sections = loader.loadHelpContentEN(dir);
  var missing = [];
  for (var s = 0; s < sections.length; s++) {
    var topics = sections[s].topics || [];
    for (var t = 0; t < topics.length; t++) {
      var covers = topics[t].covers || [];
      for (var c = 0; c < covers.length; c++) {
        var rel = covers[c];
        if (!fs.existsSync(path.join(repoRoot, rel))) {
          missing.push(sections[s].id + '/' + topics[t].id + ' → ' + rel);
        }
      }
    }
  }
  if (missing.length) {
    throw new Error(
      'covers[] names ' + missing.length + ' file(s) that do not exist on disk: ' +
      missing.slice(0, 8).join('; ') + (missing.length > 8 ? ', …' : '')
    );
  }
}

// ── Invariant 3: changelog schema ────────────────────────────────────────────
// The single shared implementation of the changelog structural contract. Load the
// EN changelog through the shared loader and assert: unique valid semver versions,
// strictly reverse-chronological order, and — for every non-origin content entry —
// a highlights array of length 2–4. The origin entry (origin:true) is tolerated as
// a one-line marker with no highlights. Throws on the first violation.
function checkChangelogSchema(assetsDir) {
  var dir = assetsDir || assetsDirFor();
  var entries = loader.loadChangelogEN(dir);

  function semverTuple(v) {
    var m = /^(\d+)\.(\d+)\.(\d+)$/.exec(v);
    return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
  }
  function cmpDesc(a, b) {
    for (var i = 0; i < 3; i++) if (a[i] !== b[i]) return b[i] - a[i];
    return 0;
  }

  // Unique, valid semver versions.
  var seen = {};
  for (var i = 0; i < entries.length; i++) {
    var v = entries[i].version;
    if (typeof v !== 'string' || !semverTuple(v)) {
      throw new Error('changelog: invalid semver version: ' + JSON.stringify(v));
    }
    if (seen[v]) throw new Error('changelog: duplicate version: ' + v);
    seen[v] = true;
  }

  // Strictly reverse-chronological (newest first, no adjacent equals).
  for (var j = 1; j < entries.length; j++) {
    var prev = semverTuple(entries[j - 1].version);
    var cur = semverTuple(entries[j].version);
    var c = cmpDesc(prev, cur);
    if (c > 0) {
      throw new Error(
        'changelog: not reverse-chronological: ' +
        entries[j - 1].version + ' precedes newer ' + entries[j].version
      );
    }
    if (c === 0) {
      throw new Error('changelog: adjacent equal versions: ' + entries[j].version);
    }
  }

  // Content entries carry highlights of length 2–4; the origin entry does not.
  for (var k = 0; k < entries.length; k++) {
    var e = entries[k];
    if (e.origin === true) continue;
    if (!Array.isArray(e.highlights) || e.highlights.length < 2 || e.highlights.length > 4) {
      throw new Error(
        'changelog: highlights length out of [2,4] on ' + e.version + ': ' +
        (Array.isArray(e.highlights) ? e.highlights.length : typeof e.highlights)
      );
    }
    for (var h = 0; h < e.highlights.length; h++) {
      if (typeof e.highlights[h] !== 'string' || e.highlights[h].trim().length === 0) {
        throw new Error('changelog: empty highlight string on ' + e.version);
      }
    }
  }
}

// ── Invariant 4: role-table self-consistency ─────────────────────────────────
// The role table cannot contradict itself without letting a real change through or
// blocking a non-change. Assert: every denylist entry classifies as denylisted
// (never a trigger) and is a real file on disk; the known satisfiers classify as
// satisfiers (never triggers); the watch set is exactly the intended types (a
// shipped code file is watched, a non-code or non-shipped file is not). Throws on
// the first contradiction. repoRoot locates the denylist files on disk.
function checkRoleTable(repoRoot) {
  var root = repoRoot || DEFAULT_REPO_ROOT;

  // No path is both denylisted and a trigger; every denylist entry is real.
  var dl = roleTable.DENYLIST;
  if (!Array.isArray(dl) || dl.length === 0) {
    throw new Error('role-table: DENYLIST must be a non-empty array');
  }
  for (var i = 0; i < dl.length; i++) {
    var p = dl[i];
    var role = roleTable.classify(p);
    if (role !== 'denylisted') {
      throw new Error(
        'role-table: DENYLIST entry "' + p + '" classifies as "' + role +
        '" — a path cannot be both denylisted and watched'
      );
    }
    if (!fs.existsSync(path.join(root, p))) {
      throw new Error('role-table: DENYLIST names "' + p + '" but no such file exists');
    }
  }

  // Satisfiers never classify as triggers.
  var satisfiers = [
    'assets/help-content-en.js', 'assets/help-content-he.js',
    'assets/help-content-de.js', 'assets/help-content-cs.js',
    'assets/changelog-content-en.js', 'assets/changelog-content-he.js',
    'assets/changelog-content-de.js', 'assets/changelog-content-cs.js',
  ];
  for (var s = 0; s < satisfiers.length; s++) {
    var srole = roleTable.classify(satisfiers[s]);
    if (srole !== 'satisfier') {
      throw new Error(
        'role-table: satisfier "' + satisfiers[s] + '" classifies as "' + srole +
        '" — a satisfier must never raise its own demand'
      );
    }
  }

  // The watch set is exactly the intended types: shipped code is a trigger;
  // non-code shipped files and non-shipped code are ignored.
  var watchedExamples = ['assets/app.js', 'assets/app.css', 'index.html', 'manifest.json', 'sw.js'];
  for (var w = 0; w < watchedExamples.length; w++) {
    if (roleTable.classify(watchedExamples[w]) !== 'trigger') {
      throw new Error('role-table: expected "' + watchedExamples[w] + '" to be a trigger');
    }
  }
  var ignoredExamples = ['assets/demo-seed-data.json', 'assets/branding/logo.png', 'tests/x.test.js', 'scripts/docs-gate.js'];
  for (var g = 0; g < ignoredExamples.length; g++) {
    if (roleTable.classify(ignoredExamples[g]) !== 'ignored') {
      throw new Error('role-table: expected "' + ignoredExamples[g] + '" to be ignored');
    }
  }
}

module.exports = {
  DEFAULT_REPO_ROOT: DEFAULT_REPO_ROOT,
  checkHelpMapFresh: checkHelpMapFresh,
  checkCoversExist: checkCoversExist,
  checkChangelogSchema: checkChangelogSchema,
  checkRoleTable: checkRoleTable,
};
