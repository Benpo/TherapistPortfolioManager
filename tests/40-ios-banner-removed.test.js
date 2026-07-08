/**
 * Regression guard — the legacy hardcoded-English iOS install banner (Phase 40,
 * D-15) must be fully removed from index.html, and its successor wiring (the
 * attention coordinator) must be present.
 *
 * The old banner was an inline <script> IIFE that UA-sniffed /iP(hone|ad|od)/
 * and appended an accent-filled element with id 'ios-install-banner' carrying
 * hardcoded English copy and the U+1F4E4 (outbox tray) emoji. Phase 40 retires
 * install-promotion on a deliberately-unsupported platform in favour of the
 * onboarding attention coordinator, so this test asserts:
 *   1. index.html contains NO 'ios-install-banner' id string.
 *   2. index.html contains NO U+1F4E4 emoji — neither the literal code point
 *      nor its JS source escape form '\u{1F4E4}' (the banner stored it escaped).
 *   3. index.html DOES reference './assets/attention-coordinator.js' (the
 *      successor wiring landed in the same phase).
 *
 * NOTE: this is a SHAPE guard (fs source-scan), not a behavior test. It pins the
 * deletion + the successor reference so a revert cannot silently reintroduce the
 * banner or drop the coordinator wiring.
 *
 * Run: node tests/40-ios-banner-removed.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

var fs = require('fs');
var path = require('path');

var index = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

var failed = 0;
function check(name, cond) {
  if (cond) { console.log('[PASS] ' + name); }
  else { failed++; console.error('[FAIL] ' + name); }
}

// ── The banner element id must be gone ─────────────────────────────────────
check("index.html contains no 'ios-install-banner' id",
  index.indexOf('ios-install-banner') === -1);

// ── The U+1F4E4 emoji must be gone (literal code point OR '\u{1F4E4}' escape) ─
var OUTBOX = String.fromCodePoint(0x1F4E4);
check('index.html contains no literal U+1F4E4 (outbox tray) emoji',
  index.indexOf(OUTBOX) === -1);
check("index.html contains no '\\u{1F4E4}' source escape for the outbox emoji",
  index.indexOf('\\u{1F4E4}') === -1);

// ── The successor wiring (attention coordinator) must be present ────────────
check("index.html references './assets/attention-coordinator.js' (successor wiring)",
  /attention-coordinator\.js/.test(index));

console.log('\n' + (failed === 0 ? 'ALL PASS' : (failed + ' FAILED')));
process.exit(failed === 0 ? 0 : 1);
