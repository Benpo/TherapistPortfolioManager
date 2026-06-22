---
phase: 22-session-workflow-loop-pre-session-context-card-editable-sess
plan: 05
type: execute
wave: 2
depends_on:
  - 01   # Needs jspdf.min.js + noto-sans-base64.js + noto-sans-hebrew-base64.js
files_modified:
  - assets/pdf-export.js
autonomous: true
requirements:
  - REQ-10   # Document header auto-populates from session data
  - REQ-13   # PDF download (CRITICAL)
user_setup: []

# ============================================================
# Amendment 2026-04-28 — post-Sapir-review tightening
# ============================================================
# D-04 filename rule was REWRITTEN. The original spec said: ASCII-only,
# strip diacritics, transliterate Hebrew to Latin, no spaces. The new
# rule says: keep client name as-is (Hebrew, German diacritics, Czech
# diacritics all preserved), only strip OS-reserved chars, fall back
# to "Session" if empty.
#
# Concrete impact on this plan:
# 1. The function name `slugify` is RETAINED (avoids breaking Plan 22-06
#    callers that reference `window.PDFExport.slugify`). Its BODY is
#    rewritten to the new rule.
# 2. The threat-model entries T-22-05-02 and T-22-05-06 are reworded
#    (not removed) — the sanitiser is still a defensive boundary.
# 3. Task 1 <action> step 5 (slugify implementation) is replaced with
#    the new rule (see "New slugify implementation" below).
# 4. Task 1 <verify> grep is updated — drop the `[A-Za-z0-9]` regex
#    expectation, keep verification that the function exists.
# 5. Acceptance criterion line 268 ("Filename: Slugified_YYYY-MM-DD.pdf,
#    ASCII-only.") becomes "Filename: {clientName}_YYYY-MM-DD.pdf,
#    OS-safe characters only" — see updated criterion below.
#
# New slugify implementation (replaces Task 1 step 5):
# ```
#   function slugify(name) {
#     // D-04 (amended 2026-04-28): preserve client name as-is including
#     // Unicode (Hebrew, German diacritics, Czech diacritics), only strip
#     // the union of Windows + macOS + Linux reserved filename chars
#     // and ASCII control codes.
#     if (typeof name !== "string") return "Session";
#     // Strip < > : " / \ | ? * and ASCII 0-31
#     var stripped = name.replace(/[<>:"\/\\|?*\x00-\x1F]/g, "");
#     // Trim trailing dots and whitespace (Windows quirk)
#     stripped = stripped.replace(/[.\s]+$/, "");
#     // Trim leading whitespace
#     stripped = stripped.replace(/^\s+/, "");
#     // Fall back to "Session" if nothing left
#     return stripped.length > 0 ? stripped : "Session";
#   }
# ```
#
# Test cases the executor must verify (manually, no harness needed):
#   slugify("Anna M.")        === "Anna M."
#   slugify("Jörg")           === "Jörg"
#   slugify("שירה")           === "שירה"
#   slugify("Jane/Jörg")      === "JaneJörg"
#   slugify("???")            === "Session"
#   slugify("foo.")           === "foo"        // trailing dot stripped
#   slugify("  foo  ")        === "foo"        // trim
#   slugify("")               === "Session"
# ============================================================

must_haves:
  truths:
    - "window.PDFExport.buildSessionPDF(sessionData, opts) returns a Promise<Blob> of MIME type application/pdf"
    - "First call to buildSessionPDF lazy-loads assets/jspdf.min.js, assets/fonts/noto-sans-base64.js, and assets/fonts/noto-sans-hebrew-base64.js via dynamic <script> append"
    - "Subsequent calls reuse the loaded scripts (no double-load)"
    - "Generated PDFs are A4 portrait (595x842pt) with 11pt body, 14pt section headings, 10pt header meta"
    - "Hebrew section headings/body are rendered with NotoSansHebrew + jsPDF setR2L(true); Latin sections render with NotoSans + setR2L(false)"
    - "PDFs include a header with client name, session date (UI-language formatted), session-type label"
    - "PDFs include auto page-break with running header (client name + session date) on pages 2+ and Page X of Y footer"
    - "window.PDFExport.slugify(name) preserves Unicode (Hebrew, German/Czech diacritics) and only strips OS-reserved characters per D-04 amendment 2026-04-28; returns 'Session' if input becomes empty after stripping"
    - "window.PDFExport.triggerDownload(blob, filename) downloads the blob to the user's device"
  artifacts:
    - path: "assets/pdf-export.js"
      provides: "window.PDFExport with buildSessionPDF, slugify, triggerDownload"
      min_lines: 150
      contains: "window.PDFExport"
  key_links:
    - from: "assets/pdf-export.js loadScriptOnce"
      to: "assets/jspdf.min.js + font assets"
      via: "dynamic script append on first buildSessionPDF call"
      pattern: "createElement\\(['\"]script"
    - from: "assets/pdf-export.js buildSessionPDF"
      to: "jsPDF addFileToVFS + addFont"
      via: "registers NotoSans + NotoSansHebrew before any text() call"
      pattern: "addFileToVFS"
