---
phase: 43
slug: docs-maintenance-hard-gate
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-07-10
---

# Phase 43 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| commit messages → gate verdict | trailers (`Help-Unaffected`, `Changelog-Unaffected`, `Docs-Emergency-Skip`) steer enforcement | author-controlled text parsed via git's trailer block |
| pushed range → CI verdict | `ci-resolve-docs-range.sh` derives the range the gate evaluates | git refs / deploy-branch anchor |
| local hook → developer | `.githooks/pre-push` preview (bypassable by design) | none (advisory) |
| gate install repo → target repo | gate must read the pushed repo's corpus, not its own install dir | file paths |

---

## Threat Register

Register consolidated from the `<threat_model>` blocks of all 10 phase plans (authored at plan time; 43-08..10 are the gap-closure round). All mitigations verified by executed tests during the 2026-07-10 close-out (suite 168/168; gate suites 20/20, 30/30, 7/7, 4/4).

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-43-12 | Denial of function | gate throws → fails OPEN | high | mitigate | D-04 default-deny: any throw/parse error → exit 1 banner; absent/broken-gate-blocks case green; parseArgs now also fails closed on empty/three-dot `--range` (`5efa7b4`). Post-review amendment (`0fd7fce`, Ben-approved): a tip `Docs-Emergency-Skip` bypasses invariants too — deliberate, loud, tip-only, matching the CLAUDE.md contract; the default path is unchanged fail-closed | closed |
| T-43-08-01 | Tampering/DoS | ls-remote range resolution (CI) | high | mitigate | Exact-rc three-way branch in `ci-resolve-docs-range.sh`; any rc ∉ {0,2} exits 1 — network/auth fault cannot collapse the range to tip-only; rc=128 falsifier green (4/4) | closed |
| T-43-09-01 | Spoofing | satisfier detection | high | mitigate | Satisfaction anchored to role-table `^assets/` predicates, further narrowed to the EN corpus files post-review (`dcb0763`); decoy-path falsifiers green | closed |
| T-43-09-02 | Elevation of Privilege | trailer-key casing | high | mitigate | Exact-case post-filter; lowercase `docs-emergency-skip` is BLOCKED (CASE falsifier green), matching CLAUDE.md's case-sensitive contract | closed |
| T-43-10-01 | Tampering/DoS | release-moment self-disable via version.js drift | high | mitigate | Fifth invariant `checkVersionParse()` throws on live-file drift (7/7 green + manual drift-then-revert proof) | closed |
| T-43-03 | Tampering | rename replace-all clobbers/misses references | medium | mitigate | Full-token anchored replace with before/after grep post-condition (43-02 executed, suite stayed green) | closed |
| T-43-09 | Tampering | role-table internal contradiction | medium | mitigate | `checkRoleTable()` self-consistency invariant + role-table spec 30/30 green | closed |
| T-43-13 | Spoofing | trailer-looking text in commit body / code fence | medium | mitigate | Trailers read via `%(trailers:…,valueonly,only)` (+`unfold`), never `--grep`; fenced decoy case green | closed |
| T-43-14 | Tampering | gate reads install dir instead of target repo | medium | mitigate | Repo root via `git rev-parse --show-toplevel`; proven against a throwaway repo in the gate spec; Phase-1 fixture-root seam added post-review is fail-closed on unreadable override (`0fd7fce`) | closed |
| T-43-17 | Denial of function | cancel-in-progress drops a push range | medium | mitigate | OD-2 anchored range is self-healing — the next successful run re-covers skipped commits | closed |
| T-43-18 | Tampering | anchor unresolvable → wrong CI range | medium | mitigate | Fail closed when the deploy branch exists but the anchor won't resolve; tip-only fallback ONLY for the benign no-deploy-branch bootstrap (rc=2) | closed |
| T-43-08-02 | Elevation of Privilege | emergency-skip dead-end at anchor failure | medium | mitigate | Fail closed + non-destructive recovery runbook (stderr + CLAUDE.md) — never a silent pass | closed |
| T-43-08-03 | Spoofing | forged/mangled "Deploy from <sha>" subject | medium | mitigate | Token must be 7–40 hex AND `rev-parse --verify` must resolve; otherwise fail closed with runbook | closed |
| T-43-10-02 | Repudiation | forked version-extractor copies drifting | medium | mitigate | One shared `scripts/lib/version-parse.js` consumed by gate and invariant (D-17) | closed |
| T-43-15 | Elevation of Privilege | `--no-verify` bypasses the local hook | medium | accept | By design (D-14): the local hook is a preview; CI is the enforcement layer, honors only trailers, and is unbypassable; documented in CLAUDE.md | closed |
| T-43-01 | Tampering | trailer decoy in fenced block satisfies gate | low | mitigate | Same `%(trailers)` scoping; decoy case green | closed |
| T-43-02 | Denial of function | test harness leaks dirs / reads host gitconfig | low | mitigate | `GIT_CONFIG_GLOBAL`/`GIT_CONFIG_SYSTEM=/dev/null` on every git call; `finally` cleanup | closed |
| T-43-04 | Repudiation | renamed file's self-reference stale | low | mitigate | Self-tokens updated; renamed tests re-run green | closed |
| T-43-05 | Tampering | covers[] names a nonexistent file | low | mitigate | Invariant #2 asserts every covered path exists on disk (green against live repo) | closed |
| T-43-06 | Denial of function | HELP-MAP.md freshness drift | low | mitigate | Canonicalized generation + freshness invariant #1 (green) | closed |
| T-43-07 | Denial of function | covers[] strip breaks a runtime read | low | mitigate | help.js verified to have zero covers reads; locale integrity tests green | closed |
| T-43-08 | Tampering | over-broad locale edit removes prose/ids | low | mitigate | Per-locale load assertions; parity tests green | closed |
| T-43-10 | Repudiation | invariant logic forks between module and tests | low | mitigate | Single implementation in `invariants.js`; tests call it (D-17) | closed |
| T-43-11 | Information disclosure | OD-1 gap — image/font change ships without docs demand | low | accept | Stated plainly in role-table.js header; extended post-review to also name `_headers`/`_redirects`/`LICENSE` (`dcb0763`/`4f3dfff`) | closed |
| T-43-16 | Repudiation | emergency skip normalizes into routine use | low | mitigate | Loud CI banner naming commit+reason; cheap `*-Unaffected` trailers keep emergencies exceptional; DoD documents intended use | closed |
| T-43-19 | Denial of function | npm `prepare` fails install in non-repo context | low | mitigate | Fail-soft `|| true`; private package, never installed as a dependency | closed |
| T-43-SC | Tampering (supply chain) | package installs | low | accept | Zero packages introduced anywhere in the phase; node built-ins + in-repo siblings only | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-43-01 | T-43-15 | `--no-verify` bypassing the local hook is by design — the local hook is a fast preview; CI is the unbypassable enforcement layer and honors only auditable trailers | Ben (D-14, discuss-phase) | 2026-07-10 |
| AR-43-02 | T-43-11 | Images/fonts/`.txt`/`.json` (and `_headers`/`_redirects`/`LICENSE`) ship without a docs demand — path-based heuristic's documented limitation, stated in the role-table header | Ben (OD-1 ack) | 2026-07-10 |
| AR-43-03 | T-43-SC | No packages introduced anywhere in the phase | Plan-time register (Ben-approved plans) | 2026-07-10 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-10 | 27 | 27 | 0 | gsd-secure-phase (orchestrator verification; ASVS L1 short-circuit — register authored at plan time; every high/medium mitigation verified by executed falsifier tests during the same-day gap-closure + re-review cycle, incl. post-review contract amendments `0fd7fce`/`0e2f52f`/`dcb0763`/`5efa7b4`) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-10
