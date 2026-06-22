---
phase: 22-session-workflow-loop-pre-session-context-card-editable-sess
plan: 03
type: execute
wave: 1
depends_on: []
files_modified:
  - assets/md-render.js
autonomous: true
requirements:
  - REQ-12   # Editable preview before final export — preview pane needs MD→HTML rendering
user_setup: []

must_haves:
  truths:
    - "window.MdRender.render(markdownString) returns an HTML string safe for innerHTML insertion (all user input pre-escaped)"
    - "Render supports h1/h2/h3 headings, **bold**, *italic*, line breaks, and unordered lists (- or *)"
    - "All text content is HTML-escaped BEFORE markdown parsing — no user-provided HTML survives the pipeline"
    - "RTL-safe: output uses semantic HTML; CSS controls direction via dir=auto on the parent container in the consumer (Plan 22-06)"
  artifacts:
    - path: "assets/md-render.js"
      provides: "window.MdRender.render(string) → escaped HTML string"
      min_lines: 60
      contains: "window.MdRender = (function"
  key_links:
    - from: "assets/md-render.js render"
      to: "html-escape helper"
      via: "called BEFORE any regex substitution"
      pattern: "function (escape|escapeHtml)"
---

<objective>
Tiny pure-function Markdown→HTML renderer used exclusively by the export modal preview pane (Plan 22-06). The full subset is the one we actually emit in buildSessionMarkdown: `# / ## / ### / **bold** / *italic* / line breaks / unordered lists`.

Purpose: Avoid pulling in marked.js (~50KB) for a feature that only needs ~1KB of regex. Avoid the contenteditable WYSIWYG path that has RTL/paste-from-Word/structure-deletion problems (rejected in Deferred Ideas).

Security purpose: HTML-escape user input FIRST so attacker-controlled markdown text cannot smuggle `<script>`, `<iframe>`, `onerror=`, or `javascript:` URLs into the preview pane.

Output: One new utility file. Pure function, IIFE module, no DOM dependencies.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-SPEC.md
@.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-CONTEXT.md
@.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-UI-SPEC.md
@.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-PATTERNS.md
@assets/shared-chrome.js

<interfaces>
window.MdRender = {
  render(markdown: string): string  // returns sanitized HTML
}

