---
status: complete
phase: 29-reliability-observability
source: [29-VERIFICATION.md, 29-01-SUMMARY.md, 29-03-SUMMARY.md, 29-04-SUMMARY.md]
started: 2026-06-23T12:00:00Z
updated: 2026-06-26T01:30:00Z
---

## Current Test

[testing complete — 5/5 resolved, all on-device-confirmed]

## Tests

### 1. D-06 mailto reliability on installed PWA (on-device)
expected: Native mail client opens with recipient contact@sessionsgarden.app, pre-filled subject, and a short "paste below this line" body (full log NOT in the mailto). Degradation path degradeToVisibleAddress() is the fallback if mailto fails.
result: pass

### 2. Crash log captures every error in a cascade (re-confirm after 29-04 race fix)
expected: On the local build (with the 29-04 fix), one cascade fires 3 distinct error sources (direct logError seam, unhandled rejection, uncaught error). Count the report entries: expect 3 distinct entries — one per source. Previously only 1/3 survived (the lost-update race in append(), now closed by the _appendTail serialized queue; unit test 29-01 case 7 is 5/5 GREEN).
result: pass
note: "Re-confirmed on-device (local build http://localhost:8080, Safari, 2026-06-26). Console cascade → COUNT = 3, sources [direct-seam, unhandledrejection, onerror] all survived. Race fix confirmed."

### 3. Each error is logged once (re-confirm after 29-04 double-log fix)
expected: On the local build, a post-load error/rejection yields exactly ONE entry at its real source. Previously it appeared twice — once as source 'early' and once as the real source (identical timestamp/message). Fixed by the `if(self.CrashLog)return;` guard in the inline P() across 21 pages; integration test 29-05 is 2/2 GREEN.
result: pass
note: "Re-confirmed on-device (local build, 2026-06-26). Each cascade message appeared exactly once at its real source; NO source:'early' duplicate. Double-log fix confirmed."

### 4. Copy report copies the FULL report (not just the header)
expected: On report.html with logged problems, "Copy report" → paste yields the COMPLETE report (diagnostic header + all entries), matching the on-screen preview.
result: pass
note: "FIXED + re-confirmed on-device (local build, Safari, 2026-06-26). Root cause: NUL bytes in redactReport's UA placeholder truncated Safari's NUL-terminated clipboard. Fix: plain placeholder token (report.js 0 NUL bytes). Behavior-test-first: 29-03 Case 7 RED→GREEN, 0 regressions. Paste now yields the full report (header + UA + 'Logged problems: 3' + all 3 entries)."

### 5. Settings "Report a problem" button color (cosmetic)
expected: The Settings "Report a problem" entry does not read as the loud green primary action.
result: pass
reported: "The 'Report a problem' button in Settings was green (the solid primary style) — shouldn't look like a calm primary action."
severity: cosmetic
note: "FIXED (2026-06-26): 'Report a problem' restyled to a soft AMBER 'alert' (warning palette: bg --color-warning-bg, text/border --color-warning-text; themed light+dark). Iteration: green→ghost (looked identical to the outlined 'Clear problem log' — twin/no-hierarchy)→amber per Ben. NOT solid red (= app's Delete style). 'Clear problem log' stays quiet/outlined. Ben confirmed on-device 2026-06-26: 'looks good'."

## Summary

total: 5
passed: 5
issues: 0
pending: 0
skipped: 0
blocked: 0
# All findings resolved. Test 5 (Settings "Report a problem" button → ghost) awaiting Ben's on-device cosmetic eyeball.

## Gaps

# ── RESOLVED (29-04 gap closure; re-confirmed on-device 2026-06-26) ──
# GAP 1 (cascade race, test 2): CLOSED. _appendTail serialized queue; 29-01 case 7 5/5 GREEN; on-device COUNT=3.
# GAP 2 (post-load double-log, test 3): CLOSED. if(self.CrashLog)return; guard on 21 pages; 29-05 2/2 GREEN; on-device no 'early' duplicate.

