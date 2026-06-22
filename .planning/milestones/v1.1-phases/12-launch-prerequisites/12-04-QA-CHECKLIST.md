# Sessions Garden — QA Checklist

**Before launch, test everything in this list.** Go section by section. When something works, check the box. When something is broken — take a screenshot, write down which browser and device, and report to Claude.

You do not need to test all browsers for every section. Focus on coverage:
- **Mac:** Chrome and Safari
- **Windows PC:** Chrome, Firefox, and Edge
- **iPhone:** Safari

---

## How to report a bug

Screenshot the problem + write this:
> **Device:** MacBook / Windows PC / iPhone
> **Browser:** Chrome / Firefox / Safari / Edge
> **Where:** Landing page / App / specific page name
> **What I expected:** ...
> **What actually happened:** ...

---

## Area 1 — Landing Page: Visual and Content

> Open the landing page in each browser. Test this whole section in Chrome first, then repeat in Safari / Firefox / Edge as marked.

### 1.1 Page loads correctly

| Check | Mac Chrome | Mac Safari | Win Chrome | Win Firefox | Win Edge | iPhone Safari |
|-------|:----------:|:----------:|:----------:|:-----------:|:--------:|:-------------:|
| Page opens without errors | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| Logo appears in the header | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| Hero section visible (headline + description + buy button) | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| Aurora/glow background animation plays (subtle colored glow behind hero) | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |

**If broken:** Note which browser, what you see instead (blank? error? layout broken?), take screenshot.

---

### 1.2 All sections visible

> Scroll slowly from top to bottom and confirm each section is present.

| Check | Mac Chrome | Mac Safari | Win Chrome | Win Firefox | Win Edge | iPhone Safari |
|-------|:----------:|:----------:|:----------:|:-----------:|:--------:|:-------------:|
| Features section (shows the 3–4 app highlights) | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| Screenshots section (app preview images) | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| Pricing section (shows €119 and €159 prices) | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| Contact section (email or contact info) | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| Footer with Impressum and Datenschutzerklärung links | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |

**If broken:** Screenshot + note which section is missing or looks wrong.

---

### 1.3 Legal content (Impressum and Privacy Policy)

> Click on Impressum in the footer. Click on Datenschutzerklärung in the footer.

| Check | Done? |
|-------|:-----:|
| Impressum expands and shows business details (name, address, email) — NOT just "[YOUR_NAME]" placeholder | [ ] |
| Datenschutzerklärung expands and shows full privacy policy text — NOT just a TODO note | [ ] |
| The privacy policy is in German | [ ] |

**If broken:** Note exactly what you see (placeholder text? blank? not expanding at all?).

---

### 1.4 Buy buttons

> Click both buy buttons: one in the hero area, one in the pricing section.

| Check | Done? |
|-------|:-----:|
| Hero buy button is clickable | [ ] |
| Pricing buy button is clickable | [ ] |
| Clicking a buy button opens a Lemon Squeezy checkout page (or if placeholder still active — note that) | [ ] |

**If broken:** Note which button and what happens when you click (nothing? error page? wrong URL?).

---

### 1.5 Dark mode on landing page

> Find the dark/light toggle button (usually sun/moon icon) and test it.

| Check | Done? |
|-------|:-----:|
| Dark mode toggle button is visible | [ ] |
| Clicking it switches to dark background | [ ] |
| All text is readable in dark mode (no invisible text) | [ ] |
| Logo is visible in dark mode | [ ] |
| All sections look clean in dark mode (no broken colors) | [ ] |
| Clicking toggle again returns to light mode | [ ] |

**If broken:** Screenshot of the specific element that looks wrong in dark mode.

---

### 1.6 Language switcher on landing page

> Find the language switcher (EN / HE / DE / CS buttons or dropdown).

| Check | Done? |
|-------|:-----:|
| Language switcher is visible | [ ] |
| Switching to EN: all text changes to English | [ ] |
| Switching to DE: all text changes to German | [ ] |
| Switching to CS: all text changes to Czech | [ ] |
| Switching to HE: all text changes to Hebrew | [ ] |
| No "missing" strings visible (no English words showing up inside a German or Czech page) | [ ] |

