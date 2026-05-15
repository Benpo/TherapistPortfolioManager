/**
 * Phase 25 Plan 12 (round-2 post-UAT) — Change A: password-ack callout
 * redesign + copy revisions.
 *
 * Three independent contracts:
 *
 *   1. Copy revision (EN canonical):
 *      schedule.password.callout must START WITH "Please note:" and END
 *      WITH "it cannot be recovered." (Ben's reworded copy, 2026-05-15).
 *      HE must START WITH "לתשומת ליבך:" and END WITH
 *      "ניתן לשחזר אותה." (Hebrew equivalent of "Please note:" + "cannot
 *      be recovered"). DE and CS must echo the same "Please note:" /
 *      "cannot be recovered" pattern in their own register.
 *
 *   2. Layout flip (HTML + CSS):
 *      .schedule-password-acked-row must be a horizontal single-line row
 *      (display:flex + flex-direction:row, NOT column). The checkbox
 *      INPUT must be a sibling of the ackedLabel inside the inline row
 *      — not stacked above it. The ackedLabel <p>/element previously
 *      above the checkbox is REMOVED from inside .schedule-password-acked-row
 *      (the long verification text moves out of the row entirely so the
 *      row is just `[checkbox] [label]` inline).
 *
 *      (We accept either: a `flex-direction: row` declaration; OR the
 *      absence of `flex-direction: column` plus a `display: flex` rule
 *      — flex defaults to row when direction is unspecified.)
 *
 *   3. Visual weight:
 *      The ack label (schedule.password.ackedShort / ackedLabel) must
 *      render BOLDER and LARGER than the callout paragraph above it.
 *      In CSS terms: a rule that targets the ack label declares either
 *      `font-weight >= 600` AND a font-size larger than the surrounding
 *      paragraph default (≥ 1.05em / ≥ 15px / ≥ 1.05rem etc.).
 *
 * MUST FAIL before the round-2 fix:
 *   - The EN copy still reads "Scheduled backups require…" / "we
 *     cannot recover it." (no "Please note:" prefix).
 *   - The CSS rule has `flex-direction: column` so the layout still
 *     stacks vertically.
 *   - No font-weight/font-size override exists for the ack label.
 *
 * Run: node tests/25-12-password-callout-redesign.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const appCss = fs.readFileSync(path.join(ROOT, 'assets', 'app.css'), 'utf8');
const settingsHtml = fs.readFileSync(path.join(ROOT, 'settings.html'), 'utf8');

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

// ─────────────────────────────────────────────────────────────────────
// Contract 1 — copy revision (4 locales)
// ─────────────────────────────────────────────────────────────────────

test('EN schedule.password.callout starts with "Please note:" and ends with "it cannot be recovered."', () => {
  const v = I18N.en && I18N.en['schedule.password.callout'];
  if (typeof v !== 'string') throw new Error('schedule.password.callout missing in en');
  if (!/^Please note:/.test(v)) throw new Error('EN callout does not start with "Please note:" — got: ' + JSON.stringify(v.slice(0, 60)));
  if (!/it cannot be recovered\.$/.test(v)) throw new Error('EN callout does not end with "it cannot be recovered." — got: ' + JSON.stringify(v.slice(-60)));
});

test('HE schedule.password.callout starts with "לתשומת ליבך:" and ends with "ניתן לשחזר אותה."', () => {
  const v = I18N.he && I18N.he['schedule.password.callout'];
  if (typeof v !== 'string') throw new Error('schedule.password.callout missing in he');
  if (!/^לתשומת ליבך:/.test(v)) throw new Error('HE callout does not start with "לתשומת ליבך:" — got: ' + JSON.stringify(v.slice(0, 80)));
  if (!/ניתן לשחזר אותה\.$/.test(v)) throw new Error('HE callout does not end with "ניתן לשחזר אותה." — got: ' + JSON.stringify(v.slice(-80)));
});

test('DE schedule.password.callout uses a "Please note:" opener and a "cannot be recovered" close (parity)', () => {
  const v = I18N.de && I18N.de['schedule.password.callout'];
  if (typeof v !== 'string') throw new Error('schedule.password.callout missing in de');
  // Accept any natural DE rendering of "Please note:" — must start with one of
  // Bitte beachten / Hinweis: / Bitte beachte.
  if (!/^(Bitte beachten|Hinweis|Bitte beachte)/.test(v)) {
    throw new Error('DE callout opener does not match "Please note:" parity — got: ' + JSON.stringify(v.slice(0, 60)));
  }
  // Accept any natural DE rendering of "cannot be recovered" — `nicht … wiederhergestellt`.
  if (!/nicht.*wiederhergestellt|nicht wiederherstellbar/.test(v)) {
    throw new Error('DE callout does not say "cannot be recovered" — got: ' + JSON.stringify(v));
  }
});

test('CS schedule.password.callout uses a "Please note:" opener and a "cannot be recovered" close (parity)', () => {
  const v = I18N.cs && I18N.cs['schedule.password.callout'];
  if (typeof v !== 'string') throw new Error('schedule.password.callout missing in cs');
  // CS rendering of "Please note:" — Upozornění / Vezměte prosím na vědomí / Pozor.
  if (!/^(Upozorn|Vezm|Pozor|Pro va|Pamatujte)/.test(v)) {
    throw new Error('CS callout opener does not match "Please note:" parity — got: ' + JSON.stringify(v.slice(0, 60)));
  }
  // CS "cannot be recovered" — nelze obnovit / nelze jej obnovit.
  if (!/nelze.*obnovit|není.*obnoviteln/i.test(v)) {
    throw new Error('CS callout does not say "cannot be recovered" — got: ' + JSON.stringify(v));
  }
});

// ─────────────────────────────────────────────────────────────────────
// Contract 2 — layout flip: row, not column
// ─────────────────────────────────────────────────────────────────────

function findAckedRowRuleBodies() {
  const bodies = [];
  // Match `.schedule-password-acked-row` selectors (NOT `__control`).
  const re = /(?:^|[\s,])\.schedule-password-acked-row(?![\w-])[^{]*\{([^}]*)\}/g;
  let m;
  while ((m = re.exec(appCss)) !== null) bodies.push(m[1]);
  return bodies;
}

test('.schedule-password-acked-row no longer uses flex-direction: column (round-1 inline-flex-row redesign)', () => {
  const bodies = findAckedRowRuleBodies();
  if (!bodies.length) throw new Error('no .schedule-password-acked-row rule found in app.css');
  const combined = bodies.join('\n');
  // The round-1 layout was flex-direction:column; the round-2 redesign
  // reverts it to a single horizontal row.
  if (/flex-direction\s*:\s*column\b/.test(combined)) {
    throw new Error(
      '.schedule-password-acked-row still declares flex-direction: column.\n' +
      '        Round-2 redesign requires a single horizontal flex row\n' +
      '        (display:flex with no flex-direction:column, or explicit\n' +
      '        flex-direction:row).\n' +
      '        Bodies inspected:\n        ' + bodies.map(b => b.trim().replace(/\s+/g, ' ')).join('\n        ')
    );
  }
  // And must still declare display:flex (so the row layout is explicit).
  if (!/display\s*:\s*flex\b/.test(combined)) {
    throw new Error('.schedule-password-acked-row no longer declares display: flex');
  }
  // align-items: center makes the checkbox visually align with the label.
  if (!/align-items\s*:\s*center\b/.test(combined)) {
    throw new Error('.schedule-password-acked-row should declare align-items: center for a clean inline row');
  }
});

test('settings.html: inside #schedulePasswordCallout, the checkbox INPUT is a sibling of (not stacked above) the ack label', () => {
  const calloutStart = settingsHtml.indexOf('id="schedulePasswordCallout"');
  if (calloutStart === -1) throw new Error('#schedulePasswordCallout not found in settings.html');
  const slice = settingsHtml.slice(calloutStart, calloutStart + 2000);

  // The ack-row must contain BOTH the input and the label/span carrying
  // either ackedLabel OR ackedShort data-i18n attribute, with the input
  // appearing BEFORE the label (typical checkbox-then-label inline order).
  const rowStart = slice.indexOf('class="form-field schedule-password-acked-row"');
  const rowStartAlt = slice.indexOf('schedule-password-acked-row"');
  const startIdx = rowStart !== -1 ? rowStart : rowStartAlt;
  if (startIdx === -1) throw new Error('.schedule-password-acked-row element not found inside #schedulePasswordCallout');

  // Grab the row's outer HTML up to its closing tag — accept a generous slice.
  const rowSlice = slice.slice(startIdx, startIdx + 800);

  // The checkbox input must be present inside the row.
  if (!/<input[^>]*\bid="schedulePasswordAcked"/.test(rowSlice)) {
    throw new Error('schedulePasswordAcked checkbox <input> not found inside .schedule-password-acked-row');
  }

  // The OLD layout had a <p> with data-i18n="schedule.password.ackedLabel"
  // INSIDE the row (sibling above the checkbox label). The round-2 redesign
  // removes that <p> from the row (or replaces it with the label itself).
  // Assert the <p data-i18n="schedule.password.ackedLabel"> is NOT inside
  // the inline-flex row.
  if (/<p[^>]*data-i18n="schedule\.password\.ackedLabel"/.test(rowSlice)) {
    throw new Error(
      'a <p data-i18n="schedule.password.ackedLabel"> still sits inside\n' +
      '        .schedule-password-acked-row — the round-2 redesign moves the\n' +
      '        long verification text OUT of the inline row so the row is\n' +
      '        just [checkbox] [short label] on one line. Remove the <p>\n' +
      '        from inside .schedule-password-acked-row.'
    );
  }
});

// ─────────────────────────────────────────────────────────────────────
// Contract 3 — visual weight: ack label bolder/larger than the callout
// ─────────────────────────────────────────────────────────────────────

test('CSS: a rule for the ack label declares font-weight >= 600 (bolder than callout paragraph)', () => {
  // Accept any rule that targets either:
  //   • the .schedule-password-acked-row__control descendants
  //   • the schedule-password-acked-row label/span directly
  //   • the .schedule-password-acked-row { ... font-weight: 600+ }
  // The simplest valid implementation puts the weight directly on the row.
  const ackRuleRe = /\.schedule-password-acked-row(?:__control)?[^{]*\{([^}]*)\}/g;
  let m;
  let foundWeight = false;
  while ((m = ackRuleRe.exec(appCss)) !== null) {
    const body = m[1];
    // Accept named weights `bold` (700), or numeric ≥ 600.
    const wMatch = body.match(/font-weight\s*:\s*(\d{3}|bold|bolder)/);
    if (wMatch) {
      const v = wMatch[1];
      if (v === 'bold' || v === 'bolder' || parseInt(v, 10) >= 600) {
        foundWeight = true;
        break;
      }
    }
  }
  if (!foundWeight) {
    throw new Error(
      'no .schedule-password-acked-row* rule declares font-weight >= 600 / bold.\n' +
      '        The ack label is the action the user takes — it must read\n' +
      '        bolder than the callout paragraph above.'
    );
  }
});

test('CSS: a rule for the ack label declares a font-size LARGER than the callout default (>= 1.05em / 15px / 1.05rem)', () => {
  const ackRuleRe = /\.schedule-password-acked-row(?:__control)?[^{]*\{([^}]*)\}/g;
  let m;
  let foundLargerSize = false;
  while ((m = ackRuleRe.exec(appCss)) !== null) {
    const body = m[1];
    // Accept rem/em ≥ 1.05, OR px ≥ 15.
    const remMatch = body.match(/font-size\s*:\s*(\d+(?:\.\d+)?)\s*(rem|em)\b/);
    if (remMatch && parseFloat(remMatch[1]) >= 1.05) { foundLargerSize = true; break; }
    const pxMatch = body.match(/font-size\s*:\s*(\d+)\s*px\b/);
    if (pxMatch && parseInt(pxMatch[1], 10) >= 15) { foundLargerSize = true; break; }
    // Accept var-token ≥ --text-md / --text-lg.
    if (/font-size\s*:\s*var\(\s*--text-(md|lg|base)\b/.test(body)) { foundLargerSize = true; break; }
  }
  if (!foundLargerSize) {
    throw new Error(
      'no .schedule-password-acked-row* rule declares a larger font-size.\n' +
      '        The ack label should read ~10-15% larger than the callout\n' +
      '        paragraph (>= 1.05em / 15px / --text-md).'
    );
  }
});

// ─── Report ─────────────────────────────────────────────────────────
console.log('');
console.log('Plan 25-12 password-callout-redesign tests — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
