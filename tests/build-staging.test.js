/**
 * build-staging.test.js — falsifiable fidelity + noindex-divergence spec for the
 * shared staging transform (scripts/build-staging.sh).
 *
 * WHY this spec exists (DEBT-03, T-44-05/T-44-06, feedback-behavior-verification):
 * the prod deploy transform used to live inline in deploy.yml — a whitelist `cp`
 * plus a `__BUILD_TOKEN__` short-SHA stamp — and the "no sensitive files leaked"
 * step was a self-inspecting echo, never a real assertion. Phase 44 extracts that
 * transform into ONE parameterized script both deploy.yml (prod) and
 * deploy-preprod.yml (pre-prod) call, so the two can never drift, and adds ONE
 * deliberate pre-prod-only divergence behind `--noindex` (insert an
 * `X-Robots-Tag: noindex` line INTO the base `/*` block of the STAGED `_headers`
 * only, D-09). This file is the executable contract that pins:
 *   (1) whitelist completeness — the exact D-08 file set lands in the staged tree;
 *   (2) token stamp — the staged version.js carries the git short-hash, not the
 *       `__BUILD_TOKEN__` placeholder, and the committed copy is never touched;
 *   (3) the no-leak invariant — NO .planning / .claude / CLAUDE.md / .env in the
 *       staged tree (the deploy.yml verify echo turned into a falsifiable test);
 *   (4) noindex divergence — `--noindex` inserts the noindex line INTO the first
 *       `/*` block of the staged _headers, keeping all five base security headers
 *       in that same block and NEVER introducing a duplicate bare `/*` pattern.
 *       WHY the duplicate ban is load-bearing: live verification on the real
 *       pre-prod origin (2026-07-12) proved Cloudflare Pages resolves a DUPLICATE
 *       identical path pattern in _headers as LAST-ONE-WINS, not merge — the
 *       original appended second `/*` block replaced the base block and silently
 *       wiped CSP/X-Frame-Options/Permissions-Policy from every pre-prod
 *       response. The plain (no-flag) staged copy must stay byte-identical to the
 *       committed _headers.
 *
 * Authored RED-first, before scripts/build-staging.sh existed (`sh` then exits
 * non-zero with a "No such file" style error, so every case fails RED for the
 * right reason). GREEN once the script ships.
 *
 * Mechanics (all node built-ins, offline, self-cleaning):
 *   - Build temp target dirs under os.tmpdir(); invoke the REAL script with
 *       spawnSync('sh', ['scripts/build-staging.sh', <tmp>], { cwd: REPO_ROOT,
 *         env: { ...process.env, GITHUB_SHA: <fixed 40-hex fixture> } })
 *     (a third `--noindex` arg for the divergence case). GITHUB_SHA is pinned so
 *     the stamped short-hash is deterministic.
 *   - Assert on the staged tree with fs; rm every tmp dir in finally.
 *
 * Run: node tests/build-staging.test.js
 * Exits 0 on full pass, non-zero on any failure (RED until the script ships).
 */

'use strict';

var os = require('os');
var fs = require('fs');
var path = require('path');
var spawnSync = require('child_process').spawnSync;

var REPO_ROOT = path.resolve(__dirname, '..');
var SCRIPT_REL = path.join('scripts', 'build-staging.sh');

// Fixed 40-hex fixture SHA → deterministic 7-hex short stamp.
var GITHUB_SHA = '1234567890abcdef1234567890abcdef12345678';
var SHORT = GITHUB_SHA.slice(0, 7); // '1234567'

var passed = 0, failed = 0;
var tmpDirs = [];

function test(name, fn) {
  try { fn(); console.log('  PASS  ' + name); passed++; }
  catch (e) { console.log('  FAIL  ' + name); console.log('        ' + (e && e.message || e)); failed++; }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }

// Make a fresh tmp target dir (tracked for cleanup).
function mkTarget() {
  var d = fs.mkdtempSync(path.join(os.tmpdir(), 'build-staging-'));
  tmpDirs.push(d);
  return d;
}

