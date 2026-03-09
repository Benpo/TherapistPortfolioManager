# Handoff 1: Legal & Business Research (Claude Conversation)

**Start a new Claude conversation. Copy everything below as your first message.**

---

## Context

I'm a solo developer based in Germany with a registered Gewerbe (1 year old, no income yet). I built a therapist portfolio management app for my wife (Emotion Code practitioner) and now 5-20 of her fellow practitioners want it. I don't have a lawyer and need you to research the legal questions as thoroughly as possible so I can make informed architecture and business decisions.

### What the app stores (per therapist's clients)
- Client name, age, email, phone, photo
- Client type (Emotion Code / Body Code / both)
- Heart-Wall status, general notes
- Session records: date, issues with severity ratings (before/after), trapped emotions found, body code findings, customer summary comments

### The practitioners
- Emotion Code / Body Code therapists — alternative/complementary therapy
- NOT licensed Psychotherapeuten, NOT Heilpraktiker (most likely)
- Based in Germany and Israel
- Small community of ~5-20 people who studied together

### Deployment options I'm considering
- **Option A (PWA, local-only):** App served as static files from Netlify/Cloudflare. ALL client data stays in user's browser (IndexedDB). My server only serves HTML/CSS/JS code, never touches personal data.
- **Option B (PWA + encrypted backup):** Same as A, but the app encrypts all data client-side with the user's PIN (AES-256-GCM via Web Crypto API) and uploads the encrypted blob to my server for backup. I never have the decryption key.
- **Option C (Full backend):** Django app with user accounts. Client data stored in my database (encrypted at rest, EU-hosted).

### What I need you to research

**IMPORTANT: For each answer, cite specific GDPR articles, recitals, German laws (BDSG sections, StGB sections), EDPB guidelines, German DPA (Datenschutzbehörde) guidance, court decisions, or documented positions of established E2E-encrypted services. I need authoritative sources, not general advice.**

#### Block 1: Data Classification
1. Is the data described above "special category" data under GDPR Article 9? Specifically: does data from alternative/complementary therapy (not licensed medicine) qualify as "data concerning health"? Cite any guidance that distinguishes between licensed healthcare and alternative therapy.

2. Does it matter that Emotion Code practitioners are not Heilpraktiker or Psychotherapeuten under German law? Does the classification depend on the practitioner's legal status or on the nature of the data itself?

#### Block 2: Developer's Role by Deployment Model
3. **Option A (local-only):** If my server only serves static files (app code) and never receives, stores, or processes any personal data — am I a data processor under GDPR Article 28? Or am I simply a software vendor/tool provider with no processor obligations? Cite any EDPB or German DPA guidance on this distinction.

4. **Option B (encrypted backup):** Under GDPR Recital 26, personal data is defined relative to identifiability — data is personal if a person can be identified "by all means reasonably likely to be used." If I store encrypted blobs with NO key, NO metadata linking to individuals, and NO technical means to decrypt — does this blob constitute personal data FOR ME? Am I a data processor?
   - How do established E2E encrypted services (ProtonMail, Signal, Tresorit, SpiderOak) classify themselves under GDPR? Do they act as data processors? What do their DPAs and privacy policies say?
   - Has any EU court, EDPB, or German DPA specifically addressed the processor status of someone storing data they cannot decrypt?
   - What is the "Breyer" standard (CJEU C-582/14) and does it apply here?

5. **Option C (full backend):** What specific obligations do I have as a data processor storing health-adjacent data in my database? List everything: DPA requirements, DPIA, TOM documentation, breach notification obligations, Datenschutzbeauftragter threshold.

#### Block 3: German-Specific Requirements
6. Does Section 203 StGB (professional secrecy) apply to Emotion Code practitioners? If not, does this simplify using cloud services compared to serving licensed Psychotherapeuten?

7. Does the DigiG / BSI C5 attestation requirement apply to this app? Under what conditions would it NOT apply?

8. What Impressum requirements apply to a PWA served via a URL? Is this covered by TMG § 5 / DDG?

#### Block 4: Practical Compliance
9. What documents do I MUST have before selling the app? Rank them:
   - Impressum
   - Datenschutzerklaerung (privacy policy)
   - Nutzungsbedingungen (Terms of Service / AGB)
   - Auftragsverarbeitungsvertrag (DPA) — only if I'm a processor
   - Which of these can I generate using online generators (e.g., e-recht24.de, Datenschutz-Generator.de) vs. needing custom drafting?

10. What minimum app features are legally required for GDPR compliance?
    - Delete client data (right to erasure)
    - Export data (right to portability)
    - Consent tracking
    - Anything else?

11. For the cross-border aspect (developer in Germany, users in Germany + Israel): do I need to consider Israeli privacy law (Amendment 13)? Or is that purely the therapist's responsibility as data controller?

#### Block 5: Business/Tax
12. I have an existing Gewerbe registered for AI/automation business. Does selling a software product (one-time purchase, digital delivery) require updating my Gewerbeanmeldung Tätigkeitsbeschreibung?

13. If I use Lemon Squeezy (Merchant of Record based in US/EU) to sell the app at EUR 99:
    - They handle EU VAT collection and remittance
    - I receive net payouts
    - What do I report on my German tax return? Just the net payouts as Einnahmen in my EÜR?
    - Any Umsatzsteuer implications given Kleinunternehmerregelung?

14. EU Widerrufsrecht (14-day withdrawal right) for digital goods: can I exclude it if the customer explicitly consents to immediate delivery and acknowledges loss of withdrawal right? What's the exact mechanism?

#### Block 6: Risk Assessment
15. For each deployment option (A, B, C), give me a realistic risk assessment:
    - What's the worst that could happen legally if I launch without a lawyer?
    - What's the likelihood of enforcement action for a 5-20 user tool?
    - What steps reduce risk to an acceptable level without a formal legal consultation?
    - At what scale (user count, revenue) should I definitely get a lawyer?

### Output format

For each question, give me:
1. **Answer** (clear, actionable)
2. **Confidence level** (high/medium/low — based on how well-sourced the answer is)
3. **Sources** (specific citations)
4. **Remaining uncertainty** (what a lawyer would add that research can't)

At the end, produce:
- A **decision matrix** showing which deployment option has what legal burden
- A **minimum viable compliance checklist** for launching to 5 users
- A **"get a lawyer when..."** threshold — what triggers the need for professional advice
