/**
 * date-format.js — the canonical calendar-date engine (window.DateFormat)
 *
 * Single source of truth for parsing and formatting CALENDAR dates
 * (session `date`, client `birthDate` — all `YYYY-MM-DD` strings). Zero
 * dependencies, pure vanilla IIFE (mirrors crashlog.js / version.js shape but
 * registers on `window`).
 *
 * The bug this kills at the root: `new Date("YYYY-MM-DD")` parses as UTC
 * midnight, so in any negative-UTC timezone the LOCAL calendar day is the day
 * BEFORE. `parseLocal` regex-extracts the leading `YYYY-MM-DD` and constructs a
 * LOCAL `Date(y, m-1, d)` — never the UTC-midnight string form (D-01/D-02).
 *
 * Loaded via a <script> tag BEFORE app.js and pdf-export.js on every app page,
 * precached in sw.js, and injected into the jsdom PDF test env (D-21).
 *
 * Public surface:
 *   - format(input, formatKey, lang) -> display string
 *   - parseLocal(input)              -> local Date | null
 *   - todayLocalISO()                -> "YYYY-MM-DD" (local wall-clock day)
 *   - getPreference()                -> localStorage['portfolioDateFormat'] || 'auto'
 *
 * NOTE: Hebrew numeric formats are returned as a BARE string wrapped in the
 * Unicode directional isolates U+2066 (LRI) … U+2069 (PDI) — never <bdo> markup
 * (call sites use .textContent). Named-month Hebrew is NOT wrapped.
 */
window.DateFormat = (function () {
  'use strict';

  var VALID_KEYS = ['auto', 'month-day-year', 'day-month-year', 'mm/dd/yyyy', 'dd/mm/yyyy', 'yyyy-mm-dd'];
  var LOCALE_MAP = { he: 'he-IL', de: 'de-DE', cs: 'cs-CZ' }; // else en-US (D-04)

  // U+2066 LEFT-TO-RIGHT ISOLATE, U+2069 POP DIRECTIONAL ISOLATE (D-07).
  var LRI = '⁦';
  var PDI = '⁩';

  // U+2068 FIRST STRONG ISOLATE — used by isolate() below. FSI (not LRI) lets a
  // wrapped run keep its OWN base direction from its first strong character: a
  // Latin client name stays LTR, a Hebrew name stays RTL, a month-name Hebrew
  // date (first strong char Hebrew) renders RTL while an English month renders
  // LTR. LRI/PDI above stay reserved for the numeric-format path in maybeWrapLtr.
  var FSI = '⁨';

  // Extract a LOCAL Date from the leading YYYY-MM-DD of any isoish input.
  // Handles bare "2026-07-02" AND legacy full-ISO "2026-07-02T00:00:00.000Z"
  // (the regex grabs only the leading date part -> never a UTC-midnight shift).
  function parseLocal(input) {
    if (!input) return null;
    if (input instanceof Date) return Number.isNaN(input.getTime()) ? null : input;
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(input));
    if (!m) return null;
    var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])); // LOCAL, not UTC
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function pad(n) { return String(n).padStart(2, '0'); }

  function todayLocalISO() {
    var t = new Date();
    return t.getFullYear() + '-' + pad(t.getMonth() + 1) + '-' + pad(t.getDate());
  }

  function getPreference() {
    try { return localStorage.getItem('portfolioDateFormat') || 'auto'; }
    catch (e) { return 'auto'; }
  }

  function resolveLocale(lang) { return LOCALE_MAP[lang] || 'en-US'; }

  function shortMonth(d, locale) {
    return new Intl.DateTimeFormat(locale, { month: 'short' }).format(d);
  }

  // "Auto" == the CURRENT App.formatDate behavior, byte-for-byte:
  //   en -> en-US short  ("Jul 2, 2026")     [D-04]
  //   he -> he-IL short  ("2 ביולי 2026")
  //   de -> de-DE long   ("2. Juli 2026")
  //   cs -> cs-CZ long   ("2. července 2026")
  function autoFormat(d, lang, locale) {
    var month = (lang === 'de' || lang === 'cs') ? 'long' : 'short';
    return new Intl.DateTimeFormat(locale, { year: 'numeric', month: month, day: 'numeric' }).format(d);
  }

  // D-07: numeric formats in Hebrew must render LTR. Wrap with Unicode isolates
  // (U+2066 LRI … U+2069 PDI) — a BARE-STRING solution safe for every context
  // (textContent, document.title, markdown). Named-month Hebrew is NOT wrapped.
  function isNumericKey(k) { return k === 'mm/dd/yyyy' || k === 'dd/mm/yyyy' || k === 'yyyy-mm-dd'; }
  function maybeWrapLtr(str, formatKey, lang) {
    if (lang === 'he' && isNumericKey(formatKey)) return LRI + str + PDI;
    return str;
  }

  // First-Strong-Isolate an arbitrary run so it cannot reorder against adjacent
  // runs under the Unicode Bidi Algorithm at a string-composition site (e.g. a
  // Latin client name next to a bare month-name Hebrew date under html[dir=rtl]).
  // Bare-string (not <bdi>) so it is safe for .textContent AND document.title.
  // Empty/nullish returns "" — never a pair of bare isolate characters.
  function isolate(value) {
    if (value === null || value === undefined || value === '') return '';
    return FSI + String(value) + PDI;
  }

  // input: isoish string | Date ; formatKey: one of VALID_KEYS ; lang: 'en'|'he'|'de'|'cs'
  function format(input, formatKey, lang) {
    var d = parseLocal(input);
    if (!d) return input ? String(input) : '';          // invalid -> pass through / empty
    if (VALID_KEYS.indexOf(formatKey) === -1) formatKey = 'auto';
    var locale = resolveLocale(lang);
    var y = d.getFullYear(), mo = d.getMonth() + 1, day = d.getDate();
    var out;
    switch (formatKey) {
      case 'yyyy-mm-dd':      out = y + '-' + pad(mo) + '-' + pad(day); break;      // D-06 dashes
      case 'mm/dd/yyyy':      out = pad(mo) + '/' + pad(day) + '/' + y; break;      // D-06 slashes
      case 'dd/mm/yyyy':      out = pad(day) + '/' + pad(mo) + '/' + y; break;      // D-06 slashes
      case 'month-day-year':  out = shortMonth(d, locale) + ' ' + day + ', ' + y; break;
      case 'day-month-year':  out = day + ' ' + shortMonth(d, locale) + ' ' + y; break;
      case 'auto':
      default:                out = autoFormat(d, lang, locale); break;
    }
    return maybeWrapLtr(out, formatKey, lang);
  }

  return {
    format: format,
    parseLocal: parseLocal,
    todayLocalISO: todayLocalISO,
    getPreference: getPreference,
    isolate: isolate
  };
})();