// Run the real script into <target>. Extra args (e.g. '--noindex') appended after
// the target. Returns { code, stdout, stderr }.
function runBuild(target, extraArgs) {
  var args = [SCRIPT_REL, target].concat(extraArgs || []);
  var env = Object.assign({}, process.env, { GITHUB_SHA: GITHUB_SHA });
  var r = spawnSync('sh', args, { cwd: REPO_ROOT, env: env, encoding: 'utf8' });
  return {
    code: (typeof r.status === 'number') ? r.status : 1,
    stdout: r.stdout || '',
    stderr: r.stderr || '',
  };
}

// Extract the FIRST `/*` block (the base CSP block) from a _headers body: the line
// that is exactly `/*` and every following non-blank line, stopping at the first
// blank line. This isolates the base block so the noindex insert (and the five
// security headers) can be asserted to live INSIDE it, not elsewhere in the file.
function firstStarBlock(content) {
  var lines = content.split('\n');
  var out = [];
  var started = false;
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    if (!started) {
      if (line.trim() === '/*') { started = true; out.push(line); }
    } else {
      if (line.trim() === '') break;
      out.push(line);
    }
  }
  return out.join('\n');
}

try {
  console.log('build-staging fidelity + noindex-divergence spec\n');

  if (!fs.existsSync(path.join(REPO_ROOT, SCRIPT_REL))) {
    console.log('[build-staging.test] script ABSENT at ' + SCRIPT_REL);
    console.log('[build-staging.test] RED expected until scripts/build-staging.sh ships.\n');
  }

  // ── (1) Whitelist completeness (D-08) ──────────────────────────────────────
  test('whitelist complete: _headers, _redirects, LICENSE, >=1 *.html, assets/ dir, manifest.json, sw.js all staged', function () {
    var t = mkTarget();
    var r = runBuild(t);
    assert(r.code === 0, 'script must exit 0, got ' + r.code + '\n' + r.stderr);

    ['_headers', '_redirects', 'LICENSE', 'manifest.json', 'sw.js'].forEach(function (f) {
      assert(fs.existsSync(path.join(t, f)), 'expected staged file missing: ' + f);
    });

    var assetsDir = path.join(t, 'assets');
    assert(fs.existsSync(assetsDir) && fs.statSync(assetsDir).isDirectory(),
      'staged assets/ directory missing');
    assert(fs.existsSync(path.join(assetsDir, 'version.js')),
      'staged assets/version.js missing (assets/ not copied recursively)');

    var htmls = fs.readdirSync(t).filter(function (f) { return f.endsWith('.html'); });
    assert(htmls.length >= 1, 'expected at least one staged *.html, found none');
  });

  // ── (2) Token stamp (D-02/D-04) ────────────────────────────────────────────
  test('token stamped: staged version.js has \'' + SHORT + '\' and NOT __BUILD_TOKEN__', function () {
    var t = mkTarget();
    var r = runBuild(t);
    assert(r.code === 0, 'script must exit 0, got ' + r.code + '\n' + r.stderr);

    var staged = fs.readFileSync(path.join(t, 'assets', 'version.js'), 'utf8');
    assert(staged.indexOf("'" + SHORT + "'") !== -1,
      "staged version.js must contain the short-hash as '" + SHORT + "'");
    assert(staged.indexOf('__BUILD_TOKEN__') === -1,
      'staged version.js must NOT still contain the __BUILD_TOKEN__ placeholder');
  });

  // ── (2b) Committed files untouched ─────────────────────────────────────────
  test('committed _headers and assets/version.js are never mutated by a run', function () {
    var headersBefore = fs.readFileSync(path.join(REPO_ROOT, '_headers'), 'utf8');
    var versionBefore = fs.readFileSync(path.join(REPO_ROOT, 'assets', 'version.js'), 'utf8');

    var t = mkTarget();
    var r = runBuild(t, ['--noindex']); // the divergence path is the one most likely to leak
    assert(r.code === 0, 'script must exit 0, got ' + r.code + '\n' + r.stderr);

    var headersAfter = fs.readFileSync(path.join(REPO_ROOT, '_headers'), 'utf8');
    var versionAfter = fs.readFileSync(path.join(REPO_ROOT, 'assets', 'version.js'), 'utf8');
    assert(headersAfter === headersBefore, 'committed _headers was mutated by the script');
    assert(versionAfter === versionBefore, 'committed assets/version.js was mutated by the script');
    assert(versionAfter.indexOf('__BUILD_TOKEN__') !== -1,
      'committed version.js must retain its __BUILD_TOKEN__ placeholder');
  });

  // ── (3) No-leak invariant (T-44-05) ────────────────────────────────────────
  test('no-leak: staged tree has NO .planning, .claude, CLAUDE.md, .env', function () {
    var t = mkTarget();
    var r = runBuild(t);
    assert(r.code === 0, 'script must exit 0, got ' + r.code + '\n' + r.stderr);

    ['.planning', '.claude', 'CLAUDE.md', '.env'].forEach(function (leak) {
      assert(!fs.existsSync(path.join(t, leak)),
        'sensitive path leaked into staged tree: ' + leak);
    });
  });

  // ── (4) noindex divergence (D-09 — insert INTO the base /* block) ──────────
  // CF Pages resolves DUPLICATE identical path patterns last-one-wins (live
  // pre-prod finding, 2026-07-12): an appended second `/*` block replaced the base
  // block and wiped the security headers. So the contract is: insert the noindex
  // line INTO the first `/*` block, keep all five security headers in that block,
  // and NEVER emit a duplicate bare `/*` pattern line.
  test('noindex divergence: --noindex inserts noindex INTO the base /* block (5 security headers intact, no duplicate /* pattern); plain copy byte-identical to committed', function () {
    var tPlain = mkTarget();
    var tNoindex = mkTarget();
    var rPlain = runBuild(tPlain);
    var rNoindex = runBuild(tNoindex, ['--noindex']);
    assert(rPlain.code === 0, 'plain run must exit 0, got ' + rPlain.code + '\n' + rPlain.stderr);
    assert(rNoindex.code === 0, '--noindex run must exit 0, got ' + rNoindex.code + '\n' + rNoindex.stderr);

    var committedHeaders = fs.readFileSync(path.join(REPO_ROOT, '_headers'), 'utf8');
    var plainHeaders = fs.readFileSync(path.join(tPlain, '_headers'), 'utf8');
    var noindexHeaders = fs.readFileSync(path.join(tNoindex, '_headers'), 'utf8');

    // (a) the --noindex staged copy carries ALL FIVE base security headers AND the
    //     noindex line, all INSIDE the first /* block (not merely somewhere in the file).
    var noindexBlock = firstStarBlock(noindexHeaders);
    assert(noindexBlock.length > 0, 'could not locate the base /* block in the --noindex staged _headers');
    ['Content-Security-Policy', 'X-Frame-Options', 'X-Content-Type-Options',
     'Referrer-Policy', 'Permissions-Policy'].forEach(function (h) {
      assert(noindexBlock.indexOf(h) !== -1,
        'security header missing from the base /* block of the --noindex staged copy: ' + h +
        '\n  block: ' + JSON.stringify(noindexBlock));
    });
    assert(/X-Robots-Tag:\s*noindex/.test(noindexBlock),
      'X-Robots-Tag: noindex must live INSIDE the first /* block, got block: ' + JSON.stringify(noindexBlock));

    // (b) NO duplicate bare `/*` path pattern — exactly ONE line that is exactly
    //     "/*" (patterns like /*.html or /*.js do NOT count: they are longer than
    //     the bare pattern and match different paths, so CF merges them fine).
    var bareStarLines = noindexHeaders.split('\n').filter(function (l) { return l === '/*'; });
    assert(bareStarLines.length === 1,
      'expected exactly ONE bare /* pattern line in the --noindex staged _headers (CF last-wins on duplicates), got ' +
      bareStarLines.length);

    // (c) the plain (no flag) staged copy is byte-identical to the committed
    //     _headers and carries no noindex.
    assert(plainHeaders === committedHeaders,
      'plain staged _headers must be byte-identical to the committed _headers');
    assert(!/X-Robots-Tag:\s*noindex/.test(plainHeaders),
      'plain staged _headers must NOT carry X-Robots-Tag: noindex');
  });

} finally {
  for (var i = 0; i < tmpDirs.length; i++) {
    fs.rmSync(tmpDirs[i], { recursive: true, force: true });
  }
}

console.log('');
console.log('build-staging fidelity + noindex-divergence spec — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
