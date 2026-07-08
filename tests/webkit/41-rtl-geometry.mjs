/**
 * tests/webkit/41-rtl-geometry.mjs — Phase 41 D-14 WebKit RTL/geometry gate.
 *
 * WHAT THIS IS
 *   An AD-HOC, MANUAL Playwright-WebKit probe for the two things the jsdom suite
 *   structurally CANNOT verify (no layout engine + offsetParent hardcoded null):
 *     (1) TOUR-02 SPOTLIGHT-BRANCH selection (architect-gate A5) — with a
 *         present+visible anchor, render() must pick the spotlight ring + tethered
 *         tooltip, NOT the centered fallback modal. jsdom always takes the fallback
 *         branch because offsetParent === null for every element, so the spotlight
 *         branch is only reachable in a real layout engine (this probe).
 *     (2) TOUR-04 RTL arrow-flip + on-anchor tooltip/spotlight geometry, plus a
 *         clean EN→HE→DE→CS mid-tour re-render (Pitfall 2 + Pitfall 5).
 *
 * HOW TO RUN (NOT part of npm test — the runner tests/run-all.js only globs
 *   top-level tests/*.test.js, so this tests/webkit/*.mjs file is never discovered):
 *     node tests/webkit/41-rtl-geometry.mjs
 *
 * DEPENDENCIES
 *   Playwright is NOT a package.json dependency and is NOT installed globally
 *   (architect-gate A6). This probe resolves it from the PINNED local install at
 *   /Users/ben/Claude-Code-Sandbox/TPM_Docs/video-pipeline/node_modules/playwright
 *   (v1.61.1) via createRequire (ESM ignores NODE_PATH, so the path is explicit).
 *   The WebKit browser binary is cached at ~/Library/Caches/ms-playwright
 *   (webkit-2311 / webkit-2248). If the binary is stale run:
 *     npx playwright install webkit
 *
 * EXIT CODE: 0 only if every assertion passes; non-zero on any failure.
 */

import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ── Resolve Playwright from the pinned local install (architect-gate A6) ──────────
const PINNED_PLAYWRIGHT =
  '/Users/ben/Claude-Code-Sandbox/TPM_Docs/video-pipeline/node_modules/playwright';

let webkit;
try {
  const require = createRequire(import.meta.url);
  // Resolve the pinned package entry, then dynamic-import it as ESM.
  const entry = require.resolve(PINNED_PLAYWRIGHT);
  const pw = await import(entry);
  webkit = (pw.webkit || (pw.default && pw.default.webkit));
  if (!webkit) throw new Error('playwright module resolved but has no `webkit` export');
} catch (err) {
  console.error('\n[41-rtl-geometry] FATAL: could not load Playwright WebKit.');
  console.error('  Expected the pinned local install at:');
  console.error('    ' + PINNED_PLAYWRIGHT);
  console.error('  There is NO global playwright (architect-gate A6) — do not add one.');
  console.error('  If the path is present but the WebKit binary is stale, run:');
  console.error('    npx playwright install webkit');
  console.error('  Underlying error: ' + (err && err.message ? err.message : err));
  process.exit(2);
}

// ── Repo root (two levels up from tests/webkit/) ──────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

// ── Tiny static file server so tour.js/tour.css/i18n load exactly as shipped
//    (file:// would break relative script loads + storage origin) ─────────────────
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
        // Prevent path traversal: resolve within REPO_ROOT.
        const filePath = path.join(REPO_ROOT, urlPath);
        if (!filePath.startsWith(REPO_ROOT)) { res.writeHead(403); res.end('forbidden'); return; }
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

function overlaps(a, b) {
  return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
}

