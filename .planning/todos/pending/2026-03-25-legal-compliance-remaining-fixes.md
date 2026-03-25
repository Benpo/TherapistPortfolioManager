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

---

## Remaining Fixes — CRITICAL (do before more sales)

### C1: AGB/Widerrufsbelehrung reference near CTA buttons
**Problem:** Both fresh auditors flagged that the footer "Terms of Use" link isn't prominent enough. Consumer goes straight to LS checkout without knowing Widerrufsbelehrung exists. Without pre-purchase access, withdrawal period extends to 12 months + 14 days (§356(3) BGB).
**Fix:** Add text near each buy button on landing page: "Mit dem Kauf akzeptieren Sie unsere [Nutzungsbedingungen] inkl. [Widerrufsbelehrung]" (with links to disclaimer page in readonly mode).
**Files:** landing.html, assets/landing.js (all 4 languages)

### C2: Widerrufsadressat — Sapir vs. Lemon Squeezy
**Problem:** The Widerrufsbelehrung addresses Widerruf to Sapir, but LS is the MoR (actual seller). Creates ambiguity.
**Fix:** Add paragraph to Widerrufsbelehrung: "Der Kauf wird über Lemon Squeezy als Wiederverkäufer abgewickelt. Sie können Ihren Widerruf entweder an Lemon Squeezy (help.lemonsqueezy.com) oder an uns richten; wir leiten ihn umgehend weiter."
**Files:** i18n-disclaimer.js (all 4 languages), disclaimer*.html (all 4 static files)

### C3: PAngV Kleinunternehmer price note
**Problem:** €119 shown without tax/VAT indication. Must clarify.
**Fix:** Add near price: "Kein Ausweis von Umsatzsteuer gem. § 19 UStG" or equivalent per language.
**Also:** Verify with LS whether €119 is tax-inclusive or LS adds VAT on top. If LS adds VAT, the landing page price is misleading.
**Files:** landing.html, assets/landing.js

### C4: €159 display needs concrete end date
**Problem:** Showing "€159 after launch" without a specific date violates BGH I ZR 81/09 (transparency requirement). The future price reference is legal ONLY with a concrete end date for the introductory period.
**Fix:** Change to: "Einführungspreis: €119 (gültig bis [DATE]). Ab [DATE]: €159." — Ben needs to decide the exact date (launch was ~2026-03-25, so 60 days = ~2026-05-24).
**Research source:** BGH Urteil vom 17.03.2011, Az. I ZR 81/09 — Einführungspreis with future price is legal IF and ONLY IF the intro period has a clear end date.
**Files:** landing.html, assets/landing.js, assets/landing.css

---

## Remaining Fixes — IMPORTANT (this week)

### I1: Datenschutz — storage durations (Art. 13(2)(a) DSGVO)
Add retention periods:
- Cloudflare: "Speicherdauer richtet sich nach Cloudflare (i.d.R. max. 72h für Security-Logs)"
- Lemon Squeezy: "Speicherdauer richtet sich nach Lemon Squeezy"
- Local data: "Verbleiben auf Ihrem Gerät bis zur manuellen Löschung"
**Files:** datenschutz*.html (all 4 languages)

### I2: Datenschutz — §25 TDDDG reference
Add legal basis for localStorage/IndexedDB: "Die Speicherung ist gemäß § 25 Abs. 2 Nr. 2 TDDDG technisch erforderlich und erfordert keine Einwilligung."
**Files:** datenschutz*.html (all 4 languages)

### I3: System requirements on landing (Art. 246a §1 Abs. 1 Nr. 14 EGBGB)
Add: "Sessions Garden ist eine PWA. Benötigt modernen Browser (Chrome, Safari, Edge, Firefox). Internet nur für Ersteinrichtung und Lizenzaktivierung."
**Files:** landing.html, assets/landing.js

### I4: Post-purchase email with Widerrufsbelehrung (durable medium §312f BGB)
The .txt download is optional and doesn't satisfy the "durable medium" requirement. Need an automated email from Sessions Garden (not LS) containing Widerrufsbelehrung + Muster-Widerrufsformular.
**Implementation:** n8n webhook triggered by LS purchase event → sends email with legal texts.
**Files:** n8n workflow (not in this repo)

---

## Remaining Fixes — NICE-TO-HAVE

- N1: Name Berlin DPA in Datenschutz (Berliner Beauftragte für Datenschutz, Alt-Moabit 59-61)
- N2: Add Art. 18 DSGVO (Einschränkung) to rights list
- N3: Add Rechtswahl clause to terms ("Es gilt deutsches Recht")
- N4: Mention Service Worker caching in Datenschutz
- N5: Add second contact channel in Impressum (contact form or phone)
- N6: AGB Änderungsklausel (how terms changes are communicated)
- N7: Widerrufsbutton requirement coming June 19, 2026 (§356a BGB) — exempt if waiver is valid

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
