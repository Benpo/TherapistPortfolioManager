---
status: resolved
trigger: "rtl-client-name-date-line-scrambled — in Hebrew mode with month-name date format, an LTR client name adjacent to a Hebrew month-name date renders scrambled: 'dgh' + May 16 2026 shows '2026 במאי dgh • 16' instead of 'dgh • 16 במאי 2026'"
created: 2026-07-07T00:00:00Z
updated: 2026-07-07T11:15:00Z
resolved_by: "gap plan 38-11 (FSI isolation via window.DateFormat.isolate; Ben approved on-device 2026-07-07)"
---

## Current Focus

hypothesis: CONFIRMED — updateSessionTitle (add-session.js:1698) composes `${clientName} • ${dateText}` into a single unisolated text node under html[dir=rtl]. Neither the LTR client name nor the mixed-direction month-name date ("16 במאי 2026") is bidi-isolated, so the Unicode Bidi Algorithm reorders the adjacent L / neutral-bullet / EN-number / Hebrew runs → "2026 במאי dgh • 16".
test: Confirmed by source trace: (1) date-format.js maybeWrapLtr wraps ONLY numeric formats — month-name Hebrew returns a bare mixed string (documented L25/L78-79); (2) add-session.js:1698 concatenates name+date into one .textContent / document.title with no isolation.
expecting: N/A — root cause confirmed.
next_action: Return ROOT CAUSE FOUND to team lead (find_root_cause_only mode — no fix applied).

## Symptoms

expected: The client-name + date line reads correctly in Hebrew mode even when the client name is Latin/LTR — e.g. "dgh • 16 במאי 2026" (name bidi-isolated, date parts in correct order).
actual: Displays "2026 במאי dgh • 16" — the LTR name and the numeric runs around the Hebrew month name reorder each other (classic missing bidi isolation between adjacent LTR/RTL/numeric runs).
errors: None reported (visual/bidi issue).
reproduction: Hebrew language + month-name date format chosen in personalization (portfolioDateFormat); a client whose name is Latin script (e.g. "dgh") with a session on May 16 2026; view the line rendering "{name} • {date}" (bold text — session card/heading suspected). Server running at http://localhost:8038.
started: Discovered during Phase 38 UAT retest 2026-07-07; user says pre-existing. Do NOT attribute origin phase.

## Eliminated

## Evidence

