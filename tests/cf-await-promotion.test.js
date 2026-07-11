/**
 * cf-await-promotion.test.js — falsifiable RED/GREEN behavior spec for the
 * fail-closed deploy sentinel-then-purge script (scripts/cf-await-promotion.sh).
 *
 * WHY this spec exists (DEBT-02, feedback-behavior-verification): the v1.3.0
 * incident was a mixed-cache Integrity/Availability failure — the old deploy
 * purged the Cloudflare edge on a fixed sleep, BEFORE Pages had promoted the new
 * assets, so edges re-cached OLD files and poisoned installed PWA precaches. The
 * mitigation is strict sequencing: purge ONLY after the live production origin is
 * confirmed serving the new short-SHA BUILD_TOKEN, and fail CLOSED (exit 1, no
 * purge) if promotion never confirms. That sequencing is deploy BEHAVIOR, and the
 * project's standing rule is that runtime-behavior code needs a falsifiable test.
 * Inline YAML shell cannot be unit-tested, so the logic lives in a real script and
 * this file drives every branch offline with a stubbed `curl`.
 *
 * Authored RED-first, before scripts/cf-await-promotion.sh existed (`sh` then
 * exits non-zero with a "No such file" style error). The absent-script notice
 * below remains as harness self-defense so a future deletion fails RED for the
 * right reason (mirrors the ci-resolve-docs-range.test.js precedent).
 *
 * Mechanics (all node built-ins, offline, self-cleaning):
 *   - Build a temp dir under os.tmpdir() and drop a STUB `curl` executable in it
 *     (a tiny POSIX-sh script, chmod 0755). Prepend that dir to PATH so the
 *     script's `curl` calls hit the stub, not the real curl.
 *   - The stub distinguishes a GET version-poll from a purge POST by scanning its
 *     args for `purge_cache`:
 *       version poll → increments a temp counter file; returns a body with an OLD
 *                      token for the first ${STUB_POLLS_UNTIL_NEW} polls, then the
 *                      NEW token `var BUILD_TOKEN = '<short-sha>';`.
 *       purge POST   → touches ${STUB_PURGE_MARKER} (proof a purge was attempted)
 *                      and prints `"success":true` or `"success":false` per
 *                      ${STUB_PURGE_SUCCESS}.
 *   - Invoke the REAL script with spawnSync('sh', [SCRIPT], { env }) capturing
 *     { code, stdout, stderr }. SENTINEL_INTERVAL/SENTINEL_TIMEOUT are set small so
 *     the timeout case finishes in ~seconds.
 *
 * The script contract this spec pins:
 *   sh scripts/cf-await-promotion.sh
 *     env: GITHUB_SHA, CF_ZONE_ID, CF_PURGE_TOKEN, optional POLL_URL,
 *          SENTINEL_INTERVAL, SENTINEL_TIMEOUT; real `curl` on PATH.
 *     - polls POLL_URL until the body contains BUILD_TOKEN = '<first-7-of-SHA>',
 *       then purges the CF zone cache.
 *     - poll timeout → exit 1, loud stderr, NO purge (a uniformly-stale cache is
 *       safe; a mixed one is not).
 *     - confirmed promotion + purge success → exit 0.
 *     - confirmed promotion + purge failure → exit 1, loud stderr.
 *
 * Run: node tests/cf-await-promotion.test.js
 * Exits 0 on full pass, non-zero on any failure (RED until the script ships).
 */

'use strict';

var os = require('os');
var fs = require('fs');
var path = require('path');
var spawnSync = require('child_process').spawnSync;

var REPO_ROOT = path.resolve(__dirname, '..');
var SCRIPT = path.join(REPO_ROOT, 'scripts', 'cf-await-promotion.sh');
var HEADERS = path.join(REPO_ROOT, '_headers');

// A 40-hex tip SHA; the script must poll for its FIRST 7 chars only (Pitfall 1),
// never the full SHA. 'deadbee' is that short token.
var GITHUB_SHA = 'deadbeef1234567890abcdef1234567890abcdef';
var SHORT = GITHUB_SHA.slice(0, 7); // 'deadbee'

var passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log('  PASS  ' + name); passed++; }
  catch (e) { console.log('  FAIL  ' + name); console.log('        ' + (e && e.message || e)); failed++; }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }

