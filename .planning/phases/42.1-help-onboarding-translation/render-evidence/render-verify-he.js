// Real-browser HE RTL render verification for Plan 42.1-10 Task 1.
// Serves the repo over a local static server and drives /help + /changelog with
// Playwright Chromium (screenshots) + WebKit (Safari-engine probe). Sets the
// license/terms gate keys + portfolioLang=he via addInitScript BEFORE any page
// script runs, so App.getLanguage() resolves Hebrew and the redirect gates pass.
//
// Playwright is loaded from the sibling video-pipeline install (the TPM app has
// no playwright dep of its own). Exits non-zero on any failed assertion.

const http = require("http");
const fs = require("fs");
const path = require("path");

const REPO = "/Users/ben/Claude-Code-Sandbox/TherapistPortfolioManager_app";
const EVIDENCE = process.env.EVIDENCE_DIR ||
  path.join(REPO, ".planning/phases/42.1-help-onboarding-translation/render-evidence");
const PW = require(path.join(
  "/Users/ben/Claude-Code-Sandbox/TPM_Docs/video-pipeline/node_modules/playwright"
));

fs.mkdirSync(EVIDENCE, { recursive: true });

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
};

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let urlPath = decodeURIComponent(req.url.split("?")[0]);
      if (urlPath === "/") urlPath = "/index.html";
      const filePath = path.join(REPO, urlPath);
      if (!filePath.startsWith(REPO)) {
        res.writeHead(403); res.end("forbidden"); return;
      }
      fs.readFile(filePath, (err, buf) => {
        if (err) { res.writeHead(404); res.end("not found"); return; }
        res.writeHead(200, { "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream" });
        res.end(buf);
      });
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

// Set the gate keys + Hebrew BEFORE any page inline script parses.
const INIT = `
  try {
    localStorage.setItem('portfolioLang','he');
    localStorage.setItem('portfolioTermsAccepted','1');
    localStorage.setItem('portfolioTermsLang','he');
    localStorage.setItem('portfolioLicenseActivated','1');
    localStorage.setItem('portfolioLicenseInstance','render-verify');
    localStorage.setItem('sg.whatsNewLastSeenVersion','999.999.999'); // suppress popup during render
  } catch(e){}
`;

const results = [];
function check(engine, page, name, pass, detail) {
  results.push({ engine, page, name, pass: !!pass, detail: detail == null ? "" : String(detail) });
  const tag = pass ? "PASS" : "FAIL";
  console.log(`[${engine}] ${page} :: ${tag} — ${name}${detail ? "  (" + detail + ")" : ""}`);
}