**If broken:** Screenshot + note which language had the problem and which text wasn't translated.

---

### 1.7 Hebrew layout on landing page

> Switch language to HE (Hebrew) and check the layout.

| Check | Done? |
|-------|:-----:|
| Page layout flips to right-to-left (text starts on the right) | [ ] |
| Navigation / header items align right | [ ] |
| No text is cut off or overlapping other elements | [ ] |
| Images and decorations are in reasonable positions | [ ] |

**If broken:** Screenshot + describe what looks misaligned.

---

### 1.8 Mobile layout on landing page

> Open on iPhone Safari, or resize your browser window to a narrow width (phone-size).

| Check | Done? |
|-------|:-----:|
| No horizontal scrollbar (page fits in the screen width) | [ ] |
| Text is readable (not tiny) | [ ] |
| Navigation menu is usable (hamburger menu or collapsed) | [ ] |
| Buy buttons are easy to tap (not too small) | [ ] |
| Pricing section readable on small screen | [ ] |
| Footer is accessible and readable | [ ] |

**If broken:** Screenshot from iPhone or resized browser.

---

## Area 2 — App: Core Flow

> Open the app itself (not the landing page) in each browser. Test each feature.

### 2.1 App opens and loads

| Check | Mac Chrome | Mac Safari | Win Chrome | Win Firefox | Win Edge | iPhone Safari |
|-------|:----------:|:----------:|:----------:|:-----------:|:--------:|:-------------:|
| App loads without an error screen | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| License key screen or main app content is shown | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |

---

### 2.2 License and disclaimer

| Check | Done? |
|-------|:-----:|
| Entering a valid license key accepts it and proceeds | [ ] |
| Disclaimer screen appears on first use | [ ] |
| Accepting the disclaimer proceeds to the main app | [ ] |

*If you don't have a test license key, skip the license step and note that you tested without one.*

---

### 2.3 Adding a client

| Check | Done? |
|-------|:-----:|
| "Add client" button is visible and clickable | [ ] |
| Form opens with all fields (name, notes, referral source, photo, etc.) | [ ] |
| Filling in the fields and saving: client appears in the client list | [ ] |
| The saved client shows the correct name | [ ] |

**If broken:** Note which field caused a problem or what error appeared.

---

### 2.4 Photo upload and crop

| Check | Done? |
|-------|:-----:|
| Clicking the photo area opens a file picker | [ ] |
| Selecting a photo shows a crop interface | [ ] |
| You can drag/reposition the crop area | [ ] |
| Saving the crop: photo appears on the client card | [ ] |
| The photo is displayed correctly (not stretched, not missing) | [ ] |

**If broken:** Note where in the photo flow it broke.

---

### 2.5 Adding a session

| Check | Done? |
|-------|:-----:|
| Clicking a client opens their detail page | [ ] |
| "Add session" button is visible | [ ] |
| Session form opens with all fields | [ ] |
| Heart Shield toggle appears in the session form | [ ] |
| Filling in the session and saving: session appears in history | [ ] |
| The saved session shows the correct date and details | [ ] |

**If broken:** Note which field or step caused the problem.

---

### 2.6 Editing a client

| Check | Done? |
|-------|:-----:|
| Edit button exists on a client (pencil icon or "Edit" button) | [ ] |
| Edit form opens with existing data pre-filled | [ ] |
| Changing a field and saving: changes are reflected on the client card | [ ] |

---

### 2.7 Client search and filters

| Check | Done? |
|-------|:-----:|
| Search bar filters the client list as you type | [ ] |
| Results update immediately (no delay or broken state) | [ ] |
| Clearing search shows all clients again | [ ] |

---

### 2.8 Heart Shield feature

| Check | Done? |
|-------|:-----:|
| A client with an active Heart Shield shows a red heart icon | [ ] |
| A client whose Heart Shield is fully removed shows a checkmark (green) | [ ] |
| Session type filter (All / Heart Shield / Regular) works correctly | [ ] |

---

### 2.9 Backup: export and import

