// ─────────────────────────────────────────────────────────────────────────────
// text-edit.js — the rich-text toolbar's undo-safe edit primitive + pure string
//   transforms.
//
// OWNS: the SINGLE undo-safe insertion chokepoint `editInsert` (every
//   programmatic textarea edit in the toolbar routes through it so the browser's
//   native undo stack and the real `input` event autoGrow/snippets observe are
//   both preserved), plus the side-effect-free string transforms that compute
//   WHAT to insert: inline emphasis toggle (bold/italic), list-marker insert,
//   heading apply/clear, list auto-format on Enter, indent/outdent, and
//   ordered-list renumber. Each transform is `(value, sel...) -> {value,
//   selStart, selEnd, replacement:{start,end,text}}` and is unit-testable in the
//   zero-npm node runner without a browser (mirrors window.Snippets.__testExports).
// PUBLIC SURFACE: window.TextEdit — { editInsert, toggleWrap, insertListMarker,
//   applyHeading, autoFormatEnter, indentLine, outdentLine, renumberOrderedBlock }.
//   Also window.TextEdit.__testExports exposing every pure helper (+ currentLine)
//   so the node runner can exercise them headlessly.
// DEPENDENCIES: document.execCommand + the marker grammar of md-render.js — the
//   bold token is `**`, the italic token is `*`, the list-marker forms are `- `
//   / `* ` / `N. `, and the nesting unit is 2 leading spaces (Math.floor(spaces/2),
//   shared with md-render.js listDepth and pdf-export.js parseMarkdown). The
//   markers this module EMITS must be exactly those the renderer + PDF ACCEPT.
// CONSTRAINTS: editInsert uses `document.execCommand('insertText', ...)`
//   DELIBERATELY and IRREPLACEABLY. Despite its "deprecated" banner it is the
//   ONLY textarea-edit API that (a) mutates the value, (b) keeps the native undo
//   stack intact, and (c) fires a genuine `input` event. The modern-looking
//   range-replacing textarea method (the `set-range-text` sibling) LOOKS like
//   the right replacement but ALSO wipes undo in Chrome/Safari — a future
//   "cleanup" must NOT modernize editInsert into it or it silently breaks Ctrl+Z
//   and the undo/redo buttons, which depend on the native stack. That
//   undo-wiping identifier is deliberately kept OUT of this file as a literal
//   token so a source grep asserting its absence stays green. The transforms are
//   pure — no DOM, no regex backtracking hazards, linear scans over one note field.
// ─────────────────────────────────────────────────────────────────────────────
window.TextEdit = (function () {
  "use strict";

  // ── Marker grammar (character-matched to md-render.js) ─────────────────────
  var BOLD = "**";
  var ITALIC = "*";
  // isListItem / list-detection regex — CHARACTER-IDENTICAL to md-render.js
  // isListItem so a marker this module emits is a marker the renderer accepts.
  var LIST_RE = /^\s*(?:[-*]|\d+\.)(?=\s|$)/;
  var INDENT = "  "; // 2 spaces = one nesting level (shared convention)

  // ── The undo-safe insertion chokepoint ─────────────────────────────────────
  // Select [start,end] then let `insertText` overwrite it. On the extremely rare
  // env where execCommand is unavailable (returns false), fall back to a value-
  // splice and MANUALLY re-dispatch a real bubbling `input` event so autoGrow +
  // snippets still react — undo is lost on that path only, which is why the
  // primary path must stay execCommand (see the CONSTRAINTS banner above).
  function editInsert(textarea, start, end, replacement) {
    textarea.focus();
    textarea.setSelectionRange(start, end);
    var ok = document.execCommand('insertText', false, replacement);
    if (!ok) {
      var v = textarea.value;
      textarea.value = v.slice(0, start) + replacement + v.slice(end);
      var caret = start + replacement.length;
      textarea.setSelectionRange(caret, caret);
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  // ── Shared helpers ─────────────────────────────────────────────────────────
  // The line containing caret `sel`: start is the index after the previous
  // newline (0 if none), end is the next newline (or value length).
  function currentLine(value, sel) {
    var start = value.lastIndexOf("\n", sel - 1) + 1;
    var end = value.indexOf("\n", sel);
    if (end === -1) end = value.length;
    return { start: start, end: end, text: value.slice(start, end), caretInLine: sel - start };
  }
  function leadingSpaces(text) {
    return /^( *)/.exec(text)[1];
  }
  // Apply a {start,end,text} replacement to a value — the exact edit editInsert
  // performs in-browser; every transform's returned `value` equals this.
  function applyReplacement(value, rep) {
    return value.slice(0, rep.start) + rep.text + value.slice(rep.end);
  }
  function result(value, rep, selStart, selEnd) {
    return { value: value, selStart: selStart, selEnd: selEnd, replacement: rep };
  }

  // ── Inline emphasis toggle ─────────────────────────────────────────────────
  // marker is BOLD ("**") or ITALIC ("*"). Three cases, NEVER a doubled artifact:
  //  (a) selection already immediately surrounded by the marker → unwrap;
  //  (b) empty selection → insert one marker pair, caret placed BETWEEN them;
  //  (c) non-empty selection → wrap it.
  function toggleWrap(value, s, e, marker) {
    var m = marker.length;
    var wrapped = value.slice(s - m, s) === marker && value.slice(e, e + m) === marker;
    if (wrapped) {
      var inner = value.slice(s, e);
      var rep = { start: s - m, end: e + m, text: inner };
      return result(applyReplacement(value, rep), rep, s - m, e - m);
    }
    if (s === e) {
      var repPair = { start: s, end: e, text: marker + marker };
      // Caret sits between the two markers (single pair, no quadrupling).
      return result(applyReplacement(value, repPair), repPair, s + m, s + m);
    }
    var sel = value.slice(s, e);
    var repWrap = { start: s, end: e, text: marker + sel + marker };
    return result(applyReplacement(value, repWrap), repWrap, s + m, e + m);
  }

  // ── List-marker insert ─────────────────────────────────────────────────────
  // Prefix the caret's line, at its leading-whitespace boundary, with the bullet
  // token ("- ") or the numbered token ("1. ").
  function insertListMarker(value, s, e, kind) {
    var line = currentLine(value, s);
    var lead = leadingSpaces(line.text);
    var at = line.start + lead.length;
    var token = kind === "ol" ? "1. " : "- ";
    var rep = { start: at, end: at, text: token };
    var shift = token.length;
    return result(applyReplacement(value, rep), rep, s + shift, e + shift);
  }

  // ── Heading apply / clear ──────────────────────────────────────────────────
  // level 1/2/3 sets the line's leading heading tokens ("# "/"## "/"### ");
  // level 0 strips any existing leading heading tokens. Idempotent net of caret:
  // level N then level 0 returns the original line.
  function applyHeading(value, s, e, level) {
    var line = currentLine(value, s);
    var m = /^( *)(#{1,3}\s+)?/.exec(line.text);
    var lead = m[1] || "";
    var existing = m[2] || "";
    var newPrefix = level > 0 ? (new Array(level + 1).join("#") + " ") : "";
    var repStart = line.start + lead.length;
    var repEnd = repStart + existing.length;
    var rep = { start: repStart, end: repEnd, text: newPrefix };
    var delta = newPrefix.length - existing.length;
    var ns = s >= repEnd ? s + delta : (s > repStart ? repStart + newPrefix.length : s);
    var ne = e >= repEnd ? e + delta : (e > repStart ? repStart + newPrefix.length : e);
    if (ns < repStart) ns = repStart;
    if (ne < repStart) ne = repStart;
    return result(applyReplacement(value, rep), rep, ns, ne);
  }

  // ── List mechanics ─────────────────────────────────────────────────────────
  // Parse a list line into { lead, marker, ordinal, body } or null if the line
  // is not a list item. `body` is the text after the marker+whitespace ("" for a
  // marker-only line); `ordinal` is the typed number (null for a bullet). Uses
  // the SAME detection as md-render.js so continuation only fires on lines the
  // renderer treats as list items.
  function parseListLine(text) {
    if (!LIST_RE.test(text)) return null;
    var m = /^( *)([-*]|(\d+)\.)(?:\s+([\s\S]*))?$/.exec(text);
    if (!m) return null;
    return {
      lead: m[1],
      marker: m[2],
      ordinal: m[3] !== undefined ? parseInt(m[3], 10) : null,
      body: m[4] || "",
    };
  }

  // autoFormatEnter(value, sel): the Enter-key list behavior.
  //  - non-list line          → null (caller lets the native Enter happen).
  //  - list line, EMPTY body:
  //       top level (0 lead)  → remove the marker, exiting the list;
  //       nested (>=2 lead)   → drop exactly ONE indent level (2 spaces).
  //  - list line, NON-empty body → insert "\n" + same lead + the next marker so
  //       the list continues (bullet reuses its token; ordered → ordinal+1).
  function autoFormatEnter(value, sel) {
    var line = currentLine(value, sel);
    var parsed = parseListLine(line.text);
    if (!parsed) return null;
    if (parsed.body.length === 0) {
      if (parsed.lead.length === 0) {
        // Exit: strip the whole marker, leaving just the (empty) leading indent.
        var repExit = { start: line.start, end: line.end, text: parsed.lead };
        var caretExit = line.start + parsed.lead.length;
        return result(applyReplacement(value, repExit), repExit, caretExit, caretExit);
      }
      // Outdent one level: remove the first two leading spaces of the line.
      var repOut = { start: line.start, end: line.start + INDENT.length, text: "" };
      var caretOut = Math.max(line.start, sel - INDENT.length);
      return result(applyReplacement(value, repOut), repOut, caretOut, caretOut);
    }
    // Continue: newline + same indent + next marker.
    var nextMarker = parsed.ordinal !== null ? (parsed.ordinal + 1) + ". " : parsed.marker + " ";
    var insertion = "\n" + parsed.lead + nextMarker;
    var repCont = { start: sel, end: sel, text: insertion };
    var caretCont = sel + insertion.length;
    return result(applyReplacement(value, repCont), repCont, caretCont, caretCont);
  }

  // indentLine(value, sel, dir): dir 'in' adds one indent level (2 spaces) at the
  // caret's line start; dir 'out' removes up to one level. Callers only invoke
  // this on list lines (Tab keeps native focus-move on non-list lines — no
  // keyboard trap).
  function indentLine(value, sel, dir) {
    var line = currentLine(value, sel);
    if (dir === "out") {
      var lead = leadingSpaces(line.text);
      var remove = Math.min(INDENT.length, lead.length);
      var repOut = { start: line.start, end: line.start + remove, text: "" };
      var caret = Math.max(line.start, sel - remove);
      return result(applyReplacement(value, repOut), repOut, caret, caret);
    }
    var repIn = { start: line.start, end: line.start, text: INDENT };
    return result(applyReplacement(value, repIn), repIn, sel + INDENT.length, sel + INDENT.length);
  }
  function outdentLine(value, sel) {
    return indentLine(value, sel, "out");
  }

  // renumberOrderedBlock(value, sel): rewrite the contiguous list block around
  // the caret so every ordered run reads 1..N PER nesting depth. The
  // caret's intra-line offset is preserved across the rewrite. When
  // the numbering is already correct the result is a NO-OP (unchanged value +
  // empty-length replacement) so the caller can skip editInsert entirely and not
  // inflate the native undo stack on ordinary typing.
  function renumberOrderedBlock(value, sel) {
    var lines = value.split("\n");
    var starts = [];
    var off = 0;
    for (var i = 0; i < lines.length; i++) { starts.push(off); off += lines[i].length + 1; }

    // Which line holds the caret?
    var caretLine = lines.length - 1;
    for (var c = 0; c < lines.length; c++) {
      if (sel <= starts[c] + lines[c].length) { caretLine = c; break; }
    }
    function isLI(idx) { return idx >= 0 && idx < lines.length && LIST_RE.test(lines[idx]); }

    // Anchor on the caret's line, or an immediately adjacent list line.
    var anchor = caretLine;
    if (!isLI(anchor)) {
      if (isLI(anchor - 1)) anchor -= 1;
      else if (isLI(anchor + 1)) anchor += 1;
      else return noopRenumber(value, sel);
    }
    var top = anchor, bot = anchor;
    while (isLI(top - 1)) top -= 1;
    while (isLI(bot + 1)) bot += 1;

    // Renumber each depth independently: a per-depth counter, cleared for any
    // DEEPER depth whenever we return to a shallower one, and reset by a bullet
    // (a same-depth type flip starts a fresh ordered run, matching md-render).
    var counters = {};
    var newLines = lines.slice();
    var changed = false;
    var caretLineDelta = 0;
    for (var j = top; j <= bot; j++) {
      var ln = lines[j];
      var depth = Math.floor(leadingSpaces(ln).length / 2);
      for (var k in counters) { if (Number(k) > depth) delete counters[k]; }
      var om = /^(\s*)(\d+)\.(?=\s|$)/.exec(ln);
      if (om) {
        counters[depth] = (counters[depth] || 0) + 1;
        var newOrd = counters[depth];
        var oldOrd = om[2];
        if (String(newOrd) !== oldOrd) {
          newLines[j] = ln.replace(/^(\s*)(\d+)\./, "$1" + newOrd + ".");
          changed = true;
          if (j === caretLine) caretLineDelta += (String(newOrd).length - oldOrd.length);
        }
      } else {
        // Bullet (or non-ordered list item): reset this depth so a following
        // ordered sibling run restarts at 1.
        counters[depth] = 0;
      }
    }
    if (!changed) return noopRenumber(value, sel);

    var newValue = newLines.join("\n");
    // Recompute the caret: its line start shifts by earlier lines' width changes
    // (captured by rebuilding from newLines); within its own line, shift by that
    // line's ordinal-width delta only if the caret sits after the ordinal.
    var newLineStart = 0;
    for (var p = 0; p < caretLine; p++) { newLineStart += newLines[p].length + 1; }
    var caretInLine = sel - starts[caretLine];
    var newCaretInLine = caretInLine + (caretInLine > 0 ? caretLineDelta : 0);
    if (newCaretInLine < 0) newCaretInLine = 0;
    var newCaret = newLineStart + newCaretInLine;

    var blockStart = starts[top];
    var blockEndOld = starts[bot] + lines[bot].length;
    var rep = { start: blockStart, end: blockEndOld, text: newLines.slice(top, bot + 1).join("\n") };
    return result(newValue, rep, newCaret, newCaret);
  }
  function noopRenumber(value, sel) {
    return result(value, { start: sel, end: sel, text: "" }, sel, sel);
  }

  return {
    editInsert: editInsert,
    toggleWrap: toggleWrap,
    insertListMarker: insertListMarker,
    applyHeading: applyHeading,
    autoFormatEnter: autoFormatEnter,
    indentLine: indentLine,
    outdentLine: outdentLine,
    renumberOrderedBlock: renumberOrderedBlock,
    __testExports: {
      currentLine: currentLine,
      toggleWrap: toggleWrap,
      insertListMarker: insertListMarker,
      applyHeading: applyHeading,
      autoFormatEnter: autoFormatEnter,
      indentLine: indentLine,
      outdentLine: outdentLine,
      renumberOrderedBlock: renumberOrderedBlock,
      parseListLine: parseListLine,
    },
  };
})();
