# Feature Landscape

**Domain:** Therapist session management (Emotion Code / Body Code practitioners)
**Researched:** 2026-03-09
**Overall confidence:** MEDIUM-HIGH

## Context

This app occupies a unique niche: it is NOT competing with SimplePractice, Jane App, TherapyNotes, or other full practice management platforms (which cost $29-79/month and include scheduling, billing, insurance claims, telehealth). Instead, it targets a specific gap: **Emotion Code / Body Code practitioners who need clinical session documentation without the overhead, cost, or cloud dependency of full practice management software.**

No dedicated software exists for this modality. Practitioners currently use paper notes, generic spreadsheets, or overkill platforms designed for licensed mental health professionals. This app's positioning is: simple, private, offline, purpose-built for energy healing documentation.

---

## Table Stakes

Features users expect. Missing = product feels incomplete or untrustworthy.

| Feature | Why Expected | Complexity | Status | Notes |
|---------|--------------|------------|--------|-------|
| Client CRUD (create, view, edit, delete) | Fundamental to any client management | Low | DONE | Includes photo upload |
| Session CRUD with date tracking | Core purpose of the app | Low | DONE | |
| Trapped emotions list per session | Modality-specific — this IS the work | Med | DONE | Multi-issue with severity tracking |
| Severity tracking (before/after) | Practitioners need to show client progress | Med | DONE | Per-issue 0-10 scale, before AND after |
| Heart-Wall tracking | Central concept in Emotion Code methodology | Med | DONE | Cross-session tracking |
| Session browsing with filters | Users need to find past sessions quickly | Med | DONE | By client, date range |
| Data export (JSON backup) | Users MUST be able to back up local data — no cloud safety net | Low | DONE | JSON export/import |
| Bilingual UI (min. 2 languages) | Target market spans multiple countries | Med | DONE | English + Hebrew |
| Offline functionality | Core value proposition — no internet needed | Low | DONE | Works from file:// protocol |
| Data privacy (no external calls) | Health data = maximum privacy expectations | Low | DONE | Zero network calls |
| Session notes / free text | Every practitioner needs unstructured notes | Low | DONE | Body Code notes + customer summary |
| Client overview with stats | Users need a dashboard to see their practice at a glance | Med | DONE | 3 KPIs on overview page |
| Read mode for past sessions | View without accidentally editing | Low | DONE | |
| Professional visual design | Sellable product must look polished, not like a developer prototype | High | TODO | Garden theme from Lovable repo |
| Dark mode | Standard expectation for any modern app | Med | TODO | CSS custom properties approach |
| Legal disclaimer / T&C | Selling health-adjacent software requires CYA | Med | TODO | Block app until accepted, receipt download |
| Client search | With more than 10 clients, scrolling a table breaks down | Low | TODO | Text search by name/phone/email |
| Backup reminder | Local-only data = user is solely responsible for backups | Low | TODO | Weekly prompt with snooze |

**Assessment:** The existing app already covers most table stakes for this niche. The remaining items (design, dark mode, disclaimer, search, backup reminder) are all planned. This is a strong foundation.

---

## Differentiators

Features that set this product apart. Not expected, but create competitive advantage and "wow" moments.

| Feature | Value Proposition | Complexity | Status | Notes |
|---------|-------------------|------------|--------|-------|
| Per-issue severity tracking (before/after) | No competitor tracks per-issue severity changes across sessions. This is clinically rich and helps practitioners demonstrate value to clients | Med | DONE | Already a major differentiator |
| Heart-Wall progress across sessions | Unique to Emotion Code methodology. No generic tool tracks this | Med | DONE | Cross-session continuity |
| Reporting dashboard (6 KPIs) | Most note-taking apps don't aggregate data into practice insights | Med | DONE | Total clients, sessions, averages |
| Copy-to-clipboard (Markdown export) | Quick session summaries for client communication without manual formatting | Low | DONE | Per-field and full session copy |
| Truly offline / local-only | In a world of cloud-first tools, "your data never leaves your device" is a privacy statement and selling point | Low | DONE | Core architecture decision |
| 4-language support (Hebrew RTL, English, German, Czech) | Broader market than any niche competitor | High | TODO | Requires careful i18n with clinical terminology |
| Expanded client types (Adult/Child/Animal/Other) | Reflects real practitioner diversity — many work with animals or children specifically | Low | TODO | |
| Session fields for Limiting Beliefs, Additional Techniques | Body Code practitioners use these concepts daily, no generic tool supports them | Low | TODO | Pending field consolidation with Sapir |
| Daily greeting with inspirational quotes | Personal touch that makes the app feel like a companion, not just a tool | Low | TODO | Time-of-day greeting |
| Referral source tracking | Helps practitioners understand where clients come from — basic business intelligence | Low | TODO | Simple dropdown or text field |
| Client progress visualization | Visual charts showing severity improvement over time per client | High | NOT PLANNED | Would be high-impact but significant work |
| Session type tracking (In-person/Proxy/Surrogate) | Unique to energy healing — proxy and surrogate sessions are a key modality concept | Low | DONE | |
| Zero dependencies / tiny payload (~50KB) | Instant load, works on any device, no build tooling needed | Low | DONE | Architectural advantage |
| Inline client creation during session | Workflow optimization — don't break the session-adding flow | Low | DONE | |

**Assessment:** The per-issue severity tracking and Heart-Wall features are genuine differentiators that no general-purpose tool offers. The offline/privacy angle is also increasingly valued. The planned 4-language support widens the addressable market significantly.

---

## Anti-Features

