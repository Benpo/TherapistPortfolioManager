#!/usr/bin/env node
/**
 * docs-gate.js — the one shared, fail-closed docs-rot gate.
 *
 * A single implementation invoked by both callers: the local pre-push shim and the
 * CI deploy step each run `node scripts/docs-gate.js --range <A..B>`. Exit 0 means the
 * push is allowed; any non-zero exit blocks it with a human-readable reason.
 *
 * Two phases, in order:
 *
 *   PHASE 1 — invariants first. Run the four file-on-disk checks from
 *   scripts/lib/invariants.js against THIS repository (the repo the gate ships in,
 *   which in the hook and in CI is exactly the repo being pushed). Any breach fails
 *   closed before the range is ever inspected, so CI gets the structural checks for
 *   free. The invariants validate a full, real corpus (HELP-MAP.md, the denylist
 *   files, the changelog schema) — they are not meaningful against a synthetic
 *   fixture, so they always target this install's own repo, never the range target.
 *
 *   PHASE 2 — the push-range rule. Resolve the TARGET repo root from the current
 *   working directory (git rev-parse --show-toplevel) and read that repo's assets/,
 *   help corpus, and changelog. Classify every path changed in the range, then demand
 *   a changelog edit and per-file help coverage for each user-facing change, honouring
 *   the three trailers. This is what lets the gate judge the hook's repo, CI's checkout,
 *   or a throwaway fixture repo identically — it reads the repo it was invoked in.
 *
 * Trailers are read with git's own %(trailers:…) parser (block-scoped), never a body
 * regex — a trailer-looking line pasted inside a fenced code block must not satisfy the
 * gate. Any thrown/parse error fails closed (exit 1) with a clean one-line reason.
 *
 * Node built-ins + in-repo siblings only. No packages.
 */

'use strict';

var path = require('path');
var execFileSync = require('child_process').execFileSync;

var invariants = require('./lib/invariants.js');
var roleTable = require('./lib/role-table.js');
var helpLoader = require('./lib/help-loader.js');

// ── Small output helpers ─────────────────────────────────────────────────────
function errln(s) { process.stderr.write(s + '\n'); }
function outln(s) { process.stdout.write(s + '\n'); }
var BAR = '============================================================';

// ── git plumbing (all failures are tolerated and surfaced as empty/null) ──────
// Every call runs against the TARGET repo (cwd). We never shell out with a body
// regex for trailers — only git's %(trailers:…) block-scoped parser.
function gitTry(args) {
  try {
    return execFileSync('git', args, { cwd: process.cwd(), stdio: 'pipe' }).toString();
  } catch (e) {
    return null;
  }
}

// Files changed across the range as a whole (net diff, no per-commit ordering).
function changedPathsInRange(range) {
  var out = gitTry(['diff', '--name-only', range]);
  if (out == null) throw new Error('could not compute the changed paths for range ' + range);
  return out.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
}

// Resolve the two endpoints of an A..B range. Tip defaults to HEAD.
function parseRange(range) {
  var idx = range.indexOf('..');
  if (idx === -1) return { base: range, tip: 'HEAD' };
  var base = range.slice(0, idx);
  var tip = range.slice(idx + 2) || 'HEAD';
  return { base: base, tip: tip };
}

// Extract the values of trailers whose key EXACTLY matches `key` (case-sensitive)
// from a `%(trailers:key=…,only,unfold)` blob. git's own key matcher is
// case-INSENSITIVE, so we emit the key as-written (not valueonly) and post-filter
// here — this makes CLAUDE.md's "exact casing (case-sensitive)" contract true
// (WR-03). `unfold` collapses a folded multi-line value to one physical line, so a
// correctly-authored multi-file trailer arrives whole (WR-04). Each output line is
// "Key: value"; we split on the FIRST colon so a value may itself contain colons.
function exactCaseTrailerValues(out, key) {
  if (out == null) return [];
  var values = [];
  out.split('\n').forEach(function (line) {
    if (!line) return;
    var idx = line.indexOf(':');
    if (idx === -1) return;
    var k = line.slice(0, idx).trim();
    if (k !== key) return;                 // exact-case match only (WR-03)
    values.push(line.slice(idx + 1).trim());
  });
  return values;
}

// Read a single trailer key over the WHOLE range (honoured from any commit — the
// *-Unaffected trailers are file-scoped so an inherited one is harmless). Returns
// an array of exact-case, unfolded trailer values (one per commit that carried it).
function trailerValuesOverRange(range, key) {
  var out = gitTry(['log', range, '--format=%(trailers:key=' + key + ',only,unfold)']);
  return exactCaseTrailerValues(out, key);
}

