---
created: 2026-03-25T02:30:00.000Z
title: Legal compliance — remaining critical and important fixes
area: general
files:
  - landing.html
  - assets/landing.js
  - assets/landing.css
  - datenschutz.html
  - datenschutz-en.html
  - datenschutz-he.html
  - datenschutz-cs.html
  - assets/i18n-disclaimer.js
  - disclaimer.html
  - disclaimer-en.html
  - disclaimer-he.html
  - disclaimer-cs.html
  - impressum.html
---

## Context — What Was Already Done (2026-03-25 session)

5 parallel Opus research agents ran a comprehensive German e-commerce law audit. All research saved to:
`.planning/research/2026-03-25_legal-compliance-deep-research.md`

### Completed fixes (committed):
1. Widerrufsbelehrung replaced with statutory Muster-Widerrufsbelehrung (Anlage 1, Art. 246a EGBGB) — all 4 languages
2. Muster-Widerrufsformular added (Anlage 2, Art. 246a EGBGB) — all 4 languages
3. §356(5) BGB Widerruf waiver checkbox wording updated — all 4 languages
4. "As is" warranty clause replaced with §327ff BGB-compliant graduated liability — all 4 languages
5. Reverse engineering clause updated to preserve §69d/69e UrhG rights — all 4 languages
6. License clause harmonized: "all future updates" matches landing page promise — all 4 languages
7. Refund FAQ removed from landing.html AND landing.js (all languages) — contradicted Widerruf waiver
8. Strikethrough on €159 removed (CSS line-through removed)
9. Misleading "Impressum reference" removed from Datenschutzerklärung (all languages)
10. Storage durations added to Datenschutz sections 4/5/6 (Art. 13(2)(a) DSGVO) — all 4 languages (2026-03-28)
11. §25 TDDDG reference added to Datenschutz section 6 — all 4 languages (2026-03-28)
12. System requirements FAQ added to landing page (Art. 246a §1 Abs. 1 Nr. 14 EGBGB) — all 4 languages (2026-03-28)

---

## Remaining Fixes — CRITICAL (do before more sales)

### C1: AGB/Widerrufsbelehrung reference near CTA buttons — IN PROGRESS
**Status:** Being handled in session prompt `2026-03-27_landing-cta-legal-consolidation.md`
**Fix:** All CTAs scroll to pricing section; legal text + Widerruf links below the one real checkout button.
**Files:** landing.html, assets/landing.js (all 4 languages)

### C3: PAngV price note — IN PROGRESS
**Status:** Being handled in same session prompt as C1.
**Fix:** Add VAT note near price. LS adds VAT dynamically based on buyer country/VAT ID, so text should say "Price excl. VAT where applicable. Final price shown at checkout."
**Files:** landing.html, assets/landing.js

---

## Remaining Fixes — IMPORTANT

### I4: Post-purchase email with Widerrufsbelehrung (durable medium §312f BGB)
**Status:** Not started — requires n8n workflow, separate from this repo.
**Implementation:** n8n webhook triggered by LS purchase event → sends email with legal texts.

---

## Remaining Fixes — NICE-TO-HAVE (no session prompts, do when convenient)

- N1: Name Berlin DPA in Datenschutz (Berliner Beauftragte für Datenschutz, Alt-Moabit 59-61)
- N2: Add Art. 18 DSGVO (Einschränkung) to rights list
- N3: Add Rechtswahl clause to terms ("Es gilt deutsches Recht")
- N4: Mention Service Worker caching in Datenschutz (note: partially covered by I2's TDDDG text)
- N5: Add second contact channel in Impressum (contact form or phone)
- N6: AGB Änderungsklausel (how terms changes are communicated)
- N7: Widerrufsbutton requirement coming June 19, 2026 (§356a BGB) — exempt if waiver is valid
- N8: Widerrufsadressat — add LS as alternative Widerruf recipient (downgraded from critical 2026-03-28)
- N9: €159 end date — add concrete date to intro pricing (downgraded from critical 2026-03-28, risk is low without strikethrough)

---

## Consent/Signature Research Summary (from original todo)

The original todo asked about consent storage, legal validity, GDPR. Key findings:
- **Checkbox + timestamp is legally sufficient** for terms acceptance (BGB §126b Textform)
- **No drawn signature needed** — zero legal benefit for terms acceptance
- **Recommended approach:** Store terms_accepted_at, terms_version, terms_language in LS customer metadata during activation
- **PDF vs .txt:** .txt is legally adequate. PDF is nice-to-have, not required.
- **Retention:** Keep consent records 10 years (covers all German limitation periods)
- **IP addresses:** Do NOT store (personal data, unnecessary at this scale)
- **LS metadata approach is DSGVO-friendly** — LS already has customer data

---

## Agent Prompts for Future Sessions

To re-run the legal audit, spawn these agents:

### Agent 1: "Dr. Müller" — Definitive Legal Counsel
```
You are Dr. Sarah Müller, a Berlin-based Rechtsanwältin specializing in IT-Recht, Datenschutzrecht, and E-Commerce-Recht. You are Sapir's lawyer. Give definitive, actionable advice — never say "consult a lawyer."

Client: Sapir Ben-Porath, Einzelunternehmerin, Kleinunternehmerin §19 UStG, Berlin.
Product: Sessions Garden — local-first PWA, €119 one-time license, Cloudflare Pages hosting, Lemon Squeezy MoR.

Read the CURRENT versions of: impressum.html, datenschutz.html, disclaimer.html, landing.html, assets/i18n-disclaimer.js (DE section).

Check against: §5 DDG, Art. 13/14 DSGVO, §25 TDDDG, §§305-310 BGB, §§327-327u BGB, §309 Nr. 7 BGB, §69d/69e UrhG, §356(5) BGB, Muster-Widerrufsbelehrung (Anlage 1+2, Art. 246a EGBGB), PAngV.

Rate each finding: KRITISCH / WICHTIG / EMPFEHLUNG / OK.
RESEARCH ONLY — do not modify files.
```

### Agent 2: Practical E-Commerce Compliance Check
```
You are a German e-commerce compliance specialist. Find PROBLEMS — Abmahnung triggers, contradictions, consumer protection violations.

Read FRESH: landing.html, disclaimer.html, i18n-disclaimer.js (DE), datenschutz.html, impressum.html.

Check: (1) contradictions between landing and terms, (2) Widerrufsbelehrung completeness, (3) AGB validity §§305-310, (4) PAngV price display, (5) pre-contractual info Art. 246a EGBGB, (6) Widerrufsbelehrung timing before checkout, (7) Datenschutz Art. 13 DSGVO gaps.

Rate: CRITICAL / IMPORTANT / NICE-TO-HAVE / OK.
RESEARCH ONLY — do not modify files.
```

### Agent 3: Price Display Research
```
Research SPECIFIC question: How can a German Kleinunternehmer legally display "€119 now, €159 later" on a landing page? Product is new, €159 was never charged. Check §11 PAngV, BGH I ZR 81/09, IT-Recht Kanzlei guidance on Einführungspreis. What visual presentation is safe vs. illegal?
```
