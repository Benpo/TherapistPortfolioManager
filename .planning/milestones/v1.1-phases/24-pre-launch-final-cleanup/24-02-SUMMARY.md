---
phase: 24-pre-launch-final-cleanup
plan: 02
status: complete
completed: 2026-05-14
---

# Plan 24-02 Summary — Markdown ## bug + severity reversal investigation

## Outcome

- **Item 4 / D-24 (FIXED):** Markdown `##` heading bug in `assets/md-render.js` fixed. `## heading\nbody` now renders as `<h2>heading</h2><p>body</p>` instead of `<p>## heading<br>body</p>`. Single-line headings, list rendering, and the D-23 `<br>` paragraph behavior all preserved.
- **Item 4 sibling / D-23 (DOCUMENTED):** Locked-decision comment added above `renderBlock`. No code change.
- **Item 5 / D-25 (STALE — Case C):** TODO is obsolete. The render at `assets/overview.js:416` has been `${issue.before}→${issue.after}` since 2026-03-09 (commit `bb5e2130`). All three render sites (`overview.js:416`, `sessions.js:100`, `add-session.js:626-631` + `952-957`) read `before` first, then `after`. Save path (`add-session.js:551-552`) writes `before` from `beforeScale` correctly. Comment marker added at the render site noting verification.

## Changes

| File | Change | Lines |
|------|--------|-------|
| `assets/md-render.js` | Replaced single-line heading guard with multi-line-aware regex. Heading matches `/^(#{1,3})\s+([^\n]*)(?:\n([\s\S]*))?$/`. If the optional remainder ($3) is non-empty after `trimStart()`, recursively render it as a block; otherwise emit heading-only. Recursion is bounded: an empty remainder triggers no further call. Input is already HTML-escaped by `render()` before `renderBlock()` is invoked — recursion operates on escaped substrings, no new XSS surface. | 32-44 (was 32-39) |
| `assets/md-render.js` | Added 6-line comment block above `renderBlock` documenting D-23 (locked `<br>` paragraph behavior) and D-24 (heading body remainder fix). | 32-37 (new) |
| `assets/overview.js` | Added 4-line comment block above the `issues = (session.issues || []).map(...)` template noting that D-25 was verified during Plan 24-02 execution and the 2026-05-13 TODO is obsolete. No code change. | 415-418 (new) |

## D-25 Diagnosis (Case C — stale TODO)

### Evidence

1. **Render site:** `assets/overview.js:416` reads `${issue.name} (${issue.before}→${issue.after})` — correct.
2. **Git blame:** Line 416 unchanged since `bb5e2130` (Ben, 2026-03-09 14:14:41 +0100), which predates the 2026-05-13 TODO filing by 2 months.
3. **All other render sites read correctly:**
   - `assets/sessions.js:100` — `${issueName} (${before} -> ${after})` ✓
   - `assets/add-session.js:626-631` (copy-session markdown) — `before` then `after` ✓
   - `assets/add-session.js:952-957` (markdown export) — `before` then `after` ✓
4. **Save path:** `assets/add-session.js:551-552` writes `before = App.getSeverityValue(issue.beforeScale)`, `after = App.getSeverityValue(issue.afterScale)` — correct field-to-field mapping.
5. **TODO hypothesis mismatch:** The 2026-05-13 TODO hypothesizes the bug is `${session.severityAfter} → ${session.severityBefore}`, but the actual field names are `issue.before` and `issue.after` (no `severityBefore`/`severityAfter` properties exist on session issues). The hypothesized template literal would not have ever matched the current data shape.

### Conclusion

Per the plan's Case C protocol, the TODO is marked obsolete in-code via the `D-25 (Phase 24)` comment marker. Ben should re-verify in browser UAT — if the reversal still appears, file a new gap with screenshots showing the exact reversed string and whether it matches the actual IDB record. If not reproducible, archive the TODO.

## Acceptance gates

| Gate | Result |
|------|--------|
| Node test suite (7 cases — single headings, headings+body, multi-line body, paragraph behavior, blank-line break) | 7/7 pass ✓ |
| `grep -q "D-23" assets/md-render.js` | yes ✓ |
| `grep -q "D-24" assets/md-render.js` | yes ✓ |
| `grep -q "D-25" assets/overview.js` | yes ✓ |
| `grep -E "issue\.before.*issue\.after" assets/overview.js` (non-comment) | matches line 419 ✓ |
| `grep -E "issue\.after.*issue\.before" assets/overview.js` (non-comment, render context) | no matches in render context (lines 610-615 are `beforeSum`/`afterSum` aggregates — math is commutative for sums, not a render template) ✓ |

## Regression checklist (for Ben UAT)

- [ ] Export preview pane: `## heading\nbody` renders correctly (Item 4 main case).
- [ ] Existing `# Heading` alone in a paragraph block still renders as h1.
- [ ] List rendering (`- item`, `* item`) unchanged.
- [ ] Multi-paragraph (blank line separation) still produces separate `<p>` blocks.
- [ ] Single-newline within a paragraph still produces `<br>` (D-23 locked behavior).
- [ ] PDF export unaffected (md-render.js is only used in export preview, not PDF).
- [ ] Overview clock-icon expansion for at least 3 historical sessions shows `before→after` in correct order across all 4 locales (EN/DE/HE/CS). If still reversed for Ben, file a new gap with a screenshot + IDB record dump.

## Hand-off notes

- No dependencies created or affected.
- Plan 03+ can proceed without waiting on UAT of this plan.
- If D-25 turns out to be reproducible after all, the fix would be ~1 LOC at `assets/overview.js:419` — but the comment marker documents the current verified state, so a future investigator has full context.
