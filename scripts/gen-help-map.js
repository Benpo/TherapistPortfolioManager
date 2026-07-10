#!/usr/bin/env node
/**
 * gen-help-map.js — generate (and freshness-check) HELP-MAP.md.
 *
 * HELP-MAP.md is a repo-root reverse index: one row per help topic naming the
 * repo files that topic covers. An agent reads it cold to answer "where does
 * this file belong in help?" without running anything. It is a live tooling
 * artifact (not planning history) and is NOT shipped — deploy copies only the
 * app pages/assets, never a repo-root .md.
 *
 * Input comes from the shared help loader (the SAME parsing substrate the
 * integrity guards and the docs gate use). The map string is built once by
 * buildMap(); the CLI runs it in one of two modes:
 *   - WRITE (default)  — write buildMap() to HELP-MAP.md.
 *   - CHECK (--check)  — regenerate to a string and === compare against the
 *                        committed HELP-MAP.md; on mismatch print how to fix
 *                        and exit non-zero.
 * checkMap() is exported for the CLI's own --check mode. The freshness invariant
 * shares the canonicalization SUBSTRATE — it calls buildMap() and does its own
 * read + === compare rather than calling checkMap() — so the two comparisons stay
 * in lockstep through buildMap(), the only piece that must not be duplicated.
 *
 * Canonicalization (so the freshness compare never flaps on cosmetic diffs):
 *   - LF line endings, exactly one trailing newline.
 *   - Sections and topics in DOCUMENT order (never re-sorted — order is meaningful).
 *   - covers[] SORTED within each row (a stable string sort).
 *
 * Node built-ins only (fs / path) + the shared loader.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const loader = require('./lib/help-loader.js');

// Repo root is one level up from scripts/. HELP-MAP.md lives at the root.
const REPO_ROOT = path.join(__dirname, '..');
const MAP_PATH = path.join(REPO_ROOT, 'HELP-MAP.md');

// Escape any character that would break a markdown table cell. None of the
// current corpus contains a pipe, but escaping keeps the map robust if a future
// title ever does.
function cell(value) {
  return String(value).replace(/\|/g, '\\|');
}

// Build the canonical HELP-MAP.md string from the EN help corpus.
// One row per topic: | Section | Topic | Title | Covers |. covers[] is sorted
// within each row; sections/topics keep their document order.
function buildMap(assetsDir) {
  const sections = loader.loadHelpContentEN(assetsDir);
  const lines = [];
  lines.push('| Section | Topic | Title | Covers |');
  lines.push('|---------|-------|-------|--------|');

  for (const section of sections) {
    for (const topic of section.topics || []) {
      const covers = (topic.covers || []).slice().sort();
      lines.push(
        '| ' +
          [
            cell(section.id),
            cell(topic.id),
            cell(topic.title),
            cell(covers.join(', ')),
          ].join(' | ') +
          ' |'
      );
    }
  }

  // Exactly one trailing newline, LF endings.
  return lines.join('\n') + '\n';
}

// Write the map to disk. Returns the string written.
function writeMap(assetsDir) {
  const out = buildMap(assetsDir);
  fs.writeFileSync(MAP_PATH, out, 'utf8');
  return out;
}

// Freshness check: regenerate to a string and === compare against the committed
// HELP-MAP.md. Returns { ok, expected, actual }. Never throws on mismatch — the
// caller decides how to react (the CLI exits non-zero; a test asserts .ok).
function checkMap(assetsDir) {
  const expected = buildMap(assetsDir);
  let actual = null;
  try {
    actual = fs.readFileSync(MAP_PATH, 'utf8');
  } catch (err) {
    return { ok: false, expected, actual: null, missing: true };
  }
  return { ok: actual === expected, expected, actual };
}

module.exports = { MAP_PATH, buildMap, writeMap, checkMap };

// CLI
if (require.main === module) {
  const check = process.argv.includes('--check');
  if (check) {
    const res = checkMap();
    if (res.ok) {
      console.log('HELP-MAP.md is fresh.');
      process.exit(0);
    }
    console.error(
      res.missing
        ? 'HELP-MAP.md is missing.'
        : 'HELP-MAP.md is stale (does not match a fresh regeneration).'
    );
    console.error('Run `node scripts/gen-help-map.js` and commit the result.');
    process.exit(1);
  }
  writeMap();
  console.log('Wrote ' + path.relative(REPO_ROOT, MAP_PATH) + '.');
}
