# Open Questions: What Must Be Clarified Before Launch

**Date:** 2026-02-19
**Status:** Questions organized by priority (launch-blocking vs. post-launch)
**Context:** Developer has a registered German business (Gewerbe, 1 year old, no income yet). Wants to sell Emotion Code Portfolio Manager to ~5-20 therapists.

---

## CATEGORY A: LEGAL (Must Clarify Before Launch)

### A1. Datenschutzanwalt Consultation (EUR 500-1000)

**Questions to bring to the lawyer:**

1. **Data classification**: "My app stores client names, ages, contact info, therapy session notes (trapped emotions, severity ratings, Heart-Wall status, body code findings). Is this GDPR Article 9 special category health data, given that Emotion Code is not a licensed medical practice in Germany?"

2. **Encrypted backup model**: "If I store user data as encrypted blobs on my server, where only the user holds the decryption key (their PIN) and I have no ability to decrypt it — am I still a data processor under GDPR? Do I still need a DPA (Auftragsverarbeitungsvertrag) with each therapist?"

3. **Local-only model**: "If data stays entirely on the user's device (browser IndexedDB) and my server only serves the application code — do I have ANY GDPR obligations regarding the client data? Am I just a software vendor?"

4. **Full backend model**: "If I build a backend where user data is stored in my database — what exactly do I need? DPA template? DPIA? TOM documentation? Do I need a Datenschutzbeauftragter for 5-20 therapists?"

5. **Consent flow**: "Do I need to build consent-tracking into the app (i.e., the therapist records that their client consented to data storage)? Or is it sufficient if I provide guidance and templates and leave it to each therapist?"

6. **Data subject rights**: "What minimum features must the app have to support GDPR rights? Is a 'delete client' button + JSON export sufficient for right to erasure and data portability?"

7. **Cross-border**: "My users may be in Germany and Israel. I'm the developer in Germany. Does Israeli privacy law (Amendment 13) affect me or only the therapists? Do I need to consider both jurisdictions?"

8. **Terms of Service / Nutzungsbedingungen**: "Do I need formal ToS and a Datenschutzerklaerung (privacy policy) for the app? Can you provide templates or should I have them drafted?"

9. **Haftung / Liability**: "If a therapist's client data is lost (browser clears IndexedDB, or encrypted backup fails) — what is my liability? Do I need a limitation of liability clause? Haftungsausschluss?"

10. **Impressumspflicht**: "My app is accessible via URL. Do I need an Impressum? What must it contain?"

### A2. Business/Tax Clarification (Steuerberater or Self-Research)

11. **Existing Gewerbe scope**: "My Gewerbe was registered a year ago with no income. Is selling software covered under my current registration, or do I need to update my Gewerbeanmeldung (Tätigkeitsbeschreibung)?"

12. **Kleinunternehmerregelung status**: "Did I elect Kleinunternehmerregelung when I registered? If yes, does it still apply? If no, should I elect it now?"

13. **Lemon Squeezy + German taxes**: "If Lemon Squeezy is the Merchant of Record and handles EU VAT — what do I report on my German tax return? Is it just the net payout as Einnahmen? Do I need to issue Rechnungen to customers?"

14. **EÜR / Buchführung**: "For a few hundred EUR in revenue from software sales — is an EÜR (Einnahmenüberschussrechnung) sufficient? Do I need any specific Buchführung?"

15. **Reverse charge with Lemon Squeezy**: "Lemon Squeezy is a US/EU entity paying me. Is this a B2B reverse charge situation? How do I invoice them?"

---

## CATEGORY B: ARCHITECTURE DECISIONS (Decide Before Building)

### B1. Data Storage Model

16. **Which option do you commit to?**
    - Option 1: PWA + Encrypted Backup Endpoint (recommended middle ground)
    - Option 2: Full Django backend (more work, more legal burden, more robust)
    - Option 3: Pure PWA, local-only, no backend (fastest to ship, least data safety)
    - The lawyer's answer to questions A2-A4 directly impacts this choice

17. **If encrypted backup: what happens when a user forgets their PIN?**
    - Data is unrecoverable by design (privacy feature) — is this acceptable?
    - Do you offer a "recovery phrase" or backup key mechanism?
    - How do you communicate this clearly to non-technical users?