# ── OPEN ──
- truth: "Copy report copies the COMPLETE report (diagnostic header + all entries), matching the on-screen preview."
  status: resolved   # fixed + re-confirmed on-device 2026-06-26 (full report copies)
  reason: "User reported (local build http://localhost:8080, Safari, 2026-06-26): 'Copy report' copies only the title + separator + App version/DB version/UI language and stops after 'UI language: en'. The User agent line, 'Logged problems: N', the closing separator, and ALL entries are dropped from the clipboard, even though the preview shows them. Recurring ('like before')."
  severity: major
  test: 4
  root_cause: "DIAGNOSED & FIXED. redactReport() wrapped its UA placeholder in NUL bytes — the source literal was '\\0UA_PLACEHOLDER\\0' (Read renders \\0 as a space) — while the re-stitch regex matched SPACES (/ ?UA_PLACEHOLDER ?/). The re-stitch swapped the token back to the UA text but left the two NUL bytes straddling the 'User agent:' line (redacted nul count 0→2). Safari's native clipboard is NUL-terminated: navigator.clipboard.writeText received the full 618-char string (browser-spy confirmed length=618) but paste cut at the FIRST NUL → exactly the header through 'UI language: en'. (The earlier 'UA leading space' note was the same NUL rendering as a space — one bug, not two.)"
  artifacts:
    - path: "assets/report.js"
      issue: "redactReport() L210 placeholder literal carried NUL delimiters mismatched to the L241 space-based re-stitch regex."
  fix:
    - "assets/report.js L210: placeholder '\\0UA_PLACEHOLDER\\0' → 'UA_PLACEHOLDER' (plain token; the existing / ?UA_PLACEHOLDER ?/ re-stitch matches it cleanly). report.js now has 0 NUL bytes; redacted output 0 control chars (618→616)."
    - "tests/29-03-report.test.js Case 7 (NEW, behavior-test-first): asserts the redacted preview has no NUL / no C0 control chars, the 'User agent:' line starts cleanly after \\n, and a NUL-terminated copy still carries the last entry + count. RED (4/4 fail) on the buggy code → GREEN after the fix. Closes the mock-clipboard coverage gap."
  verification: "node tests/29-03-report.test.js → all cases pass incl. Case 7; regression sweep GREEN (29-01 7/7, 29-05 2/2, 29-04 3/3, 29-02 6/6+6/6, report-wiring pass). Control-char scan of fixed output: 0."
  missing:
    - "Ben on-device re-confirm: clear SW cache (sessions-garden-dev) → reload → Copy report → paste → full report present."
  debug_session: ""

- truth: "The Settings 'Report a problem' button is not styled as the loud green primary action."
  status: resolved   # fixed 2026-06-26; awaiting on-device eyeball
  reason: "User reported (2026-06-26): the 'Report a problem' entry in Settings is green (solid .button primary) — shouldn't look like a calm primary action; expected something quieter (Ben: 'red instead of green', then chose neutral/de-emphasize once told solid-red = the app's Delete style)."
  severity: cosmetic
  test: 5
  root_cause: "settings.js buildReportRow() rendered the open link with class 'button settings-report-open' → base .button = solid --color-primary (green). The green came purely from .button; .settings-report-open only adds text-decoration:none."
  fix:
    - "settings.js buildReportRow(): openLink className kept as 'button settings-report-open' (NOT ghost). app.css .settings-report-open extended with soft amber: background var(--color-warning-bg), color + border var(--color-warning-text), box-shadow none — overrides .button's green. Warning tokens themed light (#fff3cd/#856404) + dark (#3a2f00/#ffd966)."
    - "Rationale: amber = 'alert/attention' without the loud green primary OR the solid-red Delete style; visually distinct from the quiet outlined 'Clear problem log'. Ghost was tried first but produced a twin of the Clear button (no hierarchy)."
  artifacts:
    - path: "assets/settings.js"
      issue: "buildReportRow() open-link className."
    - path: "assets/app.css"
      issue: ".settings-report-open amber styling."
  missing: []   # Ben confirmed on-device 2026-06-26 ('looks good').
  debug_session: ""