async function verifyHelp(engine, page, base, screenshot) {
  await page.goto(base + "/help.html", { waitUntil: "networkidle" });
  await page.waitForSelector("#helpCards .help-card", { timeout: 15000 });

  // (a) dir=rtl + Hebrew titles (not EN)
  const dir = await page.evaluate(() => document.documentElement.getAttribute("dir"));
  check(engine, "help", "document dir=rtl", dir === "rtl", "dir=" + dir);

  const helpTitle = await page.evaluate(() => (document.getElementById("helpTitle") || {}).textContent || "");
  check(engine, "help", "page title is Hebrew (מרכז העזרה)", helpTitle.trim() === "מרכז העזרה", helpTitle.trim());

  const hasHebrewCardTitle = await page.evaluate(() => {
    const h = document.querySelector("#helpCards .help-card .card-head h2");
    return h ? /[֐-׿]/.test(h.textContent) : false;
  });
  check(engine, "help", "a help card title renders Hebrew glyphs", hasHebrewCardTitle);

  // (b) BLOCKER-2: getComputedStyle(cardBody).direction === 'rtl' on a NON-fallback card
  const rtlProbe = await page.evaluate(() => {
    const card = Array.from(document.querySelectorAll("#helpCards .help-card"))
      .find(c => !c.classList.contains("is-en-fallback") && c.querySelector(".card-body"));
    if (!card) return { found: false };
    // force-open so the body is laid out for the screenshot; direction is computed regardless
    card.classList.add("is-open");
    const body = card.querySelector(".card-body");
    return { found: true, id: card.id, direction: getComputedStyle(body).direction };
  });
  check(engine, "help", "BLOCKER-2 non-fallback card-body computes direction:rtl",
    rtlProbe.found && rtlProbe.direction === "rtl", rtlProbe.id + " → " + rtlProbe.direction);

  // spot-check an EN-fallback body computes ltr (only if any fallback exists)
  const fbProbe = await page.evaluate(() => {
    const card = document.querySelector("#helpCards .help-card.is-en-fallback .card-body");
    if (!card) return { found: false };
    card.closest(".help-card").classList.add("is-open");
    return { found: true, direction: getComputedStyle(card).direction };
  });
  if (fbProbe.found) {
    check(engine, "help", "EN-fallback card-body computes direction:ltr", fbProbe.direction === "ltr", fbProbe.direction);
  } else {
    console.log(`[${engine}] help :: INFO — no EN-fallback card present (HE corpus complete), ltr spot-check N/A`);
  }

  // (f) once-hardcoded chrome now reads Hebrew (rail groups, Start-here tag, spine, tech-band, intro, contact)
  const chrome = await page.evaluate(() => {
    const txt = (sel) => { const n = document.querySelector(sel); return n ? n.textContent.trim() : null; };
    const heb = (s) => !!s && /[֐-׿]/.test(s) && !/^[A-Za-z ]+$/.test(s);
    const railLabels = Array.from(document.querySelectorAll(".rail-group-label")).map(n => n.textContent.trim());
    return {
      railGroupLabels: railLabels,
      railGroupsHebrew: railLabels.length >= 2 && railLabels.every(heb),
      featuredTag: txt(".featured-tag"), featuredHebrew: heb(txt(".featured-tag")),
      spine: txt(".spine-group-label"), spineHebrew: heb(txt(".spine-group-label")),
      techBand: txt(".tech-band-label"), techBandHebrew: heb(txt(".tech-band-label")),
      intro: txt('[data-i18n="help.chrome.intro"]'), introHebrew: heb(txt('[data-i18n="help.chrome.intro"]')),
      contactTitle: txt('[data-i18n="help.chrome.contactTitle"]'), contactHebrew: heb(txt('[data-i18n="help.chrome.contactTitle"]')),
    };
  });
  check(engine, "help", "rail group labels render Hebrew", chrome.railGroupsHebrew, chrome.railGroupLabels.join(" | "));
  check(engine, "help", "featured 'Start here' tag Hebrew", chrome.featuredHebrew, chrome.featuredTag);
  check(engine, "help", "spine banner Hebrew", chrome.spineHebrew, chrome.spine);
  check(engine, "help", "tech-band banner Hebrew", chrome.techBandHebrew, chrome.techBand);
  check(engine, "help", "page-head intro Hebrew", chrome.introHebrew, chrome.intro);
  check(engine, "help", "contact band Hebrew", chrome.contactHebrew, chrome.contactTitle);

  // (d) mixed Latin/Hebrew line: no incorrect bidi flip — physical-coord check.
  // "Sessions Garden" (Latin) inside an RTL Hebrew line must keep its glyphs L->R
  // and sit physically to the LEFT of the Hebrew text that precedes it in reading
  // order. We render a controlled probe line and assert the Latin run's left edge
  // is left of the line's right edge (i.e. it did not get mirrored char-by-char).
  const bidi = await page.evaluate(() => {
    const host = document.querySelector("#helpCards") || document.body;
    const p = document.createElement("p");
    p.style.cssText = "font-size:18px;width:520px;";
    p.setAttribute("dir", "rtl");
    // Hebrew ... <bdi Latin> ... Hebrew, mixed on one line
    const before = document.createTextNode("הגן מכונה ");
    const latin = document.createElement("span");
    latin.textContent = "Sessions Garden";
    const after = document.createTextNode(" — חומת הלב ו-PDF");
    p.appendChild(before); p.appendChild(latin); p.appendChild(after);
    host.appendChild(p);
    // Latin glyph order preserved => first char 'S' is to the LEFT of last char 'n'
    const r = document.createRange();
    r.setStart(latin.firstChild, 0); r.setEnd(latin.firstChild, 1);
    const first = r.getBoundingClientRect();
    r.setStart(latin.firstChild, latin.firstChild.length - 1); r.setEnd(latin.firstChild, latin.firstChild.length);
    const last = r.getBoundingClientRect();
    const out = { firstLeft: first.left, lastLeft: last.left, sameLine: Math.abs(first.top - last.top) < 4 };
    p.remove();
    return out;
  });
  check(engine, "help", "mixed Latin run not bidi-flipped (S left of n, same line)",
    bidi.sameLine && bidi.firstLeft < bidi.lastLeft,
    `S.left=${bidi.firstLeft.toFixed(1)} n.left=${bidi.lastLeft.toFixed(1)}`);

  // (e) tour help-step \n\n renders as two paragraphs. Drive the REAL tour engine
  // to the final help step; on help.html the [data-tour="help"] anchor is absent,
  // so it renders the centered fallback modal containing .sg-tour-body (pre-line).
  const tour = await page.evaluate(() => {
    if (!(window.Tour && window.Tour._setStepIndex && window.Tour._render)) return { ok: false, reason: "no Tour seams" };
    const steps = window.Tour._getSteps ? window.Tour._getSteps() : [];
    const helpIdx = steps.findIndex(s => s && s.id === "help");
    if (helpIdx < 0) return { ok: false, reason: "no help step" };
    window.Tour._setStepIndex(helpIdx);
    window.Tour._render();
    const body = document.querySelector(".sg-tour-body");
    if (!body) return { ok: false, reason: "no .sg-tour-body rendered" };
    const raw = body.textContent || "";
    const ws = getComputedStyle(body).whiteSpace;
    // measure the vertical span of the two text chunks: with pre-line the blank
    // line between them yields a gap >= ~1 line-height between chunk1 bottom & chunk2 top.
    const parts = raw.split("\n\n");
    let gapOk = false, gap = null, lh = parseFloat(getComputedStyle(body).lineHeight) || 24;
    if (parts.length >= 2 && body.firstChild) {
      const tn = body.firstChild; // the single text node
      const r = document.createRange();
      const i1 = raw.indexOf(parts[0]);
      const i2 = raw.indexOf(parts[1], i1 + parts[0].length);
      r.setStart(tn, i1 + parts[0].length - 1); r.setEnd(tn, i1 + parts[0].length);
      const endOf1 = r.getBoundingClientRect();
      r.setStart(tn, i2); r.setEnd(tn, i2 + 1);
      const startOf2 = r.getBoundingClientRect();
      gap = startOf2.top - endOf1.top;
      gapOk = gap >= lh * 1.5; // a blank line => ~2 line-heights between the two runs' tops
    }
    return { ok: true, whiteSpace: ws, hasBreak: raw.indexOf("\n\n") !== -1, parts: parts.length, gap, lh, gapOk, isRtl: getComputedStyle(body).direction === "rtl" };
  });
  check(engine, "help", "tour help-step body has \\n\\n + white-space:pre-line",
    tour.ok && tour.hasBreak && tour.whiteSpace === "pre-line", tour.ok ? `ws=${tour.whiteSpace} parts=${tour.parts}` : tour.reason);
  check(engine, "help", "tour help-step \\n\\n renders as two paragraphs (measured gap)",
    tour.ok && tour.gapOk, tour.ok ? `gap=${tour.gap && tour.gap.toFixed(1)} lh=${tour.lh}` : tour.reason);

  if (screenshot) {
    await page.screenshot({ path: path.join(EVIDENCE, "he-tour-help-step-two-paragraphs.png") });
  }
  // dismiss tour chrome before the clean page screenshot
  await page.evaluate(() => { if (window.Tour && window.Tour._endTour) window.Tour._endTour(); document.querySelectorAll("[data-tour-chrome]").forEach(n => n.remove()); });

  if (screenshot) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: path.join(EVIDENCE, "he-help-page.png"), fullPage: true });
  }
}