// Read one trailer key from a single commit. Returns the first exact-case value or ''.
function trailerValueForCommit(ref, key) {
  var out = gitTry(['log', '-1', ref, '--format=%(trailers:key=' + key + ',only,unfold)']);
  var values = exactCaseTrailerValues(out, key);
  return values.length ? values[0] : '';
}

function shortSha(ref) {
  var out = gitTry(['rev-parse', '--short', ref]);
  return out == null ? ref : out.trim();
}
function fullSha(ref) {
  var out = gitTry(['rev-parse', ref]);
  return out == null ? ref : out.trim();
}

// Extract the APP_VERSION semver literal from a version.js source blob.
function extractAppVersion(src) {
  if (!src) return null;
  var m = /APP_VERSION\s*[:=]\s*['"](\d+\.\d+\.\d+)['"]/.exec(src);
  return m ? m[1] : null;
}

// ── Trailer parsing (D-14) ───────────────────────────────────────────────────
// A *-Unaffected trailer value is "<path>[, <path>…] — <reason>". Split on the
// first em-dash (—) or double-hyphen (--) surrounded by whitespace into paths and
// reason; the reason MUST be non-empty. Brace-expansion is unsupported (write the
// paths out). Returns { paths:[…], reason:'…' } or { malformed:true, raw }.
function parseUnaffected(value) {
  var sepMatch = /\s+(?:—|--)\s+/.exec(value);
  if (!sepMatch) {
    // No reason separator at all — but a bare reason with no file list is how the
    // GLOBAL changelog waiver is written ("no user-visible change"). The caller
    // decides whether a fileless value is acceptable (changelog yes, help no).
    return { paths: [], reason: value.trim(), malformed: false, hadSeparator: false };
  }
  var left = value.slice(0, sepMatch.index);
  var reason = value.slice(sepMatch.index + sepMatch[0].length).trim();
  var paths = left.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  if (!reason) return { malformed: true, raw: value };
  return { paths: paths, reason: reason, malformed: false, hadSeparator: true };
}

// Build the covers[] reverse index from the TARGET repo's EN help corpus:
// normalized repo-relative path → [{ id, title }] of the topic(s) that claim it.
// Read via the raw loadWindow so only HELP_CONTENT_EN is required — the reverse
// index needs the sections + covers[] only, never the deeplink table, so the gate
// judges any corpus that declares its sections (hook, CI, or fixture) identically.
function buildCoversIndex(targetAssetsDir) {
  var win = helpLoader.loadWindow(targetAssetsDir, ['i18n-en.js', 'help-content-en.js']);
  var sections = win.HELP_CONTENT_EN;
  if (!Array.isArray(sections)) {
    throw new Error('window.HELP_CONTENT_EN is not an array after loading help-content-en.js');
  }
  var index = {};
  for (var s = 0; s < sections.length; s++) {
    var topics = sections[s].topics || [];
    for (var t = 0; t < topics.length; t++) {
      var covers = topics[t].covers || [];
      for (var c = 0; c < covers.length; c++) {
        var key = normalize(covers[c]);
        (index[key] = index[key] || []).push({ id: topics[t].id, title: topics[t].title });
      }
    }
  }
  return index;
}

function normalize(p) {
  return String(p).replace(/\\/g, '/').replace(/^\.\//, '');
}

// ── PHASE 1: invariants (against this install's own repo) ─────────────────────
function runInvariants() {
  try {
    invariants.checkHelpMapFresh();
    invariants.checkCoversExist();
    invariants.checkChangelogSchema();
    invariants.checkRoleTable();
  } catch (e) {
    errln(BAR);
    errln('  DOCS GATE BLOCKED — a docs invariant is broken');
    errln('  ' + ((e && e.message) || e));
    errln(BAR);
    process.exit(1);
  }
}

// ── PHASE 2: the push-range rule (against the target repo) ────────────────────
function runRangeRule(range) {
  var ends = parseRange(range);
  var tipSha = fullSha(ends.tip);

  var targetRoot = (gitTry(['rev-parse', '--show-toplevel']) || process.cwd()).trim();
  var targetAssets = path.join(targetRoot, 'assets');

  var changed = changedPathsInRange(range);
  var changedSet = {};
  changed.forEach(function (p) { changedSet[normalize(p)] = true; });

  // Classify. Only 'trigger' paths raise a demand.
  var triggers = changed.filter(function (p) { return roleTable.classify(p) === 'trigger'; })
                        .map(normalize);
  // Satisfaction reuses role-table's SINGLE, assets/-anchored definition (WR-01 /
  // D-17): a non-assets/ path with a satisfier basename never counts as "the help /
  // changelog was edited". The gate keeps no second, unanchored regex of its own.
  var helpEdited = changed.some(function (p) { return roleTable.isHelpSatisfier(normalize(p)); });
  var changelogEdited = changed.some(function (p) { return roleTable.isChangelogSatisfier(normalize(p)); });

  // ── EMERGENCY: Docs-Emergency-Skip is honoured ONLY on the range tip (OD-4). ──
  // This is a PASS verdict (exit 0), so the banner goes to stdout — a caller that
  // captures only a successful run's stdout must still see the loud bypass notice.
  var tipSkip = trailerValueForCommit(ends.tip, 'Docs-Emergency-Skip');
  if (tipSkip) {
    outln(BAR);
    outln('  DOCS-EMERGENCY-SKIP HONORED — docs gate bypassed');
    outln('  commit:  ' + shortSha(ends.tip));
    outln('  reason:  ' + tipSkip);
    outln('  skipped watched files:');
    if (triggers.length) triggers.forEach(function (f) { outln('    - ' + f); });
    else outln('    (no watched files changed in this range)');
    outln(BAR);
    process.exit(0);
  }

  // An emergency skip pulled in from an EARLIER (non-tip) commit is ignored and
  // reported (OD-4): a hotfix's skip must never leak onto later merged-in work.
  var inheritedNotes = [];
  var revs = (gitTry(['rev-list', range]) || '').split('\n')
              .map(function (s) { return s.trim(); }).filter(Boolean);
  for (var i = 0; i < revs.length; i++) {
    if (revs[i] === tipSha) continue;
    var v = trailerValueForCommit(revs[i], 'Docs-Emergency-Skip');
    if (v) {
      inheritedNotes.push(
        'ignored an inherited Docs-Emergency-Skip from ' + shortSha(revs[i]) +
        ' ("' + v + '"); emergency skips are honored only on the tip commit of the range');
    }
  }

  // ── Trailer maps over the whole range (file-scoped, any commit). ──────────────
  var helpUnaffected = {};   // normalized path → reason
  var malformedHelp = [];    // raw values of Help-Unaffected trailers missing a reason
  var staleWarnings = [];
  var helpValues = trailerValuesOverRange(range, 'Help-Unaffected');
  helpValues.forEach(function (val) {
    var parsed = parseUnaffected(val);
    if (parsed.malformed || (!parsed.hadSeparator)) {
      // Help demands are per-file, so a Help-Unaffected trailer MUST name files and
      // a reason. A fileless or reasonless value is malformed.
      malformedHelp.push(val);
      return;
    }
    parsed.paths.forEach(function (p) {
      var np = normalize(p);
      helpUnaffected[np] = parsed.reason;
      if (!changedSet[np]) {
        staleWarnings.push('Help-Unaffected names ' + np +
          ', but it did not change in this range (stale declaration).');
      }
    });
  });

  // Changelog waiver is GLOBAL (one changelog for the app): any non-empty
  // Changelog-Unaffected trailer waives the changelog demand for the whole push.
  var changelogValues = trailerValuesOverRange(range, 'Changelog-Unaffected');
  var changelogWaived = changelogValues.some(function (v) { return v && v.trim(); });

  // ── Release moment (GATE-04): did APP_VERSION change across the range? ────────
  var oldVer = extractAppVersion(gitTry(['show', ends.base + ':assets/version.js']));
  var newVer = extractAppVersion(gitTry(['show', ends.tip + ':assets/version.js']));
  var versionChanged = oldVer && newVer && oldVer !== newVer;

  // ── Collect blocking reasons ─────────────────────────────────────────────────
  var blocks = [];

  // Malformed Help-Unaffected trailers.
  malformedHelp.forEach(function (raw) {
    blocks.push('Malformed Help-Unaffected trailer (missing a reason): "' + raw + '"\n' +
      '      A Help-Unaffected trailer must name files then a non-empty reason:\n' +
      '        Help-Unaffected: <file>[, <file>…] — <reason>');
  });

  // CHANGELOG demand (D-08): any watched trigger requires a changelog edit or waiver.
  if (triggers.length && !changelogEdited && !changelogWaived) {
    blocks.push('Changelog: these user-facing files changed but no changelog entry was added:\n' +
      triggers.map(function (f) { return '        - ' + f; }).join('\n') + '\n' +
      '      Edit assets/changelog-content-en.js, or add a trailer:\n' +
      '        Changelog-Unaffected: <reason>');
  }

  // RELEASE moment (GATE-04): a version bump needs a matching, populated entry.
  if (versionChanged) {
    var relOk = false;
    try {
      var entries = helpLoader.loadChangelogEN(targetAssets);
      for (var e = 0; e < entries.length; e++) {
        if (entries[e] && entries[e].version === newVer) {
          var hl = entries[e].highlights;
          var dt = entries[e].date;
          if (Array.isArray(hl) && hl.length >= 1 &&
              typeof dt === 'string' && dt.trim().length > 0) {
            relOk = true;
          }
          break;
        }
      }
    } catch (relErr) {
      relOk = false;
    }
    if (!relOk) {
      blocks.push('Release: APP_VERSION is now ' + newVer + ' but assets/changelog-content-en.js\n' +
        '      has no entry for ' + newVer + ' with non-empty highlights and a date.');
    }
  }

  // HELP demand (D-11/D-12): per changed trigger file.
  var coversIndex;
  try {
    coversIndex = buildCoversIndex(targetAssets);
  } catch (idxErr) {
    // Cannot read the help corpus → fail closed rather than pass silently.
    throw new Error('could not read the help corpus to check coverage — ' +
      ((idxErr && idxErr.message) || idxErr));
  }

  triggers.forEach(function (file) {
    if (helpUnaffected.hasOwnProperty(file)) return;               // declared → satisfied
    var topics = coversIndex[file];
    if (topics && topics.length) {
      if (helpEdited) return;                                       // covered + help touched → satisfied
      var names = topics.map(function (tp) { return '"' + tp.id + '" (' + tp.title + ')'; }).join(', ');
      blocks.push('Help: ' + file + ' is documented by help topic ' + names + '\n' +
        '      but no help edit accompanies it. Edit that topic in assets/help-content-en.js,\n' +
        '      or add a trailer:\n' +
        '        Help-Unaffected: ' + file + ' — <reason>');
    } else {
      // Uncovered watched file (D-12 anti-rot): must be covered or explicitly declared.
      blocks.push('Help: ' + file + ' is watched but no help topic covers it.\n' +
        '      Add it to a topic\'s covers[] in assets/help-content-en.js, or declare:\n' +
        '        Help-Unaffected: ' + file + ' — <reason>');
    }
  });

  // ── Verdict ──────────────────────────────────────────────────────────────────
  if (blocks.length) {
    errln(BAR);
    errln('  DOCS GATE BLOCKED — user-facing changes need docs updates');
    errln('  range: ' + range);
    errln('');
    blocks.forEach(function (b) { errln('  • ' + b); errln(''); });
    if (staleWarnings.length) staleWarnings.forEach(function (w) { errln('  WARNING: ' + w); });
    if (inheritedNotes.length) inheritedNotes.forEach(function (n) { errln('  NOTE: ' + n); });
    errln('  Help-Unaffected: <files> — <reason>   waives the help demand for those files.');
    errln('  Changelog-Unaffected: <reason>        waives the changelog demand for this push.');
    errln(BAR);
    process.exit(1);
  }

  // Pass — surface any non-blocking notes/warnings so nothing is mysterious. This
  // is exit 0, so they go to stdout (a successful run's stderr may be discarded).
  if (staleWarnings.length) staleWarnings.forEach(function (w) { outln('  WARNING: ' + w); });
  if (inheritedNotes.length) inheritedNotes.forEach(function (n) { outln('  NOTE: ' + n); });
  outln('docs-gate OK — ' + range + ' (' + triggers.length + ' watched file(s), all covered)');
  process.exit(0);
}

// ── main ──────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  var range = 'origin/main..HEAD';
  for (var i = 0; i < argv.length; i++) {
    if (argv[i] === '--range' && argv[i + 1]) { range = argv[i + 1]; i++; }
  }
  return { range: range };
}

function main() {
  var args = parseArgs(process.argv.slice(2));
  // PHASE 1 — invariants first (fail closed inside).
  runInvariants();
  // PHASE 2 — the range rule. Any throw fails closed with a clean one-line reason
  // (never a raw stack, which would read as a crash rather than a verdict).
  try {
    runRangeRule(args.range);
  } catch (e) {
    errln(BAR);
    errln('  DOCS GATE BLOCKED — the gate could not complete (failing closed)');
    errln('  ' + ((e && e.message) || e));
    errln(BAR);
    process.exit(1);
  }
}

main();
