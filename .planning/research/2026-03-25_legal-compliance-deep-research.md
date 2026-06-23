# Legal Compliance Deep Research — Sessions Garden
## Date: 2026-03-25
## Source: 5 parallel Opus research agents

---

## CRITICAL FINDINGS SUMMARY

### 1. Widerrufsbelehrung Timing Problem (HIGHEST PRIORITY)
The Widerrufsbelehrung is currently shown AFTER purchase (on the activation/disclaimer page). German law (Art. 246a §1 EGBGB) requires it BEFORE the consumer's contract declaration (before clicking "Buy" on LS).

**Consequence:** Without pre-purchase Widerrufsbelehrung, the withdrawal period extends to **12 months + 14 days** (§356 Abs. 3 BGB).

**Fix:** Add Widerrufsbelehrung + Muster-Widerrufsformular accessible from the landing page (link or section), visible before the LS checkout button.

### 2. LS Does NOT Handle German Widerruf Compliance
- LS's buyer terms are under **English law** (for non-US buyers)
- LS does NOT have a §356(5) BGB-compliant withdrawal waiver in their checkout
- There's an open feature request for it: https://lemonsqueezy.nolt.io/220
- Sapir bears responsibility for pre-contractual information duties

### 3. Durable Medium Requirement (§312f BGB)
- A web page is NOT a durable medium (per EuGH case law)
- A link in an email to a webpage is NOT sufficient
- The optional .txt download doesn't count because it's optional
- **Required:** Post-purchase email FROM Sessions Garden (not LS) with Widerrufsbelehrung + Muster-Widerrufsformular in the email body or as PDF attachment

### 4. FAQ vs. Widerruf Waiver CONTRADICTION
Landing page FAQ: "contact us within 14 days of purchase and you'll receive a full refund"
Terms: Widerruf waiver checkbox that extinguishes the 14-day right
Under §305c(2) BGB, the consumer-friendly version wins → Widerruf waiver is effectively nullified.

### 5. "All future updates" vs. "Lifetime of version" CONTRADICTION
Landing page pricing: "All future updates included"
Terms §6: "Lebensdauer der erworbenen Produktversion"
Same §305c(2) BGB problem → all updates forever is the binding interpretation.

### 6. "As Is" Warranty Clause is VOID in B2C
§§327-327u BGB (Digital Content Directive) create mandatory warranty rights since 01.01.2022. "As is" is flatly invalid. Clause treated as non-existent, but is an Abmahnung target.

### 7. Reverse Engineering Ban Partially Invalid
§69e UrhG gives users mandatory decompilation rights for interoperability. Cannot be contracted away (§69g(2) UrhG).

### 8. PAngV: Price Display Issues
- Strikethrough price €159→€119 must comply with §11 PAngV (Omnibus Directive)
- Missing Kleinunternehmer price note. Recommended: "Endpreis. Kein Ausweis von Umsatzsteuer gemäß § 19 UStG."
- Must verify if LS adds VAT on top of the displayed price

### 9. Datenschutzerklärung Gaps
- Storage duration missing (Art. 13(2)(a) DSGVO)
- §25 TDDDG reference for localStorage/IndexedDB missing
- Service Worker/Cache Storage not mentioned
- Specific Aufsichtsbehörde not named
- Rechtsgrundlage for Lizenzaktivierung missing in §3

### 10. Upcoming: Widerrufsbutton (June 19, 2026)
New requirement for all online sellers. Exempt if Widerruf waiver is legally valid. Fines up to €50,000.

---

## CONSOLIDATED ACTION PLAN

### Phase 1: IMMEDIATE (before any more sales)

| # | Action | Files | Risk |
|---|--------|-------|------|
| 1 | Add Widerrufsbelehrung + Muster-Widerrufsformular link on landing page (pre-checkout) | landing.html | 12+14 month withdrawal window |
| 2 | Resolve FAQ refund text vs Widerruf waiver contradiction | landing.html | Waiver nullified |
| 3 | Resolve "All future updates" vs "Lifetime of version" contradiction | landing.html OR i18n-disclaimer.js | Binding to unlimited updates |
| 4 | Fix "as is" warranty clause → §327ff-compliant | i18n-disclaimer.js, disclaimer*.html | Invalid AGB, Abmahnung |
| 5 | Fix reverse engineering clause → preserve §69d/69e UrhG | i18n-disclaimer.js, disclaimer*.html | Invalid AGB |
| 6 | Add Kleinunternehmer price note | landing.html | PAngV violation |
| 7 | Verify strikethrough price €159 validity | landing.html | PAngV §11 |

### Phase 2: THIS WEEK

| # | Action | Files | Risk |
|---|--------|-------|------|
| 8 | Set up post-purchase email via n8n/LS webhook with Widerrufsbelehrung on durable medium | n8n workflow | §312f BGB not satisfied |
| 9 | Update Datenschutzerklärung: storage duration, TDDDG §25, Service Worker, Aufsichtsbehörde | datenschutz*.html | DSGVO Art. 13 gaps |
| 10 | Add Rechtswahlklausel to Nutzungsbedingungen | i18n-disclaimer.js, disclaimer*.html | Best practice |

### Phase 3: BEFORE JUNE 19, 2026

| # | Action | Risk |
|---|--------|------|
| 11 | Implement Widerrufsbutton or verify waiver exempts from requirement | €50,000 fine |

---

## KEY COURT CASES REFERENCED

- **BGH I ZR 159/24 (09.10.2025)**: Buttonlösung violation = no contract exists
- **LG Karlsruhe 3 O 108/21 (28.01.2022)**: Combined Widerruf waiver checkbox valid
- **LG Köln 28 O 328/21 (18.05.2022)**: Widerruf waiver must be separate from "Buy" button
- **BGH VIII ZR 141/06 (19.09.2007)**: "Soweit gesetzlich zulässig" violates Transparenzgebot
- **EuGH C-298/07**: Email alone can suffice for Impressum contact
- **OLG Hamm I-4 U 65/13**: Kleinunternehmer MwSt display

## KEY LEGAL SOURCES

- IT-Recht Kanzlei: Widerruf bei digitalen Inhalten (2022 reform)
- IT-Recht Kanzlei: Widerrufsbutton FAQ (June 2026)
- IT-Recht Kanzlei: Kleinunternehmer MwSt display
- IT-Recht Kanzlei: PAngV Leitfaden
- §356(5) BGB, §312f BGB, §327-327u BGB
- Art. 246a EGBGB (Anlage 1 + 2)
- §69d, §69e UrhG, §69g(2) UrhG
- §25 TDDDG
- §5 DDG
- Lemon Squeezy Buyer Terms + MoR docs
- LS Feature Request #220 (EU Withdrawal checkbox — not implemented)