// Ben UAT (42.1-10 Task 3): under dir=rtl the COLLAPSED help-card chevron must be
// mirrored (point left, away from the Hebrew text); the EXPANDED state must be
// unchanged (point down), and the LTR states must be untouched. Falsifiable
// computed-transform assertions on a real card in both engines. Re-navigates for
// a clean, default-collapsed DOM (verifyHelp force-opens cards + mutates chrome).
async function verifyChevron(engine, page, base, screenshot) {
  await page.goto(base + "/help.html", { waitUntil: "networkidle" });
  await page.waitForSelector("#helpCards .help-card .chev", { timeout: 15000 });

  const chev = await page.evaluate(() => {
    function parseMatrix(t) {
      if (!t || t === "none") return null;
      const m = t.match(/matrix\(([^)]+)\)/);
      return m ? m[1].split(",").map((s) => parseFloat(s.trim())) : null;
    }
    const card = Array.from(document.querySelectorAll("#helpCards .help-card"))
      .find((c) => c.querySelector(".chev"));
    if (!card) return { found: false };
    const chevEl = card.querySelector(".chev");
    // Kill the .18s transform transition: a synchronous class toggle + immediate
    // getComputedStyle otherwise reads the MID-TRANSITION matrix, not the target.
    chevEl.style.transition = "none";
    const chevOf = () => {
      void chevEl.offsetWidth; // force reflow so the target transform resolves
      return getComputedStyle(chevEl).transform;
    };
    // RTL (page is he → dir=rtl): collapsed then expanded
    card.classList.remove("is-open");
    const rtlCollapsed = chevOf();
    card.classList.add("is-open");
    const rtlExpanded = chevOf();
    card.classList.remove("is-open");
    // LTR spot-check: flip <html> dir=ltr transiently, read both states, restore
    const html = document.documentElement;
    const prevDir = html.getAttribute("dir");
    html.setAttribute("dir", "ltr");
    const ltrCollapsed = chevOf();
    card.classList.add("is-open");
    const ltrExpanded = chevOf();
    card.classList.remove("is-open");
    html.setAttribute("dir", prevDir);
    chevEl.style.transition = "";
    return {
      found: true, rtlCollapsed, rtlExpanded, ltrCollapsed, ltrExpanded,
      m: {
        rc: parseMatrix(rtlCollapsed), re: parseMatrix(rtlExpanded),
        lc: parseMatrix(ltrCollapsed), le: parseMatrix(ltrExpanded),
      },
    };
  });
  const approx = (x, v) => x != null && Math.abs(x - v) < 0.01;
  // RTL collapsed = rotate(180deg) → matrix(-1,0,0,-1,0,0): mirrored, points LEFT
  check(engine, "help", "RTL collapsed chevron mirrored (rotate180 → points left)",
    chev.found && chev.m.rc && approx(chev.m.rc[0], -1) && approx(chev.m.rc[3], -1), chev.rtlCollapsed);
  // RTL expanded = rotate(90deg) → matrix(0,1,-1,0,0,0): points DOWN, unchanged
  check(engine, "help", "RTL expanded chevron points down (rotate90, unchanged)",
    chev.found && chev.m.re && approx(chev.m.re[0], 0) && approx(chev.m.re[1], 1), chev.rtlExpanded);
  // LTR collapsed = no mirror (transform:none, or identity matrix)
  check(engine, "help", "LTR collapsed chevron unchanged (no mirror)",
    chev.found && (chev.ltrCollapsed === "none" || (chev.m.lc && approx(chev.m.lc[0], 1) && approx(chev.m.lc[3], 1))), chev.ltrCollapsed);
  // LTR expanded = rotate(90deg): points down (regression guard)
  check(engine, "help", "LTR expanded chevron points down (rotate90)",
    chev.found && chev.m.le && approx(chev.m.le[0], 0) && approx(chev.m.le[1], 1), chev.ltrExpanded);

  if (screenshot) {
    await page.evaluate(() => {
      document.querySelectorAll("#helpCards .help-card.is-open").forEach((c) => c.classList.remove("is-open"));
      window.scrollTo(0, 0);
    });
    await page.screenshot({ path: path.join(EVIDENCE, "he-help-collapsed-chevrons.png") });
  }
}

