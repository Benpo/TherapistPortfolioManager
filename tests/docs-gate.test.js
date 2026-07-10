/**
 * docs-gate.test.js — falsifiable RED/GREEN behavior spec for the docs-rot gate.
 *
 * This file is authored BEFORE the gate script exists. It is the executable
 * specification of the gate's blocking behavior: a gate that always passes ships
 * green too — only a test that can go RED proves the gate can actually block.
 *
 * It fails RED today (scripts/docs-gate.js is absent → the child `node` process
 * throws ENOENT) for the right reason, and is structured so that once the real
 * gate lands every case flips to PASS with no edits here.
 *
 * Mechanics (all node built-ins, no jsdom, offline, self-cleaning):
 *   - Build a throwaway repo under os.tmpdir() with a local --bare origin so
 *     `origin/main` resolves natively for the range read.
 *   - Force the branch name to `main` explicitly (`git init -b main`). The
 *     harness nulls GIT_CONFIG_GLOBAL/GIT_CONFIG_SYSTEM for isolation, so git
 *     would otherwise fall back to its compiled-in `master` and every
 *     `origin/main..HEAD` range would fail to resolve.
 *   - Synthesize a MINIMAL fixture corpus (a tiny help/changelog/version set) —
 *     never a copy of the real content, so each RED cause is unambiguous and the
 *     spec stays decoupled from live content churn.
 *   - Invoke the REAL gate with cwd set to the work repo, so it resolves its
 *     assets from the repo root (cwd), not from its own install directory.
 *   - Capture exit code + stderr via execFileSync's thrown error.
 *   - Clean up the temp tree in a finally so no dirs are left behind.
 *
 * The gate contract this spec pins:
 *   node scripts/docs-gate.js --range <gitRange>   (cwd = repo root)
 *     exit 0  → the push is allowed
 *     exit !0 → the push is blocked; a human-readable reason is printed to stderr
 *
 *   A "watched" (user-facing) file is a shipped path (root *.html, anything
 *   under assets/, plus manifest.json and sw.js) whose extension is code
 *   (.js/.css/.html). Non-code shipped files (images, fonts, .json, .txt) are
 *   ignored. Two content files are "satisfiers": editing
 *   assets/help-content-en.js satisfies the help demand; editing
 *   assets/changelog-content-en.js satisfies the changelog demand. Satisfiers
 *   never raise a demand of their own.
 *
 *   For any watched, non-satisfier change in the range the push must carry BOTH:
 *     - a changelog edit OR a `Changelog-Unaffected:` trailer, AND
 *     - for a file NAMED by some topic's covers[]: a help edit (its claiming
 *       topic) OR a `Help-Unaffected: <file> — reason` trailer;
 *       for a file NO topic covers: a `Help-Unaffected:` trailer naming it
 *       (an uncovered watched file blocks until covered or declared).
 *   `Docs-Emergency-Skip:` on the range's TIP commit waives everything with a
 *   loud banner. When APP_VERSION changes in the range the changelog must carry
 *   an entry for exactly that version with non-empty highlights.
 *
 * Run: node tests/docs-gate.test.js
 * Exits 0 on full pass, non-zero on any failure (RED until the gate ships).
 */

'use strict';

var os = require('os');
var fs = require('fs');
var path = require('path');
var execFileSync = require('child_process').execFileSync;

var REPO_ROOT = path.resolve(__dirname, '..');
var GATE = path.join(REPO_ROOT, 'scripts', 'docs-gate.js');
var GATE_EXISTS = fs.existsSync(GATE);

var passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log('  PASS  ' + name); passed++; }
  catch (e) { console.log('  FAIL  ' + name); console.log('        ' + (e && e.message || e)); failed++; }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }

// ── Throwaway repo scaffolding ───────────────────────────────────────────────
var tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'docsgate-'));
var ENV = Object.assign({}, process.env, {
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_SYSTEM: '/dev/null',
});
var ORIGIN = path.join(tmp, 'origin.git');
var WORK = path.join(tmp, 'work');
var BASELINE = null; // SHA of the pushed baseline commit on main

