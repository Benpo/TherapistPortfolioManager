/**
 * ci-resolve-docs-range.test.js — falsifiable RED/GREEN behavior spec for the
 * shared CI docs-gate range resolver (scripts/ci-resolve-docs-range.sh).
 *
 * WHY this spec exists (D-21, feedback-behavior-verification): the resolver
 * decides the commit range the authoritative docs gate evaluates in CI. The
 * Blocker CR-01 is that the OLD inline deploy.yml shell conflated ALL non-zero
 * `git ls-remote --exit-code` results into the first-run bootstrap branch — so a
 * transient network/auth fault (rc=128) on an EXISTING deploy branch silently
 * collapsed the range to the tip commit only, un-gating the rest of a multi-commit
 * push. A gate that fails OPEN under a realistic infra fault is not "the
 * unbypassable layer". Only a test that drives each ls-remote exit code can prove
 * the three-way branch is real; this file is that executable spec.
 *
 * It fails RED today (scripts/ci-resolve-docs-range.sh is absent → `sh` exits
 * non-zero with a "No such file" style error) for the right reason, and is
 * structured so that once the real resolver lands every case flips to PASS with
 * no edits here.
 *
 * Mechanics (all node built-ins, offline, self-cleaning):
 *   - Build a temp dir under os.tmpdir() and drop a STUB `git` executable in it
 *     (a tiny POSIX-sh script, chmod 0755). Prepend that dir to PATH so the
 *     resolver's `git` calls hit the stub, not the real git.
 *   - The stub answers exactly the four subcommands the resolver invokes:
 *       ls-remote  → exit ${STUB_LSREMOTE_RC}         (drives the three-way branch)
 *       fetch      → exit 0
 *       log        → echo ${STUB_DEPLOY_SUBJECT}       (the "Deploy from <sha>" line)
 *       rev-parse  → echo ${STUB_ANCHOR_SHA} if ${STUB_ANCHOR_OK}=1 else exit 1
 *     Any other subcommand exits 0 with empty output.
 *   - Invoke the REAL resolver with `sh <resolver>` under an isolated env, capture
 *     exit code + stdout + stderr via execFileSync's thrown error.
 *
 * The resolver contract this spec pins:
 *   sh scripts/ci-resolve-docs-range.sh   (env: GITHUB_SHA, real `git` on PATH)
 *     - stdout: EXACTLY the one resolved range line, nothing else.
 *     - stderr: every banner / notice / diagnostic.
 *     - exit 0 only on a resolvable anchored range or a genuine first-run bootstrap;
 *       exit non-zero (fail closed) on any ls-remote rc not in {0,2} and on an
 *       unresolvable anchor.
 *
 * Run: node tests/ci-resolve-docs-range.test.js
 * Exits 0 on full pass, non-zero on any failure (RED until the resolver ships).
 */

'use strict';

var os = require('os');
var fs = require('fs');
var path = require('path');
var execFileSync = require('child_process').execFileSync;

var REPO_ROOT = path.resolve(__dirname, '..');
var RESOLVER = path.join(REPO_ROOT, 'scripts', 'ci-resolve-docs-range.sh');

// Fixed test fixtures. GITHUB_SHA is a 40-hex tip; ANCHOR_SHA is the resolved
// deploy anchor the stub `git rev-parse --verify` echoes.
var GITHUB_SHA = '1234567890abcdef1234567890abcdef12345678';
var ANCHOR_SHA = 'fedcba0987654321fedcba0987654321fedcba09';

var passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log('  PASS  ' + name); passed++; }
  catch (e) { console.log('  FAIL  ' + name); console.log('        ' + (e && e.message || e)); failed++; }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }

// ── Temp dir + stub git ──────────────────────────────────────────────────────
var tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-range-'));
var STUB_DIR = path.join(tmp, 'bin');
fs.mkdirSync(STUB_DIR, { recursive: true });

// A stub `git` that answers only the subcommands the resolver uses. Its behavior
// is driven entirely by STUB_* env vars the test sets per case, so each case
// exercises one ls-remote exit code / anchor outcome in isolation.
var STUB_GIT = path.join(STUB_DIR, 'git');
fs.writeFileSync(STUB_GIT,
  '#!/bin/sh\n' +
  'case "$1" in\n' +
  '  ls-remote) exit "${STUB_LSREMOTE_RC:-0}" ;;\n' +
  '  fetch) exit 0 ;;\n' +
  '  log) printf \'%s\\n\' "${STUB_DEPLOY_SUBJECT:-}" ; exit 0 ;;\n' +
  '  rev-parse)\n' +
  '    if [ "${STUB_ANCHOR_OK:-0}" = "1" ]; then\n' +
  '      printf \'%s\\n\' "${STUB_ANCHOR_SHA:-}" ; exit 0\n' +
  '    fi\n' +
  '    exit 1 ;;\n' +
  '  *) exit 0 ;;\n' +
  'esac\n');
fs.chmodSync(STUB_GIT, 0o755);

