---
created: 2026-05-13T00:00:00.000Z
title: Modality templates — predefined section starter sets (Emotion Code, CBT, somatic, art therapy)
area: feature
priority: low
recommended_entry: /gsd-spec-phase
target_phase: post-launch (lower priority per Ben 2026-05-13)
files:
  - settings.html
  - assets/settings.js
  - assets/i18n-en.js
  - assets/i18n-he.js
  - assets/i18n-de.js
  - assets/i18n-cs.js
source: spun out from 2026-04-26-editable-session-section-titles.md after Ben's 2026-05-13 review
---

## Problem

The app's session form is currently structured around Emotion Code / Body Code terminology (Sapir's modality). Therapists from other modalities (CBT, somatic, body psychotherapy, art therapy) currently have to manually rename every section to match their vocabulary. A modality template system would let them pick a starter set with one click and customize from there.

## Fix

Ship modality templates that can be applied from the Settings page:

- **Emotion Code / Body Code** (current default)
- **CBT** (Cognitive Behavioral Therapy) — e.g., "Automatic thoughts", "Cognitive distortions", "Behavioral experiments", "Homework"
- **Somatic / body-based** — e.g., "Body scan", "Sensations", "Movement", "Felt sense"
- **Art therapy** — e.g., "Session imagery", "Material used", "Themes emerged", "Symbolic content"
- **Generic talk therapy** — minimal, modality-neutral

Applying a template replaces the current section labels (rename + reorder) with the template's set. User can then customize freely on top.

## Design questions for spec-phase

1. **Template format** — JSON config file shipped with the app? Or extensibility for users to import/share their own templates?
2. **Application semantics** — does applying a template wipe existing customizations? Confirm dialog?
3. **Migration of existing sessions** — old sessions stored against current keys. What happens visually when a therapist switches modality?
4. **Localization** — templates ship in all 4 languages, or English-only with user translates?
5. **Onboarding integration** — should "Pick your modality" appear during first-run / signup, or only later in Settings?
6. **Custom field types** — Emotion Code uses severity scales; some modalities don't need numeric ratings. Do templates also configure field types or just labels?

## Origin

Spun out from the broader "editable session section titles" ask. Ben marked this as LOWER priority on 2026-05-13 — ship after Phase 24 + drag-sort.

## Why low priority

- Current rename functionality already lets practitioners adapt manually (just slower).
- Sapir's specific modality is the default — primary user is already served.
- Expanding addressable market is a v2+ concern, not v1.1 launch.
