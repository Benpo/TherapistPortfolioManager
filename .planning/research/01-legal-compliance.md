# Legal Compliance Research: Therapist Portfolio Manager in Germany

## Scope of Analysis

This report analyzes the legal requirements for distributing the **Emotion Code Portfolio Manager** -- a browser-based HTML/JS application using IndexedDB for local storage -- to approximately 10-20 therapists in Germany who practice the Emotion Code method. The app stores: client names, ages, email addresses, phone numbers, photos, session dates, therapeutic observations (trapped emotions, Heart-Wall status, severity ratings, body code findings), session comments, and customer summaries.

---

## 1. GDPR Implications for Therapy/Health-Adjacent Data

### 1.1 Is This "Special Category" Data Under GDPR Article 9?

**Yes, almost certainly.**

GDPR Article 9(1) prohibits processing of "data concerning health" unless an exception applies. The GDPR defines health data broadly as "personal data related to the physical or mental health of a natural person, including the provision of health care services, which reveal information about his or her health status" (Article 4(15)).

The data in this app clearly falls within this definition:
- **Trapped emotions** and emotional severity ratings reveal information about a person's mental/emotional health state
- **Session notes and therapeutic observations** document the provision of health-adjacent care
- **Heart-Wall status** and **Body Code findings** are therapeutic assessments
- **Issue descriptions with before/after severity scores** directly track health-related outcomes

Even though Emotion Code is an alternative/complementary therapy and not conventional medicine, the data still qualifies as health data under GDPR. The regulation does not distinguish between conventional and alternative health approaches -- what matters is whether the data reveals information about a person's health status, which this data unambiguously does.

**Key implication:** Processing this data is prohibited by default under Article 9(1), and one of the exceptions in Article 9(2) must be satisfied.

### 1.2 Applicable Exceptions Under Article 9(2)

The most relevant exceptions for this scenario are:

**a) Explicit Consent -- Article 9(2)(a)**
The data subject has given "explicit consent" to the processing for one or more specified purposes. This is the most practical legal basis for Emotion Code practitioners. It requires:
- Consent must be freely given, specific, informed, and unambiguous
- It must be "explicit" (a higher bar than ordinary consent -- typically a clear affirmative written statement)
- It must be documented and easily withdrawable
- The therapist must explain what data is collected, why, and how long it is retained

**b) Health or Social Care -- Article 9(2)(h)**
Processing is necessary for "the provision of health or social care or treatment, or the management of health or social care systems and services." However, this exception requires that processing is "on the basis of Union or Member State law or pursuant to a contract with a health professional" and that the data is "processed by or under the responsibility of a professional subject to the obligation of professional secrecy." As discussed in Section 2.2, Emotion Code practitioners may not qualify as such professionals, making this exception less reliable.

**Recommendation for the app:** Rely primarily on **explicit consent (Article 9(2)(a))** as the legal basis. The app should include a consent mechanism or at minimum guide therapists to obtain and document explicit consent from their clients.

### 1.3 Data Controller vs. Data Processor Distinction

This distinction is critical and depends entirely on the deployment model:

