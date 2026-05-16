/**
 * pdf-export.js -- PDF generation module
 *
 * Builds a client-facing PDF from a session record + edited markdown.
 * Encapsulates jsPDF + Noto Sans / Noto Sans Hebrew base64 fonts.
 *
 * Exposes: window.PDFExport
 *
 * Lazy-load contract:
 *   The first call to buildSessionPDF() loads four scripts dynamically:
 *     1. ./assets/jspdf.min.js                -> window.jspdf.jsPDF
 *     2. ./assets/bidi.min.js                 -> window.bidi_js (UMD factory; Phase 23)
 *     3. ./assets/fonts/heebo-base64.js       -> window.Heebo (base64 TTF, unified Hebrew+Latin)
 *     4. ./assets/fonts/heebo-bold-base64.js  -> window.HeeboBold (Phase 23-09: bold weight 700)
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
 *   - window.HeeboBold     (Heebo Bold 700 base64 TTF -- Phase 23-09; used for section
 *                           headings + page-1 client-name title)
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
        // Plan 23-09: Heebo Bold (weight 700) loaded after Regular -- used for
        // section headings + page-1 title rendering via setFont('Heebo', 'bold').
        return loadScriptOnce('./assets/fonts/heebo-bold-base64.js');
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
    // Plan 23-09: Heebo Bold registered as the SAME family ('Heebo') with style='bold'.
    // Then setFont('Heebo', 'bold') / setFont('Heebo', 'normal') swaps between the two
    // weights without touching the family name. Safe-no-op when window.HeeboBold is
    // missing (mirrors Regular branch above).
    if (typeof window.HeeboBold === "string" && window.HeeboBold.length > 0) {
      doc.addFileToVFS("HeeboBold.ttf", window.HeeboBold);
      doc.addFont("HeeboBold.ttf", "Heebo", "bold");
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
   * Phase 23 (23-12): bracket mirroring (UAX-BD16) is RESTORED. After Sapir's
   * UAT iteration, native Hebrew readers preferred standard UAX-BD16 mirroring
   * (matches Word and dir="rtl" browsers) over the 23-11 "type-as-displayed"
   * variant. Reverting 23-11's removal: Sapir's UAT preference matches standard
   * UAX-BD16 for native Hebrew readers. See 23-RESEARCH G3 (mirroring is a
   * visual feature of the script, not a bug).
   *
   * Returns the visual-order string. Empty input -> empty output.
   */
  function shapeForJsPdf(text) {
    if (!text) return '';
    var dir = firstStrongDir(text);
    var levels = _bidi.getEmbeddingLevels(text, dir);
    var flips = _bidi.getReorderSegments(text, levels);
    // G16 (Plan 23-12): getMirroredCharactersMap indexes its second arg as
    // a raw Uint8Array (1 & e[v]), so it MUST receive levels.levels, NOT the
    // wrapper object. Passing the wrapper silently returns an empty Map -- this
    // is the bug that made the pre-23-11 mirror restoration a no-op. Verified
    // against bidi-js source: getReorderSegments uses e.paragraphs/e.levels
    // (wrapper-aware), getMirroredCharactersMap uses e[v] (raw-array).
    var mirrorMap = _bidi.getMirroredCharactersMap(text, levels.levels);
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

  /**
   * Phase 23 (23-12): extended shape function exposing the logical→visual map.
   *
   * Returns `{ visual: string, logicalToVisualMap: Int32Array, visualToLogicalMap: Int32Array }`.
   *   - visual: the same string shapeForJsPdf would return (UAX-L2 reorder +
   *     UAX-BD16 mirror applied to UTF-16 code units; see G2 / G16 for the
   *     code-unit indexing invariant).
   *   - logicalToVisualMap[logicalIdx] = visualIdx
   *   - visualToLogicalMap[visualIdx]  = logicalIdx  (this is bidi-js's
   *     `getReorderedIndices` output directly; kept for callers that walk
   *     visual positions left-to-right.)
   *
   * Built atop bidi-js's `getReorderedIndices` primitive — see assets/bidi.min.js.
   * Per the API quirk documented at G16:
   *   - getReorderedIndices       expects the WRAPPER object (uses .paragraphs)
   *   - getMirroredCharactersMap  expects the RAW Uint8Array (uses 1&e[v])
   * Passing the wrong shape to either fails silently with empty/undefined results.
   *
   * Empty input -> { visual: '', logicalToVisualMap: empty, visualToLogicalMap: empty }.
   */
  function shapeForJsPdfWithMap(text) {
    if (!text) {
      return {
        visual: '',
        logicalToVisualMap: new Int32Array(0),
        visualToLogicalMap: new Int32Array(0),
      };
    }
    var dir = firstStrongDir(text);
    var levels = _bidi.getEmbeddingLevels(text, dir);
    var mirrorMap = _bidi.getMirroredCharactersMap(text, levels.levels);   // G16 raw
    var reordered = _bidi.getReorderedIndices(text, levels);               // G16 wrapper
    var chars = text.split(''); // UTF-16 code units (G2)
    mirrorMap.forEach(function (mirroredChar, idx) {
      chars[idx] = mirroredChar;
    });
    var n = chars.length;
    var logicalToVisualMap = new Int32Array(n);
    var visualToLogicalMap = new Int32Array(n);
    var visualChars = new Array(n);
    for (var vp = 0; vp < n; vp++) {
      var logI = reordered[vp];
      visualToLogicalMap[vp] = logI;
      logicalToVisualMap[logI] = vp;
      visualChars[vp] = chars[logI];
    }
    return {
      visual: visualChars.join(''),
      logicalToVisualMap: logicalToVisualMap,
      visualToLogicalMap: visualToLogicalMap,
    };
  }

  // ---------------------------------------------------------------------------
  // (removed) isRtl -- Phase 23 (23-10) deadcode cleanup
  // ---------------------------------------------------------------------------
  //
  // Previously a per-line "does this line contain Hebrew?" predicate that drove
  // the x-anchor decision in drawTextLine / drawRunningHeader / list rendering.
  // Plan 23-10 moved the anchor decision to document-level docDir (derived from
  // opts.uiLang inside buildSessionPDF) so anchors stay uniform across mixed-
  // script content. With no remaining callers in this module the function was
  // removed. Per-line direction inference still happens inside shapeForJsPdf via
  // firstStrongDir() (UAX #9 HL2) -- that's where the inline bidi reordering
  // anchor is decided, separate from the x-anchor.

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
    // literally. Phase 23 (23-12): for para and list paths, the strip step is
    // REPLACED by parseInlineBold (which preserves bold runs as Heebo Bold).
    // This helper is retained for paths that DO NOT support inline bold:
    //   - heading branch entry (whole heading renders bold; inline `**`
    //     markers stripped to avoid literal `**` display)
    //   - any future caller that needs a markdown-marker-free plain string
    //     (e.g. running-header / title-block code paths if the client name
    //     ever contains `**`).
    return text
      .replace(/\*\*([^*\n]+?)\*\*/g, '$1')   // bold: **X** -> X
      .replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, '$1$2');  // italic: *X* -> X (avoid matching ** runs)
  }

  /**
   * Phase 23 (23-12): parse inline bold markers `**X**` into segments suitable
   * for per-segment font-weight rendering. Italic `*X*` markers are STRIPPED
   * (their content is folded into the surrounding regular-weight segment, no
   * italic rendering — italic support is out of scope for Plan 23-12).
   *
   * Returns an array of `{text: string, bold: boolean}` segments. Adjacent
   * segments may share the same `bold` flag (the renderer collapses runs at
   * draw time after bidi reorder). Empty input returns [].
   *
   * INVARIANT (relied on by drawSegmentedLine):
   *   parseInlineBold(input).map(function (s) { return s.text; }).join('')
   *     === stripInlineMarkdown(input)
   * i.e. concatenating all segment texts yields the strip-equivalent plain
   * string byte-for-byte. The renderer walks segments with a running offset
   * derived from segment.text.length to recover logical positions.
   *
   * Examples:
   *   parseInlineBold('The **summary** is below.')
   *     -> [{text:'The ',     bold:false},
   *         {text:'summary',  bold:true},
   *         {text:' is below.', bold:false}]
   *
   *   parseInlineBold('הסיכום **מודגש** כאן.')
   *     -> [{text:'הסיכום ',  bold:false},
   *         {text:'מודגש',    bold:true},
   *         {text:' כאן.',    bold:false}]
   *
   *   parseInlineBold('**important** דבר חשוב')
   *     -> [{text:'important', bold:true},
   *         {text:' דבר חשוב', bold:false}]
   *
   *   parseInlineBold('plain text')   -> [{text:'plain text', bold:false}]
   *   parseInlineBold('')             -> []
   *
   * The function deliberately omits `logicalStart` / `logicalEnd` fields:
   * downstream code derives any logical position by accumulating prior
   * segments' `.text.length` values. Explicit indices would duplicate state
   * and risk drifting from `splitTextToSize`'s wrapped sub-line boundaries.
   */
  function parseInlineBold(text) {
    if (!text) return [];
    var segments = [];
    var n = text.length;
    var i = 0;
    var buf = '';
    while (i < n) {
      // Bold open: `**X**` (greedy-but-shortest match, single line)
      if (text.charCodeAt(i) === 42 && text.charCodeAt(i + 1) === 42) {
        // Find closing `**` on the same line (no \n inside the bold span)
        var close = -1;
        for (var k = i + 2; k < n - 1; k++) {
          if (text.charCodeAt(k) === 10) break;            // newline: abort
          if (text.charCodeAt(k) === 42 && text.charCodeAt(k + 1) === 42) {
            close = k;
            break;
          }
        }
        if (close > i + 2) {
          // Emit pending regular buffer.
          if (buf.length > 0) {
            segments.push({ text: buf, bold: false });
            buf = '';
          }
          var inner = text.slice(i + 2, close);
          // Strip italic markers inside the bold span (no italic rendering).
          inner = inner.replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, '$1$2');
          segments.push({ text: inner, bold: true });
          i = close + 2;
          continue;
        }
        // Unmatched `**` — fall through to literal handling.
      }
      // Italic single `*X*`: strip but DO NOT emit an italic segment — content
      // is folded into the surrounding regular buffer.
      if (text.charCodeAt(i) === 42 && text.charCodeAt(i + 1) !== 42 &&
          (i === 0 || text.charCodeAt(i - 1) !== 42)) {
        var iclose = -1;
        for (var ki = i + 1; ki < n; ki++) {
          if (text.charCodeAt(ki) === 10) break;
          if (text.charCodeAt(ki) === 42 && text.charCodeAt(ki + 1) !== 42) {
            iclose = ki;
            break;
          }
        }
        if (iclose > i + 1) {
          buf += text.slice(i + 1, iclose);
          i = iclose + 1;
          continue;
        }
        // Unmatched `*` — fall through to literal handling.
      }
      buf += text.charAt(i);
      i++;
    }
    if (buf.length > 0) segments.push({ text: buf, bold: false });
    return segments;
  }

  /**
   * Phase 23 (23-12): clip a segment array to a logical character range.
   *
   * Given segments produced by parseInlineBold on the full paragraph and a
   * [startIdx, endIdx) range in the STRIPPED-text coordinate space (i.e.,
   * positions in `segments.map(s=>s.text).join('')`), return a new segment
   * array whose concatenation equals stripped.slice(startIdx, endIdx). The
   * bold-flag pattern is preserved across the slice.
   *
   * Used by the para and list renderers to map splitTextToSize's wrapped
   * sub-lines back onto the parent paragraph's bold-segment structure.
   *
   * Examples:
   *   var segs = parseInlineBold('A **B** C');
   *   // segs = [{text:'A ',bold:false}, {text:'B',bold:true}, {text:' C',bold:false}]
   *   clipSegmentsToRange(segs, 0, 2)  -> [{text:'A ',  bold:false}]
   *   clipSegmentsToRange(segs, 2, 4)  -> [{text:'B',   bold:true},
   *                                        {text:' ',   bold:false}]  (splits)
   *   clipSegmentsToRange(segs, 0, 5)  -> the whole thing
   */
  function clipSegmentsToRange(segments, startIdx, endIdx) {
    var out = [];
    var pos = 0;
    for (var i = 0; i < segments.length; i++) {
      var seg = segments[i];
      var segStart = pos;
      var segEnd = pos + seg.text.length;
      pos = segEnd;
      if (segEnd <= startIdx) continue;     // segment ends before window
      if (segStart >= endIdx) break;        // segment starts after window
      var sliceStart = Math.max(0, startIdx - segStart);
      var sliceEnd = Math.min(seg.text.length, endIdx - segStart);
      if (sliceEnd <= sliceStart) continue;
      out.push({ text: seg.text.slice(sliceStart, sliceEnd), bold: seg.bold });
    }
    return out;
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
          // Phase 23 (23-12): keep raw markdown — the list-branch renderer
          // calls parseInlineBold(item) and emits Heebo Bold for **X** spans.
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
      // Phase 23 (23-12): keep raw markdown — the para-branch renderer calls
      // parseInlineBold(text) and emits Heebo Bold for **X** spans.
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

      // Phase 23 (23-10): document-level paragraph direction. Hebrew (and any
      // future RTL locales like Arabic) -> 'rtl'. All others -> 'ltr'. This
      // determines x-anchor uniformly across the body -- Hebrew docs anchor right
      // even on Latin lines, Latin docs anchor left even on Hebrew lines. Per-line
      // bidi shaping (shapeForJsPdf) still handles inline direction switches
      // correctly within each line. Replaces the per-line isRtl() anchor decision
      // that produced confusing "anchor follows line content" mixed-doc behaviour
      // (Hebrew session with stray Latin line: that line jumped to the left margin
      // while everything else hugged the right).
      var docDir = (opts.uiLang === 'he') ? 'rtl' : 'ltr';

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
      // Plan 23-09: HEADING_SIZE bumped 14 -> 16 for clearer visual hierarchy
      // against 11pt body. Effective per-level sizes (computed in the heading
      // render branch below):
      //   H1 (#)   = HEADING_SIZE + 2 = 18pt   (matches new TITLE_SIZE)
      //   H2 (##)  = HEADING_SIZE     = 16pt   (the typical section header)
      //   H3 (###) = HEADING_SIZE - 2 = 14pt
      // LINE_HEIGHT_HEADING bumped 22 -> 26 to accommodate the larger H1
      // (a 16pt line for an 18pt glyph would clip ascenders / descenders).
      var HEADING_SIZE = 16;
      var META_SIZE = 10;
      // Plan 23-09: TITLE_SIZE bumped 16 -> 18 so the page-1 client name
      // remains visibly larger than H1 section headers.
      var TITLE_SIZE = 18;
      var LINE_HEIGHT_BODY = 16;
      var LINE_HEIGHT_HEADING = 26;
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

      // Phase 23 (Plan 23-09): applyFontFor() removed -- after Plan 23-07 collapsed
      // the per-line Latin-vs-Hebrew font switch to a single 'Heebo' family, the
      // function reduced to a one-liner that just called setFont('Heebo', 'normal').
      // Replaced by inline `doc.setFont('Heebo', weight)` calls below to support
      // Plan 23-09's bold heading + title rendering.

      /**
       * Phase 23 (23-12): per-segment line renderer for inline-bold paragraphs
       * and list items.
       *
       * @param {Array<{text:string,bold:boolean}>} segments  Segments from
       *        parseInlineBold, clipped to a wrapped sub-line (concatenation
       *        of segment.text values is the sub-line in LOGICAL order).
       * @param {number} y          Vertical baseline (pt).
       * @param {number} size       Font size (pt).
       * @param {Object} [drawOpts] Optional layout overrides.
       * @param {number} [drawOpts.leftX]   Absolute leftmost x for LTR docs
       *                                    (default MARGIN_X).
       * @param {number} [drawOpts.rightX]  Absolute rightmost x for RTL docs
       *                                    (default PAGE_W - MARGIN_X).
       *
       * Pipeline (matches 23-RESEARCH "Worked example" + 23-12 plan):
       *   1. Reconstruct the logical line from segments.
       *   2. Build a per-logical-codeunit weight array (0 = regular, 1 = bold)
       *      via a running offset walk over segment.text.length.
       *   3. shapeForJsPdfWithMap(line) -> { visual, visualToLogicalMap }.
       *   4. For each visual position, weight = weightByLogical[visualToLogicalMap[vp]].
       *      Collapse to maximal contiguous visual runs sharing a single weight.
       *   5. Measure each run's width at its own weight (bold advances differ
       *      from regular — RESEARCH G7 about identical advances holds within
       *      a single weight; bold is a separate font with separate metrics).
       *   6. Anchor: LTR -> draw left-to-right starting at leftX. RTL -> sum
       *      per-run widths to get totalW, draw left-to-right starting at
       *      (rightX - totalW). Each doc.text() call uses {isInputVisual:false}
       *      (23-08 invariant — preserved by drawSegmentedLine on every run).
       *   7. Restore setFont('Heebo','normal') before returning so subsequent
       *      renderer code starts from a clean baseline.
       */
      function drawSegmentedLine(segments, y, size, drawOpts) {
        drawOpts = drawOpts || {};
        if (!segments || segments.length === 0) return;
        // Reconstruct the logical line + per-codeunit weight array.
        var line = '';
        for (var si = 0; si < segments.length; si++) line += segments[si].text;
        if (line.length === 0) return;
        var weightByLogical = new Uint8Array(line.length);
        var off = 0;
        for (var si2 = 0; si2 < segments.length; si2++) {
          var seg = segments[si2];
          var w = seg.bold ? 1 : 0;
          for (var k = 0; k < seg.text.length; k++) weightByLogical[off + k] = w;
          off += seg.text.length;
        }
        var shaped = shapeForJsPdfWithMap(line);
        var visual = shaped.visual;
        var v2l = shaped.visualToLogicalMap;
        // Walk visual positions, collect maximal contiguous runs by weight.
        var runs = [];
        var vn = visual.length;
        var runStart = 0;
        var runWeight = weightByLogical[v2l[0]];
        for (var vp = 1; vp < vn; vp++) {
          var wv = weightByLogical[v2l[vp]];
          if (wv !== runWeight) {
            runs.push({ text: visual.slice(runStart, vp), bold: runWeight === 1 });
            runStart = vp;
            runWeight = wv;
          }
        }
        runs.push({ text: visual.slice(runStart, vn), bold: runWeight === 1 });
        // Measure each run's width at its own weight. doc.getStringUnitWidth
        // depends on the currently-active font, so we setFont per run before
        // measuring (and again before drawing).
        var widths = new Array(runs.length);
        var totalW = 0;
        for (var ri = 0; ri < runs.length; ri++) {
          doc.setFont('Heebo', runs[ri].bold ? 'bold' : 'normal');
          doc.setFontSize(size);
          widths[ri] = doc.getStringUnitWidth(runs[ri].text) * size;
          totalW += widths[ri];
        }
        // Anchor x.
        var x;
        if (docDir === 'rtl') {
          var rightX = (typeof drawOpts.rightX === 'number') ? drawOpts.rightX : (PAGE_W - MARGIN_X);
          x = rightX - totalW;
        } else {
          x = (typeof drawOpts.leftX === 'number') ? drawOpts.leftX : MARGIN_X;
        }
        // Draw runs left-to-right in visual order. Each draw call must pass
        // {isInputVisual:false} (23-08 invariant): the run text is already
        // visual-shaped via shapeForJsPdfWithMap, and slicing the visual
        // string into runs preserves that property within each run.
        for (var rj = 0; rj < runs.length; rj++) {
          doc.setFont('Heebo', runs[rj].bold ? 'bold' : 'normal');
          doc.setFontSize(size);
          doc.text(runs[rj].text, x, y, { isInputVisual: false });
          x += widths[rj];
        }
        // Reset font to regular baseline for downstream renderer code.
        doc.setFont('Heebo', 'normal');
      }

      function drawTextLine(line, y, size, weight) {
        // Plan 23-09: optional `weight` arg ('normal' | 'bold'); defaults to 'normal'
        // so existing callers (paragraph body, list items, running header, footer)
        // continue to render in regular weight without modification.
        weight = weight || 'normal';
        doc.setFont("Heebo", weight);
        doc.setFontSize(size);
        var visual = shapeForJsPdf(line); // Phase 23 (D1, D2): logical -> visual
        // Phase 23 (23-10): anchor by document direction (uiLang), NOT by per-line
        // content. A Hebrew document anchors every line at the right margin even
        // when an individual line is Latin-only; a Latin document anchors every
        // line at the left margin even when an individual line contains Hebrew.
        // Per-line bidi shaping above (shapeForJsPdf) still produces the correct
        // visual order WITHIN each line via UAX #9.
        if (docDir === 'rtl') {
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
        // Plan 23-09: client name title renders in bold (Heebo Bold variant)
        // -- fits the "title" semantic and gives the page-1 header more visual weight.
        doc.setFont("Heebo", "bold");
        doc.setFontSize(TITLE_SIZE);
        var titleVisual = shapeForJsPdf(clientName || " "); // Phase 23 (D1, D2)
        doc.text(titleVisual, pageWidth / 2, titleY, { align: 'center', isInputVisual: false }); // Phase 23 (D4); 23-08 isInputVisual:false

        // Meta line: "{sessionDate} - {sessionType}". Phase 23 (D4) -- centered as
        // part of the title block. NOTE: drawTextLine is NOT used here because
        // drawTextLine anchors at the docDir-driven left/right margin per D4's
        // "body content stays left/right-anchored" rule (Phase 23 23-10 -- the
        // anchor follows uiLang now, not per-line content). The title block (this
        // draw + the title above) is the only centered region. Body paragraphs,
        // lists, section headings, and the running header on pages 2+ all keep
        // using drawTextLine and stay anchored per docDir.
        var metaText = [sessionDateDisplay, sessionType].filter(function (s) {
          return s && String(s).length > 0;
        }).join("  -  ");
        var metaY = titleY + LINE_HEIGHT_TITLE;
        if (metaText.length > 0) {
          // Plan 23-09: meta line stays in regular weight (secondary info; the
          // bold title above carries the visual hierarchy).
          doc.setFont("Heebo", "normal");
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
        // Plan 23-09: running header on pages 2+ stays in regular weight (matches
        // page-1 meta line; only the page-1 title and section headings are bold).
        doc.setFont("Heebo", "normal");
        doc.setFontSize(META_SIZE);
        var visual = shapeForJsPdf(text); // Phase 23 (D1, D2)
        // Phase 23 (23-10): running-header anchor follows docDir, same rule as
        // drawTextLine. Hebrew session -> right anchor (even if the running header
        // happens to start with a Latin client name); Latin session -> left anchor.
        if (docDir === 'rtl') {
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
          // Plan 23-09: pass weight='bold' so headings render in Heebo Bold,
          // creating clear visual hierarchy vs body text. drawTextLine restores
          // implicit normal weight via its weight default for any subsequent
          // calls that omit the argument.
          // Phase 23 (23-12): strip inline `**` markers — the whole heading
          // is bold already (Plan 23-09), so inline bold is redundant.
          // Without this strip, a user typing `## My **header**` would see
          // literal `**` glyphs in the heading.
          var headingText = stripInlineMarkdown(block.text);
          drawTextLine(headingText, y, hSize, 'bold');
          y += LINE_HEIGHT_HEADING;
          continue;
        }

        if (block.type === 'list') {
          for (var li = 0; li < block.items.length; li++) {
            var item = block.items[li];
            doc.setFont("Heebo", "normal");
            doc.setFontSize(BODY_SIZE);
            // Phase 23 (23-12): inline-bold rendering for list items.
            // Parse the raw item (which retains `**X**` markers per
            // parseMarkdown 23-12 change), wrap on the STRIPPED text, then
            // emit each wrapped sub-line via drawSegmentedLine. The "- "
            // bullet prefix is prepended as a regular-weight segment on wi===0
            // so it participates in bidi paragraph-direction inference (matches
            // the prefix-then-shape behaviour of the pre-23-12 path).
            var listSegments = parseInlineBold(item);
            var listStripped = '';
            for (var lsi = 0; lsi < listSegments.length; lsi++) listStripped += listSegments[lsi].text;
            var wrapped = doc.splitTextToSize(listStripped, USABLE_W - 14);
            var listOff = 0;
            for (var wi = 0; wi < wrapped.length; wi++) {
              ensureRoom(LINE_HEIGHT_BODY);
              var subLineL = wrapped[wi];
              var clippedL = clipSegmentsToRange(listSegments, listOff, listOff + subLineL.length);
              if (clippedL.length === 0) clippedL = [{ text: subLineL, bold: false }];
              // Bullet prefix on the first wrapped line only.
              var lineSegments;
              if (wi === 0) {
                lineSegments = [{ text: '- ', bold: false }].concat(clippedL);
              } else {
                lineSegments = clippedL;
              }
              // Phase 23 (23-10): list-item anchor follows docDir.
              //   Hebrew document -> RTL list layout: bullet hugs the right
              //     margin (wi===0), continuation lines indent leftward (rightX
              //     = PAGE_W - MARGIN_X - 14 for wi>0).
              //   Latin document  -> LTR list layout: bullet hugs the left
              //     margin (wi===0 at MARGIN_X), continuation lines indent
              //     rightward (leftX = MARGIN_X + 14 for wi>0).
              var drawOpts;
              if (docDir === 'rtl') {
                drawOpts = { rightX: (wi === 0) ? (PAGE_W - MARGIN_X) : (PAGE_W - MARGIN_X - 14) };
              } else {
                drawOpts = { leftX: (wi === 0) ? MARGIN_X : (MARGIN_X + 14) };
              }
              drawSegmentedLine(lineSegments, y, BODY_SIZE, drawOpts);
              listOff += subLineL.length + 1;
              y += LINE_HEIGHT_BODY;
            }
          }
          continue;
        }

        if (block.type === 'para') {
          // Phase 23 (23-12): inline-bold rendering. Parse the raw block.text
          // (which now retains `**X**` markers per parseMarkdown 23-12 change)
          // into segments, wrap on the STRIPPED text (per RESEARCH G7 wrap on
          // the marker-free form so widths measure correctly), then clip per
          // wrapped sub-line and hand off to drawSegmentedLine.
          doc.setFont("Heebo", "normal");
          doc.setFontSize(BODY_SIZE);
          var paraSegments = parseInlineBold(block.text);
          var paraStripped = '';
          for (var psi = 0; psi < paraSegments.length; psi++) paraStripped += paraSegments[psi].text;
          var paraLines = doc.splitTextToSize(paraStripped, USABLE_W);
          var paraOff = 0;
          for (var pi = 0; pi < paraLines.length; pi++) {
            ensureRoom(LINE_HEIGHT_BODY);
            var subLine = paraLines[pi];
            // Per Step-1 proof gate (23-12): splitTextToSize joins sub-lines
            // with a single space and collapses internal runs of whitespace.
            // For our fixtures the sub-line offset can be tracked as
            // paraOff..paraOff+subLine.length, then paraOff += subLine.length + 1
            // to skip the join-space. If a future paragraph hits a non-round-
            // trippable wrap point, the renderer falls back to passing the
            // full segment array (drawSegmentedLine clipping is a no-op for
            // the whole-line case) — degradation is acceptable.
            var clipped = clipSegmentsToRange(paraSegments, paraOff, paraOff + subLine.length);
            // Empty clip safeguard (defensive): if the clip yields nothing,
            // fall back to a single regular segment with the wrapped sub-line.
            if (clipped.length === 0) clipped = [{ text: subLine, bold: false }];
            drawSegmentedLine(clipped, y, BODY_SIZE);
            paraOff += subLine.length + 1;
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
        // Phase 23 (23-09): i18n "Page X of Y" footer per uiLang. Inline switch
        // matches the formatDate() pattern at L366. Hebrew uses RTL natural
        // word order ("עמוד {pn} מתוך {total}"); the bidi pre-shape on the
        // string below produces the correct visual order.
        var label = (opts.uiLang === 'he') ? ('עמוד ' + pn + ' מתוך ' + totalPages)
                  : (opts.uiLang === 'de') ? ('Seite ' + pn + ' von ' + totalPages)
                  : (opts.uiLang === 'cs') ? ('Stránka ' + pn + ' z ' + totalPages)
                  : ('Page ' + pn + ' of ' + totalPages);
        var labelVisual = shapeForJsPdf(label);
        // Phase 23 (23-05) -- centered via jsPDF's canonical horizontal-align API for consistency with the title-block centering introduced by 23-03. Equivalent to the previous manual (PAGE_W - textWidth) / 2 form. The pageWidth local was introduced by 23-03 and is in scope here.
        doc.text(labelVisual, pageWidth / 2, FOOTER_BASELINE_Y, { align: 'center', isInputVisual: false });
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
