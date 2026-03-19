# Phase 10: UX Power Features - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can crop/reposition client photos after upload with drag+zoom, and edit client details from the add-session screen via a modal — without navigating away. No new data fields or session form changes.

</domain>

<decisions>
## Implementation Decisions

### Photo Crop — Timing & Trigger
- Crop modal opens **immediately after photo upload** in the add-client form
- A separate "recrop" button available on existing photos for re-editing later
- Crop only available on the full add-client page — NOT in the inline client creation form on add-session

### Photo Crop — Interaction
- **Drag to reposition** + **pinch/scroll zoom** in/out
- Crop area shape: **rounded square** (matching existing `border-radius: 18px` preview style)
- Opens as a **modal overlay** on top of the form — does not navigate away

### Photo Crop — Storage
- Only the **cropped result** is saved to IndexedDB (Canvas → dataURL)
- Original image is NOT preserved — if user wants to recrop, they upload a new photo
- Keeps storage simple — single `photoData` field, same as current

### Photo Crop — Cancel Behavior
- Claude's Discretion: Keep it simple and non-frustrating for the user

### Edit Client from Session — Interface
- Opens as a **modal** with the full client form (same fields as add-client page: name, birth date, email, phone, client type, photo, notes, referral source)
- Triggered by a **pencil/edit icon button** next to the selected client name in the dropdown area
- Button only appears when an **existing client** is selected — not visible during inline new client creation

### Edit Client from Session — Save Behavior
- After saving in the modal, the client name in the dropdown and throughout the session form **updates immediately** — no page refresh needed
- Session form data (issues, comments, etc.) is preserved untouched while editing the client

### Claude's Discretion
- Crop modal button labels and layout
- Edit icon style (pencil vs gear vs other)
- Crop canvas resolution/quality settings
- Cancel behavior details for crop modal
- Error handling for corrupt/unsupported image formats
- Modal animation and transition style
- Zoom control UI (slider vs buttons vs scroll-only)

</decisions>

<specifics>
## Specific Ideas

- User emphasized: must be **simple to use and not tedious** — the crop experience should be quick and intuitive
- Crop should feel natural on both desktop (mouse drag + scroll zoom) and mobile (touch drag + pinch zoom)
- The edit button should be subtle — not competing with the main session form flow, but easily discoverable when needed

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `assets/add-client.js`: Full photo upload flow with `readFileAsDataURL()` — crop modal hooks into this after file read
- `assets/add-client.js`: Complete client form handling (save, edit, delete) — modal reuses this logic
- `assets/app.js`: `App.confirmDialog()` returns Promise — pattern for modal dialogs
- `assets/overview.js`: Client detail modal already exists — similar modal pattern for edit
- `assets/add-session.js`: Inline client form (`inlineClientForm`) — edit button integrates near dropdown, NOT inside inline form

### Established Patterns
- Photo: `readFileAsDataURL(file)` → `photoData` string → saved to IndexedDB `photoData` field
- Photo preview: `<img class="photo-preview">` with `border-radius:18px`, `object-fit:cover`, `120px`
- Avatars: `.client-avatar` class (`36px`, `border-radius:12px`) — crop result displays here
- Modals: `.modal-overlay` class with backdrop, centered content, close button
- i18n: All labels need keys in 4 languages via `App.t("key")` + `data-i18n`

### Integration Points
- `assets/add-client.js`: Insert crop modal trigger after `photoInput.change` event (line 48-57)
- `assets/add-session.js`: Add edit button near client dropdown; open modal with selected `clientId`
- `assets/app.css`: Styles for crop modal overlay, zoom controls, edit icon button
- `assets/db.js`: No schema changes needed — `photoData` field already stores the image
- `assets/i18n-*.js` (all 4 languages): New keys for crop modal buttons, edit client button tooltip

</code_context>

<deferred>
## Deferred Ideas

- **כפתור "העתק" בשדות טקסט של מפגש** — כפתור copy ליד כל שדה טקסט בטופס מפגש, להעתקה קלה ללקוח. יכולת חדשה — פאזה עתידית
- **בחירת שנת לידה יעילה** — הדייט פיקר הנוכחי דורש גרירה אחורה ארוכה לשנים רחוקות. צריך שיפור UX (למשל בורר שנה נפרד או הקלדה ישירה). יכולת חדשה — פאזה עתידית

</deferred>

---

*Phase: 10-ux-power-features*
*Context gathered: 2026-03-19*
