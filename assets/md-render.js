// md-render.js — minimal Markdown → HTML renderer; registers window.MdRender.
// Supported subset: # / ## / ### headings, **bold**, *italic*, unordered lists,
// blank-line paragraphs, line-break. HTML-escapes all input before applying
// markdown rules — output is safe to assign via element.innerHTML.
window.MdRender = (function () {
  "use strict";

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function applyInline(text) {
    // text is already escaped — only ** and * sequences (which survived escape) get re-mapped.
    // D-08 hardening: markers must HUG non-whitespace, so a legacy "2 * 3 * 4" or
    //   "** bold **" stays literal. The content group opens AND closes on a
    //   non-whitespace char ([^*\s\n]) with any non-star middle ([^*\n]).
    //   NO regex lookbehind is used — Safari < 16.4 lacks it; the closing-hug
    //   rule is expressed with a character-class boundary instead.
    // SHARED CONTRACT: these two emphasis regexes are CHARACTER-IDENTICAL to
    //   pdf-export.js stripInlineMarkdown's (Plan 02); Plan 05 Task 1 asserts it.
    //   Bold first (single-line), then italic (the (^|[^*]) prefix + (?!\*) suffix
    //   keep italic from matching inside ** runs).
    var out = text.replace(/\*\*([^*\s\n](?:[^*\n]*?[^*\s\n])?)\*\*/g, "<strong>$1</strong>");
    out = out.replace(/(^|[^*])\*([^*\s\n](?:[^*\n]*?[^*\s\n])?)\*(?!\*)/g, "$1<em>$2</em>");
    return out;
  }

  // ── List helpers (ordered + nested support, Phase 45 D-04/D-05) ──────────────
  // A list item opens (after optional leading spaces) with a bullet ("-"/"*") or
  // an "N." ordinal, followed by WHITESPACE OR END-OF-LINE. GAP-45-02 (Ben's
  // 2026-07-13 lock): a marker-only line (bare "-"/"*"/"N." with optional trailing
  // whitespace) is an EMPTY list item, so "1." ≡ "1. " and nothing typed
  // disappears (CommonMark-aligned). DETECTION uses a lookahead `(?=\s|$)` so the
  // marker may be followed by whitespace or the line end; the 1.5-guard is
  // preserved because in "1.5" the ordinal dot is followed by a digit (neither
  // whitespace nor end), so the ordinal branch fails and the line stays a paragraph.
  function isListItem(line) {
    return /^\s*(?:[-*]|\d+\.)(?=\s|$)/.test(line);
  }
  // SHARED NESTING CONVENTION (pinned; Plan 02 mirrors it): 2 leading spaces =
  // one nesting level. floor(spaces/2) also folds the 3-space ordinal-continuation
  // indent ("   1. b" under "1. a") to level 1.
  function listDepth(line) {
    var m = line.match(/^( *)/);
    return Math.floor(m[1].length / 2);
  }
  // Each run's ordered-ness is decided by ITS OWN marker, not the parent's, so
  // mixed-type nesting ("- a\n  1. b") renders an <ol> inside a <ul> <li>.
  function listType(line) {
    // GAP-45-02: a bare "N." (marker-only) is still recognised as ordered — the
    // ordinal test uses the lookahead form so "1." ≡ "1. " both yield "ol".
    return /^\s*\d+\.(?=\s|$)/.test(line) ? "ol" : "ul";
  }
  function stripListMarker(line) {
    // GAP-45-02: STRIPPING consumes the marker then trailing whitespace-OR-END
    // `(?:\s+|$)`, so a marker-only line strips to "" (an empty item body).
    return line.replace(/^\s*(?:[-*]|\d+\.)(?:\s+|$)/, "");
  }
  // GAP-45-04 (Ben's 2026-07-13 editor-1:1 lock): capture the TYPED ordinal of an
  // ordered line so read mode can emit `<li value="N">` and the on-screen number
  // equals what the user typed (screen ≡ PDF). The capture regex is
  // CHARACTER-MATCHED to pdf-export.js parseMarkdown's `ordMatch` so the two
  // pipelines agree on the ordinal (bare "5." → 5; "1.5" fails the branch → null,
  // preserving the round-1 1.5-guard). This ONLY ADDS a numeric capture — it does
  // NOT touch the DETECTION helpers (isListItem/listType/stripListMarker). The
  // returned value is `parseInt` of a `\d+` group, so it is a finite integer whose
  // string form is digits-only — no user-controlled text ever reaches the attribute.
  function listOrdinal(line) {
    var m = /^\s*(\d+)\.(?:\s+|$)/.exec(line);
    return m ? parseInt(m[1], 10) : null;
  }
  // Build nested <ul>/<ol> from a run of list-item lines by leading-whitespace
  // depth. GAP-45-03 (Ben's 2026-07-13 CommonMark lock): a same-depth marker-TYPE
  // flip closes the current list and opens a SIBLING list, so read mode matches
  // the PDF's per-item markers. A DEEPER child of a differing type is nested, not
  // split — only a same-depth sibling flip starts a new list.
  //
  // buildOneList opens ONE <type> element, consumes a maximal run of SAME-type
  // items at `depth` (recursing on deeper children through the sibling-splitting
  // path so a child-run flip splits too), and STOPS at the first same-depth item
  // whose OWN type differs. It returns the HTML and the index it stopped at.
  function buildOneList(items, start, depth) {
    var type = items[start].type;
    var html = "<" + type + ">";
    var i = start;
    while (i < items.length && items[i].depth >= depth) {
      if (items[i].depth > depth) { i++; continue; } // safety (unreached in practice)
      // GAP-45-03: a same-depth sibling whose own marker type differs ends this
      // list; buildSiblingLists opens a new sibling list of the flipped type.
      if (items[i].type !== type) { break; }
      var content = applyInline(items[i].content);
      // GAP-45-04: an ordered item opens with its TYPED ordinal as value="N";
      // an unordered item opens with a bare <li> (bullets never carry value).
      // The ordinal is the integer from listOrdinal (parseInt of \d+), never
      // `content`/raw text, so nothing user-controlled lands in the attribute.
      // Each ordered run's first <li> carries its own ordinal, so display
      // continuity holds across a flip (1. a / - b / 2. c shows 1 / bullet / 2).
      var liOpen = items[i].type === "ol" ? '<li value="' + items[i].ordinal + '">' : "<li>";
      var j = i + 1;
      if (j < items.length && items[j].depth > depth) {
        var k = j;
        while (k < items.length && items[k].depth > depth) { k++; }
        html += liOpen + content + buildSiblingLists(items, j, items[j].depth) + "</li>";
        i = k;
      } else {
        html += liOpen + content + "</li>";
        i = j;
      }
    }
    html += "</" + type + ">";
    return { html: html, next: i };
  }
  // buildSiblingLists emits a maximal SERIES of sibling lists at `depth`: it loops
  // buildOneList while same-depth items remain, so a same-depth marker-type flip
  // (GAP-45-03) opens a fresh sibling list of the flipped type at ANY depth.
  function buildSiblingLists(items, start, depth) {
    var html = "";
    var i = start;
    while (i < items.length && items[i].depth >= depth) {
      var res = buildOneList(items, i, depth);
      html += res.html;
      if (res.next <= i) { break; } // safety against non-advancement
      i = res.next;
    }
    return html;
  }
  function buildList(listLines) {
    var items = listLines.map(function (l) {
      return { depth: listDepth(l), type: listType(l), content: stripListMarker(l), ordinal: listOrdinal(l) };
    });
    return buildSiblingLists(items, 0, items[0].depth);
  }

  // Single-newline paragraph behavior is LOCKED — consecutive non-blank lines
  //   within a paragraph render with <br> joins (line below). Blank line = new
  //   paragraph. Matches standard CommonMark / GitHub flavor / Notion contract.
  //   Do NOT change.
  // Heading regex accepts an optional body remainder after the heading line, so
  //   "## heading\nbody" renders as <h2>heading</h2><p>body</p> instead of
  //   <p>## heading<br>body</p>. Single-line headings unchanged.
  function renderBlock(block) {
    if (!block) return "";
    // Headings — accept optional body remainder after the heading line.
    var headingMatch = block.match(/^(#{1,3})\s+([^\n]*)(?:\n([\s\S]*))?$/);
    if (headingMatch) {
      var level = headingMatch[1].length;
      var headingHtml = "<h" + level + ">" + applyInline(headingMatch[2]) + "</h" + level + ">";
      var remainder = headingMatch[3];
      if (remainder && remainder.trimStart().length > 0) {
        return headingHtml + renderBlock(remainder.trimStart());
      }
      return headingHtml;
    }
    // Lists — bullet ("- "/"* ") OR ordered ("1. "), possibly nested by indent.
    // A list item is a line that (after optional leading spaces) opens with a
    // bullet or an "N." ordinal marker followed by whitespace.
    var lines = block.split(/\r?\n/).filter(function (l) { return l.length > 0; });
    // GAP-45-01: a heading line (#/##/### + whitespace) typed directly UNDER a
    // text line (no blank-line block boundary) must render as a REAL heading, not
    // a literal "## X" joined with <br>. Scan for the FIRST heading line and, if
    // it is not at index 0, split like the WARNING-3 text-then-list split below:
    // render the leading text as its own sub-block, then recurse on the remainder
    // STARTING at the heading line (the block-start heading branch above then
    // consumes it, and its body-remainder recursion re-enters this same split, so
    // one split also fixes "### Sub" after text inside a heading's body). Index 0
    // never reaches here — a block that opens with a heading is fully handled by
    // the block-start branch. This converges read mode toward pdf-export's already
    // -correct paragraph-terminates-at-heading behavior (the PDF needs no change).
    var firstHeadingIdx = -1;
    for (var hi = 0; hi < lines.length; hi++) {
      if (/^#{1,3}\s+/.test(lines[hi])) { firstHeadingIdx = hi; break; }
    }
    if (firstHeadingIdx > 0) {
      return renderBlock(lines.slice(0, firstHeadingIdx).join("\n")) +
             renderBlock(lines.slice(firstHeadingIdx).join("\n"));
    }
    var firstListIdx = -1;
    for (var fi = 0; fi < lines.length; fi++) {
      if (isListItem(lines[fi])) { firstListIdx = fi; break; }
    }
    if (firstListIdx !== -1) {
      // WARNING 3: leading NON-list text line(s) then a list run (no blank line,
      // e.g. "Emotions:\n- anger") — split at the first list line: render the
      // leading text as a paragraph, then recurse on the list remainder. Mirrors
      // the heading-remainder recursion above (never emit a literal "- token").
      if (firstListIdx > 0) {
        var leading = lines.slice(0, firstListIdx).join("\n");
        var listRest = lines.slice(firstListIdx).join("\n");
        return renderBlock(leading) + renderBlock(listRest);
      }
      // Symmetrically, a NON-list line ENDS the list run — render the completed
      // list, then recurse on the remaining lines as a fresh sub-block.
      var endIdx = lines.length;
      for (var ei = 0; ei < lines.length; ei++) {
        if (!isListItem(lines[ei])) { endIdx = ei; break; }
      }
      var listLines = lines.slice(0, endIdx);
      var tailLines = lines.slice(endIdx);
      var listHtml = buildList(listLines);
      if (tailLines.length > 0) {
        return listHtml + renderBlock(tailLines.join("\n"));
      }
      return listHtml;
    }
    // Paragraph — preserve single newlines as <br>.
    var inner = applyInline(block).replace(/\r?\n/g, "<br>");
    return "<p>" + inner + "</p>";
  }

  function render(markdown) {
    if (markdown === null || markdown === undefined) return "";
    var escaped = escapeHtml(String(markdown));
    // Normalize line endings.
    escaped = escaped.replace(/\r\n/g, "\n");
    // Split on blank-line separators (one or more empty lines).
    var blocks = escaped.split(/\n{2,}/);
    var rendered = blocks.map(renderBlock).filter(function (s) { return s.length > 0; });
    return rendered.join("\n");
  }

  // strip(markdown) — D-06 shared markdown -> PLAIN TEXT helper for the compact
  //   surfaces (Plan 04). Output is plain text assigned via textContent (NEVER
  //   innerHTML), so it does NOT HTML-escape. Removes inline emphasis with the
  //   SAME hardened D-08 rule as applyInline (so "2 * 3 * 4" stays literal) and
  //   strips leading block markers per line (heading #/##/###, bullet -/*,
  //   ordered N.). Line breaks between note lines are preserved with a single
  //   "\n" join; compact consumers truncate as needed.
  function stripInline(text) {
    var out = text.replace(/\*\*([^*\s\n](?:[^*\n]*?[^*\s\n])?)\*\*/g, "$1");
    out = out.replace(/(^|[^*])\*([^*\s\n](?:[^*\n]*?[^*\s\n])?)\*(?!\*)/g, "$1$2");
    return out;
  }
  function strip(markdown) {
    if (markdown === null || markdown === undefined) return "";
    var text = String(markdown).replace(/\r\n/g, "\n");
    var lines = text.split("\n").map(function (line) {
      var l = line.replace(/^\s*#{1,3}\s+/, "");            // heading marker
      // GAP-45-02: same marker-only rule as the render path — strip a marker then
      // `(?:\s+|$)` so "1." ≡ "1. " here too; the compact-surface callers guard the
      // result with `|| "-"`, which absorbs an empty string. 1.5-guard preserved.
      l = l.replace(/^\s*(?:[-*]|\d+\.)(?:\s+|$)/, "");     // bullet or ordered marker
      return stripInline(l);
    });
    return lines.join("\n");
  }

  return {
    render: render,
    strip: strip,
  };
})();
