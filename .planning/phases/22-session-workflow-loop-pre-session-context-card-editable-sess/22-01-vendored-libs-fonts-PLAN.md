---
phase: 22-session-workflow-loop-pre-session-context-card-editable-sess
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - assets/jspdf.min.js
  - assets/fonts/noto-sans-base64.js
  - assets/fonts/noto-sans-hebrew-base64.js
autonomous: true
requirements:
  - REQ-13   # PDF download (CRITICAL) — vendored library is the foundation
user_setup: []

must_haves:
  truths:
    - "jsPDF UMD library is available at assets/jspdf.min.js (vendored, byte-for-byte from upstream MIT release)"
    - "Noto Sans Latin/Extended base64 font is available at assets/fonts/noto-sans-base64.js exposing window.NotoSans (single base64 string)"
    - "Noto Sans Hebrew base64 font is available at assets/fonts/noto-sans-hebrew-base64.js exposing window.NotoSansHebrew (single base64 string)"
    - "All three files are pure data — they do not auto-execute against the DOM, they expose globals only"
    - "No external network requests — fonts are self-contained per CSP font-src 'self'"
  artifacts:
    - path: "assets/jspdf.min.js"
      provides: "jsPDF UMD library (window.jspdf with .jsPDF constructor)"
      min_lines: 1
    - path: "assets/fonts/noto-sans-base64.js"
      provides: "window.NotoSans = '<base64 TTF/OTF string>'"
      contains: "window.NotoSans"
    - path: "assets/fonts/noto-sans-hebrew-base64.js"
      provides: "window.NotoSansHebrew = '<base64 TTF/OTF string>'"
      contains: "window.NotoSansHebrew"
  key_links:
    - from: "assets/jspdf.min.js"
      to: "window.jspdf"
      via: "UMD self-attach on script load"
      pattern: "window\\.jspdf"
    - from: "assets/fonts/noto-sans-base64.js"
      to: "window.NotoSans"
      via: "global assignment"
      pattern: "window\\.NotoSans\\s*="
    - from: "assets/fonts/noto-sans-hebrew-base64.js"
      to: "window.NotoSansHebrew"
      via: "global assignment"
      pattern: "window\\.NotoSansHebrew\\s*="
---

<objective>
Vendor the jsPDF library and embed Noto Sans / Noto Sans Hebrew fonts as base64 strings in dedicated JS files. These three files are pure assets that the PDF export module will lazy-load on first Export click. They must exist before pdf-export.js (Plan 22-04) can be implemented.

Purpose: Lock the privacy story (no Google Fonts CDN at export time, fully offline-capable per D-02/D-03), and provide deterministic Hebrew RTL rendering in PDFs (Sapir is the test user — Hebrew quality is non-negotiable).

Output: One vendored library file + two font asset files. No code logic changes elsewhere in this plan.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-SPEC.md
@.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-CONTEXT.md
@.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-PATTERNS.md
@assets/jszip.min.js

<interfaces>
<!-- The PDF export module (Plan 22-04) will consume these globals:

window.jspdf.jsPDF — constructor for jsPDF documents
  new window.jspdf.jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' })

window.NotoSans — base64 string of Noto Sans TTF (Latin + extended diacritics: en/de/cs)
window.NotoSansHebrew — base64 string of Noto Sans Hebrew TTF (he)

Usage pattern (Plan 22-04 will implement, this plan does not):
  doc.addFileToVFS('NotoSans.ttf', window.NotoSans);
  doc.addFont('NotoSans.ttf', 'NotoSans', 'normal');
  doc.addFileToVFS('NotoSansHebrew.ttf', window.NotoSansHebrew);
  doc.addFont('NotoSansHebrew.ttf', 'NotoSansHebrew', 'normal');
