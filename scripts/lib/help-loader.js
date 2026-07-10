/**
 * Shared vm-sandbox loader for the help + changelog content corpus.
 *
 * The help/changelog content files (assets/help-content-en.js, assets/i18n-en.js,
 * assets/changelog-content-en.js) are browser scripts that register their data as
 * globals on `window` inside an IIFE. This module evaluates them in a fresh Node
 * `vm` sandbox with a fake `window` and a silenced `console`, then hands back the
 * global each file registered. It is the single parsing substrate shared by the
 * integrity guards, the docs gate, and any map generator — one implementation,
 * many callers.
 *
 * The assets directory is a parameter, not a constant. Callers pass the directory
 * they want inspected:
 *   - the real repo corpus (the default, resolved relative to this module),
 *   - a TARGET repo's assets resolved from a working directory / git root, or
 *   - a throwaway fixture directory in a behavior test.
 * Never assume the caller wants this module's own install directory.
 *
 * Fail closed: any evaluation error throws with a clear message naming the file.
 * A half-populated result is never returned silently.
 *
 * Node built-ins only (fs / path / vm). No jsdom.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Default corpus: the repo-root `assets/` directory, resolved relative to this
// module (scripts/lib/ → ../../assets). Callers override with an explicit dir.
const DEFAULT_ASSETS_DIR = path.join(__dirname, '..', '..', 'assets');

// Build a fresh sandbox with a fake window + silenced console + empty I18N/QUOTES
// registries, evaluate each file into it in order, and return sandbox.window.
// Throws on any read/eval failure (fail closed) naming the offending file.
function loadWindow(assetsDir, files) {
  const dir = assetsDir || DEFAULT_ASSETS_DIR;
  const sandbox = {
    window: {},
    console: { log() {}, warn() {}, error() {} },
  };
  sandbox.window.I18N = {};
  sandbox.window.QUOTES = {};
  vm.createContext(sandbox);

  for (const f of files) {
    const full = path.join(dir, f);
    let src;
    try {
      src = fs.readFileSync(full, 'utf8');
    } catch (err) {
      throw new Error(
        'help-loader: cannot read ' + full + ' — ' +
        ((err && err.message) || err)
      );
    }
    try {
      vm.runInContext(src, sandbox, { filename: 'assets/' + f });
    } catch (err) {
      throw new Error(
        'help-loader: assets/' + f + ' failed to evaluate in vm sandbox — ' +
        ((err && (err.stack || err.message)) || err)
      );
    }
  }
  return sandbox.window;
}

// Load the EN help bundle: i18n-en.js (provides window.I18N.en) then
// help-content-en.js (provides window.HELP_CONTENT_EN + window.HELP_DEEPLINKS).
// Returns { sections, deeplinks, i18n } so callers resolving {ui:key} tokens have
// the dictionary alongside the content. Fails closed if any global is malformed.
function loadHelpBundleEN(assetsDir) {
  const win = loadWindow(assetsDir, ['i18n-en.js', 'help-content-en.js']);
  const i18n = win.I18N && win.I18N.en;
  const sections = win.HELP_CONTENT_EN;
  const deeplinks = win.HELP_DEEPLINKS;

  if (!i18n || typeof i18n !== 'object') {
    throw new Error('help-loader: window.I18N.en is not an object after loading i18n-en.js');
  }
  if (!Array.isArray(sections)) {
    throw new Error('help-loader: window.HELP_CONTENT_EN is not an array after loading help-content-en.js');
  }
  if (!deeplinks || typeof deeplinks !== 'object') {
    throw new Error('help-loader: window.HELP_DEEPLINKS is not an object after loading help-content-en.js');
  }
  return { sections, deeplinks, i18n };
}

// Convenience: the EN help sections array (window.HELP_CONTENT_EN).
function loadHelpContentEN(assetsDir) {
  return loadHelpBundleEN(assetsDir).sections;
}

// Load the EN changelog array (window.CHANGELOG_CONTENT_EN). No i18n dependency.
function loadChangelogEN(assetsDir) {
  const win = loadWindow(assetsDir, ['changelog-content-en.js']);
  const entries = win.CHANGELOG_CONTENT_EN;
  if (!Array.isArray(entries)) {
    throw new Error('help-loader: window.CHANGELOG_CONTENT_EN is not an array after loading changelog-content-en.js');
  }
  return entries;
}

module.exports = {
  DEFAULT_ASSETS_DIR,
  loadWindow,
  loadHelpBundleEN,
  loadHelpContentEN,
  loadChangelogEN,
};