// ── Temp dir + stub curl ─────────────────────────────────────────────────────
var tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cf-await-'));
var STUB_DIR = path.join(tmp, 'bin');
fs.mkdirSync(STUB_DIR, { recursive: true });

// The stub curl. It answers the TWO curl shapes the script issues, driven by
// STUB_* env vars the test sets per case so each case is exercised in isolation.
var STUB_CURL = path.join(STUB_DIR, 'curl');
fs.writeFileSync(STUB_CURL,
  '#!/bin/sh\n' +
  '# Distinguish the purge POST from the version GET by scanning the args for\n' +
  '# the CF purge endpoint.\n' +
  'for a in "$@"; do\n' +
  '  case "$a" in\n' +
  '    *purge_cache*)\n' +
  '      [ -n "${STUB_PURGE_MARKER:-}" ] && : > "$STUB_PURGE_MARKER"\n' +
  '      if [ "${STUB_PURGE_SUCCESS:-true}" = "true" ]; then\n' +
  '        printf \'%s\' \'{"success":true,"errors":[],"result":{"id":"stub"}}\'\n' +
  '      else\n' +
  '        printf \'%s\' \'{"success":false,"errors":[{"code":1003,"message":"stub failure"}]}\'\n' +
  '      fi\n' +
  '      exit 0 ;;\n' +
  '  esac\n' +
  'done\n' +
  '# Otherwise it is a version-token GET poll: bump the counter, then return the\n' +
  '# OLD token until STUB_POLLS_UNTIL_NEW polls have elapsed, then the NEW token.\n' +
  'c=0\n' +
  '[ -f "${STUB_COUNTER_FILE:-/dev/null}" ] && c=$(cat "$STUB_COUNTER_FILE")\n' +
  'c=$((c + 1))\n' +
  '[ -n "${STUB_COUNTER_FILE:-}" ] && printf \'%s\' "$c" > "$STUB_COUNTER_FILE"\n' +
  'if [ "$c" -gt "${STUB_POLLS_UNTIL_NEW:-0}" ]; then\n' +
  '  printf "var BUILD_TOKEN = \'%s\';\\n" "${STUB_NEW_TOKEN:-}"\n' +
  'else\n' +
  '  printf "var BUILD_TOKEN = \'old0000\';\\n"\n' +
  'fi\n' +
  'exit 0\n');
fs.chmodSync(STUB_CURL, 0o755);

var caseSeq = 0;
// Run the REAL script with the stub curl on PATH and the given STUB_* overrides.
// Returns { code, stdout, stderr, pollCount, purged }.
function runScript(stub) {
  caseSeq += 1;
  var counterFile = path.join(tmp, 'counter-' + caseSeq);
  var purgeMarker = path.join(tmp, 'purged-' + caseSeq);
  var env = Object.assign({}, process.env, {
    PATH: STUB_DIR + ':' + process.env.PATH,
    GITHUB_SHA: GITHUB_SHA,
    CF_ZONE_ID: 'stub-zone',
    CF_PURGE_TOKEN: 'stub-token',
    POLL_URL: 'https://example.invalid/assets/version.js',
    SENTINEL_INTERVAL: '1',
    SENTINEL_TIMEOUT: '2',
    STUB_NEW_TOKEN: SHORT,
    STUB_COUNTER_FILE: counterFile,
    STUB_PURGE_MARKER: purgeMarker,
    STUB_POLLS_UNTIL_NEW: '0',
    STUB_PURGE_SUCCESS: 'true',
  }, stub || {});
  var r = spawnSync('sh', [SCRIPT], { env: env, encoding: 'utf8' });
  var pollCount = 0;
  try { pollCount = parseInt(fs.readFileSync(counterFile, 'utf8'), 10) || 0; } catch (e) {}
  return {
    code: (typeof r.status === 'number') ? r.status : 1,
    stdout: r.stdout || '',
    stderr: r.stderr || '',
    pollCount: pollCount,
    purged: fs.existsSync(purgeMarker),
  };
}

