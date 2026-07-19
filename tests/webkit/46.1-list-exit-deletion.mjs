/**
 * tests/webkit/46.1-list-exit-deletion.mjs — real-WebKit gate for the
 * PURE-DELETION class of editInsert edits (list exit on Enter, outdent).
 *
 * WHAT THIS IS
 *   An AD-HOC, MANUAL Playwright-WebKit probe for the one thing the jsdom suite
 *   can only EMULATE: the real engine's execCommand contract. Real engines
 *   treat `insertText` with an empty string as a no-op — some while still
 *   reporting success — so an insertText-only chokepoint silently loses every
 *   edit whose replacement is "" over a non-empty range. The user-visible
 *   symptom: pressing Enter on an empty list item can NEVER exit the list (the
 *   marker keeps coming back), and outdent does nothing.
 *
 *   ASSERTIONS (driven through a real note field on add-session.html with real
 *   keystrokes — page.keyboard — never synthetic value writes for the edits
 *   under test):
 *     A1. Typing "1. one" + Enter continues the list ("1. one\n2. " — the
 *         non-empty insertText path, a precondition sanity check).
 *     A2. Enter again on the now-empty item EXITS the list: the buffer holds
 *         exactly "1. one\n" — the marker is gone. THE bug assertion: RED on an
 *         insertText-only editInsert, GREEN when pure deletions ride
 *         execCommand('delete').
 *     A3. A third keystroke types PLAIN text ("1. one\nplain"), not a list item.
 *     B.  The toolbar outdent button on a nested list line removes one indent
 *         level (the same deletion class through the button dispatch path).
 *
 * HOW TO RUN (NOT part of npm test — tests/run-all.js only globs top-level
 *   tests/*.test.js, so this tests/webkit/*.mjs file is never discovered):
 *     node tests/webkit/46.1-list-exit-deletion.mjs
 *
 * DEPENDENCIES
 *   Playwright is NOT a package.json dependency and is NOT installed globally.
 *   This probe resolves it from the PINNED local install at
 *   /Users/ben/Claude-Code-Sandbox/TPM_Docs/video-pipeline/node_modules/playwright
 *   via createRequire (ESM ignores NODE_PATH, so the path is explicit). The
 *   WebKit binary is cached at ~/Library/Caches/ms-playwright. If it is stale:
 *     npx playwright install webkit
 *
 * EXIT CODE: 0 only if every assertion passes; non-zero on any failure.
 */

import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ── Resolve Playwright from the pinned local install ──────────────────────────────
const PINNED_PLAYWRIGHT =
  '/Users/ben/Claude-Code-Sandbox/TPM_Docs/video-pipeline/node_modules/playwright';

let webkit;
try {
  const require = createRequire(import.meta.url);
  const entry = require.resolve(PINNED_PLAYWRIGHT);
  const pw = await import(entry);
  webkit = (pw.webkit || (pw.default && pw.default.webkit));
  if (!webkit) throw new Error('playwright module resolved but has no `webkit` export');
} catch (err) {
  console.error('\n[46.1-list-exit-deletion] FATAL: could not load Playwright WebKit.');
  console.error('  Expected the pinned local install at:');
  console.error('    ' + PINNED_PLAYWRIGHT);
  console.error('  There is NO global playwright — do not add one.');
  console.error('  If the path is present but the WebKit binary is stale, run:');
  console.error('    npx playwright install webkit');
  console.error('  Underlying error: ' + (err && err.message ? err.message : err));
  process.exit(2);
}

// ── Repo root (two levels up from tests/webkit/) ──────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

// ── Tiny static file server (file:// would break relative loads + storage) ────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json'
};

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      try {
        let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
        if (urlPath === '/' || urlPath === '') urlPath = '/index.html';
        const filePath = path.join(REPO_ROOT, urlPath);
        if (filePath !== REPO_ROOT && !filePath.startsWith(REPO_ROOT + path.sep)) {
          res.writeHead(403); res.end('forbidden'); return;
        }
        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
          res.writeHead(404); res.end('not found'); return;
        }
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        fs.createReadStream(filePath).pipe(res);
      } catch (e) {
        res.writeHead(500); res.end('error: ' + (e && e.message));
      }
    });
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, base: `http://127.0.0.1:${port}` });
    });
  });
}

// ── Assertion accounting ──────────────────────────────────────────────────────────
let failures = 0;
function assert(cond, label, detail) {
  if (cond) {
    console.log('  PASS  ' + label);
  } else {
    failures++;
    console.log('  FAIL  ' + label + (detail != null ? ('  → ' + detail) : ''));
  }
}

// The field under test: a real registered note field (the shared focus-attached
// bar docks `beforebegin` it on focus). #sessionComments deliberately — the
// expandable emotion fields (e.g. #trappedEmotions) sit inside a closed
// <details>, which WebKit refuses to move focus into, so they cannot take real
// keystrokes without an extra expand step this probe does not need.
const FIELD = '#sessionComments';

