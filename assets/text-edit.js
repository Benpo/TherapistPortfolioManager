// ─────────────────────────────────────────────────────────────────────────────
// text-edit.js — the rich-text toolbar's undo-safe edit primitive + pure string
//   transforms.
//
// OWNS: the SINGLE undo-safe insertion chokepoint `editInsert` (every
//   programmatic textarea edit in the toolbar routes through it so the browser's
//   native undo stack and the real `input` event autoGrow/snippets observe are
//   both preserved), plus the side-effect-free string transforms that compute
//   WHAT to insert: inline emphasis toggle (bold/italic), list-marker
//   toggle/switch, heading apply/clear, list auto-format on Enter, indent/outdent, and
//   ordered-list renumber. Each transform is `(value, sel...) -> {value,
//   selStart, selEnd, replacement:{start,end,text}}` and is unit-testable in the
//   zero-npm node runner without a browser (mirrors window.Snippets.__testExports).
// PUBLIC SURFACE: window.TextEdit — { editInsert, toggleWrap, insertListMarker,
//   applyHeading, autoFormatEnter, indentLine, outdentLine, renumberOrderedBlock,
//   undoTrack, undoUntrack, undoRecord, undoNoteInput, undo, redo }.
//   Also window.TextEdit.__testExports exposing every pure helper (+ currentLine
//   and the pure coalesce-boundary decision) so the node runner can exercise them
//   headlessly.
// DEPENDENCIES: document.execCommand + the marker grammar of md-render.js — the
//   bold token is `**`, the italic token is `*`, the list-marker forms are `- `
//   / `* ` / `N. `, and the nesting unit is 2 leading spaces (Math.floor(spaces/2),
//   shared with md-render.js listDepth and pdf-export.js parseMarkdown). The
//   markers this module EMITS must be exactly those the renderer + PDF ACCEPT.
// CONSTRAINTS: editInsert uses `document.execCommand('insertText', ...)`
//   DELIBERATELY and IRREPLACEABLY. Despite its "deprecated" banner it is the
//   ONLY textarea-edit API that (a) mutates the value, (b) keeps the native undo
//   stack intact, and (c) fires a genuine `input` event. Pure deletions (empty
//   replacement over a non-empty range) route through `execCommand('delete')`
//   under the same contract — real engines no-op an EMPTY insertText, some
//   while still reporting success, so an insertText-only chokepoint silently
//   loses every marker-removal edit. The modern-looking
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
  // Select [start,end] then let `insertText` overwrite it. A PURE DELETION
  // (empty replacement over a non-empty range — list exit on Enter, outdent)
  // must NOT ride insertText: real engines treat an empty insertText as a
  // no-op, and some still report success, so the edit silently vanishes and
  // even the fallback below never fires. Those edits go through
  // execCommand('delete') instead, which removes the selected range under the
  // SAME contract — native undo intact, a genuine `input` event fired. On the
  // extremely rare env where execCommand is unavailable (returns false), fall
  // back to a value-splice and MANUALLY re-dispatch a real bubbling `input`
  // event so autoGrow + snippets still react — undo is lost on that path only,
  // which is why the primary path must stay execCommand (see the CONSTRAINTS
  // banner above).
  function editInsert(textarea, start, end, replacement) {
    textarea.focus();
    textarea.setSelectionRange(start, end);
    var ok = (replacement === "" && start < end)
      ? document.execCommand('delete')
      : document.execCommand('insertText', false, replacement);
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
  // newline (0 if none), end is the next newline (or value length). Caret 0
  // needs its own arm: lastIndexOf clamps a fromIndex of -1 to 0, so a value
  // that STARTS with a newline would falsely match it as the "previous"
  // newline and anchor the record on the next line.
  function currentLine(value, sel) {
    var start = sel > 0 ? value.lastIndexOf("\n", sel - 1) + 1 : 0;
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
  // Map a caret/selection position through a {start,end,text} replacement:
  //  - after the edited span  → shift by the net length delta;
  //  - before it              → unchanged;
  //  - inside the edited span → clamp into the new text (so a caret sitting in a
  //    removed marker lands at the replacement start rather than dangling).
  function mapCaret(pos, rep) {
    var delta = rep.text.length - (rep.end - rep.start);
    if (pos >= rep.end) return pos + delta;
    if (pos <= rep.start) return pos;
    return rep.start + Math.min(pos - rep.start, rep.text.length);
  }

  // ── Inline emphasis toggle ─────────────────────────────────────────────────
  // The toggle is STATE-based, not wrap-based. Every press first tokenizes the
  // affected lines into the emphasis spans the renderers actually accept
  // (bold pass first, then italic on the bold-masked residue — the renderer's
  // own pass order), computes the selection's effective state for the pressed
  // marker, and then applies exactly one of REMOVE / APPLY / a caret micro-rule:
  //
  //  - Selection fully emphasized → un-emphasize every intersected span
  //    ENTIRELY (the containing span, however deep inside it the selection
  //    sits). Never split, never nest.
  //  - Selection mixed or plain → unwrap every span the selection touches
  //    (either marker — pressing one marker over the other SWAPS, the pressed
  //    marker wins) and wrap the union in ONE pair per non-empty line-segment.
  //    Multi-line selections share one state but wrap per line: the grammar
  //    forbids emphasis across a newline. Blank, whitespace-only and
  //    marker/prefix-only segments are skipped, and markers are clamped into a
  //    line's content region (after a list marker or heading prefix) so a wrap
  //    can never destroy list- or heading-ness.
  //  - Caret presses: inside a span un-wraps its containing span; at the very
  //    end of a span content the caret hops past the closer with ZERO text
  //    edit (the type-emphasized-then-continue-plain flow); between an empty
  //    pair the pair is removed (same marker) or swapped (other marker);
  //    otherwise an empty pair is inserted with the caret between.
  //
  // EMISSION INVARIANT: the output never contains a three-plus star cluster or
  // a marker hugging another star — every cluster renders differently on
  // screen vs in the PDF. A segment the grammar cannot express (a loose star
  // in the content or hugging an edge) is skipped rather than wrapped, so the
  // toggle never emits markers that would display literally. Every outcome is
  // ONE spanning {start,end,text} replacement (one undo step); an outcome that
  // leaves the value untouched returns an EMPTY zero-length replacement so the
  // caller can skip editInsert entirely.

  // The emphasis span grammar — CHARACTER-IDENTICAL to md-render.js applyInline
  // (which the cross-pipeline agreement test pins to pdf-export.js). The
  // markers this module emits must be exactly the markers both accept, so the
  // patterns are shared verbatim, not paraphrased.
  var BOLD_SPAN_RE = /\*\*([^*\s\n](?:[^*\n]*?[^*\s\n])?)\*\*/g;
  var ITALIC_SPAN_RE = /(^|[^*])\*([^*\s\n](?:[^*\n]*?[^*\s\n])?)\*(?!\*)/g;

  function isWsChar(ch) {
    return ch !== "" && /\s/.test(ch);
  }

  // Where a line's CONTENT starts: after a list marker and its whitespace, or
  // after a real heading prefix (a bare "## " line has no heading content and
  // is a literal paragraph, so it clamps to nothing after the marker run).
  function lineContentOffset(text) {
    var pl = parseListLine(text);
    if (pl) return text.length - pl.body.length;
    var hm = /^(#{1,3}\s+)\S/.exec(text);
    if (hm) return hm[1].length;
    return 0;
  }

  // Tokenize one line's content region into the emphasis spans the renderers
  // accept, positions absolute in the full value. Bold first; then italic over
  // a copy whose bold spans are masked with a non-star, non-space filler — the
  // italic pass must never see the stars a bold span owns, exactly as the
  // renderer's second pass sees tags where the bold markers were.
  function lineSpans(value, lineStart, lineText) {
    var off = lineContentOffset(lineText);
    var region = lineText.slice(off);
    var base = lineStart + off;
    var spans = [];
    var m;
    BOLD_SPAN_RE.lastIndex = 0;
    while ((m = BOLD_SPAN_RE.exec(region)) !== null) {
      spans.push({
        marker: BOLD,
        start: base + m.index,
        end: base + m.index + m[0].length,
        cs: base + m.index + BOLD.length,
        ce: base + m.index + m[0].length - BOLD.length,
      });
    }
    var masked = region;
    for (var i = 0; i < spans.length; i++) {
      var rs = spans[i].start - base;
      var re = spans[i].end - base;
      masked = masked.slice(0, rs) + new Array(re - rs + 1).join("x") + masked.slice(re);
    }
    ITALIC_SPAN_RE.lastIndex = 0;
    while ((m = ITALIC_SPAN_RE.exec(masked)) !== null) {
      var st = base + m.index + m[1].length;
      var en = base + m.index + m[0].length;
      spans.push({ marker: ITALIC, start: st, end: en, cs: st + 1, ce: en - 1 });
    }
    spans.sort(function (a, b) { return a.start - b.start || a.end - b.end; });
    return spans;
  }

  // Every line the [s, e) range touches, each with its content offset + spans.
  // s === 0 is always a line start (see currentLine's caret-0 note).
  function linesTouching(value, s, e) {
    var lines = [];
    var ls = s > 0 ? value.lastIndexOf("\n", s - 1) + 1 : 0;
    var last = Math.max(s, e - 1);
    for (;;) {
      var le = value.indexOf("\n", ls);
      if (le === -1) le = value.length;
      var text = value.slice(ls, le);
      lines.push({
        start: ls,
        end: le,
        text: text,
        contentAbs: ls + lineContentOffset(text),
        spans: lineSpans(value, ls, text),
      });
      if (le >= value.length || le >= last) break;
      ls = le + 1;
    }
    return lines;
  }

  // Compose sorted, non-overlapping atomic edits into the ONE spanning
  // replacement the caller applies through a single editInsert.
  function composeEdits(value, edits) {
    edits.sort(function (a, b) { return a.start - b.start || a.end - b.end; });
    var start = edits[0].start;
    var end = edits[edits.length - 1].end;
    var text = "";
    var cursor = start;
    for (var i = 0; i < edits.length; i++) {
      text += value.slice(cursor, edits[i].start) + edits[i].text;
      cursor = edits[i].end;
    }
    text += value.slice(cursor, end);
    return { start: start, end: end, text: text };
  }

  // Map an anchor position through the edit list. A zero-length insertion
  // sitting exactly AT the anchor counts only when includeAt is set (so a
  // selection can land after an opening marker but before a closing one); a
  // position inside a replaced range clamps into the replacement.
  function mapThroughEdits(edits, pos, includeAt) {
    var out = pos;
    for (var i = 0; i < edits.length; i++) {
      var ed = edits[i];
      var w = ed.end - ed.start;
      if (ed.end < pos || (ed.end === pos && (w > 0 || includeAt))) {
        out += ed.text.length - w;
      } else if (ed.start < pos && pos < ed.end) {
        out += Math.min(pos - ed.start, ed.text.length) - (pos - ed.start);
      }
    }
    return out;
  }

  function noopEmphasis(value, selStart, selEnd) {
    return result(value, { start: selStart, end: selStart, text: "" }, selStart, selEnd);
  }

  function unwrapEdits(edits, sp) {
    edits.push({ start: sp.start, end: sp.cs, text: "" });
    edits.push({ start: sp.ce, end: sp.end, text: "" });
  }

  // Non-empty selection: normalize, compute the state, remove or apply.
  function emphasisSelection(value, s0, e0, marker) {
    var s = s0;
    var e = e0;
    // Normalize: trim whitespace off the edges — the hug rule makes an
    // untrimmed wrap literal. A selection reaching into a span's markers needs
    // no snapping: marker stars are never countable, so the state and the
    // union land on the span's content either way.
    while (s < e && isWsChar(value.charAt(s))) s++;
    while (e > s && isWsChar(value.charAt(e - 1))) e--;
    if (s === e) return noopEmphasis(value, s0, e0);

    var lines = linesTouching(value, s, e);

    // The state: countable chars are the selection's non-whitespace, non-star
    // chars inside content regions. FULL means at least one exists and every
    // one sits inside a pressed-marker span's content.
    var any = false;
    var full = true;
    for (var li = 0; li < lines.length && full; li++) {
      var line = lines[li];
      var from = Math.max(s, line.contentAbs);
      var to = Math.min(e, line.end);
      for (var p = from; p < to; p++) {
        var ch = value.charAt(p);
        if (ch === "*" || isWsChar(ch)) continue;
        any = true;
        var covered = false;
        for (var si = 0; si < line.spans.length; si++) {
          var sp = line.spans[si];
          if (sp.marker === marker && sp.cs <= p && p < sp.ce) { covered = true; break; }
        }
        if (!covered) { full = false; break; }
      }
    }
    if (!any) return noopEmphasis(value, s0, e0); // marker/prefix-only selection

    var edits = [];

    if (full) {
      // REMOVE: un-emphasize every intersected pressed-marker span entirely.
      // The returned selection covers the formerly-emphasized content, so a
      // second press re-wraps the same text in place.
      var firstCs = -1;
      var lastCe = -1;
      lines.forEach(function (ln) {
        ln.spans.forEach(function (sp) {
          if (sp.marker !== marker) return;
          if (sp.end <= s || sp.start >= e) return;
          unwrapEdits(edits, sp);
          if (firstCs === -1) firstCs = sp.cs;
          lastCe = sp.ce;
        });
      });
      var rep = composeEdits(value, edits);
      return result(applyReplacement(value, rep), rep,
        mapThroughEdits(edits, firstCs, true), mapThroughEdits(edits, lastCe, false));
    }

    // APPLY: per line-segment, absorb every span the segment touches (either
    // marker — the cross-marker case is the swap), then wrap the union in one
    // pair. A segment the grammar cannot wrap — a loose star left in the
    // content, or a star hugging the segment from outside — is skipped so the
    // output never holds a cluster or a literal-rendering pair.
    var selFrom = -1;
    var selTo = -1;
    lines.forEach(function (ln) {
      var segS = Math.max(s, ln.contentAbs);
      var segE = Math.min(e, ln.end);
      while (segS < segE && isWsChar(value.charAt(segS))) segS++;
      while (segE > segS && isWsChar(value.charAt(segE - 1))) segE--;
      if (segS >= segE) return;
      var absorbed = [];
      var grew = true;
      while (grew) {
        grew = false;
        for (var ai = 0; ai < ln.spans.length; ai++) {
          var sp = ln.spans[ai];
          if (absorbed.indexOf(sp) !== -1) continue;
          if (sp.end < segS || sp.start > segE) continue;
          absorbed.push(sp);
          if (sp.start < segS) segS = sp.start;
          if (sp.end > segE) segE = sp.end;
          grew = true;
        }
      }
      var content = "";
      for (var p = segS; p < segE; p++) {
        var inMarker = false;
        for (var mi = 0; mi < absorbed.length; mi++) {
          var ab = absorbed[mi];
          if ((p >= ab.start && p < ab.cs) || (p >= ab.ce && p < ab.end)) { inMarker = true; break; }
        }
        if (!inMarker) content += value.charAt(p);
      }
      if (content.indexOf("*") !== -1) return;
      if (value.charAt(segS - 1) === "*" || value.charAt(segE) === "*") return;
      for (var ei = 0; ei < absorbed.length; ei++) unwrapEdits(edits, absorbed[ei]);
      edits.push({ start: segS, end: segS, text: marker });
      edits.push({ start: segE, end: segE, text: marker });
      if (selFrom === -1) selFrom = segS;
      selTo = segE;
    });
    if (edits.length === 0) return noopEmphasis(value, s0, e0);
    var repA = composeEdits(value, edits);
    var next = applyReplacement(value, repA);
    var selStart = mapThroughEdits(edits, selFrom, true);
    var selEnd = mapThroughEdits(edits, selTo, false);
    if (next === value) {
      // Textually idempotent (re-applying over an exact existing wrap): a
      // zero-edit outcome, but the selection still snaps to the wrapped content.
      return result(value, { start: s0, end: s0, text: "" }, selStart, selEnd);
    }
    return result(next, repA, selStart, selEnd);
  }

  // Caret press (no selection): the micro-rules.
  function emphasisCaret(value, c, marker) {
    var m = marker.length;
    var other = marker === BOLD ? ITALIC : BOLD;
    var om = other.length;
    var line = currentLine(value, c);
    var spans = lineSpans(value, line.start, line.text);
    var edits = [];
    var i;
    var sp;

    // Pressed-marker span strictly around the caret: at the very end of the
    // content the caret hops past the closing marker with zero text edit;
    // anywhere else the containing span un-wraps, caret on the same character.
    var touching = [];
    for (i = 0; i < spans.length; i++) {
      sp = spans[i];
      if (sp.marker === marker && sp.start < c && c < sp.end) {
        if (c === sp.ce) {
          return result(value, { start: c, end: c, text: "" }, sp.end, sp.end);
        }
        touching.push(sp);
      }
    }
    if (touching.length) {
      for (i = 0; i < touching.length; i++) unwrapEdits(edits, touching[i]);
      var repU = composeEdits(value, edits);
      var nc = mapThroughEdits(edits, c, true);
      return result(applyReplacement(value, repU), repU, nc, nc);
    }

    // Other-marker span strictly around the caret: the pressed marker wins —
    // unwrap the touched cluster and wrap its merged content with the pressed
    // marker. Skipped (no-op) when a loose star hugs the cluster from outside:
    // the swap would fuse into a cluster the renderers disagree on.
    var cluster = [];
    for (i = 0; i < spans.length; i++) {
      sp = spans[i];
      if (sp.marker === other && sp.start < c && c < sp.end) cluster.push(sp);
    }
    if (cluster.length) {
      var grew = true;
      while (grew) {
        grew = false;
        for (i = 0; i < spans.length; i++) {
          sp = spans[i];
          if (cluster.indexOf(sp) !== -1) continue;
          var lo = cluster[0].start;
          var hi = cluster[cluster.length - 1].end;
          if (sp.end < lo || sp.start > hi) continue;
          cluster.push(sp);
          cluster.sort(function (a, b) { return a.start - b.start; });
          grew = true;
        }
      }
      var lo2 = cluster[0].start;
      var hi2 = cluster[cluster.length - 1].end;
      if (value.charAt(lo2 - 1) === "*" || value.charAt(hi2) === "*") {
        return noopEmphasis(value, c, c);
      }
      for (i = 0; i < cluster.length; i++) {
        sp = cluster[i];
        edits.push({ start: sp.start, end: sp.cs, text: sp.start === lo2 ? marker : "" });
        edits.push({ start: sp.ce, end: sp.end, text: sp.end === hi2 ? marker : "" });
      }
      var repS = composeEdits(value, edits);
      var nc2 = mapThroughEdits(edits, c, true);
      return result(applyReplacement(value, repS), repS, nc2, nc2);
    }

    // Empty pair around the caret (both stars unowned — an owned star means a
    // span touched the caret and was handled above): the same marker removes
    // the pair, the other marker swaps it in place.
    if (c >= m && value.slice(c - m, c) === marker && value.slice(c, c + m) === marker) {
      var repP = { start: c - m, end: c + m, text: "" };
      return result(applyReplacement(value, repP), repP, c - m, c - m);
    }
    if (c >= om && value.slice(c - om, c) === other && value.slice(c, c + om) === other &&
        value.charAt(c - om - 1) !== "*" && value.charAt(c + om) !== "*") {
      // Isolated pairs only — a loose star hugging the pair would fuse the
      // swapped pair into a cluster, so that shape falls through to the
      // plain-caret rule below (whose own star guard makes it a no-op).
      var repW = { start: c - om, end: c + om, text: marker + marker };
      return result(applyReplacement(value, repW), repW, c - om + m, c - om + m);
    }

    // Plain-text caret: insert an empty pair, caret between — the type-flow.
    // Clamped into the line's content region (never before a list marker or
    // heading prefix); a loose star hugging the spot makes it a no-op instead,
    // because an empty pair may never fuse into a cluster.
    var at = Math.max(c, line.start + lineContentOffset(line.text));
    if (value.charAt(at - 1) === "*" || value.charAt(at) === "*") {
      return noopEmphasis(value, c, c);
    }
    var repIns = { start: at, end: at, text: marker + marker };
    return result(applyReplacement(value, repIns), repIns, at + m, at + m);
  }

  function toggleWrap(value, s, e, marker) {
    if (s > e) { var t = s; s = e; e = t; }
    return s === e
      ? emphasisCaret(value, s, marker)
      : emphasisSelection(value, s, e, marker);
  }

  // ── List-marker toggle / switch ─────────────────────────────────────────────
  // Toggle the caret line's list formatting for the requested kind ("ul" bullet
  // or "ol" numbered). Three cases, keyed off the line's current marker (detected
  // with the shared LIST_RE grammar so it is character-identical to the renderer):
  //  (a) no marker            → insert the requested token at the leading-
  //      whitespace boundary ("- " / "1. ");
  //  (b) same-kind marker     → remove it (marker + trailing space), preserving
  //      the line's leading indentation ("  - text" → "  text");
  //  (c) other-kind marker    → switch the marker glyph in place, keeping the
  //      spacing ("- text" +ol → "1. text"; "3. text" +ul → "- text").
  // Ordered renumbering after a removal/switch is the caller's job (it renumbers
  // the block after every list action). The number emitted on a bullet→ordered
  // switch is a placeholder "1." that the renumber pass then corrects.
  function insertListMarker(value, s, e, kind) {
    var line = currentLine(value, s);
    var at = line.start + leadingSpaces(line.text).length;
    var wantOl = kind === "ol";
    var parsed = parseListLine(line.text);
    var rep;
    if (!parsed) {
      rep = { start: at, end: at, text: wantOl ? "1. " : "- " };
    } else if ((parsed.ordinal !== null) === wantOl) {
      // Same kind → drop the marker and its trailing whitespace, keep the indent.
      var ws = /^ *(?:[-*]|\d+\.)(\s*)/.exec(line.text)[1];
      rep = { start: at, end: at + parsed.marker.length + ws.length, text: "" };
    } else {
      // Other kind → swap just the marker glyph, leaving the spacing/body intact.
      rep = { start: at, end: at + parsed.marker.length, text: wantOl ? "1." : "-" };
    }
    return result(applyReplacement(value, rep), rep, mapCaret(s, rep), mapCaret(e, rep));
  }

  // ── Heading apply / clear ──────────────────────────────────────────────────
  // level 1/2/3 sets the line's leading heading tokens ("# "/"## "/"### ") and
  // consumes any leading indentation — headings are flush-left in the renderer
  // grammar (an indented "## x" reads as a literal paragraph), so applying a
  // heading register must always produce a REAL heading. level 0 strips only
  // the heading tokens and leaves existing indentation untouched. Idempotent
  // net of caret on a flush line: level N then level 0 returns the original.
  function applyHeading(value, s, e, level) {
    var line = currentLine(value, s);
    var m = /^( *)(#{1,3}\s+)?/.exec(line.text);
    var lead = m[1] || "";
    var existing = m[2] || "";
    var newPrefix = level > 0 ? (new Array(level + 1).join("#") + " ") : "";
    var repStart = level > 0 ? line.start : line.start + lead.length;
    var repEnd = line.start + lead.length + existing.length;
    var rep = { start: repStart, end: repEnd, text: newPrefix };
    var delta = newPrefix.length - (repEnd - repStart);
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

  // ── Module-owned undo/redo stack ───────────────────────────────────────────
  // WHY this exists (and why it replaces relying on the browser's own undo):
  // the browser groups typing into large chunks of its own choosing, so a single
  // undo could wipe several lines at once — undo stopped feeling trustworthy for
  // long notes. This module keeps ONE history per field with boundaries at
  // human scale (a break at each new line and at a typing pause) so one undo
  // reverts a line or a short burst, and every formatting action is exactly one
  // step. Because a single stack now owns undo, the keyboard shortcut MUST route
  // to this same stack too — two stacks (one for the buttons, one for the
  // keyboard) would drift apart and give contradictory results.
  //
  // The restore is applied through the SAME undo-safe insert chokepoint used for
  // every other edit, so it fires a real input event and the field's auto-grow,
  // snippet expansion and live preview all react to an undo/redo exactly as they
  // do to typing. A module-internal "restoring" flag brackets that restore and
  // makes the two recording entry points self-no-op while it is set, so a
  // restore's own input event can never push itself back onto the history —
  // callers may call the recording entry points unconditionally and stay safe.
  var HISTORY = new WeakMap();   // textarea → { snaps, ptr, lastTime, lastKind, pending }
  var COALESCE_MS = 700;         // typing pause (~0.7s) that starts a fresh step
  var HISTORY_CAP = 200;         // keep the most recent N snapshots per field
  var _restoring = false;        // true while an undo/redo restore is in flight

  function snapOf(ta) {
    return { value: ta.value, selStart: ta.selectionStart, selEnd: ta.selectionEnd };
  }

  // Which broad category an input belongs to — used so switching between adding
  // and removing text starts a new undo step.
  function categorizeInput(inputType) {
    if (typeof inputType !== "string") return "other";
    if (inputType.indexOf("delete") === 0) return "delete";
    if (inputType.indexOf("insert") === 0) return "insert";
    return "other";
  }
  function isNewlineInput(inputType) {
    return inputType === "insertLineBreak" || inputType === "insertParagraph";
  }

  // Pure decision (no DOM): should this input OPEN a new undo boundary, or fold
  // into the step in progress? A brand-new step (lastKind null) never opens — it
  // is already fresh. Otherwise a new line, a pause longer than the coalesce
  // window, or a switch between adding and removing text each start a new step.
  function shouldOpenBoundary(lastKind, lastTime, now, inputType, windowMs) {
    if (lastKind === null || lastKind === undefined) return false;
    if (isNewlineInput(inputType)) return true;
    if (now - lastTime > windowMs) return true;
    if (categorizeInput(inputType) !== lastKind) return true;
    return false;
  }

  function nowMs() {
    return (typeof Date !== "undefined" && Date.now) ? Date.now() : 0;
  }

  // Commit a snapshot as a checkpoint: drop any redo tail, then push it only if
  // it differs from the current checkpoint's value (a same-value commit just
  // refreshes the caret). Cap the history so a long session cannot grow without
  // bound — the oldest snapshots fall off the front.
  function sealSnap(H, s) {
    H.snaps.length = H.ptr + 1;
    if (H.snaps[H.ptr].value !== s.value) {
      H.snaps.push({ value: s.value, selStart: s.selStart, selEnd: s.selEnd });
      H.ptr++;
    } else {
      H.snaps[H.ptr] = { value: s.value, selStart: s.selStart, selEnd: s.selEnd };
    }
    if (H.snaps.length > HISTORY_CAP) {
      var drop = H.snaps.length - HISTORY_CAP;
      H.snaps.splice(0, drop);
      H.ptr -= drop;
      if (H.ptr < 0) H.ptr = 0;
    }
  }

  // Begin tracking a field: seed a baseline snapshot and reset the pointer/step.
  function undoTrack(textarea) {
    if (!textarea) return;
    var base = snapOf(textarea);
    HISTORY.set(textarea, {
      snaps: [{ value: base.value, selStart: base.selStart, selEnd: base.selEnd }],
      ptr: 0,
      lastTime: 0,
      lastKind: null,
      pending: base,
    });
  }
  function undoUntrack(textarea) {
    if (textarea) HISTORY.delete(textarea);
  }

  // Called immediately BEFORE a structural edit (bold, list marker, heading,
  // indent, …): seal the current pre-edit state so the coming edit is exactly one
  // undo step, and reset the step so the edit's own input event opens fresh
  // rather than folding into prior typing. No-op while a restore is in flight.
  function undoRecord(textarea) {
    if (_restoring || !textarea) return;
    var H = HISTORY.get(textarea);
    if (!H) return;
    sealSnap(H, snapOf(textarea));
    H.lastKind = null;
    H.pending = snapOf(textarea);
    H.lastTime = nowMs();
  }

  // Called on every ordinary input event. Decides whether to open a new boundary
  // (sealing the PRE-input state so the boundary character begins the next step)
  // or fold into the current step. No-op while a restore is in flight.
  function undoNoteInput(textarea, inputType) {
    if (_restoring || !textarea) return;
    var H = HISTORY.get(textarea);
    if (!H) return;
    var now = nowMs();
    if (shouldOpenBoundary(H.lastKind, H.lastTime, now, inputType, COALESCE_MS)) {
      sealSnap(H, H.pending);
    }
    H.pending = snapOf(textarea);
    H.lastKind = categorizeInput(inputType);
    H.lastTime = now;
  }

  // Apply a snapshot back onto the field through the insert chokepoint so a real
  // input event fires, then place the caret. Bracketed by the restoring flag.
  function restoreSnap(textarea, snap) {
    _restoring = true;
    try {
      editInsert(textarea, 0, textarea.value.length, snap.value);
      textarea.setSelectionRange(snap.selStart, snap.selEnd);
    } finally {
      _restoring = false;
    }
  }
  function afterRestore(H, textarea) {
    H.lastKind = null;
    H.pending = snapOf(textarea);
    H.lastTime = nowMs();
  }

  // Move one step back. First seal any un-sealed live edits (so redo can return
  // to them), then step the pointer and restore. Returns whether anything moved.
  function undo(textarea) {
    if (_restoring || !textarea) return false;
    var H = HISTORY.get(textarea);
    if (!H) return false;
    var live = snapOf(textarea);
    if (live.value !== H.snaps[H.ptr].value) sealSnap(H, live);
    if (H.ptr <= 0) return false;
    H.ptr--;
    restoreSnap(textarea, H.snaps[H.ptr]);
    afterRestore(H, textarea);
    return true;
  }
  // Pure availability accessors — read-only, no sealing, no pointer movement —
  // so the toolbar can dim undo/redo when a click would be a no-op. canUndo
  // mirrors undo()'s EFFECTIVE guard: an un-sealed live edit counts as undoable
  // (undo() seals it before stepping, so the pointer gains a step to move back
  // from); otherwise the pointer must already have somewhere to step back to.
  // canRedo mirrors redo()'s guard exactly.
  function canUndo(textarea) {
    if (!textarea) return false;
    var H = HISTORY.get(textarea);
    if (!H) return false;
    if (textarea.value !== H.snaps[H.ptr].value) return true;
    return H.ptr > 0;
  }
  function canRedo(textarea) {
    if (!textarea) return false;
    var H = HISTORY.get(textarea);
    return !!H && H.ptr < H.snaps.length - 1;
  }

  // Move one step forward if a redo target exists.
  function redo(textarea) {
    if (_restoring || !textarea) return false;
    var H = HISTORY.get(textarea);
    if (!H) return false;
    if (H.ptr >= H.snaps.length - 1) return false;
    H.ptr++;
    restoreSnap(textarea, H.snaps[H.ptr]);
    afterRestore(H, textarea);
    return true;
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
    undoTrack: undoTrack,
    // Re-seed the baseline to the field's current value, clearing the snapshot
    // stack and pending step. Call this after any programmatic bulk `.value =`
    // population (which fires no input event), so the loaded content — not the
    // stale mount-time value — becomes the undo floor. undoTrack already does
    // exactly this on re-call.
    undoReset: undoTrack,
    undoUntrack: undoUntrack,
    undoRecord: undoRecord,
    undoNoteInput: undoNoteInput,
    undo: undo,
    redo: redo,
    canUndo: canUndo,
    canRedo: canRedo,
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
      shouldOpenBoundary: shouldOpenBoundary,
      categorizeInput: categorizeInput,
      isNewlineInput: isNewlineInput,
    },
  };
})();
