---
phase: 27-backup-restore-modal-visual-cohesion-ui-spec-pass
verified: 2026-06-15T00:00:00Z
status: human_needed
score: 7/7 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Open the Backup & Restore modal in light mode and dark mode. Confirm that the modal reads as one coherent visual system (plain sections separated by hairline dividers — no tinted cards), all section headings are the same visual size, the Import 'Replaces all current data' band is clearly amber (not red), and the overall impression is 'thought through'."
    expected: "No tinted card backgrounds visible on Contents or Test-password sections. All section headings (Export, Import, Test-password, Contents, How reminders work) appear at the same size. The Import warning band is amber/golden-yellow, clearly distinct from a red alert. The modal feels calm and internally consistent."
    why_human: "Visual cohesion is a design judgement call. Code verifies the CSS token and selector changes are in place, but whether the result LOOKS cohesive to Ben — including whether the dark-mode amber (#ffd966 on #3a2f00) reads correctly in the UI — requires visual inspection."
---

# Phase 27: Backup & Restore Modal Visual Cohesion Verification Report

**Phase Goal:** Redesign the Backup & Restore modal for visual cohesion — produce a single coherent visual system for the modal. The Phase 25 modal accumulated visual devices round-by-round and read as "not thought through". This phase is a VISUAL-ONLY pass (no functional regression).
**Verified:** 2026-06-15
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | One section rhythm: every section is a plain block on the modal surface separated by the existing hairline divider — no tinted cards remain | VERIFIED | `.backup-modal-section--contents` rule deleted entirely (grep returns 0 hits for the card properties). `.backup-test-password-card` stripped of `background` and `border-radius`; only `display:flex; flex-direction:column; gap:var(--space-md,16px)` remains. |
| 2 | The Import 'Replaces all current data' band reads as a calm AMBER caution band, not a red alarm band | VERIFIED | `.backup-modal-import-warning` rule confirmed: `background: var(--color-warning-bg, #fff3cd)`, `color: var(--color-warning-text, #856404)`, `border-inline-start: 4px solid var(--color-warning-text, #856404)`. Zero `--color-danger-*` tokens on this selector. |
| 3 | Import warning band and test-password error band are the SAME inline-message component — one severity palette, not two | VERIFIED | Both selectors use `--color-warning-bg/text` tokens, `padding: var(--space-sm,8px) var(--space-md,16px)`, `border-radius:4px`, `4px border-inline-start`. Note from code review (WR-02): `font-weight` and `margin` differ (import=700/bottom-16px; result=unset/top-8px) — the comment over-claims "identical box metrics" but the colour family and structural box are unified. The one-severity-palette ROADMAP goal is met. |
| 4 | Amber caution band stays readable in DARK mode: `--color-warning-bg`/`--color-warning-text` overrides exist in tokens.css dark block | VERIFIED | `[data-theme="dark"]` block confirmed to contain `--color-warning-bg: #3a2f00` and `--color-warning-text: #ffd966`. Dark success overrides unchanged. No dark `--color-danger-*` added. WCAG contrast 9.69:1 on #202828 (per REVIEW.md adversarial check). |
| 5 | All modal section headings render at a single size — no mixed heading sizes | VERIFIED | `.backup-modal-section-heading` rule: `font-size: 1.125rem` confirmed. The Import-only override `.backup-modal-section--import .backup-modal-section-heading` is deleted (grep count = 0). No `1.4rem` appears on any backup heading selector. |
| 6 | Red still appears ONLY at the moment of action: clicking Import still raises the red App.confirmDialog before any data is replaced | VERIFIED | `assets/backup-modal.js` lines 303/309/310: `messageKey: 'backup.confirmReplace'` present; `if (!confirmed) return;` gates `BM.importBackup(file)`. Zero diff across all Phase 27 commits (git diff HEAD~3 HEAD -- assets/backup-modal.js = 0 lines). |
| 7 | The drop zone keeps its dashed file-picker affordance; button language stays one primary + one secondary + drop zone + text-link | VERIFIED | `.backup-test-password-filebtn` second rule confirmed: `border: 2px dashed var(--color-border)`. `25-13-css-audit.test.js` D6 dashed-border assertion PASS. No new pill/dashed variants introduced. |