18. **If encrypted backup: what's the backup frequency?**
    - Automatic on every data change? (requires being online)
    - Manual "Back Up Now" button?
    - Periodic (e.g., daily when online)?
    - What happens when user is offline for weeks and then comes online?

19. **If full backend: multi-tenancy model?**
    - Shared database with user_id filtering (simplest)
    - Separate SQLite per user (stronger isolation)
    - This affects complexity and data isolation guarantees

20. **Photo storage**: "The app stores client photos. Where do these go?"
    - IndexedDB can hold blobs but gets large quickly
    - If using a backend: stored on server? Encrypted?
    - Photos make encrypted backup blobs significantly larger

### B2. Authentication & Access

21. **How do users get access?**
    - License key entered in-app after purchase?
    - Private URL shared only with buyers?
    - Full user accounts (email/password) — only makes sense with a backend?
    - For 5 users: just send them the link personally?

22. **What if a user shares the URL/key with non-paying people?**
    - At 5-20 users in a close community: is this even a real risk?
    - How much effort should you invest in preventing this vs. trusting the group?

23. **App-level security (PIN screen)**:
    - PIN vs. password vs. biometric (fingerprint)?
    - PIN is simpler but weaker. Enough for a therapist's phone?
    - Should the app auto-lock after X minutes of inactivity?

### B3. Deployment Architecture

24. **Domain name**: Do you want a custom domain? (e.g., emotioncode-portfolio.com)
    - Costs ~EUR 10-15/year
    - More professional than netlify.app subdomain
    - Required if you want branded emails later

25. **Hosting choice**: Netlify (free tier confirmed), Cloudflare Pages (unlimited bandwidth), or GitHub Pages?
    - For the PWA (static files): any of these works
    - For the backup endpoint (if Option 1): needs a separate service (Railway, Fly.io, Render)
    - Can you host both on one platform?

26. **If backend needed: where to host?**
    - Railway ($5-10/mo, easiest)
    - Fly.io ($3-5/mo, SQLite-friendly)
    - Hetzner VPS ($5/mo, most control, most setup)
    - Render ($7/mo, PostgreSQL included)
    - Must be EU-hosted? (Lawyer question A2 may inform this)

---

## CATEGORY C: PRODUCT & UX DECISIONS (Before or During Build)

### C1. User Experience

27. **Is the current UI ready for paying customers?**
    - Does it work well on mobile? (Not yet verified)
    - Is the Hebrew translation complete and natural?
    - Does the UX feel polished enough for EUR 100?

28. **Onboarding flow for new users**:
    - First launch: what does the user see?
    - Do they need a tutorial/walkthrough?
    - Do they set up their PIN immediately?
    - How do they import existing data (if switching from paper/Excel)?

29. **Offline experience**:
    - What happens if they're offline on first visit? (Can't load the app yet)
    - After first visit: everything works offline via service worker
    - How to indicate online/offline status to the user?

30. **Backup UX (if encrypted backup)**:
    - How does the user know their data is backed up?
    - Visual indicator: "Last backup: 2 hours ago"?
    - What happens on restore: do they lose current data?
    - Can they have multiple backup versions (snapshots)?

31. **Data migration from wife's current instance**:
    - Your wife already has real client data in her browser's IndexedDB
    - How to migrate her data to the new version (with PIN, encryption, etc.)?
    - She uses the JSON export — will that still work?

### C2. Pricing & Business Model

32. **Final pricing decision**:
    - One-time EUR 99?
    - Two tiers (EUR 59 basic / EUR 99 with backup)?
    - Does the backup feature justify the higher tier?
    - Or just one simple price?

33. **Payment logistics for the first 5 users**:
    - Use Lemon Squeezy from day one?
    - Or simpler: PayPal/bank transfer + send link manually?
    - When does it make sense to formalize the payment flow?

34. **Refund policy**: What if a user pays and then doesn't like it?
    - 14-day Widerrufsrecht for digital goods in EU (can be waived with explicit consent at purchase)
    - What does Lemon Squeezy handle?

35. **Future pricing**: If you add significant features later (reporting, PDF export, etc.) — do existing users get them free? Is this a one-time "lifetime" purchase?

### C3. Support & Maintenance

36. **How will you handle support?**
    - WhatsApp group with the therapists?
    - Email?
    - How much time per week are you willing to invest?

