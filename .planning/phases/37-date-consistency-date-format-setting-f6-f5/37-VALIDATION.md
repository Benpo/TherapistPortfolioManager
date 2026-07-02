---
phase: 37
slug: date-consistency-date-format-setting-f6-f5
status: planned
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-02
planned: 2026-07-02
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

> Tests are AUTHORED in Wave 0 (RED) by Plans 01 (engine) + 02 (surface); the "Turned green by" column names the implementation plan/wave that makes each RED test pass.

| Task ID | Authored (Plan/Wave) | Turned green by (Plan/Wave) | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | Status |
|---------|----------------------|-----------------------------|-------------|------------|-----------------|-----------|-------------------|--------|
| 37-01-T1 | 37-01 / W0 | 37-03 / W1 (+ 37-05/W2 boundary) | DATE-01/02/06 | — | `parseLocal('2026-07-02').getDate()===2`; local month boundary; input default local | unit (vm, TZ-pinned) | `node tests/37-date-format.test.js` | ⬜ pending |
| 37-01-T1 | 37-01 / W0 | 37-03 / W1 | DATE-03 | — | 6 format options × en (+he numeric) exact strings | unit (vm) | `node tests/37-date-format.test.js` | ⬜ pending |
| 37-01-T1 / 37-04-T2 | 37-01 / W0 | 37-03 / W1 (isolate) · 37-04 / W2 (PDF) | DATE-04 | T-37-03-01 / T-37-04-01 | Hebrew numeric LTR isolates present (unit) + digit order in PDF | unit + jsdom-PDF | `node tests/37-date-format.test.js`; `node tests/pdf-digit-order.test.js` | ⬜ pending |
| 37-01-T2 / 37-04-T1 | 37-01 / W0 | 37-04 / W2 | DATE-05/07 | T-37-04-02 | PDF card + footer via `DateFormat`; export-modal raw ISO; baselines regenerated (human sign-off) | jsdom-PDF regression | `node tests/34-date-locale.test.js`; `node tests/pdf-latin-regression.test.js` | ⬜ pending |
| 37-02-T1/T2 | 37-02 / W0 | 37-06 / W2 | PERS-01/02 | — | tab deep-links; picker writes `portfolioDateFormat`; reload re-applies; fires `app:dateformat` | behavior (jsdom) | `node tests/30-settings-tabnav.test.js`; `node tests/37-personalization.test.js` | ⬜ pending |
| 37-02-T2 | 37-02 / W0 | 37-07 / W3 | PERS-03/04 | T-37-07-SEC | add/rename/delete; locked-row delete rejected (2 ways); unknown-type raw fallback; XSS-as-text | behavior (jsdom) | `node tests/37-personalization.test.js` | ⬜ pending |
| 37-02-T2 | 37-02 / W0 | 37-05 / W2 (scalar) · 37-07 / W3 (types) | PERS-05 | — | backup export→import round-trips `portfolioDateFormat` + session-type list | behavior (jsdom) | `node tests/37-personalization.test.js` | ⬜ pending |
| 37-02-T2 | 37-02 / W0 | 37-05 / W2 (add-client) · 37-08 / W4 (add-session) | PERS-06 | T-37-08-01 | native `<input type="date">` persists + edits; age parses `.value` locally | behavior (jsdom) | `node tests/37-personalization.test.js` | ⬜ pending |

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

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (the one exception is the Plan 04 human-verify PDF checkpoint, which is intentionally manual)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (Plans 01 + 02 author every new/rewritten test file before implementation)
- [x] No watch-mode flags
- [x] Feedback latency < 30s (`npm test` ~15–30s)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** planned 2026-07-02 (per-task map populated with plan/wave IDs; wave_0_complete flips true once Plans 01+02 execute and the RED tests exist)
