---
title: Restructure terms acceptance into LS activation flow
priority: medium
source: UAT Phase 19 + Phase 20 discussion
created: 2026-03-24
deferred_to: Phase 21+
---

## Issue

When a user accepts Terms & Conditions, we only store it in localStorage on their device. The business (Sapir) has no record of this acceptance — no email, no webhook, no log.

## Preferred Approach (from Phase 20 discussion, 2026-03-25)

**Merge terms acceptance into the Lemon Squeezy activation flow** rather than adding a separate webhook:

### Proposed new flow
1. User visits app → goes to license page → enters key
2. Activation page includes "I have read and accept the Terms of Use" checkbox (link to full terms)
3. On activation success → update LS customer metadata with `terms_accepted: timestamp`
4. LS already notifies Sapir of activations → terms acceptance is bundled in
5. No separate data collection, no n8n/VPS involvement, simpler Datenschutz

### Benefits over webhook approach
- No additional personal data collection beyond what LS already has
- No n8n dependency — stays within LS ecosystem
- No Datenschutz updates needed for VPS data processing
- Sapir already gets LS activation notifications — terms info rides along

### Open questions
- Does the current standalone disclaimer page get removed, or become informational only (no binding checkboxes)?
- What about free trial / demo users who never hit activation? Ben says fine for now.
- The acceptance receipt (downloadable TXT) should include same info sent to LS

### Ben's preferences on notification data
- Send the same content as the acceptance receipt TXT (timestamp, language, license key, IP, user agent)
- Notify on every acceptance (each new device/browser requires re-acceptance)
- If LS approach works, no need for failure handling or n8n fallback

## Why deferred
Too big for Phase 20 (UI polish). Restructuring the terms flow touches disclaimer page, activation flow, LS API integration, and potentially Datenschutz updates. Moved to Phase 21+.
