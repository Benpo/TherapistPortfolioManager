---
phase: 37
slug: date-consistency-date-format-setting-f6-f5
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-02
---

# Phase 37 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Seeded from `37-RESEARCH.md` §Validation Architecture (date engine) + `37-RESEARCH-personalization.md` §9 (surface). Per-task map populated at plan time.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Bespoke zero-dep runner — `tests/run-all.js` spawns each `tests/*.test.js` in its own `node` child; each file self-reports PASS/FAIL and exits 0/1 |
| **Config file** | none — convention: top-level `tests/*.test.js`; helpers in `tests/_helpers/` excluded |
| **Quick run command** | `node tests/37-date-format.test.js` (date-engine lane) |
| **Full suite command** | `npm test` (→ `node tests/run-all.js`) |
| **Estimated runtime** | ~15–30 seconds (full suite) |

---

## Sampling Rate

- **After every task commit:** Run `node tests/37-date-format.test.js` + any touched PDF/settings test
- **After every plan wave:** Run `npm test` (full suite green)
- **Before `/gsd-verify-work`:** Full suite green **and** the regenerated PDF `.sha256` baselines visually verified (never blind `--regenerate`)
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

> Populated at plan time once PLAN.md wave/task IDs exist. Requirement → behavior seeds below.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | 0 | DATE-01/02/06 | — | `parseLocal('2026-07-02').getDate()===2`; local month boundary; input default local | unit (vm, TZ-pinned) | `node tests/37-date-format.test.js` | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | DATE-03 | — | 6 format options × en (+he numeric) exact strings | unit (vm) | `node tests/37-date-format.test.js` | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | DATE-04 | — | Hebrew numeric LTR isolates present + digit order in PDF | unit + jsdom-PDF | `node tests/pdf-digit-order.test.js` | ⚠ extend | ⬜ pending |
| TBD | TBD | 0 | DATE-05/07 | — | PDF card + footer via `DateFormat`; export-modal raw ISO; baselines regenerated | jsdom-PDF regression | `node tests/34-date-locale.test.js` | ⚠ rewrite | ⬜ pending |
| TBD | TBD | 0 | PERS-02 | — | picker writes `portfolioDateFormat`; reload re-applies | behavior (jsdom) | TBD `tests/37-personalization.test.js` | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | PERS-03/04 | — | add/rename/delete; locked-row delete rejected; unknown-type raw fallback | behavior (jsdom) | TBD | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | PERS-05 | — | backup export→import round-trips `portfolioDateFormat` + session-type list | behavior (jsdom) | TBD | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/37-date-format.test.js` — TZ-pinned (`process.env.TZ='America/New_York'`) spine + 6 formats + month boundary + age; executes the real `date-format.js` via `vm` (covers DATE-01/02/03/06). **Author before implementation.**
- [ ] Rewrite `tests/34-date-locale.test.js` — load `date-format.js` into the vm sandbox; assert fixed en-US behavior + raw-ISO export chain (DATE-07)
- [ ] Extend `tests/_helpers/jsdom-pdf-env.js` — inject `window.DateFormat` (eval `date-format.js` before `pdf-export.js`) + TZ pin (D-21)
- [ ] Extend a Hebrew-numeric PDF assertion (reuse `pdf-digit-order` GID technique) for DATE-04
- [ ] `tests/37-personalization.test.js` (or split) — tab deep-link, picker persistence, F4 editor two-tier behavior, backup round-trip, birthdate input (PERS-02/03/04/05/06/08), following `tests/30-settings-tabnav.test.js` / `tests/30-settings-section-roundtrip.test.js`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| PDF SHA-256 baseline regeneration | DATE-05/07 | jsdom PDF tests can hang→exit-0 silently (false-GREEN); baseline bytes must be eyeballed, never blind-regenerated | Regenerate changed `.planning/fixtures/**/*.pdf.sha256`, open the rendered PDFs, confirm the date shift (en-GB→en-US) is the ONLY intended change; confirm de/cs/he fixtures visually before accepting |
| Hebrew RTL date rendering (real browser) | DATE-04 | Bidi isolate behavior in the live Heebo/PDF stack can differ from jsdom | Open the app in Hebrew, verify numeric dates read L→R in session list, title, and exported PDF |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
