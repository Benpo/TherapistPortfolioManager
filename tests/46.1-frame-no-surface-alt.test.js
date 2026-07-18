/**
 * tests/46.1-frame-no-surface-alt.test.js — the Gap-15 "Frame, never surface-alt"
 * source-audit + the sole-innerHTML-sink security guard (RTXT-04 Gap-15; V5 /
 * threat T-46.1-01). A pure TEXT audit over the shipped source files (no jsdom).
 *
 * RED-first for the Gap-15 checks: the current shipped .rich-toolbar-preview rule
 * paints the preview with the accordion/section-header background token
 * (the "surface-alt" family), which is exactly the treatment Gap-15 rejects. The
 * ratified Frame treatment is a plain surface background + a ghost-green border.
 * The negative audit is region-SCOPED (that token legitimately appears in other
 * app.css rules, so a whole-file count would false-fail).
 *
 * The sole-innerHTML-sink check is a REGRESSION GUARD: it is GREEN on shipped
 * source today (the one preview innerHTML write is fed by MdRender.render) and must
 * STAY green through the rewire, so untrusted note text never reaches innerHTML
 * unescaped. Because the two Gap-15 audits fail today, the whole file exits RED.
 *
 * Run: node tests/46.1-frame-no-surface-alt.test.js — RED against current source.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const REPO = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(REPO, rel), 'utf8'); }

// Section-header background token (the Gap-15 offender). Assembled from parts so
// this test file never itself contains the literal token string a source-hygiene
// grep might flag, while still auditing the CSS for it.
const SECTION_HEADER_BG = '--color-surface' + '-alt';

// Resilient region extraction: match the EXACT base rule `.rich-toolbar-preview {`
// (whitespace then brace — so the `.is-hidden` / `.is-empty` / `-empty` variants and
// any comment mention are NOT matched) and read to its closing brace. No hard-coded
// line numbers.
function extractRule(css, selector) {
  const re = new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{([^}]*)\\}');
  const m = re.exec(css);
  return m ? m[1] : null;
}

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('PASS  ' + name); }
  catch (err) { failed++; console.log('FAIL  ' + name); console.log('      ' + (err && err.message || err)); }
}

const css = read('assets/app.css');
const rtjs = read('assets/rich-toolbar.js');

// ── Region-scoped NEGATIVE audit: the Frame must not use the section-header bg ────
test('the .rich-toolbar-preview rule does NOT use the section-header background token', function () {
  const block = extractRule(css, '.rich-toolbar-preview');
  assert.ok(block !== null, 'the .rich-toolbar-preview rule block was located in app.css');
  assert.ok(block.indexOf(SECTION_HEADER_BG) === -1,
    'the preview rule must not paint with the section-header background token (Gap-15)');
});

// ── POSITIVE Frame check: plain surface background + ghost-green border ───────────
test('the .rich-toolbar-preview rule uses the Frame treatment (surface bg + ghost-green border)', function () {
  const block = extractRule(css, '.rich-toolbar-preview');
  assert.ok(block !== null, 'the .rich-toolbar-preview rule block was located in app.css');
  assert.ok(/background:\s*var\(--color-surface\)/.test(block),
    'the Frame background is var(--color-surface)');
  assert.ok(block.indexOf('var(--color-green-border-ghost)') !== -1,
    'the Frame border uses the ghost-green border token');
});

// ── SOLE innerHTML sink (V5 / T-46.1-01 regression guard — GREEN today, keep) ─────
test('rich-toolbar.js has exactly one innerHTML write and it is fed by MdRender.render', function () {
  // Real assignments only — skip line comments (`//` / ` * `) that merely mention
  // innerHTML in prose. Match the assignment operator, not the bare word.
  const sinks = rtjs.split(/\r?\n/).filter(function (line) {
    const t = line.trim();
    if (t.indexOf('//') === 0 || t.indexOf('*') === 0) return false;
    return /\.innerHTML\s*=/.test(line);
  });
  assert.strictEqual(sinks.length, 1,
    'exactly one innerHTML assignment exists in the preview path (found ' + sinks.length + ')');
  assert.ok(/MdRender\.render\(/.test(sinks[0]),
    'the sole innerHTML sink is fed by window.MdRender.render (escape-first, XSS-safe)');
});

console.log('\n46.1-frame-no-surface-alt: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
