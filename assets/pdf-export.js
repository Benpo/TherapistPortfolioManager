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
 *     1. ./assets/jspdf.min.js                        -> window.jspdf.jsPDF
 *     2. ./assets/fonts/noto-sans-base64.js           -> window.NotoSans (base64 TTF)
 *     3. ./assets/fonts/noto-sans-hebrew-base64.js    -> window.NotoSansHebrew (base64 TTF)
 *   Subsequent calls reuse the loaded scripts (no double-load) via a cached Promise
 *   plus a _depsLoaded flag.
 *
 * Window globals consumed (after lazy-load):
 *   - window.jspdf.jsPDF       (UMD constructor from jspdf.min.js)
 *   - window.NotoSans          (Latin + Latin Extended subset, base64)
 *   - window.NotoSansHebrew    (Hebrew block + presentation forms, base64)
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
        progress('loading-fonts');
        return loadScriptOnce('./assets/fonts/noto-sans-base64.js');
      }).then(function () {
        return loadScriptOnce('./assets/fonts/noto-sans-hebrew-base64.js');
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
  // registerFonts -- attach Noto Sans + Noto Sans Hebrew TTFs to a jsPDF doc
  // ---------------------------------------------------------------------------

  /**
   * Register both Noto Sans (Latin + Extended) and Noto Sans Hebrew with the
   * jsPDF document via addFileToVFS + addFont. Per the jsPDF basic.html
   * example pattern. Safe to call when one of the globals is missing
   * (e.g., in a malformed test harness) -- only registers what is present.
   */
  function registerFonts(doc) {
    if (typeof window.NotoSans === "string" && window.NotoSans.length > 0) {
      doc.addFileToVFS("NotoSans.ttf", window.NotoSans);
      doc.addFont("NotoSans.ttf", "NotoSans", "normal");
    }
    if (typeof window.NotoSansHebrew === "string" && window.NotoSansHebrew.length > 0) {
      doc.addFileToVFS("NotoSansHebrew.ttf", window.NotoSansHebrew);
      doc.addFont("NotoSansHebrew.ttf", "NotoSansHebrew", "normal");
    }
  }

  // ---------------------------------------------------------------------------
  // isRtl -- Hebrew character detection (per-line heuristic, good enough for v1)
  // ---------------------------------------------------------------------------

  /**
   * Return true if the input contains any character in the Hebrew Unicode
   * block U+0590-U+05FF or the Hebrew presentation forms U+FB1D-U+FB4F.
   * Used to decide which font to set + whether to call setR2L(true) for the
   * line being rendered. Mixed-language documents (Hebrew heading + English
   * body) are handled per-line.
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
          items.push(lines[i].replace(/^\s*(?:[-*]|\d+\.)\s+/, ""));
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
      blocks.push({ type: 'para', text: paraLines.join(" ") });
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

      // -----------------------------------------------------------------------
      // Layout constants (in pt -- A4 portrait)  -- per D-05, D-06, D-07
      // -----------------------------------------------------------------------
      var PAGE_W = 595;
      var PAGE_H = 842;
      var MARGIN_X = 56;
      var MARGIN_TOP = 64;
      var MARGIN_BOTTOM = 64;
      var USABLE_W = PAGE_W - 2 * MARGIN_X; // 483 pt
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

      function applyFontFor(line) {
        if (isRtl(line)) {
          doc.setFont("NotoSansHebrew", "normal");
          doc.setR2L(true);
        } else {
          doc.setFont("NotoSans", "normal");
          doc.setR2L(false);
        }
      }

      function drawTextLine(line, y, size) {
        applyFontFor(line);
        doc.setFontSize(size);
        var x = isRtl(line) ? (PAGE_W - MARGIN_X) : MARGIN_X;
        doc.text(line, x, y);
      }

      // -----------------------------------------------------------------------
      // drawPageHeader -- full header on page 1; running header on pages 2+
      // -----------------------------------------------------------------------

      function drawPage1Header() {
        // Title: client name (16pt bold-weight; we only registered "normal", so
        // jsPDF will simulate bold via stroke. That is acceptable for v1; the
        // user can revisit if it looks too heavy).
        var titleY = MARGIN_TOP;
        applyFontFor(clientName);
        doc.setFontSize(TITLE_SIZE);
        var titleX = isRtl(clientName) ? (PAGE_W - MARGIN_X) : MARGIN_X;
        doc.text(clientName || " ", titleX, titleY);

        // Meta line: "{sessionDate} - {sessionType}"
        var metaText = [sessionDateDisplay, sessionType].filter(function (s) {
          return s && String(s).length > 0;
        }).join("  -  ");
        var metaY = titleY + LINE_HEIGHT_TITLE;
        if (metaText.length > 0) {
          drawTextLine(metaText, metaY, META_SIZE);
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
        var x = isRtl(text) ? (PAGE_W - MARGIN_X) : MARGIN_X;
        doc.text(text, x, RUNNING_HEADER_Y);
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
                // RTL list: bullet on the right edge, indent inward
                var rtlX = PAGE_W - MARGIN_X;
                if (wi === 0) {
                  doc.text("- " + wrapped[wi], rtlX, y);
                } else {
                  doc.text(wrapped[wi], rtlX - 14, y);
                }
              } else {
                if (wi === 0) {
                  doc.text("- " + wrapped[wi], MARGIN_X, y);
                } else {
                  doc.text(wrapped[wi], MARGIN_X + 14, y);
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
        // Footer is always Latin (page number), so fix font + LTR for it
        doc.setFont("NotoSans", "normal");
        doc.setR2L(false);
        doc.setFontSize(META_SIZE);
        var label = "Page " + pn + " of " + totalPages;
        // Center: jsPDF text "align" option requires a maxWidth; we use a
        // simple manual centering instead, since we know the line is short.
        var approxWidth = doc.getStringUnitWidth(label) * META_SIZE;
        var fx = (PAGE_W - approxWidth) / 2;
        doc.text(label, fx, FOOTER_BASELINE_Y);
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
