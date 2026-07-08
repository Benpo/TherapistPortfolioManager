# Deferred from Phase 40 UAT (2026-07-08)

Phase 40 gap-closure updated the EN welcome-overlay + menu copy. The HE/DE/CS
translations for the CHANGED strings were explicitly deferred here (Ben's call:
"EN now, translations in 42.1").

## Confirmed state after Phase 40-08 gap-closure landed (2026-07-08)

The EN key shape is now FINALIZED — Phase 42.1 no longer has to guess:

- `help.welcome.subtitle` (P1) — value-first paragraph, EN live:
  "Sessions Garden brings your whole practice into one calm, simple space — clients,
  sessions, and notes, all where you expect them. It's built to feel effortless day
  to day, so the tool disappears and the work comes forward."
- `help.welcome.subtitle2` (P2, NEW key) — privacy-softened paragraph, EN live:
  "Everything you enter stays private on this device. No accounts, no cloud, no one
  else in the room — just your practice, kept safely in your own hands."
- `help.entry.replayWelcome` — EN renamed from "Replay welcome" → "Onboarding screen".

### What HE/DE/CS currently hold (all still awaiting 42.1)

- `help.welcome.subtitle2` — present in he/de/cs as an EMPTY-string parity stub
  (`""`, marked "Phase 42.1: translation pending"). The overlay's second `<p>`
  mounts only on a non-empty resolved value, so non-EN locales show NO second
  paragraph until the real translation lands.
- `help.welcome.subtitle` — still the OLD single-sentence privacy wording in each
  locale (NOT the new value-first P1). Must be re-translated to the P1 meaning.
- `help.entry.replayWelcome` — still the OLD literal "replay welcome" phrasing in
  each locale. Must be re-translated to the "Onboarding screen" meaning.

## Exact Phase 42.1 to-do (HE/DE/CS)

1. Re-translate `help.welcome.subtitle` to the new value-first P1 wording.
2. Author `help.welcome.subtitle2` (P2 privacy) — replace the empty stub.
3. Re-translate `help.entry.replayWelcome` to match "Onboarding screen".

## Register/formality reminders (per 40-UI-SPEC / D-05)
- HE: noun/infinitive register (no imperative "you"); RTL.
- DE: Sie form.
- CS: formal register.

Verify parity + no-emoji with the existing i18n automation gate once translated.