-->
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Vendor jsPDF UMD library</name>
  <files>assets/jspdf.min.js</files>
  <read_first>
    - assets/jszip.min.js (precedent — vendored library file at assets/ root, byte-for-byte from upstream)
    - .planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-CONTEXT.md (D-01: vendor jsPDF ~50KB minified, MIT license)
    - .planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-PATTERNS.md (section "assets/jspdf.min.js" — analog is jszip.min.js)
  </read_first>
  <action>
    Download the jsPDF v2.5.x UMD minified build (latest 2.x release; the 3.x line is also acceptable if the API used by Plan 22-04 — addFileToVFS, addFont, setFont, setR2L, text, splitTextToSize, addPage, save, output — is preserved). MIT license. Source: https://github.com/parallax/jsPDF/releases (file `jspdf.umd.min.js`) or unpkg.com/jspdf@2.5.2/dist/jspdf.umd.min.js.

    Save the file byte-for-byte to assets/jspdf.min.js. Do NOT modify the file contents. Do NOT remove the license banner comment at the top. The UMD wrapper attaches to window.jspdf with the jsPDF constructor at window.jspdf.jsPDF — do not unwrap or re-export.

    Verify size is in the 50–400 KB range (jsPDF UMD with embedded encoders) and that the SHA matches the upstream release. No npm/build step — this is a vendored static asset, mirroring the assets/jszip.min.js precedent.

    Use Context7 MCP if needed during execution to confirm the exact jsPDF API version compatibility for the methods used in Plan 22-04: addFileToVFS, addFont, setFont, setR2L, text, splitTextToSize, addPage, save.
  </action>
  <verify>
    <automated>test -f assets/jspdf.min.js &amp;&amp; head -c 200 assets/jspdf.min.js | grep -E "jspdf|jsPDF|MIT" &amp;&amp; wc -c assets/jspdf.min.js | awk '{ if ($1 &gt; 30000 &amp;&amp; $1 &lt; 500000) print "size_ok"; else print "size_FAIL_" $1 }' | grep size_ok</automated>
  </verify>
  <acceptance_criteria>
    - File exists at exact path: assets/jspdf.min.js
    - File size is between 30 KB and 500 KB (jsPDF UMD typical range)
    - First 200 bytes contain one of: "jspdf", "jsPDF", or "MIT" (license header or self-name)
    - File is valid JavaScript (loads without syntax error in node: `node -e "require('./assets/jspdf.min.js')"` — note: UMD will attach to a fake `global.window` if you set one up, but plain `node -c assets/jspdf.min.js` is sufficient to verify syntax)
    - File does NOT match a fetch to Google Fonts or any external URL: `grep -E "googleapis|googleusercontent|fonts.gstatic" assets/jspdf.min.js` returns empty
  </acceptance_criteria>
  <done>jsPDF UMD library is available at assets/jspdf.min.js. window.jspdf.jsPDF will be the constructor when the script is loaded in a browser context.</done>
</task>