// ── Suite ────────────────────────────────────────────────────────────────────
try {
  console.log('cf-await-promotion behavior spec\n');

  if (!fs.existsSync(SCRIPT)) {
    console.log('[cf-await-promotion.test] script ABSENT at ' + SCRIPT);
    console.log('[cf-await-promotion.test] this is RED-first (Task 1) — every case below fails until scripts/cf-await-promotion.sh ships.\n');
  }

  // (1) New token on the first poll → purge succeeds → exit 0, exactly one poll.
  test('new token on first poll → purge success → exit 0, only one poll issued', function () {
    var r = runScript({ STUB_POLLS_UNTIL_NEW: '0', STUB_PURGE_SUCCESS: 'true' });
    assert(r.code === 0, 'expected exit 0, got ' + r.code + '\n' + r.stderr);
    assert(r.pollCount === 1, 'expected exactly one poll before the match, got ' + r.pollCount);
    assert(r.purged, 'a purge POST must have been issued after the confirmed match');
  });

  // (2) New token NEVER appears → exit 1 after the shortened timeout, loud stderr,
  //     and CRUCIALLY no purge (the exact v1.3.0 mixed-cache guard).
  test('token never appears → exit 1 after timeout, stderr names timeout + not-purging, NO purge issued', function () {
    var r = runScript({ STUB_POLLS_UNTIL_NEW: '9999', SENTINEL_INTERVAL: '1', SENTINEL_TIMEOUT: '2' });
    assert(r.code !== 0, 'expected non-zero (fail closed) on poll timeout, got 0');
    assert(/timed out|timeout/i.test(r.stderr), 'stderr must name the timeout, got: ' + JSON.stringify(r.stderr));
    assert(/not purging|failing closed/i.test(r.stderr),
      'stderr must say it is NOT purging / failing closed, got: ' + JSON.stringify(r.stderr));
    assert(!r.purged, 'NO purge POST may be issued when promotion never confirms — this is the mixed-cache guard');
  });

  // (3) New token first appears on the 3rd poll → exit 0.
  test('token appears on the 3rd poll → exit 0 after polling', function () {
    var r = runScript({ STUB_POLLS_UNTIL_NEW: '2', SENTINEL_INTERVAL: '1', SENTINEL_TIMEOUT: '30', STUB_PURGE_SUCCESS: 'true' });
    assert(r.code === 0, 'expected exit 0 once the token appears, got ' + r.code + '\n' + r.stderr);
    assert(r.pollCount === 3, 'expected the match on the 3rd poll, got poll count ' + r.pollCount);
    assert(r.purged, 'a purge POST must follow the confirmed match');
  });

  // (4) Token present but the purge POST returns "success":false → exit 1, loud.
  test('confirmed promotion but purge returns success:false → exit 1 with loud stderr', function () {
    var r = runScript({ STUB_POLLS_UNTIL_NEW: '0', STUB_PURGE_SUCCESS: 'false' });
    assert(r.code !== 0, 'expected non-zero when the purge fails after a confirmed promotion, got 0');
    assert(/purge failed|mixed cache|re-run/i.test(r.stderr),
      'stderr must loudly report the post-promotion purge failure, got: ' + JSON.stringify(r.stderr));
    assert(r.purged, 'the purge POST was attempted (and reported failure)');
  });

  // (5) Sentinel precondition (Pitfall 4): _headers must still declare
  //     /assets/version.js no-cache, or the poll would be masked by the edge cache.
  test('_headers still declares /assets/version.js no-cache (sentinel precondition)', function () {
    var headers = fs.readFileSync(HEADERS, 'utf8');
    assert(/\/assets\/version\.js\r?\n\s+Cache-Control:\s*no-cache/.test(headers),
      '_headers must map /assets/version.js to Cache-Control: no-cache; the content sentinel depends on it');
  });

  // (6) Short-SHA guard (Pitfall 1): the FULL SHA present but NOT the short token
  //     must still time out — proves the poll matches the 7-hex short SHA, not the full one.
  test('body carrying the FULL SHA but not the short token → still times out (matches short SHA only)', function () {
    var r = runScript({ STUB_NEW_TOKEN: GITHUB_SHA, STUB_POLLS_UNTIL_NEW: '0', SENTINEL_INTERVAL: '1', SENTINEL_TIMEOUT: '2' });
    assert(r.code !== 0, 'expected timeout (exit 1): the script must match the 7-hex short SHA, not the full SHA');
    assert(!r.purged, 'no purge when only the full SHA (not the short token) is served');
  });

} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log('');
console.log('cf-await-promotion behavior spec — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
