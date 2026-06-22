---
phase: 17-audit-fix-business
plan: 03
subsystem: legal, payments
tags: [impressum, datenschutz, lemon-squeezy, gewerbe, gdpr]

# Dependency graph
requires:
  - phase: 17-audit-fix-business
    plan: 02
    provides: Post-purchase UX flow, Datenschutz LS note

# Key files
key-files:
  modified:
    - impressum.html
    - datenschutz.html
  unchanged:
    - assets/landing.js
    - assets/license.js
---

## What was built

Wired Sapir Ben-Porath's real business identity into all legal pages and confirmed LS product values already in place.

## Task Results

| # | Task | Status |
|---|------|--------|
| 1 | Collect Sapir's business details and LS product values | ✓ Done (LS values from prior session, business details from Ben) |
| 2 | Wire real values into code and legal pages | ✓ Done |

## Details

**Impressum (impressum.html):**
- Sapir Ben-Porath, Pettenkoferstr. 4E, 10247 Berlin
- Email: contact@sessionsgarden.app, Phone: +49 178 6858230
- Steuernummer intentionally omitted (Kleinunternehmer, no USt-IdNr required per DDG §5)

**Datenschutz (datenschutz.html):**
- German "Verantwortlicher" section: real name, address, email
- English "Data Controller" section: real name, address, email

**LS values (already wired in prior session):**
- Checkout URL: sessionsgarden.lemonsqueezy.com/checkout/buy/... (in landing.js)
- Store ID: 324581, Product ID: 915325 (in license.js)

## Decisions

- D-05 confirmed: All legal pages use Sapir's Gewerbe details, not Ben's
- Steuernummer omitted from Impressum — legally correct for Kleinunternehmer without USt-IdNr

## Self-Check: PASSED

- Zero `[YOUR_*]` placeholders remain in impressum.html (0 matches)
- Zero `[YOUR_*]` placeholders remain in datenschutz.html (0 matches)
- Zero PLACEHOLDER references in landing.js (0 matches)
- STORE_ID = 324581 (non-zero) ✓
- PRODUCT_ID = 915325 (non-zero) ✓
- contact@sessionsgarden.app present in impressum.html ✓
- Real lemonsqueezy.com/buy/ URL in landing.js ✓
