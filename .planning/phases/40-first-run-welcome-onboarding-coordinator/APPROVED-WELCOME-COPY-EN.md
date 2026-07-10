# Approved EN welcome-overlay copy (Ben, 2026-07-08)

Ben approved **Option C**. Use these EXACT strings for the Phase 40 gap-closure
welcome-copy fix. EN only — HE/DE/CS deferred to Phase 42.1.

- `help.welcome.title` (unchanged): `Welcome to your garden`

- `help.welcome.subtitle` (paragraph 1):
  `Sessions Garden brings your whole practice into one calm, simple space — clients, sessions, and notes, all where you expect them. It's built to feel effortless day to day, so the tool disappears and the work comes forward.`

- `help.welcome.subtitle2` (paragraph 2 — NEW key):
  `Everything you enter stays private on this device. No accounts, no cloud, no one else in the room — just your practice, kept safely in your own hands.`

Render both as separate `<p>` elements via data-i18n + textContent (never
innerHTML — XSS boundary T-40-03). Keep the existing overlay layout + CTAs.
