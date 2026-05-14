/**
 * md-render.js — minimal Markdown → HTML renderer for the export preview pane.
 *
 * Subset: # / ## / ### / **bold** / *italic* / unordered lists / blank-line paragraphs / line-break.
 * Security: HTML-escapes all input BEFORE applying markdown rules. The output is safe to assign
 * via element.innerHTML in the consumer (Plan 22-06). No <script>, <img onerror=>, javascript: URLs,
 * or other tags can survive the escape pass — markdown rules only reintroduce a fixed set of
 * structural tags (h1/h2/h3/strong/em/ul/li/p/br) over already-escaped text.
 *
 * No external dependencies. No DOM access. Pure string transformation.
 */
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

  // D-23 (Phase 24): single-newline paragraph behavior is LOCKED — consecutive non-blank
  //   lines within a paragraph render with <br> joins (line below). Blank line = new paragraph.
  //   Matches standard CommonMark / GitHub flavor / Notion contract. Do NOT change.
  // D-24 (Phase 24): heading regex now accepts an optional body remainder after the
  //   heading line, so "## heading\nbody" renders as <h2>heading</h2><p>body</p> instead
  //   of <p>## heading<br>body</p>. Single-line headings unchanged.
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
    // Lists — every non-empty line begins with "- " or "* ".
    var lines = block.split(/\r?\n/).filter(function (l) { return l.length > 0; });
    var allListItems = lines.length > 0 && lines.every(function (l) {
      return /^[-*]\s+.+/.test(l);
    });
    if (allListItems) {
      var items = lines.map(function (l) {
        return "<li>" + applyInline(l.replace(/^[-*]\s+/, "")) + "</li>";
      });
      return "<ul>" + items.join("") + "</ul>";
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
