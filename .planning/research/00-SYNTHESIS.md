# Research Synthesis: Taking the Therapist Portfolio Manager to the Next Step

**Date:** 2026-02-19
**Four research perspectives:** Legal, UX, Architecture, Tech/Maintainability

---

## The Big Picture

You have a well-built, small (~4,100 lines) HTML/JS app that your wife uses locally. A group of ~10-20 fellow Emotion Code practitioners want it too. The question is: what's the best way to deliver it to them?

Four independent research agents analyzed this from different angles. Here's where they **agree** and where they **diverge**.

---

## Where All Four Perspectives Agree

### 1. Data stays local = legally simplest

The legal research is unambiguous: this app handles **GDPR Article 9 "special category" health data**. The moment you host it as a SaaS, you become a data processor with significant obligations (DPAs, breach notification, potential C5 attestation at EUR 50k-150k+). Keeping data on each user's device means **zero GDPR processor obligations** for you.

### 2. SaaS is overkill right now

All four perspectives flag SaaS as high-effort relative to the need:
- **Legal**: Highest compliance burden
- **UX**: Privacy concerns for this user base; requires internet
- **Architecture**: Medium-high effort; you become data custodian
- **Tech**: Requires auth, backend, hosting, backups, security hardening

### 3. These users need simple, mobile-friendly access

The UX research emphasizes: therapists work on phones/tablets, often without reliable internet, and have low-moderate technical literacy. Any solution must be zero-config from the user's perspective.

### 4. Your Python strength matters

The tech research consistently recommends leveraging Python (Django) when a backend is needed, rather than learning Rust (Tauri) or a JS framework.

---

## Where the Perspectives Diverge

### The key tension: PWA now vs. Django SaaS later

**Architecture + UX perspective:** Start with a PWA. It's 2-4 hours of work, reuses 98% of the existing code, gives offline + mobile + zero-install distribution, and keeps data local. Do Django later only if users need multi-device sync.

**Tech/Maintainability perspective:** Go straight to Django + HTMX + SQLite. The argument: IndexedDB is fragile (browser can clear it), there's no backup, no auth, and the vanilla JS is already showing strain at 848 lines in the largest file. A proper backend solves all of this and the migration effort is 4-8 weeks.

**Legal perspective:** Supports the local-data approach (PWA or desktop) as lowest-risk, but notes that even the local app needs improvements (encryption, PIN protection, consent tracking) to be properly compliant.

### The honest tradeoff

| Approach | Time to Distribute | Data Safety | Legal Burden | Growth Path |
|----------|-------------------|-------------|--------------|-------------|
| **PWA (quick)** | Days | IndexedDB (fragile) | Minimal | Add backend later |
| **Django SaaS (thorough)** | 4-8 weeks | SQLite + backups | Moderate (DPA needed) | Ready for growth |
| **PWA now + Django later** | Days now, weeks later | Improves over time | Minimal now | Best of both worlds |

---

## Recommended Path: Two Phases

### Phase 1: PWA (This Week)
**Goal:** Get the app into therapists' hands immediately.

- Add `manifest.json` + service worker (2-4 hours of work)
- Deploy to Netlify/Vercel (free, 30 minutes)
- Share URL via WhatsApp group
- Add basic improvements: PIN/password screen, encrypted exports, `StorageManager.persist()` for data durability

**Why now:** The group wants this now. A PWA gets it to them in days, not months. Data stays local = zero legal burden for you. It works offline and on mobile.

**Limitations accepted:** IndexedDB is per-browser/per-device. No multi-device sync. No server backup. Users must use export/import for backups and device transfers.

### Phase 2: Django Backend (When Ready)
**Goal:** Graduate to a proper multi-user app with real data safety.

- Django + HTMX + Alpine.js + SQLite + Litestream
- Migrate page-by-page (existing CSS carries over)
- Auth, data isolation, encrypted fields, automated backups
- Host on Railway ($5-10/month)
- i18n converts from your JS dictionary to Django `.po` files

**When to start:** After the PWA is running and you've gathered user feedback. Maybe 1-3 months from now. The feedback will tell you whether users need multi-device, what features they're missing, and whether the PWA's limitations matter in practice.

**Important:** Phase 2 is a **migration**, not a restart. Your HTML, CSS, and UX design carry over. The Django templates will look very similar to your current HTML pages.

---

## Legal Checklist (Both Phases)

Regardless of which deployment model, provide these to your therapist users:

| Item | Phase 1 (PWA) | Phase 2 (Django) |
|------|---------------|-----------------|
| German privacy notice template for clients | Yes | Yes |
| Records of Processing Activities template | Yes | Yes |
| Explicit consent language template | Yes | Yes |
| Data export (portability) | Already exists | Yes |
| Data deletion per client | Add to app | Yes |
| App-level PIN/password | Add to app | Django auth |
| Client-side encryption | Add (Web Crypto API) | Server handles it |
| Data Processing Agreement (DPA) | Not needed | Yes (with each therapist) |
| Consult a Datenschutzanwalt | Recommended (EUR 500-2k) | Strongly recommended |

---

## What NOT to Do

1. **Don't build a SaaS first.** The legal burden alone (DPAs, potential C5 attestation) is disproportionate to the need.
2. **Don't use Electron.** It doesn't solve the mobile problem, and it's absurdly heavy for this app.
3. **Don't adopt CRDTs/local-first sync.** Solves a problem you don't have (collaboration). Your users each have their own isolated data.
4. **Don't learn Rust for Tauri.** If you need a desktop app, PyWebView uses Python.
5. **Don't add analytics/tracking.** It contradicts the privacy trust that makes this app appealing.
6. **Don't over-engineer.** 10-20 users, 2 data tables, ~5,000 rows/year. Keep it simple.

---

## Research Files

| File | Perspective |
|------|------------|
| `01-legal-compliance.md` | GDPR, German law, health data classification, compliance by deployment model |
| `02-ux-deployment.md` | User profiles, device usage, onboarding, deployment friction analysis |
| `03-architecture.md` | SaaS vs Desktop vs PWA vs Local-First vs Self-Hosted comparison |
| `04-tech-maintainability.md` | Stack choices, Django recommendation, security, CI/CD, costs |