**Score:** 7/7 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `assets/app.css` | Visual-cohesion CSS deltas — card removal, heading unification, amber recolour, shared inline-message box metrics | VERIFIED | All four deltas present and confirmed via targeted awk extraction. No danger tokens on import-warning selector. |
| `assets/tokens.css` | Dark-mode `--color-warning-bg`/`--color-warning-text` overrides inside `[data-theme="dark"]` block | VERIFIED | Both overrides confirmed present at lines 190-191. Success overrides at 181-183 unchanged. No danger overrides added. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `.backup-modal-import-warning` | `--color-warning-bg / --color-warning-text` | recolour from danger to warning tokens | VERIFIED | `background: var(--color-warning-bg, ...)`, `color: var(--color-warning-text, ...)`, `border-inline-start: 4px solid var(--color-warning-text, ...)` — all three changed, zero danger tokens remaining |
| `.backup-modal-section-heading` | `1.125rem` | single heading size for all modal sections | VERIFIED | `font-size: 1.125rem` confirmed; old `1.4rem` absent from the rule; import-only override rule deleted |
| `.backup-modal-section--contents` / `.backup-test-password-card` | modal surface (no tint) | removal of background / border-radius / card padding | VERIFIED | `backup-modal-section--contents` rule entirely absent from app.css; `backup-test-password-card` contains only `display:flex; flex-direction:column; gap:var(--space-md,16px)` |
| `[data-theme="dark"]` | `--color-warning-bg` / `--color-warning-text` dark overrides | add dark amber values next to the existing dark `--color-success-*` overrides | VERIFIED | Lines 190-191 of tokens.css inside the dark block; `#3a2f00`/`#ffd966` confirmed |

### Data-Flow Trace (Level 4)

Not applicable — this is a pure CSS/token visual-only phase. No dynamic data rendered by the changed selectors; all are static CSS treatments on existing markup. Behaviour hooks in `backup-modal.js` are unchanged.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full test suite green (66 files) | `for f in tests/*.test.js; do node "$f" 2>/dev/null || echo FAIL; done` | PASS=66 FAIL=0 SUITE-GREEN | PASS |
| CSS audit test (14 assertions) | `node tests/25-13-css-audit.test.js` | 14 passed, 0 failed | PASS |
| Modal structure test | `node tests/25-02-modal-structure.test.js` | 8 passed, 0 failed | PASS |
| Red confirm still gates import | `grep "messageKey: 'backup.confirmReplace'" && grep "if (!confirmed) return"` | Both present at lines 303, 309 | PASS |
| backup-modal.js byte-unchanged | `git diff HEAD~3 HEAD -- assets/backup-modal.js \| wc -l` | 0 lines changed | PASS |
| RTL gate (no physical left/right on changed selectors) | `grep -E 'border-left\|padding-left\|...' \| grep backup-modal-import\|backup-test-password` | No results | PASS |
| No-new-hex gate (import warning) | `awk` extract + strip `var()` + grep `#hex` | No bare hex | PASS |
| Dark block: warning overrides present, success untouched, danger not added | awk dark block extraction + 6 grep assertions | All 6 PASS | PASS |

### Probe Execution

No probes declared for this phase (CSS-only, no `scripts/*/tests/probe-*.sh`).

### Requirements Coverage

