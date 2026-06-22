# Phase 21: Comprehensive Mobile Responsiveness - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-31
**Phase:** 21-comprehensive-mobile-responsiveness-audit-and-fix-all-app-screens-for-iphone-mobile-viewport
**Areas discussed:** Modal & crop overflow, Form layout, Navigation & z-index, Touch targets, Breakpoint strategy, Testing approach, Legal pages

---

## Modal & Crop Overflow

### Modal behavior on small screens

| Option | Description | Selected |
|--------|-------------|----------|
| Scrollable modal body | max-height: 90vh, overflow-y: auto, pinned action buttons | ✓ |
| Full-screen modal on mobile | Below 640px, modals fill viewport | |
| You decide | Claude picks | |

**User's choice:** Scrollable modal body with pinned actions
**Notes:** None

### Crop modal adaptation

| Option | Description | Selected |
|--------|-------------|----------|
| Shrink canvas to 220px on mobile | Reduce from 300px, keep all controls visible | ✓ |
| Make crop modal scrollable | Apply same scroll pattern, canvas stays 300px | |
| You decide | Claude picks | |

**User's choice:** Shrink canvas to 220px
**Notes:** None

---

## Form Layout

### Form field reflow

| Option | Description | Selected |
|--------|-------------|----------|
| Stack all fields vertically | Below 640px, every field full-width and stacked | ✓ |
| Smart grouping | Keep short fields side-by-side, only stack text inputs | |
| You decide | Claude picks | |

**User's choice:** Stack all fields vertically
**Notes:** None

### Date input on mobile

| Option | Description | Selected |
|--------|-------------|----------|
| Native date picker | Single input type="date" on mobile, OS provides touch picker | ✓ |
| Keep dropdowns, enlarge | Keep 3-dropdown pattern, increase to 44px height | |
| You decide | Claude picks | |

**User's choice:** Native date picker on mobile
**Notes:** None

### Session form sections

| Option | Description | Selected |
|--------|-------------|----------|
| All sections visible, stacked | Keep everything visible, user scrolls | |
| Collapsible accordion sections | Each section collapses/expands, active stays open | ✓ |
| You decide | Claude picks | |

**User's choice:** Collapsible accordion sections
**Notes:** None

### Severity scale on mobile

| Option | Description | Selected |
|--------|-------------|----------|
| Two rows of buttons | Split 0-5 and 6-10, buttons stay ~36-40px | ✓ |
| Range slider | Replace buttons with slider input | |
| You decide | Claude picks | |

**User's choice:** Two rows of buttons
**Notes:** None

---

## Navigation & Z-index

### Nav on mobile

| Option | Description | Selected |
|--------|-------------|----------|
| Compact horizontal scroll nav | Single scrollable row, no hamburger | ✓ |
| Hamburger menu | Collapse behind ☰ button | |
| Bottom tab bar | Fixed tabs at bottom | |

**User's choice:** Compact horizontal scroll nav
**Notes:** None

### Z-index strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Define a z-index scale | CSS custom properties for layers | ✓ |
| Just fix conflicts | Only change values that cause bugs | |
| You decide | Claude picks | |

**User's choice:** Define z-index token scale
**Notes:** None

### Overlay tap close

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, overlay tap closes | Standard mobile pattern, with data protection | ✓ |
| No, only X button closes | Force close button usage | |
| You decide | Claude picks per modal type | |

**User's choice:** Yes, with important caveat
**Notes:** User specifically requested that form modals with unsaved data (session maintenance, photo upload) must NOT silently discard data. Either disable overlay-close for these or show "discard changes?" confirmation.

### Scroll lock

| Option | Description | Selected |
|--------|-------------|----------|
| Lock scroll when overlay active | Prevent body scroll behind modals/dropdowns | ✓ |
| No scroll lock | Keep current behavior | |
| You decide | Claude picks | |

**User's choice:** Lock scroll when modal/dropdown open
**Notes:** None

---

## Breakpoint Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Two breakpoints: 768px + 480px | Tablet + phone, consolidate existing | ✓ |
| Single breakpoint: 640px | One mobile breakpoint | |
| You decide | Claude picks | |

**User's choice:** Two breakpoints (768px + 480px)
**Notes:** Existing 900/700/640/600px breakpoints get consolidated into these two.

---

## Testing Approach

### Verification method

| Option | Description | Selected |
|--------|-------------|----------|
| Real iPhone testing | Ben tests on real iPhone via localhost, iterate | ✓ |
| Screen-by-screen checklist | Detailed checklist, final iPhone pass | |
| You decide | Claude picks | |

**User's choice:** Real iPhone testing
**Notes:** None

### Priority screens

| Option | Description | Selected |
|--------|-------------|----------|
| Forms first | add-client, add-session | |
| Overview + modals first | Main screen and modal system | |
| You decide | Claude sequences by severity | |

**User's choice:** Forms + overview (co-priority)
**Notes:** User specified both forms and overview as equal priority.

---

## Legal Pages

| Option | Description | Selected |
|--------|-------------|----------|
| Basic responsive pass | Ensure text doesn't overflow, license form works | ✓ |
| Full mobile redesign | Same attention as app screens | |
| Skip entirely | Focus only on app screens | |

**User's choice:** Basic responsive pass
**Notes:** None

---

## Claude's Discretion

- Action button sizing on mobile cards (overview table) — Claude picks best approach based on stacked card layout

## Deferred Ideas

- Session viewing UX redesign (read mode, session cards) — full UX redesign, belongs in its own phase
- PWA install guidance — tangentially related, not a responsive fix

## Folded Todos

- Photo crop bug (crop breaks when editing client from session screen) — folded into this phase
