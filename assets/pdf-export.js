/**
 * pdf-export.js -- PDF generation module
 *
 * Builds a client-facing PDF from a session record + edited markdown.
 * Encapsulates jsPDF + Noto Sans / Noto Sans Hebrew base64 fonts.
 *
 * Exposes: window.PDFExport
 *
 * Lazy-load contract:
 *   The first call to buildSessionPDF() loads three scripts dynamically:
 *     1. ./assets/jspdf.min.js                -> window.jspdf.jsPDF
 *     2. ./assets/bidi.min.js                 -> window.bidi_js (UMD factory; Phase 23)
 *     3. ./assets/fonts/heebo-base64.js       -> window.Heebo (base64 TTF, unified Hebrew+Latin)
 *   Subsequent calls reuse the loaded scripts (no double-load) via a cached Promise
 *   plus a _depsLoaded flag.
 *
 * Window globals consumed (after lazy-load):
 *   - window.jspdf.jsPDF   (UMD constructor from jspdf.min.js)
 *   - window.bidi_js       (UMD factory from bidi.min.js, Phase 23)
 *   - window.Heebo         (Heebo Regular base64 TTF -- single font covers Hebrew + Latin
 *                           after Phase 23 Plan 23-07 hot-fix; replaced two prior
 *                           single-script Noto fonts which silently dropped glyphs on
 *                           mixed-script lines)
 *
 * Page layout (per CONTEXT D-05/06/07, UI-SPEC PDF Document Typography):
 *   A4 portrait 595 x 842 pt; body 11pt; section heading 14pt bold; meta 10pt;
 *   running header on pages 2+; "Page X of Y" centered footer.
 *
 * Public API (per Plan 22-05 <interfaces>):
 *   buildSessionPDF(sessionData, opts) -> Promise<Blob>   (application/pdf)
 *   slugify(name) -> string             (D-04 amended 2026-04-28; Unicode-preserving)
 *   triggerDownload(blob, filename) -> void   (verbatim mirror of backup.js)
 *
 * Filename pattern (built by the consumer): {slugify(clientName)}_{YYYY-MM-DD}.pdf
 *   Examples: Joerg_2026-04-27.pdf, {hebrew-name}_2026-04-27.pdf, "Anna M._2026-04-27.pdf"
 */

