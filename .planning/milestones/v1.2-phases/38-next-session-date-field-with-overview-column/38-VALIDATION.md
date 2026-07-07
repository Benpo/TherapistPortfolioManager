---
phase: 38
slug: next-session-date-field-with-overview-column
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-07
---

# Phase 38 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Seeded from `38-RESEARCH.md` §Validation Architecture. Per-task map populated at plan time.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Bespoke zero-dep runner — `tests/run-all.js` spawns each `tests/*.test.js` in its own `node` child (exit-0/1 contract) + jsdom |
| **Config file** | none — convention: top-level `tests/*.test.js`; helpers in `tests/_helpers/` excluded |
| **Quick run command** | `node tests/38-next-session.test.js` (or the single affected test file) |
| **Full suite command** | `node tests/run-all.js` (`npm test`) |
| **Estimated runtime** | ~15–30 seconds (full suite) |

---

## Sampling Rate

- **After every task commit:** Run the single affected test file (e.g. `node tests/38-next-overdue.test.js`)
- **After every plan wave:** Run `node tests/run-all.js`
- **Before `/gsd-verify-work`:** Full suite green **and** PDF `.sha256` baselines verified UNCHANGED — fixtures are static pre-baked markdown; if any `pdf-*` hash changed, STOP and investigate (per `38-RESEARCH.md` Finding 3 / `reference-pdf-jsdom-inert-gates`)
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| *(populated at plan time from the Phase Requirements → Test Map below)* | | | | | | | | | |

### Phase Requirements → Test Map (from research)

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| NEXT-01 | field saved/populated/reset on session record | unit (jsdom real page) | `node tests/38-next-session.test.js` | ❌ Wave 0 (new) |
| NEXT-02 | dynamic `min` = session date; unset when empty; updates on change | unit | `node tests/38-next-session.test.js` | ❌ Wave 0 |
| NEXT-03 | "Next Session" column renders most-recent value, `-` when empty, both index+demo | unit | extend `tests/37-overview-sort.test.js` or new `38-next-session-column.test.js` | ⚠️ extend |
| NEXT-04 | ascending default; blanks-to-bottom BOTH directions; header↔select sync | unit | extend `tests/37-overview-sort.test.js` (update `:164` sort-key assertion) | ⚠️ extend |
| NEXT-05 | overdue cue when `< today` local; today NOT overdue (boundary) | unit, **TZ-pinned** | `node tests/38-next-overdue.test.js` | ❌ Wave 0 |
| NEXT-06 | date rendered in markdown export; date-only session still renders; gated by section toggle | unit | extend `tests/30-export-markdown.test.js` + `30-section-visibility.test.js` | ⚠️ extend |
| NEXT-07 | demo column populated; backup round-trips field | unit | extend `tests/35-demo-seed.test.js`; backup roundtrip via `snippet-prefix-backup-roundtrip.test.js` pattern | ⚠️ extend |
| NEXT-08 | TZ-pinned overdue boundary; blanks-to-bottom; dynamic min; deliberate golden handling | unit + guard | as above; PDF baselines expected UNCHANGED | ⚠️ mixed |

---

## Wave 0 Requirements

- [ ] `tests/38-next-session.test.js` — field save/populate/reset + dynamic `min` (NEXT-01/02); real add-session jsdom page (mirror `30-form-dirty-revert.test.js` harness)
- [ ] `tests/38-next-overdue.test.js` — TZ-pinned overdue `< today` boundary incl. today-not-overdue (NEXT-05/08); mirror `37-date-format.test.js` TZ inert-guard
- [ ] Extend `tests/37-overview-sort.test.js` — add `nextSession` to `allSortKeys` assertion (`:164`), blanks-to-bottom under both directions, header↔select sync (NEXT-03/04)
- [ ] Extend `tests/30-export-markdown.test.js` + `30-section-visibility.test.js` — date line + date-only-session render + toggle gating (NEXT-06)
- [ ] Extend `tests/35-demo-seed.test.js` — assert seeded `nextSessionDate` values present/near-future (NEXT-07)
- [ ] Add `nextSessionDate` capture assertion to `tests/30-form-dirty-revert.test.js` — guards the `snapshotFormState` revert gap (research Pitfall 2)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Overdue marker + dimmed cell visual in RTL (HE) and dark theme | NEXT-05 | Visual treatment; jsdom can't verify rendered appearance | Headless-Chrome screenshot harness (per `reference-headless-chrome-ui-verification`); spot-check `[dir=rtl]` cell with marker via `margin-inline-end`; Playwright WebKit probe if marker uses SVG (it uses a text glyph — low risk) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
