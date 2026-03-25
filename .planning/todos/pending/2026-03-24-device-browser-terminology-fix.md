---
title: Fix "device" terminology — explain browser-based activation limits
priority: high
source: Phase 19 discuss-phase session
created: 2026-03-24
---

## Problem

The app uses "device" terminology for license activation limits, but the 2-activation limit is actually per browser, not per device. A user could install Chrome and Firefox on the same laptop and burn both activations. This needs to be communicated clearly.

## Scope

- License page: activation form, error messages, deactivation confirmation
- Landing page: pricing/feature description if it mentions device limits
- Lemon Squeezy product description
- Disclaimer/Terms if activation limits are mentioned
- Post-purchase email template

## Key message to convey

Each browser counts as a separate activation. Installing on 2 different browsers on the same computer uses both activations. Users should pick ONE browser per device.

## Origin

Discovered during Phase 19 discuss-phase — Ben noticed the gap between "2 devices" language and browser-based reality.
