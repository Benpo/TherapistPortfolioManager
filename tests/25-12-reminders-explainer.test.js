/**
 * Phase 25 Plan 12 (round-2 post-UAT) — Change C: "How reminders work"
 * explainer card on the backup modal.
 *
 * Today, `schedule.frequency.helperOn` ends with the sentence "The 7-day
 * banner is muted while a schedule is active." That references a banner
 * the user might never have seen, and the relationship between the
 * legacy 7-day banner and the new auto-backup feature is not explained
 * coherently anywhere. The fix: add a collapsible `<details>` card to
 * the backup modal (#backupModal) that explains all three reminder
 * states; then drop the trailing "7-day banner" sentence from
 * `schedule.frequency.helperOn` (and `schedule.disableConfirm.body` if
 * it carries the same sentence — left to the implementer's discretion,
 * but enforced if it does).
 *
 * Contracts:
 *
 *   1. index.html contains a `<details>` element whose `<summary>` has
 *      data-i18n="reminders.helper.heading", and whose body element
 *      carries data-i18n="reminders.helper.body". The element lives
 *      somewhere inside #backupModal markup (so it appears in the
 *      backup-restore modal — NOT on a different page or modal).
 *
 *   2. New i18n keys `reminders.helper.heading` AND `reminders.helper.body`
 *      exist in all 4 locales (en/he/de/cs) as non-empty strings.
 *
 *   3. `schedule.frequency.helperOn` in all 4 locales does NOT contain
 *      "7-day" / "7 day" / "7 days" / "7 ימים" / "7-Tage" / "7 dn" — i.e.
 *      the trailing sentence has been moved out into the explainer card.
 *
 * MUST FAIL before the round-2 fix:
 *   - No <details> element in index.html.
 *   - reminders.helper.* keys absent.
 *   - schedule.frequency.helperOn still contains "7-day" / "7 ימים" / etc.
 *
 * Run: node tests/25-12-reminders-explainer.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) {
    console.log('  FAIL  ' + name);
    console.log('        ' + (err && err.message || err));
    failed++;
  }
}

// ── Load i18n sandbox ─────────────────────────────────────────────
const i18nSandbox = { window: {}, console: { log() {}, warn() {}, error() {} } };
i18nSandbox.window.I18N = {};
i18nSandbox.window.QUOTES = {};
vm.createContext(i18nSandbox);
for (const f of ['i18n-en.js', 'i18n-he.js', 'i18n-de.js', 'i18n-cs.js']) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets', f), 'utf8'), i18nSandbox, { filename: 'assets/' + f });
}
const I18N = i18nSandbox.window.I18N;
const LOCALES = ['en', 'he', 'de', 'cs'];

// ────────────────────────────────────────────────────────────────────
// Contract 1 — <details> exists inside #backupModal
// ────────────────────────────────────────────────────────────────────

function findBackupModalSlice() {
  const start = indexHtml.indexOf('id="backupModal"');
  if (start === -1) return null;
  // Take a generous slice; the modal ends at the next top-level container.
  // The modal closes with "</div>" at column-0; walk forward to the next
  // sibling modal anchor (id="clientModal") which marks the boundary.
  const end = indexHtml.indexOf('id="clientModal"', start);
  return indexHtml.slice(start, end === -1 ? start + 5000 : end);
}

test('index.html: #backupModal contains a <details> element with data-i18n="reminders.helper.heading" summary', () => {
  const slice = findBackupModalSlice();
  if (slice === null) throw new Error('#backupModal not found in index.html');

  // The <details> must contain a <summary> with the heading i18n key.
  // Match the <details> ... </details> block; then verify the summary key.
  const detailsRe = /<details\b[^>]*>([\s\S]*?)<\/details>/i;
  const m = slice.match(detailsRe);
  if (!m) {
    throw new Error('no <details> element found inside #backupModal — the "How reminders work" explainer card is missing');
  }
  const detailsBody = m[1];

  if (!/<summary\b[^>]*data-i18n="reminders\.helper\.heading"/.test(detailsBody)) {
    throw new Error(
      '<details> element exists but its <summary> does not carry\n' +
      '        data-i18n="reminders.helper.heading". Got body: ' + JSON.stringify(detailsBody.slice(0, 300))
    );
  }
});

test('index.html: the explainer body element carries data-i18n="reminders.helper.body"', () => {
  const slice = findBackupModalSlice();
  if (slice === null) throw new Error('#backupModal not found in index.html');

  const detailsRe = /<details\b[^>]*>([\s\S]*?)<\/details>/i;
  const m = slice.match(detailsRe);
  if (!m) throw new Error('no <details> element found inside #backupModal');
  const detailsBody = m[1];

  // The body element can be any tag — <p>, <div>, <ul>, etc. — but must
  // carry data-i18n="reminders.helper.body". (Implementer may also break
  // it into reminders.helper.body.noSchedule / .scheduleActive / .switchOff;
  // accept any data-i18n that starts with "reminders.helper.body".)
  if (!/data-i18n="reminders\.helper\.body[^"]*"/.test(detailsBody)) {
    throw new Error(
      'no element with data-i18n="reminders.helper.body" (or a "reminders.helper.body.*"\n' +
      '        sub-key) found inside the <details> block. The 3-mode explanation\n' +
      '        (no schedule / schedule active / switching off) must be wired through i18n.'
    );
  }
});

// ────────────────────────────────────────────────────────────────────
// Contract 2 — i18n keys exist in all 4 locales
// ────────────────────────────────────────────────────────────────────

for (const l of LOCALES) {
  test('i18n: reminders.helper.heading exists in locale ' + l, () => {
    const v = I18N[l] && I18N[l]['reminders.helper.heading'];
    if (typeof v !== 'string' || v.length === 0) {
      throw new Error('reminders.helper.heading missing or empty in i18n-' + l + '.js');
    }
  });
}

// The body can be a single key OR multiple `reminders.helper.body.*` keys.
for (const l of LOCALES) {
  test('i18n: reminders.helper.body (or sub-keys) exists in locale ' + l, () => {
    if (!I18N[l]) throw new Error('locale ' + l + ' missing entirely');
    const keys = Object.keys(I18N[l]).filter(k => k === 'reminders.helper.body' || k.indexOf('reminders.helper.body.') === 0);
    if (keys.length === 0) {
      throw new Error('no reminders.helper.body (or reminders.helper.body.*) key in i18n-' + l + '.js');
    }
    for (const k of keys) {
      if (typeof I18N[l][k] !== 'string' || I18N[l][k].length === 0) {
        throw new Error(k + ' is empty in i18n-' + l + '.js');
      }
    }
  });
}

// ────────────────────────────────────────────────────────────────────
// Contract 3 — schedule.frequency.helperOn no longer mentions "7-day"
// ────────────────────────────────────────────────────────────────────

const SEVEN_DAY_PATTERNS = {
  en: /\b7[\s-]?day(s?)\b|7\s*-?\s*day banner/i,
  // HE: matches `7 ימים` / `7-ימים` / `7-הימים` etc. — any 7 followed
  // optionally by hyphen+he-article (ה) and then the days noun (ימים/הימים).
  he: /7\s*[-־]?\s*ה?ימים/,
  de: /\b7[\s-]?Tage(s|n)?[-\s]?Banner?\b|\b7[\s-]?Tage\b/i,
  // CS: `7 dní` / `7 dnech` / `7 dnů` / `7-dnů` — match 7 followed by
  // a CS day-noun form (dní / dnech / dnů / dny).
  cs: /\b7[\s-]?(dní|dnech|dnů|dny)\b/i,
};

for (const l of LOCALES) {
  test('i18n: schedule.frequency.helperOn in locale ' + l + ' no longer mentions "7-day"/"7 day" (moved to explainer)', () => {
    const v = I18N[l] && I18N[l]['schedule.frequency.helperOn'];
    if (typeof v !== 'string') {
      throw new Error('schedule.frequency.helperOn missing in ' + l);
    }
    const pattern = SEVEN_DAY_PATTERNS[l];
    if (pattern && pattern.test(v)) {
      throw new Error(
        'schedule.frequency.helperOn in ' + l + ' still contains a "7-day banner" reference:\n' +
        '        ' + JSON.stringify(v) + '\n' +
        '        That sentence should move to the new reminders.helper.body explainer.'
      );
    }
  });
}

// ─── Report ─────────────────────────────────────────────────────────
console.log('');
console.log('Plan 25-12 reminders-explainer tests — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