| Requirement | Source | Description | Status | Evidence |
|-------------|--------|-------------|--------|----------|
| ROADMAP-27-1 | 27-01-PLAN.md | One section rhythm — plain + dividers, no tinted cards | SATISFIED | Both card selectors stripped; rule for `--contents` deleted entirely |
| ROADMAP-27-2 | 27-01-PLAN.md | One button language — single primary + secondary + dashed drop zone + footer text-link | SATISFIED | `.backup-test-password-filebtn` dashed border intact; no new pill/dashed variants introduced; 25-13 D6 PASS |
| ROADMAP-27-3 | 27-01-PLAN.md | One severity palette — Import warning and test-password error share ONE warning palette with identical box metrics | SATISFIED | Both selectors use `--color-warning-*`; padding/radius/border match. (Minor: font-weight and margin differ per WR-02 — acknowledged in code review as comment over-claim, not a goal failure) |
| ROADMAP-27-4 | 27-01-PLAN.md | Quiet-but-clear danger — Import band is amber caution, not red alarm; red only at moment of action | SATISFIED | Import warning: zero `--color-danger-*` tokens. Confirm dialog: `messageKey: 'backup.confirmReplace'` still fires before `importBackup` |
| ROADMAP-27-5 | 27-01-PLAN.md | Preserve every Phase 25 behaviour — visual only, no functional regression | SATISFIED | `backup-modal.js` 0 lines changed across all Phase 27 commits. Full suite 66/66 green. All behaviour hooks (role="alert", data-i18n keys, result class toggling) confirmed present. |
| checker Warning 2 | 27-01-PLAN.md | `[data-theme="dark"]` must define `--color-warning-bg` + `--color-warning-text` overrides | SATISFIED | Both overrides present at tokens.css:190-191; WCAG AA contrast 9.69:1 confirmed |

No requirement IDs defined in REQUIREMENTS.md for Phase 27 (null); verified against ROADMAP items 1-5 directly.

### Anti-Patterns Found

| File | Pattern | Severity | Notes |
|------|---------|----------|-------|
| (none) | No TBD/FIXME/XXX markers in modified files | — | Clean |
| assets/tokens.css (comment) | Comment at lines 184-189 scopes the dark override to "the Backup-modal Import warning and the test-password error result" but the tokens are shared by 5 other consumers (per REVIEW.md WR-01) | INFO | Documentation accuracy only; all 5 additional consumers pass contrast in dark mode (9.6:1+). No code defect — comment accuracy issue only. Flagged by code review. |
| assets/app.css (comment at 3744-3753) | Comment claims "identical box metrics" for the two inline bands but font-weight and margin differ (per REVIEW.md WR-02) | INFO | Comment over-claim; the one-severity-palette goal is met at the colour/padding/radius/border level. No rendering defect. |

No debt markers (TBD/FIXME/XXX) found in either modified file. No new tokens or hexes introduced outside the `var(--token,#fallback)` idiom.

### Human Verification Required

#### 1. Visual Cohesion UAT (Light and Dark Mode)

**Test:** Open the app, navigate to the Backup & Restore modal (or trigger via `?openBackup=1`). Inspect the modal in both light mode and dark mode.

**Expected:**
- No tinted card backgrounds on the "What's in your backup" (Contents) or Test-password sections — both sit on the same plain modal surface as Export and Import sections
- All five section headings (Export backup, Import backup, Test backup password, What's in your backup, How reminders work) appear at the same visual size — noticeably smaller than the "Backup & Restore" title
- The "Replaces all current data" band is amber/golden (not red) — clearly a caution notice, not an alarm
- In dark mode, the amber band (both the Import warning and the Test-password error result) is clearly readable — dark amber background with bright amber text, not the washed-out light-amber-on-dark that existed before
- Clicking "Import backup" / "Choose backup file" and confirming still raises the red destructive confirmation dialog
- The drop zone in the Test-password section still shows a dashed border treatment
- Overall impression: the modal reads as "designed", not "accumulated round-by-round"

**Why human:** Visual cohesion is a design judgement. Code verifies every structural selector is in place, but whether the combined result achieves the "one coherent visual system" goal described in the phase — and whether dark-mode amber feels right in context — requires Ben's eyes.

---

## Gaps Summary

No gaps found. All 7 must-have truths verified against actual code. All ROADMAP items 1-5 satisfied with falsifiable evidence. The only open item is the visual UAT above — the single genuinely human-judgement check for a visual-cohesion phase.

The two code-review warnings (WR-01 comment scope, WR-02 comment over-claim) are documentation accuracy issues, not code defects; they do not affect rendering or the phase goal.

---

_Verified: 2026-06-15_
_Verifier: Claude (gsd-verifier)_
