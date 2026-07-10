/**
 * role-table.js — the written, checkable definition of a "user-facing change".
 *
 * This module is the single source of truth the docs gate consults to decide, for
 * every path in a push, whether that change RAISES a demand for a changelog/help
 * update, SATISFIES one, is a deliberately carved-out surface, or is irrelevant.
 *
 * ── What counts as user-facing (the written definition) ──────────────────────
 * A path is WATCHED (user-facing) only if it passes BOTH of two independent tests.
 * Passing one is not enough — that distinction is load-bearing, see the note below.
 *
 *   1. SHIPPED-PATH test — the file is one the deploy step actually publishes:
 *        • a root-level *.html page (no directory in its path), OR
 *        • any path under assets/, OR
 *        • one of the two root singletons manifest.json / sw.js.
 *   2. CODE-EXTENSION test — the file is code the browser executes or styles with:
 *        • a .js, .css, or .html file, OR
 *        • one of the two root singletons manifest.json / sw.js, watched by NAME
 *          regardless of extension (manifest.json is the one deliberate .json in).
 *
 * A watched file that is neither on the denylist nor a satisfier is a TRIGGER: a
 * user-facing change that must be accompanied by a help/changelog update.
 *
 * ── Why BOTH tests, and why the path test may never be dropped ────────────────
 * The repository holds well over a hundred .js files under tests/ and this gate's
 * own .js files under scripts/. An extension-only rule would classify every one of
 * them as a user-facing trigger, leaving each an uncovered file that blocks its own
 * push — and every push after. The shipped-path test is exactly what keeps the gate
 * from firing on its own tooling: neither tests/ nor scripts/ is ever deployed.
 *
 * ── Accepted limitation (stated plainly, by design) ──────────────────────────
 * Non-code shipped files are IGNORED entirely: images, fonts, icons, .txt, and
 * shipped .json data (e.g. assets/demo-seed-data.json) never raise a demand. That
 * means a purely visual change — swapping the logo, adding a new hero illustration,
 * replacing a font — ships with NO changelog entry and this gate stays silent. That
 * is the deliberate cost of watching code only; vendor bundles remain watched
 * because they are .js.
 *
 * ── Carve-outs ───────────────────────────────────────────────────────────────
 * DENYLIST: legal and marketing surfaces (each page together with its scripts and
 * stylesheets — a page, its script, and its style are one surface). Touching one
 * never demands a changelog entry.
 * SATISFIERS: the help-content and changelog-content data files. These SATISFY a
 * demand and never raise one of their own.
 *
 * Node built-ins only; pure predicates, no I/O.
 */

'use strict';

// The two root singletons that ship despite not being under assets/ and (for
// manifest.json) not carrying a code extension. Watched by exact name.
var ROOT_SINGLETONS = ['manifest.json', 'sw.js'];

// Legal + marketing surfaces carved out of the watch set. Each entry is a real
// shipped file (the self-consistency invariant asserts this on disk). A page, its
// script, and its stylesheet are treated as one surface: touching any of them is
// a marketing/legal edit, not a product change that needs a changelog line.
var DENYLIST = [
  // Legal pages (four language variants each).
  'impressum.html', 'impressum-en.html', 'impressum-he.html', 'impressum-cs.html',
  'datenschutz.html', 'datenschutz-en.html', 'datenschutz-he.html', 'datenschutz-cs.html',
  'disclaimer.html', 'disclaimer-en.html', 'disclaimer-he.html', 'disclaimer-cs.html',
  // Marketing pages.
  'landing.html', 'demo.html',
  // Their scripts (page + script = one surface).
  'assets/landing.js', 'assets/demo.js', 'assets/demo-seed.js',
  'assets/disclaimer.js', 'assets/i18n-disclaimer.js',
  // Their stylesheets (page + script + style = one surface).
  'assets/landing.css', 'assets/demo.css',
];

var DENYLIST_SET = new Set(DENYLIST);

// Satisfier data files: the help and changelog content, one per language. These
// carry the very updates the gate demands, so they satisfy — never trigger.
var SATISFIER_RE = /^assets\/(help|changelog)-content-(en|he|de|cs)\.js$/;

// Per-kind satisfier definitions, derived from the SAME assets/-anchored family as
// SATISFIER_RE. These are the SINGLE, anchored source of truth the docs gate reuses
// to decide "the help was edited" / "the changelog was edited" — so the gate never
// keeps a second, unanchored definition that could diverge (WR-01 / D-17).
var HELP_SATISFIER_RE = /^assets\/help-content-(en|he|de|cs)\.js$/;
var CHANGELOG_SATISFIER_RE = /^assets\/changelog-content-(en|he|de|cs)\.js$/;

// Normalize a repo-relative path to forward slashes with no leading "./" so the
// predicates compare cleanly regardless of how the caller spelled the path.
function normalize(p) {
  return String(p).replace(/\\/g, '/').replace(/^\.\//, '');
}

// SHIPPED-PATH test: exactly what the deploy step publishes.
function isShipped(p) {
  var path = normalize(p);
  if (ROOT_SINGLETONS.indexOf(path) !== -1) return true;
  if (path.indexOf('/') === -1 && /\.html$/.test(path)) return true; // root *.html
  if (path.indexOf('assets/') === 0) return true;                    // under assets/
  return false;
}

// CODE-EXTENSION test: browser code, plus the named singletons by name.
function isCodeExtension(p) {
  var path = normalize(p);
  if (ROOT_SINGLETONS.indexOf(path) !== -1) return true;
  return /\.(js|css|html)$/.test(path);
}

// WATCHED requires BOTH axes. Extension alone is not sufficient.
function isWatched(p) {
  return isShipped(p) && isCodeExtension(p);
}

function isDenylisted(p) {
  return DENYLIST_SET.has(normalize(p));
}

function isSatisfier(p) {
  return SATISFIER_RE.test(normalize(p));
}

// Per-kind, assets/-anchored satisfier predicates the docs gate consumes so that
// satisfaction detection stays singular and anchored. A non-assets/ path with a
// satisfier basename (e.g. tests/fixtures/help-content-en.js) is NOT a satisfier.
function isHelpSatisfier(p) {
  return HELP_SATISFIER_RE.test(normalize(p));
}
function isChangelogSatisfier(p) {
  return CHANGELOG_SATISFIER_RE.test(normalize(p));
}

// Single classification entry point. Denylist and satisfier carve-outs win over
// the watch test; anything not watched (or watched-but-carved-out is handled
// above) falls through to ignored.
function classify(p) {
  if (isDenylisted(p)) return 'denylisted';
  if (isSatisfier(p)) return 'satisfier';
  if (isWatched(p)) return 'trigger';
  return 'ignored';
}

module.exports = {
  DENYLIST: DENYLIST,
  ROOT_SINGLETONS: ROOT_SINGLETONS,
  isShipped: isShipped,
  isCodeExtension: isCodeExtension,
  isWatched: isWatched,
  isDenylisted: isDenylisted,
  isSatisfier: isSatisfier,
  isHelpSatisfier: isHelpSatisfier,
  isChangelogSatisfier: isChangelogSatisfier,
  classify: classify,
};