// Run the REAL resolver with the stub git on PATH and the given STUB_* overrides.
// Returns { code, stdout, stderr }. An absent resolver surfaces as a clear RED.
function runResolver(stub) {
  var env = Object.assign({}, process.env, {
    GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_CONFIG_SYSTEM: '/dev/null',
    PATH: STUB_DIR + ':' + process.env.PATH,
    GITHUB_SHA: GITHUB_SHA,
    STUB_ANCHOR_SHA: ANCHOR_SHA,
  }, stub || {});
  try {
    var stdout = execFileSync('sh', [RESOLVER], { env: env, stdio: 'pipe' }).toString();
    return { code: 0, stdout: stdout, stderr: '' };
  } catch (e) {
    return {
      code: (e && typeof e.status === 'number') ? e.status : 1,
      stdout: (e && e.stdout ? e.stdout.toString() : ''),
      stderr: (e && e.stderr ? e.stderr.toString() : ''),
    };
  }
}

// ── Suite ────────────────────────────────────────────────────────────────────
try {
  console.log('ci-resolve-docs-range behavior spec\n');

  if (!fs.existsSync(RESOLVER)) {
    console.log('[ci-resolve-docs-range.test] resolver ABSENT at ' + RESOLVER);
    console.log('[ci-resolve-docs-range.test] every case below is EXPECTED RED until Task 2 ships it.\n');
  }

  // rc=0, resolvable anchor → anchored range on stdout, exit 0.
  test('rc=0 existing branch, resolvable anchor → stdout is exactly "<anchor>..<GITHUB_SHA>", exit 0', function () {
    var r = runResolver({
      STUB_LSREMOTE_RC: '0',
      STUB_DEPLOY_SUBJECT: 'Deploy from ' + ANCHOR_SHA,
      STUB_ANCHOR_OK: '1',
    });
    assert(r.code === 0, 'expected exit 0, got ' + r.code + '\n' + r.stderr);
    assert(r.stdout.trim() === ANCHOR_SHA + '..' + GITHUB_SHA,
      'stdout must be exactly "<anchor>..<GITHUB_SHA>", got: ' + JSON.stringify(r.stdout));
  });

  // rc=2, genuinely-absent branch → tip-only bootstrap range, exit 0, NOTICE on stderr.
  test('rc=2 genuinely-absent branch → stdout is exactly "<GITHUB_SHA>^..<GITHUB_SHA>", exit 0, bootstrap NOTICE on stderr', function () {
    var r = runResolver({ STUB_LSREMOTE_RC: '2' });
    assert(r.code === 0, 'expected exit 0, got ' + r.code + '\n' + r.stderr);
    assert(r.stdout.trim() === GITHUB_SHA + '^..' + GITHUB_SHA,
      'stdout must be exactly the tip-only bootstrap range, got: ' + JSON.stringify(r.stdout));
    assert(/bootstrap|first-run|notice/i.test(r.stderr),
      'a first-run bootstrap NOTICE must be present on stderr, got: ' + JSON.stringify(r.stderr));
  });

  // rc=128 (any rc not in {0,2}) → FAIL CLOSED. This is the CR-01 falsifier: the
  // old inline code would have bootstrapped (exit 0, tip-only range) here.
  test('rc=128 network/auth fault → NON-ZERO exit, stderr names the rc AND "failing closed", NO range on stdout', function () {
    var r = runResolver({ STUB_LSREMOTE_RC: '128' });
    assert(r.code !== 0, 'expected non-zero (fail closed), got 0 — CR-01 regression (bootstrapped on a network fault)');
    assert(/128/.test(r.stderr), 'stderr must name the failing exit code 128, got: ' + JSON.stringify(r.stderr));
    assert(/failing closed/i.test(r.stderr), 'stderr must say "failing closed", got: ' + JSON.stringify(r.stderr));
    assert(!/\.\./.test(r.stdout), 'stdout must NOT contain a range, got: ' + JSON.stringify(r.stdout));
  });

  // rc=0 but the anchor cannot resolve → FAIL CLOSED with the WR-02 recovery runbook.
  test('rc=0 but anchor unresolvable → NON-ZERO exit, stderr carries a recovery runbook (WR-02)', function () {
    var r = runResolver({
      STUB_LSREMOTE_RC: '0',
      STUB_DEPLOY_SUBJECT: 'Deploy from ' + ANCHOR_SHA,
      STUB_ANCHOR_OK: '0', // rev-parse --verify fails → anchor does not resolve
    });
    assert(r.code !== 0, 'expected non-zero (fail closed) on an unresolvable anchor, got 0');
    assert(/recovery/i.test(r.stderr), 'stderr must contain a recovery runbook, got: ' + JSON.stringify(r.stderr));
    assert(/Docs-Emergency-Skip/.test(r.stderr),
      'the runbook must state the emergency-skip trailer cannot bypass this shell step, got: ' + JSON.stringify(r.stderr));
    assert(!/\.\./.test(r.stdout), 'stdout must NOT contain a range, got: ' + JSON.stringify(r.stdout));
  });

} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log('');
console.log('ci-resolve-docs-range behavior spec — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
