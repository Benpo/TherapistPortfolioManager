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
   * Returns immediately (resolved Promise) if the dependency is ALREADY present
   * (its global is on window, or a script tag with the same src already exists).
   *
   * @param {string} src                  script URL to lazy-load
   * @param {function} [isReady]          optional predicate returning true when
   *   the dependency's global is already on window. When it returns true we
   *   resolve SYNCHRONOUSLY and NEVER append a <script>.
   *
   * Why the isReady short-circuit matters (the false-green bug fix): some
   * environments never fire an appended script's load/error event — jsdom has
   * no resource loader, and any headless test harness that eval's the lib
   * directly into the window has no real network. Awaiting such a <script>'s
   * onload hangs the promise forever; the consuming Node process then exits 0
   * with zero output (an unresolved promise keeps nothing in the event loop),
   * silently inerting every gate that builds a PDF. If the dependency's global
   * is already defined the script body has effectively already run — there is
   * nothing to wait for, so resolve immediately instead of appending.
   */
  function loadScriptOnce(src, isReady) {
    return new Promise(function (resolve, reject) {
      // (1) Global already present? Resolve synchronously; never append.
      if (typeof isReady === 'function') {
        var ready = false;
        try { ready = !!isReady(); } catch (_) { ready = false; }
        if (ready) { resolve(); return; }
      }
      // (2) Already in DOM? (Either previously loaded by us or hardcoded in HTML.)
      var existing = document.querySelector('script[src="' + src + '"]');
      if (existing) {
        resolve();
        return;
      }
      // (3) Not loaded yet -- append and await onload (real-browser lazy-load).
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
      // Every loadScriptOnce below passes an isReady global predicate so the
      // call resolves synchronously when the dependency is already on window
      // (production 2nd-export, or a test harness that eval'd the libs). This
      // is what keeps headless/jsdom builds from hanging on an appended
      // <script> whose onload never fires. The first-export production path
      // (global absent -> append + await onload) is unchanged.
      return loadScriptOnce('./assets/jspdf.min.js', function () {
        return !!(window.jspdf && window.jspdf.jsPDF);
      }).then(function () {
        // Phase 23 (D1) -- bidi-js is part of the "library" phase, before fonts. Per RESEARCH 'Performance / Lazy-Load Notes': order doesn't matter functionally (bidi has no deps on fonts), but grouping libs together keeps the progress phases semantically clean.
        return loadScriptOnce('./assets/bidi.min.js', function () {
          return typeof window.bidi_js === 'function';
        });
      }).then(function () {
        // Phase 23 (D1, G9) -- invoke the bidi-js factory ONCE the script is loaded and cache the result module-level. window.bidi_js is the UMD attachment from assets/bidi.min.js. Calling it earlier (e.g. at module-eval time, before loadScriptOnce resolves) throws TypeError.
        _bidi = window.bidi_js();
        progress('loading-fonts');
        // Plan 23-07: single unified Heebo font (replaces noto-sans + noto-sans-hebrew).
        return loadScriptOnce('./assets/fonts/heebo-base64.js', function () {
          return typeof window.Heebo === 'string' && window.Heebo.length > 0;
        });
      }).then(function () {
        // Plan 23-09: Heebo Bold (weight 700) loaded after Regular -- used for
        // section headings + page-1 title rendering via setFont('Heebo', 'bold').
        return loadScriptOnce('./assets/fonts/heebo-bold-base64.js', function () {
          return typeof window.HeeboBold === 'string' && window.HeeboBold.length > 0;
        });
      }).then(function () {
        // Phase 34 (34-06, D-05/FN-3): make the embedded-logo base64 module
        // (window.IconLogoBase64, vendored by 34-01) available for the header
        // band. The logo is OPTIONAL (drawHeaderBand guards the global and omits
        // the logo if absent) so this step must NEVER block the export:
        //   - global already present (production eager-load via add-session.html,
        //     SW-precached for offline, or a test harness eval) -> resolve now;
        //   - global absent but a <script> tag exists -> loadScriptOnce resolves
        //     via the existing-tag fast path (no new append);
        //   - global absent and no tag -> skip the logo entirely.
        // We never append an external <script> we'd have to await: a headless/
        // jsdom env never fires onload and the export would hang forever.
        if (typeof window.IconLogoBase64 === 'string' && window.IconLogoBase64.length > 0) {
          return; // already available -- drawHeaderBand emits the logo synchronously
        }
        if (document.querySelector('script[src="./assets/branding/icon-512-base64.js"]')) {
          return loadScriptOnce('./assets/branding/icon-512-base64.js', function () {
            return typeof window.IconLogoBase64 === 'string' && window.IconLogoBase64.length > 0;
          });
        }
        return; // absent and no tag: skip the logo gracefully (drawHeaderBand guard)
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
        // Quick task 260522-iwr: decide ordered-vs-unordered from the FIRST
        // list line. An ordered list ("1. ", "2. " ...) carries an ordinal;
        // an unordered list ("- ", "* ") carries a bullet.
        //
        // Quick task 260608-c8x (Bug A fix): for ordered lists each item now
        // carries its TYPED ordinal as { text, ordinal } (NOT the local-index
        // value). Rationale: paragraph-separated numbered items
        //   "1. X" / "" / "para" / "" / "2. Y" / "" / "para" / "" / "3. Z"
        // each become their own single-item {type:'list',ordered:true} block
        // (parseMarkdown only groups CONTIGUOUS list lines). Under the
        // previous "renderer assigns 1..N from li+1" contract every block's
        // sole item was numbered "1.", so the user saw three "1."s in the
        // exported PDF. Carrying the typed ordinal preserves the user's
        // numbering exactly -- editor-1:1 behaviour. For contiguous numbered
        // runs (the common case) the typed ordinals are already 1..N, so
        // there is no visible behaviour change vs. the previous contract.
        // Unordered-list items remain bare strings.
        var listOrdered = /^\s*\d+\.\s+/.test(line);
        var items = [];
        while (i < lines.length && (/^\s*[-*]\s+/.test(lines[i]) || /^\s*\d+\.\s+/.test(lines[i]))) {
          // Phase 23 (23-12): keep raw markdown — the list-branch renderer
          // calls parseInlineBold(item) and emits Heebo Bold for **X** spans.
          // Quick task 260522-iwr + 260608-c8x: strip the leading marker (the
          // renderer re-adds the prefix from item.ordinal for ordered lists).
          if (listOrdered) {
            var ordMatch = /^\s*(\d+)\.\s+/.exec(lines[i]);
            var typedOrdinal = ordMatch ? parseInt(ordMatch[1], 10) : (items.length + 1);
            items.push({
              text: lines[i].replace(/^\s*\d+\.\s+/, ""),
              ordinal: typedOrdinal
            });
          } else {
            items.push(lines[i].replace(/^\s*[-*]\s+/, ""));
          }
          i++;
        }
        blocks.push({ type: 'list', items: items, ordered: listOrdered });
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
      // Quick 260620-q8m: join contiguous paragraph source lines with "\n"
      // (NOT " ") so single intra-paragraph hard line breaks survive into the
      // PDF and the export matches the editor live-preview (md-render.js line 63
      // converts single newlines to <br>). jsPDF's doc.splitTextToSize treats the
      // embedded "\n" as a FORCED line break (in addition to width wrapping), so
      // e.g. a line of dashes typed on its own line renders on its own row instead
      // of being inline-joined with the surrounding text. (No <hr> handling — the
      // literal dashes are preserved on their own line, exactly like the preview.)
      blocks.push({ type: 'para', text: paraLines.join("\n") });
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
      // Phase 34 (34-07, D-07/D-12): airier free-text body — bump 11 -> 11.5pt to
      // match the FINAL mockup's rhythm. The paragraph/list structure
      // (splitTextToSize + parseInlineBold) is unchanged; only the type scale and
      // leading change. Ink stays #2f2d38 (set per draw via the body colour).
      var BODY_SIZE = 11.5;
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
      // Phase 34 (34-07, D-07/D-12): body leading bumped 16 -> 19 (~1.65 of the
      // new 11.5pt body) for the airier paragraph rhythm in the FINAL mockup.
      var LINE_HEIGHT_BODY = 19;
      var LINE_HEIGHT_HEADING = 26;
      var LINE_HEIGHT_META = 14;
      var LINE_HEIGHT_TITLE = 22;
      var FOOTER_BASELINE_Y = PAGE_H - 32;
      var RUNNING_HEADER_Y = MARGIN_TOP - 24;

      // Phase 34 (REVISED per owner review, Change 2): continuation-header (pages
      // 2+) treatment. Previously a small plain-text line that read like body text
      // and sat flush against the first content line. Now: a header-like BOLD
      // client name + a muted REGULAR-weight date (numerals stay regular weight so
      // their pinned digit GIDs survive — bold+digits would break pdf-digit-order /
      // 34-rtl-newblocks), a light vein rule beneath (a treatment BETWEEN plain
      // text and the full page-1 cream card), and CONT_HEADER_PAD of breathing room
      // before the first content line. All anchored by docDir for RTL.
      var CONT_HEADER_NAME_SIZE = 11.5;
      var CONT_HEADER_DATE_SIZE = 10;
      var CONT_HEADER_RULE_GAP  = 7;   // header baseline -> vein rule
      var CONT_HEADER_PAD       = 18;  // extra space below the rule before content

      // Phase 34 (34-06): branded page-1 header band + client card geometry.
      // bandHeight ~= logo(48) + 2x24pt vertical padding (UI-SPEC item 1, D-01).
      var BAND_HEIGHT = 96;        // D-01 full-bleed mint header band height
      var CARD_TOP_MARGIN = 24;    // gap below the band before the client card
      var CARD_BOTTOM_MARGIN = 24; // gap after the card before body content

      // Phase 34 (34-06): icon-sampled palette (UI-SPEC § Color; D-02 overrides
      // UI-SPEC FLAG-2: the card border is #c8e6d4 to match the FINAL mockup).
      var COLOR_BAND        = '#e2f3e3'; // mint header band fill (icon-mint)
      var COLOR_BRAND_DEEP  = '#345e34'; // title + client name (icon-deep-green)
      var COLOR_BRAND_HEAD  = '#456b42'; // subtitle + meta keys (icon-head-green)
      var COLOR_MUTED       = '#5f5c72'; // meta values (muted ink)
      // (COLOR_LOGO_LINE removed with the header logo — Change 3 owner revision.)
      var COLOR_CARD_FILL   = '#fdf8f0'; // cream client card surface
      var COLOR_CARD_BORDER = '#c8e6d4'; // client card border (D-02, green-200)
      var COLOR_PILL_FILL   = '#e8f5ee'; // session-type pill fill (green-100)
      var COLOR_PILL_TEXT   = '#1e5c3a'; // session-type pill text (green-700)

      // Phase 34 (34-07): section-heading chrome (D-06) + body/footer ink.
      var COLOR_LEAF_DIAMOND = '#7da877'; // leaf-diamond bullet fill (D-06)
      var COLOR_HEADING_RULE = '#bfe0b0'; // vein rule beneath the heading (D-06)
      var COLOR_BODY_INK     = '#2f2d38'; // free-text body ink (D-07)
      var COLOR_FOOTER_RULE  = '#eef7ea'; // footer top rule, mint-soft (D-09)

      // Phase 34 (34-07, D-06): heading geometry — leaf-diamond bullet ~9pt, 4pt
      // gap to the label, ~1.5pt vein rule 4pt beneath the baseline, 24pt top /
      // 8pt bottom margins (UI-SPEC § Spacing + FINAL mockup).
      var LEAF_DIAMOND_SIZE     = 9;
      var LEAF_DIAMOND_GAP      = 4;
      var HEADING_TOP_MARGIN    = 24;
      var HEADING_BOTTOM_MARGIN = 8;
      var HEADING_RULE_GAP      = 4;
      var HEADING_RULE_WIDTH    = 1.5;

      // Phase 34 (34-07, D-09): footer band geometry — mint-soft top rule, small
      // logo, three zones along the existing footer baseline.
      var FOOTER_RULE_WIDTH = 1;
      var FOOTER_LOGO_SIZE  = 15;
      var FOOTER_LOGO_GAP   = 6;

      // Hex -> jsPDF setX color helpers (jsPDF version-agnostic: pass r,g,b ints
      // rather than relying on CSS-string parsing support).
      function _rgb(hex) {
        var h = String(hex).replace('#', '');
        return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
      }
      function setFill(hex)   { var c = _rgb(hex); doc.setFillColor(c[0], c[1], c[2]); }
      function setStroke(hex) { var c = _rgb(hex); doc.setDrawColor(c[0], c[1], c[2]); }
      function setInk(hex)    { var c = _rgb(hex); doc.setTextColor(c[0], c[1], c[2]); }

      // Phase 34 (34-06): localized PDF copy resolver. Reads the same dictionary
      // App.t reads (window.I18N[uiLang][key]); falls back to en, then a literal
      // default so headless/test builds that omit i18n still render (D-01/D-04).
      function pdfI18n(key, fallback) {
        try {
          var L = window.I18N;
          if (L) {
            var d = L[opts.uiLang];
            if (d && typeof d[key] === 'string' && d[key].length) return d[key];
            if (L.en && typeof L.en[key] === 'string' && L.en[key].length) return L.en[key];
          }
        } catch (e) { /* fall through to default */ }
        return fallback;
      }

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

      // Phase 34 (34-06, D-01/D-05/D-10/D-12; REVISED per owner review): the
      // branded page-1 opening — a full-bleed mint header band carrying ONLY the
      // localized title. Two intentional owner-approved overrides of the locked
      // UI-SPEC: (1) the embedded logo is REMOVED from the header (it lives in the
      // footer band, which still embeds the image XObject so 34-logo-embed stays
      // green); (2) the redundant subtitle ("A personal session summary") is
      // REMOVED — the "Session Summary" title already says it. The title is
      // vertically centred and start-anchored (left in LTR / right in RTL); every
      // text/shape anchors by docDir and routes shaped strings through doc.text
      // with isInputVisual:false, so the Phase 23 RTL invariant holds by
      // construction (D-10). Returns the y where the client card should begin.
      function drawHeaderBand() {
        // Full-bleed mint band (content insets to MARGIN_X; the fill is edge-to-edge).
        setFill(COLOR_BAND);
        doc.rect(0, 0, PAGE_W, BAND_HEIGHT, 'F');

        // Localized title only, start-anchored and vertically centred in the band.
        // Bumped 20 -> 22pt now that it stands alone (no logo / no subtitle) so it
        // carries the band on its own. Renders correctly in EN/HE/DE/CS + RTL via
        // pdfI18n('session.copy.title') + shapeForJsPdf.
        var titleVisual = shapeForJsPdf(pdfI18n('session.copy.title', 'Session Summary'));
        var titleY = BAND_HEIGHT / 2 + 8; // baseline ~centred for a 22pt cap height
        doc.setFont('Heebo', 'bold');
        doc.setFontSize(22);
        setInk(COLOR_BRAND_DEEP);
        if (docDir === 'rtl') {
          doc.text(titleVisual, PAGE_W - MARGIN_X, titleY, { align: 'right', isInputVisual: false });
        } else {
          doc.text(titleVisual, MARGIN_X, titleY, { isInputVisual: false });
        }

        // Restore a clean baseline for downstream renderer code.
        doc.setTextColor(0, 0, 0);
        doc.setFont('Heebo', 'normal');
        doc.setLineWidth(1);
        return BAND_HEIGHT + CARD_TOP_MARGIN;
      }

      // Phase 34 (34-06, D-02/D-04/D-10/D-12): the cream client card below the
      // header band — client name (23pt bold) + a single meta row carrying Date,
      // a green localized session-type pill (verbatim value, FN-2), and Session
      // #N. Replaces the legacy centered drawPage1Header title block. Every piece
      // anchors by docDir and routes through shapeForJsPdf with isInputVisual:false
      // (D-10); the row is laid out start→trailing (LTR) or mirrored right→left
      // (RTL). Returns the y where the body should begin.
      function drawClientCard() {
        var padX = 20, padY = 16;
        var nameSize = 23, metaSize = 11.5;
        var cardHeight = 88; // padY + name + gap + meta row + padY (see UI-SPEC item 2)

        // Pitfall 5: measure first and ensureRoom so the card never splits across
        // a page. On page 1 it always fits; the guard is correct-by-construction.
        y = BAND_HEIGHT + CARD_TOP_MARGIN; // page-1 cursor start (outer y via closure)
        ensureRoom(cardHeight);
        var cardTop = y;

        // Surface: cream rounded card with the D-02 green border (#c8e6d4 — matches
        // the FINAL mockup; overrides UI-SPEC FLAG-2 #bfe0b0 per 34-RESEARCH Open Q1).
        setFill(COLOR_CARD_FILL);
        setStroke(COLOR_CARD_BORDER);
        doc.setLineWidth(1);
        doc.roundedRect(MARGIN_X, cardTop, USABLE_W, cardHeight, 10, 10, 'FD');

        var contentLeft = MARGIN_X + padX;
        var contentRight = PAGE_W - MARGIN_X - padX;

        // Client name (23pt bold, start-anchored).
        var nameBaseline = cardTop + padY + 17;
        doc.setFont('Heebo', 'bold');
        doc.setFontSize(nameSize);
        setInk(COLOR_BRAND_DEEP);
        var nameVisual = shapeForJsPdf(clientName || ' ');
        if (docDir === 'rtl') {
          doc.text(nameVisual, contentRight, nameBaseline, { align: 'right', isInputVisual: false });
        } else {
          doc.text(nameVisual, contentLeft, nameBaseline, { isInputVisual: false });
        }

        // Meta row.
        var metaBaseline = nameBaseline + 26;
        drawMetaRow(contentLeft, contentRight, metaBaseline, metaSize);

        // Restore a clean baseline for downstream renderer code.
        doc.setTextColor(0, 0, 0);
        doc.setFont('Heebo', 'normal');
        return cardTop + cardHeight + CARD_BOTTOM_MARGIN;
      }

      // Phase 34 (34-06): measure a shaped string's width at a given weight/size.
      function measureAt(str, weight, size) {
        doc.setFont('Heebo', weight);
        doc.setFontSize(size);
        return doc.getStringUnitWidth(str) * size;
      }

      // Phase 34 (34-06): a two-tone meta item (bold colored key + muted value).
      // Internal order respects docDir so RTL reads key→value right-to-left.
      function makeTextItem(key, value, size) {
        var keyVis = shapeForJsPdf(String(key));
        var valVis = shapeForJsPdf(String(value));
        var keyW = measureAt(keyVis, 'bold', size);
        var valW = measureAt(valVis, 'normal', size);
        var spaceW = measureAt(' ', 'normal', size);
        return {
          width: keyW + spaceW + valW,
          draw: function (x, baseline) {
            var keyX, valX;
            if (docDir === 'rtl') { valX = x; keyX = x + valW + spaceW; }
            else { keyX = x; valX = x + keyW + spaceW; }
            doc.setFont('Heebo', 'bold'); doc.setFontSize(size); setInk(COLOR_BRAND_HEAD);
            doc.text(keyVis, keyX, baseline, { isInputVisual: false });
            doc.setFont('Heebo', 'normal'); doc.setFontSize(size); setInk(COLOR_MUTED);
            doc.text(valVis, valX, baseline, { isInputVisual: false });
          },
        };
      }

      // Phase 34 (34-06, D-04/FN-2): the green session-type pill. Draws the
      // localized label VERBATIM as its own standalone text (no hardcoded label),
      // shaped through shapeForJsPdf + isInputVisual:false so it mirrors under RTL.
      function makePillItem(label) {
        var pillSize = 11, pillPadX = 12, pillH = 16;
        var labelVis = shapeForJsPdf(String(label));
        var labelW = measureAt(labelVis, 'bold', pillSize);
        var width = labelW + 2 * pillPadX;
        return {
          width: width,
          draw: function (x, baseline) {
            var pillTop = baseline - pillH + 4; // visually center the pill on the row
            setFill(COLOR_PILL_FILL);
            doc.roundedRect(x, pillTop, width, pillH, pillH / 2, pillH / 2, 'F');
            doc.setFont('Heebo', 'bold'); doc.setFontSize(pillSize); setInk(COLOR_PILL_TEXT);
            doc.text(labelVis, x + pillPadX, baseline, { isInputVisual: false });
          },
        };
      }

      // Phase 34 (34-06): lay out the meta row. Logical order Date · pill · Session
      // #N (matches the FINAL mockup). LTR flows start→trailing from contentLeft;
      // RTL mirrors, flowing right→left from contentRight (D-10 start-edge anchor).
      function drawMetaRow(contentLeft, contentRight, baseline, size) {
        var gap = 16;
        var items = [];
        if (sessionDateDisplay && sessionDateDisplay.length) {
          items.push(makeTextItem(pdfI18n('session.copy.date', 'Date:'), sessionDateDisplay, size));
        }
        if (sessionType && sessionType.length) {
          items.push(makePillItem(sessionType)); // localized value, verbatim (FN-2)
        }
        if (sessionData.sessionNumber != null && String(sessionData.sessionNumber).length) {
          items.push(makeTextItem(pdfI18n('pdf.card.sessionNo', 'Session'),
            '#' + sessionData.sessionNumber, size));
        }
        var i, cursor;
        if (docDir === 'rtl') {
          cursor = contentRight;
          for (i = 0; i < items.length; i++) {
            var x = cursor - items[i].width;
            items[i].draw(x, baseline);
            cursor = x - gap;
          }
        } else {
          cursor = contentLeft;
          for (i = 0; i < items.length; i++) {
            items[i].draw(cursor, baseline);
            cursor += items[i].width + gap;
          }
        }
      }

      // Phase 34 (REVISED per owner review, Change 2): the pages-2+ continuation
      // header. Header-like BOLD name (#456b42) + muted REGULAR date (#5f5c72),
      // then a light vein rule (#bfe0b0) beneath. The name is bold for header
      // weight; the DATE stays regular weight because it carries digits and the
      // bold Heebo subset has its own glyph-id map — bold numerals would emit
      // unrecognized GIDs and trip pdf-digit-order / 34-rtl-newblocks (the same
      // constraint the severity-numeral draw documents). Anchor follows docDir
      // (Phase 23-10): name hugs the start edge, the date trails it.
      function drawRunningHeader() {
        var nameStr = (clientName && String(clientName).length > 0) ? String(clientName) : '';
        var dateStr = (sessionDateDisplay && String(sessionDateDisplay).length > 0) ? String(sessionDateDisplay) : '';
        if (!nameStr && !dateStr) return;

        var baseY = RUNNING_HEADER_Y;
        var sep = '   ';  // visual gap between name and date (whitespace only)

        var nameVisual = nameStr ? shapeForJsPdf(nameStr) : '';
        var dateVisual = dateStr ? shapeForJsPdf(dateStr) : '';

        // Measure pieces at their own weights/sizes.
        var nameW = 0, sepW = 0, dateW = 0;
        if (nameStr) {
          doc.setFont('Heebo', 'bold'); doc.setFontSize(CONT_HEADER_NAME_SIZE);
          nameW = doc.getStringUnitWidth(nameVisual) * CONT_HEADER_NAME_SIZE;
        }
        doc.setFont('Heebo', 'normal'); doc.setFontSize(CONT_HEADER_DATE_SIZE);
        if (nameStr && dateStr) sepW = doc.getStringUnitWidth(sep) * CONT_HEADER_DATE_SIZE;
        if (dateStr) dateW = doc.getStringUnitWidth(dateVisual) * CONT_HEADER_DATE_SIZE;

        if (docDir === 'rtl') {
          // START edge = right margin: bold name hugs the right, date flows leftward.
          var rx = PAGE_W - MARGIN_X;
          if (nameStr) {
            doc.setFont('Heebo', 'bold'); doc.setFontSize(CONT_HEADER_NAME_SIZE); setInk(COLOR_BRAND_HEAD);
            doc.text(nameVisual, rx, baseY, { align: 'right', isInputVisual: false });
          }
          if (dateStr) {
            var dxR = rx - (nameStr ? (nameW + sepW) : 0);
            doc.setFont('Heebo', 'normal'); doc.setFontSize(CONT_HEADER_DATE_SIZE); setInk(COLOR_MUTED);
            doc.text(dateVisual, dxR, baseY, { align: 'right', isInputVisual: false });
          }
        } else {
          var lx = MARGIN_X;
          if (nameStr) {
            doc.setFont('Heebo', 'bold'); doc.setFontSize(CONT_HEADER_NAME_SIZE); setInk(COLOR_BRAND_HEAD);
            doc.text(nameVisual, lx, baseY, { isInputVisual: false });
          }
          if (dateStr) {
            var dxL = lx + (nameStr ? (nameW + sepW) : 0);
            doc.setFont('Heebo', 'normal'); doc.setFontSize(CONT_HEADER_DATE_SIZE); setInk(COLOR_MUTED);
            doc.text(dateVisual, dxL, baseY, { isInputVisual: false });
          }
        }

        // Light vein rule beneath the header — a treatment between plain text and
        // the full page-1 cream card. Spans the content width, anchored by margins
        // (symmetric, so RTL-correct by construction).
        var ruleY = baseY + CONT_HEADER_RULE_GAP;
        setStroke(COLOR_HEADING_RULE);
        doc.setLineWidth(1);
        doc.line(MARGIN_X, ruleY, PAGE_W - MARGIN_X, ruleY);

        // Restore a clean baseline for downstream renderer code.
        doc.setTextColor(0, 0, 0);
        doc.setFont('Heebo', 'normal');
        doc.setLineWidth(1);
      }

      // -----------------------------------------------------------------------
      // Render -- iterate parsed blocks; auto page-break on overflow
      // -----------------------------------------------------------------------

      // Phase 34 (34-06; REVISED Change 3): the branded page-1 opening — full-bleed
      // header band (localized title only — logo + subtitle removed) then the cream
      // client card (name + Date · localized pill · Session #N). drawClientCard
      // sets the body cursor.
      drawHeaderBand();
      var y = drawClientCard();
      var blocks = parseMarkdown(markdown);

      // Phase 34 (REVISED per owner review, Change 1): the structural severity
      // block renders in its FORM-ORDER slot, not after the whole body. The form
      // DOM (add-session.html) places the issues/severity section at position 2 —
      // right after the heartShield section and BEFORE every other section
      // (heart-shield-emotions, trapped, insights, …, comments, next-meeting /
      // plan notes). export-modal forwards sessionData.severityAfterSections =
      // (heartShield section present ? 1 : 0); the renderer draws the two-bar block
      // just before the (severityAfterSections+1)-th section heading. If that many
      // section headings never appear (fewer sections, or a body with none) it
      // falls back to the end — which, with no trailing sections, is still the
      // correct form slot. The block's APPEARANCE is unchanged (drawSeverityBlock,
      // hoisted below); only its position in the flow moves.
      var severityIssues = sessionData.issues || [];
      var severityAfterSections =
        (typeof sessionData.severityAfterSections === 'number' && sessionData.severityAfterSections >= 0)
          ? sessionData.severityAfterSections : 0;
      var severityDrawn = false;
      var sectionHeadingsSeen = 0;

      function ensureRoom(neededHeight) {
        if (y + neededHeight > PAGE_H - MARGIN_BOTTOM) {
          doc.addPage();
          drawRunningHeader();
          // Change 2: start content below the continuation header + its vein rule,
          // with CONT_HEADER_PAD of breathing room (no longer flush at MARGIN_TOP).
          y = MARGIN_TOP + CONT_HEADER_PAD;
        }
      }

      for (var bi = 0; bi < blocks.length; bi++) {
        var block = blocks[bi];

        // Change 1: insert the severity block at its form-order slot — just before
        // the section heading that follows the target number of leading sections.
        if (block.type === 'heading' && block.level >= 2) {
          if (!severityDrawn && sectionHeadingsSeen === severityAfterSections) {
            drawSeverityBlock(severityIssues);
            severityDrawn = true;
          }
          sectionHeadingsSeen++;
        }

        if (block.type === 'blank') {
          y += LINE_HEIGHT_BODY * 0.5;
          continue;
        }

        if (block.type === 'heading') {
          var hSize = (block.level === 1) ? HEADING_SIZE + 2
                    : (block.level === 2) ? HEADING_SIZE
                    : HEADING_SIZE - 2;
          // Phase 34 (34-07, D-06): airier branded section heading — a leaf-diamond
          // bullet at the START edge, a #456b42 bold label 4pt after it, and a
          // #bfe0b0 vein rule spanning the content width beneath the baseline.
          // 24pt top margin / 8pt bottom margin. The bullet is symmetric (a
          // rotated square = two triangle() calls about a centre), so it is
          // identical under LTR/RTL — no mirroring needed (D-10).
          y += HEADING_TOP_MARGIN;
          // Reserve heading line + rule gap + bottom margin; on a page-break the
          // top margin is correctly dropped (heading starts at MARGIN_TOP).
          ensureRoom(LINE_HEIGHT_HEADING + HEADING_RULE_GAP + HEADING_BOTTOM_MARGIN);

          // Phase 23 (23-12): strip inline `**` markers — the whole heading is
          // bold already, so inline bold is redundant.
          var headingText = stripInlineMarkdown(block.text);

          // Leaf-diamond bullet at the START edge (left in LTR / right in RTL),
          // vertically centred on the label cap height (34-RESEARCH Pattern 3).
          var dHalf = LEAF_DIAMOND_SIZE / 2;
          var diamondCy = y - hSize * 0.30;
          var diamondCx, labelX;
          if (docDir === 'rtl') {
            diamondCx = PAGE_W - MARGIN_X - dHalf;
            labelX    = PAGE_W - MARGIN_X - LEAF_DIAMOND_SIZE - LEAF_DIAMOND_GAP;
          } else {
            diamondCx = MARGIN_X + dHalf;
            labelX    = MARGIN_X + LEAF_DIAMOND_SIZE + LEAF_DIAMOND_GAP;
          }
          setFill(COLOR_LEAF_DIAMOND);
          // Two triangles sharing the top/bottom vertices form a 45° square
          // (symmetric about cx — identical LTR/RTL, no RTL mirroring).
          doc.triangle(diamondCx, diamondCy - dHalf, diamondCx + dHalf, diamondCy,
                       diamondCx, diamondCy + dHalf, 'F');
          doc.triangle(diamondCx, diamondCy - dHalf, diamondCx - dHalf, diamondCy,
                       diamondCx, diamondCy + dHalf, 'F');

          // Label: 16pt bold #456b42, start-anchored 4pt after the bullet.
          doc.setFont('Heebo', 'bold');
          doc.setFontSize(hSize);
          setInk(COLOR_BRAND_HEAD); // #456b42
          var headingVisual = shapeForJsPdf(headingText);
          if (docDir === 'rtl') {
            doc.text(headingVisual, labelX, y, { align: 'right', isInputVisual: false });
          } else {
            doc.text(headingVisual, labelX, y, { isInputVisual: false });
          }

          // Vein rule: ~1.5pt #bfe0b0 spanning the content width, ~4pt beneath.
          var ruleY = y + HEADING_RULE_GAP;
          setStroke(COLOR_HEADING_RULE);
          doc.setLineWidth(HEADING_RULE_WIDTH);
          doc.line(MARGIN_X, ruleY, PAGE_W - MARGIN_X, ruleY);

          // Restore a clean baseline for downstream renderer code.
          doc.setTextColor(0, 0, 0);
          doc.setFont('Heebo', 'normal');
          doc.setLineWidth(1);

          y += LINE_HEIGHT_HEADING + HEADING_BOTTOM_MARGIN;
          continue;
        }

        if (block.type === 'list') {
          for (var li = 0; li < block.items.length; li++) {
            var item = block.items[li];
            // Quick task 260608-c8x: ordered-list items now arrive as
            // { text, ordinal } objects (Bug A fix in parseMarkdown);
            // unordered-list items remain bare strings. The bold parser
            // wants the raw text either way.
            var itemText = (block.ordered && item && typeof item === 'object')
              ? item.text
              : item;
            doc.setFont("Heebo", "normal");
            doc.setFontSize(BODY_SIZE);
            setInk(COLOR_BODY_INK); // Phase 34 (34-07, D-07): body ink #2f2d38
            // Phase 23 (23-12): inline-bold rendering for list items.
            // Parse the raw item (which retains `**X**` markers per
            // parseMarkdown 23-12 change), wrap on the STRIPPED text, then
            // emit each wrapped sub-line via drawSegmentedLine.
            var listSegments = parseInlineBold(itemText);
            var listStripped = '';
            for (var lsi = 0; lsi < listSegments.length; lsi++) listStripped += listSegments[lsi].text;
            var wrapped = doc.splitTextToSize(listStripped, USABLE_W - 14);
            var listOff = 0;
            for (var wi = 0; wi < wrapped.length; wi++) {
              ensureRoom(LINE_HEIGHT_BODY);
              var subLineL = wrapped[wi];
              var clippedL = clipSegmentsToRange(listSegments, listOff, listOff + subLineL.length);
              if (clippedL.length === 0) clippedL = [{ text: subLineL, bold: false }];
              // Quick task 260608-c8x (Bug A): the list prefix uses the
              // TYPED ordinal (item.ordinal) for ordered lists, NOT the
              // local index (li + 1). Paragraph-separated numbered items
              // become single-item blocks each carrying its own typed
              // ordinal, so the renderer must read it from the item, not
              // derive it from position. Unordered lists keep "- ".
              var listPrefix;
              if (block.ordered) {
                var typedOrdinal = (item && typeof item === 'object' && typeof item.ordinal === 'number')
                  ? item.ordinal
                  : (li + 1); // defensive fallback -- should not trigger post Bug-A fix
                listPrefix = typedOrdinal + '. ';
              } else {
                listPrefix = '- ';
              }
              // Phase 23 (23-10): list-item anchor follows docDir.
              //   Hebrew document -> RTL list layout: prefix hugs the right
              //     margin (wi===0), continuation lines indent leftward (rightX
              //     = PAGE_W - MARGIN_X - 14 for wi>0).
              //   Latin document  -> LTR list layout: prefix hugs the left
              //     margin (wi===0 at MARGIN_X), continuation lines indent
              //     rightward (leftX = MARGIN_X + 14 for wi>0).
              //
              // Quick task 260608-c8x (Bug B): in an RTL doc, when the item
              // content starts with an LTR-strong char (e.g. English), the
              // single-row "prefix + content" shape resolves to an LTR
              // paragraph -- the row is drawn starting at (rightX - totalW),
              // which leaves the digits + period at the VISUAL LEFT of the
              // row (= LEFT margin of the page). The user sees the "N. "
              // dragged to the wrong margin, inconsistent with sibling
              // Hebrew-content rows in the same list.
              //
              // Fix (Option 1 -- split-row, smaller surface than threading a
              // baseDir option through drawSegmentedLine + shapeForJsPdf):
              // for the FIRST wrapped sub-line of an ordered-list item in an
              // RTL doc, draw the prefix as its OWN drawSegmentedLine call
              // anchored at PAGE_W - MARGIN_X (right margin) and draw the
              // content right-anchored at PAGE_W - MARGIN_X - prefixWidth.
              // Each call shapes independently, so the prefix's first-strong
              // is LTR-only (digits) -- correct -- and the content's
              // first-strong reflects only the content (LTR or RTL on its
              // own). The LTR-doc path and the wi>0 continuation-line path
              // are unchanged.
              //
              // Quick task 260608-cx5 (regression gate on c8x's split-row):
              // the c8x branch above was originally fired for EVERY RTL +
              // ordered + wi===0 row, including Hebrew-content rows that the
              // previous unified-row path was rendering correctly. The
              // unified row let UAX #9 shape the whole row (prefix + content)
              // as one RTL paragraph, producing the correct visual layout.
              // Splitting it shaped prefix and content as two independent
              // paragraphs whose outputs do not compose like a single bidi
              // paragraph would -- the user reported the digit + period
              // mis-arranged relative to Hebrew content.
              //
              // Rule (added below): the split-row branch fires ONLY when the
              // content's first-strong directional char is LTR (the c8x
              // Bug B case -- English content in an RTL doc). For RTL
              // content -- or content with no strong directional chars
              // (digits / punct only -- which firstStrongDir defaults to
              // 'ltr', so this falls under the LTR case and continues to
              // split, which is harmless because there is no bidi resolution
              // to break) -- we route through the unified-row else branch.
              // The content argument is `listStripped` (the inline-bold-
              // stripped item text) -- the user-visible, marker-free text
              // that UAX #9 would consider for paragraph-direction inference.
              if (docDir === 'rtl' && wi === 0 && block.ordered && firstStrongDir(listStripped) === 'ltr') {
                // Measure prefix width at body font + size.
                doc.setFont('Heebo', 'normal');
                doc.setFontSize(BODY_SIZE);
                var prefixW = doc.getStringUnitWidth(listPrefix) * BODY_SIZE;
                // Prefix row-segment: right-anchored at the right margin.
                drawSegmentedLine(
                  [{ text: listPrefix, bold: false }],
                  y, BODY_SIZE,
                  { rightX: PAGE_W - MARGIN_X }
                );
                // Content row-segment: right-anchored just inside the prefix.
                drawSegmentedLine(
                  clippedL, y, BODY_SIZE,
                  { rightX: PAGE_W - MARGIN_X - prefixW }
                );
              } else {
                // Unified-row path: LTR docs, unordered lists, and
                // continuation lines (wi > 0). Prefix is prepended as a
                // regular-weight segment so it participates in bidi
                // paragraph-direction inference; the row anchors per docDir.
                var lineSegments;
                if (wi === 0) {
                  lineSegments = [{ text: listPrefix, bold: false }].concat(clippedL);
                } else {
                  lineSegments = clippedL;
                }
                // Anchor follows docDir + wi: first line hugs the margin,
                // continuation lines indent 14pt inward. Identical to the
                // pre-260608-c8x path so this branch is byte-stable for
                // every list shape it serves (LTR ordered + LTR unordered
                // + RTL unordered + all wi>0 continuations).
                var drawOpts;
                if (docDir === 'rtl') {
                  drawOpts = { rightX: (wi === 0) ? (PAGE_W - MARGIN_X) : (PAGE_W - MARGIN_X - 14) };
                } else {
                  drawOpts = { leftX: (wi === 0) ? MARGIN_X : (MARGIN_X + 14) };
                }
                drawSegmentedLine(lineSegments, y, BODY_SIZE, drawOpts);
              }
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
          setInk(COLOR_BODY_INK); // Phase 34 (34-07, D-07): body ink #2f2d38
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
      // drawSeverityBlock -- the signature two-bar before/after severity block
      // (34-09, D-08/D-10/D-11). Renders STRUCTURALLY from the structured
      // issues[] input (NOT from markdown). Empty issues -> renders nothing
      // (no heading, no track). Per complaint: a section heading once, then one
      // row carrying the complaint name on the START edge and two stacked
      // barlines on the trailing side, each a proportional fill (value/10 ×
      // track) growing FROM THE START EDGE so RTL is correct by construction.
      // The before bar is a FLAT pre-lightened hex (#ee6a6a) — NEVER a GState
      // opacity op — so the content stream stays deterministic (D-08/D-11);
      // shapeForJsPdf is NOT modified. Numerals route through the
      // isInputVisual:false path so digit runs keep visual order under RTL.
      // -----------------------------------------------------------------------
      function drawSeverityBlock(issues) {
        if (!issues || !issues.length) return; // D-08 empty-state: omit entirely

        // D-08 geometry (UI-SPEC item 5): shared 0–10 track 118×8pt r4 on a
        // mint-soft #eef7ea bg; flat fills (before red / after green).
        var TRACK_W = 118, TRACK_H = 8, TRACK_R = 4;
        var COLOR_TRACK       = '#eef7ea';
        var COLOR_BEFORE_FILL = '#ee6a6a'; // FLAT pre-lightened red — NOT a GState op (D-08/D-11)
        var COLOR_AFTER_FILL  = '#2fb37d'; // green "after" fill
        var COLOR_BEFORE_NUM  = '#ea4b4b';
        var COLOR_AFTER_NUM   = '#2fb37d';
        var CAPTION_SIZE = 9.5, NUMERAL_SIZE = 10.5, NAME_SIZE = BODY_SIZE;
        var GAP = 6, BAR_LINE_H = 16, ROW_PAD = 12;
        var captionW = 42, numeralW = 22;
        var barUnitW = captionW + GAP + TRACK_W + GAP + numeralW;
        var rowHeight = BAR_LINE_H * 2 + ROW_PAD;

        // Anchored shaped-text helper — 23-08 invariant (isInputVisual:false) on
        // every draw so shapeForJsPdf output passes through unchanged.
        function drawAt(text, x, baseline, align) {
          var v = shapeForJsPdf(String(text));
          if (align === 'right') doc.text(v, x, baseline, { align: 'right', isInputVisual: false });
          else doc.text(v, x, baseline, { isInputVisual: false });
        }

        // --- Section heading: leaf-diamond + label (pdf.severity.heading) + vein
        // rule (reuses the 34-07 heading style; symmetric bullet = identical
        // LTR/RTL, no mirroring). ---
        y += HEADING_TOP_MARGIN;
        ensureRoom(LINE_HEIGHT_HEADING + HEADING_RULE_GAP + HEADING_BOTTOM_MARGIN);
        var hSize = HEADING_SIZE;
        var dHalf = LEAF_DIAMOND_SIZE / 2;
        var diamondCy = y - hSize * 0.30;
        var diamondCx, labelX;
        if (docDir === 'rtl') {
          diamondCx = PAGE_W - MARGIN_X - dHalf;
          labelX    = PAGE_W - MARGIN_X - LEAF_DIAMOND_SIZE - LEAF_DIAMOND_GAP;
        } else {
          diamondCx = MARGIN_X + dHalf;
          labelX    = MARGIN_X + LEAF_DIAMOND_SIZE + LEAF_DIAMOND_GAP;
        }
        setFill(COLOR_LEAF_DIAMOND);
        doc.triangle(diamondCx, diamondCy - dHalf, diamondCx + dHalf, diamondCy,
                     diamondCx, diamondCy + dHalf, 'F');
        doc.triangle(diamondCx, diamondCy - dHalf, diamondCx - dHalf, diamondCy,
                     diamondCx, diamondCy + dHalf, 'F');
        doc.setFont('Heebo', 'bold');
        doc.setFontSize(hSize);
        setInk(COLOR_BRAND_HEAD);
        drawAt(pdfI18n('pdf.severity.heading', 'Severity — before & after'),
               labelX, y, docDir === 'rtl' ? 'right' : null);
        var sevRuleY = y + HEADING_RULE_GAP;
        setStroke(COLOR_HEADING_RULE);
        doc.setLineWidth(HEADING_RULE_WIDTH);
        doc.line(MARGIN_X, sevRuleY, PAGE_W - MARGIN_X, sevRuleY);
        doc.setTextColor(0, 0, 0);
        doc.setFont('Heebo', 'normal');
        doc.setLineWidth(1);
        y += LINE_HEIGHT_HEADING + HEADING_BOTTOM_MARGIN;

        // Captions reuse the scale labels (resolved once).
        var beforeCaption = pdfI18n('session.copy.scale.before', 'Before');
        var afterCaption  = pdfI18n('session.copy.scale.after', 'After');

        // Per-docDir slot layout (constant across rows): the bar unit hugs the
        // trailing side; the complaint name hugs the START edge. Internal order
        // reads caption -> track -> numeral start->trailing (mirrored under RTL).
        var unitLeftX, nameX, nameAlign;
        var captionX, trackX, numeralX, captionAlign, numeralAlign;
        if (docDir === 'rtl') {
          unitLeftX = MARGIN_X;                         // trailing = left under RTL
          nameX = PAGE_W - MARGIN_X; nameAlign = 'right';
          numeralX  = unitLeftX;                        // leftmost (trailing-most)
          trackX    = unitLeftX + numeralW + GAP;
          captionX  = trackX + TRACK_W + GAP + captionW; // right edge of caption
          captionAlign = 'right'; numeralAlign = null;
        } else {
          unitLeftX = PAGE_W - MARGIN_X - barUnitW;     // trailing = right under LTR
          nameX = MARGIN_X; nameAlign = null;
          captionX  = unitLeftX;                        // leftmost (start-most)
          trackX    = unitLeftX + captionW + GAP;
          numeralX  = trackX + TRACK_W + GAP;
          captionAlign = null; numeralAlign = null;
        }

        // Draw one barline: full track first, then the proportional fill growing
        // from the START edge, then caption + numeral.
        function drawBar(barBaseline, value, has, fillHex, numHex, caption) {
          var trackTop = barBaseline - 7;
          setFill(COLOR_TRACK);
          doc.roundedRect(trackX, trackTop, TRACK_W, TRACK_H, TRACK_R, TRACK_R, 'F');
          if (has) {
            var v = Math.max(0, Math.min(10, value));
            var fillW = (v / 10) * TRACK_W;
            if (fillW > 0.5) {
              // Fill grows from the START edge: LTR from the left, RTL from the
              // right (Pattern 2) — RTL correct by construction (D-10).
              var fillX = (docDir === 'rtl') ? (trackX + TRACK_W - fillW) : trackX;
              var rr = Math.min(TRACK_R, fillW / 2);
              setFill(fillHex);
              doc.roundedRect(fillX, trackTop, fillW, TRACK_H, rr, rr, 'F');
            }
          }
          doc.setFont('Heebo', 'bold'); doc.setFontSize(CAPTION_SIZE); setInk(COLOR_MUTED);
          drawAt(caption, captionX, barBaseline, captionAlign);
          // Numerals are drawn in the REGULAR Heebo weight (not bold): the embedded
          // bold font is a separate subset with its own glyph-id map, and the RTL
          // digit-order gate (34-rtl-newblocks part B) + pdf-digit-order pin the
          // REGULAR digit GIDs (0138–0141). Bold numerals would emit unrecognized
          // GIDs and break the digit-order verification. Colour still distinguishes
          // before (red) from after (green); the value reads clearly at 10.5pt.
          doc.setFont('Heebo', 'normal'); doc.setFontSize(NUMERAL_SIZE); setInk(numHex);
          drawAt(has ? String(value) : '–', numeralX, barBaseline, numeralAlign);
        }

        for (var ii = 0; ii < issues.length; ii++) {
          var issue = issues[ii] || {};
          var beforeVal = Number(issue.before);
          var afterVal  = Number(issue.after);
          var hasBefore = isFinite(beforeVal);
          var hasAfter  = isFinite(afterVal);

          ensureRoom(rowHeight); // Pitfall 5: a severity row never splits mid-bar
          var rowTop = y;

          // complaint name (start-anchored, leading column)
          doc.setFont('Heebo', 'normal'); doc.setFontSize(NAME_SIZE); setInk(COLOR_BODY_INK);
          drawAt(issue.name || '', nameX, rowTop + 10, nameAlign);

          drawBar(rowTop + 10, beforeVal, hasBefore, COLOR_BEFORE_FILL, COLOR_BEFORE_NUM, beforeCaption);
          drawBar(rowTop + 10 + BAR_LINE_H, afterVal, hasAfter, COLOR_AFTER_FILL, COLOR_AFTER_NUM, afterCaption);

          y = rowTop + rowHeight;

          if (ii < issues.length - 1) {
            setStroke(COLOR_TRACK);
            doc.setLineWidth(1);
            doc.line(MARGIN_X, y - 6, PAGE_W - MARGIN_X, y - 6);
          }
        }

        // Restore a clean baseline for downstream renderer code.
        doc.setTextColor(0, 0, 0);
        doc.setFont('Heebo', 'normal');
        doc.setLineWidth(1);
      }

      // Phase 34 (34-09, D-08; REVISED Change 1): the severity bars render
      // STRUCTURALLY from the forwarded issues[] (34-05) — now in their form-order
      // slot inside the block loop above (drawSeverityBlock called just before the
      // section that follows severityAfterSections leading sections). This
      // post-loop call is the FALLBACK: it fires only when that slot was never
      // reached (a body with fewer section headings than severityAfterSections, or
      // none at all), where the end IS the correct form slot. Severity is never
      // emitted as markdown body text (removed in 34-09).
      if (!severityDrawn) {
        drawSeverityBlock(severityIssues);
        severityDrawn = true;
      }

      // -----------------------------------------------------------------------
      // Footer pass -- full-bleed three-zone footer band on every page (34-07)
      // -----------------------------------------------------------------------

      // Phase 34 (34-07, D-09/D-10/D-12): the footer band. A mint-soft (#eef7ea)
      // top rule across the content width, then three zones along the existing
      // footer baseline: START = a small offline logo + the made-with brand-as-
      // tool mark (#456b42 bold — never a letterhead); CENTER = the per-locale
      // "Page X of Y" label (unchanged switch); END = 'Exported on' + date
      // (muted #5f5c72). Under RTL the START/END zones mirror (made-with on the
      // right, exported-on on the left); every doc.text passes isInputVisual:false
      // and anchors by docDir so numerals keep visual order (D-10).
      function drawFooterBand(pn, totalPages) {
        var baseY = FOOTER_BASELINE_Y;
        var footSize = 8.5;

        // Mint-soft top rule (D-09 / FINAL mockup `.rfoot` — NOT the #bfe0b0 vein).
        setStroke(COLOR_FOOTER_RULE);
        doc.setLineWidth(FOOTER_RULE_WIDTH);
        doc.line(MARGIN_X, baseY - 16, PAGE_W - MARGIN_X, baseY - 16);
        doc.setLineWidth(1);

        var haveLogo = (typeof window.IconLogoBase64 === 'string' && window.IconLogoBase64.length > 0);
        var logoY = baseY - 11; // vertically centred on the ~8.5pt footer text
        var madeVisual = shapeForJsPdf(
          pdfI18n('pdf.footer.madeWith', 'Made with Sessions Garden · sessionsgarden.app'));

        // Phase 34 (34-10 gap fix B6): the three footer zones previously overlapped
        // — the long made-with mark overran into the page-centered "Page X of Y"
        // label ("sessionsgarden.aPage 1 of 2"). Fix: center the page label at the
        // TRUE page center, measure its half-width, then AUTO-FIT each side zone's
        // font so it can never reach the center label (CLEARANCE gap on each side).
        // Deterministic and locale-agnostic: works for any content under LTR/RTL.
        var CLEARANCE = 12;            // min gap between center label and each side
        var FOOT_MIN_SIZE = 6.5;       // smallest acceptable side-zone font

        // fitSize: largest size <= desired whose shaped width fits maxWidth (floored
        // at minSize). getStringUnitWidth scales linearly with size, so the ratio is
        // exact. maxWidth <= 0 (degenerate) just returns minSize.
        function fitSize(visual, weight, maxWidth, desired, minSize) {
          doc.setFont('Heebo', weight);
          doc.setFontSize(desired);
          var w = doc.getStringUnitWidth(visual) * desired;
          if (maxWidth <= 0) return minSize;
          if (w <= maxWidth) return desired;
          var s = desired * (maxWidth / w);
          return (s < minSize) ? minSize : s;
        }

        // ---- CENTER zone (measured first): the localized "Page X of Y" label,
        // truly centered at pageWidth/2 (23-09 i18n switch; Hebrew RTL word order
        // resolved by the bidi pre-shape).
        var label = (opts.uiLang === 'he') ? ('עמוד ' + pn + ' מתוך ' + totalPages)
                  : (opts.uiLang === 'de') ? ('Seite ' + pn + ' von ' + totalPages)
                  : (opts.uiLang === 'cs') ? ('Stránka ' + pn + ' z ' + totalPages)
                  : ('Page ' + pn + ' of ' + totalPages);
        var labelVisual = shapeForJsPdf(label);
        var centerX = pageWidth / 2;
        doc.setFont('Heebo', 'normal');
        doc.setFontSize(META_SIZE);
        var centerHalfW = (doc.getStringUnitWidth(labelVisual) * META_SIZE) / 2;
        var centerLeft = centerX - centerHalfW;
        var centerRight = centerX + centerHalfW;

        var exportedOnVal = String(sessionData.exportedOn || '');
        var haveExported = exportedOnVal.length > 0;
        var exportedVisual = haveExported
          ? shapeForJsPdf(pdfI18n('pdf.footer.exportedOn', 'Exported on') + ' ' + exportedOnVal)
          : '';

        // ---- START zone: small logo + made-with mark (#456b42 bold). Auto-fit so
        // its trailing edge clears the centered label by CLEARANCE.
        if (docDir === 'rtl') {
          // START = right edge: logo hugs the right margin, text to its left.
          var rLogoX = PAGE_W - MARGIN_X - FOOTER_LOGO_SIZE;
          if (haveLogo) {
            try { doc.addImage('data:image/png;base64,' + window.IconLogoBase64, 'PNG', rLogoX, logoY, FOOTER_LOGO_SIZE, FOOTER_LOGO_SIZE); } catch (e) { /* never abort on a logo failure */ }
          }
          var rTextX = (haveLogo ? rLogoX : (PAGE_W - MARGIN_X)) - FOOTER_LOGO_GAP;
          var madeMaxR = rTextX - (centerRight + CLEARANCE);
          var madeSizeR = fitSize(madeVisual, 'bold', madeMaxR, footSize, FOOT_MIN_SIZE);
          doc.setFont('Heebo', 'bold'); doc.setFontSize(madeSizeR); setInk(COLOR_BRAND_HEAD);
          doc.text(madeVisual, rTextX, baseY, { align: 'right', isInputVisual: false });
        } else {
          var lLogoX = MARGIN_X;
          if (haveLogo) {
            try { doc.addImage('data:image/png;base64,' + window.IconLogoBase64, 'PNG', lLogoX, logoY, FOOTER_LOGO_SIZE, FOOTER_LOGO_SIZE); } catch (e) { /* never abort on a logo failure */ }
          }
          var lTextX = MARGIN_X + (haveLogo ? (FOOTER_LOGO_SIZE + FOOTER_LOGO_GAP) : 0);
          var madeMaxL = (centerLeft - CLEARANCE) - lTextX;
          var madeSizeL = fitSize(madeVisual, 'bold', madeMaxL, footSize, FOOT_MIN_SIZE);
          doc.setFont('Heebo', 'bold'); doc.setFontSize(madeSizeL); setInk(COLOR_BRAND_HEAD);
          doc.text(madeVisual, lTextX, baseY, { isInputVisual: false });
        }

        // ---- Draw CENTER label (font/size restored to META_SIZE).
        doc.setFont('Heebo', 'normal');
        doc.setFontSize(META_SIZE);
        setInk(COLOR_MUTED);
        doc.text(labelVisual, centerX, baseY, { align: 'center', isInputVisual: false });

        // ---- END zone: 'Exported on' + date (muted #5f5c72), relabelled per D-09
        // to disambiguate from the card's session date (34-05). Auto-fit so its
        // leading edge clears the centered label by CLEARANCE. Anchored by docDir
        // and routed through shapeForJsPdf so the Hebrew date keeps day-month-year
        // visual order (B7: correct once the localized RTL label is present).
        if (haveExported) {
          if (docDir === 'rtl') {
            // END = left edge.
            var expMaxR = (centerLeft - CLEARANCE) - MARGIN_X;
            var expSizeR = fitSize(exportedVisual, 'normal', expMaxR, footSize, FOOT_MIN_SIZE);
            doc.setFont('Heebo', 'normal'); doc.setFontSize(expSizeR); setInk(COLOR_MUTED);
            doc.text(exportedVisual, MARGIN_X, baseY, { isInputVisual: false });
          } else {
            var expMaxL = (PAGE_W - MARGIN_X) - (centerRight + CLEARANCE);
            var expSizeL = fitSize(exportedVisual, 'normal', expMaxL, footSize, FOOT_MIN_SIZE);
            doc.setFont('Heebo', 'normal'); doc.setFontSize(expSizeL); setInk(COLOR_MUTED);
            doc.text(exportedVisual, PAGE_W - MARGIN_X, baseY, { align: 'right', isInputVisual: false });
          }
        }

        // Restore a clean baseline for any downstream code.
        doc.setTextColor(0, 0, 0);
        doc.setFont('Heebo', 'normal');
      }

      var totalPages = doc.getNumberOfPages();
      for (var pn = 1; pn <= totalPages; pn++) {
        doc.setPage(pn);
        drawFooterBand(pn, totalPages);
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
