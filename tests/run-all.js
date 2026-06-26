#!/usr/bin/env node
/**
 * tests/run-all.js -- the single documented suite runner (TEST-04, D-01).
 *
 * Discovers every top-level `tests/*.test.js`, runs each in its own `node`
 * child process (continue-on-fail), preserves each file's exit-0/1 contract,
 * prints a per-file PASS/FAIL line plus a final summary, and exits non-zero if
 * ANY single file failed. This is the green gate that will guard the Phase 31
 * refactor.
 *
 * Top-level-only discovery (readdirSync on tests/) deliberately excludes the
 * tests/_helpers/ directory: helpers are not `.test.js` files and are never run
 * as tests.
 *
 * JSDOM_PATH bridge (F-G): the 8 legacy jsdom tests resolve jsdom via
 *   process.env.JSDOM_PATH || '/tmp/node_modules/jsdom'
 * The `/tmp` location no longer exists now that jsdom is an installed
 * devDependency, so this runner sets JSDOM_PATH for each child UNCONDITIONALLY
 * to the repo's installed node_modules/jsdom. We override even an inherited
 * value, because a developer with a stale `export JSDOM_PATH=/tmp/...` left over
 * from the legacy convention would otherwise FATAL all 8 jsdom tests. A
 * caller-supplied override is honored ONLY if it actually resolves on disk.
 *
 * Runs once and exits -- no watch mode.
 */

'use strict';

var fs = require('fs');
var path = require('path');
var spawnSync = require('child_process').spawnSync;

var TESTS_DIR = __dirname;

// --- JSDOM_PATH bridge -----------------------------------------------------
var repoJsdom = path.join(__dirname, '..', 'node_modules', 'jsdom');
var jsdomPath = repoJsdom;
var override = process.env.JSDOM_PATH;
if (override && override !== repoJsdom && fs.existsSync(override)) {
  // Honor an explicit caller override only when it resolves on disk; a stale
  // /tmp value (the legacy default) does not resolve and is ignored.
  jsdomPath = override;
}

// --- Discover top-level test files -----------------------------------------
var testFiles = fs.readdirSync(TESTS_DIR)
  .filter(function (f) { return f.endsWith('.test.js'); })
  .sort();

if (testFiles.length === 0) {
  console.error('run-all: no tests/*.test.js files found');
  process.exit(1);
}

console.log('Running ' + testFiles.length + ' test file(s) from tests/\n');

var childEnv = Object.assign({}, process.env, { JSDOM_PATH: jsdomPath });

var passed = [];
var failed = [];

for (var i = 0; i < testFiles.length; i++) {
  var file = testFiles[i];
  var result = spawnSync(process.execPath, [path.join(TESTS_DIR, file)], {
    stdio: 'inherit',
    env: childEnv,
  });

  // A non-zero exit OR a terminating signal counts as a failure.
  var ok = result.status === 0 && result.signal == null;
  if (ok) {
    passed.push(file);
    console.log('PASS  ' + file);
  } else {
    failed.push(file);
    var why = result.signal ? ('signal ' + result.signal) : ('exit ' + result.status);
    console.log('FAIL  ' + file + '  (' + why + ')');
  }
}

console.log('\n----------------------------------------');
console.log('Suite: ' + passed.length + ' passed, ' + failed.length + ' failed, ' + testFiles.length + ' total');
if (failed.length > 0) {
  console.log('Failed files:');
  for (var j = 0; j < failed.length; j++) {
    console.log('  - ' + failed[j]);
  }
  process.exit(1);
}
console.log('All test files passed.');
process.exit(0);
