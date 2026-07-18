/**
 * tests/webkit/46-export-step2-layout.mjs — Phase 46 gap-round-2 (gaps 10/11) WebKit layout gate.
 *
 * WHAT THIS IS
 *   An AD-HOC, MANUAL Playwright-WebKit probe for the one thing the jsdom suite
 *   structurally CANNOT verify (no layout engine): the REAL rendered geometry of
 *   the export Step-2 editing surface. It reproduces production's export Step-2
 *   state (add-session.html's #exportModal, .export-card.is-editor-step, the
 *   persistent RichToolbar docked above #exportEditor) and asserts the surface is
 *   usable and the formatting toolbar is ALWAYS visible.
 *
 *   Gap 10 — Step-2 DEFAULT layout collapses on laptop viewports. The card was
 *   hard-sized to 50dvh; on an ~820-980px laptop viewport the fixed Step-2 chrome
 *   eats the height and .export-edit-area collapses, so the toolbar compresses to a
 *   clipped sliver and the editor shows ~1.5 lines.
 *   Gap 11 — the export toolbar is not ALWAYS visible: (a) compression clipping,
 *   (b) scroll-away, because the persistent bar docks INSIDE the overflow-y:auto
 *   edit area, so a long document scrolls it out of view.
 *
 *   ASSERTIONS (run A/B/C at TWO viewports — 1440x820 and 1000x700 — plus one
 *   German-locale pass; D runs once at 1440x820):
 *     A. Toolbar unclipped: height >= 40 AND clientHeight >= scrollHeight - 2.
 *     B. Editor usable: visible (rect-intersection) editor height >= 140px.
 *     C. Toolbar pinned: HARD-assert the edit area genuinely overflows
 *        (scrollHeight - clientHeight > 20; preview-pane fallback forces overflow
 *        if the fill path does not), THEN after scrollTop = scrollHeight the bar is
 *        still fully inside the visible edit region. Never passes vacuously.
 *     D. Maximize regression guard (NOT part of the RED evidence): with
 *        .is-maximized the card still reaches >= 0.85 * viewport height.
 *
 *   PLUS assertion set E — preview reveal + IN-PLACE SWAP, driven through the new
 *   current-state switcher segment (data-mode="preview"), NOT the deleted single
 *   preview toggle. The preview reveal (E1-E3) opens preview WITHOUT prior editor
 *   focus via a real mousedown on the segment (the segment binds mousedown, not
 *   click), then:
 *     E1. End-to-end — the pane opened + is visible + the segment's aria-pressed=true.
 *     E2. The pane top clears the STICKY bar (paneTop >= barBottom-2 AND
 *         paneTop <= areaBottom-20). Bar-relative, so a naive scrollIntoView landing
 *         the pane under the pin cannot pass.
 *     E3. Content — the pane rendered the field's actual text (an empty or stale
 *         pane cannot pass on presence/visibility alone).
 *   The in-place-swap cases (E4-E8, at 1440x820, plus an RTL pass) prove one box at
 *   a time — the preview REPLACES the editor in the same box:
 *     E4. The preview frame is visible in the viewport ON OPEN (top clears the
 *         pinned bar, within the edit-area rect) WITHOUT any manual scroll.
 *     E5. The persistent toolbar stays pinned at the edit-area top while previewing.
 *     E6. The #exportEditor is HIDDEN (display:none / collapsed rect) while
 *         previewing — no stacked editor+preview scroll container (editorHidden).
 *     E7. The editor returns visible after a mousedown on the Edit segment.
 *     E8. RTL pass (dir=rtl, Hebrew) — the same visible-on-open + editorHidden hold
 *         with the switcher pinned at the bar's logical end.
 *   Set E is RED against current source (no switcher segment / no in-place swap) and
 *   GREEN after the rich-toolbar.js + app.css rewire; A–D and passes 1–3 stay valid
 *   under the content-driven card model (the 64-line setup keeps C non-vacuous and
 *   D >= 0.85*viewport). This probe is MANUAL — never part of npm test.
 *
 *   FALSIFIABILITY: run against the CURRENT (unmodified) app.css this file is RED —
 *   assertions A, B and C FAIL (compressed clipped toolbar sliver, ~1.5-line
 *   editor, bar scrolls away). D is a REGRESSION GUARD, not part of the RED proof.
 *   It goes GREEN only after app.css gives .export-card.is-editor-step a
 *   min-block-size floor and pins/anchors the export edit-area toolbar
 *   (flex-shrink:0 + position:sticky + inset-block-start:0).
 *
 * HOW TO RUN (NOT part of npm test — tests/run-all.js only globs top-level
 *   tests/*.test.js, so this tests/webkit/*.mjs file is never discovered):
 *     node tests/webkit/46-export-step2-layout.mjs
 *
 * DEPENDENCIES
 *   Playwright is NOT a package.json dependency and is NOT installed globally. This
 *   probe resolves it from the PINNED local install at
 *   /Users/ben/Claude-Code-Sandbox/TPM_Docs/video-pipeline/node_modules/playwright
 *   via createRequire (ESM ignores NODE_PATH, so the path is explicit). The WebKit
 *   binary is cached at ~/Library/Caches/ms-playwright. If it is stale run:
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
  console.error('\n[46-export-step2-layout] FATAL: could not load Playwright WebKit.');
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

// ── Tiny static file server so the app's scripts/styles load exactly as shipped
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
        const filePath = path.join(REPO_ROOT, urlPath);
        // Traversal guard: require the separator so a sibling directory whose name
        // merely starts with REPO_ROOT's string can never be served (allow the
        // root itself if it is ever requested exactly).
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

// The selectors that resolve production's export Step-2 surface. The persistent
// export bar docks `beforebegin` #exportEditor (rich-toolbar.js), i.e. as a direct
// child of .export-edit-area — so `> .rich-toolbar` matches ONLY the export bar,
// never the 7 note-field toolbars (which live outside .export-card).
const SEL = {
  bar: '.export-card.is-editor-step .export-edit-area > .rich-toolbar',
  area: '.export-card.is-editor-step .export-edit-area',
  editor: '#exportEditor',
  card: '.export-card',
  // The current-state switcher segments (pinned outside the scroll strip). The
  // old single preview toggle is gone; preview/edit are now two mode segments and
  // aria-pressed rides the segment (mirroring is-active). Set E drives these.
  previewBtn:
    '.export-card.is-editor-step .export-edit-area > .rich-toolbar .rich-toolbar-swap-btn[data-mode="preview"]',
  editSeg:
    '.export-card.is-editor-step .export-edit-area > .rich-toolbar .rich-toolbar-swap-btn[data-mode="edit"]'
};

// Drive a fresh page to the export Step-2 active state with a long document loaded.
async function setupExportStep2(context, base) {
  const page = await context.newPage();

  // addInitScript runs BEFORE the page's gate scripts on every navigation. Satisfy
  // the app-shell license/terms gates and suppress the first-run welcome overlay.
  // The caller sets portfolioLang on the context before this via a second init.
  await page.goto(base + '/add-session.html', { waitUntil: 'load' });

  // Wait for the editor + the toolbar module (the persistent export bar is mounted
  // at boot by export-modal.js, but guard by mounting if it is somehow absent).
  await page.waitForFunction(
    () => document.getElementById('exportEditor') !== null &&
          !!window.RichToolbar && typeof window.RichToolbar.mount === 'function',
    { timeout: 10000 }
  );

  await page.evaluate((sel) => {
    // Reproduce the persistent dock exactly as production does if boot did not.
    if (!document.querySelector('.export-card .export-edit-area > .rich-toolbar')) {
      window.RichToolbar.mount([document.getElementById('exportEditor')],
        { headings: true, persistent: true });
    }
    // Reproduce exportSetActiveStep(2): show the modal, flag the editor step, make
    // step 2 the active step and clear the others.
    const modal = document.getElementById('exportModal');
    modal.classList.remove('is-hidden');
    const card = modal.querySelector('.export-card');
    card.classList.add('is-editor-step');
    modal.querySelectorAll('.export-step').forEach((s) => {
      s.classList.toggle('is-active', Number(s.dataset.step) === 2);
    });
    // Fill the editor with a long multi-line document and fire a real input event
    // so autogrow/listeners observe it.
    const ed = document.getElementById(sel.editor.slice(1));
    const lines = [];
    for (let i = 1; i <= 64; i++) {
      lines.push('Line ' + i + ' — lorem ipsum dolor sit amet consectetur');
    }
    ed.value = lines.join('\n');
    ed.dispatchEvent(new Event('input', { bubbles: true }));
  }, SEL);

  return page;
}

// Measure the surface geometry in one page.evaluate.
function measure(page) {
  return page.evaluate((sel) => {
    const bar = document.querySelector(sel.bar);
    const area = document.querySelector(sel.area);
    const editor = document.querySelector(sel.editor);
    const r = (el) => {
      const b = el.getBoundingClientRect();
      return { left: b.left, top: b.top, right: b.right, bottom: b.bottom, width: b.width, height: b.height };
    };
    return {
      hasBar: !!bar,
      hasArea: !!area,
      barRect: bar ? r(bar) : null,
      barClientHeight: bar ? bar.clientHeight : null,
      barScrollHeight: bar ? bar.scrollHeight : null,
      areaRect: area ? r(area) : null,
      areaClientHeight: area ? area.clientHeight : null,
      areaScrollHeight: area ? area.scrollHeight : null,
      editorRect: editor ? r(editor) : null
    };
  }, SEL);
}

// Selector shape gate (review WR-01): every selector this probe measures through
// must resolve to EXACTLY ONE node. The probe reconstructs the Step-2 state by
// hand, so if export-modal.js / rich-toolbar.js / add-session.html ever rename a
// class, dock the bar at a different node, or move is-editor-step, the modelled
// DOM would silently diverge from production and the gate would go false-GREEN.
// This converts any such selector/nesting drift into a loud probe FAILURE.
async function assertUniqueSelectors(page, label) {
  const shape = await page.evaluate((sel) => {
    const count = (s) => document.querySelectorAll(s).length;
    return {
      bar: count(sel.bar),
      area: count(sel.area),
      editor: count(sel.editor),
      card: count(sel.card),
      previewBtn: count(sel.previewBtn),
      editSeg: count(sel.editSeg),
      areaOverflowY: (() => {
        const area = document.querySelector(sel.area);
        return area ? getComputedStyle(area).overflowY : null;
      })()
    };
  }, SEL);
  for (const key of ['bar', 'area', 'editor', 'card', 'previewBtn', 'editSeg']) {
    assert(shape[key] === 1,
      label + ' · shape: selector "' + SEL[key] + '" resolves to exactly one node',
      'count=' + shape[key] + ' — DOM drifted from the modelled production structure');
  }
  assert(shape.areaOverflowY === 'auto',
    label + ' · shape: edit area is the scroll container (overflow-y: auto)',
    'overflowY=' + shape.areaOverflowY);
  return shape;
}

// Run assertions A, B and C for one already-set-up page.
async function runABC(page, label) {
  console.log('\n[' + label + '] A/B/C:');
  await assertUniqueSelectors(page, label);
  const m = await measure(page);

  // A — toolbar unclipped.
  assert(m.hasBar, label + ' · toolbar element present', JSON.stringify(m.hasBar));
  if (m.hasBar) {
    assert(m.barRect.height >= 40,
      label + ' · A1 toolbar height >= 40 (not a sliver)',
      'height=' + m.barRect.height.toFixed(1));
    assert(m.barClientHeight >= m.barScrollHeight - 2,
      label + ' · A2 toolbar not vertically clipped (clientHeight >= scrollHeight-2)',
      'clientHeight=' + m.barClientHeight + ' scrollHeight=' + m.barScrollHeight);
  }

  // B — editor usable (measure the VISIBLE intersection with the scroll area).
  if (m.editorRect && m.areaRect) {
    const visibleEditorHeight =
      Math.min(m.editorRect.bottom, m.areaRect.bottom) - Math.max(m.editorRect.top, m.areaRect.top);
    assert(visibleEditorHeight >= 140,
      label + ' · B visible editor height >= 140',
      'visibleEditorHeight=' + visibleEditorHeight.toFixed(1) +
      ' editor=' + JSON.stringify(m.editorRect) + ' area=' + JSON.stringify(m.areaRect));
  } else {
    assert(false, label + ' · B editor/area measurable', 'missing rect');
  }

  // C — toolbar stays visible after scroll-to-bottom. HARD-assert the overflow
  // precondition; if the fill path did not overflow the area, open the preview pane
  // (docked afterend the editor, inside the scroll area) to force real overflow.
  let overflow = m.areaScrollHeight - m.areaClientHeight;
  if (!(overflow > 20)) {
    // Focus the editor (sets the toolbar's _focused field) then toggle preview on.
    await page.evaluate((sel) => {
      const ed = document.querySelector(sel.editor);
      ed.focus();
      // The switcher segment binds mousedown (not click) — dispatch a real one.
      const btn = document.querySelector(sel.previewBtn);
      if (btn) btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    }, SEL);
    await page.waitForTimeout(200);
    const m2 = await measure(page);
    overflow = m2.areaScrollHeight - m2.areaClientHeight;
  }
  assert(overflow > 20,
    label + ' · C precondition: edit area genuinely overflows (scroll possible, non-vacuous)',
    'scrollHeight-clientHeight=' + overflow);

  // Only meaningful once the area can scroll — scroll to the bottom, settle one rAF,
  // then assert the bar is still fully inside the visible edit region.
  const pin = await page.evaluate((sel) => new Promise((resolve) => {
    const area = document.querySelector(sel.area);
    area.scrollTop = area.scrollHeight;
    requestAnimationFrame(() => {
      const bar = document.querySelector(sel.bar);
      const barRect = bar.getBoundingClientRect();
      const areaRect = area.getBoundingClientRect();
      resolve({
        barTop: barRect.top, barBottom: barRect.bottom,
        areaTop: areaRect.top, areaBottom: areaRect.bottom
      });
    });
  }), SEL);
  assert(pin.barTop >= pin.areaTop - 2 && pin.barBottom <= pin.areaBottom + 2,
    label + ' · C toolbar stays pinned inside the edit area after scroll-to-bottom',
    'bar[' + pin.barTop.toFixed(1) + '..' + pin.barBottom.toFixed(1) + '] ' +
    'area[' + pin.areaTop.toFixed(1) + '..' + pin.areaBottom.toFixed(1) + ']');
}

// D — maximize regression guard (once, at 1440x820). NOT part of the RED evidence.
async function runMaximizeGuard(page, viewportHeight) {
  console.log('\n[1440x820 maximize-guard] D:');
  const h = await page.evaluate(() => new Promise((resolve) => {
    const card = document.querySelector('.export-card');
    card.classList.add('is-maximized');
    requestAnimationFrame(() => {
      const height = card.getBoundingClientRect().height;
      card.classList.remove('is-maximized');
      resolve(height);
    });
  }));
  assert(h >= 0.85 * viewportHeight,
    'D maximize card still reaches ~90dvh (>= 0.85 * viewport height)',
    'cardHeight=' + h.toFixed(1) + ' viewportHeight=' + viewportHeight);
}

// E — preview reveal WITHOUT prior editor focus (Phase 46 gap-round-3, gaps 12+13).
// setupExportStep2 fills #exportEditor via .value= + an input event but never
// focuses it and never clicks the bar, so the editor is genuinely unfocused —
// reproducing Gap 12's precondition. We then open the preview by dispatching a real
// mousedown on the preview button (the toolbar binds mousedown, NOT click, so
// btn.click() would not open it) and assert the pane opened (Gap 12 end-to-end) and
// that its top edge clears the STICKY bar (Gap 13 — a naive scrollIntoView would
// land the pane under the pinned bar and pass an area-only check, so E2 is
// bar-relative). jsdom cannot see this (no layout engine); only real WebKit can.
async function runPreviewReveal(page, label) {
  console.log('\n[' + label + '] E (preview reveal, no prior focus):');
  await assertUniqueSelectors(page, label);

  // Drive the activation with a real mousedown, WITHOUT focusing the editor first.
  await page.evaluate((sel) => {
    const btn = document.querySelector(sel.previewBtn);
    if (btn) btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  }, SEL);
  await page.waitForTimeout(200); // settle the rAF + the reveal scroll

  const geo = await page.evaluate((sel) => {
    const area = document.querySelector(sel.area);
    const bar = document.querySelector(sel.bar);
    const btn = document.querySelector(sel.previewBtn);
    const pane = document.querySelector(sel.area + ' .rich-toolbar-preview');
    const rect = (el) => { const b = el.getBoundingClientRect(); return { top: b.top, bottom: b.bottom, height: b.height }; };
    return {
      hasPane: !!pane && !pane.classList.contains('is-hidden'),
      pressed: btn ? btn.getAttribute('aria-pressed') : null,
      paneText: pane ? pane.textContent : '',
      paneRect: pane ? rect(pane) : null,
      barRect: bar ? rect(bar) : null,
      areaRect: area ? rect(area) : null
    };
  }, SEL);

  // E1 — Gap 12 end-to-end: the pane opened + is visible + the button is pressed.
  assert(geo.hasPane && geo.pressed === 'true',
    label + ' · E1 preview opened on first click with no prior focus (Gap 12)',
    geo.hasPane
      ? ('pane present but aria-pressed=' + geo.pressed)
      : 'preview did not open on first click — Gap 12');

  // E2 — Gap 13: the pane top must clear the sticky bar (bar-relative), and at least
  // ~20px of pane must be visible above the fold. Fail explicitly if the pane is absent.
  if (geo.paneRect && geo.barRect && geo.areaRect) {
    const clearsBar = geo.paneRect.top >= geo.barRect.bottom - 2;
    const aboveFold = geo.paneRect.top <= geo.areaRect.bottom - 20;
    assert(clearsBar && aboveFold,
      label + ' · E2 preview pane revealed below the pinned bar (bar-relative)',
      'paneTop=' + geo.paneRect.top.toFixed(1) +
      ' barBottom=' + geo.barRect.bottom.toFixed(1) +
      ' areaBottom=' + geo.areaRect.bottom.toFixed(1) +
      ' (clearsBar=' + clearsBar + ' aboveFold=' + aboveFold + ')');
  } else {
    assert(false,
      label + ' · E2 preview pane revealed below the pinned bar (bar-relative)',
      'pane absent — cannot verify reveal');
  }

  // E3 — the pane rendered the field's ACTUAL content (setupExportStep2 fills the
  // editor with "Line 1 …" lines). Presence/visibility alone would pass an empty or
  // stale pane; this ties the rendered output to the input.
  assert(geo.paneText.indexOf('Line 1') !== -1,
    label + ' · E3 preview pane rendered the field content',
    'paneText[0..80]=' + JSON.stringify(String(geo.paneText).slice(0, 80)));
}

// E4-E8 — IN-PLACE SWAP: the preview REPLACES the editor in the same box (one thing
// on screen at a time). Enter preview via a real mousedown on the switcher's Preview
// segment WITHOUT prior editor focus, then assert the frame is visible-on-open, the
// bar stays pinned, and the editor is hidden while previewing; leaving via the Edit
// segment restores the editor. Pass expectRtl=true for the Hebrew/RTL pass, where the
// switcher pins at the bar's logical end and the same geometry must still hold.
async function runInPlaceSwap(page, label, expectRtl) {
  console.log('\n[' + label + '] E (in-place swap):');
  await assertUniqueSelectors(page, label);

  // Enter preview via a real mousedown on the Preview segment, NO prior editor focus.
  await page.evaluate((sel) => {
    const seg = document.querySelector(sel.previewBtn);
    if (seg) seg.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  }, SEL);
  await page.waitForTimeout(200); // settle the swap + any residual reveal scroll

  const on = await page.evaluate((sel) => {
    const area = document.querySelector(sel.area);
    const bar = document.querySelector(sel.bar);
    const editor = document.querySelector(sel.editor);
    const pane = document.querySelector(sel.area + ' .rich-toolbar-preview');
    const rect = (el) => { const b = el.getBoundingClientRect(); return { top: b.top, bottom: b.bottom, height: b.height }; };
    return {
      dir: (document.documentElement.getAttribute('dir') ||
            getComputedStyle(document.documentElement).direction || 'ltr').toLowerCase(),
      hasPane: !!pane && !pane.classList.contains('is-hidden'),
      paneRect: pane ? rect(pane) : null,
      barRect: bar ? rect(bar) : null,
      areaRect: area ? rect(area) : null,
      editorHidden: editor
        ? (getComputedStyle(editor).display === 'none' || editor.getBoundingClientRect().height < 2)
        : null
    };
  }, SEL);

  // RTL precondition (non-vacuous): the RTL pass must actually run under dir=rtl.
  if (expectRtl) {
    assert(on.dir === 'rtl',
      label + ' · E8 precondition: document is RTL (dir=rtl)',
      'documentDir=' + on.dir);
  }

  // E4 — the frame is visible ON OPEN at 1440x820 without scroll: its top clears the
  // pinned bar and sits within the visible edit-area rect.
  if (on.paneRect && on.barRect && on.areaRect) {
    const clearsBar = on.paneRect.top >= on.barRect.bottom - 2;
    const withinArea = on.paneRect.top >= on.areaRect.top - 2 && on.paneRect.top <= on.areaRect.bottom - 20;
    assert(on.hasPane && clearsBar && withinArea,
      label + ' · E4 preview frame visible on open (in-place swap, no manual scroll)',
      'paneTop=' + on.paneRect.top.toFixed(1) + ' barBottom=' + on.barRect.bottom.toFixed(1) +
      ' areaTop=' + on.areaRect.top.toFixed(1) + ' areaBottom=' + on.areaRect.bottom.toFixed(1) +
      ' (hasPane=' + on.hasPane + ' clearsBar=' + clearsBar + ' withinArea=' + withinArea + ')');
  } else {
    assert(false, label + ' · E4 preview frame visible on open', 'pane/bar/area not measurable');
  }

  // E5 — the persistent toolbar stays pinned at the edit-area top while previewing.
  if (on.barRect && on.areaRect) {
    assert(Math.abs(on.barRect.top - on.areaRect.top) <= 2,
      label + ' · E5 persistent toolbar stays pinned at the edit-area top while previewing',
      'barTop=' + on.barRect.top.toFixed(1) + ' areaTop=' + on.areaRect.top.toFixed(1));
  } else {
    assert(false, label + ' · E5 toolbar pinned while previewing', 'bar/area not measurable');
  }

  // E6 — the editor is HIDDEN while previewing (one box at a time, no stacked scroll).
  assert(on.editorHidden === true,
    label + ' · E6 editorHidden while previewing (#exportEditor collapses)',
    'editorHidden=' + on.editorHidden);

  // E7 — leaving preview via the Edit segment restores a visible editor.
  await page.evaluate((sel) => {
    const seg = document.querySelector(sel.editSeg);
    if (seg) seg.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  }, SEL);
  await page.waitForTimeout(200);
  const off = await page.evaluate((sel) => {
    const editor = document.querySelector(sel.editor);
    return {
      editorVisible: editor
        ? (getComputedStyle(editor).display !== 'none' && editor.getBoundingClientRect().height > 2)
        : null
    };
  }, SEL);
  assert(off.editorVisible === true,
    label + ' · E7 editor returns visible after mousedown on the Edit segment',
    'editorVisible=' + off.editorVisible);
}

async function newGatedContext(browser, { width, height, lang }) {
  const context = await browser.newContext({ viewport: { width, height } });
  await context.addInitScript(({ lg }) => {
    try {
      localStorage.setItem('portfolioLicenseActivated', '1');
      localStorage.setItem('portfolioLicenseInstance', 'webkit-probe');
      localStorage.setItem('portfolioTermsAccepted', '1');
      localStorage.setItem('sg.welcomeSeen', '1');
      localStorage.setItem('portfolioLang', lg);
      // Suppress the v1.4.0 what's-new overlay so it never sits over the toolbar and
      // intercepts the real mousedown that Pass 4's preview-reveal (set E) drives.
      // whats-new.js self-suppresses when the last-seen key equals the current
      // version; a stylesheet hiding its nodes is the belt-and-suspenders. Harmless
      // to passes 1–3 (they never click the bar; a display:none overlay is out of
      // flow, so the export card's layout floor is unchanged).
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
  }, { lg: lang });
  return context;
}

async function main() {
  const { server, base } = await startServer();
  const browser = await webkit.launch();
  let exitCode = 0;

  try {
    // ── Pass 1: 1440x820 (EN) — the representative MacBook content-viewport band ──
    {
      const ctx = await newGatedContext(browser, { width: 1440, height: 820, lang: 'en' });
      const page = await setupExportStep2(ctx, base);
      await runABC(page, '1440x820 EN');
      await runMaximizeGuard(page, 820); // D — regression guard, once, here
      await ctx.close();
    }

    // ── Pass 2: 1000x700 (EN) — the regime where the floor's 90vh/90dvh cap binds ─
    {
      const ctx = await newGatedContext(browser, { width: 1000, height: 700, lang: 'en' });
      const page = await setupExportStep2(ctx, base);
      await runABC(page, '1000x700 EN');
      await ctx.close();
    }

    // ── Pass 3: 1440x820 (DE) — the most verbose chrome (the ephemeral note wraps
    //    taller) must not silently eat the editor floor ──────────────────────────
    {
      const ctx = await newGatedContext(browser, { width: 1440, height: 820, lang: 'de' });
      const page = await setupExportStep2(ctx, base);
      await runABC(page, '1440x820 DE');
      await ctx.close();
    }

    // ── Pass 4: 1440x820 (EN) — the Gap-13 repro viewport. Open the preview WITHOUT
    //    prior editor focus (Gap 12 end-to-end) and assert the pane reveals below the
    //    pinned bar (Gap 13). A–D at passes 1–3 are unaffected. ────────────────────
    {
      const ctx = await newGatedContext(browser, { width: 1440, height: 820, lang: 'en' });
      const page = await setupExportStep2(ctx, base);
      await runPreviewReveal(page, '1440x820 EN preview-reveal');
      await ctx.close();
    }

    // ── Pass 5: 1440x820 (EN) — in-place swap: preview REPLACES the editor in the
    //    same box (visible-on-open + pinned bar + editor hidden), driven through the
    //    current-state switcher segment. RED against current source. ───────────────
    {
      const ctx = await newGatedContext(browser, { width: 1440, height: 820, lang: 'en' });
      const page = await setupExportStep2(ctx, base);
      await runInPlaceSwap(page, '1440x820 EN in-place-swap', false);
      await ctx.close();
    }

    // ── Pass 6: 1440x820 (HE, RTL) — the same in-place-swap geometry must hold under
    //    dir=rtl, with the switcher pinned at the bar's logical end. ────────────────
    {
      const ctx = await newGatedContext(browser, { width: 1440, height: 820, lang: 'he' });
      const page = await setupExportStep2(ctx, base);
      await runInPlaceSwap(page, '1440x820 HE rtl in-place-swap', true);
      await ctx.close();
    }

    console.log('');
    if (failures === 0) {
      console.log('ALL ASSERTIONS PASSED — export Step-2 layout gate GREEN.');
    } else {
      console.log(failures + ' ASSERTION(S) FAILED — export Step-2 layout gate RED.');
      exitCode = 1;
    }
  } catch (err) {
    console.error('\n[46-export-step2-layout] ERROR during probe: ' + (err && err.stack ? err.stack : err));
    exitCode = 1;
  } finally {
    await browser.close();
    server.close();
  }

  process.exit(exitCode);
}

main();
