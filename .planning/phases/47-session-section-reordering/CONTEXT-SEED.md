# Phase 47 context seed (pre-discussion, 2026-07-22)

## Folded-in bug from 46.1 UAT — export selection: topics vs severity split

Current v1.4 behavior: the export modal folded the old "session topics" selection into
the "severity before/after" checkbox — users can no longer include topics WITHOUT the
severity change.

**Decided design (Ben, 2026-07-22, via gsd-progress routing dialog):**
- "Session topics" returns as the main checkbox, named IDENTICALLY to the in-session
  section title in every language (the current HE export label does not match the HE
  section name — fix as part of this).
- "Include severity before/after" becomes a DEPENDENT sub-option, enabled only when
  Session topics is checked. Selecting severity alone is impossible by construction.

Rationale: severity change is an attribute of the topics, not a sibling section.
Scope note: lands inside Phase 47 because 47 rewrites both export builders
(atomic 260615 guard rewrite) — export surface touched by one hand at a time.
