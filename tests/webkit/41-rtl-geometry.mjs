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
 *     (2) TOUR-04 RTL physical-side correctness + on-anchor tooltip/spotlight
 *         geometry, plus a clean EN→HE→DE→CS mid-tour re-render (Pitfall 2 + 5).
 *
 * STRENGTHENED IN PLAN 41-08 (UAT gaps 2/3/4):
 *   The original probe only exercised step 1's FULL-WIDTH greeting card, which
 *   hid the RTL blocker (a full-width anchor mirrors onto itself). This version
 *   adds the assertions that actually catch the shipped defect:
 *     • Section [3] no longer asserts the arrow "flips to the mirrored side" —
 *       that was asserting the BUG (logical inset props resolve to the opposite
 *       edge in RTL). It now asserts the arrow stays on the SAME physical side
 *       (physical-coordinate positioning is direction-neutral by construction).
 *     • Section [5] (NEW) selects the first meaningfully OFF-CENTER anchor and
 *       asserts, in real WebKit layout, that the Hebrew spotlight's physical
 *       left is on the anchor's physical side, NOT the mirrored side — the exact
 *       assertion that FAILS on the logical/physical mirror (gap 4), plus a
 *       POST-SETTLE (post-scrollIntoView, ≥2 rAF) re-check that the spotlight
 *       still overlaps the anchor and the tooltip is inside the viewport (gaps 2/3).
 *   FALSIFIABILITY: run against the CURRENT (pre-Task-2/3, logical-coordinate)
 *   tour.js this file is RED — sections [3] and [5] fail because the geometry
 *   mirrors. It goes GREEN only after tour.js/tour.css switch to physical axes.
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

    // Physical-side stability (the POST-FIX contract): --arrow-x is consumed as a
    // physical `left`, so the arrow's offset from the tooltip's LEFT edge must NOT
    // move to the mirror side when the document flips to RTL. The pre-fix logical
    // `inset-inline-start` DID mirror it (that was the bug) — so this assertion is
    // RED against the current code and GREEN once tour.css positions the arrow with
    // physical `left`. We assert the EN and HE physical offsets stay on the SAME
    // side of the tooltip mid-line and are close in magnitude (no mirror).
    if (enArrow && heArrow) {
      const enSide = enArrow.offsetFromLeft - enArrow.tooltipWidth / 2; // <0 = left half
      const heSide = heArrow.offsetFromLeft - heArrow.tooltipWidth / 2;
      const sameSide = Math.sign(enSide) === Math.sign(heSide) &&
        Math.abs(enArrow.offsetFromLeft - heArrow.offsetFromLeft) <= 16;
      assert(sameSide,
        'RTL keeps the arrow on the SAME physical side (physical coords, no mirror)',
        'EN offsetFromLeft=' + enArrow.offsetFromLeft.toFixed(1) +
        ' HE offsetFromLeft=' + heArrow.offsetFromLeft.toFixed(1) +
        ' tooltipW=' + heArrow.tooltipWidth.toFixed(1));
    } else {
      assert(false, 'RTL arrow physical-side measurable', 'missing arrow measurement');
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

    // ── (5) OFF-CENTER anchor RTL physical-side + post-settle geometry (blocker) ───
    // The assertion the shipped probe LACKED. A full-width anchor mirrors onto
    // itself, so gap 4 only shows on an OFF-CENTER anchor. Re-enter Hebrew, walk
    // the on-page steps, pick the first anchor whose center is >15% of the viewport
    // off the middle, render it, and assert (in real WebKit layout) the spotlight's
    // PHYSICAL left is on the anchor's side — not the mirrored side. Then re-check
    // after the scroll settles (≥2 rAF) that geometry stayed on-anchor.
    console.log('\n[5] Off-center-anchor RTL physical-side + post-settle geometry:');
    await page.evaluate(() => {
      if (window.App && typeof window.App.setLanguage === 'function') window.App.setLanguage('he');
      else {
        localStorage.setItem('portfolioLang', 'he');
        document.documentElement.setAttribute('dir', 'rtl');
        document.dispatchEvent(new CustomEvent('app:language', { detail: { lang: 'he' } }));
      }
    });
    await page.waitForFunction(
      () => document.documentElement.getAttribute('dir') === 'rtl' &&
            document.querySelector('.sg-tour-tooltip') !== null,
      { timeout: 5000 }
    );

    const offCenter = await page.evaluate(() => {
      const steps = window.Tour._getSteps();
      const curPage = window.Tour._currentPage();
      const vw = window.innerWidth;
      for (let i = 0; i < steps.length; i++) {
        if (steps[i].page !== curPage) continue;
        const el = document.querySelector(steps[i].anchor);
        if (!el) continue;
        const a = el.getBoundingClientRect();
        const center = a.left + a.width / 2;
        if (Math.abs(center - vw / 2) > 0.15 * vw) {
          window.Tour._setStepIndex(i);
          window.Tour._render();
          const anchor = document.querySelector(steps[i].anchor).getBoundingClientRect();
          const sp = document.querySelector('.sg-tour-spotlight').getBoundingClientRect();
          return {
            i, id: steps[i].id, vw,
            anchor: { left: anchor.left, right: anchor.right, width: anchor.width },
            spotlight: { left: sp.left, right: sp.right, width: sp.width }
          };
        }
      }
      return null;
    });
    assert(!!offCenter,
      'found a meaningfully off-center on-page anchor to probe the RTL side',
      JSON.stringify(offCenter));
    if (offCenter) {
      const pad = 8;
      const expectedLeft = offCenter.anchor.left - pad;                    // physical (correct)
      const mirroredLeft = offCenter.vw - offCenter.anchor.right - pad;    // logical-in-RTL (bug)
      const distCorrect = Math.abs(offCenter.spotlight.left - expectedLeft);
      const distMirror = Math.abs(offCenter.spotlight.left - mirroredLeft);
      assert(distCorrect <= 12 && distCorrect < distMirror,
        'RTL spotlight sits on the anchor PHYSICAL side, not mirrored [' + offCenter.id + ']',
        'spotlight.left=' + offCenter.spotlight.left.toFixed(1) +
        ' expected≈' + expectedLeft.toFixed(1) + ' mirrored≈' + mirroredLeft.toFixed(1));
    }

    // Post-settle: the tour positions the spotlight synchronously (correct — the
    // ring is tw-independent) then re-measures the tooltip clamp one rAF after the
    // freshly-mounted chrome is laid out and scrollIntoView commits. Give that
    // settle a short beat (a fixed 2-rAF window races the internal re-measure +
    // scroll reflow across the Playwright call boundary — Plan 08 permits "a short
    // delay"), then assert geometry stayed on-anchor and the tooltip is in-viewport.
    await page.waitForTimeout(250);
    const settled = await page.evaluate(() => new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const steps = window.Tour._getSteps();
        const idx = window.Tour._getStepIndex();
        const anchor = document.querySelector(steps[idx].anchor).getBoundingClientRect();
        const sp = document.querySelector('.sg-tour-spotlight').getBoundingClientRect();
        const tt = document.querySelector('.sg-tour-tooltip').getBoundingClientRect();
        const overlap = !(sp.right <= anchor.left || sp.left >= anchor.right ||
                          sp.bottom <= anchor.top || sp.top >= anchor.bottom);
        const ttInView = tt.left >= -0.5 && tt.top >= -0.5 &&
          tt.right <= window.innerWidth + 0.5 && tt.bottom <= window.innerHeight + 0.5;
        resolve({ overlap, ttInView,
          sp: { left: sp.left, right: sp.right }, anchor: { left: anchor.left, right: anchor.right } });
      }));
    }));
    assert(settled.overlap,
      'post-settle: spotlight still overlaps the anchor (one-rAF re-measure landed)',
      JSON.stringify(settled));
    assert(settled.ttInView,
      'post-settle: tooltip fully inside the viewport', JSON.stringify(settled));

    // ── (6) TALL-ANCHOR box-in-viewport (R2-1) ────────────────────────────────────
    // On the long settings panels (Custom Fields, Text Snippets) the anchor is
    // TALLER than the laptop viewport. The current engine scrollIntoView({block:
    // 'center'}) centers the panel's middle, so the tethered step box (the tooltip
    // carrying the step-count) lands OFF-screen — a wordless dim overlay until you
    // scroll. This section drives the REAL renderSpotlight/positionSpotlight path at
    // a deliberately taller-than-viewport anchor in a SHORT viewport (height 600 so
    // a long panel genuinely overflows) and asserts the step box is FULLY inside the
    // viewport. It is RED against the center-scroll engine (box pushed off-screen)
    // and GREEN only after the scroll-to-anchor-top + tooltip viewport-clamp fix.
    // Synthetic anchor + synthetic step is the plan-sanctioned focused alternative to
    // driving the cross-page settings walk, and it exercises the identical engine
    // render path (offsetParent-visible anchor → spotlight branch → positionSpotlight).
    console.log('\n[6] Tall-anchor step box stays inside a short viewport (R2-1):');
    {
      const shortCtx = await browser.newContext({ viewport: { width: 1280, height: 600 } });
      const shortPage = await shortCtx.newPage();
      await shortPage.addInitScript(() => {
        try {
          localStorage.setItem('portfolioLicenseActivated', '1');
          localStorage.setItem('portfolioLicenseInstance', 'webkit-probe');
          localStorage.setItem('portfolioTermsAccepted', '1');
          localStorage.setItem('sg.welcomeSeen', '1');
          localStorage.setItem('portfolioLang', 'en');
        } catch (e) {}
      });
      await shortPage.goto(base + '/index.html', { waitUntil: 'load' });
      await shortPage.waitForFunction(
        () => window.Tour && typeof window.Tour.start === 'function' &&
              document.querySelector('[data-tour="overview"]') !== null,
        { timeout: 10000 }
      );
      await shortPage.evaluate(() => window.Tour.start());
      await shortPage.waitForSelector('.sg-tour-tooltip', { timeout: 5000 });

      const tall = await shortPage.evaluate(() => {
        // Mount a deliberately taller-than-viewport anchor and a synthetic step that
        // targets it, then drive the REAL render path at it (the render loop is
        // step-composition-agnostic — _getSteps() returns the live array).
        // R2-1 follow-up: position the anchor's TOP just below the page top (40px,
        // on-screen in the 600px viewport) so it stands in for a long SETTINGS PANEL
        // whose header is visible after scrolling to page top — NOT a below-the-fold
        // control. The old block:'start' engine scrolls the panel top to the viewport
        // top (scrollY≈40 > 2), while Ben's scroll-to-page-top fix leaves scrollY=0
        // and — because the anchor top (40) is < viewport height (600) — does NOT
        // trigger the below-fold center fallback. This makes the scrollY assertion
        // below RED against block:'start' and GREEN after window.scrollTo(0,0).
        const el = document.createElement('div');
        el.setAttribute('data-tour', 'tall-probe');
        el.style.position = 'absolute';
        el.style.top = '40px';
        el.style.left = '50%';
        el.style.transform = 'translateX(-50%)';
        el.style.height = '2200px';
        el.style.width = '320px';
        el.style.background = '#ccd';
        document.body.appendChild(el);
        const steps = window.Tour._getSteps();
        steps.push({
          id: 'tall-probe',
          page: window.Tour._currentPage(),
          anchor: '[data-tour="tall-probe"]',
          i18nKey: 'help.tour.step.overview',
          screenName: 'Overview',
          takeMeThereHref: './index.html'
        });
        window.Tour._setStepIndex(steps.length - 1);
        window.Tour._render();
        const a = el.getBoundingClientRect();
        return { anchorHeight: a.height, vh: window.innerHeight };
      });
      assert(tall.anchorHeight > tall.vh,
        'probe anchor is genuinely taller than the viewport',
        'anchorH=' + tall.anchorHeight + ' vh=' + tall.vh);

      // Let the scrollIntoView + one-rAF re-measure settle, then measure the box.
      await shortPage.waitForTimeout(250);
      const box = await shortPage.evaluate(() => new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => {
          const tt = document.querySelector('.sg-tour-tooltip').getBoundingClientRect();
          resolve({
            top: tt.top, left: tt.left, right: tt.right, bottom: tt.bottom,
            vw: window.innerWidth, vh: window.innerHeight,
            scrollY: window.scrollY
          });
        }));
      }));
      // R2-1 follow-up (Ben's intent): on step entry the PAGE scrolls to the top so
      // the user keeps orientation (the settings tab bar / page header stays visible —
      // "which tab am I in") instead of being dropped into the middle of a long panel.
      // RED against the shipped block:'start' engine (which aligns the panel top to the
      // viewport top → scrollY = the panel's document offset ≈ 40 > 2); GREEN after
      // window.scrollTo(0, 0). The below-fold guard is NOT triggered here (anchor top
      // 40 < 600), so a settings-style tall panel lands at the page top.
      assert(box.scrollY <= 2,
        'tall settings-panel step scrolls the PAGE to the top (orientation kept)',
        'scrollY=' + box.scrollY);
      const m = 1; // allow a 1px sub-pixel margin
      const boxInView = box.top >= -m && box.left >= -m &&
        box.bottom <= box.vh + m && box.right <= box.vw + m;
      assert(boxInView,
        'tall-anchor step box is FULLY inside the viewport (scroll-to-top + clamp)',
        'box=' + JSON.stringify(box));

      await shortCtx.close();
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
