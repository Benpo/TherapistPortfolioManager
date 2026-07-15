---
phase: 46-rich-text-toolbar-editor
plan: 14
status: superseded
completed: 2026-07-15
outcome: gate ran, failed item 11 → gaps 10/11 → re-run duty transferred to 46-16
---

# Plan 46-14 Summary — real-device gate re-run (round 2): SUPERSEDED BY 46-16

The 46-14 gate re-run STARTED on 2026-07-15 against the 00f0c08 pre-prod build
(the round-1 gap fixes plus the 4 code-review fixes, suite 190/190 green).
Ben drove it on a MacBook Pro and **failed checklist item 11** (export Step 2):

- At the DEFAULT (non-maximized) Step-2 size the formatting toolbar rendered as
  a ~15px sliver with every button clipped, and the editor showed ~1.5 lines.
- Ben re-affirmed the round-1 ratified requirement: the export formatting
  toolbar must NEVER be hidden — and the bar could still be hidden two ways
  (flex compression clipping; scroll-away inside the overflow-y:auto edit area).

Recorded as **gaps 10 and 11** in 46-UAT.md (with source-confirmed root cause).
Per Ben's directive the fix routed through proper gap closure — plans **46-15**
(CSS fix + falsifiable WebKit probe) and **46-16** (the new closing device
gate). 46-16 carries this plan's full 11-item checklist verbatim plus explicit
gap-10/11 verification, so **this plan's re-run duty is superseded by 46-16**
and 46-14 will not be re-run itself. Items 1-10 of the round-2 matrix were
still pending when the gate was interrupted; they remain to be driven at 46-16.

No code was produced by this plan (pure human-verify checkpoint).