- timestamp: 2026-07-07
  checked: grep "•" across assets/*.js, index.html, demo.html, *.html
  found: |
    Exact scramble site = assets/add-session.js:1691-1707 updateSessionTitle().
    Line 1698: `const titleText = `${clientName} • ${dateText}`;`
    Line 1699: `titleEl.textContent = titleText;` (bold .section-title heading)
    Line 1700: `document.title = titleText;` (plain-text — CANNOT hold HTML/<bdi>)
    clientName = getClientDisplayName(client) → raw user string ("dgh", LTR).
    dateText = App.formatDate(session.date) → in he + month-name format = "16 במאי 2026".
    All concatenated into ONE text node, no per-run bidi isolation.
  implication: This is the screenshot's bold line. Under html[dir=rtl] the Unicode Bidi Algorithm reorders the LTR name + neutral bullet + the two Latin numeric runs (16, 2026) relative to the Hebrew month word (במאי) → observed "2026 במאי dgh • 16".

- timestamp: 2026-07-07
  checked: assets/date-format.js format()/maybeWrapLtr() — how the month-name date is built
  found: |
    maybeWrapLtr (L81-84) wraps with U+2066 LRI … U+2069 PDI ONLY when isNumericKey
    (mm/dd/yyyy, dd/mm/yyyy, yyyy-mm-dd). The MONTH-NAME keys (month-day-year,
    day-month-year, auto) are explicitly NOT wrapped — documented at L25 & L78-79:
    "Named-month Hebrew is NOT wrapped." So for he + day-month-year, format() returns
    the BARE mixed-direction string "16 במאי 2026" (EN digits + Hebrew word + EN digits)
    with zero isolation.
  implication: TWO isolation gaps stack: (a) the date string itself is a bare mixed run for month-name formats, and (b) the client name is not isolated from it at the composition site. The numeric-format path is already safe (LRI/PDI) — which is why the bug only reproduces with the month-name format chosen, exactly as reported.

- timestamp: 2026-07-07
  checked: existing bidi-isolation patterns in codebase (grep bdi / dir=auto / unicode-bidi / isolate)
  found: |
    - date-format.js already uses the bare-string Unicode-isolate approach (LRI/PDI)
      precisely BECAUSE call sites use .textContent / document.title / markdown (L78-79)
      — <bdi> markup is not an option for document.title.
    - add-session.html:457 export editor uses dir="auto".
    - pdf-export.js:285 implements its own UAX#9 HL2 first-strong direction (PDF path
      is separate; not the HTML scramble site).
    No shared JS helper exists for isolating an arbitrary user string in composition.
  implication: The consistent, context-safe fix here is the bare-string Unicode-isolate approach (matches D-07). Because updateSessionTitle also writes document.title (plain text), a <bdi>/CSS-only fix cannot cover both targets — string-level isolate wrapping is required.

## Resolution

root_cause: |
  Missing bidi isolation at the string-composition site. In Hebrew mode the whole app
  runs under html[dir=rtl]. updateSessionTitle() (assets/add-session.js:1698) builds the
  bold .section-title heading as ONE text node:
      `${clientName} • ${dateText}`   → titleEl.textContent  AND  document.title
  with:
    - clientName = raw user string (e.g. "dgh", strong-LTR Latin), NOT isolated
    - dateText   = App.formatDate(...) which, for he + a MONTH-NAME format
      (day-month-year / month-day-year / auto), returns the BARE mixed-direction string
      "16 במאי 2026" (Latin digits + Hebrew word + Latin digits).
  date-format.js intentionally isolates ONLY numeric formats (maybeWrapLtr → LRI/PDI when
  isNumericKey); named-month Hebrew is explicitly left unwrapped (L25, L78-79). So for the
  month-name format the date is a bare mixed run, and it is concatenated next to an
  un-isolated LTR name across a neutral " • " separator. Under the RTL base direction the
  Unicode Bidi Algorithm reorders these adjacent L / ON(bullet) / EN(16,2026) / R(במאי)
  runs, producing "2026 במאי dgh • 16". This is a pure display-order (bidi) defect — the
  logical/stored data is correct. It only reproduces with the month-name format because the
  numeric-format path is already LRI/PDI-isolated (matches the reported repro exactly).
fix: |
  NOT APPLIED (find_root_cause_only mode). Suggested direction:
  Isolate each user/mixed run at the composition sites using bare-string Unicode isolates
  (First-Strong Isolate U+2068 … Pop Directional Isolate U+2069), consistent with the
  existing D-07 decision in date-format.js. FSI (not LRI) is correct for the client NAME so
  Hebrew-named clients stay RTL and Latin-named clients stay LTR; FSI also correctly renders
  the month-name date (first strong char = Hebrew → RTL date; English month → LTR).
  Add a shared helper (e.g. App.bidiIsolate(str) = "⁨"+str+"⁩") and wrap BOTH the
  name and the date:  `${isolate(clientName)} • ${isolate(dateText)}`.
  A <bdi>/CSS unicode-bidi:isolate approach is INSUFFICIENT alone because line 1700 also
  writes document.title, which is plain text and cannot carry markup — so string-level
  isolation is required for this site.
  Sites to treat (fix pass):
    - PRIMARY (screenshot, confirmed): assets/add-session.js:1698 updateSessionTitle —
      isolate clientName AND dateText.
    - SECONDARY (same bug class, fix in same pass): assets/overview.js:799
      (`${formatDate} • ${sessionType}` session-meta) and assets/overview.js:958-961
      (age + Hebrew type joined by " • " across plain inline spans) — isolate the date /
      each part. Lower visual severity (no LTR name) but same missing-isolation mechanism.
  VERIFY-ONLY (separate render path, likely already correct): PDF export title block
    (assets/export-modal.js:174 → assets/pdf-export.js, which has its own UAX#9 HL2
    first-strong bidi at :285). Confirm the he month-name date + Latin client name render
    correctly in the exported PDF header.
  CONFIRMED SAFE (no change): table cells are block-isolated — sessions.js:178-185
    (dateCell/clientCell/typeCell separate <td>) and overview.js main table
    (nameCell / lastSessionCell / nextSessionCell separate <td>).
verification: N/A — diagnosis only.
files_changed: []
