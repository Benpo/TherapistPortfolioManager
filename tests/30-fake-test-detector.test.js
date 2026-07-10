/**
 * Phase 30 Plan 13 — Prevention #1: permanent fake-test detector gate (B).
 * Hardened 2026-06-27 (Phase 30 code-review WR-01 / WR-02).
 *
 * THE FAILURE CLASS THIS GATE PREVENTS (recorded in 30-VERIFICATION.md):
 *   A "behavior test" that reads an `assets/*.js` production module AS TEXT and
 *   asserts over its SOURCE STRING (e.g. `SRC.indexOf('function ' + name)` +
 *   `SRC.slice(...)` then regex-counts call order) WITHOUT ever executing the
 *   module. Such a test pins *shape*, not *behavior*: it stays GREEN through a
 *   Phase-31 refactor that breaks the real behavior, and false-FAILs on a pure
 *   internal rename. Two such fakes were removed in 30-12.
 *
 * SCOPE — EXECUTABLE ASSETS ONLY (`assets/*.js`):
 *   A test file is a CANDIDATE when it reads an `assets/*.js` file as text into a
 *   variable, BY ANY READER. Both forms are recognised regardless of helper name:
 *   `var X = fs.readFileSync(path.join(ROOT,'assets','x.js'))` AND
 *   `var X = readAsset('assets/x.js')` (the read hidden behind a `_helpers/`
 *   module). The two-step `const p='assets/x.js'; readFileSync(p)` shape is also
 *   caught (legacy union). Reading `.css` / `.html` as text is NEVER a candidate
 *   (the `.js` extension is required) so the static CSS/HTML audits stay green.
 *
 *   [WR-01 hardening] Candidacy no longer requires a literal `readFileSync`
 *   TOKEN in the test file. The previous gate could be dodged by moving the
 *   `fs.readFileSync` into a helper module; candidacy is now also keyed on the
 *   asset-source ASSIGNMENT (`var X = <anyReader>('assets/x.js')`), which a
 *   helper-hidden read still produces.
 *
 * FLAGGING — a candidate is flagged when EITHER:
 *   (a) it EXECUTES NOTHING — no variable is passed to an execution sink
 *       (`vm.runInContext(v)` / `win.eval(v)` / `vm.Script(v)` / `new Script(v)`).
 *       Reading the module source and never running it IS the source-slicer; OR
 *   (b) it DOES execute an asset-source var, yet feeds a value DERIVED FROM THAT
 *       SOURCE TEXT (`.slice`/`.substring`/`.match`/regex `.exec`) into an
 *       EQUALITY assertion (deepStrictEqual / strictEqual / equal / ...) — the
 *       subtle fake that eval's the module yet asserts on its source string as if
 *       it were behaviour. Flagged EVEN WHEN execution is present.
 *
 *   [WR-02 hardening] (a) now requires a variable to actually be PASSED TO an
 *   execution sink, not the mere PRESENCE of an execution-marker word. The
 *   previous gate accepted any `vm|eval|jsdom|runInContext` token, so a dead
 *   `var jsdom = null` (or an unused `require('vm')`) masqueraded as execution.
 *   A bare identifier executes nothing and no longer exonerates a source-slicer.
 *   (`executedVars` is matched on raw source so it does not depend on a fragile
 *   comment/string stripper that mis-handles regex literals — that fragility is
 *   exactly what produced false positives on real `vm.runInContext` tests during
 *   development of this hardening.)
 *
 *   Why (b) is scoped to EQUALITY-on-source-derived (not any `.indexOf`/`.slice`
 *   over source): this codebase's REAL, executing characterization tests
 *   routinely carve a function region out of source for an auxiliary *presence*
 *   sanity check (`assert.ok(slice.indexOf(token) !== -1)`) alongside genuine
 *   runtime assertions. A blanket "source is inspected" rule would flag those
 *   green tests. Asserting a source-derived value EQUALS an expected sequence
 *   (what the removed fakes did) is the precise tell of "source-as-behaviour".
 *
 * HONEST LIMITATION: static fake-detection is heuristic, not a proof. This gate
 * closes the two reported evasions (helper-hidden read; dead execution-marker
 * word) and proves it via the SELF_TESTS below. A determined author who passes a
 * dummy variable to a live execution sink, or hides an execution call in a
 * comment, AND avoids equality on source, could still slip past (a)+(b); that
 * residual is covered by human code review, not by this gate alone. Do not
 * over-claim this makes fakes impossible — it makes the two *known accidental*
 * patterns fail loudly on every `npm test`.
 *
 * ALLOWLIST — basenames exempt (each a deliberate static removal/audit guard
 * that reads assets/*.js as text by design, or this file):
 *   - 25-08-single-source-audit         (D-30 single-source-of-truth audit)
 *   - 25-11-hardcoded-english-removed    (i18n hardcoded-string removal guard)
 *   - 25-12-folder-picker-removed        (folder-picker removal guard)
 *   - 35-demo-static                     (demo convergence + demo-hints removal source gate)
 *   - 41-anchor-presence                 (Phase 41 tour-anchor rot guard — scans assets/app.js for the backup/help data-tour anchors by design)
 *   - docs-gate                          (docs-rot gate behavior spec — executes the real gate via execFileSync in a synthesized fixture repo; its assets/*.js literals are fixture writes, not source-slicing reads)
 *   - 30-fake-test-detector              (this gate; self-allowlisted defensively)
 *
 * Run: node tests/30-fake-test-detector.test.js
 *   (set FAKE_DETECTOR_REPORT=1 to print every flagged file + reason and exit 0)
 * Exits 0 on full pass, 1 on any non-allowlisted flagged file OR a SELF_TEST miss.
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
  '35-demo-static': 'Phase 35 demo convergence + demo-hints removal source gate (DEMO-01/02/08/09 — static greps over demo.html/i18n/sw.js/assets, no execution by design; the runtime behavior is covered by the executing 35-demo-chrome jsdom gate)',
  '41-anchor-presence': 'Phase 41 tour-anchor rot guard (TOUR-02/TOUR-03) — scans assets/app.js as text for the backup/help data-tour setAttribute anchors by design; a source-scan is the correct shape for a "did a refactor silently drop the anchor" guard, mirroring 40-precache',
  'docs-gate': 'docs-rot gate behavior spec — writes synthetic assets/*.js fixtures into a throwaway git repo and EXECUTES the real gate (scripts/docs-gate.js) via execFileSync, asserting on observable verdicts (exit codes + messages); the execution sink is the gate process, not vm/eval, so this detector cannot see it',
  '30-fake-test-detector': 'this gate — reads tests/*.test.js, never assets/*.js; self-allowlisted defensively'
};

// ---------------------------------------------------------------------------
// Candidate detection.
// Legacy union form: a literal `readFileSync` token plus an assets/*.js path —
// catches the two-step `const p='assets/x.js'; readFileSync(p)` shape that the
// assignment-based detector below would miss.
// ---------------------------------------------------------------------------
var RE_LITERAL_ASSET_JS = /['"`]assets\/[^'"`]+\.js['"`]/;
var RE_JOIN_ASSET_JS = /path\.join\([^)]*['"`]assets['"`][^)]*['"`][^'"`]*\.js['"`][^)]*\)/;

function readsAssetJsLegacy(raw) {
  return /readFileSync/.test(raw) && (RE_LITERAL_ASSET_JS.test(raw) || RE_JOIN_ASSET_JS.test(raw));
}

// Identify the variables assigned from a read of an assets/*.js file. Matches
// any reader fn (readFileSync / readSrc / readAsset / readSource / ...), so a
// helper-hidden read still registers as an asset-source var (WR-01).
function assetSourceVars(raw) {
  var vars = {};
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

// Variables that are EXECUTED (passed as first arg to an execution sink). Matched
// on raw source: a bare `var jsdom = null` or unused `require('vm')` is NOT a
// sink call, so it produces no executed var (the WR-02 fix). The first arg must
// be an identifier — a string literal arg (e.g. runInContext('1+1')) captures
// nothing, matching the intent "a read source variable is executed".
function executedVars(raw) {
  var ex = {};
  var re = /(?:runInContext|runInNewContext|runInThisContext|new\s+vm\.Script|vm\.Script|new\s+Script|\.eval|\beval)\s*\(\s*([A-Za-z_$][\w$]*)/g;
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
        if (reSlice.test(rhs) || reExec.test(rhs)) hit = true;
      });
      if (hit) { derived[name] = true; added = true; }
    }
    if (!added) break;
  }
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
  var anyExecutedSource = Object.keys(srcVars).some(function (v) { return execSet[v]; });
  if (!anyExecutedSource) return null;

  var re = /assert\s*\.\s*(?:deepStrictEqual|deepEqual|strictEqual|notStrictEqual|equal)\s*\(/g;
  var m;
  while ((m = re.exec(raw)) !== null) {
    var args = callArgs(raw, re.lastIndex - 1);
    var inlineHit = Object.keys(srcVars).some(function (v) {
      if (!execSet[v]) return false;
      var reInline = new RegExp('\\b' + v + '\\.(?:slice|substring|substr|match|indexOf)\\s*\\(');
      var reExecArg = new RegExp('\\.(?:exec|test)\\s*\\(\\s*' + v + '\\b');
      return reInline.test(args) || reExecArg.test(args);
    });
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
// Pure classifier — the single source of truth for both the live scan and the
// SELF_TESTS. Returns { candidate, flagged, reason }.
// ---------------------------------------------------------------------------
function classify(raw) {
  var srcVars = assetSourceVars(raw);
  var isCandidate = Object.keys(srcVars).length > 0 || readsAssetJsLegacy(raw);
  if (!isCandidate) return { candidate: false, flagged: false, reason: null };

  var execSet = executedVars(raw);
  if (Object.keys(execSet).length === 0) {
    return {
      candidate: true, flagged: true,
      reason: 'reads assets/*.js as text but EXECUTES nothing — no variable is passed to an ' +
        'execution sink (runInContext/eval/vm.Script) — source-slicer'
    };
  }

  var executedSrcVars = {};
  Object.keys(srcVars).forEach(function (v) { if (execSet[v]) executedSrcVars[v] = true; });
  var derivedSet = sourceDerivedVars(raw, executedSrcVars);
  var bDetail = equalityOnSourceDerived(raw, executedSrcVars, execSet, derivedSet);
  if (bDetail) {
    return {
      candidate: true, flagged: true,
      reason: 'executes the module, but asserts on its EXECUTED SOURCE TEXT — ' + bDetail
    };
  }
  return { candidate: true, flagged: false, reason: null };
}

// ---------------------------------------------------------------------------
// SELF_TESTS — prove the classifier catches each evasion and spares each real
// pattern. These run on every `npm test`; a miss fails the gate. They make the
// detector's discrimination falsifiable instead of asserted.
// ---------------------------------------------------------------------------
var SELF_TESTS = [
  {
    name: 'WR-01: helper-hidden read + source-slice, never executes -> FLAGGED',
    expectFlagged: true,
    src: [
      "const { readAsset } = require('./_helpers/read-asset.js');",
      "const SRC = readAsset('assets/add-session.js');",
      "assert.ok(SRC.indexOf('function buildA') < SRC.indexOf('function buildB'));"
    ].join('\n')
  },
  {
    name: 'WR-02: source-slice with a DEAD var jsdom marker -> FLAGGED',
    expectFlagged: true,
    src: [
      "const fs = require('fs');",
      "const path = require('path');",
      "var jsdom = null;",
      "const SRC = fs.readFileSync(path.join(ROOT, 'assets', 'settings.js'), 'utf8');",
      "assert.ok(SRC.indexOf('save') < SRC.indexOf('toast'));"
    ].join('\n')
  },
  {
    name: 'WR-02b: source-slice with an unused require(vm) marker -> FLAGGED',
    expectFlagged: true,
    src: [
      "const fs = require('fs');",
      "const vm = require('vm');",
      "const SRC = fs.readFileSync(path.join(ROOT, 'assets', 'app.js'), 'utf8');",
      "assert.ok(/function mount/.test(SRC));"
    ].join('\n')
  },
  {
    name: 'REAL: executes module, asserts on runtime output -> not flagged',
    expectFlagged: false,
    src: [
      "const fs = require('fs');",
      "const vm = require('vm');",
      "const SRC = fs.readFileSync(path.join(ROOT, 'assets', 'settings.js'), 'utf8');",
      "const sandbox = { window: {} };",
      "vm.createContext(sandbox);",
      "vm.runInContext(SRC, sandbox);",
      "assert.strictEqual(sandbox.window.SettingsPage.compute(), 42);"
    ].join('\n')
  },
  {
    name: 'REAL: executes module AND aux-slices source for a presence check -> not flagged',
    expectFlagged: false,
    src: [
      "const SRC = fs.readFileSync(path.join(ROOT, 'assets', 'add-session.js'), 'utf8');",
      "vm.runInContext(SRC, sandbox);",
      "const region = SRC.slice(SRC.indexOf('function autoGrow'), SRC.indexOf('function next'));",
      "assert.ok(region.indexOf('scrollHeight') !== -1);",
      "assert.strictEqual(sandbox.window.result, 7);"
    ].join('\n')
  },
  {
    name: 'REAL (win.eval helper-read): executes via win.eval, asserts DOM -> not flagged',
    expectFlagged: false,
    src: [
      "const SRC = readAsset('assets/add-session.js');",
      "win.eval(SRC);",
      "assert.strictEqual(win.document.getElementById('title').textContent, 'Hello');"
    ].join('\n')
  },
  {
    name: 'REAL (two-step readFileSync): reads via a path var then runInContext -> not flagged',
    expectFlagged: false,
    src: [
      "const p = path.join(ROOT, 'assets', 'backup-modal.js');",
      "const src = fs.readFileSync(p, 'utf8');",
      "vm.runInContext(src, sandbox);",
      "assert.strictEqual(typeof sandbox.win.openBackupModal, 'function');"
    ].join('\n')
  },
  {
    name: 'CONTROL: reads only index.html (no assets/*.js) -> not a candidate',
    expectFlagged: false,
    src: [
      "const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');",
      "assert.ok(html.indexOf('id=\"backupModal\"') !== -1);"
    ].join('\n')
  }
];

function runSelfTests() {
  var failures = [];
  SELF_TESTS.forEach(function (t) {
    var got = classify(t.src).flagged;
    if (got !== t.expectFlagged) {
      failures.push('  - ' + t.name + '\n      expected flagged=' + t.expectFlagged + ', got ' + got);
    }
  });
  return failures;
}

// ---------------------------------------------------------------------------
// Run the detector over every top-level tests/*.test.js
// ---------------------------------------------------------------------------
var files = fs.readdirSync(TESTS_DIR)
  .filter(function (f) { return f.endsWith('.test.js'); })
  .sort();

var flagged = []; // { file, reason }
var inspected = 0;

files.forEach(function (file) {
  var base = file.replace(/\.test\.js$/, '');
  var raw = fs.readFileSync(path.join(TESTS_DIR, file), 'utf8');

  var result = classify(raw);
  if (!result.candidate) return;
  inspected++;

  if (result.flagged) {
    if (!ALLOWLIST[base]) flagged.push({ file: file, reason: result.reason });
  }
});

// ---------------------------------------------------------------------------
// Self-test gate (always runs — even in REPORT mode the miss is surfaced)
// ---------------------------------------------------------------------------
var selfTestFailures = runSelfTests();

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
console.log('30-fake-test-detector — scanned ' + files.length + ' test files, ' +
  inspected + ' read an assets/*.js (candidates); ' + SELF_TESTS.length + ' self-tests');
console.log('  allowlist (legit static guards + self): ' + Object.keys(ALLOWLIST).join(', '));

if (REPORT_ONLY) {
  if (flagged.length === 0) {
    console.log('\nREPORT: no non-allowlisted files flagged. Tree is clean.');
  } else {
    console.log('\nREPORT: ' + flagged.length + ' flagged file(s):');
    flagged.forEach(function (f) { console.log('  - ' + f.file + '\n      ' + f.reason); });
  }
  if (selfTestFailures.length > 0) {
    console.log('\nREPORT: ' + selfTestFailures.length + ' SELF_TEST miss(es):');
    console.log(selfTestFailures.join('\n'));
  }
  process.exit(0);
}

if (selfTestFailures.length > 0) {
  console.error('\nFAIL  ' + selfTestFailures.length + ' detector SELF_TEST(s) misclassified — the gate itself is broken:');
  console.error(selfTestFailures.join('\n'));
  console.error('\nThe classifier no longer catches a known evasion (or now false-flags a real');
  console.error('pattern). Fix classify() before relying on this gate.');
  process.exit(1);
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
  inspected + ' assets/*.js reader(s) all execute the module (or are allowlisted guards); ' +
  SELF_TESTS.length + ' self-tests green.');
process.exit(0);