| Check | Done? |
|-------|:-----:|
| Backup export button is visible (in settings or client list) | [ ] |
| Clicking export downloads a ZIP file to your device | [ ] |
| The ZIP file is not empty (has some size) | [ ] |
| Backup import: choosing a ZIP file restores the data | [ ] |
| After import, clients and sessions reappear correctly | [ ] |

**If broken:** Note if the export doesn't start, or if the import gives an error.

---

## Area 3 — App: Language and RTL

> In the app, find the language switcher (usually in settings or header).

| Check | Done? |
|-------|:-----:|
| Switching to English: all app text is in English | [ ] |
| Switching to German (DE): all app text is in German — no English words mixed in | [ ] |
| Switching to Czech (CS): all app text is in Czech — no English words mixed in | [ ] |
| Switching to Hebrew (HE): all app text is in Hebrew | [ ] |
| In Hebrew mode: the app layout is right-to-left (text starts on right side) | [ ] |
| Hebrew mode: no elements overlap or go off-screen | [ ] |
| Tooltips (hover text on buttons) also appear in the correct language | [ ] |

**If broken:** Screenshot + note which language had untranslated text and where exactly.

---

## Area 4 — App: Dark Mode

> Find the dark/light toggle in the app and test it.

| Check | Mac Chrome | Mac Safari | Win Chrome | Win Firefox | Win Edge | iPhone Safari |
|-------|:----------:|:----------:|:----------:|:-----------:|:--------:|:-------------:|
| Dark mode toggle switches the app to a dark background | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| All text is readable (no invisible or very hard to read text) | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| Botanical decorations / plant illustrations are visible in dark mode | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| Logo is visible in dark mode | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| Client list cards are readable in dark mode | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| Session history page is readable in dark mode | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |

**If broken:** Screenshot of the element that's unreadable or invisible.

---

## Area 5 — App: Mobile (iPhone)

> Use iPhone Safari for this section.

| Check | Done? |
|-------|:-----:|
| App loads on iPhone without error | [ ] |
| Navigation works (you can move between pages) | [ ] |
| Add client form is usable — fields are not too small, keyboard doesn't cover important elements | [ ] |
| Add session form is usable on small screen | [ ] |
| Photo crop works with touch (you can drag with your finger) | [ ] |
| Client list scrolls smoothly | [ ] |
| Session history table scrolls horizontally if it's wide (not cut off at the edge) | [ ] |

**If broken:** Screenshot from iPhone + describe the issue.

---

## Area 6 — PWA (Add to Home Screen)

> This tests whether the app behaves like a proper app when installed on a phone.

### 6.1 Install the app on iPhone

1. Open the app in Safari on iPhone
2. Tap the Share button (box with arrow pointing up)
3. Tap "Add to Home Screen"
4. Confirm the name and tap "Add"

| Check | Done? |
|-------|:-----:|
| The option "Add to Home Screen" appears in the share menu | [ ] |
| The app icon on the home screen shows the Sessions Garden logo (not a generic browser icon) | [ ] |
| Tapping the home screen icon opens the app without browser chrome (no address bar, full-screen) | [ ] |

**If broken:** Screenshot of the home screen icon or describe what you see when opening it.

---

### 6.2 Offline functionality

> After installing to home screen, turn off Wi-Fi and mobile data, then open the app.

| Check | Done? |
|-------|:-----:|
| App opens without internet connection (no "could not connect" screen) | [ ] |
| You can see the client list | [ ] |
| You can open an existing client | [ ] |
| You can add a new session (basic functionality works offline) | [ ] |

**If broken:** Note what error or screen appears when offline.

---

## Summary: All Done

Once you have gone through all areas:

1. Copy any broken items (with screenshots) and send to Claude.
2. For anything marked as "blocked by placeholder" (like Impressum or checkout URL), note it separately — those are known and being handled.
3. If everything is green: confirm and Claude will create the final summary and prepare for launch.

---

*Checklist created by Claude for Sapir — Phase 12, Plan 04*
*Devices: MacBook (Chrome, Safari), Windows PC (Chrome, Firefox, Edge), iPhone (Safari)*
