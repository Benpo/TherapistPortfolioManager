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
    // Bold first (non-greedy, single-line), then italic (negative lookbehind/ahead to skip ** runs).
    var out = text.replace(/\*\*([^*\n]+?)\*\*/g, "<strong>$1</strong>");
    out = out.replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, "$1<em>$2</em>");
    return out;
  }

  // ── List helpers (ordered + nested support, Phase 45 D-04/D-05) ──────────────
  // A list item opens (after optional leading spaces) with a bullet ("-"/"*") or
  // an "N." ordinal, followed by whitespace. Ordinals require whitespace after
  // the dot so "1.5 mg" stays a paragraph, not a list.
  function isListItem(line) {
    return /^\s*(?:[-*]|\d+\.)\s+/.test(line);
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
    return /^\s*\d+\.\s+/.test(line) ? "ol" : "ul";
  }
  function stripListMarker(line) {
    return line.replace(/^\s*(?:[-*]|\d+\.)\s+/, "");
  }
  // Build nested <ul>/<ol> from a run of list-item lines by leading-whitespace
  // depth. items[start] opens a list element of items[start].type at `depth`.
  function buildListLevel(items, start, depth) {
    var type = items[start].type;
    var html = "<" + type + ">";
    var i = start;
    while (i < items.length && items[i].depth >= depth) {
      if (items[i].depth > depth) { i++; continue; } // safety (unreached in practice)
      var content = applyInline(items[i].content);
      var j = i + 1;
      if (j < items.length && items[j].depth > depth) {
        var k = j;
        while (k < items.length && items[k].depth > depth) { k++; }
        html += "<li>" + content + buildListLevel(items, j, items[j].depth) + "</li>";
        i = k;
      } else {
        html += "<li>" + content + "</li>";
        i = j;
      }
    }
    html += "</" + type + ">";
    return html;
  }
  function buildList(listLines) {
    var items = listLines.map(function (l) {
      return { depth: listDepth(l), type: listType(l), content: stripListMarker(l) };
    });
    return buildListLevel(items, 0, items[0].depth);
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

  return {
    render: render,
  };
})();