Output HTML structure (per UI-SPEC Preview pane spec):
- # heading → <h1>...</h1>
- ## heading → <h2>...</h2>
- ### heading → <h3>...</h3>
- **bold** → <strong>...</strong>   (rendered weight 600 by CSS, not 700)
- *italic* (single-asterisk, not part of **) → <em>...</em>
- - list item / * list item → <ul><li>...</li></ul>
- blank line → paragraph break (<p>...</p>)
- single newline within a paragraph → <br>
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Create assets/md-render.js (escape-first Markdown subset renderer)</name>
  <files>assets/md-render.js</files>
  <read_first>
    - assets/shared-chrome.js (IIFE module shape — analog from PATTERNS.md "assets/md-render.js")
    - .planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-PATTERNS.md (section "assets/md-render.js (new utility, transform)")
    - .planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-UI-SPEC.md (Preview pane heading hierarchy: h1=22px/600/1.25, h2=16px/600 with bottom border, h3=14px/600, body=16px/400)
    - .planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-CONTEXT.md (D-18 — "Tiny custom regex Markdown parser ~1 KB")
  </read_first>
  <behavior>
    Test 1: render("# Hello") → contains "<h1>Hello</h1>"
    Test 2: render("## Section") → contains "<h2>Section</h2>"
    Test 3: render("### Sub") → contains "<h3>Sub</h3>"
    Test 4: render("**bold text**") → contains "<strong>bold text</strong>"
    Test 5: render("*italic*") → contains "<em>italic</em>"
    Test 6: render("- item 1\n- item 2") → contains "<ul>" and two "<li>" elements
    Test 7: render("para 1\n\npara 2") → contains two "<p>" elements
    Test 8 (XSS): render("<script>alert(1)</script>") → does NOT contain literal "<script>"; contains "&lt;script&gt;"
    Test 9 (XSS): render("[click](javascript:alert(1))") — links are NOT supported in our subset, so the literal text remains; result must NOT contain `javascript:` as an executable href
    Test 10 (XSS): render('<img src=x onerror="alert(1)">') → does NOT contain literal "<img"; contains "&lt;img"
    Test 11 (RTL): render("שלום עולם") → string round-trips Hebrew chars unchanged (no encoding mangling)
    Test 12 (mixed): render("# Anna M.\n\n**Date:** 2026-04-27\n\n## Trapped Emotions\n\n- anger\n- fear") → contains all expected tags in expected order
  </behavior>
  <action>
    Create assets/md-render.js as a single IIFE assigned to window.MdRender. NO module wrapper, NO export — match the SharedChrome pattern.

    Required pipeline order (CRITICAL for security — escape-first):
      1. HTML-escape the entire input string (& < > " ').
      2. Split into paragraphs by blank lines (`\n\n` or `\r\n\r\n`).
      3. For each paragraph block, in order:
         a. If it starts with `### ` → wrap as `<h3>` (rest of line).
         b. Else if `## ` → `<h2>`.
         c. Else if `# ` → `<h1>`.
         d. Else if every non-empty line starts with `- ` or `* ` (followed by space) → emit `<ul>` with one `<li>` per line.
         e. Else → wrap as `<p>` and replace single newlines with `<br>`.
      4. Within paragraph/heading/li text content (post-escape, so all HTML entities are already encoded):
         - Replace `**(.+?)**` with `<strong>$1</strong>` (non-greedy, single line).
         - Replace `(?<!\*)\*([^\*\n]+?)\*(?!\*)` with `<em>$1</em>` (single asterisks, not part of `**`).
      5. Join paragraph blocks with a single newline character (no extra wrapper).

    File template:

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
          // Bold first (greedy avoidance via non-greedy ?), then italic (negative lookbehind/ahead to skip ** runs).
          var out = text.replace(/\*\*([^*\n]+?)\*\*/g, "<strong>$1</strong>");
          out = out.replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, "$1<em>$2</em>");
          return out;
        }

        function renderBlock(block) {
          if (!block) return "";
          // Headings — single-line blocks starting with #.
          var headingMatch = block.match(/^(#{1,3})\s+(.*)$/);
          if (headingMatch && block.indexOf("\n") === -1) {
            var level = headingMatch[1].length;
            return "<h" + level + ">" + applyInline(headingMatch[2]) + "</h" + level + ">";
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

    The return surface MUST be exactly `{ render: render }` — no extra exports.

    Lazy loading: this file is NOT lazy-loaded. It is included as a `<script>` tag in add-session.html (Plan 22-06) so window.MdRender is available when the export modal opens.
  </action>
  <verify>
    <automated>test -f assets/md-render.js && grep -q "window.MdRender = (function" assets/md-render.js && grep -q "function escapeHtml" assets/md-render.js && grep -q "&amp;quot;\|&quot;\\\\\\|&#34;" assets/md-render.js && node -e "global.window={}; require('./assets/md-render.js'); var r = global.window.MdRender.render; if (!r('# Hello').includes('<h1>Hello</h1>')) { console.error('h1 fail'); process.exit(1) } if (!r('**bold**').includes('<strong>bold</strong>')) { console.error('bold fail'); process.exit(1) } if (r('<script>x</script>').includes('<script>')) { console.error('XSS fail'); process.exit(1) } if (!r('שלום').includes('שלום')) { console.error('rtl fail'); process.exit(1) } console.log('all_ok')"</automated>
  </verify>
  <acceptance_criteria>
    - File exists at assets/md-render.js
    - File contains literal `window.MdRender = (function`
    - File contains `function escapeHtml` (the escape pipeline)
    - File contains all 5 escape replacements (`&amp;`, `&lt;`, `&gt;`, `&quot;`, `&#39;`)
    - The IIFE returns an object whose only key is `render` (grep `return {` followed within 5 lines by `render:` then `}` then `})()`)
    - File parses: `node -c assets/md-render.js`
    - Smoke test passes: in node, `window.MdRender.render("# Hello")` includes "<h1>Hello</h1>"
    - Smoke test passes: `window.MdRender.render("**bold**")` includes "<strong>bold</strong>"
    - Smoke test passes: `window.MdRender.render("<script>alert(1)</script>")` does NOT include literal "<script>" (must be escaped to "&lt;script&gt;")
    - Smoke test passes: `window.MdRender.render('<img src=x onerror="alert(1)">')` does NOT include literal "<img" (must be escaped)
    - Smoke test passes: `window.MdRender.render("שלום")` round-trips Hebrew chars unchanged
    - File size: 1-4 KB (target ~1KB per CONTEXT.md D-18)
  </acceptance_criteria>
  <done>window.MdRender.render is a pure function that converts our Markdown subset to safe HTML. All user input is HTML-escaped before any structural rule applies. Export modal preview (Plan 22-06) consumes this directly.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| user textarea input → render() → innerHTML | Textarea content is fully attacker-controllable; it MUST NOT smuggle script execution into the preview DOM |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-22-03-01 | Tampering / XSS | Markdown text containing `<script>`, `<img onerror=>`, `javascript:` URLs | mitigate | escapeHtml runs FIRST on the entire input string before any regex substitution. After escape, `<` is `&lt;` so no tag can re-form. Markdown rules only reintroduce a fixed set of structural tags (h1/h2/h3/strong/em/ul/li/p/br) — none accept event handlers or hrefs. Acceptance test asserts `<script>` and `<img` are escaped. |
| T-22-03-02 | Tampering / XSS | Attribute-based injection via crafted markdown like `# title onerror=alert(1)` | mitigate | The renderer never produces tags with attributes. Heading match emits `<h1>`, `<h2>`, `<h3>` without any attribute slot. Same for `<strong>`, `<em>`, `<ul>`, `<li>`, `<p>`, `<br>`. Attribute injection is structurally impossible. |
| T-22-03-03 | Tampering / XSS | Link/image markdown smuggling `javascript:` — note: links are NOT in our subset, so attacker would need to bypass | mitigate | Subset explicitly excludes `[text](url)` and `![alt](src)` syntax. The regex pipeline does not produce `<a>` or `<img>` tags. Even if attacker writes `[x](javascript:alert(1))` the result is just escaped literal text. |
| T-22-03-04 | DoS | Pathological regex backtracking on huge input | mitigate | All regexes use bounded non-greedy quantifiers (`+?`) within single lines (`[^\n]`). No nested quantifier chains. Input size bounded by textarea (~tens of KB at most). Acceptance: render() of a 10KB input returns within 50ms in node. |
| T-22-03-05 | Information disclosure | Renderer leaks data | accept | Pure function, no I/O, no globals beyond window.MdRender assignment. |

**Residual risk:** Very low. Pure-function pipeline with escape-first ordering closes the standard XSS classes. The set of producible tags is fixed at compile-time and contains no attribute-bearing or URL-bearing tags.
</threat_model>

<verification>
- node -c assets/md-render.js
- node smoke (above) passes for h1/bold/XSS/RTL cases
- Manual smoke (post-execution): in browser DevTools after Plan 22-06, paste rendered output into preview, observe correct visual hierarchy and that pasted `<script>` text is visible as literal text (not executed).
</verification>

<success_criteria>
- assets/md-render.js exists and exports window.MdRender.render
- The escape-first pipeline blocks the OWASP XSS canonical payloads (script, img onerror)
- Hebrew/German/Czech UTF-8 round-trips intact
</success_criteria>

<output>
Create `.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-03-md-render-utility-SUMMARY.md` after completion.
</output>