<task type="auto">
  <name>Task 2: Vendor Noto Sans (Latin + Extended) as base64 JS asset</name>
  <files>assets/fonts/noto-sans-base64.js</files>
  <read_first>
    - .planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-CONTEXT.md (D-02: embed Noto Sans Latin/Extended diacritics for de/cs, base64 string, single global)
    - .planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-PATTERNS.md (section "assets/fonts/noto-sans-base64.js" — file contract: single base64 export on window.NotoSans)
    - assets/fonts (existing fonts directory — Rubik WOFF2 lives here for the UI, this new file lives in the same directory but is consumed differently)
  </read_first>
  <action>
    Acquire the Noto Sans TTF font from Google Fonts (https://fonts.google.com/noto/specimen/Noto+Sans) — license: SIL Open Font License 1.1 (free for embedding). Download the Regular weight (400) TTF.

    Subset the font to the glyphs used by en/de/cs UI (Latin + Latin Extended + common punctuation/symbols). Subsetting target: ~80–150 KB after subsetting. Use `pyftsubset` (fonttools) at vendoring time:
      pyftsubset NotoSans-Regular.ttf --unicodes="U+0020-007E,U+00A0-024F,U+2000-206F,U+20AC,U+2122" --output-file=NotoSans-subset.ttf
    Then base64-encode:
      base64 -i NotoSans-subset.ttf | tr -d '\n' &gt; encoded.txt

    Create assets/fonts/noto-sans-base64.js with EXACTLY this structure (no surrounding IIFE, no module wrapper — it must be loadable by simple <script src=...> tag):

      // Noto Sans Regular — subset (Latin + Latin Extended) — SIL OFL 1.1
      // Vendored 2026-04-27 for Phase 22 (pdf-export.js).
      // To regenerate: pyftsubset NotoSans-Regular.ttf --unicodes=&quot;U+0020-007E,U+00A0-024F,U+2000-206F,U+20AC,U+2122&quot; then base64 the .ttf.
      window.NotoSans = "&lt;BASE64_STRING_HERE&gt;";

    The base64 string must be on ONE LINE (no newlines in the string literal) and assigned to window.NotoSans. Final file size: target 100–250 KB (base64 expands the binary by ~33%).

    Acceptable license note placement: as a JS comment block at the top of the file. The actual SIL OFL.txt license text does NOT need to live inside this file (Google Fonts upstream license applies — note the source).

    If you cannot run pyftsubset locally during execution, fall back to: download the FULL Noto Sans Regular TTF, base64 it raw (target file size 700KB-1.2MB), and document this in the file header comment with a TODO to subset later. Subsetting is preferred but a full font is acceptable as a fallback because PDFs will still embed correctly.
  </action>
  <verify>
    <automated>test -f assets/fonts/noto-sans-base64.js &amp;&amp; grep -c "window.NotoSans\s*=" assets/fonts/noto-sans-base64.js | grep -E "^[1-9]" &amp;&amp; head -c 800 assets/fonts/noto-sans-base64.js | grep -iE "noto sans|SIL|OFL"</automated>
  </verify>
  <acceptance_criteria>
    - File exists at exact path: assets/fonts/noto-sans-base64.js
    - File contains exactly one assignment matching `window.NotoSans = "..."` (grep `window.NotoSans\s*=` returns at least one match)
    - File header comment mentions "Noto Sans" AND ("SIL" OR "OFL") — license attribution
    - File size is between 80 KB and 1.5 MB (subset: 80–250 KB; full font fallback: up to 1.5 MB)
    - The base64 string is non-empty (at least 50,000 chars)
    - No external fetch URLs in the file: `grep -iE "googleapis|fonts.gstatic|http://" assets/fonts/noto-sans-base64.js` returns empty
    - File can be loaded in node without errors: `node -c assets/fonts/noto-sans-base64.js`
  </acceptance_criteria>
  <done>Noto Sans base64 font is available at assets/fonts/noto-sans-base64.js. window.NotoSans is set to the base64 TTF string when the script is loaded in a browser context.</done>
</task>

<task type="auto">
  <name>Task 3: Vendor Noto Sans Hebrew as base64 JS asset</name>
  <files>assets/fonts/noto-sans-hebrew-base64.js</files>
  <read_first>
    - .planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-CONTEXT.md (D-02: Noto Sans Hebrew rendered via jsPDF R2L flag, base64 embedded)
    - .planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-PATTERNS.md (section "assets/fonts/noto-sans-hebrew-base64.js" — same shape as Latin variant)
    - assets/fonts/noto-sans-base64.js (sibling file from Task 2 — mirror exact structure)
  </read_first>
  <action>
    Acquire Noto Sans Hebrew TTF from Google Fonts (https://fonts.google.com/noto/specimen/Noto+Sans+Hebrew) — license: SIL Open Font License 1.1. Download Regular weight (400).

    Subset to Hebrew + common punctuation: U+0020-007E (basic Latin for mixed text), U+0590-05FF (Hebrew block), U+FB1D-FB4F (Hebrew presentation forms), U+2000-206F (general punctuation):
      pyftsubset NotoSansHebrew-Regular.ttf --unicodes="U+0020-007E,U+00A0-00FF,U+0590-05FF,U+FB1D-FB4F,U+2000-206F" --output-file=NotoSansHebrew-subset.ttf
    Target subset size: ~50–100 KB (Hebrew has fewer glyphs than full Latin Extended).

    Create assets/fonts/noto-sans-hebrew-base64.js with the exact structure:

      // Noto Sans Hebrew Regular — subset (Hebrew + basic Latin punctuation) — SIL OFL 1.1
      // Vendored 2026-04-27 for Phase 22 (pdf-export.js).
      // To regenerate: pyftsubset NotoSansHebrew-Regular.ttf --unicodes=&quot;U+0020-007E,U+00A0-00FF,U+0590-05FF,U+FB1D-FB4F,U+2000-206F&quot; then base64 the .ttf.
      window.NotoSansHebrew = "&lt;BASE64_STRING_HERE&gt;";

    Same fallback rule as Task 2 if pyftsubset is unavailable: full Noto Sans Hebrew TTF base64-encoded (target 400-700 KB) is acceptable, document with a TODO comment.
  </action>
  <verify>
    <automated>test -f assets/fonts/noto-sans-hebrew-base64.js &amp;&amp; grep -c "window.NotoSansHebrew\s*=" assets/fonts/noto-sans-hebrew-base64.js | grep -E "^[1-9]" &amp;&amp; head -c 800 assets/fonts/noto-sans-hebrew-base64.js | grep -iE "noto sans hebrew|SIL|OFL"</automated>
  </verify>
  <acceptance_criteria>
    - File exists at exact path: assets/fonts/noto-sans-hebrew-base64.js
    - File contains exactly one assignment matching `window.NotoSansHebrew = "..."` (grep `window.NotoSansHebrew\s*=` returns at least one match)
    - File header comment mentions "Noto Sans Hebrew" AND ("SIL" OR "OFL")
    - File size is between 50 KB and 1 MB (subset: 50–100 KB; full font fallback: up to 1 MB)
    - The base64 string is non-empty (at least 30,000 chars)
    - No external fetch URLs: `grep -iE "googleapis|fonts.gstatic|http://" assets/fonts/noto-sans-hebrew-base64.js` returns empty
    - File can be loaded in node without errors: `node -c assets/fonts/noto-sans-hebrew-base64.js`
  </acceptance_criteria>
  <done>Noto Sans Hebrew base64 font is available at assets/fonts/noto-sans-hebrew-base64.js. window.NotoSansHebrew is set to the base64 TTF string when the script is loaded in a browser context.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| upstream → vendored file | jsPDF + Noto Sans bytes acquired from Google Fonts / GitHub releases — must be byte-for-byte from a verified source, not modified |
| script load → window globals | Loading these files via `<script src>` exposes `window.jspdf`, `window.NotoSans`, `window.NotoSansHebrew` — same-origin only, no XHR/fetch |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-22-01-01 | Tampering | Vendored jsPDF library bytes | mitigate | Pull from official jsPDF GitHub release (parallax/jsPDF) or unpkg.com pinned to a versioned URL. Verify file size is in expected range (30–500 KB). MIT license header retained. No modifications. Manual review of the diff before commit. |
| T-22-01-02 | Information disclosure | Font files contain user-displayed glyphs only — no PII | accept | Fonts are static glyph data. No PII risk. License attribution in file header (SIL OFL 1.1). |
| T-22-01-03 | DoS / resource exhaustion | Large font files inflate SW precache and PWA install size | mitigate | Subsetting to en/de/cs glyph ranges keeps Latin font ~80–250 KB, Hebrew ~50–100 KB. Total &lt;500 KB added to PWA bundle. SW PRECACHE_URLS update is in Plan 22-08 — that plan owns the cache budget review. |
| T-22-01-04 | Tampering | Base64 strings could embed unexpected payload (e.g., a hidden script tag if base64-decoded into HTML) | mitigate | Base64 strings are loaded as binary fonts via jsPDF.addFileToVFS — they are NEVER injected into HTML, NEVER eval'd. The browser treats them as TTF binary. Same-origin CSP (`script-src 'self'`) prevents external script injection regardless. |
| T-22-01-05 | Information disclosure / privacy | Loading fonts from Google Fonts CDN at runtime would leak user IP to Google | mitigate | Fonts are vendored as base64 in same-origin JS files. No external font fetch at runtime. CSP `font-src 'self'` declared on app pages. Acceptance criteria includes `grep -iE "googleapis|gstatic"` returns empty. |
| T-22-01-06 | Spoofing | Wrong font version could be vendored (e.g., a malicious clone repo) | mitigate | Source is documented in file header comments (Google Fonts / parallax/jsPDF). Reviewer at code-review checks the upstream URL matches what was actually downloaded. |

**Residual risk:** Low. All three files are static data with no execution surface beyond global assignment. The single sensitive surface (font bytes embedded in PDFs) is owned by the user — the user generates and downloads the PDF locally; nothing leaves the device.
</threat_model>

<verification>
Run each task's automated check in order. After all three pass:
- ls assets/jspdf.min.js assets/fonts/noto-sans-base64.js assets/fonts/noto-sans-hebrew-base64.js (all three exist)
- node -c assets/jspdf.min.js (syntax OK)
- node -c assets/fonts/noto-sans-base64.js (syntax OK)
- node -c assets/fonts/noto-sans-hebrew-base64.js (syntax OK)
- du -k assets/jspdf.min.js assets/fonts/noto-sans-base64.js assets/fonts/noto-sans-hebrew-base64.js (sanity-check sizes against acceptance criteria ranges)
</verification>

<success_criteria>
- assets/jspdf.min.js exists and is a valid jsPDF UMD build with MIT license header
- assets/fonts/noto-sans-base64.js exists and assigns window.NotoSans to a non-empty base64 string
- assets/fonts/noto-sans-hebrew-base64.js exists and assigns window.NotoSansHebrew to a non-empty base64 string
- All three files are pure assets — no DOM mutation, no IIFE, no external network requests
- Total added bundle size &lt;1.5 MB (subset path) or &lt;3 MB (full-font fallback path) — Plan 22-08 will validate SW cache budget
</success_criteria>

<output>
After completion, create `.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-01-vendored-libs-fonts-SUMMARY.md` documenting:
- Exact upstream version of jsPDF used (e.g., 2.5.2)
- Subsetting tool + glyph ranges used (or full-font fallback note)
- Final file sizes
- License attribution location
</output>
