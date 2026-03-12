---
created: 2026-03-12T17:38:37.529Z
title: Design landing page content and pricing with Sapir
area: ui
files:
  - landing.html
  - assets/landing.js
  - assets/landing.css
---

## Problem

The landing page (landing.html) was built during Phase 05-03 execution with auto-generated placeholder content. Sapir correctly flagged that none of the user-facing decisions were discussed before implementation:

- **Pricing**: EUR 49 one-time was assumed — actual price, payment model (one-time vs subscription), and currency need Sapir's decision
- **Marketing copy**: Tagline, feature descriptions, hero text, and overall messaging tone were auto-generated from plan specs without Sapir's input
- **Feature presentation**: Which 4-6 features to highlight, in what order, with what emphasis
- **Visual design**: Layout, hero section design, imagery/icons, overall look and feel
- **Legal content**: Impressum requires Sapir's personal details (name, address, email); Datenschutzerklaerung needs review
- **Lemon Squeezy integration**: Purchase button URLs are placeholders (YOURSTORE.lemonsqueezy.com/buy/VARIANT_ID)

Phase 05-03 checkpoint (Task 2: human-verify) is blocked until this content is finalized.

## Solution

Open a dedicated conversation to go through each decision with Sapir:

1. Start with messaging and positioning — who is this for, what's the key value prop
2. Decide pricing (amount, model, currency, device limit)
3. Review and rewrite marketing copy (hero, features, pricing section)
4. Review visual design and layout
5. Collect Impressum details or confirm placeholder approach
6. Update landing.html, landing.js, landing.css with finalized content
7. Complete the 05-03 checkpoint verification
