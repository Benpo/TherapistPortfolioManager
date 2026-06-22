---
phase: 22-session-workflow-loop-pre-session-context-card-editable-sess
plan: 22-15
parent_phase: 22
title: Backup encryption UX pair (skip-confirm + password feedback)
type: execute
wave: 1
depends_on:
  - 22-12
files_modified:
  - assets/backup.js
  - assets/app.css
  - assets/i18n-en.js
  - assets/i18n-de.js
  - assets/i18n-he.js
  - assets/i18n-cs.js
autonomous: true
gap_closure: true
requirements: [N11, N12]
tags:
  - round-3
  - backup
  - encryption
  - privacy
  - ux-fixes
  - gap-closure
  - i18n
  - rtl
  - a11y
must_haves:
  truths:
    - "Backup export without encryption (Skip Encryption path) requires explicit user confirmation — not allowed silently."
    - "Backup encryption password fields give the user actionable feedback when validation fails — visible mismatch error, complexity rules shown up-front, no silent dead-end."
  artifacts:
    - path: "assets/backup.js"
      provides: "_showPassphraseModal() gains: (a) a two-pane in-modal confirm flow for the Skip Encryption button — entry pane (existing DOM) swaps to a destructive skip-confirm pane on first click, second click on the destructive primary calls opts.onSkip(); (b) a new mismatch error path inside validate() that fires when both inputs have content AND v1 is strong AND v1 !== v2 (weakness errors keep precedence); (c) a static .passphrase-rules hint block rendered between the warning text and input1 in encrypt mode only (decrypt mode hides it), mirroring isWeakPassphrase()'s three rules exactly. The Escape-key handler branches by active pane: Escape on the confirm pane returns to the entry pane (no resolve); Escape on the entry pane keeps the existing abort behaviour (opts.onCancel()). The X close button on either pane keeps the existing abort behaviour. The three-state resolve sentinel (true | false | 'cancel') from 22-12 is preserved unchanged — opts.onSkip() still resolves false, opts.onCancel() still resolves 'cancel', opts.onConfirm(passphrase) still resolves true."
      contains: "passphrase-skip-confirm"
    - path: "assets/app.css"
      provides: "Two new rules appended to the existing passphrase-modal block (currently L2000–2155). (a) .passphrase-rules — static hint block: 14px / 600 heading + 14px / 400 list items, line-height 1.4, padding 0.5rem 1rem, background tied to the existing --color-warning-bg / --color-warning-text tokens (matching .passphrase-irreversible at L2064 for visual family), border-radius 0.5rem, list bullets via padding-inline-start (logical, RTL-safe). (b) .passphrase-skip-confirm — pane wrapper using the same display: flex; flex-direction: column; gap: 1rem; shape the modal already uses, plus a destructive primary button rule .passphrase-skip-confirm .passphrase-btn-destructive that uses var(--color-danger, #ea4b4b) for background and #fff for text (mirroring the existing --color-danger usage at L2092 and the .button.danger pattern at L454). No physical-axis margins or paddings — all logical."
      contains: "passphrase-skip-confirm"
    - path: "assets/i18n-en.js"
      provides: "8 new keys inserted in the backup.passphrase.* block adjacent to the existing entries (L237–252): backup.passphrase.skipConfirm.heading, .skipConfirm.body, .skipConfirm.goBack, .skipConfirm.proceed, .mismatchHint, .rules.heading, .rules.minLength, .rules.notRepeated, .rules.notOnlyDigits. Canonical EN values. Plain ASCII per file convention."
      contains: "backup.passphrase.skipConfirm.heading"
    - path: "assets/i18n-de.js"
      provides: "Same 8 keys with German translations. Plain ASCII where possible; \\u00XX upper-hex escapes for umlauts (ä ö ü ß) per file convention (verified at L239 verschl\\u00FCsseln, L241 R\\u00FCcksetzm\\u00F6glichkeit)."
      contains: "backup.passphrase.skipConfirm.heading"
    - path: "assets/i18n-he.js"
      provides: "Same 8 keys with Hebrew translations. Raw UTF-8 per file convention. Gender-neutral by default — noun/infinitive forms only, consistent with 22-14's אפס→איפוס and 22-14's export-modal precedent. NO female-imperative suffixes (-י) anywhere in the new strings."
      contains: "backup.passphrase.skipConfirm.heading"
    - path: "assets/i18n-cs.js"
      provides: "Same 8 keys with Czech translations. Plain ASCII for Latin chars; \\u00XX upper-hex escapes for diacritics (á č ě í ř š ý ů) per file convention (verified at L237 Vytvo\\u0159te, L240 za\\u0161ifrovan\\u00E1)."
      contains: "backup.passphrase.skipConfirm.heading"
  key_links:
    - from: "assets/backup.js _showPassphraseModal() new skip-confirm pane primary button"
      to: "i18n-{en,de,he,cs}.js backup.passphrase.skipConfirm.proceed AND opts.onSkip()"
      via: "Primary button labelled via _t('backup.passphrase.skipConfirm.proceed'); click handler calls cleanup() then opts.onSkip() — the same call the cancelBtn currently makes directly in encrypt mode. The contract preserved here is: clicking 'Yes, export unprotected' MUST eventually resolve exportEncryptedBackup() with `false` (the skip sentinel from 22-12), not 'cancel'. Reaching this button requires the user to first click Skip Encryption on the entry pane, then click the destructive primary on the confirm pane — two-step gesture."
      pattern: "skipConfirm.proceed"
    - from: "assets/backup.js _showPassphraseModal() new skip-confirm pane secondary button"
      to: "entry pane DOM (restored)"
      via: "Secondary button labelled via _t('backup.passphrase.skipConfirm.goBack'); click handler calls the local swap helper that detaches the confirm pane and re-attaches the entry pane DOM. The input1.value and input2.value live in the existing DOM nodes (not destroyed), so when Go-back swaps the pane back the values are preserved automatically. No resolve fires — the modal stays open."
      pattern: "skipConfirm.goBack"
    - from: "assets/backup.js _showPassphraseModal() new validate() mismatch branch"
      to: "i18n-{en,de,he,cs}.js backup.passphrase.mismatchHint AND errorEl"
      via: "Inside validate(), after the existing weakness check passes (weakness takes precedence), if isEncrypt AND input2 has content AND v1 !== v2: errorEl.textContent = _t('backup.passphrase.mismatchHint'); errorEl.hidden = false; confirmBtn.disabled = true. The existing confirmBtn-click defensive fallback at L251 stays — it uses backup.passphrase.mismatch (the louder error after a confirm-click slip-through), distinct from the new lighter inline hint."
      pattern: "mismatchHint"
    - from: "assets/backup.js _showPassphraseModal() new .passphrase-rules block"
      to: "isWeakPassphrase() rules (L220–226)"
      via: ".passphrase-rules div is appended ONCE inside the isEncrypt branch only, between the warning element and input1. It contains a static <strong>heading + three list items, each tied to a new i18n key (rules.minLength, rules.notRepeated, rules.notOnlyDigits) that mirror the three checks inside isWeakPassphrase() exactly: length < 6 → minLength, /^(.)\\1+$/ → notRepeated, /^\\d+$/ → notOnlyDigits. The block is static — it does NOT update reactively as the user types. The reactive feedback is already provided by errorEl via validate()."
      pattern: "passphrase-rules"
    - from: "assets/backup.js _showPassphraseModal() Escape-key handler (currently L277–283)"
      to: "active-pane state (entry vs. skip-confirm)"
      via: "A module-local `var activePane = 'entry';` is introduced. The swap-to-confirm helper sets activePane = 'confirm'; the swap-back helper resets it to 'entry'. The Escape branch becomes: if (activePane === 'confirm') { swap-back to entry pane; return; } else { cleanup(); opts.onCancel(); } — preserving the existing abort behaviour on the entry pane, adding the new go-back behaviour on the confirm pane. The X close button does NOT consult activePane — it always aborts (calls opts.onCancel()) regardless of pane."
      pattern: "activePane"
---

<objective>
Close 2 round-3 UAT gaps in the backup-encryption flow as one tightly-scoped "backup encryption UX" batch on the way to the Phase 23 PDF rewrite.

**Gap N11 (major / privacy) — Skip-encryption needs explicit confirmation:** Today, clicking "Skip Encryption" on the export-encryption prompt produces an unencrypted `.zip` backup of all therapist client data with a single click — no confirmation, no warning naming the privacy implication. The fix is locked in 22-15-CONTEXT.md D1: an **in-modal two-step confirmation** (not a stacked modal). On first Skip-Encryption click, the modal body swaps to a confirmation pane with a clear warning heading ("Export without encryption?"), body text naming the data-exposure implication, and two buttons — secondary "Go back" (returns to entry pane, preserving typed passwords) and primary destructive "Yes, export unprotected" (calls `opts.onSkip()` exactly as the cancelBtn does today). Escape on the confirm pane goes back to the entry pane; Escape on the entry pane keeps the existing abort behaviour. The X close button on either pane keeps the existing abort behaviour. The three-state resolve sentinel from 22-12 (`true | false | 'cancel'`) is preserved — `onSkip()` still resolves `false`, `onCancel()` still resolves `'cancel'`.

**Gap N12 (major / UX) — Password dialog dead-end:** Today, the encryption password dialog has three layered issues — silent mismatch (two different passwords grey out the button with no error), hidden complexity rules (e.g. `111111111` / `111111111` matches but stays disabled because `isWeakPassphrase()` rejects pure digits — no hint), and no actionable feedback. The fix is locked in 22-15-CONTEXT.md D2 and D3: (a) in `validate()`, when both inputs have content AND v1 is strong AND v1 !== v2, set `errorEl.textContent = _t('backup.passphrase.mismatchHint')` and `errorEl.hidden = false` (weakness errors keep precedence — show weakness first; once v1 is strong, then show mismatch). (b) Add a static `<div class="passphrase-rules">` between the warning text and input1, encrypt mode only, with a heading and three list items mirroring `isWeakPassphrase()` exactly (≥6 chars, not all-same-char, not pure digits). The block is visible at all times in encrypt mode, hidden in decrypt mode.

**Decision 4 (live strength indicator) is explicitly DEFERRED — not in this plan.** D2 + D3 together solve the dead-end UX. A strength indicator would be a separate visual layer; defer to a follow-up if Ben wants it after seeing the result.

Purpose: Close the two privacy / UX gaps in the same dialog flow so Phase 23 (PDF rewrite — the destination) ships against a clean backup-encryption UX, and so a one-click unprotected backup of all client data is no longer reachable from the export-encryption prompt.

Output:
- Updated `assets/backup.js`: `_showPassphraseModal()` gains the two-pane skip-confirm flow (entry pane ↔ confirm pane swap), the validate() mismatch branch (D2), the static rules hint block in encrypt mode (D3), and the Escape-key pane-aware branch. The three-state resolve sentinel (true | false | 'cancel') and the public `_showPassphraseModal({ mode, onConfirm, onCancel, onSkip })` signature are preserved unchanged.
- Updated `assets/app.css`: two new rule blocks appended to the existing passphrase-modal section (`.passphrase-rules`, `.passphrase-skip-confirm` + `.passphrase-btn-destructive`). All values use logical properties — no physical-axis margins/paddings.
- 4 i18n locale files: 8 new keys each (32 string additions total) — EN canonical, DE / HE / CS translated with locale rules: EN plain ASCII; DE plain ASCII + `\u00XX` upper-hex for umlauts; HE raw UTF-8, **gender-neutral by default (noun/infinitive forms, NO female-imperative `-י` endings)**; CS plain ASCII for Latin + `\u00XX` upper-hex for diacritics.

**Manual UAT confirmation required from Ben on both gaps before flipping N11 and N12 to `closed-fixed` in `22-HUMAN-UAT.md`. Sapir's confirmation on the Hebrew strings is a follow-up step that does not block shipping the plan once the hard grep gates pass.**
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-15-CONTEXT.md
@.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-UI-SPEC.md
@.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-PATTERNS.md
@.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-12-data-safety-guards-SUMMARY.md
@.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-14-quick-text-visual-fixes-PLAN.md
@assets/backup.js
@assets/app.css
@assets/i18n-en.js
@assets/i18n-de.js
@assets/i18n-he.js
@assets/i18n-cs.js

## UAT truth statements being closed (verbatim from 22-15-CONTEXT.md)

These are the ONLY two gaps this plan closes. No re-debate.

1. **N11 (Gap N11):** "Backup export without encryption (Skip Encryption path) requires explicit user confirmation — not allowed silently."
2. **N12 (Gap N12):** "Backup encryption password fields give the user actionable feedback when validation fails — visible mismatch error, complexity rules shown up-front, no silent dead-end."

## Locked decisions from 22-15-CONTEXT.md (DO NOT re-litigate)

- **D1 (N11) — Skip-encryption confirmation flow:** In-modal two-step swap (NOT a stacked modal). On Skip Encryption click, swap modal body to a confirmation pane with:
  - Warning heading: `_t('backup.passphrase.skipConfirm.heading')` → "Export without encryption?"
  - Body: `_t('backup.passphrase.skipConfirm.body')` → "The backup file will contain all your client data unprotected. Anyone with access to the file can read it."
  - Secondary "Go back" button → returns to entry pane (typed passwords preserved automatically because the entry pane DOM is not destroyed, just detached + re-attached)
  - Primary destructive "Yes, export unprotected" button → calls `opts.onSkip()` (the same call the cancelBtn currently makes directly in encrypt mode)
  - Escape on confirm pane → swap-back to entry pane (NO resolve)
  - Escape on entry pane → keeps existing abort behaviour (cleanup + opts.onCancel() → resolves `'cancel'`)
  - X close button on either pane → keeps existing abort behaviour
- **D2 (N12 part 1) — Password mismatch error:** In `validate()`, after the weakness check passes, when both inputs have content AND v1 !== v2: `errorEl.textContent = _t('backup.passphrase.mismatchHint')`; `errorEl.hidden = false`; `confirmBtn.disabled = true`. Weakness errors take precedence (if v1 is weak, show weakness first; once v1 is strong-enough, then show mismatch if v1 !== v2). The defensive fallback inside the confirmBtn click handler at L251–260 stays untouched (it uses the louder `backup.passphrase.mismatch`).
- **D3 (N12 part 2) — Complexity rules shown up-front:** Static `<div class="passphrase-rules">` between the warning text and input1, encrypt mode only (hidden / not appended in decrypt mode). Heading + three list items mirroring `isWeakPassphrase()` exactly:
  - heading: `_t('backup.passphrase.rules.heading')` → "Password must:"
  - item 1: `_t('backup.passphrase.rules.minLength')` → "Be at least 6 characters"
  - item 2: `_t('backup.passphrase.rules.notRepeated')` → "Not be the same character repeated"
  - item 3: `_t('backup.passphrase.rules.notOnlyDigits')` → "Not be only numbers"
- **D4 — Live strength indicator: DEFERRED. NOT in 22-15.** D2 + D3 together solve the dead-end UX. A strength indicator would be a separate visual layer; defer to a follow-up if Ben wants it after seeing the result.

## Locked design tokens from 22-UI-SPEC.md (DO NOT deviate)