async function main() {
  const { server, base } = await startServer();
  const browser = await webkit.launch();
  let exitCode = 0;

  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();

    // Satisfy the app-shell license/terms gates (index.html redirects to
    // landing.html / disclaimer / license otherwise), suppress the first-run
    // welcome overlay, and pin EN so we drive the tour directly. addInitScript
    // runs BEFORE the page's gate scripts on every navigation.
    await page.addInitScript(() => {
      try {
        localStorage.setItem('portfolioLicenseActivated', '1');
        localStorage.setItem('portfolioLicenseInstance', 'webkit-probe');
        localStorage.setItem('portfolioTermsAccepted', '1');
        localStorage.setItem('sg.welcomeSeen', '1');
        localStorage.setItem('portfolioLang', 'en');
      } catch (e) {}
    });

    await page.goto(base + '/index.html', { waitUntil: 'load' });

    // Wait for the engine + the step-1 anchor to be present in real layout.
    await page.waitForFunction(
      () => window.Tour && typeof window.Tour.start === 'function' &&
            document.querySelector('[data-tour="overview"]') !== null,
      { timeout: 10000 }
    );

    // ── (1) SPOTLIGHT-BRANCH assertion (architect-gate A5) ─────────────────────────
    console.log('\n[1] Spotlight-branch selection (present+visible anchor):');
    await page.evaluate(() => window.Tour.start());
    await page.waitForSelector('.sg-tour-tooltip', { timeout: 5000 });

    const branch = await page.evaluate(() => {
      const spotlight = document.querySelector('.sg-tour-spotlight');
      const tooltip = document.querySelector('.sg-tour-tooltip');
      // Fallback branch mounts a centered scrim + fallback card; must be absent.
      const scrim = document.querySelector('.sg-tour-modal-scrim');
      const fallbackCard = document.querySelector('.sg-tour-fallback-card');
      return {
        hasSpotlight: !!spotlight,
        hasTooltip: !!tooltip,
        hasScrim: !!scrim,
        hasFallbackCard: !!fallbackCard,
        isBottomSheet: tooltip ? tooltip.classList.contains('sg-tour-bottom-sheet') : null
      };
    });
    assert(branch.hasSpotlight, 'spotlight ring is mounted', JSON.stringify(branch));
    assert(branch.hasTooltip, 'tethered tooltip is mounted', JSON.stringify(branch));
    assert(!branch.hasFallbackCard && !branch.hasScrim,
      'centered fallback modal is ABSENT (spotlight branch, not fallback)', JSON.stringify(branch));
    assert(branch.isBottomSheet === false,
      'desktop viewport → tethered tooltip (not bottom-sheet)', JSON.stringify(branch));

    // ── (2) GEOMETRY: spotlight overlaps anchor; tooltip inside viewport ───────────
    console.log('\n[2] On-anchor geometry (real WebKit layout):');
    const geom = await page.evaluate(() => {
      const anchor = document.querySelector('[data-tour="overview"]');
      const spotlight = document.querySelector('.sg-tour-spotlight');
      const tooltip = document.querySelector('.sg-tour-tooltip');
      const r = (el) => { const b = el.getBoundingClientRect(); return { left: b.left, top: b.top, right: b.right, bottom: b.bottom, width: b.width, height: b.height }; };
      return {
        anchor: r(anchor),
        spotlight: r(spotlight),
        tooltip: r(tooltip),
        vw: window.innerWidth,
        vh: window.innerHeight
      };
    });
    assert(overlaps(geom.spotlight, geom.anchor),
      'spotlight rect overlaps the anchor rect',
      'spotlight=' + JSON.stringify(geom.spotlight) + ' anchor=' + JSON.stringify(geom.anchor));
    const tt = geom.tooltip;
    const inViewport = tt.left >= -0.5 && tt.top >= -0.5 &&
      tt.right <= geom.vw + 0.5 && tt.bottom <= geom.vh + 0.5;
    assert(inViewport, 'tooltip is fully inside the viewport (no overflow)',
      'tooltip=' + JSON.stringify(tt) + ' vw=' + geom.vw + ' vh=' + geom.vh);

    // Capture the EN arrow physical position (offset from the tooltip's LEFT edge).
    const enArrow = await page.evaluate(() => {
      const tooltip = document.querySelector('.sg-tour-tooltip');
      const arrow = document.querySelector('.sg-tour-arrow');
      if (!tooltip || !arrow) return null;
      const t = tooltip.getBoundingClientRect();
      const a = arrow.getBoundingClientRect();
      const arrowCenter = a.left + a.width / 2;
      return {
        dir: document.documentElement.getAttribute('dir'),
        dataArrow: tooltip.getAttribute('data-arrow'),
        offsetFromLeft: arrowCenter - t.left,
        tooltipWidth: t.width
      };
    });
    assert(enArrow && enArrow.dir === 'ltr', 'EN document direction is ltr',
      JSON.stringify(enArrow));
    assert(enArrow && (enArrow.dataArrow === 'top' || enArrow.dataArrow === 'bottom'),
      'EN tooltip has a directional arrow (top/bottom)', JSON.stringify(enArrow));

    // ── (3) RTL: Hebrew re-render + real arrow-side FLIP + no overflow ─────────────
    console.log('\n[3] RTL (Hebrew) arrow-flip + clean re-render:');
    await page.evaluate(() => {
      if (window.App && typeof window.App.setLanguage === 'function') window.App.setLanguage('he');
      else {
        localStorage.setItem('portfolioLang', 'he');
        document.documentElement.setAttribute('dir', 'rtl');
        document.dispatchEvent(new CustomEvent('app:language', { detail: { lang: 'he' } }));
      }
    });
    // Re-render is cleanup-then-replace; wait for a fresh tooltip in rtl.
    await page.waitForFunction(
      () => document.documentElement.getAttribute('dir') === 'rtl' &&
            document.querySelector('.sg-tour-tooltip') !== null,
      { timeout: 5000 }
    );

    const heArrow = await page.evaluate(() => {
      const tooltip = document.querySelector('.sg-tour-tooltip');
      const arrow = document.querySelector('.sg-tour-arrow');
      if (!tooltip || !arrow) return null;
      const t = tooltip.getBoundingClientRect();
      const a = arrow.getBoundingClientRect();
      const arrowCenter = a.left + a.width / 2;
      return {
        dir: document.documentElement.getAttribute('dir'),
        dataArrow: tooltip.getAttribute('data-arrow'),
        offsetFromLeft: arrowCenter - t.left,
        tooltipWidth: t.width,
        left: t.left, top: t.top, right: t.right, bottom: t.bottom
      };
    });
    const vp = await page.evaluate(() => ({ vw: window.innerWidth, vh: window.innerHeight }));

    assert(heArrow && heArrow.dir === 'rtl', 'HE document direction is rtl', JSON.stringify(heArrow));
    assert(!!heArrow, 'HE tour re-rendered (tooltip + arrow present)', JSON.stringify(heArrow));

    // Real flip: the arrow's physical offset from the tooltip's left edge must move
    // to (roughly) the mirror side. inset-inline-start maps to left in LTR and right
    // in RTL, so with the same --arrow-x the physical position flips across the
    // tooltip mid-line. We assert the two offsets land on OPPOSITE sides of center.
    if (enArrow && heArrow) {
      const enSide = enArrow.offsetFromLeft - enArrow.tooltipWidth / 2; // <0 = left half
      const heSide = heArrow.offsetFromLeft - heArrow.tooltipWidth / 2;
      const flipped = Math.sign(enSide) !== Math.sign(heSide) &&
        Math.abs(enArrow.offsetFromLeft - heArrow.offsetFromLeft) > 20;
      assert(flipped,
        'RTL flips the arrow to the mirrored side (not just direction:rtl)',
        'EN offsetFromLeft=' + enArrow.offsetFromLeft.toFixed(1) +
        ' HE offsetFromLeft=' + heArrow.offsetFromLeft.toFixed(1) +
        ' tooltipW=' + heArrow.tooltipWidth.toFixed(1));
    } else {
      assert(false, 'RTL arrow-flip measurable', 'missing arrow measurement');
    }

    const heInViewport = heArrow && heArrow.left >= -0.5 && heArrow.top >= -0.5 &&
      heArrow.right <= vp.vw + 0.5 && heArrow.bottom <= vp.vh + 0.5;
    assert(heInViewport, 'HE tooltip stays inside the viewport (no RTL overflow)',
      'tooltip=' + JSON.stringify(heArrow) + ' vp=' + JSON.stringify(vp));

    // ── Clean re-render across all four languages (Pitfall 2) ──────────────────────
    console.log('\n[4] Clean re-render EN→HE→DE→CS:');
    for (const lang of ['en', 'he', 'de', 'cs']) {
      await page.evaluate((l) => {
        if (window.App && typeof window.App.setLanguage === 'function') window.App.setLanguage(l);
        else {
          localStorage.setItem('portfolioLang', l);
          document.documentElement.setAttribute('dir', l === 'he' ? 'rtl' : 'ltr');
          document.dispatchEvent(new CustomEvent('app:language', { detail: { lang: l } }));
        }
      }, lang);
      await page.waitForSelector('.sg-tour-tooltip', { timeout: 5000 });
      const state = await page.evaluate(() => {
        const tooltips = document.querySelectorAll('.sg-tour-tooltip');
        const tooltip = tooltips[tooltips.length - 1];
        const t = tooltip.getBoundingClientRect();
        const title = tooltip.querySelector('.sg-tour-title');
        return {
          count: tooltips.length,
          hasText: !!(title && title.textContent && title.textContent.trim().length),
          inViewport: t.left >= -0.5 && t.top >= -0.5 &&
            t.right <= window.innerWidth + 0.5 && t.bottom <= window.innerHeight + 0.5,
          rect: { left: t.left, top: t.top, right: t.right, bottom: t.bottom }
        };
      });
      assert(state.count === 1,
        lang.toUpperCase() + ': exactly one tooltip mounted (no stale chrome)', 'count=' + state.count);
      assert(state.hasText, lang.toUpperCase() + ': tooltip has resolved title copy');
      assert(state.inViewport, lang.toUpperCase() + ': tooltip inside viewport',
        JSON.stringify(state.rect));
    }

    console.log('');
    if (failures === 0) {
      console.log('ALL ASSERTIONS PASSED — WebKit RTL/geometry + spotlight-branch gate GREEN.');
    } else {
      console.log(failures + ' ASSERTION(S) FAILED — WebKit gate RED.');
      exitCode = 1;
    }
  } catch (err) {
    console.error('\n[41-rtl-geometry] ERROR during probe: ' + (err && err.stack ? err.stack : err));
    exitCode = 1;
  } finally {
    await browser.close();
    server.close();
  }

  process.exit(exitCode);
}

main();
