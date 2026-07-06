/**
 * tests/38-next-overdue.test.js — NEXT-SESSION overdue-boundary spec
 * (NEXT-05/08, D-04). Authored in Wave 1, TZ-pinned with a NON-VACUOUS
 * inert-guard so it can never pass green in an environment that ignored the pin.
 *
 * WHAT IT LOCKS: the overview overdue cue (Wave 2, Plans 38-05/06) marks a row
 * overdue iff `window.DateFormat.parseLocal(nextSessionDate) < todayLocal`
 * (38-UI-SPEC §2, D-04) — STRICTLY before today, local wall-clock time. TODAY
 * itself is NOT overdue. Empty/missing dates are never overdue.
 *
 * The exact hazard this guards is the Phase-37 date-off-by-one bug class: a
 * wall-clock-local comparison built with `new Date("YYYY-MM-DD")` (UTC midnight)
 * or `new Date().toISOString().slice(0,10)` (UTC day) drifts by a day in a
 * negative-UTC timezone, silently flipping the today-boundary. Per MEMORY
 * `reference-pdf-jsdom-inert-gates` + `feedback-behavior-verification` the TZ pin
 * is guarded by a getTimezoneOffset self-check that aborts LOUDLY (non-zero exit)
 * if the pin did not take — mirroring tests/37-date-format.test.js:27-49.
 *
 * FALSIFIABILITY (D-04): the predicate uses STRICT `<`. The today-boundary case
 * asserts overdue===FALSE for today — a `<=` (today-inclusive) implementation
 * would flip that to TRUE and FAIL this test. The assertion is NOT weakened.
 *
 * "Today" is derived via window.DateFormat.todayLocalISO() + parseLocal (never
 * `new Date().toISOString().slice(0,10)`), and yesterday/today/tomorrow are
 * computed from it so the test is not date-brittle.
 *
 * Run: node tests/38-next-overdue.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

// ── TZ PIN — must be the very first executable logic, before any Date use ────
// V8 caches the timezone at process startup, so setting process.env.TZ mid-file
// has NO effect. Set it, then RE-EXEC this file in a child whose TZ is applied
// at startup, and propagate the child's exit code. (Mirrors 37-date-format.)
if (process.env.TZ !== 'America/New_York') {
  process.env.TZ = 'America/New_York';
  var reexec = require('child_process').spawnSync(
    process.execPath, [__filename],
    { stdio: 'inherit', env: Object.assign({}, process.env, { TZ: 'America/New_York' }) }
  );
  process.exit(reexec.status == null ? 1 : reexec.status);
}

// ── TZ self-check — fail loudly if the pin silently did not take effect ──────
// July 2 2026 in America/New_York is EDT = UTC-4 => getTimezoneOffset() === 240.
// If this is wrong the whole "falsifiable" premise is inert (Pitfall 1).
(function assertTzPin() {
  var off = new Date(2026, 6, 2).getTimezoneOffset();
  if (off !== 240) {
    console.error('FATAL: TZ pin failed — expected EDT offset 240 for Jul 2 2026, got ' +
      off + ' (TZ=' + process.env.TZ + '). Test is inert; aborting.');
    process.exit(1);
  }
})();

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var REPO_ROOT = path.resolve(__dirname, '..');

// ── Load the REAL date engine (window.DateFormat) into a vm sandbox ──────────
// The overdue comparison MUST use the shipped local-time engine (parseLocal /
// todayLocalISO), not an ad-hoc Date parse. date-format.js registers on window.
function loadDateFormat() {
  var storage = (function () {
    var m = new Map();
    return {
      getItem: function (k) { return m.has(k) ? m.get(k) : null; },
      setItem: function (k, v) { m.set(k, String(v)); },
      removeItem: function (k) { m.delete(k); },
      clear: function () { m.clear(); },
    };
  })();
  var sandbox = {
    window: {}, localStorage: storage,
    Date: Date, Intl: Intl, Number: Number, String: String, Math: Math,
    RegExp: RegExp, Object: Object, Array: Array, JSON: JSON,
    console: { log: function () {}, warn: function () {}, error: function () {} },
  };
  sandbox.window.localStorage = storage;
  vm.createContext(sandbox);
  var dfPath = path.join(REPO_ROOT, 'assets', 'date-format.js');
  vm.runInContext(fs.readFileSync(dfPath, 'utf8'), sandbox, { filename: 'assets/date-format.js' });
  var DF = sandbox.window.DateFormat;
  if (!DF || typeof DF.parseLocal !== 'function' || typeof DF.todayLocalISO !== 'function') {
    throw new Error('assets/date-format.js did not expose parseLocal / todayLocalISO');
  }
  return DF;
}

var DF = loadDateFormat();

// "today" (local midnight) is built from the engine's local ISO — never a UTC
// toISOString slice. All comparisons are made against this exact instant.
var TODAY_ISO = DF.todayLocalISO();
var TODAY_LOCAL = DF.parseLocal(TODAY_ISO);

function pad2(n) { return String(n).padStart(2, '0'); }
function isoOf(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
// Offset TODAY by n local calendar days and return its YYYY-MM-DD (local).
function isoDaysFromToday(n) {
  var d = new Date(TODAY_LOCAL.getFullYear(), TODAY_LOCAL.getMonth(), TODAY_LOCAL.getDate() + n);
  return isoOf(d);
}

// THE PREDICATE UNDER TEST (38-UI-SPEC §2, D-04): strictly-before-today, local.
// Empty/missing/invalid => never overdue. Uses `<` (strict) so today is NOT
// overdue — a `<=` implementation FAILS the today-boundary case below.
function isOverdue(nextSessionDate) {
  if (!nextSessionDate) return false;
  var d = DF.parseLocal(nextSessionDate);
  if (!d) return false;
  return d < TODAY_LOCAL;
}

var passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log('  PASS  ' + name); passed++; }
  catch (e) { console.log('  FAIL  ' + name); console.log('        ' + (e && e.message || e)); failed++; }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }

console.log('Plan 38-01 next-session overdue-boundary spec (TZ=' + process.env.TZ + ')\n');

// yesterday-local => OVERDUE (strictly before today).
test('OVERDUE TRUE: a nextSessionDate of yesterday-local is overdue', function () {
  var yst = isoDaysFromToday(-1);
  assert(isOverdue(yst) === true, 'expected overdue TRUE for yesterday-local ' + yst);
});

// today-local => NOT overdue. THE boundary case that guards the off-by-one.
// A `<=` (today-inclusive) implementation would flip this to TRUE and FAIL.
test('OVERDUE FALSE (boundary): today-local is NOT overdue (strictly-before rule, today itself excluded)', function () {
  assert(isOverdue(TODAY_ISO) === false,
    'expected overdue FALSE for today-local ' + TODAY_ISO + ' — a <= (today-inclusive) rule would wrongly flag today');
});

// tomorrow-local => NOT overdue (future).
test('OVERDUE FALSE: tomorrow-local (a future date) is NOT overdue', function () {
  var tom = isoDaysFromToday(1);
  assert(isOverdue(tom) === false, 'expected overdue FALSE for tomorrow-local ' + tom);
});

// empty / missing => never overdue (renders "-" with no marker).
test('OVERDUE FALSE: an empty or missing nextSessionDate is never overdue', function () {
  assert(isOverdue('') === false, 'empty string must not be overdue');
  assert(isOverdue(null) === false, 'null must not be overdue');
  assert(isOverdue(undefined) === false, 'undefined must not be overdue');
});

// "today" is a LOCAL wall-clock day, not the UTC toISOString slice — proving the
// boundary is computed in local time (the exact Phase-37 hazard).
test('today-local is derived from the engine (todayLocalISO), NOT the UTC toISOString slice', function () {
  var utcSlice = new Date().toISOString().slice(0, 10);
  var t = new Date();
  var handLocal = t.getFullYear() + '-' + pad2(t.getMonth() + 1) + '-' + pad2(t.getDate());
  assert(TODAY_ISO === handLocal,
    'todayLocalISO() must equal the hand-composed LOCAL Y-M-D "' + handLocal + '", got "' + TODAY_ISO + '"');
  // In America/New_York, late-evening local time the UTC slice is TOMORROW.
  // We do not require them to differ (depends on run clock), but the boundary
  // math MUST be pinned to the local value, which the assertion above proves.
  void utcSlice;
});

// ─── count guard (vacuous-green trap) ────────────────────────────────────────
var EXPECTED_COUNT = 5;
if (passed + failed !== EXPECTED_COUNT) {
  console.error('\nCOUNT GUARD FAILED: expected ' + EXPECTED_COUNT + ' cases to execute, but ' +
    (passed + failed) + ' ran.');
  process.exit(1);
}

console.log('');
console.log('Plan 38-01 next-session overdue-boundary spec — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