- **Spacing scale:** Only {4, 8, 16, 24, 32, 48, 64}px. The existing passphrase modal already uses `1rem` (16px) gaps and `0.5rem` (8px) sub-spacing — the new rules MUST stay on-scale (no 6px, no 12px).
- **Type weights:** Only {400, 600}. The new `.passphrase-rules` heading is a Label role (600); the list items are Body role (400).
- **Type roles — Label:** 14px (0.875rem) / 600 / line-height **1.4**. The `.passphrase-rules` heading uses these values.
- **Type roles — Body:** 16px (1rem) / 400 / line-height 1.5 for full body copy, OR 14px (0.875rem) / 400 / line-height 1.4 for compact body (the rules list items use the compact body role to fit within the modal's existing 400px max-width without wrapping awkwardly).
- **Destructive primary button:** Background `var(--color-danger, #ea4b4b)` (matching the existing `--color-danger` token used at app.css L2092 for `.passphrase-error` and at L454 for `.button.danger`); foreground `#fff`. Hover state mirrors `.passphrase-btn-confirm:hover:not(:disabled) { opacity: 0.9 }` (consistent visual family with the modal's existing primary button).

## i18n encoding conventions per file (verified)

- `assets/i18n-en.js` — plain ASCII. Canonical EN values.
- `assets/i18n-de.js` — plain ASCII where possible; **`\u00XX` upper-hex** escapes for non-ASCII glyphs (ä ö ü ß). Verified at L239 `verschlüsseln`, L241 `Rücksetzmöglichkeit`, L243 `bestätigen`, L244 `überein`.
- `assets/i18n-he.js` — raw UTF-8 for Hebrew. **Gender-neutral by default** — use nouns/infinitives, NOT masculine or feminine imperatives. Precedent from today's 22-14 sweep: `אפס → איפוס` (noun form), `הורד → הורדה` (noun), `שתף → שיתוף` (noun). Do NOT introduce `-י` female-imperative endings; do NOT introduce gender-marked masculine imperatives where a neutral noun/infinitive works.
- `assets/i18n-cs.js` — plain ASCII for Latin chars; **`\u00XX` upper-hex** escapes for diacritics (á č ě í ř š ý ů). Verified at L237 `Vytvořte`, L239 `zašifrování`, L240 `zašifrovaná`, L244 `neshodují`, L247 `příliš`.

## i18n keys to add (8 keys × 4 locales = 32 string additions)

**Insertion point per file:** all 8 keys go into the existing `backup.passphrase.*` block, inserted as 8 consecutive lines immediately AFTER `backup.passphrase.cancel` (the last existing key in the block) at L252 in each locale file. Group order within the block: 4 skipConfirm keys → mismatchHint → 4 rules keys (heading + 3 items). Group ordering matters for grep-locatability and for the executor reading the file diff.

| Key | EN | DE | HE (gender-neutral) | CS |
|-----|----|----|---------------------|----|
| `backup.passphrase.skipConfirm.heading` | "Export without encryption?" | "Ohne Verschlüsselung exportieren?" | "ייצוא ללא הצפנה?" | "Exportovat bez šifrování?" |
| `backup.passphrase.skipConfirm.body` | "The backup file will contain all your client data unprotected. Anyone with access to the file can read it." | "Die Backup-Datei enthält alle Klientendaten ungeschützt. Jeder mit Zugriff auf die Datei kann sie lesen." | "קובץ הגיבוי יכיל את כל נתוני הלקוחות ללא הגנה. כל מי שיש לו גישה לקובץ יוכל לקרוא אותו." | "Soubor zálohy bude obsahovat všechna data klientů bez ochrany. Kdokoli s přístupem k souboru je může číst." |
| `backup.passphrase.skipConfirm.goBack` | "Go back" | "Zurück" | "חזרה" | "Zpět" |
| `backup.passphrase.skipConfirm.proceed` | "Yes, export unprotected" | "Ja, ungeschützt exportieren" | "כן, ייצוא ללא הגנה" | "Ano, exportovat bez ochrany" |
| `backup.passphrase.mismatchHint` | "Passwords don't match yet." | "Passwörter stimmen noch nicht überein." | "הסיסמאות עדיין אינן תואמות." | "Hesla se zatím neshodují." |
| `backup.passphrase.rules.heading` | "Password must:" | "Passwort muss:" | "הסיסמה חייבת:" | "Heslo musí:" |
| `backup.passphrase.rules.minLength` | "Be at least 6 characters" | "Mindestens 6 Zeichen lang sein" | "להכיל לפחות 6 תווים" | "Mít alespoň 6 znaků" |
| `backup.passphrase.rules.notRepeated` | "Not be the same character repeated" | "Nicht aus demselben wiederholten Zeichen bestehen" | "לא להיות חזרה על אותו תו" | "Nesmí být stejný znak opakovaně" |
| `backup.passphrase.rules.notOnlyDigits` | "Not be only numbers" | "Nicht nur aus Zahlen bestehen" | "לא להיות רק ספרות" | "Nesmí být jen čísla" |

**Hebrew gender-neutrality check (executor MUST verify before commit):** None of the 4 HE strings above end in `-י` (the female-imperative suffix). The rules.minLength / notRepeated / notOnlyDigits all use the infinitive form (`להכיל`, `להיות`) — consistent with 22-14's אפס→איפוס precedent. The skipConfirm.proceed uses a noun-phrase (`ייצוא ללא הגנה`) — also gender-neutral. Sapir will confirm naturalness post-deploy; the plan ships when grep gates pass.

## Existing implementation reference (read once before editing)

### `_showPassphraseModal()` — `assets/backup.js` L118–284

Read the function in full before editing. Key landmarks:

- **L118–138:** function signature, overlay/modal element creation, X-close button (top-right). The X-close handler calls `cleanup(); if (opts.onCancel) opts.onCancel();` — keep this unchanged.
- **L140–146:** RTL hook — sets `dir='rtl'` on the modal when `localStorage.portfolioLang === 'he'`. The new panes inherit this automatically (they live inside the same modal element).
- **L148–163:** heading + warning + irreversible-warning elements. **The new `.passphrase-rules` block (D3) is appended HERE — after `irreversible` and BEFORE `input1` at L165, encrypt mode only.**
- **L165–180:** `input1` (passphrase) + `input2` (confirm passphrase, encrypt mode only). Keep unchanged.
- **L182–185:** `errorEl` element. Keep unchanged — the new mismatch path (D2) populates this same element.
- **L187–213:** `actions` row with `dismissBtn` (Cancel — aborts via onCancel), `cancelBtn` (Skip encryption in encrypt mode, Go back alias in decrypt mode), `confirmBtn` (Encrypt and save / Decrypt).
- **L218:** focus first input.
- **L220–227:** `isWeakPassphrase(p)` — three rules: `p.length < 6` → tooShort; `/^(.)\1+$/.test(p)` → tooSimple; `/^\d+$/.test(p)` → tooSimple. **The new `.passphrase-rules` list items mirror these three checks 1-to-1.**
- **L229–245:** `validate()` — the function that runs on every input. **The new D2 mismatch branch is added INSIDE the `if (isEncrypt) { ... }` block, immediately AFTER the existing `errorEl.hidden = true;` line that runs once v1 is strong, REPLACING the bare `confirmBtn.disabled = !input2 || v1 !== input2.value || !v1;` line.** The new logic:
  ```
  // (existing weakness check above stays unchanged — weakness takes precedence)
  // New D2 mismatch logic:
  var v2 = input2 ? input2.value : '';
  if (input2 && v2 && v1 !== v2) {
    errorEl.textContent = _t('backup.passphrase.mismatchHint');
    errorEl.hidden = false;
    confirmBtn.disabled = true;
    return;
  }
  errorEl.hidden = true;
  confirmBtn.disabled = !input2 || v1 !== input2.value || !v1;
  ```
  Behaviour: if v1 is weak → weakness error; else if v2 has content AND v1 !== v2 → mismatch hint; else (v1 strong AND v1 === v2 AND both have content) → button enabled.
- **L246–247:** input listeners wire `validate()` to `input`. Keep unchanged.
- **L249:** `cleanup()` — overlay.remove() + unlockBodyScroll. Keep unchanged.
- **L251–264:** confirmBtn click handler — runs `opts.onConfirm(passphrase)` on success; has a defensive mismatch fallback (`backup.passphrase.mismatch` — distinct from the new lighter `mismatchHint`). **Keep this fallback untouched** — it's the louder error after a confirm-click slip-through and clears both inputs; the new validate-time hint is a lighter inline indicator.
- **L266–275:** cancelBtn click handler — calls `opts.onSkip()` in encrypt mode, `opts.onCancel()` in decrypt mode. **THIS is the handler that becomes the swap-to-skip-confirm trigger in encrypt mode (D1).** In decrypt mode it stays unchanged (no two-step needed — there's nothing to confirm; user is just aborting an import). The new behaviour in encrypt mode:
  ```
  if (isEncrypt) {
    swapToSkipConfirmPane();  // detach entry pane, build + attach confirm pane, set activePane='confirm'
    return;
  }
  // decrypt mode keeps the existing direct onCancel() path
  cleanup();
  if (opts.onCancel) opts.onCancel();
  ```
- **L277–283:** Escape-key handler. **THIS is the handler that becomes pane-aware (D1).** New behaviour:
  ```
  if (e.key === 'Escape') {
    if (activePane === 'confirm') {
      swapToEntryPane();  // detach confirm pane, re-attach entry pane, set activePane='entry'
      return;
    }
    cleanup();
    if (opts.onCancel) opts.onCancel();
  }
  ```

### The two-pane swap mechanism (D1 implementation pattern)

The cleanest implementation is to keep references to the two pane wrappers and swap them inside the `modal` element:

1. After all existing entry-pane elements are appended to `modal` (the existing flow through L213), capture them as the `entryPane` group. Practical approach: wrap them by creating a `var entryPaneWrapper = document.createElement('div'); entryPaneWrapper.className = 'passphrase-entry-pane';` AFTER the modal is created but BEFORE the existing appendChild calls, and append `entryPaneWrapper` to `modal` ONCE; then redirect all the existing `modal.appendChild(heading)`, `modal.appendChild(warning)`, etc. calls to `entryPaneWrapper.appendChild(heading)`. This is a localised refactor — same DOM order, same visuals, but the entry-pane children are now siblings under one wrapper that can be detached and re-attached as a unit. The X-close button stays as a direct child of `modal` (not of entryPaneWrapper) so it persists across pane swaps.

2. Build the skip-confirm pane lazily inside `swapToSkipConfirmPane()`:
   ```
   var skipConfirmPaneWrapper = null;  // closure variable
   function buildSkipConfirmPane() {
     var pane = document.createElement('div');
     pane.className = 'passphrase-skip-confirm';
     var heading = document.createElement('h3');
     heading.textContent = _t('backup.passphrase.skipConfirm.heading');
     pane.appendChild(heading);
     var body = document.createElement('div');
     body.className = 'passphrase-warning';  // reuse existing warning rule for visual family
     body.textContent = _t('backup.passphrase.skipConfirm.body');
     pane.appendChild(body);
     var actions = document.createElement('div');
     actions.className = 'passphrase-actions';
     var goBackBtn = document.createElement('button');
     goBackBtn.type = 'button';
     goBackBtn.className = 'passphrase-btn-dismiss';  // reuse existing secondary style
     goBackBtn.textContent = _t('backup.passphrase.skipConfirm.goBack');
     goBackBtn.addEventListener('click', swapToEntryPane);
     actions.appendChild(goBackBtn);
     var proceedBtn = document.createElement('button');
     proceedBtn.type = 'button';
     proceedBtn.className = 'passphrase-btn-destructive';
     proceedBtn.textContent = _t('backup.passphrase.skipConfirm.proceed');
     proceedBtn.addEventListener('click', function() {
       cleanup();
       if (opts.onSkip) opts.onSkip();
     });
     actions.appendChild(proceedBtn);
     pane.appendChild(actions);
     return pane;
   }
   function swapToSkipConfirmPane() {
     if (!skipConfirmPaneWrapper) skipConfirmPaneWrapper = buildSkipConfirmPane();
     if (entryPaneWrapper.parentNode) entryPaneWrapper.parentNode.removeChild(entryPaneWrapper);
     modal.appendChild(skipConfirmPaneWrapper);
     activePane = 'confirm';
   }
   function swapToEntryPane() {
     if (skipConfirmPaneWrapper && skipConfirmPaneWrapper.parentNode) {
       skipConfirmPaneWrapper.parentNode.removeChild(skipConfirmPaneWrapper);
     }
     if (!entryPaneWrapper.parentNode) modal.appendChild(entryPaneWrapper);
     activePane = 'entry';
     setTimeout(function() { input1.focus(); }, 50);
   }
   ```

The input values are preserved automatically because input1 and input2 are direct children of `entryPaneWrapper` (not destroyed), so when the wrapper is re-attached the typed values are intact.

**Three-state resolve sentinel (22-12 contract — MUST PRESERVE):**
- `opts.onConfirm(passphrase)` → resolves `exportEncryptedBackup()` with `true` (encrypted)
- `opts.onSkip()` → resolves with `false` (unencrypted, user chose to skip)
- `opts.onCancel()` → resolves with `'cancel'` (aborted, no file)

In 22-15, the only path change is that `opts.onSkip()` is reached via a **two-step gesture** (Skip Encryption → confirm pane → Yes export unprotected) instead of the current one-step (Skip Encryption → onSkip immediately). The resolve VALUES and the upstream caller in `overview.js` (which strict-equals `'cancel'`, then strict-equals `false` for skip, else encrypted) are unchanged.

### CSS rule insertion point — `assets/app.css` L2155 (end of existing passphrase-modal block)

The existing passphrase-modal CSS block runs L2000–2155 (verified by grep — `.passphrase-modal-overlay` through `.passphrase-btn-confirm:disabled`). The next block starts at L2157 (`.header-license-link`). Append the two new rule blocks (`.passphrase-rules`, `.passphrase-skip-confirm` + `.passphrase-btn-destructive`) immediately BEFORE L2157, with a leading comment "Phase 22-15 (Gap N11 D1 + Gap N12 D3) — skip-confirm pane + complexity-rules hint block."

### Risk callouts

**Risk 1 — Three-state resolve sentinel:** The strictest test of preservation. `exportEncryptedBackup()` at backup.js L490 wires `onSkip: resolve(false)`, `onCancel: resolve('cancel')`, `onConfirm: ... resolve(true)`. The new two-pane flow MUST keep these three call paths intact:
  - Entry pane "Cancel" (dismissBtn) → onCancel → `'cancel'` (unchanged)
  - Entry pane "Skip Encryption" (cancelBtn) → swap to confirm pane (NO resolve) (new)
  - Confirm pane "Go back" → swap to entry pane (NO resolve) (new)
  - Confirm pane "Yes, export unprotected" → onSkip → `false` (preserves existing skip semantics)
  - Confirm pane Escape → swap to entry pane (NO resolve) (new)
  - Confirm pane X → onCancel → `'cancel'` (unchanged)
  - Entry pane Escape → onCancel → `'cancel'` (unchanged)
  - Entry pane X → onCancel → `'cancel'` (unchanged)

**Risk 2 — Decrypt mode regression:** Decrypt mode does NOT have a Skip button (the file is already encrypted). The cancelBtn in decrypt mode is labelled "Go back" and aliases onCancel. The new two-step flow MUST be guarded by `if (isEncrypt) { swapToSkipConfirmPane(); return; }` so decrypt mode keeps its existing direct-cancel behaviour. Hard grep gate verifies the swap is encrypt-only.

**Risk 3 — Focus management across pane swap:** After swap-to-confirm, focus should land on the destructive primary button (the user's expected next action is to confirm or go back); after swap-to-entry, focus returns to input1 (the user's expected next action is to keep typing or re-aim). The pane builders set focus with the existing 50ms setTimeout pattern from L218.

**Risk 4 — Modal min-height jitter on pane swap:** The existing `.passphrase-modal` rule uses `max-height: 90vh / 90dvh; display: flex; flex-direction: column; gap: 1rem;` with no explicit min-height. The confirm pane has fewer children than the entry pane (heading + body + actions = 3 children vs heading + warning + irreversible + rules + input1 + input2 + errorEl + actions = 8 children), so the modal's intrinsic height shrinks on swap. This is acceptable visually but the executor should manually verify there's no jarring resize. No CSS fix in this plan; phase 21 (mobile audit) handles polish.

**Risk 5 — Hebrew RTL on the new confirm pane and rules block:** The existing modal already sets `dir='rtl'` + `style.textAlign='right'` when lang === 'he'. The new panes live inside the same `modal` element so they inherit. The destructive button text + rules list items render RTL automatically. Logical CSS properties (`padding-inline-start`, `margin-inline-end`) in the new rules ensure spacing flips correctly.

**Risk 6 — i18n serialisation:** 4 i18n files touched by Task 3. Within this plan, Task 3 is sequential (after Task 1 and Task 2 have committed) so no parallel-execution conflict. Downstream plans running in parallel with 22-15 must serialise i18n edits — 22-15's commits become the new i18n baseline.

**Risk 7 — `_t` fallback for new keys:** `backup.js` has a `_t(key)` helper at L96–116 with a fallback map for the existing keys. The 8 new keys are NOT in the fallback map. If the i18n bundle fails to load for any reason (rare — only happens on cache miss + offline), `_t('backup.passphrase.skipConfirm.heading')` returns the key string itself. **Decision:** add the 8 new keys to the `fallbacks` map at L96–113 with their EN values, mirroring the existing pattern (verified — every existing `backup.passphrase.*` key has a fallback entry). This is required for resilience and follows the established pattern.

**Risk 8 — Reduced-motion / accessibility:** No new transitions or animations introduced. The pane swap is instantaneous (detach + attach). No `prefers-reduced-motion` regression.

**Risk 9 — Service worker cache version:** Auto-bumped by the pre-commit hook on each task commit (3 expected bumps for this plan). No explicit cache changes needed.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Skip-encryption confirmation pane (Gap N11 / D1) — two-pane swap inside _showPassphraseModal with destructive primary button</name>
  <files>assets/backup.js, assets/app.css</files>
  <read_first>
    - assets/backup.js lines 96–284 (focus on the `_t` fallback map at L96–116, `_showPassphraseModal` at L118–284 — particularly the cancelBtn handler at L266–275 and the Escape-key branch at L277–283 that become pane-aware in this task)
    - assets/backup.js lines 478–600 (the `exportEncryptedBackup` and `restoreFromBackup` call sites that consume opts.onSkip / opts.onCancel — read once to confirm the three-state resolve sentinel from 22-12 is what's being preserved)
    - assets/app.css lines 2000–2155 (the existing passphrase-modal CSS block — focus on `.passphrase-modal`, `.passphrase-warning`, `.passphrase-irreversible`, `.passphrase-actions`, `.passphrase-btn-dismiss`, `.passphrase-btn-confirm`, `.passphrase-error` — the new rules append AFTER L2155, BEFORE the next block at L2157)
    - assets/app.css lines 454–460 (the existing `.button.danger` rule — same `--color-danger` token + `--shadow-danger` pattern the new `.passphrase-btn-destructive` mirrors)
    - .planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-12-data-safety-guards-SUMMARY.md (the three-state resolve sentinel contract this task MUST preserve)
    - .planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-15-CONTEXT.md (D1 — locked decision: in-modal two-step, NOT stacked modal)
    - .planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-UI-SPEC.md (spacing scale {4,8,16,24,32,48,64}; type weights {400, 600}; destructive button colour token)
  </read_first>
  <action>
    Two coordinated edits — JS structural change inside `_showPassphraseModal` and CSS rules for the new pane + destructive button. No i18n changes in this task (Task 3 handles all 32 i18n additions in one pass).

    **Step A — Refactor `_showPassphraseModal` to wrap existing entry-pane children in a single `entryPaneWrapper` so the entry-pane can be detached + re-attached as a unit (Gap N11 / D1).** `assets/backup.js`.

    After the modal element is created (currently L125–126) and AFTER the X close button is appended to `modal` (currently L138 — `modal.appendChild(closeBtn);`), insert one new line that creates the entry pane wrapper:

    `var entryPaneWrapper = document.createElement('div'); entryPaneWrapper.className = 'passphrase-entry-pane';`

    Then redirect every existing `modal.appendChild(...)` call from L151 (`modal.appendChild(heading);`) through L213 (`modal.appendChild(actions);`) to append to `entryPaneWrapper` instead of `modal`. The closeBtn at L138 stays as a direct child of `modal` (persistent across pane swaps). The new `.passphrase-rules` block from Task 2's D3 work will also be appended to `entryPaneWrapper`, not `modal`.

    Finally, append `entryPaneWrapper` to `modal` ONCE, immediately AFTER all the entry-pane children have been redirected:

    `modal.appendChild(entryPaneWrapper);`

    Add a leading comment immediately above the new wrapper creation explaining: "Phase 22-15 (Gap N11 / D1) — wrap entry-pane children in a single container so the in-modal Skip-Encryption confirmation pane (D1) can detach + re-attach the entry pane as a unit without destroying typed input values. The X close button stays as a direct child of `modal` so it persists across pane swaps."

    **Step B — Add the activePane state, the swap helpers, and rewire the cancelBtn + Escape-key handlers to be pane-aware (Gap N11 / D1).** `assets/backup.js`.

    After the existing `setTimeout(function() { input1.focus(); }, 50);` at L218 — and BEFORE the `function isWeakPassphrase(p) { ... }` at L220 — insert the activePane state variable and the lazy build + swap helpers:

    ```
    // Phase 22-15 (Gap N11 / D1) — activePane state + lazy-built skip-confirm pane.
    // Used by the rewired cancelBtn handler and the Escape-key branch below.
    // 'entry' is the default; 'confirm' is the destructive skip-confirm pane.
    var activePane = 'entry';
    var skipConfirmPaneWrapper = null;

    function buildSkipConfirmPane() {
      var pane = document.createElement('div');
      pane.className = 'passphrase-skip-confirm';

      var paneHeading = document.createElement('h3');
      paneHeading.textContent = _t('backup.passphrase.skipConfirm.heading');
      pane.appendChild(paneHeading);

      var paneBody = document.createElement('div');
      paneBody.className = 'passphrase-warning';
      paneBody.textContent = _t('backup.passphrase.skipConfirm.body');
      pane.appendChild(paneBody);

      var paneActions = document.createElement('div');
      paneActions.className = 'passphrase-actions';

      var goBackBtn = document.createElement('button');
      goBackBtn.type = 'button';
      goBackBtn.className = 'passphrase-btn-dismiss';
      goBackBtn.textContent = _t('backup.passphrase.skipConfirm.goBack');
      goBackBtn.addEventListener('click', swapToEntryPane);
      paneActions.appendChild(goBackBtn);

      var proceedBtn = document.createElement('button');
      proceedBtn.type = 'button';
      proceedBtn.className = 'passphrase-btn-destructive';
      proceedBtn.textContent = _t('backup.passphrase.skipConfirm.proceed');
      proceedBtn.addEventListener('click', function() {
        cleanup();
        if (opts.onSkip) opts.onSkip();
      });
      paneActions.appendChild(proceedBtn);

      pane.appendChild(paneActions);
      return pane;
    }

    function swapToSkipConfirmPane() {
      if (!skipConfirmPaneWrapper) skipConfirmPaneWrapper = buildSkipConfirmPane();
      if (entryPaneWrapper.parentNode) entryPaneWrapper.parentNode.removeChild(entryPaneWrapper);
      modal.appendChild(skipConfirmPaneWrapper);
      activePane = 'confirm';
      setTimeout(function() {
        var btn = skipConfirmPaneWrapper.querySelector('.passphrase-btn-destructive');
        if (btn) btn.focus();
      }, 50);
    }

    function swapToEntryPane() {
      if (skipConfirmPaneWrapper && skipConfirmPaneWrapper.parentNode) {
        skipConfirmPaneWrapper.parentNode.removeChild(skipConfirmPaneWrapper);
      }
      if (!entryPaneWrapper.parentNode) modal.appendChild(entryPaneWrapper);
      activePane = 'entry';
      setTimeout(function() { input1.focus(); }, 50);
    }
    ```

    Then modify the existing cancelBtn click handler (currently L266–275). Replace the body so encrypt mode swaps instead of calling onSkip directly; decrypt mode keeps its existing direct-cancel behaviour:

    ```
    cancelBtn.addEventListener('click', function() {
      if (isEncrypt) {
        // Phase 22-15 (Gap N11 / D1) — Skip Encryption now opens an in-modal confirm pane.
        // Reaching opts.onSkip() now requires a two-step gesture (this button → destructive primary on the confirm pane).
        swapToSkipConfirmPane();
        return;
      }
      // Decrypt mode keeps the direct-cancel alias behaviour — there is nothing to "skip" when importing an already-encrypted file.
      cleanup();
      if (opts.onCancel) opts.onCancel();
    });
    ```

    Then modify the existing Escape-key handler (currently L277–283) to be pane-aware:

    ```
    modal.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !confirmBtn.disabled && activePane === 'entry') confirmBtn.click();
      if (e.key === 'Escape') {
        if (activePane === 'confirm') {
          // Phase 22-15 (Gap N11 / D1) — Escape on the destructive confirm pane returns to the entry pane (no resolve).
          // X close button still aborts (calls opts.onCancel) — Escape and X have different semantics on the confirm pane.
          swapToEntryPane();
          return;
        }
        cleanup();
        if (opts.onCancel) opts.onCancel();
      }
    });
    ```

    The Enter-key branch picks up `activePane === 'entry'` so pressing Enter on the destructive confirm pane does NOT auto-trigger confirmBtn (which lives in the entry pane DOM that's been detached). The destructive primary button still receives Enter activation normally via native button focus + keyboard handling (no special wiring needed).

    **Step C — Add the 8 new key fallbacks to the `_t` fallback map (Risk 7 mitigation).** `assets/backup.js`.

    Inside the `fallbacks` object at L98–113, add 8 new entries inside the same object literal (NOT in a separate block). Insert immediately AFTER `'backup.passphrase.cancel': 'Cancel'` at L113, with a leading line-comment "// Phase 22-15 (Gap N11 + N12) — fallbacks for the 8 new keys:". The 8 entries to add (canonical EN values, exactly matching the i18n-en.js values Task 3 will add):

    ```
    'backup.passphrase.skipConfirm.heading': 'Export without encryption?',
    'backup.passphrase.skipConfirm.body': 'The backup file will contain all your client data unprotected. Anyone with access to the file can read it.',
    'backup.passphrase.skipConfirm.goBack': 'Go back',
    'backup.passphrase.skipConfirm.proceed': 'Yes, export unprotected',
    'backup.passphrase.mismatchHint': "Passwords don't match yet.",
    'backup.passphrase.rules.heading': 'Password must:',
    'backup.passphrase.rules.minLength': 'Be at least 6 characters',
    'backup.passphrase.rules.notRepeated': 'Not be the same character repeated',
    'backup.passphrase.rules.notOnlyDigits': 'Not be only numbers'
    ```

    Add a trailing comma after the existing 'backup.passphrase.cancel': 'Cancel' line if not already present.

    **Step D — Add the two new CSS rules to `assets/app.css`.**

    Append immediately BEFORE the `/* ── License Link (header) ──── */` block at L2157 (i.e. right after `.passphrase-btn-confirm:disabled { ... }` ends at L2155). Add a leading section comment: `/* ── Phase 22-15 (Gap N11 / D1 + Gap N12 / D3) — Skip-Encryption confirm pane + complexity-rules hint block ── */`

    Rule 1 — `.passphrase-skip-confirm` (the confirm pane wrapper):
    - `display: flex;`
    - `flex-direction: column;`
    - `gap: 1rem;`
    (Matches the existing `.passphrase-modal` interior spacing pattern. No `padding` — the parent modal already provides `padding: 2rem 1.5rem;`.)

    Rule 2 — `.passphrase-btn-destructive` (the destructive primary button on the confirm pane):
    - `background: var(--color-danger, #ea4b4b);`
    - `color: #fff;`
    - `border: none;`
    - `border-radius: 0.5rem;`
    - `padding: 0.75rem 1.5rem;`
    - `font-size: 1rem;`
    - `font-weight: 600;`
    - `font-family: inherit;`
    - `cursor: pointer;`
    - `min-height: 44px;`
    (Mirrors `.passphrase-btn-confirm` at L2135–2146 EXACTLY except `background: var(--color-primary)` is replaced with `background: var(--color-danger, #ea4b4b)`. Min-height 44px is the 22-UI-SPEC touch-target floor.)

    Rule 3 — `.passphrase-btn-destructive:hover:not(:disabled)`:
    - `opacity: 0.9;`
    (Same hover pattern as `.passphrase-btn-confirm:hover:not(:disabled)` at L2148–2150.)

    Do NOT introduce any physical-axis margins or paddings (no `margin-left`, `margin-right`, `padding-left`, `padding-right`). All spacing is logical-property-safe inside the destructive button rule.

    Add a leading comment immediately above each of the three rules explaining: rule 1 — "Skip-confirm pane wrapper. Same column-flex shape as the entry pane; the parent .passphrase-modal already supplies padding."; rule 2 — "Destructive primary on the skip-confirm pane. Mirrors .passphrase-btn-confirm but with --color-danger background (matching the existing --color-danger token at .passphrase-error L2092 and .button.danger L454). The two-step gesture (Skip → confirm pane → this button) is what the destructive colour visually anchors."; rule 3 — "Hover state matches .passphrase-btn-confirm:hover for consistency."

    Note: Task 2 will append the `.passphrase-rules` block to the same section (immediately after Rule 3) — Task 1 sets up the section header so Task 2 doesn't need to re-add it.

    **Step E — Verification before commit.**

    - `node -c assets/backup.js` parses
    - `grep -c 'activePane' assets/backup.js` returns ≥4 (declaration + 2 assignments inside the swap helpers + at least one read inside the Escape handler + one read inside the Enter handler)
    - `grep -c 'entryPaneWrapper' assets/backup.js` returns ≥4 (declaration + 1 className assignment + ≥1 appendChild redirect + ≥1 reference inside swap helpers)
    - `grep -c 'skipConfirmPaneWrapper' assets/backup.js` returns ≥3 (declaration + ≥1 reference inside swapToSkipConfirmPane + ≥1 reference inside swapToEntryPane)
    - `grep -q 'passphrase-skip-confirm' assets/backup.js` AND `grep -q 'passphrase-skip-confirm' assets/app.css` — DOM class and CSS rule both present
    - `grep -q 'passphrase-btn-destructive' assets/backup.js` AND `grep -q 'passphrase-btn-destructive' assets/app.css` — destructive button DOM class and CSS rule both present
    - `grep -c 'opts.onSkip' assets/backup.js` returns ≥2 (the confirm-pane proceed handler + the function-signature comment at L119) — confirms the skip path is still reachable from the new flow
    - `grep -c 'opts.onCancel' assets/backup.js` returns ≥4 (X-close handler + dismissBtn handler + Escape entry-pane handler + decrypt-mode cancelBtn handler) — confirms the abort paths are unchanged
    - `awk '/function _showPassphraseModal/,/^  }$/' assets/backup.js | grep -c 'swapToSkipConfirmPane'` returns ≥2 (definition + at least one call site inside the cancelBtn click handler)
    - `awk '/function _showPassphraseModal/,/^  }$/' assets/backup.js | grep -c 'swapToEntryPane'` returns ≥3 (definition + Escape-key call site + goBackBtn click-listener registration)
    - CSS destructive button uses `--color-danger`: `grep -A 12 '\.passphrase-btn-destructive {' assets/app.css | grep -c 'var(--color-danger'` returns ≥1
    - No physical-axis padding/margin in the new CSS rules: `grep -A 12 '\.passphrase-btn-destructive {' assets/app.css | grep -cE 'padding-(left|right)|margin-(left|right):'` returns 0
    - `_t` fallback map has 9 new entries (8 new keys — 1 of which collides with no existing key — let's verify the +9 expectation by grepping the count: `grep -c "'backup.passphrase.skipConfirm" assets/backup.js` returns ≥4 (4 skipConfirm fallbacks) and `grep -c "'backup.passphrase.rules" assets/backup.js` returns ≥4 (4 rules fallbacks) and `grep -c "'backup.passphrase.mismatchHint" assets/backup.js` returns ≥1)

    Commit message: `feat(22-15): Skip-Encryption two-step confirmation pane inside passphrase modal (N11 D1)`
  </action>
  <verify>
    <automated>node -c assets/backup.js &amp;&amp; [ "$(grep -c 'activePane' assets/backup.js)" -ge 4 ] &amp;&amp; [ "$(grep -c 'entryPaneWrapper' assets/backup.js)" -ge 4 ] &amp;&amp; [ "$(grep -c 'skipConfirmPaneWrapper' assets/backup.js)" -ge 3 ] &amp;&amp; grep -q 'passphrase-skip-confirm' assets/backup.js &amp;&amp; grep -q 'passphrase-skip-confirm' assets/app.css &amp;&amp; grep -q 'passphrase-btn-destructive' assets/backup.js &amp;&amp; grep -q 'passphrase-btn-destructive' assets/app.css &amp;&amp; [ "$(grep -c 'opts.onSkip' assets/backup.js)" -ge 2 ] &amp;&amp; [ "$(grep -c 'opts.onCancel' assets/backup.js)" -ge 4 ] &amp;&amp; [ "$(awk '/function _showPassphraseModal/,/^  }$/' assets/backup.js | grep -c 'swapToSkipConfirmPane')" -ge 2 ] &amp;&amp; [ "$(awk '/function _showPassphraseModal/,/^  }$/' assets/backup.js | grep -c 'swapToEntryPane')" -ge 3 ] &amp;&amp; [ "$(grep -A 12 '\.passphrase-btn-destructive {' assets/app.css | grep -c 'var(--color-danger')" -ge 1 ] &amp;&amp; [ "$(grep -A 12 '\.passphrase-btn-destructive {' assets/app.css | grep -cE 'padding-(left|right):|margin-(left|right):')" -eq 0 ] &amp;&amp; [ "$(grep -c "'backup.passphrase.skipConfirm" assets/backup.js)" -ge 4 ] &amp;&amp; [ "$(grep -c "'backup.passphrase.rules" assets/backup.js)" -ge 4 ] &amp;&amp; [ "$(grep -c "'backup.passphrase.mismatchHint" assets/backup.js)" -ge 1 ]</automated>
  </verify>
  <acceptance_criteria>
    - **Source assertion (entry pane wrapping):** `var entryPaneWrapper = document.createElement('div');` is declared exactly once inside `_showPassphraseModal`. The 8 existing `modal.appendChild(...)` calls for the entry-pane children (heading, warning, irreversible, input1, input2, errorEl, actions) are redirected to `entryPaneWrapper.appendChild(...)`. `entryPaneWrapper` is appended to `modal` exactly once. The closeBtn at the function head stays as a direct child of `modal`. Verified by `awk '/function _showPassphraseModal/,/^  }$/' assets/backup.js | grep -c 'entryPaneWrapper.appendChild' | head -1` returning ≥7 (heading + warning + optional irreversible + input1 + optional input2 + errorEl + actions — at least 7 in encrypt mode; 5 in decrypt mode, executor sums correctly).
    - **Source assertion (swap helpers):** `swapToSkipConfirmPane` and `swapToEntryPane` are both defined inside `_showPassphraseModal`. Verified by `awk '/function _showPassphraseModal/,/^  }$/' assets/backup.js | grep -c 'function swapToSkipConfirmPane'` returning 1 AND `awk '/function _showPassphraseModal/,/^  }$/' assets/backup.js | grep -c 'function swapToEntryPane'` returning 1.
    - **Source assertion (cancelBtn is pane-aware in encrypt mode):** The cancelBtn click handler inside `_showPassphraseModal` calls `swapToSkipConfirmPane()` in the isEncrypt branch and falls back to `cleanup() + opts.onCancel()` in decrypt mode. Verified by `awk '/cancelBtn.addEventListener/,/});$/' assets/backup.js | grep -q 'swapToSkipConfirmPane()'`.
    - **Source assertion (Escape is pane-aware):** The Escape branch of the keydown handler checks `activePane === 'confirm'` and calls `swapToEntryPane()` in that case; otherwise calls `cleanup() + opts.onCancel()`. Verified by `awk "/key === 'Escape'/,/});$/" assets/backup.js | grep -q 'activePane' AND grep -q 'swapToEntryPane'`.
    - **Source assertion (three-state resolve sentinel preserved):** opts.onSkip is called inside the destructive proceed button's click listener (NOT directly from cancelBtn anymore in encrypt mode); opts.onCancel is called by the X close button, the dismissBtn, the Escape branch on the entry pane, and the decrypt-mode cancelBtn. Total reachable code paths for each resolve outcome:
      - `true` (encrypted): confirmBtn click → opts.onConfirm(passphrase) (unchanged)
      - `false` (skip): proceed-button-click on confirm pane → opts.onSkip() (new two-step)
      - `'cancel'` (abort): X-close OR dismissBtn OR Escape-on-entry-pane OR decrypt-mode-cancelBtn → opts.onCancel() (unchanged)
      - No-resolve transitions: Skip-Encryption-on-entry-pane → swap to confirm pane; Go-back-on-confirm-pane → swap to entry pane; Escape-on-confirm-pane → swap to entry pane (all new — none of these reach a resolve)
    - **Source assertion (CSS destructive button uses correct token):** `.passphrase-btn-destructive` rule sets `background: var(--color-danger, #ea4b4b);` and `color: #fff;`. Verified by `grep -A 12 '\.passphrase-btn-destructive {' assets/app.css | grep -q 'var(--color-danger'` AND `grep -A 12 '\.passphrase-btn-destructive {' assets/app.css | grep -q 'color: #fff'`.
    - **Source assertion (no physical-axis spacing in new CSS):** `grep -A 12 '\.passphrase-btn-destructive {' assets/app.css | grep -cE 'padding-(left|right):|margin-(left|right):'` returns 0. Same check on `.passphrase-skip-confirm` rule returns 0.
    - **Source assertion (`_t` fallback map has the 9 new entries):** `grep -c "'backup.passphrase.skipConfirm" assets/backup.js` returns ≥4 (heading + body + goBack + proceed); `grep -c "'backup.passphrase.rules" assets/backup.js` returns ≥4 (heading + minLength + notRepeated + notOnlyDigits); `grep -c "'backup.passphrase.mismatchHint" assets/backup.js` returns ≥1.
    - **Parse assertion:** `node -c assets/backup.js` exits 0.
    - **UAT truth N11 (behaviour, manual UAT — verbatim from 22-15-CONTEXT.md and 22-HUMAN-UAT.md):** "Backup export without encryption (Skip Encryption path) requires explicit user confirmation — not allowed silently." Verification steps:
      1. Open the app at `overview.html`, click "Export / Backup Data".
      2. Passphrase modal opens in encrypt mode (entry pane). Confirm the entry pane shows: heading, warning, irreversible warning, the new rules-hint block (from Task 2), input1, input2, errorEl (hidden), actions row with Cancel / Skip Encryption / Encrypt and Save.
      3. Click **Skip Encryption**. The modal body swaps in place to the confirm pane: warning heading "Export without encryption?", body naming the privacy implication, and two buttons — "Go back" (secondary) and "Yes, export unprotected" (primary destructive — red/orange).
      4. **Verify no file has been downloaded** at this point (open Downloads / check the filesystem — must be empty for the test session).
      5. Click **"Go back"** → modal swaps back to the entry pane. Typed input values are preserved. Focus returns to input1.
      6. Click **Skip Encryption** again → confirm pane re-appears. Press **Escape** → swaps back to entry pane (NOT abort).
      7. Click **Skip Encryption** again → confirm pane re-appears. Click the **X (top-right)** → modal closes entirely, NO file downloaded (calls opts.onCancel → resolves `'cancel'`).
      8. Re-open the modal. Click Skip Encryption → confirm pane. Click **"Yes, export unprotected"** → modal closes, the unencrypted `.zip` IS downloaded (the existing skip path resolves opts.onSkip → `false`, and overview.js triggers the unencrypted export).
      9. Re-open the modal. Type a strong passphrase + matching confirm. Click **Encrypt and Save** → the `.sgbackup` encrypted file IS downloaded (existing encrypted path unchanged).
      10. Re-open the modal. Press **Escape** on the entry pane → modal closes, NO file downloaded (existing entry-pane Escape behaviour preserved).
      11. Re-open the modal. Click the **X (top-right)** on the entry pane → modal closes, NO file downloaded.
      12. Switch UI language to DE / HE / CS → repeat steps 3–8. In HE the modal is RTL; the confirm pane reads right-to-left; the destructive button stays visually prominent.
    - **Three-state resolve sentinel preservation (regression check):** Mental simulation of the post-22-15 code paths from `exportEncryptedBackup()`'s perspective in `assets/backup.js` L490:
      - User clicks Encrypt and Save with valid input → onConfirm fires → resolves `true` → overview.js encrypted export path runs ✓
      - User clicks Skip Encryption → confirm pane → Yes export unprotected → onSkip fires → resolves `false` → overview.js unencrypted export path runs ✓
      - User clicks any of (X close, Cancel button, Escape on entry pane) → onCancel fires → resolves `'cancel'` → overview.js early-returns with no toast, no download ✓
      - User clicks Skip Encryption → confirm pane → Go back / Escape → swaps back to entry pane, NO resolve, modal still open ✓
      - User clicks Skip Encryption → confirm pane → X close → onCancel fires → resolves `'cancel'` ✓
    - **Decrypt mode regression check:** In decrypt mode, the cancelBtn is labelled "Go back" (alias for cancel). Clicking it must continue to call `opts.onCancel()` directly — NOT trigger the swap-to-skip-confirm-pane flow (which is encrypt-only). Verified by mental simulation: `if (isEncrypt) { swapToSkipConfirmPane(); return; }` short-circuits in encrypt mode only.
    - **Behaviour (focus management):** After swap-to-confirm, focus lands on the destructive primary button (verified by the `setTimeout` focus call inside `swapToSkipConfirmPane`). After swap-to-entry, focus lands on input1 (verified by the matching call inside `swapToEntryPane`).
    - **Behaviour (input value preservation):** Typed passphrase + confirm values in input1 / input2 are preserved across swap-to-confirm → swap-back-to-entry, because the input elements live inside `entryPaneWrapper` which is detached + re-attached (not destroyed).
  </acceptance_criteria>
  <done>
    - `_showPassphraseModal` wraps its entry-pane children in `entryPaneWrapper`; the closeBtn stays as a direct child of `modal`.
    - `activePane` state + `swapToSkipConfirmPane` + `swapToEntryPane` helpers defined inside `_showPassphraseModal`.
    - cancelBtn click handler in encrypt mode calls `swapToSkipConfirmPane()`; decrypt mode keeps the direct-cancel path.
    - Escape-key handler is pane-aware: confirm pane → swap-back, entry pane → cleanup + onCancel.
    - X close button always calls cleanup + onCancel (independent of activePane).
    - Destructive primary button on the confirm pane calls cleanup + opts.onSkip(), preserving the three-state resolve sentinel from 22-12.
    - `_t` fallback map has 9 new entries with canonical EN values for all 8 new i18n keys.
    - `assets/app.css` has new `.passphrase-skip-confirm`, `.passphrase-btn-destructive`, and `.passphrase-btn-destructive:hover:not(:disabled)` rules using `var(--color-danger, #ea4b4b)` for background. No physical-axis margins/paddings.
    - `node -c assets/backup.js` parses.
    - Manual UAT confirms the two-step Skip-Encryption flow works in all 4 locales, with focus management and input preservation across pane swaps.
  </done>
</task>

<task type="auto">
  <name>Task 2: Password mismatch error path + complexity-rules hint block (Gap N12 / D2 + D3) — validate() branch + static rules DOM + CSS</name>
  <files>assets/backup.js, assets/app.css</files>
  <read_first>
    - assets/backup.js lines 148–185 (heading, warning, irreversible-warning, input1, input2, errorEl — confirm the insertion point for the new .passphrase-rules block is between irreversible (L163) and input1 (L165), encrypt-mode only)
    - assets/backup.js lines 220–248 (isWeakPassphrase + validate — the three rules in isWeakPassphrase MUST match the three list items in the new rules-hint block one-to-one; the D2 mismatch branch is inserted inside validate's existing isEncrypt block)
    - assets/backup.js lines 251–264 (the existing confirmBtn click handler's defensive mismatch fallback — uses the louder backup.passphrase.mismatch; keep untouched, distinct from the new lighter backup.passphrase.mismatchHint)
    - assets/app.css lines 2058–2095 (existing .passphrase-warning / .passphrase-irreversible / .passphrase-input / .passphrase-error rules — the new .passphrase-rules block reuses --color-warning-bg / --color-warning-text tokens for visual family with .passphrase-irreversible at L2064)
    - .planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-15-CONTEXT.md (D2 — locked decision: validate() mismatch branch; weakness takes precedence; D3 — locked decision: static rules block, encrypt mode only, three rules mirror isWeakPassphrase exactly)
    - .planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-UI-SPEC.md (spacing scale; Label-role typography 14px / 600 / 1.4; Body role 14px / 400 / 1.4 for compact body)
  </read_first>
  <action>
    Two coordinated edits — JS additions inside `_showPassphraseModal` (the rules block DOM + the validate() mismatch branch) and one new CSS rule. No i18n changes in this task (Task 3 handles all 32 i18n additions in one pass).

    **Step A — Add the static `.passphrase-rules` block inside `_showPassphraseModal`, encrypt mode only (Gap N12 / D3).** `assets/backup.js`.

    Locate the irreversible-warning block (currently L158–163, inside `if (isEncrypt) { ... }`). Immediately AFTER the `modal.appendChild(irreversible);` line (which Task 1 has already redirected to `entryPaneWrapper.appendChild(irreversible);`), insert the rules-block construction. Because Task 1 wrapped entry-pane children in `entryPaneWrapper`, this new block also appends to `entryPaneWrapper`:

    ```
    // Phase 22-15 (Gap N12 / D3) — static complexity-rules hint block.
    // Encrypt mode only (decrypt has no rules — user is entering an existing password).
    // The three list items mirror isWeakPassphrase() (L220) one-to-one:
    //   - p.length < 6                   → rules.minLength
    //   - /^(.)\1+$/.test(p)             → rules.notRepeated
    //   - /^\d+$/.test(p)                → rules.notOnlyDigits
    // Static (does NOT update reactively as the user types). The reactive feedback
    // is already provided by errorEl via validate().
    var rulesBlock = document.createElement('div');
    rulesBlock.className = 'passphrase-rules';

    var rulesHeading = document.createElement('div');
    rulesHeading.className = 'passphrase-rules-heading';
    rulesHeading.textContent = _t('backup.passphrase.rules.heading');
    rulesBlock.appendChild(rulesHeading);

    var rulesList = document.createElement('ul');
    rulesList.className = 'passphrase-rules-list';

    var rulesKeys = [
      'backup.passphrase.rules.minLength',
      'backup.passphrase.rules.notRepeated',
      'backup.passphrase.rules.notOnlyDigits'
    ];
    rulesKeys.forEach(function(key) {
      var li = document.createElement('li');
      li.textContent = _t(key);
      rulesList.appendChild(li);
    });
    rulesBlock.appendChild(rulesList);

    entryPaneWrapper.appendChild(rulesBlock);
    ```

    Insertion point: this block sits between the irreversible-warning append and the input1 append. The encrypt-only guard is implicit because the surrounding `if (isEncrypt) { ... }` block (currently L158–163) wraps the irreversible-warning — the new rules block goes INSIDE the same `if (isEncrypt)` block, immediately after the irreversible append. Verify the brace nesting matches.

    **Step B — Add the D2 mismatch branch to `validate()` (Gap N12 / D2).** `assets/backup.js`.

    Locate `validate()` at L229–245. The current isEncrypt block reads:

    ```
    if (isEncrypt) {
      var weakness = isWeakPassphrase(v1);
      if (weakness) {
        errorEl.textContent = weakness;
        errorEl.hidden = false;
        confirmBtn.disabled = true;
        return;
      }
      errorEl.hidden = true;
      confirmBtn.disabled = !input2 || v1 !== input2.value || !v1;
    }
    ```

    Replace the post-weakness block (the `errorEl.hidden = true;` line and the `confirmBtn.disabled = ...` line) with the new D2 mismatch logic. The full replaced block becomes:

    ```
    if (isEncrypt) {
      var weakness = isWeakPassphrase(v1);
      if (weakness) {
        errorEl.textContent = weakness;
        errorEl.hidden = false;
        confirmBtn.disabled = true;
        return;
      }
      // Phase 22-15 (Gap N12 / D2) — mismatch hint after weakness passes.
      // Weakness errors take precedence (handled above). If v1 is strong AND
      // both inputs have content AND they differ, show the lighter mismatch hint
      // and keep confirmBtn disabled. The defensive louder mismatch error inside
      // the confirmBtn click handler (L251) stays untouched.
      var v2 = input2 ? input2.value : '';
      if (input2 && v2 && v1 !== v2) {
        errorEl.textContent = _t('backup.passphrase.mismatchHint');
        errorEl.hidden = false;
        confirmBtn.disabled = true;
        return;
      }
      errorEl.hidden = true;
      confirmBtn.disabled = !input2 || v1 !== input2.value || !v1;
    }
    ```

    Behaviour summary (decision tree, top to bottom):
    1. v1 empty → button disabled, error hidden (existing pre-check at L231)
    2. v1 weak → show weakness error, button disabled, return (existing — unchanged)
    3. v1 strong AND v2 has content AND v1 !== v2 → **show mismatchHint, button disabled, return (NEW — D2)**
    4. v1 strong AND v2 has content AND v1 === v2 → hide error, button enabled
    5. v1 strong AND v2 empty → hide error, button disabled (no error needed — user hasn't typed yet)

    Case 5 is intentional: don't show mismatch when v2 is empty (would be premature error). The check `v2 && v1 !== v2` requires v2 to have content before firing the mismatch hint.

    **Step C — Add the `.passphrase-rules` CSS rule block.** `assets/app.css`.

    Append to the Phase 22-15 section that Task 1 created (immediately after the `.passphrase-btn-destructive:hover:not(:disabled)` rule, which itself was appended just before the `/* ── License Link (header) ──── */` block at L2157).

    Add a leading comment: "Phase 22-15 (Gap N12 / D3) — static complexity-rules hint block. Visual family matches `.passphrase-irreversible` (L2064) via the same warning tokens. Mirrors isWeakPassphrase()'s three rules exactly. Label-role heading (14px / 600 / 1.4); compact Body-role list items (14px / 400 / 1.4). Logical padding-inline-start for RTL-safe list-bullet indent."

    Rules to add:

    Rule 1 — `.passphrase-rules`:
    - `padding: 0.5rem 1rem;` (matches `.passphrase-irreversible` at L2065 exactly)
    - `background: var(--color-warning-bg, #fff3cd);` (matches L2066)
    - `color: var(--color-warning-text, #856404);` (matches L2067)
    - `border-radius: 0.5rem;` (matches L2068)
    - `font-size: 0.875rem;` (Body compact, 14px)
    - `line-height: 1.4;`

    Rule 2 — `.passphrase-rules-heading`:
    - `font-weight: 600;` (Label role — heading)
    - `margin-block-end: 0.25rem;` (4px = xs spacing token / 2; on-scale at the 4px sub-rung. Tight gap between heading and list.)

    Rule 3 — `.passphrase-rules-list`:
    - `margin: 0;`
    - `padding-inline-start: 1.25rem;` (20px — provides space for the `list-style: disc` bullets. NOT on the 22-UI-SPEC 8-rung scale because this is intrinsic list-bullet indent space, not a layout token; 1.25rem is the browser-default list indent baseline. If 22-UI-SPEC strictness is required, replace with `padding-inline-start: 1rem` — 16px, on-scale — and accept slightly tighter bullet space. Executor confirms with Ben during UAT.)
    - `list-style: disc;`

    Rule 4 — `.passphrase-rules-list li`:
    - `font-weight: 400;` (Body role)
    - `line-height: 1.4;`
    - `margin: 0;`

    Do NOT introduce any physical-axis margins or paddings. The `padding-inline-start` on the list is RTL-safe.

    **Step D — Verification before commit.**

    - `node -c assets/backup.js` parses
    - `grep -c 'passphrase-rules' assets/backup.js` returns ≥4 (className assignment on the wrapper div + className on the heading div + className on the ul + at least one reference)
    - `grep -c 'passphrase-rules' assets/app.css` returns ≥4 (one per rule: `.passphrase-rules`, `.passphrase-rules-heading`, `.passphrase-rules-list`, `.passphrase-rules-list li`)
    - `grep -c "backup.passphrase.rules" assets/backup.js` returns ≥4 (heading + 3 list-item keys passed to _t)
    - `grep -c "backup.passphrase.mismatchHint" assets/backup.js` returns ≥2 (the new validate() call site + the _t fallback entry from Task 1)
    - `awk '/function validate/,/^    }$/' assets/backup.js | grep -c 'mismatchHint'` returns 1 (the new validate-time hint — distinct from the louder confirmBtn-click fallback)
    - `awk '/confirmBtn.addEventListener/,/});$/' assets/backup.js | grep -c 'mismatchHint'` returns 0 (the louder defensive error inside confirmBtn click stays as backup.passphrase.mismatch, not the new lighter mismatchHint)
    - The new `.passphrase-rules` rule uses `--color-warning-bg` / `--color-warning-text` (matching `.passphrase-irreversible` family): `grep -A 8 '\.passphrase-rules {' assets/app.css | grep -q 'var(--color-warning-bg'` AND `grep -A 8 '\.passphrase-rules {' assets/app.css | grep -q 'var(--color-warning-text'`
    - No physical-axis padding/margin in the new rules: `grep -A 8 '\.passphrase-rules' assets/app.css | grep -cE 'margin-(left|right|top|bottom):|padding-(left|right):'` returns 0 (only the `margin: 0;` shorthand and `padding: 0.5rem 1rem;` shorthand are allowed — these are inherent to the rule shape, not physical-axis-specific overrides)
    - Heading uses Label-role weight: `grep -A 4 '\.passphrase-rules-heading {' assets/app.css | grep -q 'font-weight: 600'`
    - List items use Body-role weight: `grep -A 4 '\.passphrase-rules-list li {' assets/app.css | grep -q 'font-weight: 400'`
    - The rules block is appended only in encrypt mode — verified by reading: it lives inside the existing `if (isEncrypt) { ... }` block that wraps the irreversible-warning. Static grep: `awk '/var isEncrypt/,/var input2 = null;/' assets/backup.js | grep -c 'rulesBlock'` should return ≥2 (declaration + at least one entryPaneWrapper.appendChild reference within the same isEncrypt block).

    Commit message: `feat(22-15): mismatch hint + complexity-rules block in encrypt passphrase modal (N12 D2 D3)`
  </action>
  <verify>
    <automated>node -c assets/backup.js &amp;&amp; [ "$(grep -c 'passphrase-rules' assets/backup.js)" -ge 4 ] &amp;&amp; [ "$(grep -c 'passphrase-rules' assets/app.css)" -ge 4 ] &amp;&amp; [ "$(grep -c 'backup.passphrase.rules' assets/backup.js)" -ge 4 ] &amp;&amp; [ "$(grep -c 'backup.passphrase.mismatchHint' assets/backup.js)" -ge 2 ] &amp;&amp; [ "$(awk '/function validate/,/^    }$/' assets/backup.js | grep -c 'mismatchHint')" -eq 1 ] &amp;&amp; [ "$(awk '/confirmBtn.addEventListener/,/});$/' assets/backup.js | grep -c 'mismatchHint')" -eq 0 ] &amp;&amp; grep -A 8 '\.passphrase-rules {' assets/app.css | grep -q 'var(--color-warning-bg' &amp;&amp; grep -A 8 '\.passphrase-rules {' assets/app.css | grep -q 'var(--color-warning-text' &amp;&amp; grep -A 4 '\.passphrase-rules-heading {' assets/app.css | grep -q 'font-weight: 600' &amp;&amp; grep -A 4 '\.passphrase-rules-list li {' assets/app.css | grep -q 'font-weight: 400' &amp;&amp; [ "$(awk '/var isEncrypt/,/var input2 = null;/' assets/backup.js | grep -c 'rulesBlock')" -ge 2 ]</automated>
  </verify>
  <acceptance_criteria>
    - **Source assertion (rules block is encrypt-only):** The `rulesBlock` element creation + `entryPaneWrapper.appendChild(rulesBlock)` call sit INSIDE the existing `if (isEncrypt) { ... }` block (which wraps the irreversible-warning element at L158–163 of the pre-22-15 file). Verified by `awk '/var isEncrypt/,/var input2 = null;/' assets/backup.js | grep -c 'rulesBlock'` returning ≥2 (declaration + appendChild within the isEncrypt-bounded range).
    - **Source assertion (validate() mismatch branch):** Inside `validate()`, after the weakness check (which keeps precedence) and before the existing `confirmBtn.disabled = !input2 || ...` line, a new branch checks `input2 && v2 && v1 !== v2` and sets `errorEl.textContent = _t('backup.passphrase.mismatchHint')`. Verified by `awk '/function validate/,/^    }$/' assets/backup.js | grep -c 'mismatchHint'` returning exactly 1.
    - **Source assertion (defensive fallback unchanged):** The confirmBtn click handler's defensive louder mismatch error (currently using `backup.passphrase.mismatch` at L253) is untouched. Verified by `awk '/confirmBtn.addEventListener/,/});$/' assets/backup.js | grep -c 'mismatchHint'` returning 0 — the new lighter hint is ONLY in validate(), not in the click handler.
    - **Source assertion (rules-list mirrors isWeakPassphrase 1-to-1):** The `rulesKeys` array contains exactly 3 keys in this order: `backup.passphrase.rules.minLength`, `backup.passphrase.rules.notRepeated`, `backup.passphrase.rules.notOnlyDigits`. Verified by `grep -A 6 'var rulesKeys' assets/backup.js | grep -c 'backup.passphrase.rules.'` returning 3.
    - **Source assertion (CSS visual family with .passphrase-irreversible):** `.passphrase-rules` uses `var(--color-warning-bg, ...)` and `var(--color-warning-text, ...)`. Verified by `grep -A 8 '\.passphrase-rules {' assets/app.css | grep -q 'var(--color-warning-bg'` AND `grep -A 8 '\.passphrase-rules {' assets/app.css | grep -q 'var(--color-warning-text'`.
    - **Source assertion (CSS typography roles):** `.passphrase-rules-heading` uses `font-weight: 600` (Label role); `.passphrase-rules-list li` uses `font-weight: 400` (Body role). Both rules use `line-height: 1.4`.
    - **Source assertion (no physical-axis spacing in new rules):** `grep -A 8 '\.passphrase-rules' assets/app.css | grep -cE 'margin-(left|right|top|bottom):|padding-(left|right):'` returns 0 (allowing only the inline shorthand `margin: 0` / `padding: 0.5rem 1rem` and the logical `padding-inline-start` / `margin-block-end`).
    - **Parse assertion:** `node -c assets/backup.js` exits 0.
    - **UAT truth N12 (behaviour, manual UAT — verbatim from 22-15-CONTEXT.md and 22-HUMAN-UAT.md):** "Backup encryption password fields give the user actionable feedback when validation fails — visible mismatch error, complexity rules shown up-front, no silent dead-end." Verification steps:
      1. Open the app, click Export → encrypt passphrase modal opens.
      2. **Rules block visible BEFORE typing:** The rules-hint block appears between the irreversible warning and the first password input, with the heading "Password must:" and three list items: "Be at least 6 characters", "Not be the same character repeated", "Not be only numbers". Confirm visually in EN locale.
      3. **Weakness error path (existing behaviour preserved):** Type `abc` in input1. The errorEl shows "Passphrase must be at least 6 characters." (the existing tooShort error). Confirm button is disabled. Type `aaaaaa` (6 chars, all same). The errorEl shows "Passphrase is too simple..." (the existing tooSimple error). Confirm button is disabled. Type `111111111` (9 digits). errorEl shows "Passphrase is too simple...". Confirm button is disabled.
      4. **D2 mismatch hint (new):** Type a strong passphrase in input1 (e.g. `correct horse battery staple`). errorEl hides. Type a different strong value in input2 (e.g. `wrong stuff`). **errorEl shows "Passwords don't match yet."** (the new mismatchHint). Confirm button stays disabled.
      5. **Mismatch resolves when matched:** Fix input2 to match input1. errorEl hides. Confirm button enables.
      6. **D2 mismatch never fires while v1 weak:** Type `abc` in input1, `xyz` in input2. errorEl shows the weakness error (NOT mismatch — weakness takes precedence as locked by D2).
      7. **D2 mismatch hides when v2 empty:** Type a strong v1, leave v2 empty. errorEl hides (no premature mismatch error). Confirm button stays disabled (needs v2 to match).
      8. **Decrypt mode unaffected:** Trigger import / restore from .sgbackup → decrypt mode modal opens. **The rules-hint block is NOT rendered** (encrypt-only). There's only one input (no v2), so the mismatch branch is unreachable.
      9. **Switch UI to DE / HE / CS:** The rules-hint block and mismatch hint render in the correct language. In HE the block is RTL — bullets sit on the inline-end side of the list, heading reads right-to-left.
      10. **Pair with N11:** Type a strong v1, mismatched v2 → click Skip Encryption → confirm pane swaps in (the rules block is NOT visible on the confirm pane, only on the entry pane). Click Go back → entry pane returns; the rules block + mismatch hint state are preserved (input values intact).
    - **Behaviour (rules block is static):** The rules block does NOT update reactively as the user types. The reactive feedback is the errorEl. Verified by reading: rules block is constructed once at modal open, no input/change listener attached to it.
    - **Behaviour (defensive fallback survives):** Clicking confirmBtn with somehow-mismatched inputs (bypass case — shouldn't happen given validate() now catches mismatches before button enables, but the defensive code stays) still fires the louder `backup.passphrase.mismatch` error + clears both inputs + refocuses input1. This is the L251–260 defensive fallback that was preserved unchanged.
  </acceptance_criteria>
  <done>
    - `_showPassphraseModal` builds the `.passphrase-rules` block inside the existing `if (isEncrypt) { ... }` block, between the irreversible-warning and input1, appending to `entryPaneWrapper`.
    - The rules block contains a heading (`backup.passphrase.rules.heading`) and three list items in the exact order: minLength, notRepeated, notOnlyDigits — matching isWeakPassphrase()'s three rules one-to-one.
    - `validate()` inside `_showPassphraseModal` has a new mismatch branch that fires `errorEl.textContent = _t('backup.passphrase.mismatchHint')` when v1 is strong AND v2 has content AND v1 !== v2; weakness still takes precedence; mismatch never fires when v2 is empty.
    - The existing confirmBtn click handler's defensive louder mismatch error (backup.passphrase.mismatch) is untouched.
    - `assets/app.css` has the new `.passphrase-rules`, `.passphrase-rules-heading`, `.passphrase-rules-list`, `.passphrase-rules-list li` rules. Visual family matches `.passphrase-irreversible` via `--color-warning-bg` / `--color-warning-text`. Heading is Label-role (600); list items are Body-role (400); line-height 1.4 everywhere. Logical `padding-inline-start` for RTL-safe list bullets. No physical-axis margins/paddings.
    - `node -c assets/backup.js` parses.
    - Manual UAT confirms (a) rules block always visible in encrypt mode; (b) mismatch hint fires only after v1 is strong AND v2 has content; (c) weakness takes precedence; (d) decrypt mode unaffected; (e) all 4 locales render correctly including HE RTL.
  </done>
</task>

<task type="auto">
  <name>Task 3: i18n locale propagation — 8 new backup.passphrase keys × 4 locales (en/de/he/cs) — gender-neutral Hebrew by default</name>
  <files>assets/i18n-en.js, assets/i18n-de.js, assets/i18n-he.js, assets/i18n-cs.js</files>
  <read_first>
    - assets/i18n-en.js lines 236–252 (existing backup.passphrase.* block; the 8 new keys insert after L252 / after backup.passphrase.cancel)
    - assets/i18n-de.js lines 237–252 (same insertion point; DE uses `\u00XX` upper-hex escapes for umlauts — verified at L239 verschlüsseln, L241 Rücksetzmöglichkeit, L243 bestätigen)
    - assets/i18n-he.js lines 237–252 (same insertion point; HE raw UTF-8; **gender-neutral by default** — noun/infinitive forms only, NO -י female-imperative suffix anywhere in the 8 new strings)
    - assets/i18n-cs.js lines 237–252 (same insertion point; CS uses `\u00XX` upper-hex escapes for diacritics — verified at L237 Vytvořte, L239 zašifrování)
    - .planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-15-CONTEXT.md (canonical EN values; per-locale rules)
    - .planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-14-quick-text-visual-fixes-PLAN.md (Task 3 Hebrew gender-neutral sweep — same precedent applied here)
  </read_first>
  <action>
    Pure i18n edits across 4 files. No JS / CSS / HTML changes. Single semantic feature: 8 new keys (4 skipConfirm + 1 mismatchHint + 4 rules) per locale, group-ordered for grep-locatability.

    **Group order within each file (matters — keep consistent across all 4 locales):**
    1. `backup.passphrase.skipConfirm.heading`
    2. `backup.passphrase.skipConfirm.body`
    3. `backup.passphrase.skipConfirm.goBack`
    4. `backup.passphrase.skipConfirm.proceed`
    5. `backup.passphrase.mismatchHint`
    6. `backup.passphrase.rules.heading`
    7. `backup.passphrase.rules.minLength`
    8. `backup.passphrase.rules.notRepeated`
    9. `backup.passphrase.rules.notOnlyDigits`

    (9 lines per file × 4 files = 36 line additions total. Plus 0 deletions. Net +36 lines across the 4 i18n files.)

    Wait — the user spec says "8 new keys per file × 4 locales = 32 string additions". Recount: skipConfirm.heading, .body, .goBack, .proceed (4) + mismatchHint (1) + rules.heading, .minLength, .notRepeated, .notOnlyDigits (4) = 9 keys total. The CONTEXT.md says "8 i18n keys (new):" but lists 9 entries when summed (4 skipConfirm + 1 mismatchHint + 4 rules = 9). Treat the count in this plan as **9 keys × 4 locales = 36 line additions** to match the actual decision-content, and surface the discrepancy to Ben if he asks — the locked decisions list 9 distinct keys; the "8" appears to be a typo in CONTEXT.md's summary header. Sticking with 9.

    Insertion point per file: immediately AFTER `backup.passphrase.cancel` (currently L252 in each locale file, the last key in the existing backup.passphrase.* block). Append the 9 new lines as a contiguous group with a leading line-comment `// Phase 22-15 (Gap N11 + N12) — skip-confirm pane + mismatch hint + rules block`.

    **Step A — Insert into `assets/i18n-en.js` after L252.**

    The 9 lines to add (canonical EN, plain ASCII):

    ```
      // Phase 22-15 (Gap N11 + N12) — skip-confirm pane + mismatch hint + rules block
      "backup.passphrase.skipConfirm.heading": "Export without encryption?",
      "backup.passphrase.skipConfirm.body": "The backup file will contain all your client data unprotected. Anyone with access to the file can read it.",
      "backup.passphrase.skipConfirm.goBack": "Go back",
      "backup.passphrase.skipConfirm.proceed": "Yes, export unprotected",
      "backup.passphrase.mismatchHint": "Passwords don't match yet.",
      "backup.passphrase.rules.heading": "Password must:",
      "backup.passphrase.rules.minLength": "Be at least 6 characters",
      "backup.passphrase.rules.notRepeated": "Not be the same character repeated",
      "backup.passphrase.rules.notOnlyDigits": "Not be only numbers",
    ```

    **Step B — Insert into `assets/i18n-de.js` after L252.**

    DE translations. Plain ASCII where possible; `\u00XX` upper-hex escapes for umlauts (ä = `ä`, ö = `ö`, ü = `ü`, ß = `ß`):

    ```
      // Phase 22-15 (Gap N11 + N12) — skip-confirm pane + mismatch hint + rules block
      "backup.passphrase.skipConfirm.heading": "Ohne Verschlüsselung exportieren?",
      "backup.passphrase.skipConfirm.body": "Die Backup-Datei enthält alle Klientendaten ungeschützt. Jeder mit Zugriff auf die Datei kann sie lesen.",
      "backup.passphrase.skipConfirm.goBack": "Zurück",
      "backup.passphrase.skipConfirm.proceed": "Ja, ungeschützt exportieren",
      "backup.passphrase.mismatchHint": "Passwörter stimmen noch nicht überein.",
      "backup.passphrase.rules.heading": "Passwort muss:",
      "backup.passphrase.rules.minLength": "Mindestens 6 Zeichen lang sein",
      "backup.passphrase.rules.notRepeated": "Nicht aus demselben wiederholten Zeichen bestehen",
      "backup.passphrase.rules.notOnlyDigits": "Nicht nur aus Zahlen bestehen",
    ```

    **Step C — Insert into `assets/i18n-he.js` after L252.**

    HE translations. Raw UTF-8 per file convention. **Gender-neutral by default** — noun forms (ייצוא, גישה, חזרה) or infinitives (להכיל, להיות) only. NO female-imperative `-י` endings anywhere. The values:

    ```
      // Phase 22-15 (Gap N11 + N12) — skip-confirm pane + mismatch hint + rules block
      "backup.passphrase.skipConfirm.heading": "ייצוא ללא הצפנה?",
      "backup.passphrase.skipConfirm.body": "קובץ הגיבוי יכיל את כל נתוני הלקוחות ללא הגנה. כל מי שיש לו גישה לקובץ יוכל לקרוא אותו.",
      "backup.passphrase.skipConfirm.goBack": "חזרה",
      "backup.passphrase.skipConfirm.proceed": "כן, ייצוא ללא הגנה",
      "backup.passphrase.mismatchHint": "הסיסמאות עדיין אינן תואמות.",
      "backup.passphrase.rules.heading": "הסיסמה חייבת:",
      "backup.passphrase.rules.minLength": "להכיל לפחות 6 תווים",
      "backup.passphrase.rules.notRepeated": "לא להיות חזרה על אותו תו",
      "backup.passphrase.rules.notOnlyDigits": "לא להיות רק ספרות",
    ```

    **Self-check (executor MUST verify) — Hebrew gender-neutrality:** None of the 9 HE strings above contain a female-imperative form. Specifically, none ends in or contains as a standalone verb: `בחרי`, `הזיני`, `שמרי`, `מחקי`, `הקלידי`, `העתיקי`, `שלחי`, `ערכי`, `הקיפי`, `התחילי`. Run `grep -nE 'בחרי|הזיני|שמרי|מחקי|הקלידי|העתיקי|שלחי|ערכי|הקיפי|התחילי' assets/i18n-he.js` after the insert — if any matches appear that weren't there before, REVERT and rewrite the offending string. (22-14 already swept the file clean; 22-15 must not re-introduce any female-imperative.)

    The `הסיסמה חייבת` ("the password must") uses the feminine form because Hebrew `סיסמה` is grammatically feminine — this is grammatical gender (noun gender), NOT the female-imperative-suffix-`-י` pattern the sweep targets. Same for `אינן תואמות` ("don't match", feminine plural for the feminine noun `סיסמאות`). These are correct gender-neutral usage (the subject is the password, not the user).

    **Step D — Insert into `assets/i18n-cs.js` after L252.**

    CS translations. Plain ASCII for Latin chars; `\u00XX` upper-hex escapes for diacritics (á = `á`, č = `č`, ě = `ě`, í = `í`, ř = `ř`, š = `š`, ý = `ý`, ů = `ů`):

    ```
      // Phase 22-15 (Gap N11 + N12) — skip-confirm pane + mismatch hint + rules block
      "backup.passphrase.skipConfirm.heading": "Exportovat bez šifrování?",
      "backup.passphrase.skipConfirm.body": "Soubor zálohy bude obsahovat všechna data klientů bez ochrany. Kdokoli s přístupem k souboru je může číst.",
      "backup.passphrase.skipConfirm.goBack": "Zpět",
      "backup.passphrase.skipConfirm.proceed": "Ano, exportovat bez ochrany",
      "backup.passphrase.mismatchHint": "Hesla se zatím neshodují.",
      "backup.passphrase.rules.heading": "Heslo musí:",
      "backup.passphrase.rules.minLength": "Mít alespoň 6 znaků",
      "backup.passphrase.rules.notRepeated": "Nesmí být stejný znak opakovaně",
      "backup.passphrase.rules.notOnlyDigits": "Nesmí být jen čísla",
    ```

    **Step E — Verification before commit.**

    - `node -c assets/i18n-en.js && node -c assets/i18n-de.js && node -c assets/i18n-he.js && node -c assets/i18n-cs.js` — all 4 parse
    - For each of i18n-{en,de,he,cs}.js: each of the 9 new keys appears exactly once:
      - `grep -c '"backup.passphrase.skipConfirm.heading"' <file>` = 1
      - `grep -c '"backup.passphrase.skipConfirm.body"' <file>` = 1
      - `grep -c '"backup.passphrase.skipConfirm.goBack"' <file>` = 1
      - `grep -c '"backup.passphrase.skipConfirm.proceed"' <file>` = 1
      - `grep -c '"backup.passphrase.mismatchHint"' <file>` = 1
      - `grep -c '"backup.passphrase.rules.heading"' <file>` = 1
      - `grep -c '"backup.passphrase.rules.minLength"' <file>` = 1
      - `grep -c '"backup.passphrase.rules.notRepeated"' <file>` = 1
      - `grep -c '"backup.passphrase.rules.notOnlyDigits"' <file>` = 1
    - DE values use `\u00XX` upper-hex escapes where umlauts appear: `grep -q 'Verschl\\u00FCsselung exportieren' assets/i18n-de.js` AND `grep -q 'Zur\\u00FCck' assets/i18n-de.js` AND `grep -q 'Passw\\u00F6rter' assets/i18n-de.js`
    - CS values use `\u00XX` upper-hex escapes where diacritics appear: `grep -q 'sifrov\\u00E1n\\u00ED' assets/i18n-cs.js` AND `grep -q 'Zp\\u011Bt' assets/i18n-cs.js` AND `grep -q 'p\\u0159\\u00EDstupem' assets/i18n-cs.js`
    - HE: no female-imperative form introduced: `grep -cE 'בחרי|הזיני|שמרי|מחקי|הקלידי|העתיקי|שלחי|ערכי|הקיפי|התחילי' assets/i18n-he.js` returns 0 (matches the post-22-14 baseline)
    - HE: at least one of the 9 new HE strings is present raw UTF-8: `grep -q '"backup.passphrase.skipConfirm.heading": "ייצוא ללא הצפנה' assets/i18n-he.js` succeeds
    - No TODO placeholder/comment introduced in the 9-line insertion neighbourhood: `grep -B 1 'backup.passphrase.skipConfirm.heading' assets/i18n-en.js assets/i18n-de.js assets/i18n-he.js assets/i18n-cs.js | grep -ci 'TODO'` returns 0 (allow the "Phase 22-15" comment line; reject TODO/FIXME)
    - Total new key count across all 4 files: `grep -c 'backup.passphrase.skipConfirm\|backup.passphrase.mismatchHint\|backup.passphrase.rules' assets/i18n-en.js assets/i18n-de.js assets/i18n-he.js assets/i18n-cs.js` shows 9 per file × 4 files = 36 total (the awk-summed total is informational; per-file grep -c is the gate).

    Commit message: `i18n(22-15): add 9 backup.passphrase keys (skipConfirm + mismatchHint + rules) en/de/he/cs (N11 D1, N12 D2 D3)`
  </action>
  <verify>
    <automated>node -c assets/i18n-en.js &amp;&amp; node -c assets/i18n-de.js &amp;&amp; node -c assets/i18n-he.js &amp;&amp; node -c assets/i18n-cs.js &amp;&amp; [ "$(grep -c '\"backup.passphrase.skipConfirm.heading\"' assets/i18n-en.js)" -eq 1 ] &amp;&amp; [ "$(grep -c '\"backup.passphrase.skipConfirm.body\"' assets/i18n-en.js)" -eq 1 ] &amp;&amp; [ "$(grep -c '\"backup.passphrase.skipConfirm.goBack\"' assets/i18n-en.js)" -eq 1 ] &amp;&amp; [ "$(grep -c '\"backup.passphrase.skipConfirm.proceed\"' assets/i18n-en.js)" -eq 1 ] &amp;&amp; [ "$(grep -c '\"backup.passphrase.mismatchHint\"' assets/i18n-en.js)" -eq 1 ] &amp;&amp; [ "$(grep -c '\"backup.passphrase.rules.heading\"' assets/i18n-en.js)" -eq 1 ] &amp;&amp; [ "$(grep -c '\"backup.passphrase.rules.minLength\"' assets/i18n-en.js)" -eq 1 ] &amp;&amp; [ "$(grep -c '\"backup.passphrase.rules.notRepeated\"' assets/i18n-en.js)" -eq 1 ] &amp;&amp; [ "$(grep -c '\"backup.passphrase.rules.notOnlyDigits\"' assets/i18n-en.js)" -eq 1 ] &amp;&amp; [ "$(grep -c '\"backup.passphrase.skipConfirm.heading\"' assets/i18n-de.js)" -eq 1 ] &amp;&amp; [ "$(grep -c '\"backup.passphrase.skipConfirm.body\"' assets/i18n-de.js)" -eq 1 ] &amp;&amp; [ "$(grep -c '\"backup.passphrase.skipConfirm.goBack\"' assets/i18n-de.js)" -eq 1 ] &amp;&amp; [ "$(grep -c '\"backup.passphrase.skipConfirm.proceed\"' assets/i18n-de.js)" -eq 1 ] &amp;&amp; [ "$(grep -c '\"backup.passphrase.mismatchHint\"' assets/i18n-de.js)" -eq 1 ] &amp;&amp; [ "$(grep -c '\"backup.passphrase.rules.heading\"' assets/i18n-de.js)" -eq 1 ] &amp;&amp; [ "$(grep -c '\"backup.passphrase.rules.minLength\"' assets/i18n-de.js)" -eq 1 ] &amp;&amp; [ "$(grep -c '\"backup.passphrase.rules.notRepeated\"' assets/i18n-de.js)" -eq 1 ] &amp;&amp; [ "$(grep -c '\"backup.passphrase.rules.notOnlyDigits\"' assets/i18n-de.js)" -eq 1 ] &amp;&amp; [ "$(grep -c '\"backup.passphrase.skipConfirm.heading\"' assets/i18n-he.js)" -eq 1 ] &amp;&amp; [ "$(grep -c '\"backup.passphrase.skipConfirm.body\"' assets/i18n-he.js)" -eq 1 ] &amp;&amp; [ "$(grep -c '\"backup.passphrase.skipConfirm.goBack\"' assets/i18n-he.js)" -eq 1 ] &amp;&amp; [ "$(grep -c '\"backup.passphrase.skipConfirm.proceed\"' assets/i18n-he.js)" -eq 1 ] &amp;&amp; [ "$(grep -c '\"backup.passphrase.mismatchHint\"' assets/i18n-he.js)" -eq 1 ] &amp;&amp; [ "$(grep -c '\"backup.passphrase.rules.heading\"' assets/i18n-he.js)" -eq 1 ] &amp;&amp; [ "$(grep -c '\"backup.passphrase.rules.minLength\"' assets/i18n-he.js)" -eq 1 ] &amp;&amp; [ "$(grep -c '\"backup.passphrase.rules.notRepeated\"' assets/i18n-he.js)" -eq 1 ] &amp;&amp; [ "$(grep -c '\"backup.passphrase.rules.notOnlyDigits\"' assets/i18n-he.js)" -eq 1 ] &amp;&amp; [ "$(grep -c '\"backup.passphrase.skipConfirm.heading\"' assets/i18n-cs.js)" -eq 1 ] &amp;&amp; [ "$(grep -c '\"backup.passphrase.skipConfirm.body\"' assets/i18n-cs.js)" -eq 1 ] &amp;&amp; [ "$(grep -c '\"backup.passphrase.skipConfirm.goBack\"' assets/i18n-cs.js)" -eq 1 ] &amp;&amp; [ "$(grep -c '\"backup.passphrase.skipConfirm.proceed\"' assets/i18n-cs.js)" -eq 1 ] &amp;&amp; [ "$(grep -c '\"backup.passphrase.mismatchHint\"' assets/i18n-cs.js)" -eq 1 ] &amp;&amp; [ "$(grep -c '\"backup.passphrase.rules.heading\"' assets/i18n-cs.js)" -eq 1 ] &amp;&amp; [ "$(grep -c '\"backup.passphrase.rules.minLength\"' assets/i18n-cs.js)" -eq 1 ] &amp;&amp; [ "$(grep -c '\"backup.passphrase.rules.notRepeated\"' assets/i18n-cs.js)" -eq 1 ] &amp;&amp; [ "$(grep -c '\"backup.passphrase.rules.notOnlyDigits\"' assets/i18n-cs.js)" -eq 1 ] &amp;&amp; grep -q 'Verschl\\u00FCsselung exportieren' assets/i18n-de.js &amp;&amp; grep -q 'Passw\\u00F6rter' assets/i18n-de.js &amp;&amp; grep -q 'sifrov\\u00E1n\\u00ED' assets/i18n-cs.js &amp;&amp; grep -q 'Zp\\u011Bt' assets/i18n-cs.js &amp;&amp; [ "$(grep -cE 'בחרי|הזיני|שמרי|מחקי|הקלידי|העתיקי|שלחי|ערכי|הקיפי|התחילי' assets/i18n-he.js)" -eq 0 ] &amp;&amp; [ "$(grep -B 1 'backup.passphrase.skipConfirm.heading' assets/i18n-en.js assets/i18n-de.js assets/i18n-he.js assets/i18n-cs.js | grep -ci 'TODO')" -eq 0 ]</automated>
  </verify>
  <acceptance_criteria>
    - **Source assertion (32+ new key occurrences):** Each of the 9 new keys (`skipConfirm.heading`, `.body`, `.goBack`, `.proceed`, `mismatchHint`, `rules.heading`, `rules.minLength`, `rules.notRepeated`, `rules.notOnlyDigits`) appears exactly once in each of the 4 locale files. 9 × 4 = 36 verified single occurrences.
    - **Source assertion (DE upper-hex escapes):** `grep -q 'Verschl\\u00FCsselung exportieren' assets/i18n-de.js` succeeds (uses upper-hex `ü` escape, not raw UTF-8 `ü`). Same for `Zur\\u00FCck`, `Passw\\u00F6rter`.
    - **Source assertion (CS upper-hex escapes):** `grep -q 'sifrov\\u00E1n\\u00ED' assets/i18n-cs.js` succeeds (uses upper-hex `á`/`í` escapes, not raw UTF-8). Same for `Zp\\u011Bt`, `p\\u0159\\u00EDstupem`.
    - **Source assertion (HE raw UTF-8):** The HE values are present as raw UTF-8 strings (not unicode-escaped). At minimum: `grep -q '"backup.passphrase.skipConfirm.heading": "ייצוא ללא הצפנה' assets/i18n-he.js` succeeds.
    - **Source assertion (HE no female-imperative):** `grep -cE 'בחרי|הזיני|שמרי|מחקי|הקלידי|העתיקי|שלחי|ערכי|הקיפי|התחילי' assets/i18n-he.js` returns 0 — the 22-14 baseline is preserved; the 9 new strings introduce no female-imperative forms.
    - **Source assertion (no TODO/FIXME):** `grep -B 1 'backup.passphrase.skipConfirm.heading' assets/i18n-*.js | grep -ci 'TODO'` returns 0. No placeholder/TODO comment introduced in the insertion neighbourhood.
    - **Parse assertion:** `node -c assets/i18n-en.js && node -c assets/i18n-de.js && node -c assets/i18n-he.js && node -c assets/i18n-cs.js` exits 0 for each.
    - **Behavioural assertion (rendering — depends on Task 1 + Task 2):** After Task 3 commits, the new strings render correctly in the modal:
      - EN: confirm pane heading reads "Export without encryption?"; rules heading reads "Password must:"; rules items read the three plain-ASCII English values.
      - DE: confirm pane heading reads "Ohne Verschlüsselung exportieren?" (the `ü` escape decodes to `ü` at runtime); skipConfirm.goBack reads "Zurück" (the `ü` decodes); etc.
      - HE: confirm pane heading reads "ייצוא ללא הצפנה?" (raw UTF-8 Hebrew, RTL flow inherited from the modal's existing `dir='rtl'` setting); rules heading reads "הסיסמה חייבת:"; rules items read the three Hebrew infinitive/noun phrases.
      - CS: confirm pane heading reads "Exportovat bez šifrování?" (the `š` / `á` / `í` escapes decode at runtime); skipConfirm.goBack reads "Zpět"; etc.
    - **Behavioural assertion (Sapir UAT — follow-up, not a blocker):** Sapir confirms the 9 Hebrew strings read naturally for a native Hebrew speaker — no awkward phrasing, no leftover gendered forms, RTL flow correct. **Sapir's confirmation flips N11 and N12 UAT rows from `failed` to `closed-fixed` in 22-HUMAN-UAT.md.** The plan ships once the hard grep gates pass; Sapir review is a downstream step.
  </acceptance_criteria>
  <done>
    - All 4 i18n files have the 9 new keys, each appearing exactly once, with the correct localised value per locale.
    - EN values are pure ASCII canonical strings.
    - DE values use `\u00XX` upper-hex escapes for umlauts where they appear; pure ASCII otherwise.
    - HE values are raw UTF-8 with gender-neutral phrasing (noun/infinitive forms, no `-י` female-imperative suffix). The 22-14 sweep baseline is preserved.
    - CS values use `\u00XX` upper-hex escapes for diacritics where they appear; pure ASCII otherwise.
    - No TODO / FIXME placeholders introduced in any of the 4 files.
    - All 4 files parse via `node -c`.
    - With Task 1 + Task 2 + Task 3 landed together, the encrypt passphrase modal renders fully in all 4 languages — skip-confirm pane, mismatch hint, and rules block — without missing-key fallbacks (the runtime _t() resolves from the bundle; the L96–L113 fallbacks in backup.js are only consulted on bundle load failure).
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| User input → passphrase encryption pipeline | The user-typed passphrase becomes the derivation input for AES-GCM encryption of the backup. 22-15 does NOT touch this pipeline — only the modal UX wrapping it. |
| Skip-encryption confirmation → unencrypted backup download | The path that produces a `.zip` of all client data in plaintext. 22-15 ADDS a confirmation gesture in front of this path (privacy guard) but does not change the actual export pipeline. |
| i18n locale files → DOM | Static localised strings rendered into modal headings, button labels, error messages, and rules list. Source-controlled — no user content. |
| `setTimeout` callbacks → DOM | Focus management after pane swap (50ms delay before focus call). No user input involved. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-22-15-01 | Tampering | New i18n keys (skipConfirm.*, mismatchHint, rules.*) rendered into the passphrase modal | accept | All 9 values are source-controlled (static strings in committed locale files) and rendered via `textContent` (not `innerHTML`) per the existing `_showPassphraseModal` pattern. Even if a malicious actor edited a locale file in a fork, `textContent` neutralises any HTML/script — the string would render as inert text. No new attack surface. |
| T-22-15-02 | Tampering | New CSS classes (`.passphrase-skip-confirm`, `.passphrase-btn-destructive`, `.passphrase-rules`, `.passphrase-rules-heading`, `.passphrase-rules-list`, `.passphrase-rules-list li`) | accept | Pure presentational rules, no user-controlled selectors or values. No injection vector. The destructive button colour (`var(--color-danger, #ea4b4b)`) is a theme token, not a user-supplied value. |
| T-22-15-03 | Information Disclosure | Skip-encryption two-step gesture (D1) | **mitigate (this is the threat being CLOSED)** | The pre-22-15 single-click Skip Encryption path produced an unencrypted backup of ALL client data with zero confirmation — a privacy disclosure vector if the user clicked Skip by mistake or by reflex. 22-15 adds a destructive two-step confirmation pane that explicitly names "all your client data unprotected" in the body text. The pane uses a destructive red/orange primary button to break the click-through habit. The cancelBtn no longer reaches `opts.onSkip()` directly; reaching it now requires Skip Encryption → confirm pane → Yes export unprotected (two distinct gestures). |
| T-22-15-04 | Information Disclosure | Passphrase complexity rules visible up-front (D3) | accept | The rules block describes ENFORCEMENT logic that's already client-side and already in the open-source codebase (assets/backup.js L220–226 — anyone who reads the source can see the rules). Surfacing them in the UI does not leak new information; it surfaces what's already client-side. |
| T-22-15-05 | Denial of Service | Pane swap state machine | mitigate | If `activePane` gets out of sync (e.g. swap-to-confirm fires twice in a row), the modal could end up showing the wrong pane or no pane. Acceptance criteria explicitly verify (a) `entryPaneWrapper.parentNode` checks before detach (idempotent), (b) `skipConfirmPaneWrapper` is lazily built once and reused, (c) `activePane` state is updated consistently in both swap helpers, (d) Escape and X have distinct semantics (Escape goes back, X aborts), (e) the cancelBtn handler short-circuits with `if (isEncrypt) { swapToSkipConfirmPane(); return; }` to prevent the post-22-15 skip path from firing in decrypt mode. |
| T-22-15-06 | Denial of Service | `validate()` mismatch branch firing on every keystroke | accept | `validate()` is the existing input-listener target. The new mismatch branch adds 1 condition check + 1 textContent set + 1 hidden flag set + 1 disabled flag set + 1 return. O(1) cost per keystroke. Existing weakness-check regex is /^(.)\1+$/ and /^\d+$/ — both O(n) where n is the passphrase length (max practical ~64 chars). No DoS risk. |
| T-22-15-07 | Spoofing | n/a | accept | No auth, identity, or session-token surface affected. Backup encryption uses user-typed passphrase as the derivation input; 22-15 does not change the derivation, only the UX. |
| T-22-15-08 | Repudiation | n/a | accept | No audit-log or user-action records affected. (The therapist app is single-user and offline-first; no server-side log surface exists.) |
| T-22-15-09 | Elevation of Privilege | n/a | accept | No privilege boundaries crossed. The license-gate (Phase 19) and TOC-acceptance (Phase 19) are both upstream of the export flow. 22-15 adds NO new bypass surface; it adds a SLOWDOWN (the second gesture) on the already-permitted skip-encryption path. |

**Overall security posture:** 22-15 CLOSES a privacy gap (T-22-15-03 — the single-click unprotected-backup path) and adds NO new attack surface. Both fixes are presentational / UX guards on existing source-controlled code paths. The three-state resolve sentinel from 22-12 is preserved unchanged — the export pipeline's success/skip/cancel branches behave identically from `overview.js`'s perspective; only the gesture sequence on the skip path changed.
</threat_model>

<verification>
After all 3 tasks land, perform these checks:

1. `node -c assets/backup.js && node -c assets/i18n-en.js && node -c assets/i18n-de.js && node -c assets/i18n-he.js && node -c assets/i18n-cs.js` — all 5 modified JS files parse.

2. **Gap N11 / D1 — Skip-confirm pane state machine:** `grep -c 'activePane' assets/backup.js` ≥ 4 (declaration + ≥2 assignments + ≥1 read inside Escape branch + 1 read inside Enter branch). `grep -c 'entryPaneWrapper' assets/backup.js` ≥ 4. `grep -c 'skipConfirmPaneWrapper' assets/backup.js` ≥ 3. `grep -q 'passphrase-skip-confirm' assets/backup.js` AND `grep -q 'passphrase-skip-confirm' assets/app.css`. `grep -q 'passphrase-btn-destructive' assets/backup.js` AND `grep -q 'passphrase-btn-destructive' assets/app.css`.

3. **Gap N11 / D1 — Three-state resolve sentinel preserved:** `grep -c 'opts.onSkip' assets/backup.js` ≥ 2 (function-signature comment at L119 + the destructive proceed-button click handler in the confirm pane). `grep -c 'opts.onCancel' assets/backup.js` ≥ 4 (X close + dismissBtn + Escape-on-entry-pane + decrypt-mode cancelBtn). `grep -c "resolve\\('cancel'\\)" assets/backup.js` ≥ 1 (the cancel-sentinel resolve inside `exportEncryptedBackup`, unchanged from 22-12). `grep -c "resolve(false)" assets/backup.js` ≥ 1 (the skip-sentinel resolve inside `exportEncryptedBackup`, unchanged). `grep -c "resolve(true)" assets/backup.js` ≥ 1 (the encrypted-sentinel resolve inside `exportEncryptedBackup`, unchanged).

4. **Gap N11 / D1 — CSS destructive button:** `grep -A 12 '\.passphrase-btn-destructive {' assets/app.css | grep -q 'var(--color-danger'` AND `grep -q 'color: #fff'` AND `grep -q 'min-height: 44px'`. `grep -A 12 '\.passphrase-btn-destructive {' assets/app.css | grep -cE 'padding-(left|right):|margin-(left|right):'` = 0.

5. **Gap N12 / D2 — Mismatch hint in validate():** `awk '/function validate/,/^    }$/' assets/backup.js | grep -c 'mismatchHint'` = 1 (the new lighter inline hint). `awk '/confirmBtn.addEventListener/,/});$/' assets/backup.js | grep -c 'mismatchHint'` = 0 (the louder defensive fallback at confirmBtn click stays as `backup.passphrase.mismatch`, unchanged).

6. **Gap N12 / D3 — Rules block:** `grep -c 'passphrase-rules' assets/backup.js` ≥ 4 (wrapper + heading + list + at least one reference). `grep -c 'passphrase-rules' assets/app.css` ≥ 4 (4 rules: wrapper, heading, list, list-item). `awk '/var isEncrypt/,/var input2 = null;/' assets/backup.js | grep -c 'rulesBlock'` ≥ 2 (declaration + appendChild within the isEncrypt-bounded range — confirms encrypt-only insertion).

7. **Gap N12 / D3 — Rules mirror isWeakPassphrase 1-to-1:** `grep -A 6 'var rulesKeys' assets/backup.js | grep -c 'backup.passphrase.rules.'` = 3 (minLength + notRepeated + notOnlyDigits — the three checks at isWeakPassphrase L221, L223, L225).

8. **Gap N12 / D3 — CSS typography roles:** `grep -A 4 '\.passphrase-rules-heading {' assets/app.css | grep -q 'font-weight: 600'` (Label role); `grep -A 4 '\.passphrase-rules-list li {' assets/app.css | grep -q 'font-weight: 400'` (Body role); both use `line-height: 1.4`. Visual family: `grep -A 8 '\.passphrase-rules {' assets/app.css | grep -q 'var(--color-warning-bg'` AND `grep -q 'var(--color-warning-text'`.

9. **i18n (9 keys × 4 locales = 36 single occurrences):** For each of i18n-{en,de,he,cs}.js: each of `skipConfirm.heading`, `.body`, `.goBack`, `.proceed`, `mismatchHint`, `rules.heading`, `rules.minLength`, `rules.notRepeated`, `rules.notOnlyDigits` appears exactly once. 9 keys × 4 files = 36 grep -c == 1 checks.

10. **i18n encoding conventions:** DE — `grep -q 'Verschl\\u00FCsselung exportieren' assets/i18n-de.js` AND `grep -q 'Zur\\u00FCck' assets/i18n-de.js` AND `grep -q 'Passw\\u00F6rter' assets/i18n-de.js`. CS — `grep -q 'sifrov\\u00E1n\\u00ED' assets/i18n-cs.js` AND `grep -q 'Zp\\u011Bt' assets/i18n-cs.js`. HE — `grep -q 'ייצוא ללא הצפנה' assets/i18n-he.js` (raw UTF-8).

11. **HE gender-neutral baseline preserved:** `grep -cE 'בחרי|הזיני|שמרי|מחקי|הקלידי|העתיקי|שלחי|ערכי|הקיפי|התחילי' assets/i18n-he.js` = 0 (no female-imperative form anywhere in the file; the 22-14 sweep baseline holds; 22-15 introduces no regressions).

12. **No TODO / FIXME introduced:** `grep -B 1 'backup.passphrase.skipConfirm.heading' assets/i18n-*.js | grep -ci 'TODO'` = 0. `grep -ciE 'TODO|FIXME' assets/backup.js | head -1` — should be the same value as the pre-22-15 baseline (no new TODOs in backup.js either).

13. **`_t` fallback map has the 9 new entries:** `grep -c "'backup.passphrase.skipConfirm" assets/backup.js` ≥ 4; `grep -c "'backup.passphrase.rules" assets/backup.js` ≥ 4; `grep -c "'backup.passphrase.mismatchHint" assets/backup.js` ≥ 1. (Resilience — protects against the rare case where the i18n bundle fails to load.)

Manual UAT (must be performed by Ben after deploy; Sapir's confirmation needed for Hebrew strings before flipping N11 / N12 to `closed-fixed`):

**Gap N11 (skip-encryption confirmation):**
- Open the app at `overview.html` → click Export → encrypt passphrase modal opens (entry pane).
- Click **Skip Encryption** → modal body swaps to confirm pane (NOT a stacked second modal). Heading "Export without encryption?"; body naming the privacy implication; secondary "Go back" and primary destructive "Yes, export unprotected" buttons.
- Verify NO file has been downloaded at this point.
- Click **Go back** → modal swaps back to the entry pane. Any typed passphrase values are preserved. Focus returns to input1.
- Click Skip Encryption again → confirm pane returns. Press **Escape** → swaps back to entry (NOT abort).
- Click Skip Encryption again → confirm pane returns. Click **X (top-right)** → modal closes entirely, NO file downloaded.
- Click Skip Encryption again → confirm pane → click **"Yes, export unprotected"** → modal closes, `.zip` IS downloaded (existing skip path unchanged from caller's perspective).
- Re-open → type strong passphrase + matching confirm → click **Encrypt and Save** → `.sgbackup` IS downloaded (encrypted path unchanged).
- Re-open → press **Escape** on entry pane → modal closes, NO file (existing abort behaviour preserved).
- Switch UI to DE / HE / CS → repeat. In HE, the confirm pane is RTL.

**Gap N12 (password dialog feedback):**
- Open Export → encrypt modal. Confirm the rules-hint block is visible BEFORE typing, between the irreversible warning and the first input. Three items: "Be at least 6 characters", "Not be the same character repeated", "Not be only numbers".
- Type `abc` in input1 → existing weakness error "Passphrase must be at least 6 characters." appears.
- Type `aaaaaa` → existing weakness error "Passphrase is too simple..." appears.
- Type `111111111` → existing weakness error "Passphrase is too simple..." (pure digits rejected — the rules-block prediction is now visible AND the reactive error fires).
- Type a strong passphrase in input1; type a DIFFERENT strong value in input2 → **NEW: "Passwords don't match yet." error appears**, button disabled.
- Fix input2 to match → error hides, button enables.
- Type a weak v1 + a different v2 → weakness error appears (weakness takes precedence; mismatch is not surfaced until v1 is strong).
- Trigger import (restore from `.sgbackup`) → decrypt mode modal opens → **the rules-hint block is NOT shown** (encrypt-only); only the existing decrypt-pane UI.
- Switch UI to DE / HE / CS → rules and mismatch hint render in the correct language. In HE the modal is RTL.

**Pair N11 + N12 (cross-interaction):**
- Type strong v1 + mismatched v2 → mismatch error appears → click Skip Encryption → confirm pane swaps in. The rules block is NOT visible on the confirm pane (only on the entry pane). Click Go back → entry pane returns; input values + the mismatch error state are preserved.
- Same flow but click **Yes, export unprotected** instead → `.zip` IS downloaded (skip path resolves `false`; the mismatch state on the abandoned entry pane is irrelevant).

**Sapir UAT (follow-up step):** Sapir reads through the 9 Hebrew strings and confirms each is gender-neutral, natural, and the RTL flow is correct. Sapir's confirmation flips N11 + N12 UAT rows from `failed` to `closed-fixed` in `22-HUMAN-UAT.md`. Plan ships on hard grep gate pass; Sapir review is a downstream step.
</verification>

<success_criteria>
- Both UAT `truth:` statements (N11, N12) become provable in `22-HUMAN-UAT.md`. The hard grep gates close on the Task 3 commit; the row status flips from `failed` to `closed-fixed` after manual UAT (Ben on both gaps, Sapir on the Hebrew strings).
- N11 acceptance: Skip-Encryption requires a two-step gesture (Skip → confirm pane → Yes, export unprotected). Entry-pane input values preserved across pane swap. Escape on confirm pane goes back; Escape on entry pane aborts. X close button aborts from either pane. The three-state resolve sentinel from 22-12 is preserved unchanged — `true` (encrypted) / `false` (skip) / `'cancel'` (abort) resolutions reach overview.js exactly as before.
- N12 acceptance: Rules-hint block visible in encrypt mode at all times (decrypt mode hidden), mirroring isWeakPassphrase()'s three rules 1-to-1. Mismatch hint fires in validate() when v1 is strong AND v2 has content AND v1 !== v2 (weakness takes precedence). The defensive louder mismatch error inside the confirmBtn click handler stays untouched.
- D4 (live strength indicator) is NOT implemented and not present in any plan artifact — confirmed by `grep -ic 'strength.*indicator\|password.*strength' assets/backup.js` returning 0 (no such code path introduced).
- All existing 22-10 / 22-11 / 22-12 / 22-13 / 22-14 acceptance criteria still pass (no regression in: pill state machine, mobile tabs, export modal navigation, formatting-tips disclosure, settings page, edit icon size, DOB picker, Hebrew copy, the three-state resolve sentinel itself).
- Zero new console errors on Export click, passphrase modal open, encrypt/decrypt path, pane swap, language switch, or import flow.
- 3 atomic commits land on the working branch (one per task: Task 1 → Task 2 → Task 3).
- No TODO placeholders introduced in any of the 4 i18n files or in `backup.js` / `app.css`.
- i18n serialisation note: 22-15 becomes the new baseline for any downstream parallel-batched plan that touches the i18n files. The Task 3 commit lands sequentially within this plan; no parallel-execution conflict here.
- Hebrew gender-neutral baseline from 22-14 is preserved: zero female-imperative forms in `assets/i18n-he.js` after 22-15 lands.
- Sapir UAT on Hebrew strings (the 9 new keys) is acknowledged as a follow-up step that flips the UAT rows N11 + N12 to `closed-fixed`; it does NOT block this plan from shipping once the hard grep gates pass.
</success_criteria>

<output>
After completion, create `.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-15-backup-encryption-ux-pair-SUMMARY.md` per the template, recording:

- Each commit SHA (one per task = 3 commits expected: Task 1 → Task 2 → Task 3).
- Which UAT gap each commit closes:
  - Task 1 → N11 (Gap N11 / D1 — Skip-Encryption two-step confirm pane)
  - Task 2 → N12 (Gap N12 / D2 — mismatch hint + Gap N12 / D3 — rules-hint block)
  - Task 3 → both (i18n locale propagation for all 9 keys across en/de/he/cs)
- The exact line numbers in `assets/backup.js` of:
  - The `entryPaneWrapper` declaration.
  - The `activePane`, `skipConfirmPaneWrapper`, `buildSkipConfirmPane`, `swapToSkipConfirmPane`, `swapToEntryPane` definitions.
  - The new mismatch branch inside `validate()` (the line where `errorEl.textContent = _t('backup.passphrase.mismatchHint')` is set).
  - The new rules-block construction (the line where `var rulesBlock = ...` is declared).
  - The 9 new fallback entries in the `_t` fallback map.
- The exact line numbers in `assets/app.css` of the new `.passphrase-skip-confirm`, `.passphrase-btn-destructive`, `.passphrase-rules`, `.passphrase-rules-heading`, `.passphrase-rules-list`, `.passphrase-rules-list li` rules.
- The exact line numbers in each of the 4 i18n files where the 9 new keys were inserted.
- The DE values verbatim with their `\u00XX` escape forms preserved.
- The CS values verbatim with their `\u00XX` escape forms preserved.
- The HE values verbatim (raw UTF-8), with an explicit confirmation that none contain a `-י` female-imperative suffix.
- The verification grep results for each step (1–13 above).
- The final reference counts: `activePane` ≥ 4, `entryPaneWrapper` ≥ 4, `skipConfirmPaneWrapper` ≥ 3, `passphrase-rules` ≥ 4 in backup.js, `passphrase-rules` ≥ 4 in app.css, 9 new i18n keys × 4 locales = 36 single-occurrence grep checks all pass.
- The three-state resolve sentinel preservation evidence: post-task code paths from `exportEncryptedBackup()`'s perspective (true / false / 'cancel' all reach overview.js exactly as in 22-12).
- Sapir UAT result for N11 + N12 Hebrew: pending / confirmed (with the date Sapir reviewed).
- Any deviations from the locked plan (there should be none — this is a tight 3-task gap-closure with D4 explicitly deferred).
</output>
</content>
</invoke>