function git(args, opts) {
  return execFileSync('git', ['-C', WORK].concat(args),
    Object.assign({ env: ENV, stdio: 'pipe' }, opts)).toString();
}
function writeFile(rel, content) {
  var abs = path.join(WORK, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
}
function rmFile(rel) {
  var abs = path.join(WORK, rel);
  if (fs.existsSync(abs)) fs.rmSync(abs);
}

// Build a commit message with an optional trailer block. `trailers` is an array
// of [key, value] pairs rendered as a proper trailer block (blank line, then
// `Key: value` lines) so git's %(trailers) parser reads them. `bodyExtra` is
// free-form body text inserted BEFORE the trailer block (used for the code-fence
// decoy — a trailer-looking line buried in a fenced block must NOT count).
function msg(subject, trailers, bodyExtra) {
  var out = subject + '\n';
  if (bodyExtra) out += '\n' + bodyExtra + '\n';
  if (trailers && trailers.length) {
    out += '\n';
    trailers.forEach(function (t) { out += t[0] + ': ' + t[1] + '\n'; });
  }
  return out;
}

// Reset the work tree to the pushed baseline (detached), discarding every commit
// and file change from the previous scenario. Because every scenario commits all
// of its files, checking out the baseline removes the ones it added.
function resetToBaseline() {
  git(['checkout', '-q', '-f', '--detach', BASELINE]);
}

// Commit the current index with the given message. `stage` defaults to all.
function commit(subject, trailers, bodyExtra) {
  git(['add', '-A']);
  git(['commit', '-q', '-m', msg(subject, trailers, bodyExtra)]);
}

// Run the REAL gate over `range` (default origin/main..HEAD) with cwd = work
// repo. Returns { code, stdout, stderr }. code 0 = allowed, non-zero = blocked.
// When the gate script is absent the child throws ENOENT — surfaced as a clear
// RED with code=127-ish so the failure names the missing gate.
function runGate(range) {
  range = range || 'origin/main..HEAD';
  // An absent gate is NOT a legitimate "block" — throw so every case (including
  // the block-only ones) fails RED for the right reason instead of being
  // satisfied by the absent gate's incidental non-zero exit.
  if (!GATE_EXISTS) {
    throw new Error('gate script absent at ' + GATE + ' (expected RED until it ships)');
  }
  try {
    var stdout = execFileSync(process.execPath, [GATE, '--range', range],
      { cwd: WORK, env: ENV, stdio: 'pipe' }).toString();
    return { code: 0, stdout: stdout, stderr: '' };
  } catch (e) {
    if (e && e.code === 'ENOENT') {
      throw new Error('gate script absent at ' + GATE + ' (expected RED until it ships)');
    }
    var r = {
      code: (e && typeof e.status === 'number') ? e.status : 1,
      stdout: (e && e.stdout ? e.stdout.toString() : ''),
      stderr: (e && e.stderr ? e.stderr.toString() : ''),
    };
    // A gate that crashed with a Node stack trace produced no real verdict — a
    // crash must never read as a legitimate block.
    if (/\n\s+at\s|MODULE_NOT_FOUND|ReferenceError|TypeError:/.test(r.stderr)) {
      throw new Error('gate crashed rather than returning a verdict:\n' + r.stderr);
    }
    return r;
  }
}
// The gate prints its verdict to stderr, but tolerate stdout too.
function out(r) { return (r.stderr || '') + '\n' + (r.stdout || ''); }

// ── Minimal fixture corpus ───────────────────────────────────────────────────
// Covered paths (named in a topic's covers[]):
//   assets/app.js, index.html          → topic "topic-app"    ("The app basics")
//   assets/settings.js, settings.html  → topic "topic-settings"("Settings")
// Uncovered but WATCHED (assets/*.js, code extension): assets/a.js, assets/b.js,
//   assets/c.js, assets/extra.js, assets/version.js.
// Satisfiers: assets/help-content-en.js, assets/changelog-content-en.js.
function seedFixtures() {
  writeFile('assets/i18n-en.js',
    '(function(){window.I18N=window.I18N||{};window.I18N.en=window.I18N.en||{};})();\n');

  writeFile('assets/help-content-en.js',
    '(function(){"use strict";\n' +
    '  var SECTIONS=[\n' +
    '    {id:"getting-started",title:"Getting started",group:"session-loop",featured:true,topics:[\n' +
    '      {id:"topic-app",title:"The app basics",priority:1,' +
          'covers:["assets/app.js","index.html"],body:[{type:"p",text:"a"}]}\n' +
    '    ]},\n' +
    '    {id:"technical",title:"Technical",group:"technical",featured:false,topics:[\n' +
    '      {id:"topic-settings",title:"Settings",priority:2,' +
          'covers:["assets/settings.js","settings.html"],body:[{type:"p",text:"b"}]}\n' +
    '    ]}\n' +
    '  ];\n' +
    '  window.HELP_CONTENT_EN=SECTIONS;\n' +
    '})();\n');

  writeFile('assets/changelog-content-en.js',
    '(function(){"use strict";\n' +
    '  window.CHANGELOG_CONTENT_EN=[\n' +
    '    {version:"1.3.0",anchor:"v1-3",date:"July 2026",lede:"Latest.",' +
        'highlights:["One","Two"],categories:{"new":["Something"]}},\n' +
    '    {version:"1.0.0",anchor:"v1-0",date:"2025",lede:"Origin marker.",origin:true}\n' +
    '  ];\n' +
    '})();\n');

  // A parseable APP_VERSION literal AND a loadable global, so the gate may read
  // it however it likes (git-diff of the literal or vm-load of the global).
  writeFile('assets/version.js',
    'var AppVersion=(function(){"use strict";\n' +
    '  var APP_VERSION="1.3.0";\n' +
    '  return {APP_VERSION:APP_VERSION};\n' +
    '})();\n' +
    'if(typeof window!=="undefined"){window.AppVersion=AppVersion;}\n' +
    'if(typeof self!=="undefined"){self.AppVersion=AppVersion;}\n');

  // Covered pages + scripts.
  writeFile('index.html', '<!doctype html><title>home</title>\n');
  writeFile('settings.html', '<!doctype html><title>settings</title>\n');
  writeFile('assets/app.js', 'window.App={v:1};\n');
  writeFile('assets/settings.js', 'window.Settings={v:1};\n');
  // Uncovered watched scripts.
  writeFile('assets/a.js', 'window.A={v:1};\n');
  writeFile('assets/b.js', 'window.B={v:1};\n');
  writeFile('assets/c.js', 'window.C={v:1};\n');
  writeFile('assets/extra.js', 'window.Extra={v:1};\n');
}

// Small edit helpers (append a line so the file's content changes).
function bump(rel) {
  var abs = path.join(WORK, rel);
  fs.appendFileSync(abs, '// touch ' + Date.now() + Math.random() + '\n');
}
function addChangelogBullet() {
  // Editing the changelog satisfier is what "a changelog entry" means here.
  bump('assets/changelog-content-en.js');
}
function touchHelp() {
  // Editing the help satisfier is the "touch the claiming topic" satisfaction path.
  bump('assets/help-content-en.js');
}

// ── Suite ────────────────────────────────────────────────────────────────────
try {
  // 1. bare origin + work clone, forced onto `main`.
  execFileSync('git', ['init', '-q', '--bare', '-b', 'main', ORIGIN], { env: ENV, stdio: 'pipe' });
  execFileSync('git', ['clone', '-q', ORIGIN, WORK], { env: ENV, stdio: 'pipe' });
  // Ensure the work repo is on `main` even on a git old enough to ignore -b on clone.
  try { git(['checkout', '-q', '-B', 'main']); } catch (e) { /* already main */ }
  git(['config', 'user.email', 't@t']);
  git(['config', 'user.name', 't']);

  // 2. seed the fixtures, commit the baseline, push so origin/main resolves.
  seedFixtures();
  commit('baseline: fixture corpus');
  BASELINE = git(['rev-parse', 'HEAD']).trim();
  git(['push', '-q', 'origin', 'main']);

  if (!GATE_EXISTS) {
    console.log('\n[docs-gate.test] scripts/docs-gate.js is ABSENT — every case below is');
    console.log('[docs-gate.test] EXPECTED to fail RED until the gate lands (43-06).\n');
  }

  console.log('docs-gate behavior spec\n');

  // ── CHANGELOG block/pass ───────────────────────────────────────────────────
  // Edit a covered file AND touch its claiming help topic (help satisfied); leave
  // the changelog untouched with no trailer → block naming the file + changelog.
  test('CHANGELOG: watched change, help satisfied, no changelog → BLOCK (names file + changelog)', function () {
    resetToBaseline();
    bump('assets/app.js');
    touchHelp();
    commit('edit app, touch help, no changelog');
    var r = runGate();
    assert(r.code !== 0, 'expected non-zero (blocked), got 0');
    assert(/changelog/i.test(out(r)), 'stderr must mention "changelog"');
    assert(/app\.js/.test(out(r)), 'stderr must name the changed file assets/app.js');
  });

  test('CHANGELOG: add a changelog entry → PASS', function () {
    resetToBaseline();
    bump('assets/app.js');
    touchHelp();
    addChangelogBullet();
    commit('edit app, touch help, add changelog');
    var r = runGate();
    assert(r.code === 0, 'expected 0 (allowed), got ' + r.code + '\n' + out(r));
  });

  // ── HELP block/pass ────────────────────────────────────────────────────────
  // Edit a covered file WITHOUT touching help; changelog satisfied → block naming
  // the claiming topic's id + title; a Help-Unaffected trailer flips it to PASS.
  test('HELP: covered change, changelog satisfied, no help touch → BLOCK (names topic id + title)', function () {
    resetToBaseline();
    bump('assets/app.js');
    addChangelogBullet();
    commit('edit app, add changelog, no help');
    var r = runGate();
    assert(r.code !== 0, 'expected non-zero (blocked), got 0');
    assert(/topic-app/.test(out(r)), 'must name the claiming topic id "topic-app"');
    assert(/The app basics/.test(out(r)), 'must name the claiming topic title');
  });

  test('HELP: Help-Unaffected trailer for the covered file → PASS', function () {
    resetToBaseline();
    bump('assets/app.js');
    addChangelogBullet();
    commit('edit app, add changelog', [['Help-Unaffected', 'assets/app.js — cosmetic only']]);
    var r = runGate();
    assert(r.code === 0, 'expected 0 (allowed), got ' + r.code + '\n' + out(r));
  });

  // ── UNCOVERED block ────────────────────────────────────────────────────────
  test('UNCOVERED: watched file no topic covers, changelog satisfied → BLOCK (covers[]/Help-Unaffected guidance)', function () {
    resetToBaseline();
    bump('assets/extra.js');
    addChangelogBullet();
    commit('edit uncovered extra.js, add changelog');
    var r = runGate();
    assert(r.code !== 0, 'expected non-zero (blocked), got 0');
    assert(/extra\.js/.test(out(r)), 'must name the uncovered file');
    assert(/covers\[\]|Help-Unaffected/i.test(out(r)),
      'must guide the author to add it to covers[] or declare Help-Unaffected');
  });

  // ── Three trailers each flip a block to a pass ─────────────────────────────
  test('TRAILER Changelog-Unaffected: watched change, help satisfied, no changelog → PASS', function () {
    resetToBaseline();
    bump('assets/app.js');
    touchHelp();
    commit('edit app, touch help', [['Changelog-Unaffected', 'no user-visible change']]);
    var r = runGate();
    assert(r.code === 0, 'expected 0 (allowed), got ' + r.code + '\n' + out(r));
  });

  test('TRAILER Help-Unaffected: covered change, changelog satisfied, no help touch → PASS', function () {
    resetToBaseline();
    bump('assets/settings.js');
    addChangelogBullet();
    commit('edit settings, add changelog', [['Help-Unaffected', 'assets/settings.js — internal refactor']]);
    var r = runGate();
    assert(r.code === 0, 'expected 0 (allowed), got ' + r.code + '\n' + out(r));
  });

  test('TRAILER Docs-Emergency-Skip on the tip → PASS + loud banner (names commit + reason + files)', function () {
    resetToBaseline();
    bump('assets/app.js');           // would otherwise demand help + changelog
    bump('assets/extra.js');
    commit('emergency hotfix', [['Docs-Emergency-Skip', 'prod down — hotfix now']]);
    var r = runGate();
    assert(r.code === 0, 'expected 0 (allowed), got ' + r.code + '\n' + out(r));
    var text = out(r);
    assert(/emergency|skip/i.test(text), 'must print a loud emergency-skip banner');
    assert(/prod down/.test(text), 'banner must name the reason');
    assert(/app\.js/.test(text) && /extra\.js/.test(text), 'banner must name the skipped files');
  });

  // ── One multi-file trailer, comma-separated, one shared reason ─────────────
  test('MULTI-FILE Help-Unaffected: one trailer names three uncovered files → all three PASS', function () {
    resetToBaseline();
    bump('assets/a.js'); bump('assets/b.js'); bump('assets/c.js');
    addChangelogBullet();
    commit('edit three uncovered, add changelog',
      [['Help-Unaffected', 'assets/a.js, assets/b.js, assets/c.js — shared internal helper, no UI']]);
    var r = runGate();
    assert(r.code === 0, 'expected 0 (allowed), got ' + r.code + '\n' + out(r));
  });

  test('MULTI-FILE Help-Unaffected: empty reason → BLOCK', function () {
    resetToBaseline();
    bump('assets/a.js'); bump('assets/b.js'); bump('assets/c.js');
    addChangelogBullet();
    commit('edit three uncovered, empty reason',
      [['Help-Unaffected', 'assets/a.js, assets/b.js, assets/c.js']]); // no " — reason"
    var r = runGate();
    assert(r.code !== 0, 'expected non-zero (blocked) for an empty reason, got 0');
    assert(/reason|empty/i.test(out(r)), 'must explain that a trailer reason is required');
  });

  test('MULTI-FILE Help-Unaffected: names an unchanged path → PASS with a stale-declaration warning', function () {
    resetToBaseline();
    bump('assets/a.js');
    addChangelogBullet();
    // b.js and c.js did NOT change in this range.
    commit('edit a.js only, declare a/b/c',
      [['Help-Unaffected', 'assets/a.js, assets/b.js, assets/c.js — batch declaration']]);
    var r = runGate();
    assert(r.code === 0, 'expected 0 (allowed), got ' + r.code + '\n' + out(r));
    assert(/stale|did not change|unchanged/i.test(out(r)),
      'must warn that a declared path did not change in the range');
  });

  // ── Emergency skip is TIP-ONLY (the anti-leak case) ────────────────────────
  test('EMERGENCY tip-only PASS: skip trailer on the range tip → PASS + banner', function () {
    resetToBaseline();
    // First an ordinary blocking commit, then the tip carries the skip.
    bump('assets/app.js');
    commit('work that would block');
    bump('assets/extra.js');
    commit('tip carries the skip', [['Docs-Emergency-Skip', 'tip emergency']]);
    var r = runGate();
    assert(r.code === 0, 'expected 0 (allowed) when the skip is on the tip, got ' + r.code + '\n' + out(r));
  });

  test('EMERGENCY inherited-skip BLOCK: skip on an earlier merged commit, ordinary tip → BLOCK (reports ignored inherited skip)', function () {
    resetToBaseline();
    // Side branch carrying the emergency skip.
    var base = BASELINE;
    git(['checkout', '-q', '-B', 'sidefix', base]);
    bump('assets/app.js');
    commit('side hotfix with skip', [['Docs-Emergency-Skip', 'inherited emergency']]);
    var skipSha = git(['rev-parse', '--short', 'HEAD']).trim();
    // Back to a detached main line at baseline, merge the side branch --no-ff,
    // then add an ordinary unchangelogged commit ON TOP (the real tip).
    git(['checkout', '-q', '-B', 'mainline', base]);
    git(['merge', '--no-ff', '-q', '-m', 'merge sidefix', 'sidefix']);
    bump('assets/extra.js');
    commit('ordinary work on top — no changelog, no trailer');
    var r = runGate(base + '..HEAD');
    assert(r.code !== 0, 'expected non-zero (blocked): an inherited skip must NOT waive the tip');
    assert(/inherit|ignored|non-tip|earlier/i.test(out(r)),
      'must report that it ignored an inherited emergency skip');
    assert(out(r).indexOf(skipSha) >= 0 || /sidefix|side hotfix/i.test(out(r)),
      'must name the commit the inherited skip came from');
    // Restore HEAD to baseline for any following scenarios.
    resetToBaseline();
  });

  // ── Release moment (APP_VERSION bump) ──────────────────────────────────────
  test('RELEASE: APP_VERSION bump WITH a matching non-empty-highlights entry → PASS', function () {
    resetToBaseline();
    // Bump the version literal to a new release AND add a matching changelog entry.
    var vp = path.join(WORK, 'assets', 'version.js');
    fs.writeFileSync(vp, fs.readFileSync(vp, 'utf8').replace('1.3.0', '1.4.0'));
    var cp = path.join(WORK, 'assets', 'changelog-content-en.js');
    fs.writeFileSync(cp, fs.readFileSync(cp, 'utf8').replace(
      'window.CHANGELOG_CONTENT_EN=[',
      'window.CHANGELOG_CONTENT_EN=[\n' +
      '    {version:"1.4.0",anchor:"v1-4",date:"Aug 2026",lede:"New.",highlights:["Fresh"],categories:{"new":["X"]}},'));
    // version.js is an uncovered watched file — declare it so only the release
    // rule is under test.
    commit('release 1.4.0', [['Help-Unaffected', 'assets/version.js — version bump only']]);
    var r = runGate();
    assert(r.code === 0, 'expected 0 (allowed), got ' + r.code + '\n' + out(r));
  });

  test('RELEASE: APP_VERSION bump with NO matching entry → BLOCK', function () {
    resetToBaseline();
    var vp = path.join(WORK, 'assets', 'version.js');
    fs.writeFileSync(vp, fs.readFileSync(vp, 'utf8').replace('1.3.0', '1.4.0'));
    commit('release 1.4.0 without changelog entry',
      [['Help-Unaffected', 'assets/version.js — version bump only']]);
    var r = runGate();
    assert(r.code !== 0, 'expected non-zero (blocked): a release bump needs a matching changelog entry');
    assert(/1\.4\.0|version|highlight/i.test(out(r)), 'must explain the missing release entry');
  });

  test('RELEASE: the origin:true entry (no highlights) never trips the gate', function () {
    resetToBaseline();
    // An ordinary, fully-satisfied push with NO version bump: the pre-existing
    // origin:true v1.0 entry (which has no highlights) must not cause a block.
    bump('assets/app.js');
    touchHelp();
    addChangelogBullet();
    commit('ordinary push, origin entry present');
    var r = runGate();
    assert(r.code === 0, 'expected 0 (allowed): origin:true entry must be tolerated, got ' + r.code + '\n' + out(r));
  });

  // ── Trailer decoy: a trailer-looking line inside a fenced code block ────────
  test('DECOY: a Help-Unaffected line inside a fenced code block does NOT satisfy the gate', function () {
    resetToBaseline();
    bump('assets/app.js');          // covered → demands help
    addChangelogBullet();
    var fence = '```\nHelp-Unaffected: assets/app.js — pasted example, not a real trailer\n```';
    commit('edit app, add changelog, decoy in body', null, fence);
    var r = runGate();
    assert(r.code !== 0, 'expected non-zero (blocked): a fenced decoy must NOT be read as a trailer');
    // The block must be the genuine help demand for the covered file, proving the
    // decoy was ignored — not merely any non-zero exit.
    assert(/topic-app|help|app\.js/i.test(out(r)),
      'block must be the real help demand (decoy ignored), not an incidental failure');
  });

  // ── WR-01: satisfier detection must be anchored to assets/ ─────────────────
  // Edit a COVERED trigger (assets/app.js → demands help) and create+edit a
  // non-assets/ DECOY path named like a satisfier (tests/fixtures/help-content-en.js).
  // The decoy must NOT satisfy the help demand: the real assets/help-content-en.js
  // is untouched. Against a gate whose helpEdited regex is unanchored the decoy sets
  // helpEdited=true and this wrongly PASSes → RED until the gate consumes the
  // assets/-anchored role-table predicate.
  test('ANCHOR WR-01: a non-assets/ help-content decoy does NOT satisfy the help demand → BLOCK (names the real app.js demand)', function () {
    resetToBaseline();
    bump('assets/app.js');                                   // covered → demands help
    writeFile('tests/fixtures/help-content-en.js', 'module.exports={decoy:true};\n');
    bump('tests/fixtures/help-content-en.js');               // edit the decoy
    addChangelogBullet();                                    // changelog satisfied
    commit('edit app, add changelog, edit a non-assets/ help-content decoy');
    var r = runGate();
    assert(r.code !== 0, 'expected non-zero (blocked): a non-assets/ decoy must not satisfy help, got 0\n' + out(r));
    assert(/topic-app/.test(out(r)), 'must name the genuine claiming topic id "topic-app"');
    assert(/The app basics/.test(out(r)), 'must name the genuine claiming topic title');
    assert(/app\.js/.test(out(r)), 'must name the real covered file assets/app.js');
  });

  // ── WR-03: a trailer key is honored only at EXACT case ─────────────────────
  // A lowercase `docs-emergency-skip:` is NOT the exact key, so the emergency skip
  // must not be honored and the push must BLOCK. Against a gate that reads trailers
  // with git's case-insensitive matcher this lowercase key bypasses the gate and
  // wrongly PASSes → RED until the reader post-filters by exact key case.
  test('CASE WR-03: a lowercase docs-emergency-skip on the tip is NOT honored → BLOCK', function () {
    resetToBaseline();
    bump('assets/app.js');                                   // would demand help + changelog
    bump('assets/extra.js');
    commit('hotfix with a LOWERCASE emergency-skip key',
      [['docs-emergency-skip', 'prod down — lowercase key must not bypass']]);
    var r = runGate();
    assert(r.code !== 0, 'expected non-zero (blocked): a lowercase skip key must not bypass the gate, got 0\n' + out(r));
  });

  // ── WR-04: a folded (multi-line) multi-file trailer is read as ONE value ───
  // git folds a long trailer whose continuation line begins with whitespace. A
  // correctly-authored folded Help-Unaffected naming two files with one shared
  // reason must waive BOTH. Against a gate that omits `unfold` the value is split on
  // the newline into a fileless first line (misdiagnosed as "missing a reason") and
  // this wrongly BLOCKs → RED until the reader unfolds.
  test('FOLD WR-04: a folded multi-file Help-Unaffected waives every file it names → PASS', function () {
    resetToBaseline();
    bump('assets/a.js'); bump('assets/b.js');               // two uncovered watched files
    addChangelogBullet();                                    // changelog satisfied
    var foldedMsg = 'edit two uncovered files, folded Help-Unaffected trailer\n\n' +
      'Help-Unaffected: assets/a.js,\n' +
      '  assets/b.js — shared internal helper, no UI surface\n';
    git(['add', '-A']);
    git(['commit', '-q', '-m', foldedMsg]);
    var r = runGate();
    assert(r.code === 0, 'expected 0 (allowed): a folded trailer must waive both files, got ' + r.code + '\n' + out(r));
    assert(!/malformed/i.test(out(r)), 'a correctly-authored folded trailer must not be reported malformed');
  });

  // ── Satisfaction is EN-only (EN is the corpus of record) ───────────────────
  // A HE-only help edit must NOT satisfy the help demand for a covered trigger:
  // the release check and the covers[] index read EN and nothing else, so a
  // locale-only edit cannot stand in for the EN corpus. Against a gate whose
  // satisfier predicate accepts any locale this wrongly PASSes.
  test('SATISFIER EN-only: a HE-only help edit does NOT satisfy the help demand → BLOCK (names the app.js topic)', function () {
    resetToBaseline();
    bump('assets/app.js');                                   // covered → demands help
    writeFile('assets/help-content-he.js', '// he locale stub\n');
    bump('assets/help-content-he.js');                       // edit HE help ONLY
    addChangelogBullet();                                    // changelog satisfied
    commit('edit app, add changelog, edit HE help only');
    var r = runGate();
    assert(r.code !== 0, 'expected non-zero (blocked): a HE-only help edit must not satisfy the EN help demand\n' + out(r));
    assert(/topic-app/.test(out(r)), 'must name the genuine claiming topic id "topic-app"');
    assert(/app\.js/.test(out(r)), 'must name the real covered file assets/app.js');
  });

  // The EN help edit DOES still satisfy (the positive control for the above).
  test('SATISFIER EN-only: an EN help edit still satisfies the help demand → PASS', function () {
    resetToBaseline();
    bump('assets/app.js');                                   // covered → demands help
    touchHelp();                                             // edit EN help
    addChangelogBullet();                                    // changelog satisfied
    commit('edit app, add changelog, edit EN help');
    var r = runGate();
    assert(r.code === 0, 'expected 0 (allowed): an EN help edit must satisfy, got ' + r.code + '\n' + out(r));
  });

  // Changelog satisfaction is EN-only too: a CS-only changelog edit must not
  // satisfy the changelog demand raised by a watched trigger.
  test('SATISFIER EN-only: a CS-only changelog edit does NOT satisfy the changelog demand → BLOCK', function () {
    resetToBaseline();
    bump('assets/app.js');                                   // trigger → demands changelog + help
    touchHelp();                                             // help satisfied
    writeFile('assets/changelog-content-cs.js', '// cs locale stub\n');
    bump('assets/changelog-content-cs.js');                  // edit CS changelog ONLY
    commit('edit app, touch EN help, edit CS changelog only');
    var r = runGate();
    assert(r.code !== 0, 'expected non-zero (blocked): a CS-only changelog edit must not satisfy the EN changelog demand\n' + out(r));
    assert(/changelog/i.test(out(r)), 'block must name the unmet changelog demand');
  });

} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log('');
console.log('docs-gate behavior spec — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
