# Help-Content Inventory (D-13)

**Created:** 2026-06-29 · **Phase:** 32 (README + Code Comments) · **Status:** seed artifact (not shipped) · **Language:** EN-only

This is an **inventory only** — a topic/workflow tree, **not help copy**. Each leaf is a *title +
one-line intent* mapped to a real feature/page and tagged. Writing the actual help text is the
**future help/onboarding phase's** job. This artifact **extends the Phase 26 (P26) workflow spine**
and **seeds that future phase** with a grounded, deduped topic list.

It organizes topics along the **P26 7-step workflow spine** (the treatment/session loop is the
organizing principle, per P26 D-03), with the **flagship personalization** story led early and a
**parallel technical-tips track**, exactly as P26 specified. EN-only (P26 D-12: EN filled first).

> **Demo excluded.** `demo.html` / `demo-hints.js` / `demo-seed.js` are **stale** and are **NOT a
> topic source** (D-13, RESEARCH Pitfall 5). The demo's *rendering pattern* may inform a future
> tour build, but never the topic list. It appears below only as a named exclusion.

## Method (how this inventory was produced)

Synthesized from **four persona lenses + one grounded feature-coverage auditor + one synthesizer**
(~6 lenses, per D-13), run as structured reasoning:

- **Persona lenses** (each proposes the topics/questions its persona needs):
  - **N — Struggling novice** ("stupid user"): non-technical, easily lost, needs the basics and reassurance.
  - **T — Trainer / onboarder**: getting a new therapist productive end-to-end, fast.
  - **P — Power user**: shortcuts, bulk flows, the non-obvious features.
  - **D — Domain expert** (Sapir-like): clinically-correct framing, Heart Shield / severity-reversal nuance.
- **Feature-coverage auditor** (grounded): walked the live app pages and ensured every real
  interactive feature has a topic.
- **Synthesizer**: deduped persona + auditor output into the single tree below; resolved each leaf's tags.

**Tag schema (per leaf):** `{ persona source · P26 status · suggested format · priority }`
- **persona source** — which lens(es) surfaced it: N / T / P / D (or "auditor" if only the feature-coverage walk surfaced it).
- **P26 status** — relationship to the P26 contract: *in-spine* (a P26 tour-spine step) · *tech-track* (P26 technical-tips track) · *empty-state* (P26 empty-state deep-link leg) · *welcome* (P26 welcome overlay) · *new* (real feature with no explicit P26 topic — this inventory adds it).
- **suggested format** — *tour step* | *FAQ* | *page section* (a Help-page section).
- **priority** — **P1** (first-run critical path) · **P2** (important, not blocking) · **P3** (edge / advanced).

## Sources / Grounding

Topics are grounded **only** in the current live app and the P26 contract:

- **Live app pages** (the auditor's walk; confirmed via `ls *.html`): `index.html` (overview),
  `sessions.html`, `add-client.html`, `add-session.html`, `settings.html`, `reporting.html`,
  `report.html`, `landing.html`, **`license.html`** (activation / trial).
- **Refreshed codebase maps** — `.planning/codebase/{STRUCTURE,ARCHITECTURE,CONVENTIONS,TESTING}.md` (2026-06-28).
- **`.planning/REQUIREMENTS.md`** — the feature set topics are mapped against.
- **The P26 7-step workflow spine + standalone Help-page design** — `26-UI-SPEC.md` + `26-RESEARCH.md` §Content Architecture.

**Not a topic source:** `demo.html` / `demo-hints.js` / `demo-seed.js` (stale — excluded, see above).
**Correctly non-topics (static legal text, not interactive features):** the legal pages
`datenschutz*.html`, `impressum*.html`, `disclaimer*.html` (all language variants). They are
linked chrome, not help topics.

---

## The topic tree

### 0. Welcome & orientation (P26 welcome overlay + Help entry)

| Topic (title) | One-line intent | Mapped feature / page | persona · P26 · format · priority |
|---------------|-----------------|------------------------|------------------------------------|
| Welcome to your garden | What Sessions Garden is and why it's private/offline — the value, not a feature list | Welcome overlay (P26) / `landing.html` value prop | N,T · welcome · page section · **P1** |
| Finding help anytime | The "?" affordance + Help page are always reachable; the tour is replayable | "?" entry (P26) / Help page | N · welcome · FAQ · **P1** |
| How this guide is organized | The session loop is the spine; technical bits are a parallel track | Help page IA (P26) | T · welcome · page section · **P2** |

### 1. Add a client (spine step 1)

| Topic (title) | One-line intent | Mapped feature / page | persona · P26 · format · priority |
|---------------|-----------------|------------------------|------------------------------------|
| Adding your first client | Inline-create vs. the full Add Client form | `add-client.html`, `index.html` | N,T · in-spine · tour step · **P1** |
| Choosing a client type | Adult / Child / Animal / Other and what changes | `add-client.html` | T,D · in-spine · page section · **P2** |
| Adding a client photo | The energetic-connection rationale for remote work; how to crop | `add-client.html`, `crop.js` | D,P · in-spine · page section · **P3** |
| No clients yet — where to start | Empty overview → deep-link into "Adding a client" | `index.html` empty state (`overview.clients.empty`) | N · empty-state · FAQ · **P1** |

### 2. Start a session (spine step 2)

| Topic (title) | One-line intent | Mapped feature / page | persona · P26 · format · priority |
|---------------|-----------------|------------------------|------------------------------------|
| Starting a session | "New session" from the client card vs. the Add Session route | `sessions.html`, `add-session.html` | N,T · in-spine · tour step · **P1** |
| The pre-session context card | What the at-a-glance context before a session shows you | `add-session.html` | D,P · in-spine · page section · **P2** |
| Finding a client's past sessions | The session list per client, search and scan | `sessions.html` | N,T · in-spine · page section · **P2** |

### 3. Capture emotions — quick-paste (spine step 3)

| Topic (title) | One-line intent | Mapped feature / page | persona · P26 · format · priority |
|---------------|-----------------|------------------------|------------------------------------|
| Capturing emotions fast | The quick-paste speed story for recording emotions mid-session | `add-session.html` | N,T,D · in-spine · tour step · **P1** |
| Using snippets to type less | Reusable text snippets while writing a session | `add-session.html`, `snippets.js` | P · in-spine · page section · **P2** |

### 4. Heart Shield workflow (spine step 4)

| Topic (title) | One-line intent | Mapped feature / page | persona · P26 · format · priority |
|---------------|-----------------|------------------------|------------------------------------|
| The Heart Shield workflow | What the session-level Heart Shield (מגננת הלב) field is and how to use it | `add-session.html` | D · in-spine · tour step · **P1** |
| Tracking Heart Shield removal | Removal tracking and how status is computed from the session scan | `add-session.html`, `overview.js` | D,P · in-spine · page section · **P2** |

### 5. Severity tracking (spine step 5)

| Topic (title) | One-line intent | Mapped feature / page | persona · P26 · format · priority |
|---------------|-----------------|------------------------|------------------------------------|
| Rating severity before & after | The 0–10 before/after scale per issue | `add-session.html` | N,D · in-spine · tour step · **P1** |
| Tracking multiple issues | Several issues in one session | `add-session.html` | D,P · in-spine · page section · **P2** |
| Understanding reversal | The non-obvious reversal case in severity tracking | `add-session.html` | D · in-spine · FAQ · **P2** |
| Reading a finished session | Read-mode vs. edit-mode for a saved session | `add-session.html` | N,P · in-spine · page section · **P3** |

### 6. Finish: review & export (spine step 6)

| Topic (title) | One-line intent | Mapped feature / page | persona · P26 · format · priority |
|---------------|-----------------|------------------------|------------------------------------|
| Reviewing & finishing a session | Wrap up and review what you recorded | `add-session.html` | N,T · in-spine · tour step · **P1** |
| Exporting a single session | Send to your client / file in your own records (PDF, markdown) | `export-modal.js`, `pdf-export.js` | N,T,D · in-spine · page section · **P1** |
| Choosing an export format | PDF vs. markdown vs. ZIP and when to use each | `export-modal.js` | P · new · FAQ · **P2** |

### 7. Back to overview (spine step 7)

| Topic (title) | One-line intent | Mapped feature / page | persona · P26 · format · priority |
|---------------|-----------------|------------------------|------------------------------------|
| Reading your dashboard | What the overview KPIs tell you | `index.html`, `overview.js` | T,P · in-spine · tour step · **P2** |
| Searching & filtering clients | Find clients fast; filter the overview | `index.html` | P · in-spine · page section · **P2** |
| Reporting & analytics | The reporting views across clients/sessions | `reporting.html`, `reporting.js` | P,D · new · page section · **P3** |

### Flagship: Making Sessions Garden yours (personalization — led early, P26 D-04)

| Topic (title) | One-line intent | Mapped feature / page | persona · P26 · format · priority |
|---------------|-----------------|------------------------|------------------------------------|
| Making Sessions Garden yours | Turn session sections on/off and rename them to match your own workflow | `settings.html`, `settings.js` | D,P · in-spine · page section · **P1** |
| Managing your snippets | Create/edit reusable snippets in Settings | `settings.html`, `settings-snippets.js` | P · tech-track · page section · **P2** |
| Managing photos & storage | The photos tab; storage usage awareness | `settings.html`, `settings-photos.js` | P · tech-track · page section · **P3** |

### Technical-tips track (parallel section — P26 D-05/D-06)

| Topic (title) | One-line intent | Mapped feature / page | persona · P26 · format · priority |
|---------------|-----------------|------------------------|------------------------------------|
| Why backups matter | Local-only means you are the only backup | `settings.html`, `backup.js` | N,T,D · tech-track · page section · **P1** |
| Backing up & restoring | Export / Import / encrypted backup flow + the cloud-icon recency signal | `settings.html`, `backup.js`, `backup-modal.js` | T,P · tech-track · page section · **P1** |
| Exporting to PDF | Per-session document export, bidi-aware | `pdf-export.js`, `export-modal.js` | N,P · tech-track · FAQ · **P2** |
| Installing the app (per browser) | Chrome/Edge install icon; iOS Safari Share → Add to Home Screen; Android menu | PWA install (`sw.js`, `manifest.json`) | N,T · tech-track · page section · **P1** |
| Data never leaves your browser | The privacy/offline core value made legible — the emotional anchor | App-wide value prop | N,D · tech-track · page section · **P1** |
| Working offline | What still works with no internet, and why | `sw.js` (service worker) | N · tech-track · FAQ · **P2** |

### License & trial (license.html — real interactive feature area; auditor-required, G3)

| Topic (title) | One-line intent | Mapped feature / page | persona · P26 · format · priority |
|---------------|-----------------|------------------------|------------------------------------|
| Activating your license | Enter a license key to unlock the app (needs internet once) | `license.html`, `license.js` | N,T · new · page section · **P1** |
| What the trial allows | What you can do before activating, and what happens when the trial/activation lapses | `license.html`, `landing.html` | N · new · FAQ · **P1** |
| Moving to a new computer | The 2-device activation limit; deactivate-before-transfer | `license.html`, `license.js` | N,P · tech-track · FAQ · **P2** |
| Re-activating after a problem | What "needs re-activation" means and how to fix it | `license.html`, `license.js` | N · new · FAQ · **P2** |
| Buying a license | Where to purchase if you don't have a key | `license.html`, `landing.html` | N,T · new · FAQ · **P3** |

### Troubleshooting (technical track close-out — P26 troubleshooting)

| Topic (title) | One-line intent | Mapped feature / page | persona · P26 · format · priority |
|---------------|-----------------|------------------------|------------------------------------|
| "I don't see my clients" | Cleared cache / switched browser → data hidden vs. truly lost decision tree | `index.html`, `db.js` | N,T · tech-track · FAQ · **P1** |
| Reporting a problem | Copy the diagnostic / error log to paste into a support email (nothing auto-sent) | `settings.html`, `report.html`, `crashlog.js` | N,P · new · FAQ · **P2** |
| Recovering from a failed update | The "reset & recover" escape hatch if a migration fails | `db.js`, `report.html` | P,D · new · FAQ · **P3** |

---

## Coverage cross-check (auditor)

Every live app page's real features are represented above:

| Live page | Represented by |
|-----------|----------------|
| `index.html` (overview) | §0, §1 (empty state), §7, Troubleshooting |
| `add-client.html` | §1 |
| `sessions.html` | §2 |
| `add-session.html` | §2–§6 |
| `settings.html` | Flagship, Technical-tips, Troubleshooting |
| `reporting.html` | §7 |
| `report.html` | Troubleshooting (report a problem / recover) |
| `landing.html` | §0, License & trial |
| `license.html` | License & trial (activation, trial, transfer, re-activation, purchase) |

**Excluded as non-topics (correct):** `datenschutz*.html`, `impressum*.html`, `disclaimer*.html`
(static legal text). **Excluded as a topic source (stale):** `demo.html` / `demo-hints.js` /
`demo-seed.js`.

This tree is the ready seed for the future help/onboarding phase: it can write `help.*` copy
directly against each leaf, knowing the topic, its place in the P26 spine, its format, and its priority.