---

<objective>
Encapsulate jsPDF behind a stable API. Plan 22-06 (Export modal handler) calls window.PDFExport.buildSessionPDF(sessionData, opts) and gets back a Blob. The module owns lazy-loading of jsPDF + the two font files, font registration, page layout, RTL handling, and pagination.

Purpose: jsPDF + base64 fonts are ~600 KB+ of payload. Lazy-loading on first Export click keeps initial page load fast for the 99% of sessions where the user does not export. The PWA still works offline because Plan 22-08 precaches all three files.

Output: One new file with a clean public API that the Export modal calls without needing to know any jsPDF specifics.

Note: jsPDF API specifics (setFont, setR2L, splitTextToSize, autoTable etc.) may vary between 2.x and 3.x. The executor should consult Context7 MCP for `jspdf` library docs at execution time to confirm exact method names — the broad design here is API-version-agnostic.
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
@assets/backup.js
@assets/jspdf.min.js
@.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-01-vendored-libs-fonts-PLAN.md

<interfaces>
window.PDFExport = {
  // Builds a PDF from already-edited session markdown. The caller (Plan 22-06) passes
  // the FINAL markdown the user has edited in the preview pane, plus session metadata
  // for the document header.
  async buildSessionPDF(sessionData: {
    clientName: string,
    sessionDate: string,        // ISO date or pre-formatted display string
    sessionType: string,        // "Clinic" | "Online" | "Other" — already localized
    markdown: string,           // edited document body (post-preview)
  }, opts: {
    uiLang: "en" | "de" | "he" | "cs",
    onProgress?: (phase: "loading-lib" | "loading-fonts" | "rendering" | "done") => void,
  }): Promise<Blob>,

  slugify(s: string): string,             // D-04 amended 2026-04-28: preserves Unicode (Hebrew, diacritics) — strips ONLY OS-reserved chars; "Session" fallback if empty
  triggerDownload(blob: Blob, filename: string): void,   // mirrors backup.js triggerDownload
}

D-04 filename pattern (built by the consumer): {slugify(clientName)}_{YYYY-MM-DD}.pdf
  Examples: Jörg_2026-04-27.pdf, שירה_2026-04-27.pdf, Anna M._2026-04-27.pdf