window.PDFExport = (function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // Module-private state -- lazy-load gate + cached promise
  // ---------------------------------------------------------------------------

  var _depsLoaded = false;
  var _loadingPromise = null;
  var _bidi = null;   // Phase 23 (D1): cached bidi-js factory output. Initialized in ensureDeps after loadScriptOnce('./assets/bidi.min.js') resolves (G9 -- must NOT be initialized at module-eval time, window.bidi_js does not exist yet).

  // ---------------------------------------------------------------------------
  // loadScriptOnce -- mirrors the dynamic-script pattern at assets/app.js:344-347
  // ---------------------------------------------------------------------------

  /**
   * Append a <script src="..."> tag to document.body and resolve when it loads.
   * Returns immediately (resolved Promise) if a script tag with the same src
   * already exists in the document.
   */
  function loadScriptOnce(src) {
    return new Promise(function (resolve, reject) {
      // Already in DOM? (Either previously loaded by us or hardcoded in HTML.)
      var existing = document.querySelector('script[src="' + src + '"]');
      if (existing) {
        resolve();
        return;
      }
      var s = document.createElement('script');
      s.src = src;
      s.async = false; // preserve append order so dependent scripts load in sequence
      s.onload = function () { resolve(); };
      s.onerror = function () {
        reject(new Error('PDFExport: failed to load script ' + src));
      };
      document.body.appendChild(s);
    });
  }

  // ---------------------------------------------------------------------------
  // ensureDeps -- promise-cached lazy loader (jsPDF + 2 fonts)
  // ---------------------------------------------------------------------------

  /**
   * On first call, append the three vendored scripts and resolve when all
   * three globals are present. On subsequent calls, return immediately.
   *
   * If a load is in flight when a second call arrives, both calls await the
   * same promise (no double-fetch).
   */
  function ensureDeps(opts) {
    if (_depsLoaded) return Promise.resolve();
    if (_loadingPromise) return _loadingPromise;

    _loadingPromise = (function () {
      function progress(phase) {
        if (opts && typeof opts.onProgress === 'function') {
          try { opts.onProgress(phase); } catch (_) { /* swallow consumer errors */ }
        }
      }
      progress('loading-lib');
      return loadScriptOnce('./assets/jspdf.min.js').then(function () {
        // Phase 23 (D1) -- bidi-js is part of the "library" phase, before fonts. Per RESEARCH 'Performance / Lazy-Load Notes': order doesn't matter functionally (bidi has no deps on fonts), but grouping libs together keeps the progress phases semantically clean.
        return loadScriptOnce('./assets/bidi.min.js');
      }).then(function () {
        // Phase 23 (D1, G9) -- invoke the bidi-js factory ONCE the script is loaded and cache the result module-level. window.bidi_js is the UMD attachment from assets/bidi.min.js. Calling it earlier (e.g. at module-eval time, before loadScriptOnce resolves) throws TypeError.
        _bidi = window.bidi_js();
        progress('loading-fonts');
        // Plan 23-07: single unified Heebo font (replaces noto-sans + noto-sans-hebrew).
        return loadScriptOnce('./assets/fonts/heebo-base64.js');
      }).then(function () {
        _depsLoaded = true;
      });
    })();

    return _loadingPromise;
  }

  // ---------------------------------------------------------------------------
  // slugify -- D-04 (amended 2026-04-28): Unicode-preserving filename sanitizer
  // ---------------------------------------------------------------------------

  /**
   * D-04 (amended 2026-04-28): preserve client name as-is including Unicode
   * (Hebrew, German diacritics, Czech diacritics -- all modern OSes support
   * Unicode filenames). Strip ONLY the union of Windows + macOS + Linux
   * reserved filename characters: < > : " / \ | ? * and ASCII control codes
   * 0-31. Trim trailing dots/whitespace (Windows quirk). Trim leading
   * whitespace. Fall back to "Session" if the result is empty.
   *
   * Test cases (manual verification):
   *   slugify("Anna M.")    === "Anna M."
   *   slugify("Joerg")      === "Joerg"
   *   slugify("{hebrew}")   === "{hebrew}"   (Hebrew chars preserved)
   *   slugify("Jane/Joerg") === "JaneJoerg"
   *   slugify("???")        === "Session"
   *   slugify("foo.")       === "foo"        (trailing dot stripped)
   *   slugify("  foo  ")    === "foo"
   *   slugify("")           === "Session"
   */
  function slugify(name) {
    if (typeof name !== "string") return "Session";
    // Strip OS-reserved chars: < > : " / \ | ? * and ASCII control 0-31
    var stripped = name.replace(/[<>:"\/\\|?*\x00-\x1F]/g, "");
    // Trim trailing dots and whitespace (Windows quirk)
    stripped = stripped.replace(/[.\s]+$/, "");
    // Trim leading whitespace
    stripped = stripped.replace(/^\s+/, "");
    // Fall back to "Session" if nothing left
    return stripped.length > 0 ? stripped : "Session";
  }

  // ---------------------------------------------------------------------------
  // triggerDownload -- verbatim from assets/backup.js:429-441 (Pattern 7)
  // ---------------------------------------------------------------------------

  /**
   * Trigger a browser file-download for the given Blob.
   * Mirrors backup.js triggerDownload exactly (minus the localStorage
   * portfolioLastExport write, which is backup-specific).
   */
  function triggerDownload(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 10000);
  }

  // ---------------------------------------------------------------------------
  // registerFonts -- attach Heebo (unified Hebrew + Latin) TTF to a jsPDF doc
  // ---------------------------------------------------------------------------

  /**
   * Register Heebo Regular with the jsPDF document via addFileToVFS + addFont.
   * Per the jsPDF basic.html example pattern. Safe to call when window.Heebo
   * is missing (e.g., in a malformed test harness) -- registers only when
   * present.
   *
   * Plan 23-07: unified Heebo replaced the prior pair of single-script Noto
   * fonts. Those fonts silently dropped glyphs on lines that mixed Hebrew
   * with Latin chars. Heebo covers both scripts in one TTF.
   */
  function registerFonts(doc) {
    if (typeof window.Heebo === "string" && window.Heebo.length > 0) {
      doc.addFileToVFS("Heebo.ttf", window.Heebo);
      doc.addFont("Heebo.ttf", "Heebo", "normal");
    }
  }

  // ---------------------------------------------------------------------------
  // firstStrongDir + shapeForJsPdf -- Phase 23 (D1, D2): UAX #9 bidi pre-shape
  // ---------------------------------------------------------------------------
  //
  // Two helpers added in Phase 23 to convert logical-order strings (the order
  // therapists type them in) into visual-order strings (the order jsPDF needs
  // to write glyphs to the PDF positionally). Without this, Hebrew lines come
  // out reversed and Hebrew+Latin/digit lines have their LTR runs in the wrong
  // position. Built on the vendored bidi-js@1.0.3 library (./assets/bidi.min.js,
  // landed by Plan 23-01). See 23-RESEARCH.md section "Worked example" for
  // the empirical verification against the 12 phase test vectors.
  //
  // CRITICAL G2: shapeForJsPdf operates on text.split('') -- UTF-16 code units --
  // NOT on [...text] / Array.from(text) which split by codepoint. bidi-js's
  // getEmbeddingLevels / getReorderSegments return UTF-16-indexed segments;
  // the array we mutate MUST share the same indexing or surrogate-pair characters
  // (emoji, supplementary-plane Hebrew) break. Test vector #11 catches this.

  /**
   * Phase 23 (D2): paragraph base direction from first strong directional char.
   * Implements UAX #9 HL2 (matches HTML/CSS dir="auto" behaviour). Returns
   * 'ltr' on empty input or no strong char (default per HL2).
   */
  function firstStrongDir(text) {
    if (!text) return 'ltr';
    for (var i = 0; i < text.length; i++) {
      var t = _bidi.getBidiCharTypeName(text[i]);
      if (t === 'L') return 'ltr';
      if (t === 'R' || t === 'AL') return 'rtl';
    }
    return 'ltr';
  }

  /**
   * Phase 23 (D1): logical-order string -> visual-order string for doc.text().
   *
   * Operates on UTF-16 code units (text.split(''), NOT [...text] / Array.from(text)
   * -- see G2 / test vector #11). Calls bidi-js for:
   *   1. embedding levels per code unit (UAX #9 paragraph + character types)
   *   2. reorder segments to reverse (UAX-L2 -- runs at odd levels flip in place)
   *   3. mirror map for paired brackets in RTL runs (UAX-BD16)
   *
   * Returns the visual-order string. Empty input -> empty output.
   */
  function shapeForJsPdf(text) {
    if (!text) return '';
    var dir = firstStrongDir(text);
    var levels = _bidi.getEmbeddingLevels(text, dir);
    var flips = _bidi.getReorderSegments(text, levels);
    var mirrorMap = _bidi.getMirroredCharactersMap(text, levels);
    var chars = text.split(''); // UTF-16 code units; matches bidi-js indices (G2)
    mirrorMap.forEach(function (mirroredChar, idx) {
      chars[idx] = mirroredChar;
    });
    for (var fi = 0; fi < flips.length; fi++) {
      var start = flips[fi][0];
      var end = flips[fi][1];
      var slice = chars.slice(start, end + 1).reverse();
      for (var i = start; i <= end; i++) chars[i] = slice[i - start];
    }
    return chars.join('');
  }

  // ---------------------------------------------------------------------------
  // isRtl -- Hebrew character detection (per-line heuristic, good enough for v1)
  // ---------------------------------------------------------------------------

  /**
   * Return true if the input contains any character in the Hebrew Unicode
   * block U+0590-U+05FF or the Hebrew presentation forms U+FB1D-U+FB4F.
   * Used to decide which x-anchor to use (right margin vs left margin) for
   * the line being rendered. Mixed-language documents (Hebrew heading +
   * English body) are handled per-line.
   * Phase 23: bidi reordering is now handled by shapeForJsPdf() — this
   * function no longer drives any direction-reversal call (jsPDF's
   * direction flag is no longer used; see G1 in 23-RESEARCH.md).
   * Plan 23-07: this function previously also drove the per-line font switch
   * between two single-script Noto fonts. The unified Heebo font now covers
   * both scripts, so isRtl() is no longer consulted by applyFontFor(); the
   * RTL anchor decision in drawTextLine and friends remains the only caller.
   */
  function isRtl(text) {
    return /[\u0590-\u05FF\uFB1D-\uFB4F]/.test(text || "");
  }

  // ---------------------------------------------------------------------------
  // parseMarkdown -- minimal block parser (heading / list / paragraph)
  // ---------------------------------------------------------------------------

  /**
   * Split markdown into structural blocks for PDF rendering. We do NOT need
   * full markdown rendering here -- only the structural identification that
   * tells us which font size + emphasis to use. md-render.js (Plan 22-03)
   * handles the on-screen HTML preview; this is the print-side pipeline.
   *
   * Supported block types:
   *   - heading  ({ type: 'heading', level: 1|2|3, text: string })
   *   - list     ({ type: 'list', items: string[] })
   *   - para     ({ type: 'para', text: string })
   *   - blank    ({ type: 'blank' })  // collapsed run of empty lines -> paragraph break
   */
  function stripInlineMarkdown(text) {
    // Phase 23 (23-08): strip inline ** and * markers so they don't display
    // literally. Bold/italic styling is NOT rendered (would need Heebo Bold +
    // per-segment font switching — deferred). This is the minimum-viable fix
    // to remove the ugly literal asterisks from the output.
    return text
      .replace(/\*\*([^*\n]+?)\*\*/g, '$1')   // bold: **X** -> X
      .replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, '$1$2');  // italic: *X* -> X (avoid matching ** runs)
  }

  function parseMarkdown(markdown) {
    var lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n");
    var blocks = [];
    var i = 0;
    while (i < lines.length) {
      var line = lines[i];
      if (/^\s*$/.test(line)) {
        blocks.push({ type: 'blank' });
        i++;
        continue;
      }
      var hMatch = /^(#{1,3})\s+(.+?)\s*$/.exec(line);
      if (hMatch) {
        blocks.push({
          type: 'heading',
          level: hMatch[1].length,
          text: hMatch[2]
        });
        i++;
        continue;
      }
      // List: contiguous lines beginning with "- " or "* " or "1. " etc.
      if (/^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
        var items = [];
        while (i < lines.length && (/^\s*[-*]\s+/.test(lines[i]) || /^\s*\d+\.\s+/.test(lines[i]))) {
          // Phase 23 (23-08): strip inline ** and * markers from list items
          // so the asterisks don't display literally.
          items.push(stripInlineMarkdown(lines[i].replace(/^\s*(?:[-*]|\d+\.)\s+/, "")));
          i++;
        }
        blocks.push({ type: 'list', items: items });
        continue;
      }
      // Paragraph: collect contiguous non-empty, non-heading, non-list lines.
      var paraLines = [line];
      i++;
      while (
        i < lines.length &&
        !/^\s*$/.test(lines[i]) &&
        !/^#{1,3}\s+/.test(lines[i]) &&
        !/^\s*[-*]\s+/.test(lines[i]) &&
        !/^\s*\d+\.\s+/.test(lines[i])
      ) {
        paraLines.push(lines[i]);
        i++;
      }
      // Phase 23 (23-08): strip inline ** and * markers from paragraph text
      // so the asterisks don't display literally.
      blocks.push({ type: 'para', text: stripInlineMarkdown(paraLines.join(" ")) });
    }
    return blocks;
  }

  // ---------------------------------------------------------------------------
  // formatDate -- per-language YYYY-MM-DD or locale-formatted display string
  // ---------------------------------------------------------------------------

  /**
   * sessionDate may already be a pre-formatted display string (from the
   * caller) or an ISO date. If it's an ISO date, format it for the UI
   * language; otherwise pass through unchanged.
   */
  function formatDate(sessionDate, uiLang) {
    if (!sessionDate) return "";
    // ISO YYYY-MM-DD detection
    var iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(sessionDate);
    if (!iso) return String(sessionDate);
    try {
      var d = new Date(sessionDate + "T00:00:00");
      if (isNaN(d.getTime())) return String(sessionDate);
      var locale = (uiLang === 'he') ? 'he-IL'
                : (uiLang === 'de') ? 'de-DE'
                : (uiLang === 'cs') ? 'cs-CZ'
                : 'en-GB';
      return d.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (_) {
      return String(sessionDate);
    }
  }

  // ---------------------------------------------------------------------------
  // buildSessionPDF -- main entry: takes session metadata + markdown, returns Blob
  // ---------------------------------------------------------------------------

  /**
   * Build an A4 portrait PDF of the edited session document.
   *
   * @param {Object} sessionData
   * @param {string} sessionData.clientName
   * @param {string} sessionData.sessionDate     ISO date or pre-formatted string
   * @param {string} sessionData.sessionType     localized label (Clinic/Online/Other)
   * @param {string} sessionData.markdown        edited document body
   * @param {Object} opts
   * @param {string} opts.uiLang                 "en" | "de" | "he" | "cs"
   * @param {Function} [opts.onProgress]         callback receiving phase strings
   * @returns {Promise<Blob>}                    application/pdf blob
   */
  function buildSessionPDF(sessionData, opts) {
    opts = opts || {};
    sessionData = sessionData || {};

    return ensureDeps(opts).then(function () {
      function progress(phase) {
        if (typeof opts.onProgress === 'function') {
          try { opts.onProgress(phase); } catch (_) { /* swallow consumer errors */ }
        }
      }
      progress('rendering');

      // jsPDF UMD attaches to window.jspdf with jsPDF constructor
      var jsPDF = window.jspdf && window.jspdf.jsPDF;
      if (typeof jsPDF !== 'function') {
        throw new Error('PDFExport: window.jspdf.jsPDF not found after lazy-load');
      }

      var doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
      registerFonts(doc);

      // Phase 23 (D4): pageWidth derived from jsPDF page-size API -- used by the
      // centered title-block draws below. The hard-coded PAGE_W constant (595)
      // stays for all OTHER consumers (USABLE_W, RTL right-margin anchor at
      // PAGE_W - MARGIN_X, footer centering math). For the locked A4 portrait
      // orientation, both values are 595pt -- equivalent, just self-documenting
      // at the centering call sites. See RESEARCH "jsPDF page-size API conveniences".
      var pageWidth = doc.internal.pageSize.getWidth();

      // -----------------------------------------------------------------------
      // Layout constants (in pt -- A4 portrait)  -- per D-05, D-06, D-07
      // -----------------------------------------------------------------------
      // Phase 23 (D3): A4-safe-zone margins -- 71pt = 25.06mm at 72dpi. Matches the
      // DE/EU office-software A4 default (LibreOffice / Word) and is within 1pt of
      // the US Letter 1-inch convention. Symmetric on all four sides. RESEARCH
      // section "A4 standard confirmed for DE primary locale" verifies the value.
      var PAGE_W = 595;
      var PAGE_H = 842;
      var MARGIN_X = 71;
      var MARGIN_TOP = 71;
      var MARGIN_BOTTOM = 71;
      var USABLE_W = PAGE_W - 2 * MARGIN_X; // 453 pt (was 483pt pre-Phase-23)
      var BODY_SIZE = 11;
      var HEADING_SIZE = 14;
      var META_SIZE = 10;
      var TITLE_SIZE = 16;
      var LINE_HEIGHT_BODY = 16;
      var LINE_HEIGHT_HEADING = 22;
      var LINE_HEIGHT_META = 14;
      var LINE_HEIGHT_TITLE = 22;
      var FOOTER_BASELINE_Y = PAGE_H - 32;
      var RUNNING_HEADER_Y = MARGIN_TOP - 24;

      var clientName = String(sessionData.clientName || "");
      var sessionDateDisplay = formatDate(sessionData.sessionDate, opts.uiLang);
      var sessionType = String(sessionData.sessionType || "");
      var markdown = String(sessionData.markdown || "");

      // -----------------------------------------------------------------------
      // Helpers -- font/direction switching + safe text rendering
      // -----------------------------------------------------------------------

      // Phase 23 (23-08) — every doc.text() call passes isInputVisual:false.
      // jsPDF's internal __bidiEngine__ runs when input contains RTL chars and
      // re-processes the string, double-reversing digit runs (UAX-L2 applied
      // twice). Setting isInputVisual:false tells jsPDF "do not re-shape this
      // text" and our shapeForJsPdf output goes through unchanged. Empirically
      // verified: VISUAL + isInputVisual:false produces "2026 ץרמב 24" on page
      // for the logical input "24 במרץ 2026" — i.e. the correct visual order.
      // The option is added to LTR-only call sites too (footer, plain Latin
      // body lines) for consistency and to prevent future regressions if those
      // strings ever contain RTL chars; it is a no-op for pure-LTR text.

      function applyFontFor(line) {
        // Phase 23 (G1): jsPDF's right-to-left flag is no longer set here.
        // That flag does a naive .split('').reverse().join('') on the string
        // it draws -- combining it with the bidi pre-shape would double-reverse.
        // Direction is now handled entirely by shapeForJsPdf().
        // Phase 23 (Plan 23-07): the per-line Latin-vs-Hebrew font switch
        // collapsed to a single setFont('Heebo'). The two prior single-script
        // Noto fonts dropped glyphs on mixed-script lines. Heebo is a unified
        // Hebrew+Latin font, so every line gets the same font regardless of
        // direction. The `line` parameter is intentionally unused now -- kept
        // for API stability with the (numerous) callers and for symmetry with
        // shapeForJsPdf(line) which DOES still use it.
        void line; // explicit no-op: argument kept for caller-API stability
        doc.setFont("Heebo", "normal");
      }

      function drawTextLine(line, y, size) {
        applyFontFor(line);
        doc.setFontSize(size);
        var visual = shapeForJsPdf(line); // Phase 23 (D1, D2): logical -> visual
        if (isRtl(line)) {
          // Phase 23 (23-06): right-anchor the visual string at the right margin.
          // jsPDF flows glyphs left-to-right from x; align: 'right' tells jsPDF the
          // x-coordinate is where the END of the string lands, so the line occupies
          // the page going leftward visually -- correct for shaped RTL text.
          doc.text(visual, PAGE_W - MARGIN_X, y, { align: 'right', isInputVisual: false });
        } else {
          doc.text(visual, MARGIN_X, y, { isInputVisual: false });
        }
      }

      // -----------------------------------------------------------------------
      // drawPageHeader -- full header on page 1; running header on pages 2+
      // -----------------------------------------------------------------------

      function drawPage1Header() {
        // Title: client name (16pt). Phase 23 (D4) -- horizontally centered on page 1.
        // The bidi pre-shape (shapeForJsPdf, from Plan 23-02) stays -- it produces
        // the visual-order string the centering math measures and renders.
        var titleY = MARGIN_TOP;
        applyFontFor(clientName);
        doc.setFontSize(TITLE_SIZE);
        var titleVisual = shapeForJsPdf(clientName || " "); // Phase 23 (D1, D2)
        doc.text(titleVisual, pageWidth / 2, titleY, { align: 'center', isInputVisual: false }); // Phase 23 (D4); 23-08 isInputVisual:false

        // Meta line: "{sessionDate} - {sessionType}". Phase 23 (D4) -- centered as
        // part of the title block. NOTE: drawTextLine is NOT used here because
        // drawTextLine forces the isRtl-flipped left/right anchor per D4's "body
        // content stays left/right-anchored" rule. The title block (this draw + the
        // title above) is the only centered region. Body paragraphs, lists, section
        // headings, and the running header on pages 2+ all keep using drawTextLine
        // and stay anchored per isRtl().
        var metaText = [sessionDateDisplay, sessionType].filter(function (s) {
          return s && String(s).length > 0;
        }).join("  -  ");
        var metaY = titleY + LINE_HEIGHT_TITLE;
        if (metaText.length > 0) {
          applyFontFor(metaText);
          doc.setFontSize(META_SIZE);
          var metaVisual = shapeForJsPdf(metaText); // Phase 23 (D1, D2)
          doc.text(metaVisual, pageWidth / 2, metaY, { align: 'center', isInputVisual: false }); // Phase 23 (D4); 23-08 isInputVisual:false
        }
        // Return the y cursor where body should begin
        return metaY + LINE_HEIGHT_META + 8;
      }

      function drawRunningHeader() {
        var bits = [clientName, sessionDateDisplay].filter(function (s) {
          return s && String(s).length > 0;
        });
        if (bits.length === 0) return;
        var text = bits.join("  -  ");
        applyFontFor(text);
        doc.setFontSize(META_SIZE);
        var visual = shapeForJsPdf(text); // Phase 23 (D1, D2)
        if (isRtl(text)) {
          // Phase 23 (23-06): right-anchor the visual string at the right margin
          // (same fix as drawTextLine -- without align:'right' the running header
          // would flow off the right edge for Hebrew sessions).
          doc.text(visual, PAGE_W - MARGIN_X, RUNNING_HEADER_Y, { align: 'right', isInputVisual: false });
        } else {
          doc.text(visual, MARGIN_X, RUNNING_HEADER_Y, { isInputVisual: false });
        }
      }

      // -----------------------------------------------------------------------
      // Render -- iterate parsed blocks; auto page-break on overflow
      // -----------------------------------------------------------------------

      var y = drawPage1Header();
      var blocks = parseMarkdown(markdown);

      function ensureRoom(neededHeight) {
        if (y + neededHeight > PAGE_H - MARGIN_BOTTOM) {
          doc.addPage();
          drawRunningHeader();
          y = MARGIN_TOP;
        }
      }

      for (var bi = 0; bi < blocks.length; bi++) {
        var block = blocks[bi];

        if (block.type === 'blank') {
          y += LINE_HEIGHT_BODY * 0.5;
          continue;
        }

        if (block.type === 'heading') {
          var hSize = (block.level === 1) ? HEADING_SIZE + 2
                    : (block.level === 2) ? HEADING_SIZE
                    : HEADING_SIZE - 2;
          ensureRoom(LINE_HEIGHT_HEADING);
          // Headings: do NOT splitTextToSize (we expect short headings); if
          // they do overflow, jsPDF will draw past the margin -- acceptable.
          drawTextLine(block.text, y, hSize);
          y += LINE_HEIGHT_HEADING;
          continue;
        }

        if (block.type === 'list') {
          for (var li = 0; li < block.items.length; li++) {
            var item = block.items[li];
            applyFontFor(item);
            doc.setFontSize(BODY_SIZE);
            var wrapped = doc.splitTextToSize(item, USABLE_W - 14);
            for (var wi = 0; wi < wrapped.length; wi++) {
              ensureRoom(LINE_HEIGHT_BODY);
              applyFontFor(wrapped[wi]);
              doc.setFontSize(BODY_SIZE);
              if (isRtl(wrapped[wi])) {
                // RTL list: bullet on the right edge, indent inward.
                // Phase 23 (23-06): align:'right' so jsPDF treats rtlX as the
                // end-of-string anchor and the visual line occupies the page
                // going leftward (continuation lines indent inward via rtlX-14).
                var rtlX = PAGE_W - MARGIN_X;
                if (wi === 0) {
                  // Phase 23 (D1, D2, Open Question #1): prefix-then-shape so the "-" participates in paragraph-direction inference and lands visually on the right edge.
                  var visualA = shapeForJsPdf("- " + wrapped[wi]);
                  doc.text(visualA, rtlX, y, { align: 'right', isInputVisual: false });
                } else {
                  var visualB = shapeForJsPdf(wrapped[wi]);
                  doc.text(visualB, rtlX - 14, y, { align: 'right', isInputVisual: false });
                }
              } else {
                if (wi === 0) {
                  var visualC = shapeForJsPdf("- " + wrapped[wi]);
                  doc.text(visualC, MARGIN_X, y, { isInputVisual: false });
                } else {
                  var visualD = shapeForJsPdf(wrapped[wi]);
                  doc.text(visualD, MARGIN_X + 14, y, { isInputVisual: false });
                }
              }
              y += LINE_HEIGHT_BODY;
            }
          }
          continue;
        }

        if (block.type === 'para') {
          applyFontFor(block.text);
          doc.setFontSize(BODY_SIZE);
          var paraLines = doc.splitTextToSize(block.text, USABLE_W);
          for (var pi = 0; pi < paraLines.length; pi++) {
            ensureRoom(LINE_HEIGHT_BODY);
            drawTextLine(paraLines[pi], y, BODY_SIZE);
            y += LINE_HEIGHT_BODY;
          }
          continue;
        }
      }

      // -----------------------------------------------------------------------
      // Footer pass -- "Page X of Y" centered, on every page
      // -----------------------------------------------------------------------

      var totalPages = doc.getNumberOfPages();
      for (var pn = 1; pn <= totalPages; pn++) {
        doc.setPage(pn);
        // Phase 23: footer is always Latin (page number) + LTR. jsPDF's RTL flag reset is no longer needed here -- no other code path enables that flag after Phase 23, so the reset is redundant (G1).
        // Plan 23-07: unified Heebo replaces the prior single-script Latin setFont call.
        doc.setFont("Heebo", "normal");
        doc.setFontSize(META_SIZE);
        var label = "Page " + pn + " of " + totalPages;
        // Phase 23 (23-05) -- centered via jsPDF's canonical horizontal-align API for consistency with the title-block centering introduced by 23-03. Equivalent to the previous manual (PAGE_W - textWidth) / 2 form. The pageWidth local was introduced by 23-03 and is in scope here.
        doc.text(label, pageWidth / 2, FOOTER_BASELINE_Y, { align: 'center', isInputVisual: false });
      }

      progress('done');

      // Return the PDF as a Blob (application/pdf MIME type per jsPDF)
      var blob = doc.output("blob");
      return blob;
    });
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  return {
    buildSessionPDF: buildSessionPDF,
    slugify: slugify,
    triggerDownload: triggerDownload
  };
})();
