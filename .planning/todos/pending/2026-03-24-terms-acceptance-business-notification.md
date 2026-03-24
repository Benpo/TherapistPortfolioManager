---
title: Send terms acceptance confirmation to business
priority: medium
source: UAT Phase 19
created: 2026-03-24
---

## Issue

When a user accepts Terms & Conditions, we only store it in localStorage on their device. The business (Sapir) has no record of this acceptance — no email, no webhook, no log.

## Options

1. **Webhook to n8n** — On acceptance, POST to an n8n webhook with: timestamp, language, license key (if available). n8n stores it and optionally sends email notification.
2. **Email via mailto** — Trigger a mailto link with pre-filled acceptance details (requires user action).
3. **Lemon Squeezy metadata** — Attach acceptance timestamp to the license activation API call (only works at activation time, not at TOC acceptance time).

## Recommended

Option 1 (webhook) — most reliable, fully automated, creates auditable record. Can be implemented when n8n infrastructure is ready.