D-05 page: A4 portrait (595x842pt)
D-06 pagination: auto page-break, running header on pages 2+, "Page X of Y" footer
D-07 typography: body 11pt, section headings 14pt bold, header meta 10pt
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create assets/pdf-export.js (lazy-load gate, font registration, build pipeline, slugify, triggerDownload)</name>
  <files>assets/pdf-export.js</files>
  <read_first>
    - assets/backup.js (lines 429-441 triggerDownload — copy verbatim; lines 1-16 module header style; line 740-755 IIFE return block)
    - assets/app.js (lines 266-270 dynamic script-load pattern)
    - .planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-PATTERNS.md (sections "assets/pdf-export.js (new service module, transform)" + "Pattern 7 — Trigger blob download")
    - .planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-CONTEXT.md (D-01 through D-07)
    - .planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-UI-SPEC.md (PDF document typography section)
    - assets/jspdf.min.js (vendored library — read first 200 chars to confirm window.jspdf attachment)
    - assets/fonts/noto-sans-base64.js (window.NotoSans assignment)
    - assets/fonts/noto-sans-hebrew-base64.js (window.NotoSansHebrew assignment)
  </read_first>
  <action>
    Create assets/pdf-export.js as an IIFE assigned to window.PDFExport. Structure:

    1. Header JSDoc comment block declaring lazy-load contract + dependencies + window globals consumed.

    2. Module-private state:
         var _depsLoaded = false;
         var _loadingPromise = null;

    3. loadScriptOnce(src) — Promise-returning helper that:
         - Returns immediately if `document.querySelector('script[src="' + src + '"]')` exists.
         - Else creates a script tag, appends to document.body, resolves on onload, rejects on onerror.
       Mirror the pattern at assets/app.js:266-270.

    4. ensureDeps(opts) — Promise-cached lazy loader:
         async function ensureDeps(opts) {
           if (_depsLoaded) return;
           if (_loadingPromise) return _loadingPromise;
           _loadingPromise = (async function () {
             if (opts && opts.onProgress) opts.onProgress("loading-lib");
             await loadScriptOnce("./assets/jspdf.min.js");
             if (opts && opts.onProgress) opts.onProgress("loading-fonts");
             await loadScriptOnce("./assets/fonts/noto-sans-base64.js");
             await loadScriptOnce("./assets/fonts/noto-sans-hebrew-base64.js");
             _depsLoaded = true;
           })();
           return _loadingPromise;
         }

    5. slugify(name) — D-04 implementation, AMENDED 2026-04-28:
         function slugify(name) {
           // D-04 (amended 2026-04-28): preserve client name as-is including Unicode
           // (Hebrew, German diacritics, Czech diacritics — all modern OSes support
           // Unicode filenames). Strip ONLY the union of OS-reserved filename
           // characters: < > : " / \ | ? * and ASCII control chars 0–31.
           // Trim trailing dots/whitespace (Windows quirk). Trim leading whitespace.
           // Fall back to "Session" if the result is empty.
           if (typeof name !== "string") return "Session";
           var stripped = name.replace(/[<>:"\/\\|?*\x00-\x1F]/g, "");
           stripped = stripped.replace(/[.\s]+$/, "");
           stripped = stripped.replace(/^\s+/, "");
           return stripped.length > 0 ? stripped : "Session";
         }
       // Test cases (verify manually):
       //   slugify("Anna M.")   === "Anna M."
       //   slugify("Jörg")      === "Jörg"
       //   slugify("שירה")      === "שירה"
       //   slugify("Jane/Jörg") === "JaneJörg"
       //   slugify("???")       === "Session"
       //   slugify("foo.")      === "foo"
       //   slugify("")          === "Session"

    6. triggerDownload(blob, filename) — copy verbatim from assets/backup.js:429-441.

    7. registerFonts(doc) — internal:
         function registerFonts(doc) {
           if (typeof window.NotoSans === "string") {
             doc.addFileToVFS("NotoSans.ttf", window.NotoSans);
             doc.addFont("NotoSans.ttf", "NotoSans", "normal");
           }
           if (typeof window.NotoSansHebrew === "string") {
             doc.addFileToVFS("NotoSansHebrew.ttf", window.NotoSansHebrew);
             doc.addFont("NotoSansHebrew.ttf", "NotoSansHebrew", "normal");
           }
         }

    8. detectRtl(text) — heuristic: if any char is in Hebrew block U+0590-U+05FF, treat block as RTL.
         function isRtl(text) {
           return /[֐-׿יִ-ﭏ]/.test(text || "");
         }

    9. buildSessionPDF(sessionData, opts) — main entry:
         - await ensureDeps(opts).
         - Construct: const { jsPDF } = window.jspdf; var doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
         - registerFonts(doc).
         - Layout constants (in pt):
             PAGE_W = 595, PAGE_H = 842
             MARGIN_X = 56, MARGIN_TOP = 64, MARGIN_BOTTOM = 64
             USABLE_W = PAGE_W - 2*MARGIN_X = 483
             BODY_SIZE = 11, HEADING_SIZE = 14, META_SIZE = 10
             LINE_HEIGHT_BODY = 16, LINE_HEIGHT_HEADING = 22
         - Track current y cursor + current page index.
         - drawHeader() — at top of every page from page 2 onward AND first page differently:
             Page 1: full header — client name (16pt bold), session date + session type (10pt) on next line.
             Page 2+: running header — `clientName · sessionDate` (10pt muted, baseline at MARGIN_TOP - 24).
         - drawFooter() — `Page X of Y` centered at PAGE_H - 32, 10pt. Defer Y count until end (jsPDF allows post-render footer pass via doc.getNumberOfPages()).
         - parseMarkdown(markdown) — split body into a sequence of "blocks": heading or paragraph or list. Use the same minimal regex set as md-render.js (just structural identification, not rendering). For each block:
             - Heading (line begins with `# ` or `## ` or `### `): set font NotoSans / size HEADING_SIZE, weight bold (jsPDF accepts "bold" as the third arg of setFont if you addFont with style). For Hebrew text, switch to NotoSansHebrew + setR2L(true); for Latin/mixed text, NotoSans + setR2L(false). Move y down by LINE_HEIGHT_HEADING.
             - List: each line as "- text" → indent 12pt + bullet + body-size text.
             - Paragraph: doc.splitTextToSize(text, USABLE_W) → array of wrapped lines; render each at LINE_HEIGHT_BODY.
         - Before rendering each line: check if y + line_height > PAGE_H - MARGIN_BOTTOM. If yes: doc.addPage(); reset y to MARGIN_TOP + (drawing the running header consumes some y); call drawHeaderForPage(currentPageNum).
         - After all blocks: iterate pages 1..N, drawFooter on each.
         - Return doc.output("blob") as the resolved Promise<Blob>.

         RTL heuristic: per-line, if isRtl(line) → setFont("NotoSansHebrew", "normal") + setR2L(true) + draw at x = PAGE_W - MARGIN_X (right edge). Else NotoSans + setR2L(false) + x = MARGIN_X.

         For mixed-language documents (e.g., section heading in Hebrew + body in English): apply per-line detection. This is good enough for v1; full bidi is out of scope.

    10. Return surface:
          return {
            buildSessionPDF: buildSessionPDF,
            slugify: slugify,
            triggerDownload: triggerDownload,
          };

    Write the IIFE wrapper:
      window.PDFExport = (function () {
        "use strict";
        // ... all of the above ...
        return { buildSessionPDF, slugify, triggerDownload };
      })();

    IMPORTANT: Use Context7 MCP at execution time to confirm jsPDF method names. The methods used: addFileToVFS, addFont, setFont(name, style, weight), setFontSize(pt), setR2L(bool), text(string|array, x, y, options), splitTextToSize(text, maxWidth), addPage(), getNumberOfPages(), setPage(n), output("blob"). If 3.x renames any of these, adjust accordingly.
  </action>
  <verify>
    <automated>test -f assets/pdf-export.js && grep -q "window.PDFExport = (function" assets/pdf-export.js && grep -q "function ensureDeps\|function loadScriptOnce" assets/pdf-export.js && grep -q "addFileToVFS" assets/pdf-export.js && grep -q "function slugify" assets/pdf-export.js && grep -q '"Session"' assets/pdf-export.js && ! grep -q '\.normalize("NFD")' assets/pdf-export.js && ! grep -q '\[\^A-Za-z0-9\]' assets/pdf-export.js && grep -q "function triggerDownload" assets/pdf-export.js && grep -q "URL.createObjectURL" assets/pdf-export.js && grep -q "/\[\\\\u0590-\\\\u05FF" assets/pdf-export.js && node -c assets/pdf-export.js</automated>
  </verify>
  <acceptance_criteria>
    - File exists at assets/pdf-export.js
    - Contains `window.PDFExport = (function`
    - Contains `function loadScriptOnce` OR equivalent dynamic script-load
    - Contains `function ensureDeps` (or _depsLoaded guard equivalent)
    - Contains `addFileToVFS` (jsPDF font registration)
    - Contains `function slugify` with `[<>:"\/\\|?*\x00-\x1F]` strip regex AND a `"Session"` string literal fallback (D-04 amendment 2026-04-28). The original `.normalize("NFD")` and `[^A-Za-z0-9]` patterns must NOT appear.
    - Contains `function triggerDownload` with `URL.createObjectURL` (matches backup.js pattern)
    - Contains Hebrew range regex `[֐-׿` for RTL detection
    - Return surface exposes exactly: buildSessionPDF, slugify, triggerDownload (no other public functions)
    - File parses: `node -c assets/pdf-export.js`
    - File does NOT pre-load jspdf at module init (no top-level `<script>` injection at module-load time — only inside ensureDeps)
  </acceptance_criteria>
  <done>window.PDFExport.buildSessionPDF returns a PDF Blob. Lazy-loads on first call, reuses on subsequent. Hebrew is rendered RTL with NotoSansHebrew. Filenames are slugified per D-04.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| user-edited markdown → PDF body | edited preview text is rendered into a binary PDF; PDF readers do not execute scripts |
| dynamic script append → window globals | injected scripts execute with same-origin privileges |
| filename → OS share/recents | sanitized via slugify before download |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-22-05-01 | Tampering | Dynamic script injection of jspdf.min.js / fonts | mitigate | All three URLs are hardcoded same-origin paths (./assets/...). CSP `script-src 'self'` blocks any cross-origin redirection. SW precache (Plan 22-08) ensures the same bytes load offline. |
| T-22-05-02 | Information disclosure | Sensitive client data embedded in PDF, then leaked via OS share targets / Recents | mitigate | The FILENAME contains the client name as-is (per D-04 amended 2026-04-28 — the user explicitly chose this workflow; transliterating to ASCII would have broken Hebrew/diacritic names). Slugify still strips OS-reserved characters so the filename can't break the OS path layer. The PDF BODY contains data the user explicitly chose to include in the section-selection dialog (Plan 22-06). PDF stays on-device until the user explicitly Shares. Document this as accepted residual: filenames in OS recents are user-visible by design. |
| T-22-05-03 | Tampering | jsPDF library tampered post-vendor | mitigate | Vendoring (Plan 22-01) requires byte-for-byte from upstream. SW cache (Plan 22-08) pins the bytes after install. |
| T-22-05-04 | DoS | Pathologically long markdown → infinite splitTextToSize loop | mitigate | Editor textarea bounded by browser limits. splitTextToSize is bounded by content length. addPage triggered on every overflow. Worst case: very long PDF — user can interrupt by closing the modal. |
| T-22-05-05 | Information disclosure | PDF metadata leaks app version / OS / user agent | accept | jsPDF default metadata is minimal (Producer + CreationDate). Acceptable for the threat model. |
| T-22-05-06 | Spoofing | Forged filename via crafted client name (`../../etc/passwd` or `con.txt` Windows reserved name) | mitigate | slugify (D-04 amendment 2026-04-28) strips `/`, `\`, `:`, `*`, `?`, `"`, `<`, `>`, `|`, and all ASCII control chars. Trailing dots and whitespace stripped. Empty strings fall back to `Session`. The resulting filename cannot escape its directory, contains no path separators, and survives Windows/macOS/Linux save dialogs. (Note: Windows reserved device names like `CON`, `PRN`, `AUX` would not currently be blocked — accepted residual: client names matching these are exotic and the OS save dialog would prompt the user.) |
| T-22-05-07 | XSS | jsPDF embeds JS into PDF (PDFs can contain JavaScript) | accept | jsPDF's standard text() API does not embed JavaScript actions. We do not call any addJS-style API. PDF readers may still warn on JS, but our pipeline emits none. |

**Residual risk:** Low. The most material concern (sensitive data in filename → OS share) is by-design — the user explicitly initiated the export.
</threat_model>

<verification>
- node -c assets/pdf-export.js
- Manual smoke (post Plan 22-06 wiring): trigger Export → click Download PDF → verify file downloads with name like `Anna M._2026-04-27.pdf` (client name preserved as-is per D-04 amendment), opens in standard PDF reader, contains client name + session date in header, contains selected section content; second click on Export does NOT re-fetch jspdf (verify in DevTools Network).
- Hebrew filename smoke: create a session for a client named `שירה` → Export → Download PDF → verify file downloads with name `שירה_YYYY-MM-DD.pdf` and opens correctly on macOS/Windows.
- Hebrew smoke: rename a section to Hebrew text, generate PDF, verify Hebrew renders right-to-left in NotoSansHebrew font.
</verification>

<success_criteria>
- First Export click: 3 scripts append to DOM (jspdf + 2 fonts), PDF generates within 3 seconds.
- Subsequent Export clicks: PDF generates within 500 ms, no new script tags appear.
- Generated PDF: A4 portrait, 11pt body, 14pt headings, page numbers in footer.
- Hebrew sections: render right-aligned with NotoSansHebrew glyphs (no missing-glyph rectangles).
- Filename: `{ClientName as-is}_YYYY-MM-DD.pdf` — client name preserved including Unicode (Jörg, שירה, etc.); only OS-reserved chars stripped; "Session" fallback if empty (D-04 amended 2026-04-28).
</success_criteria>

<output>
Create `.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-05-pdf-export-module-SUMMARY.md` after completion documenting jsPDF API version + any jsPDF-specific quirks encountered.
</output>
