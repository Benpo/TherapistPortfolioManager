/**
 * Phase 24 Plan 04 — Behavior test for the snippet seed pack.
 *
 * Verifies that assets/snippets-seed.js exports a frozen 60-record array
 * matching the schema required by the IDB v5 migration (Plan 04 Task 2) and
 * the trigger engine (Task 3).
 *
 * Loader: same pattern as tests/24-06-spotlight-session-info.test.js —
 * fs.readFileSync + vm.runInContext on a sandbox with `window: {}`.
 *
 * Run: node tests/24-04-seed-pack.test.js
 * Exits 0 on full pass, 1 on any failure.
 *
 * Per the 24-04 PLAN Test Coverage Plan, six scenarios:
 *   A. Frozen array, length === 60.
 *   B. Every record matches the schema (id/trigger regex, expansions shape,
 *      tags shape, origin, timestamps).
 *   C. All 60 triggers unique case-insensitively.
 *   D. Every record has non-empty `en` OR non-empty `he` (fallback-chain
 *      guarantee — see REQ-3).
 *   E. Spot-check indices 0, 29, 59 — all 4 locales filled (no empty strings).
 *   F. Tag distribution: exactly 5 records per `ec.<col><row>` tag,
 *      12 cells, 60 total.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// --- Load assets/snippets-seed.js in a vm sandbox ---
const srcPath = path.join(__dirname, '..', 'assets', 'snippets-seed.js');
const sandbox = { window: {} };
vm.createContext(sandbox);

try {
  const src = fs.readFileSync(srcPath, 'utf8');
  vm.runInContext(src, sandbox, { filename: 'assets/snippets-seed.js' });
} catch (err) {
  console.error('FATAL: could not load assets/snippets-seed.js.');
  console.error('       ' + err.message);
  console.error('       Plan 04 Task 1 must create this file with window.SNIPPETS_SEED.');
  process.exit(1);
}

const SEED = sandbox.window.SNIPPETS_SEED;

// --- Test runner ---
let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  PASS  ${name}`);
    passed++;
  } catch (err) {
    console.log(`  FAIL  ${name}`);
    console.log(`        ${err.message}`);
    failed++;
  }
}

// --- A. Frozen array, length === 60 ---
test('A. SNIPPETS_SEED is a frozen array of length 60', () => {
  assert.ok(Array.isArray(SEED), 'SNIPPETS_SEED must be an Array');
  assert.strictEqual(SEED.length, 60,
    `SNIPPETS_SEED.length must be 60 (got ${SEED && SEED.length})`);
  assert.strictEqual(Object.isFrozen(SEED), true,
    'SNIPPETS_SEED must be Object.freeze()d so callers cannot mutate the cache');
});

// --- B. Schema validation on every record ---
test('B. Every record matches the snippet schema', () => {
  const idRe = /^ec\.[ab][1-6]\.[a-z0-9-]+$/;
  const triggerRe = /^[a-z0-9-]{2,32}$/;
  const tagRe = /^ec\.[ab][1-6]$/;
  const TS = '2026-05-14T00:00:00.000Z';

  SEED.forEach((s, i) => {
    assert.strictEqual(typeof s, 'object', `record ${i}: must be an object`);
    assert.ok(s !== null, `record ${i}: must not be null`);

    // id
    assert.strictEqual(typeof s.id, 'string', `record ${i}: id must be string`);
    assert.ok(idRe.test(s.id),
      `record ${i}: id "${s.id}" must match /^ec\\.[ab][1-6]\\.[a-z0-9-]+$/`);

    // trigger
    assert.strictEqual(typeof s.trigger, 'string',
      `record ${i} (${s.id}): trigger must be string`);
    assert.ok(triggerRe.test(s.trigger),
      `record ${i} (${s.id}): trigger "${s.trigger}" must match /^[a-z0-9-]{2,32}$/`);

    // expansions
    assert.strictEqual(typeof s.expansions, 'object',
      `record ${i} (${s.id}): expansions must be an object`);
    assert.ok(s.expansions !== null,
      `record ${i} (${s.id}): expansions must not be null`);
    ['he', 'en', 'cs', 'de'].forEach((loc) => {
      assert.strictEqual(typeof s.expansions[loc], 'string',
        `record ${i} (${s.id}): expansions.${loc} must be a string`);
    });

    // tags
    assert.ok(Array.isArray(s.tags),
      `record ${i} (${s.id}): tags must be an array`);
    s.tags.forEach((t, j) => {
      assert.strictEqual(typeof t, 'string',
        `record ${i} (${s.id}): tag ${j} must be a string`);
      assert.ok(tagRe.test(t),
        `record ${i} (${s.id}): tag "${t}" must match /^ec\\.[ab][1-6]$/`);
    });

    // origin
    assert.strictEqual(s.origin, 'seed',
      `record ${i} (${s.id}): origin must be exactly "seed"`);

    // timestamps
    assert.strictEqual(s.createdAt, TS,
      `record ${i} (${s.id}): createdAt must be "${TS}"`);
    assert.strictEqual(s.updatedAt, TS,
      `record ${i} (${s.id}): updatedAt must be "${TS}"`);
  });
});

// --- C. Triggers unique case-insensitively ---
test('C. All 60 triggers are unique (case-insensitive)', () => {
  const seen = new Set();
  SEED.forEach((s) => {
    const key = s.trigger.toLowerCase();
    assert.ok(!seen.has(key),
      `duplicate trigger detected: "${s.trigger}" (id ${s.id})`);
    seen.add(key);
  });
  assert.strictEqual(seen.size, 60,
    `expected 60 unique triggers, got ${seen.size}`);
});

// --- D. Fallback chain guarantee: en OR he non-empty for every record ---
test('D. Every record has at least one of en/he non-empty (fallback chain guarantee)', () => {
  SEED.forEach((s, i) => {
    const hasEn = s.expansions.en && s.expansions.en.length > 0;
    const hasHe = s.expansions.he && s.expansions.he.length > 0;
    assert.ok(hasEn || hasHe,
      `record ${i} (${s.id}): must have non-empty en OR non-empty he ` +
      `(both empty would break the fallback chain — see REQ-3)`);
  });
});

// --- E. Spot-check indices 0, 29, 59 — all 4 locales filled ---
test('E. Spot-check records 0, 29, 59 have all 4 locales filled', () => {
  [0, 29, 59].forEach((i) => {
    const s = SEED[i];
    assert.ok(s, `record ${i}: must exist`);
    ['he', 'en', 'cs', 'de'].forEach((loc) => {
      assert.ok(s.expansions[loc] && s.expansions[loc].length > 0,
        `record ${i} (${s.id}): expansions.${loc} must be non-empty ` +
        `(spot-check guarantee — choose a different PDF entry if missing)`);
    });
  });
});

// --- G. Emotion-name prefix: every non-empty expansion starts with "<Name> — " ---
test('G. Every non-empty expansion has the emotion-name prefix + em-dash separator', () => {
  const SEP = ' — ';
  SEED.forEach((s) => {
    ['he', 'en', 'cs', 'de'].forEach((loc) => {
      const text = s.expansions[loc];
      if (!text || text.length === 0) return; // empty allowed for non-spot-check indices
      assert.ok(text.includes(SEP),
        `record ${s.id} expansion ${loc} must contain " — " separator (got: ${text.slice(0, 50)}…)`);
      // The separator must appear within the first ~50 chars (i.e., this is a prefix,
      // not just a dash embedded mid-sentence).
      const sepIdx = text.indexOf(SEP);
      assert.ok(sepIdx > 0 && sepIdx < 50,
        `record ${s.id} expansion ${loc}: separator must be in prefix position (got idx ${sepIdx})`);
    });
  });
});

// --- F. Tag distribution: exactly 5 per cell × 12 cells ---
test('F. Tag distribution is exactly 5 records per cell across 12 cells', () => {
  const counts = {};
  SEED.forEach((s) => {
    s.tags.forEach((t) => {
      counts[t] = (counts[t] || 0) + 1;
    });
  });
  const expectedCells = [
    'ec.a1', 'ec.a2', 'ec.a3', 'ec.a4', 'ec.a5', 'ec.a6',
    'ec.b1', 'ec.b2', 'ec.b3', 'ec.b4', 'ec.b5', 'ec.b6',
  ];
  expectedCells.forEach((cell) => {
    assert.strictEqual(counts[cell], 5,
      `cell ${cell} must contain exactly 5 records (got ${counts[cell] || 0})`);
  });
  const total = Object.values(counts).reduce((acc, n) => acc + n, 0);
  assert.strictEqual(total, 60,
    `tag totals must sum to 60 (got ${total})`);
});

// --- Report ---
console.log('');
console.log(`Plan 04 seed-pack tests — ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
