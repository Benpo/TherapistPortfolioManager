/**
 * Phase 30 Plan 13 — Prevention #1: permanent fake-test detector gate (B).
 *
 * THE FAILURE CLASS THIS GATE PREVENTS (recorded in 30-VERIFICATION.md):
 *   A "behavior test" that `fs.readFileSync`s an `assets/*.js` production module
 *   AS TEXT and asserts over its SOURCE STRING (e.g. `SRC.indexOf('function ' +
 *   name + '(')` + `SRC.slice(...)` then regex-counts call order) WITHOUT ever
 *   executing the module (`vm`/`eval`/`jsdom`/`runInContext`). Such a test pins
 *   *shape*, not *behavior*: it stays GREEN through a Phase-31 refactor that
 *   breaks the real behavior, and false-FAILs on a pure internal rename. Two
 *   such fakes (`quick-260615-export-section-order`,
 *   `quick-260516-g7p-save-returns-to-session`) were removed in 30-12; this gate
 *   makes the class non-recurring by failing on every `npm test`.
 *
 * SCOPE — EXECUTABLE ASSETS ONLY (`assets/*.js`):
 *   A test file is a CANDIDATE only if it reads an `assets/*.js` file as text.
 *   Reading `.css` / `.html` as text is NEVER a candidate (the CSS/HTML audits
 *   such as 25-12-password-ack-* and 25-13-css-audit are legitimately static).
 *   Both read forms are recognised: the `path.join(ROOT,'assets','x.js')` form
 *   AND a literal `'assets/x.js'` string handed to a read helper. The bare
 *   `assets/` substring is deliberately NOT matched (it false-trips the .css
 *   readers) — the `.js` extension is required.
 *
 * FLAGGING — a candidate is flagged when EITHER:
 *   (a) after comments AND string/template literals are STRIPPED, the file has
 *       NO execution marker `vm|eval|jsdom|runInContext` — so a "jsdom" written
 *       only in a comment (25-13-css-audit:17) or inside a string cannot
 *       masquerade as execution; OR
 *   (b) an asset-source variable that IS executed nonetheless feeds a value
 *       DERIVED FROM ITS SOURCE TEXT (`.slice`/`.substring`/`.match`/regex
 *       `.exec`) into an EQUALITY assertion (deepStrictEqual / strictEqual /
 *       deepEqual / equal / notStrictEqual) — the subtle fake that eval's the
 *       module yet asserts on its source string as if it were behaviour. This is
 *       flagged EVEN WHEN an execution marker is present.
 *
 *   Why (b) is scoped to EQUALITY-on-source-derived (not any `.indexOf`/`.slice`
 *   over source): this codebase's REAL, executing characterization tests
 *   routinely carve a function region out of source for an auxiliary *presence*
 *   sanity check (`assert.ok(slice.indexOf(token) !== -1)`) alongside genuine
 *   runtime assertions — e.g. 25-02-modal-structure, 25-12-custom-days-visibility,
 *   25-12-photos-usage-language-rerender, quick-260516-rna. A blanket "source is
 *   inspected" rule would flag all of those green tests and is therefore
 *   incompatible with the green-tree + 4-entry-allowlist contract. Asserting a
 *   source-derived value EQUALS an expected sequence (what the removed fakes did:
 *   `assert.deepStrictEqual(orderExtractedFromSource, expected)`) is the precise
 *   tell of "source-as-behaviour" and is absent from every current real test.
 *
 * ALLOWLIST — exactly four basenames are exempt (each a deliberate static
 * removal/audit guard that reads assets/*.js as text by design, or this file):
 *   - 25-08-single-source-audit         (D-30 single-source-of-truth audit)
 *   - 25-11-hardcoded-english-removed    (i18n hardcoded-string removal guard)
 *   - 25-12-folder-picker-removed        (folder-picker removal guard)
 *   - 30-fake-test-detector              (this gate; self-allowlisted defensively)
 *
 * The gate exits 0 on the post-30-12 tree (the only remaining read-without-
 * execute files are the three allowlisted guards). Run inside `npm test` via
 * run-all.js discovery (matches `30-*.test.js`).
 *
 * Run: node tests/30-fake-test-detector.test.js
 *   (set FAKE_DETECTOR_REPORT=1 to print every flagged file + reason and exit 0)
 * Exits 0 on full pass, 1 on any non-allowlisted flagged file.
 */