| Scenario | Who is the Data Controller? | Who is the Data Processor? |
|---|---|---|
| **Local-only app** (data stays on therapist's device) | The therapist | No processor exists -- the developer is just a software vendor |
| **SaaS/cloud** (data on developer's servers) | The therapist (they decide what data to collect and why) | The developer/SaaS operator (processes data on therapist's behalf) |
| **Self-hosted by therapist** | The therapist | No processor exists (or the hosting provider may be a sub-processor) |

The **data controller** determines the purposes and means of processing. The therapist always decides *why* and *what* client data to collect, so they are always the controller. The developer becomes a **data processor** only when they actually handle or have access to the personal data on behalf of the controller (i.e., the SaaS model).

---

## 2. German-Specific Laws (BDSG, State Laws, StGB)

### 2.1 BDSG Section 22 -- Additional Safeguards for Health Data

Germany's Bundesdatenschutzgesetz (BDSG) supplements the GDPR with Section 22, which requires **specific technical and organizational safeguards** when processing special category data, including health data. These safeguards include:

1. Internal policies regulating secondary uses of data
2. Employee training on data protection
3. Appointing a Data Protection Officer (where applicable)
4. Access controls (limiting who can see the data)
5. Logging and monitoring of data access
6. Encryption and/or pseudonymization
7. Periodic security self-audits

Even a solo practitioner processing health data must implement appropriate measures from this list.

### 2.2 Does the Type of Therapist Matter?

**Yes, significantly.**

Germany distinguishes between several categories of therapists:

| Category | Section 203 StGB Coverage | GDPR Health Data Rules Apply? |
|---|---|---|
| **Approbierter Psychotherapeut** (licensed psychotherapist) | Yes -- full professional secrecy obligation | Yes |
| **Heilpraktiker fur Psychotherapie** (alternative practitioner for psychotherapy) | **No** -- not listed in Section 203 StGB catalogue professions | Yes |
| **Emotion Code/Body Code practitioner** (no formal German license) | **No** -- not covered by Section 203 StGB | Yes |

**Critical finding:** Section 203 StGB establishes criminal liability for violating professional secrecy. It covers physicians, licensed psychotherapists, and other specifically listed health professions. **Heilpraktiker are explicitly NOT included** in this catalogue, and Emotion Code practitioners even less so.

However, Heilpraktiker associations have adopted professional codes of conduct (Berufsordnung) that include confidentiality obligations that functionally mirror Section 203 obligations.

**What this means for the SaaS model:** If the therapists using the app are licensed psychotherapists covered by Section 203 StGB, then using a SaaS provider requires an **additional confidentiality agreement** under Section 203(4) StGB on top of the standard GDPR Data Processing Agreement. If the therapists are Emotion Code practitioners without Heilpraktiker or psychotherapy licensing, the Section 203 obligation does not technically apply, but GDPR obligations still fully apply.

### 2.3 Patientendaten-Schutz-Gesetz (PDSG) and DigiG

The Patient Data Protection Act (PDSG) and the newer Digital Health Act (DigiG) primarily apply to the **telematics infrastructure** -- the interconnected system of statutory health insurance providers, hospitals, and registered healthcare providers. Since Emotion Code practitioners are unlikely to be part of the statutory health insurance system (gesetzliche Krankenversicherung), the PDSG/DigiG requirements (including the BSI C5 attestation requirement) most likely **do not directly apply** to this app.

However, if any of the therapists using the app are licensed psychotherapists who bill through statutory health insurance, the C5 requirement could potentially become relevant for a cloud deployment. This is a significant consideration.

### 2.4 State-Level Laws (Landesdatenschutzgesetz)

Germany's 16 federal states each have their own data protection acts (Landesdatenschutzgesetze), which primarily govern **public bodies**. For private therapy practices, the GDPR and BDSG are the primary regulations. However:

- Each state has its own **supervisory authority** (Landesdatenschutzbehorde) that interprets and enforces GDPR differently
- Some states have **additional hospital-specific laws** (Landeskrankenhausgesetze) that could be relevant if the app were used in clinical settings
- The supervisory authority in the therapist's state would handle any complaints or enforcement actions

For private-practice Emotion Code practitioners, the federal framework (GDPR + BDSG) is the primary concern, not state-level laws.

### 2.5 Data Storage Location Requirements

The GDPR does not strictly require data to remain physically within Germany or even within the EU. However:

- Data storage **within the EU/EEA** is the safest and simplest approach
- Transfers to countries with an adequacy decision (including the US under the EU-US Data Privacy Framework) are permitted
- Transfers to other countries require Standard Contractual Clauses (SCCs) or Binding Corporate Rules
- For health data specifically, the upcoming **European Health Data Space (EHDS)** regulation may allow member states to mandate EU-only storage

**Practical recommendation:** Host within the EU (ideally Germany) to avoid transfer mechanism complexity entirely.

---

## 3. Legal Requirements by Deployment Model

### 3.1 Model A: Local-Only App (Current Architecture)

This is the **lowest-risk deployment model** from a legal perspective.

**Developer's legal obligations:**
- The developer is **neither a data controller nor a data processor**. They are simply a software vendor/tool provider.
- **No Data Processing Agreement (DPA) is needed** because the developer never touches the personal data.
- **No DPIA** is required from the developer (the therapist-controller may need one).
- The developer has **no direct GDPR obligations** regarding the client data.

**Therapist's legal obligations (as data controller):**
- Must have a **legal basis** for processing (explicit consent recommended)
- Must provide clients with a **privacy notice** (Articles 13/14 GDPR)
- Must maintain **Records of Processing Activities** (Article 30) -- no exemption because health data is processed, even with fewer than 250 employees
- Should conduct a **Data Protection Impact Assessment** (Article 35) -- health data processing likely qualifies as "high risk"
- Must implement appropriate **technical and organizational measures** (encryption, access control, backup security)
- Must be able to fulfill **data subject rights** (access, deletion, portability)

**Risks with current architecture:**
- IndexedDB data is **not encrypted** at rest in the browser
- Data can be lost if the browser cache is cleared
- The export/import JSON feature creates unencrypted files that could be shared or leaked
- No authentication -- anyone with access to the device can view all client data

### 3.2 Model B: SaaS / Cloud Deployment

This model carries the **highest legal burden** for the developer.

**Developer's additional obligations (as data processor):**
1. **Data Processing Agreement (DPA)** -- mandatory under Article 28 GDPR. Must specify:
   - Subject matter, duration, nature, and purpose of processing
   - Types of personal data and categories of data subjects
   - Controller's rights and obligations
   - Technical and organizational security measures
   - Sub-processor notification and approval process
   - Data deletion/return procedures upon contract termination
   - Audit rights for the controller

2. **Records of Processing Activities** -- required under Article 30(2) as a processor

3. **Data Protection Impact Assessment** -- the therapist (controller) must conduct this, but the developer (processor) must assist

4. **Technical and organizational measures** (Article 32):
   - Encryption in transit (TLS) and at rest
   - Access controls and authentication
   - Regular backups with tested restoration
   - Logging and monitoring
   - Incident response procedures

5. **Data breach notification** -- must notify the controller "without undue delay" after becoming aware of a breach (Article 33)

6. **Sub-processor management** -- must get controller authorization before engaging sub-processors (e.g., cloud hosting providers). Must pass down the same data protection obligations.

7. **Section 203 StGB compliance** (if serving licensed therapists) -- additional confidentiality agreement beyond the DPA

8. **Potential BSI C5 attestation** -- if any therapists are part of the statutory health insurance system, the DigiG requires C5 Type 2 attestation for cloud service providers processing healthcare data. This is a significant cost and effort barrier (EUR 50,000-150,000+).

9. **Privacy policy and terms of service** -- public-facing legal documents

10. **Data residency** -- hosting within EU/EEA strongly recommended, with a German or EU-based hosting provider

### 3.3 Model C: Self-Hosted by Each Therapist

This is a **middle-ground model**.

**Developer's legal obligations:**
- Similar to Model A -- the developer is a **software vendor, not a data processor**
- No DPA required with the developer
- The developer should provide **documentation and guidance** on secure deployment

**Therapist's legal obligations:**
- Same as Model A (full controller obligations)
- Additionally responsible for **server security, backups, and access controls**
- If using a cloud hosting provider, the therapist needs a DPA with that hosting provider

---

## 4. Practical Compliance Steps and Recommendations

### 4.1 Recommended Deployment Strategy

**Tier 1 (Lowest effort, immediate): Enhanced Local-Only App**
- Add client-side encryption for IndexedDB data (Web Crypto API)
- Add a PIN/password to access the app
- Encrypt exported JSON files
- Add a consent tracking feature
- Provide a privacy notice template (in German) for therapists to give clients
- Provide a Records of Processing Activities template
- Add data deletion and data export features for data subject rights

This approach means the developer has **zero GDPR processor obligations**.

**Tier 2 (Medium effort): Desktop App with Local Database**
- Package as Electron or Tauri with local SQLite
- Data stays entirely on the therapist's machine
- Proper file-level encryption
- Still no processor obligations for the developer

**Tier 3 (High effort, only if demand warrants): Cloud SaaS**
Only pursue if strong demand exists, because it requires:
- Full DPA with each therapist
- EU-hosted infrastructure (recommended: Hetzner, IONOS, or Open Telekom Cloud)
- End-to-end encryption architecture
- Regular security audits
- Potential C5 attestation (EUR 50,000-150,000+)
- Data breach response procedures
- Potentially a Data Protection Officer appointment

### 4.2 Compliance Checklist

| Step | Priority | Applicable Model |
|---|---|---|
| German-language **privacy notice template** for therapists to give clients | High | All |
| **Records of Processing Activities template** | High | All |
| **Explicit consent language** (template for therapists) | High | All |
| **Data export in portable format** (JSON/CSV) for portability rights | High | All |
| **Data deletion** capability per client | High | All |
| **Client-side encryption** for stored data | High | All |
| **App-level authentication** (PIN/password) | High | All |
| Encrypt or password-protect **data exports** | Medium | All |
| **Data retention guidance** document | Medium | All |
| **DPIA template** adapted to this use case | Medium | All |
| **DPA (Auftragsverarbeitungsvertrag)** with each therapist | Required | SaaS only |
| **Server-side encryption at rest and in transit** | Required | SaaS only |
| **Access logging and monitoring** | Required | SaaS only |

### 4.3 Certifications and Audits

**For the local-only model:** No certifications or audits are required from the developer.

**For the SaaS model:**
- **ISO 27001** -- not legally required but strongly recommended. Cost: ~EUR 10,000-30,000 for initial certification.
- **BSI C5 attestation** -- required under DigiG only if serving healthcare providers in the statutory health insurance system. Prohibitively expensive for a solo developer (EUR 50,000-150,000+).
- **GDPR Article 42 certification** -- voluntary, not yet widely established in Germany.

### 4.4 Specific Risk: The Export/Import Feature

The current export/import creates a plain JSON file containing all client and session data. This is a significant privacy risk because:
- The exported file is unencrypted
- It could be emailed, uploaded to cloud storage, or shared accidentally

**Recommendation:** Either encrypt the export file with a user-provided password, or clearly warn users that the exported file contains sensitive health data.

---

## 5. Summary of Key Findings

1. **The data is unambiguously "special category" health data under GDPR Article 9**, even though Emotion Code is alternative therapy.

2. **The local-only architecture is the legally simplest model.** The developer has no GDPR processor obligations.

3. **Moving to SaaS would dramatically increase legal obligations**: DPAs, security measures, breach notification, potential C5 attestation.

4. **Emotion Code practitioners are likely NOT covered by Section 203 StGB** (professional secrecy), which simplifies cloud deployment compared to serving licensed psychotherapists. However, GDPR obligations remain fully in force.

5. **No German law requires data to be stored in Germany**, but EU/EEA hosting is strongly recommended.

6. **The most practical path forward** is to enhance the current local-only app with encryption, authentication, and privacy compliance templates, then potentially offer a desktop app for better data persistence.

7. **Each therapist** needs to independently handle their GDPR controller obligations. The developer can help by providing templates and guidance.

---

## Sources

- [GDPR Article 9 -- Processing of Special Categories of Personal Data](https://gdpr-info.eu/art-9-gdpr/)
- [GDPR Article 28 -- Processor](https://gdpr-info.eu/art-28-gdpr/)
- [GDPR Article 35 -- Data Protection Impact Assessment](https://gdprhub.eu/Article_35_GDPR)
- [BDSG Section 22 -- Processing of Special Categories](https://gdpr.berlin/federal-law-bdsg/22-bdsg-verarbeitung-besonderer-kategorien-personenbezogener-daten/)
- [Section 203 StGB -- Violation of Private Secrets](https://www.gesetze-im-internet.de/stgb/__203.html)
- [Heilpraktiker Schweigepflicht (VUH)](https://www.heilpraktikerverband.de/aktuelles/aktuelle-meldungen/13-schweigepflicht-des-heilpraktikers)
- [Germany's Patient Data Protection Act (PDSG)](https://www.endpointprotector.com/blog/all-you-need-to-know-about-germanys-patient-data-protection-act/)
- [DigiG and C5 -- Germany's Digital Data Protection Act](https://coalfire.com/the-coalfire-blog/digig-and-c5-germanys-digital-data-protection-act)
- [SaaS Providers C5 Attestation Requirement](https://simpliant.eu/insights/neues-digital-gesetz-pflicht-zu-c5-testierung-fuer-saas-anbieter-im-gesundheitswesen)
- [GDPR for SaaS Companies (EDPO)](https://edpo.com/gdpr-saas-companies/)
- [Data Processing Agreement Template (GDPR.eu)](https://gdpr.eu/data-processing-agreement/)
- [Does GDPR Require EU Data Hosting?](https://www.digitalsamba.com/blog/does-gdpr-require-eu-data-hosting)
- [HIPAA for Therapists](https://www.hipaajournal.com/hipaa-for-therapists/)
- [Data Protection Overview Germany (DataGuidance)](https://www.dataguidance.com/notes/germany-data-protection-overview)

**Disclaimer:** This research report is informational and does not constitute legal advice. Consulting a German data protection attorney (Datenschutzanwalt) before distributing the app is strongly recommended, particularly if a SaaS deployment is considered. A one-time consultation would likely cost EUR 500-2,000.