Features to explicitly NOT build. These seem tempting but would harm the product.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Cloud sync / multi-device sync | Destroys the privacy value proposition, adds GDPR processor obligations, requires backend infrastructure, ongoing hosting costs | Keep local-only. Offer JSON export/import for manual device transfer |
| User accounts / authentication | No backend = no auth needed. Adds complexity for zero benefit in a local app | The app is single-user by design. Disclaimer acceptance is sufficient |
| Scheduling / calendar | Scope creep into practice management territory. Competing with SimplePractice ($29/mo) is not the goal | Stay focused on session documentation. Practitioners already have calendars |
| Billing / invoicing | Same scope creep problem. Billing is a regulated domain (tax compliance, receipts) that varies by country | Out of scope. Practitioners use separate invoicing tools |
| Telehealth / video calls | Massive technical undertaking, requires infrastructure, competing with Zoom | Practitioners already use Zoom/Skype. Not our problem to solve |
| Insurance claims / superbills | Emotion Code practitioners generally don't bill insurance. This is mainstream therapy tooling | Not relevant to target market |
| AI-generated session notes | Trendy but risky — AI hallucination in clinical documentation is a liability. Also requires cloud/API calls | Manual notes are more appropriate for this modality where precision matters |
| IP address collection | The Lovable app did this (ipify.org API call). Privacy violation, GDPR concern, zero benefit | Remove entirely. No external API calls |
| Client portal / client-facing features | Adds complexity, security surface, and moves away from practitioner-only tool | This is the practitioner's private workspace, not a shared platform |
| Complex treatment plan templates (SOAP, DAP, etc.) | These are for licensed mental health professionals. Emotion Code has its own workflow | Keep modality-specific fields. Don't mimic clinical EHR templates |
| Wearable data integration | Interesting but massive scope. Requires APIs, cloud connectivity, device-specific code | Stay focused on manual session documentation |

**Assessment:** The biggest temptation will be scope creep toward "practice management." The app's strength is its simplicity and focus. Every feature added should serve the session documentation use case, not try to become SimplePractice-lite.

---

## Feature Dependencies

```
Design Overhaul ──→ Dark Mode (dark mode needs the new CSS custom properties system)
                ──→ Daily Greeting (needs to fit the new design language)

Session Field Consolidation ──→ Additional Session Fields (can't add new fields until data model is finalized)
                            ──→ i18n Consolidation (field names must be finalized before translating)

Legal Disclaimer ──→ Production Packaging (disclaimer must be in place before selling)

i18n Consolidation ──→ Production Packaging (all 4 languages must work before launch)

Client Search ──→ (independent, can be built anytime)
Backup Reminder ──→ (independent, can be built anytime)
Expanded Client Types ──→ (independent, can be built anytime)
Referral Source ──→ (independent, can be built anytime)

All Features ──→ QA & Testing ──→ Production Packaging
```

---

## MVP Recommendation

The app already IS a functional MVP. The question is: what's needed to make it **sellable**?

**Must ship before selling (Priority 1):**
1. **Professional design overhaul** — current design works but doesn't signal "worth paying for"
2. **Legal disclaimer** — cannot sell health-adjacent software without CYA
3. **Dark mode** — modern expectation, especially for practitioners who work evenings
4. **Client search** — unusable at scale without it
5. **Backup reminder** — local-only data without backup reminders is a data loss lawsuit waiting to happen
6. **4-language i18n** — unlocks German and Czech markets (Hebrew and English already done)

**Should ship but not blocking (Priority 2):**
7. Expanded client types (Adult/Child/Animal/Other)
8. Additional session fields (Limiting Beliefs, Additional Techniques, etc.)
9. Referral source tracking
10. Daily greeting with quotes

**Defer to post-launch (Priority 3):**
11. Client progress visualization / charts
12. PDF export of session summaries
13. Session templates / quick-fill patterns

**Why this order:** Design and legal are hard gates — you cannot sell without them. Dark mode and search are expected by paying users. Backup reminder is a liability mitigation. i18n unlocks markets. Everything else enhances but doesn't block sales.

---

## Competitive Landscape Summary

| Competitor Category | Examples | Price | How We Differ |
|---------------------|----------|-------|---------------|
| Full practice management | SimplePractice, Jane App, TherapyNotes | $29-79/mo subscription | We're simpler, cheaper (one-time), offline, privacy-first |
| Holistic practice platforms | Heallist, Practice Better, ClinicSense | $25-65/mo subscription | We're modality-specific (EC/BC), no cloud dependency |
| Generic note-taking | Notion, Google Docs, paper | Free-$10/mo | We're purpose-built with clinical fields, reporting, structured data |
| Direct competitors (EC/BC specific) | **None found** | N/A | We ARE the first mover in this niche |

**Key insight:** There is no dedicated Emotion Code / Body Code session management software on the market. Practitioners improvise with generic tools. This app fills a genuine gap. The risk is not competition — it's whether the niche is large enough to sustain sales (Discover Healing certifies practitioners globally, so the market exists).

---

## Sources

- [SimplePractice](https://www.simplepractice.com/) - Feature reference for practice management standard
- [Jane App](https://jane.app/guide/jane-vs-simplepractice) - Feature comparison and holistic practitioner support
- [Heallist](https://www.heallist.com/holistic-practitioner-software) - Holistic practitioner platform features
- [Noterro](https://www.noterro.com/features/exporting-patient-data) - Data export patterns
- [Discover Healing](https://discoverhealing.com/) - Emotion Code / Body Code practitioner ecosystem
- [Therasoft](https://therasoft.com/best-practice-management-software-therapists/) - Practice management comparison
- [Practice Better](https://practicebetter.io/blog/holistic-health-practice-solutions) - Holistic practice solutions
- [Capterra Therapy Software](https://www.capterra.com/therapy-software/) - Market overview