async function verifyChangelog(engine, page, base, screenshot) {
  await page.goto(base + "/changelog.html", { waitUntil: "networkidle" });
  await page.waitForSelector("#changelogEntries", { timeout: 15000 });
  await page.waitForFunction(() => document.querySelectorAll("#changelogEntries *").length > 5, { timeout: 15000 });

  const dir = await page.evaluate(() => document.documentElement.getAttribute("dir"));
  check(engine, "changelog", "document dir=rtl", dir === "rtl", "dir=" + dir);

  const probe = await page.evaluate(() => {
    const root = document.getElementById("changelogEntries");
    const text = root ? root.textContent : "";
    const months = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
    const foundMonth = months.find(m => text.indexOf(m) !== -1) || null;
    return {
      hasHebrew: /[֐-׿]/.test(text),
      heartWall: text.indexOf("חומת הלב") !== -1,
      month: foundMonth,
      // changelog.js versionLabel() strips a trailing ".0" → renders "גרסה 1.3" etc.
      versions: ["1.3", "1.2", "1.1", "1.0"].filter(v => text.indexOf(v) !== -1),
    };
  });
  check(engine, "changelog", "entries render Hebrew prose", probe.hasHebrew);
  check(engine, "changelog", "localized Hebrew month word present", !!probe.month, probe.month);
  check(engine, "changelog", "known Hebrew term חומת הלב present", probe.heartWall);
  check(engine, "changelog", "full history versions present (1.3→1.0)", probe.versions.length === 4, probe.versions.join(","));

  if (screenshot) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: path.join(EVIDENCE, "he-changelog-page.png"), fullPage: true });
  }
}

(async () => {
  const server = await startServer();
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;
  console.log("Serving repo at " + base + "  → evidence: " + EVIDENCE + "\n");

  for (const engine of ["chromium", "webkit"]) {
    const browser = await PW[engine].launch();
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
    await context.addInitScript(INIT);
    const page = await context.newPage();
    page.on("pageerror", (e) => console.log(`[${engine}] pageerror: ${e.message}`));
    const shoot = engine === "chromium"; // deterministic screenshots from Chromium
    try {
      await verifyHelp(engine, page, base, shoot);
      await verifyChevron(engine, page, base, shoot);
      await verifyChangelog(engine, page, base, shoot);
    } catch (e) {
      check(engine, "-", "harness ran without throwing", false, e.message);
    }
    await browser.close();
  }

  server.close();

  const failed = results.filter(r => !r.pass);
  console.log(`\n=== ${results.length - failed.length}/${results.length} checks passed ===`);
  if (failed.length) {
    console.log("FAILED:");
    failed.forEach(f => console.log(`  [${f.engine}] ${f.page} :: ${f.name} (${f.detail})`));
    process.exit(1);
  }
  console.log("ALL RENDER CHECKS PASSED");
  process.exit(0);
})();
