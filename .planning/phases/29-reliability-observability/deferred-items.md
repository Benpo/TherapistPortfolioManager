# Phase 29 — Deferred / Manual-Verification Items

## 29-03 — D-06 mailto field-verification (human-check, on-device)

**What:** The OBS-02 report screen's "Open email to support" button uses a
`mailto:` handoff (`assets/report.js` → `openSupportEmail()`), with a short
"paste below this line" body only (the full log travels via Copy report).

**Why deferred:** Per the 29-UI-SPEC (Open Q3) and the plan's D-06 degradation
clause, `mailto:` reliability inside an *installed PWA* must be field-verified on
a real device (Phase 28 field-verification lesson). A sequential build agent has
no installed-PWA device to test on.

**Built-in safety:** `report.js` already ships the degradation path —
`degradeToVisibleAddress()` reveals the visible support address
(`contact@sessionsgarden.app`, in `#reportSupportAddress`) and hides the email
button. The behavior test asserts BOTH the mailto path and the degraded path.

**Action for Ben (on a real installed PWA — iOS/Android/desktop):**
1. Install/open Sessions Garden as a PWA.
2. Settings → "Report a problem" → tap "Open email to support".
3. Confirm the device's mail client opens with the correct recipient + subject.
   - If it opens correctly → no change needed.
   - If it fails / does nothing → flip the report screen to copy-only by
     un-hiding the `.report-support-fallback` block (and calling
     `degradeToVisibleAddress()` on load), so the address is always visible.

Status: OPEN (manual on-device check)
