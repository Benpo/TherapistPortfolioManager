/**
 * Phase 25 Plan 12 — UAT-C2: optimize-all confirm dialog must substitute
 * the {n} and {size} placeholders BEFORE rendering.
 *
 * Asserts that assets/settings.js's optimize handler EITHER:
 *   - passes a `placeholders: {n, size}` (or similar named bag) object to
 *     App.confirmDialog, OR
 *   - pre-substitutes the i18n template via App.t().replace('{n}', ...) and
 *     passes the resolved string as `message:` (not `messageKey:`).
 *
 * Source-grep is supplemental to the structural fix; the actual UAT-C2 fix
 * lives in assets/app.js (confirmDialog placeholder support). This test
 * locks down the call-site contract.
 *
 * Run: node tests/25-12-optimize-placeholders.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const settingsSrc = fs.readFileSync(path.join(__dirname, '..', 'assets', 'settings.js'), 'utf8');
const appSrc = fs.readFileSync(path.join(__dirname, '..', 'assets', 'app.js'), 'utf8');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) {
    console.log('  FAIL  ' + name);
    console.log('        ' + (err && err.message || err));
    failed++;
  }
}

// ────────────────────────────────────────────────────────────────────
// Locate the optimize-handler block in settings.js: the slice from the
// 'photos.optimize.confirm.body' reference back ~600 chars and forward
// ~200 chars covers the confirmDialog call site.
// ────────────────────────────────────────────────────────────────────

test('settings.js optimize handler references photos.optimize.confirm.body', () => {
  if (settingsSrc.indexOf('photos.optimize.confirm.body') === -1) {
    throw new Error('settings.js no longer references photos.optimize.confirm.body — call site may have moved');
  }
});

test('settings.js optimize call site passes placeholders (or pre-substitutes) for {n} and {size}', () => {
  const anchor = settingsSrc.indexOf("photos.optimize.confirm.body");
  if (anchor === -1) throw new Error('photos.optimize.confirm.body anchor not found in settings.js');
  // Take a window around the call site. confirmDialog options are typically
  // adjacent within ±600 chars.
  const start = Math.max(0, anchor - 600);
  const end = Math.min(settingsSrc.length, anchor + 800);
  const slice = settingsSrc.slice(start, end);

  // Three acceptable shapes for fix:
  //   A. placeholders: {n: ..., size: ...} or placeholders: { n, size }
  //   B. message: <something with .replace('{n}', ...) AND .replace('{size}', ...)>
  //   C. messageText / messageHtml using a substituted local variable that
  //      was clearly built from .replace('{n}', ...) AND .replace('{size}', ...)
  //
  // The grep is conservative: we look for the presence of a "placeholders:"
  // property within the slice, OR the simultaneous presence of both
  // .replace("{n}" or .replace('{n}' AND .replace("{size}" or .replace('{size}'.

  const hasPlaceholdersField = /placeholders\s*:/.test(slice);
  const hasReplaceN = /\.replace\(\s*['"]\{n\}['"]/.test(slice);
  const hasReplaceSize = /\.replace\(\s*['"]\{size\}['"]/.test(slice);

  const okPlaceholders = hasPlaceholdersField;
  const okPreSubstitute = hasReplaceN && hasReplaceSize;

  if (!okPlaceholders && !okPreSubstitute) {
    throw new Error(
      'optimize call site neither uses placeholders: nor pre-substitutes {n} + {size}.\n' +
      '        Expected one of:\n' +
      "          • placeholders: { n: ..., size: ... }\n" +
      "          • .replace('{n}', ...) AND .replace('{size}', ...)\n" +
      '        Slice (truncated): ' + slice.replace(/\s+/g, ' ').slice(0, 500)
    );
  }
});

// ────────────────────────────────────────────────────────────────────
// Lock in the confirmDialog API extension: app.js must declare support
// for placeholders. Either:
//   - the function signature destructures `placeholders` from options, OR
//   - the function body references `options.placeholders` (positional shape).
// ────────────────────────────────────────────────────────────────────

// Helper: slice the confirmDialog function body up to (but not including) the
// next top-level `function ` declaration. This is forgiving against comments
// that pad the body length — the previous fixed 1800-char window was too
// narrow once Plan 12 added the placeholder-substitution block + JSDoc.
function getConfirmDialogBody() {
  const fnIdx = appSrc.search(/function\s+confirmDialog\s*\(/);
  if (fnIdx === -1) throw new Error('confirmDialog function not found in assets/app.js');
  // Look forward for the next `function ` declaration at column 2 (the
  // module IIFE indentation). Cap at 8000 chars defensively.
  const rest = appSrc.slice(fnIdx + 1, fnIdx + 8000);
  const nextFnIdx = rest.search(/\n\s{2}function\s+\w+\s*\(/);
  const end = nextFnIdx === -1 ? appSrc.length : (fnIdx + 1 + nextFnIdx);
  return appSrc.slice(fnIdx, end);
}

test('app.js confirmDialog accepts a placeholders option', () => {
  const body = getConfirmDialogBody();
  // Acceptable: destructured `placeholders` in the parameter list OR a body
  // reference to a placeholders variable / property.
  const hasParamPlaceholders = /\{[^}]*placeholders[^}]*\}/.test(body.slice(0, 250)); // within signature
  const hasBodyPlaceholders = /placeholders/.test(body);

  if (!hasParamPlaceholders && !hasBodyPlaceholders) {
    throw new Error('app.js confirmDialog does not reference `placeholders` anywhere in its definition');
  }
});

test('app.js confirmDialog body contains a .replace call (placeholder substitution)', () => {
  const body = getConfirmDialogBody();
  // The substitution path must call .replace('{x}', value) somewhere — either
  // a for-loop over Object.keys(placeholders) or an explicit replace chain.
  if (!/\.replace\(/.test(body)) {
    throw new Error('app.js confirmDialog body has no .replace() call — placeholder substitution missing');
  }
});

// ─── Report ─────────────────────────────────────────────────────────
console.log('');
console.log('Plan 25-12 optimize-placeholders tests — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