async function newGatedContext(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 820 } });
  await context.addInitScript(() => {
    try {
      localStorage.setItem('portfolioLicenseActivated', '1');
      localStorage.setItem('portfolioLicenseInstance', 'webkit-probe');
      localStorage.setItem('portfolioTermsAccepted', '1');
      localStorage.setItem('sg.welcomeSeen', '1');
      localStorage.setItem('portfolioLang', 'en');
      // Suppress the what's-new overlay so it never sits over the field/toolbar
      // and swallows the real keystrokes/mousedowns this probe drives.
      localStorage.setItem('sg.whatsNewLastSeenVersion', '1.4.0');
      var css = '.whats-new-overlay,.whats-new-popup{display:none !important;pointer-events:none !important;}';
      var apply = function () {
        var s = document.createElement('style');
        s.textContent = css;
        (document.head || document.documentElement).appendChild(s);
      };
      if (document.documentElement) apply();
      else document.addEventListener('DOMContentLoaded', apply);
    } catch (e) {}
  });
  return context;
}

async function main() {
  const { server, base } = await startServer();
  const browser = await webkit.launch();
  let exitCode = 0;

  try {
    const ctx = await newGatedContext(browser);
    const page = await ctx.newPage();
    await page.goto(base + '/add-session.html', { waitUntil: 'load' });
    // Boot is async (IndexedDB) and ends by focusing #sessionDate on a new
    // session; wait for that landmark so a focus taken EARLIER is not stolen
    // back mid-test.
    await page.waitForFunction(
      () => document.activeElement && document.activeElement.id === 'sessionDate',
      null, { timeout: 15000 }
    );

    console.log('\n[list exit via real keystrokes]');

    // A1 — type a list and continue it (non-empty insertText path sanity).
    // Focus via the DOM (a real focus() fires real focusin, docking the bar) —
    // page.click's actionability check trips over the page's decorative
    // overlays and is not what is under test here.
    await page.evaluate((sel) => {
      const ta = document.querySelector(sel);
      ta.scrollIntoView({ block: 'center' });
      ta.focus();
    }, FIELD);
    const active = await page.evaluate(() => document.activeElement && document.activeElement.id);
    assert(active === FIELD.slice(1),
      'A0 precondition: the note field took focus',
      'activeElement=' + active);
    await page.keyboard.type('1. one');
    await page.keyboard.press('Enter');
    let value = await page.$eval(FIELD, (el) => el.value);
    assert(value === '1. one\n2. ',
      'A1 Enter on a non-empty item continues the list',
      JSON.stringify(value));

    // A2 — Enter on the now-empty item EXITS the list (the pure deletion).
    await page.keyboard.press('Enter');
    value = await page.$eval(FIELD, (el) => el.value);
    assert(value === '1. one\n',
      'A2 Enter on the empty item removes the marker (list exit lands in a real engine)',
      JSON.stringify(value));

    // A3 — the next keystrokes are plain text, not a list item.
    await page.keyboard.type('plain');
    value = await page.$eval(FIELD, (el) => el.value);
    assert(value === '1. one\nplain',
      'A3 after the exit the next keystroke types plain text',
      JSON.stringify(value));

    console.log('\n[outdent button on a nested list line]');

    // B — seed a nested list, then outdent the nested line via the toolbar
    // button (real mousedown — the toolbar binds mousedown, not click).
    const seeded = await page.evaluate((sel) => {
      const ta = document.querySelector(sel);
      ta.value = '- top\n  - nested';
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      ta.focus();
      ta.setSelectionRange(ta.value.length, ta.value.length);
      const bar = ta.previousElementSibling;
      if (!bar || !bar.classList.contains('rich-toolbar')) return { ok: false };
      const btn = bar.querySelector('.rich-toolbar-btn[data-action="outdent"]');
      if (!btn) return { ok: false };
      btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
      return { ok: true };
    }, FIELD);
    assert(seeded.ok, 'B precondition: the shared bar + outdent button resolved');
    await page.waitForTimeout(100);
    value = await page.$eval(FIELD, (el) => el.value);
    assert(value === '- top\n- nested',
      'B the outdent button removes one indent level (pure deletion through the button path)',
      JSON.stringify(value));

    await ctx.close();

    console.log('');
    if (failures === 0) {
      console.log('ALL ASSERTIONS PASSED — list-exit deletion gate GREEN.');
    } else {
      console.log(failures + ' ASSERTION(S) FAILED — list-exit deletion gate RED.');
      exitCode = 1;
    }
  } catch (err) {
    console.error('\n[46.1-list-exit-deletion] ERROR during probe: ' + (err && err.stack ? err.stack : err));
    exitCode = 1;
  } finally {
    await browser.close();
    server.close();
  }

  process.exit(exitCode);
}

main();