'use strict';

var fs = require('fs');
var path = require('path');

var TESTS_DIR = __dirname;
var REPORT_ONLY = process.env.FAKE_DETECTOR_REPORT === '1';

// Static removal/audit guards (read assets/*.js as text by design) + self.
var ALLOWLIST = {
  '25-08-single-source-audit': 'D-30 single-source-of-truth audit (static greps, no execution by design)',
  '25-11-hardcoded-english-removed': 'i18n hardcoded-English removal guard (static absence check)',
  '25-12-folder-picker-removed': 'folder-picker removal guard (static absence check)',
  '30-fake-test-detector': 'this gate — reads tests/*.test.js, never assets/*.js; self-allowlisted defensively'
};

// ---------------------------------------------------------------------------
// Source hygiene: strip block + line comments and string/template literals via
// a small char-state machine so an execution marker word inside a comment or
// string ("jsdom", "retrieval"...) cannot satisfy the marker scan.
// ---------------------------------------------------------------------------
function stripCommentsAndStrings(text) {
  var out = '';
  var i = 0;
  var n = text.length;
  var state = 'code'; // code | line | block | sq | dq | tpl
  while (i < n) {
    var c = text[i];
    var c2 = i + 1 < n ? text[i + 1] : '';
    if (state === 'code') {
      if (c === '/' && c2 === '/') { state = 'line'; i += 2; continue; }
      if (c === '/' && c2 === '*') { state = 'block'; i += 2; continue; }
      if (c === "'") { state = 'sq'; i += 1; out += ' '; continue; }
      if (c === '"') { state = 'dq'; i += 1; out += ' '; continue; }
      if (c === '`') { state = 'tpl'; i += 1; out += ' '; continue; }
      out += c; i += 1; continue;
    }
    if (state === 'line') {
      if (c === '\n') { state = 'code'; out += '\n'; }
      i += 1; continue;
    }
    if (state === 'block') {
      if (c === '*' && c2 === '/') { state = 'code'; i += 2; continue; }
      if (c === '\n') out += '\n';
      i += 1; continue;
    }
    // string / template states: skip content, honour backslash escapes
    if (c === '\\') { i += 2; continue; }
    if (state === 'sq' && c === "'") { state = 'code'; i += 1; continue; }
    if (state === 'dq' && c === '"') { state = 'code'; i += 1; continue; }
    if (state === 'tpl' && c === '`') { state = 'code'; i += 1; continue; }
    if (c === '\n') out += '\n';
    i += 1;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Candidate detection: does the RAW file text read an assets/*.js as text?
//   - literal string form:  '...assets/x.js' / "assets/fonts/y.js"
//   - path.join form:        path.join(ROOT, 'assets', ..., 'x.js')
// .css / .html are NOT matched (the `.js` extension is required).
// ---------------------------------------------------------------------------
var RE_LITERAL_ASSET_JS = /['"`]assets\/[^'"`]+\.js['"`]/;
var RE_JOIN_ASSET_JS = /path\.join\([^)]*['"`]assets['"`][^)]*['"`][^'"`]*\.js['"`][^)]*\)/;

function readsAssetJs(raw) {
  return /readFileSync/.test(raw) && (RE_LITERAL_ASSET_JS.test(raw) || RE_JOIN_ASSET_JS.test(raw));
}

// Identify the variables assigned from a read of an assets/*.js file. Matches
// any reader fn (readFileSync / readSrc / readAsset / readSource / ...).
function assetSourceVars(raw) {
  var vars = {};
  // var X = <reader>( ... assets/*.js ... )   (literal or join form)
  var re = /(?:var|const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*[A-Za-z_$.][\w$.]*\(([^;]*?)\)/g;
  var m;
  while ((m = re.exec(raw)) !== null) {
    var name = m[1];
    var rhs = m[2];
    if (/['"`]assets\/[^'"`]+\.js['"`]/.test(rhs) ||
        (/['"`]assets['"`]/.test(rhs) && /\.js['"`]/.test(rhs) && /join/.test(m[0]))) {
      vars[name] = true;
    }
  }
  return vars;
}

// Variables that are EXECUTED (passed to an execution sink as first arg).
function executedVars(raw) {
  var ex = {};
  var re = /(?:runInContext|new\s+vm\.Script|vm\.Script|new\s+Script|\.eval|\beval)\s*\(\s*([A-Za-z_$][\w$]*)/g;
  var m;
  while ((m = re.exec(raw)) !== null) ex[m[1]] = true;
  return ex;
}

// Source-derived variables: assigned from a string-inspection op (.slice /
// .substring / .match) on an asset-source var or another derived var, or from a
// regex .exec(<src>). Two hops are resolved.
function sourceDerivedVars(raw, seedVars) {
  var derived = Object.assign({}, seedVars);
  for (var pass = 0; pass < 3; pass++) {
    var added = false;
    var re = /(?:var|const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*([^;]+);/g;
    var m;
    while ((m = re.exec(raw)) !== null) {
      var name = m[1];
      var rhs = m[2];
      if (derived[name]) continue;
      var hit = false;
      Object.keys(derived).forEach(function (sv) {
        var reSlice = new RegExp('\\b' + sv + '\\.(?:slice|substring|substr|match)\\s*\\(');
        var reExec = new RegExp('\\.exec\\s*\\(\\s*' + sv + '\\b');
        var reMatchArg = new RegExp('\\.match\\s*\\(\\s*[^)]*\\)\\s*'); // defensive
        if (reSlice.test(rhs) || reExec.test(rhs)) hit = true;
      });
      if (hit) { derived[name] = true; added = true; }
    }
    if (!added) break;
  }
  // Remove the seed asset-source vars themselves so callers can distinguish.
  return derived;
}

// Balanced-paren slice starting at the '(' index.
function callArgs(text, openIdx) {
  var depth = 0, i = openIdx;
  for (; i < text.length; i++) {
    if (text[i] === '(') depth++;
    else if (text[i] === ')') { depth--; if (depth === 0) return text.slice(openIdx + 1, i); }
  }
  return text.slice(openIdx + 1);
}

// (b): an executed asset-source var whose SOURCE-DERIVED value is fed into an
// EQUALITY assertion. Returns the offending detail string or null.
function equalityOnSourceDerived(raw, srcVars, execSet, derivedSet) {
  // Only meaningful if at least one asset-source var is actually executed.
  var anyExecutedSource = Object.keys(srcVars).some(function (v) { return execSet[v]; });
  if (!anyExecutedSource) return null;

  var re = /assert\s*\.\s*(?:deepStrictEqual|deepEqual|strictEqual|notStrictEqual|equal)\s*\(/g;
  var m;
  while ((m = re.exec(raw)) !== null) {
    var args = callArgs(raw, re.lastIndex - 1);
    // inline source op on an executed asset-source var, e.g. SRC.slice(...)
    var inlineHit = Object.keys(srcVars).some(function (v) {
      if (!execSet[v]) return false;
      var reInline = new RegExp('\\b' + v + '\\.(?:slice|substring|substr|match|indexOf)\\s*\\(');
      var reExecArg = new RegExp('\\.(?:exec|test)\\s*\\(\\s*' + v + '\\b');
      return reInline.test(args) || reExecArg.test(args);
    });
    // a source-derived identifier passed as an arg
    var derivedHit = Object.keys(derivedSet).some(function (d) {
      if (srcVars[d]) return false; // skip the raw source vars (handled inline)
      return new RegExp('\\b' + d + '\\b').test(args);
    });
    if (inlineHit || derivedHit) {
      return 'equality assertion over source-derived text: assert.' +
        raw.slice(m.index + 7, re.lastIndex).replace(/\s+/g, '') + '…';
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Run the detector over every top-level tests/*.test.js
// ---------------------------------------------------------------------------
var MARKER = /\b(?:vm|eval|jsdom|runInContext)\b/i;

var files = fs.readdirSync(TESTS_DIR)
  .filter(function (f) { return f.endsWith('.test.js'); })
  .sort();

var flagged = []; // { file, reason }
var inspected = 0;

files.forEach(function (file) {
  var base = file.replace(/\.test\.js$/, '');
  var raw = fs.readFileSync(path.join(TESTS_DIR, file), 'utf8');

  if (!readsAssetJs(raw)) return; // not a candidate (no assets/*.js text read)
  inspected++;

  var stripped = stripCommentsAndStrings(raw);
  var hasMarker = MARKER.test(stripped);

  var reason = null;
  if (!hasMarker) {
    reason = 'reads assets/*.js as text but has NO execution marker ' +
      '(vm|eval|jsdom|runInContext) after comments+strings stripped — source-slicer';
  } else {
    var srcVars = assetSourceVars(raw);
    var execSet = executedVars(raw);
    // (b) is the SAME-MODULE subtle fake: "eval's a module AND feeds ITS source
    // text into an assertion". Only consider source-derived chains rooted at an
    // asset-source var that is ITSELF executed — so a removal/audit guard that
    // equality-checks the source of a DIFFERENT, non-executed module (e.g.
    // 25-08-encrypt-then-share counting removed overview.js branches) is NOT a
    // false positive.
    var executedSrcVars = {};
    Object.keys(srcVars).forEach(function (v) { if (execSet[v]) executedSrcVars[v] = true; });
    var derivedSet = sourceDerivedVars(raw, executedSrcVars);
    var bDetail = equalityOnSourceDerived(raw, executedSrcVars, execSet, derivedSet);
    if (bDetail) {
      reason = 'eval/exec present, but asserts on the EXECUTED module SOURCE TEXT — ' + bDetail;
    }
  }

  if (reason) {
    if (ALLOWLIST[base]) {
      // allowlisted: a deliberate static guard — not a fake
    } else {
      flagged.push({ file: file, reason: reason });
    }
  }
});

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
console.log('30-fake-test-detector — scanned ' + files.length + ' test files, ' +
  inspected + ' read an assets/*.js (candidates)');
console.log('  allowlist (legit static guards + self): ' + Object.keys(ALLOWLIST).join(', '));

if (REPORT_ONLY) {
  if (flagged.length === 0) {
    console.log('\nREPORT: no non-allowlisted files flagged. Tree is clean.');
  } else {
    console.log('\nREPORT: ' + flagged.length + ' flagged file(s):');
    flagged.forEach(function (f) { console.log('  - ' + f.file + '\n      ' + f.reason); });
  }
  process.exit(0);
}

if (flagged.length > 0) {
  console.error('\nFAIL  ' + flagged.length + ' fake-test(s) detected (source-slicing assets/*.js):');
  flagged.forEach(function (f) {
    console.error('  - ' + f.file);
    console.error('      ' + f.reason);
  });
  console.error('\nA test must EXECUTE the asset (vm/eval/jsdom/runInContext) and assert on');
  console.error('observable runtime output — not on the module source text. If this is a');
  console.error('deliberate static removal/audit guard, add it to ALLOWLIST with a justification.');
  process.exit(1);
}

console.log('\nPASS  no fake (source-slicing) tests detected; ' +
  inspected + ' assets/*.js reader(s) all execute the module (or are allowlisted guards).');
process.exit(0);