37. **Update communication**: How do users know about new features?
    - In-app changelog/notification?
    - WhatsApp message?

38. **What if a user loses all data?**
    - Without backup: gone forever. Are you okay telling a paying customer that?
    - With encrypted backup: recoverable. What's the restore process?
    - This is probably the strongest argument FOR implementing the backup before launch

---

## CATEGORY D: OPTIONS NOT YET EXPLORED

### D1. Alternative Distribution Models

39. **App Store / Play Store (via TWA/PWABuilder)**:
    - You can wrap a PWA in a Trusted Web Activity (TWA) and publish to Google Play
    - Apple App Store is harder (requires native wrapper)
    - Pros: discoverability, trust signal ("it's in the app store"), easier install
    - Cons: App Store fees (15-30% on purchases), review process, update delays
    - Worth exploring or overkill for 5-20 users?

40. **White-label / customizable per therapist**:
    - Could each therapist have their practice name/logo in the app?
    - This increases perceived value significantly
    - How much effort to implement? (Template variables in the HTML)

41. **Marketplace listing (Gumroad, Product Hunt, Indie Hackers)**:
    - Would listing the tool on these platforms bring in additional users?
    - Is the Emotion Code practitioner community large enough for organic discovery?
    - Worth considering after initial 5-20 users are happy?

### D2. Feature Expansion Questions

42. **PDF report generation**: Therapists often need to give clients a session summary. Currently the app has reporting.html but no PDF export. This could be a significant value-add.

43. **Search functionality**: Currently no way to search across clients or sessions. Important as data grows.

44. **Appointment scheduling**: Not currently in scope but is a common need. Do users want this or is it feature creep?

45. **Multiple practitioner types**: The app is Emotion Code specific. Could it be adapted for Body Code, Access Bars, or other modalities? Is there a larger market?

### D3. Scaling Questions (Not Urgent)

46. **What if word spreads and 50-100 people want the app?**
    - Does the chosen architecture handle this?
    - At what point does a full backend become necessary?
    - Revenue at EUR 100 x 100 users = EUR 10,000. Worth the effort of building a backend?

47. **Localization beyond EN/HE**:
    - German? (Your market is Germany-based)
    - Other languages as the user base grows?

48. **Competition**: Are there other Emotion Code-specific tools? What if someone builds one?

---

## PRIORITY MAP: What Blocks Launch?

### Must Answer BEFORE Launch
| # | Question | How to Answer | Est. Time |
|---|----------|--------------|-----------|
| A1-A10 | Legal questions | Datenschutzanwalt consultation | 1-2 weeks to schedule + 1 hour meeting |
| A11-A12 | Gewerbe scope, Kleinunternehmer | Check your registration docs or call Finanzamt | 1 day |
| B16 | Data storage model | Depends on lawyer's answers | After A1-A4 |
| B21 | Access gating method | Your decision | 30 min thinking |
| C32-C33 | Pricing and payment method | Your decision | 30 min thinking |

### Can Answer DURING Build (Don't Block Launch)
| # | Question | Notes |
|---|----------|-------|
| B17-B18 | Backup PIN recovery, frequency | Design decisions during implementation |
| B24-B26 | Domain, hosting choice | Pick one and go; easy to change later |
| C27-C31 | UX polish, onboarding, migration | Iterative; improve based on first 5 users' feedback |
| C34-C37 | Refund, support, updates | Decide as you go; formal policies can come later |

### Post-Launch (Nice to Have)
| # | Question | Notes |
|---|----------|-------|
| D39-D41 | App Store, white-label, marketplace | Only if demand warrants |
| D42-D48 | Feature expansion, scaling, competition | Let user feedback drive this |

---

## THE CRITICAL PATH TO LAUNCH

```
Week 1:  Schedule Datenschutzanwalt consultation
         Check Gewerbe registration scope
         Decide pricing (EUR 99 one-time)

Week 2:  Lawyer consultation → answers to A1-A10
         Based on answers: commit to architecture (Option 1 or 2)

Week 3+: Build the chosen solution
         - If PWA + encrypted backup: ~1-2 weeks
         - If full Django: ~4-8 weeks

Launch:  Set up Lemon Squeezy
         Deploy to Netlify/Cloudflare Pages
         Share with first 5 therapists
```
