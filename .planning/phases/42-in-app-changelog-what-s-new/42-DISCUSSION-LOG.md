# Phase 42: In-App Changelog & What's-New - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-09
**Phase:** 42-in-app-changelog-what-s-new
**Areas discussed:** Backfill depth, Popup weight & content, Register & emojis, Page placement & entry points, v1.3 entry timing, Demo-mode behavior, i18n fallback & data shape, Dismiss behavior (ad-hoc)

---

## Backfill depth

| Option | Description | Selected |
|--------|-------------|----------|
| Sold era: v1.1 → v1.3 (Recommended) | Backfill everything customers could have experienced; v1.0 stays out (never public) | |
| v1.2 era + v1.3 only | Just the recent wave + v1.3 | |
| v1.3 only | Pure CHLG-04 minimum, one entry at launch | |

**User's choice:** Free text — "detail 1.1-1.3, plus with 1.0 mentioned as initial Launch in one line without content."
**Notes:** Ben asked how content gets sourced from "hundreds of commits" — answered: curated artifacts (PROJECT.md ledger, v1.2.4 users draft, milestone archives), git only for dates. Ben flagged that the v1.2.4 draft was never approved/reviewed by him → explicit copy-approval checkpoint added (D-04).

| Option | Description | Selected |
|--------|-------------|----------|
| One consolidated v1.2 entry (Recommended) | Single benefit-led v1.2 story, final release date | ✓ |
| Per-patch entries | Faithful v1.2.1..v1.2.4 history | |
| Hybrid: v1.2 story + notable patches | Main entry + patches users truly felt | |

**User's choice:** One consolidated v1.2 entry

---

## Popup weight & content

| Option | Description | Selected |
|--------|-------------|----------|
| Teaser + link (Recommended) | Headline + top 2–4 highlights + "See everything new" into the page | ✓ |
| Full latest entry | Complete entry scrollable in the popup | |
| One-liner toast | Minimal dismissible card | |

**User's choice:** Teaser + link

| Option | Description | Selected |
|--------|-------------|----------|
| Modest centered modal (Recommended) | Standard app modal idiom + garden touch | ✓ |
| Full-screen branded overlay | Welcome-level ceremony every release | |
| Inline card on the page | Security-note-style quiet card | |

**User's choice:** Modest centered modal

| Option | Description | Selected |
|--------|-------------|----------|
| Silent skip (Recommended) | No entry for new version → no popup; last-seen updates quietly | ✓ |
| Generic "improvements" popup | Always announce, even contentless | |

**User's choice:** Silent skip

| Option | Description | Selected |
|--------|-------------|----------|
| Hand-picked per release (Recommended) | Explicit highlights field per entry | ✓ |
| Auto-derived | First N bullets | |
| You decide | Claude picks during planning | |

**User's choice:** Hand-picked per release

---

## Register & emojis

| Option | Description | Selected |
|--------|-------------|----------|
| No emojis in-app (Recommended) | Calm app register; emoji register stays for WhatsApp/marketing | ✓ |
| Emoji section markers | Carry the WhatsApp register into the app | |
| Popup-only accent | One celebratory emoji in the popup headline | |

**User's choice:** No emojis in-app

| Option | Description | Selected |
|--------|-------------|----------|
| A · Thematic + chips | Story sections with New/Improved/Fixed chip per bullet | |
| B · Grouped by category | Per-version lede, then New/Improved/Fixed blocks | ✓ |
| C · Thematic, no chips | Story sections, categories data-only | |
| Needs changes first | Iterate the mockup | |

**User's choice:** B · Grouped by category
**Notes:** Ben first answered "mockup for me so I can decide" → sketch 005 (`.planning/sketches/005-changelog-register/`) was built live with all three variants on the same data + a popup preview + dark toggle; Ben picked B from the browser.

---

## Page placement & entry points

| Option | Description | Selected |
|--------|-------------|----------|
| Own page in the help family (Recommended) | Standalone page; help.html stays lean | ✓ |
| Section inside help.html | Card + rail entry, searchable with help search | |
| You decide | Claude weighs during planning | |

**User's choice:** Own page in the help family

| Option | Description | Selected |
|--------|-------------|----------|
| Open the changelog page (Recommended) | "?" row is a destination link | ✓ |
| Re-show the popup | Replay the latest teaser | |

**User's choice:** Open the changelog page

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, footer version links (Recommended) | Quiet discoverable affordance | |
| No, keep the footer inert | "?" + help center are enough | |
| You decide | Claude decides and documents | ✓ |

**User's choice:** You decide (Claude discretion)

---

## v1.3 entry timing

| Option | Description | Selected |
|--------|-------------|----------|
| Full draft now, verify at ship (Recommended) | Draft from locked scope; GATE-04 re-validates at ship | |
| Only shipped-so-far, append later | Cover P39–41 now, append during 42.1/43 | |
| Placeholder now, real entry at ship | Stub until milestone close | |

**User's choice:** Free text — "i will ship 1.3 (push) only after 43 is done so its fine to scope based on the roadmap we have." (= full draft now from roadmap scope)

---

## Demo-mode behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Hide in demo (Recommended) | Consistent with the demo seam (tour entry, lockdown, footer) | ✓ |
| Show the page in demo | "Actively developed" trust signal for prospects | |

**User's choice:** Hide in demo

---

## i18n fallback & data shape

| Option | Description | Selected |
|--------|-------------|----------|
| EN fallback per entry (Recommended) | Untranslated entries render EN; history complete everywhere | ✓ |
| Hide untranslated entries | Locale-pure page, divergent histories | |

**User's choice:** EN fallback per entry

| Option | Description | Selected |
|--------|-------------|----------|
| Per-locale files, EN canonical (Recommended) | Mirror help-content precedent + 42.1 integrity tests | ✓ |
| One file, nested locales | {en,he,de,cs} fields per entry | |
| You decide | Claude picks with 42.1 in mind | |

**User's choice:** Per-locale files, EN canonical

---

## Dismiss behavior (ad-hoc, raised by Ben at the final gate)

| Option | Description | Selected |
|--------|-------------|----------|
| Follow welcome: no outside-click (Recommended) | Deliberate dismiss only (Close/CTA/Esc); one-shot surfaces protected | ✓ |
| Outside click closes but doesn't count | Reappears next session | |
| Keep backdrop-close everywhere | Single rule, accidental clicks eat the announcement | |

**User's choice:** Follow welcome: no outside-click
**Notes:** Ben hit an accidental backdrop-close in the sketch ("clicking outside the popup closes it too quickly... a bit annoying"). Codebase check showed the app already has two idioms: everyday modals backdrop-close, the welcome overlay (one-shot) doesn't. Sketch updated to match.

---

## Claude's Discretion

- Footer version → changelog-page link (explicit "You decide"; lean yes, guard integrity-nudge independence + demo footer).
- Dismiss/a11y micro-details (focus trap/restore, aria-modal, SR announcement) — offered as a gray area, not selected.
- Data module name + exact entry schema fields; "?" row position; help-center link placement; multi-version jump handling (latest entry per CHLG-03); "See everything new" deep-link anchor.

## Deferred Ideas

- Emoji-flavored release announcements remain a WhatsApp/marketing (outside-the-app) practice.
- Release history as a landing-page/demo marketing signal — own effort if ever wanted (demo hides the changelog per D-15).
