---
created: 2026-03-12T12:02:00.000Z
title: Research legal disclaimer signature storage and GDPR compliance
area: general
files: []
---

## Problem

The app includes a disclaimer and signature page during client registration/onboarding. Key open questions:

1. **Signature storage** — How to securely store the client's signature (digital signature, checkbox consent, or drawn signature) in a way that provides legal proof if needed?
2. **Legal validity in Germany** — What makes a digitally captured consent/signature legally binding under German law (BGB, eIDAS regulation)?
3. **GDPR / Datenschutz constraints** — German data privacy laws impose strict rules:
   - Storing IP addresses is problematic (considered personal data under GDPR)
   - What metadata can/should be captured alongside consent (timestamp, device info, etc.) without violating DSGVO?
   - Data minimization principle — what is the minimum needed for legal protection?
4. **Document generation** — Should a signed PDF or document be generated and stored/exported as proof?
5. **Retention and deletion** — How long can/must consent records be kept, and what happens when a client requests data deletion?

## Solution

Research phase to explore options:
- Investigate German legal requirements for digital consent/signatures in therapeutic context (Heilpraktiker/therapist scope)
- Review eIDAS levels (simple, advanced, qualified electronic signatures) and what level is needed
- Explore GDPR-compliant consent logging patterns (timestamp + hash, no IP)
- Consider generating a signed PDF export that the therapist can archive independently
- Look into existing solutions/libraries for digital signature capture in React Native / mobile apps
- Consult relevant German regulations: DSGVO, BDSG, BGB §§126-127, eIDAS
- Decide on implementation approach that balances legal protection with data minimization
