// help-content-en.js — the EN help corpus for help.html (Phase 39, D-18).
//
// Registers TWO globals:
//   window.HELP_CONTENT_EN — ordered array of section objects (the full help
//     corpus, organized on the 7-step workflow spine: a featured
//     personalization section first, then the session-loop, then a clearly
//     separated technical track).
//   window.HELP_DEEPLINKS  — { addClient, startSession, readDashboard } → section
//     id map; the empty-state coaching trio anchor contract (Plan 05).
//
// Loaded ONLY by help.html. Global i18n files keep UI-chrome strings; the help
// BODY lives here (EN-only for now; future translation adds help-content-de.js).
//
// ── Schema (enforced by tests/help-integrity.test.js) ──────────────────
//   section: {
//     id       — kebab anchor, unique (this IS the deep-link target)
//     title    — noun / gerund headline
//     group    — 'session-loop' | 'technical'
//     featured — boolean; exactly ONE section (make-it-yours) is true
//     topics   — array of topic objects
//   }
//   topic: {
//     id       — unique 'topic-*' anchor
//     title    — noun-form heading
//     priority — 1 | 2 | 3  (P1 = detailed, stupid-proof numbered steps, D-13)
//     covers   — non-empty array of repo file/page paths (D-24; seeds the
//                Phase 43 docs-rot gate)
//     body     — array of block nodes
//   }
//   body block nodes:
//     { type:'p',     text }          — prose
//     { type:'note',  text }          — muted aside
//     { type:'steps', items:[...] }   — numbered steps (strings)
//     { type:'list',  items:[...] }   — bulleted one-liners (strings)
//     { type:'glyph', name }          — install SVG reference (install section only)
//
// ── Live-label interpolation (D-23) ───────────────────────────────────────
//   Every quoted on-screen label is a {ui:key} token keyed to an EXISTING key
//   in window.I18N.en (assets/i18n-en.js). help.js (Plan 04) resolves it to the
//   label's CURRENT live value, so quoted labels can never drift — and a
//   Hebrew-UI reader sees the actual Hebrew button names. The integrity test
//   fails on any unresolved token.
//
// Terminology: client / session, Session Format, Heart-Wall — never
// patient/treatment. No emojis in any text. Content grounded ONLY in the live
// app pages + assets/i18n-en.js + the Phase 32 inventory (never demo.*).

(function () {
  "use strict";

  var SECTIONS = [

    // ═══ FEATURED: personalization (led early, D-04) ═══════════════════════
    {
      id: "make-it-yours",
      title: "Making Sessions Garden yours",
      group: "session-loop",
      featured: true,
      topics: [
        {
          id: "topic-sections-on-off",
          title: "Sections on and off",
          priority: 1,
          covers: ["settings.html", "assets/settings.js"],
          body: [
            { type: "p", text: "Every practitioner works a little differently. Sessions Garden is built to match your way — not the other way around. Start by shaping the session form so it shows only what you use." },
            { type: "steps", items: [
              "Open Settings and go to {ui:settings.tab.fields}.",
              "Turn any session section on or off, so the session form shows only the parts you actually work with.",
              "Press {ui:settings.action.save} to keep your changes."
            ] },
            { type: "note", text: "This changes what you see everywhere you record a session — nothing is ever deleted. Turning a section off keeps its place in the list, so it comes back exactly where it was when you turn it on again." }
          ]
        },
        {
          id: "topic-reordering",
          title: "Reordering sections",
          priority: 1,
          covers: ["settings.html", "assets/settings.js", "assets/add-session.js"],
          body: [
            { type: "p", text: "Put the session sections in the order you actually work in. The same order flows into the session form and into your exports." },
            { type: "steps", items: [
              "Open Settings and go to {ui:settings.tab.fields}.",
              "Drag a section by its handle, or use its up and down arrows, to move it.",
              "Related sections sit in a group you can rename — drag the group to move it as one block.",
              "Press {ui:settings.action.save} to keep the new order."
            ] },
            { type: "note", text: "{ui:settings.reset.order.label} restores the default order and {ui:settings.reset.names.label} restores the default names — your sessions are never touched." }
          ]
        },
        {
          id: "topic-renaming",
          title: "Renaming sections",
          priority: 2,
          covers: ["settings.html", "assets/settings.js"],
          body: [
            { type: "p", text: "In {ui:settings.tab.fields} you can rename most session sections to the exact words you use with your clients, so the form speaks your language. The groups that hold related sections can be renamed too. A few fixed sections keep their names, but you can still switch them off." },
            { type: "note", text: "Changed your mind? {ui:settings.reset.names.label} puts every section and group title back to the defaults." }
          ]
        },
        {
          id: "topic-snippet-library",
          title: "Your snippet library",
          priority: 2,
          covers: ["settings.html", "assets/settings-snippets.js", "assets/snippets-seed.js"],
          body: [
            { type: "p", text: "Snippets turn the text you write again and again — emotion meanings, technique explanations, your usual closing note — into short trigger words that expand as you type. Sessions Garden arrives with a built-in library of emotion snippets, and you can reshape it into your own under {ui:settings.tab.snippets} in Settings." },
            { type: "note", text: "The full guide — creating snippets and expanding them mid-session — is under Writing session notes." }
          ]
        },
        {
          id: "topic-date-format",
          title: "Your date format",
          priority: 2,
          covers: ["settings.html", "assets/settings.js", "assets/date-format.js"],
          body: [
            { type: "p", text: "Set your {ui:settings.dateFormat.label} once, in Settings under {ui:settings.tab.personalize}, and Sessions Garden uses it everywhere — including your exports." },
            { type: "note", text: "Leave it on {ui:settings.dateFormat.auto} to follow your app language, or pick the exact style you are used to reading." }
          ]
        },
        {
          id: "topic-session-formats",
          title: "Custom session formats",
          priority: 2,
          covers: ["settings.html", "assets/settings.js", "assets/settings-session-types.js"],
          body: [
            { type: "p", text: "Beyond the built-in {ui:session.type.clinic}, {ui:session.type.online}, {ui:session.type.remote}, {ui:session.type.proxy}, and {ui:session.type.other} formats, you can add your own under {ui:settings.sessionTypes.heading} in {ui:settings.tab.personalize} — so a session is always labeled the way you think about it." }
          ]
        }
      ]
    },

    // ═══ THE SESSION LOOP ══════════════════════════════════════════════════
    {
      id: "adding-a-client",
      title: "Adding a client",
      group: "session-loop",
      featured: false,
      topics: [
        {
          id: "topic-first-client",
          title: "Your first client",
          priority: 1,
          covers: ["add-client.html", "index.html", "assets/add-client.js"],
          body: [
            { type: "p", text: "A client is the person, child, or animal you work with. Adding one takes a moment." },
            { type: "steps", items: [
              "Choose {ui:nav.addClient} from the main menu.",
              "Enter the {ui:client.form.firstName} — this is the only detail you truly need to start.",
              "Choose a {ui:client.form.type}, then add anything else that helps, like a birth date or notes.",
              "Press {ui:client.form.save}, or {ui:client.form.saveAndSession} to jump straight into your first session."
            ] },
            { type: "note", text: "In a hurry? While starting a session you can choose {ui:session.form.client.new} to create the client without leaving the page." }
          ]
        },
        {
          id: "topic-client-types",
          title: "Client types",
          priority: 2,
          covers: ["add-client.html"],
          body: [
            { type: "p", text: "Pick a {ui:client.form.type} when you add someone — {ui:client.form.type.adult}, {ui:client.form.type.child}, {ui:client.form.type.animal}, or {ui:client.form.type.other}." }
          ]
        },
        {
          id: "topic-client-photo",
          title: "Client photos",
          priority: 3,
          covers: ["add-client.html", "assets/crop.js", "assets/settings-photos.js"],
          body: [
            { type: "p", text: "Add a {ui:client.form.photo} to help hold the energetic connection in remote work. After uploading, you can crop and reposition it so it sits just right." }
          ]
        }
      ]
    },
    {
      id: "starting-a-session",
      title: "Starting a session",
      group: "session-loop",
      featured: false,
      topics: [
        {
          id: "topic-new-session",
          title: "Two ways to begin",
          priority: 1,
          covers: ["sessions.html", "add-session.html", "assets/add-session.js"],
          body: [
            { type: "p", text: "There are two calm ways to open a new session — use whichever fits the moment." },
            { type: "steps", items: [
              "From your overview, press + ({ui:overview.table.newSession}) on the client's row.",
              "Or choose {ui:nav.addSession} and pick the client there.",
              "Set the {ui:session.form.date}, and you are ready to begin recording."
            ] }
          ]
        },
        {
          id: "topic-past-sessions",
          title: "A client's past sessions",
          priority: 2,
          covers: ["sessions.html", "assets/sessions.js"],
          body: [
            { type: "p", text: "Open {ui:nav.sessions} to see everything you have recorded, or choose {ui:overview.table.viewSessions} on a client to see what happened last time." },
            { type: "p", text: "When you open a saved session, your notes appear as styled text — bold, italics, bullet and numbered lists, and headings show the way you typed them, so a session is easy to read back at a glance." }
          ]
        }
      ]
    },
    {
      id: "capturing-emotions",
      title: "Writing session notes",
      group: "session-loop",
      featured: false,
      topics: [
        {
          id: "topic-quick-paste",
          title: "Getting your notes down fast",
          priority: 1,
          covers: ["add-session.html"],
          body: [
            { type: "p", text: "During a session you want to get things down without breaking your flow." },
            { type: "p", text: "Open the session, expand the section you want to write in — {ui:session.accordion.emotions}, session notes, or any other — and type or paste what comes up, in whatever words you use. Tidying and styling can wait until you are done." }
          ]
        },
        {
          id: "topic-formatting",
          title: "Formatting session notes",
          priority: 1,
          covers: ["add-session.html", "assets/rich-toolbar.js", "assets/text-edit.js"],
          body: [
            { type: "p", text: "A formatting toolbar sits above whichever note field you are writing in — the same tools in every note area of the session form and in the export editor." },
            { type: "steps", items: [
              "Select a few words and press the bold button.",
              "Press a list button to start a list — it continues on its own as you type.",
              "Switch the toolbar to Preview to see the styled result; press Edit to keep writing."
            ] },
            { type: "p", text: "The bar, control by control — what each does, with its keyboard shortcut where one exists:" },
            { type: "list", items: [
              "Bold and italic — emphasize the selected words; Ctrl/Cmd+B, Ctrl/Cmd+I.",
              "Bullet and numbered list — turn the current line into a list item.",
              "Text style — three heading sizes or regular text; a checkmark marks the current style.",
              "Indent and outdent — nest list items or step lines in and out; Tab and Shift+Tab inside a list. Headings stay flush with the edge, so both rest on heading lines.",
              "Undo and redo — one change at a time; Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z. Each dims when there is nothing left to step to.",
              "Edit / Preview — the switch at the end of the bar; Ctrl/Cmd+E flips between the two."
            ] },
            { type: "p", text: "Lists also grow as you type: a dash or a number starts one, Enter continues it, and Enter on an empty item ends it." },
            { type: "note", text: "Preview swaps the field for a framed view marked PREVIEW — exactly what saving, exporting, and copying will produce, indentation included. The formatting buttons rest while previewing; Edit or Ctrl/Cmd+E returns you to writing. Everything you format is saved with the session and reads back as styled text." }
          ]
        },
        {
          id: "topic-snippets",
          title: "Snippets — type less",
          priority: 1,
          covers: ["add-session.html", "settings.html", "assets/snippets.js", "assets/settings-snippets.js", "assets/snippets-seed.js"],
          body: [
            { type: "p", text: "Snippets are short trigger words that expand into text you write often — the meaning of an emotion, a technique explanation, the closing note you add to most sessions. You save the text once; after that, a single word brings it back, so you type less mid-session and stay present with your client." },
            { type: "p", text: "Sessions Garden arrives with a built-in library of emotion snippets, ready to use. Adding your own takes a minute:" },
            { type: "steps", items: [
              "Open Settings and go to {ui:settings.tab.snippets}.",
              "Choose {ui:snippets.action.add} — or select any snippet in the library to edit it, including the built-in ones.",
              "Give it a {ui:snippets.editor.trigger.label} — one short word you will remember, like closing. A trigger cannot contain spaces, so join two words with a hyphen, like physical-trauma.",
              "Write the full text the trigger should expand into, then press {ui:common.save}."
            ] },
            { type: "p", text: "Using a snippet is just as simple. While writing in a session, type your trigger prefix (a semicolon, unless you changed it), then the trigger word, then a space. Type ;betrayal and a space, and it expands into the full meaning of betrayal — right where your cursor is." },
            { type: "p", text: "Cannot remember the exact word? Type the prefix and the first letter or two, and a small list of matching snippets appears at your cursor — move through it with the arrow keys and press Enter to insert, or Escape to dismiss. Typing a tag name after the prefix works too, listing the snippets you have grouped under that tag. Picking a suggestion this way inside a bullet or numbered list keeps you on the same line, so accepting it never starts a stray new item." },
            { type: "p", text: "Where it shines: if you close most sessions with a similar note — what was released, what to notice in the days ahead — save it once under a trigger like closing, and every session can end with one short word instead of a paragraph retyped from memory." },
            { type: "note", text: "Snippets expand in every note area of the session form — emotions, insights, comments, and the rest — and in the export editor too, so your client summaries can use them as well." },
            { type: "note", text: "Make them fully yours in {ui:settings.tab.snippets}: change the {ui:snippets.prefix.label} there, and give any snippet its text in more than one app language with {ui:snippets.editor.translations.toggle}." }
          ]
        }
      ]
    },
    {
      id: "heart-wall",
      title: "The Heart-Wall",
      group: "session-loop",
      featured: false,
      topics: [
        {
          id: "topic-heartwall-workflow",
          title: "The Heart-Wall workflow",
          priority: 1,
          covers: ["add-session.html"],
          body: [
            { type: "p", text: "When a session is Heart-Wall work, Sessions Garden helps you mark it and track it across visits." },
            { type: "steps", items: [
              "In the session, turn on {ui:session.form.heartShield}.",
              "Record what you find in {ui:session.form.heartShieldEmotions}.",
              "Save the session as usual — it is now part of the client's Heart-Wall story."
            ] }
          ]
        },
        {
          id: "topic-heartwall-removal",
          title: "Tracking removal",
          priority: 2,
          covers: ["add-session.html", "assets/overview.js"],
          body: [
            { type: "p", text: "When a Heart-Wall comes down, set {ui:session.form.shieldRemoved} to {ui:session.form.shieldRemoved.yes}." },
            { type: "note", text: "Each client's status — {ui:overview.heartShield.active} or {ui:overview.heartShield.removed} — is worked out from their sessions and shown in your overview, so you never have to track it by hand." }
          ]
        }
      ]
    },
    {
      id: "severity",
      title: "Severity tracking",
      group: "session-loop",
      featured: false,
      topics: [
        {
          id: "topic-before-after",
          title: "Before and after ratings",
          priority: 1,
          covers: ["add-session.html"],
          body: [
            { type: "p", text: "Rating each issue before and after the work shows change over time, in the client's own numbers. Ratings are optional — a topic stays unrated until you set a number." },
            { type: "steps", items: [
              "Give the issue a name in {ui:session.form.issueName}.",
              "Set {ui:session.form.severityAtStart} on a 0 to 10 scale at the start.",
              "At the end of the session, set {ui:session.form.afterSeverity} for the same issue."
            ] },
            { type: "note", text: "Tap a rating again to clear it back to unrated — clearing the start rating clears that topic's end rating with it. An unrated topic is left out of your exports and shows its name only in your session history." }
          ]
        },
        {
          id: "topic-turn-off",
          title: "Turning severity ratings off",
          priority: 1,
          covers: ["add-session.html", "assets/settings.js"],
          body: [
            { type: "p", text: "Not rating severity? One switch hides it everywhere. In Settings, under {ui:settings.tab.fields}, the {ui:settings.row.afterSeverity.label} row is a single switch for all severity ratings." },
            { type: "list", items: [
              "On — each topic gets a rating at the start, and the end-of-session ratings section appears.",
              "Off — both disappear; the topics themselves stay, you simply record no numbers."
            ] },
            { type: "note", text: "Drag that row to choose where the end-of-session ratings sit in the form — the same position sets where they appear in your exports." }
          ]
        },
        {
          id: "topic-multiple-issues",
          title: "Multiple issues",
          priority: 2,
          covers: ["add-session.html"],
          body: [
            { type: "p", text: "Working on more than one thing in a session? Choose {ui:session.form.addIssue} to track another issue — up to three per session. Each can carry its own before-and-after ratings, and any topic you leave unrated simply shows its name in your session history and client overview." }
          ]
        },
        {
          id: "topic-reversal",
          title: "Understanding reversal",
          priority: 2,
          covers: ["add-session.html"],
          body: [
            { type: "p", text: "Sometimes an after-rating comes out higher than the before-rating. That is reversal — not a failure, but information. It often means something deeper surfaced, and it is worth noting for next time." }
          ]
        }
      ]
    },
    {
      id: "review-export",
      title: "Review and export",
      group: "session-loop",
      featured: false,
      topics: [
        {
          id: "topic-single-export",
          title: "Exporting one session",
          priority: 1,
          covers: ["assets/export-modal.js", "assets/pdf-export.js", "assets/jspdf.min.js", "assets/bidi.min.js", "assets/fonts/rubik-italic-base64.js"],
          body: [
            { type: "p", text: "When a session is finished, you can send a beautifully formatted copy to your client or file it in your own records." },
            { type: "steps", items: [
              "Open the saved session and choose {ui:session.export}.",
              "Choose which parts of the session to include — under {ui:export.section.topics} you can also choose whether the severity ratings come along.",
              "Review — and lightly edit — what will be shared.",
              "Pick {ui:export.download.pdf} for a polished document, or {ui:export.download.text} to save the notes as a plain text file."
            ] },
            { type: "list", items: [
              "Your sections appear in the order you set in Settings.",
              "The formatting toolbar stays pinned above the editor — it never scrolls away.",
              "Maximize gives the editor the whole window; press again to restore. On a phone it fills the screen.",
              "Edits here shape this export only — nothing is saved back to the session.",
              "Preview shows the finished document in place of the editor — check it before choosing a format.",
              "Back and Continue keep your edits. The document rebuilds only when you change the section selection — and the app asks first.",
              "Bold, italics, lists, headings, and indentation carry into the PDF; Hebrew stays correctly right-to-left."
            ] },
            { type: "note", text: "For Heart-Wall sessions the export states the result in words — Heart-Wall removed, or Heart-Wall present, not removed this session — never a bare yes or no." }
          ]
        },
        {
          id: "topic-export-formats",
          title: "Choosing a format",
          priority: 2,
          covers: ["assets/export-modal.js"],
          body: [
            { type: "p", text: "PDF is best for sending a finished, good-looking document to your client. Plain text is best when you want to keep the notes in your own records or bring them into another app." },
            { type: "p", text: "The PDF keeps your note formatting — bold, lists, headings, and indentation — as styled text, while the plain-text file keeps your notes exactly as you typed them." },
            { type: "p", text: "Either way, sections come out in the order you set in Settings, and the severity ratings sit where that section falls in your order. If you delete a section heading while editing, the severity block moves up accordingly." },
            { type: "p", text: "Not sure which suits the moment? On the editing step, switch the editor to Preview — the framed view shows the finished document exactly as it will read — and decide before you export." }
          ]
        }
      ]
    },
    {
      id: "overview",
      title: "Your overview",
      group: "session-loop",
      featured: false,
      topics: [
        {
          id: "topic-dashboard",
          title: "Reading your overview",
          priority: 2,
          covers: ["index.html", "assets/overview.js"],
          body: [
            { type: "p", text: "Your overview gathers your whole practice in one calm place: {ui:overview.stats.clients}, {ui:overview.stats.sessions}, and {ui:overview.stats.month} sit at the top, with every client listed below." }
          ]
        },
        {
          id: "topic-filters",
          title: "Searching and filtering",
          priority: 2,
          covers: ["index.html"],
          body: [
            { type: "p", text: "Find anyone fast. Search by name at the top of the list, then narrow it down with {ui:overview.filter.type}, {ui:filter.sessionFormat}, or {ui:overview.filter.heartShield}." },
            { type: "note", text: "Reorder the list with {ui:overview.filter.sort}, and choose {ui:overview.filter.clear} to start fresh." }
          ]
        },
        {
          id: "topic-next-session",
          title: "The next-session date",
          priority: 2,
          covers: ["index.html", "add-session.html"],
          body: [
            { type: "p", text: "Set {ui:session.form.nextSessionDate} on a session and it appears in your overview under {ui:overview.table.nextSession} — marked {ui:overview.table.nextSession.overdue} once the date has passed, so no one slips through the cracks." }
          ]
        }
      ]
    },

    // ═══ THE TECHNICAL BITS ════════════════════════════════════════════════
    {
      id: "backups",
      title: "Backups and your data",
      group: "technical",
      featured: false,
      topics: [
        {
          id: "topic-data-local",
          title: "Data never leaves your browser",
          priority: 1,
          covers: ["assets/db.js"],
          body: [
            { type: "p", text: "Everything you record in Sessions Garden lives on this device only, inside this browser. Nothing is ever sent to a server — that privacy is the whole point of the app." },
            { type: "p", text: "It also means you are the only backup. If this browser's data is ever cleared, the sessions go with it, so keeping your own backup matters." }
          ]
        },
        {
          id: "topic-backup-restore",
          title: "Backing up and restoring",
          priority: 1,
          covers: ["settings.html", "assets/backup.js", "assets/backup-modal.js", "assets/jszip.min.js"],
          body: [
            { type: "p", text: "A backup is a single file that holds all your clients and sessions. Making one takes under a minute." },
            { type: "steps", items: [
              "Open {ui:overview.backupRestore}.",
              "In the {ui:backup.export.heading} section, choose {ui:backup.action.export} to save a backup file — you can protect it with a passphrase.",
              "Keep that file somewhere safe, like an external drive or your own cloud storage.",
              "To bring your data back, open the same panel, press {ui:backup.action.import}, and pick your backup file."
            ] },
            { type: "note", text: "A restore brings back your section order and group names along with your clients and sessions." },
            { type: "note", text: "The cloud icon in the header shows how recently you last backed up — a gentle nudge when it is time again." }
          ]
        },
        {
          id: "topic-working-offline",
          title: "Working offline",
          priority: 2,
          covers: ["sw.js"],
          body: [
            { type: "p", text: "Once Sessions Garden is open in your browser, it keeps working with no internet at all — recording sessions, exporting, everything except license activation (and deactivation, when you move computers)." }
          ]
        },
        {
          id: "topic-updates",
          title: "Getting updates",
          priority: 3,
          covers: ["sw.js"],
          body: [
            { type: "note", text: "When a new version is ready, Sessions Garden updates itself quietly the next time you open it online. There is nothing to install by hand." }
          ]
        }
      ]
    },
    {
      id: "installing",
      title: "Installing the app",
      group: "technical",
      featured: false,
      topics: [
        {
          id: "topic-install-chrome",
          title: "Chrome and Edge",
          priority: 1,
          covers: ["sw.js", "manifest.json"],
          body: [
            { type: "glyph", name: "install-chrome" },
            { type: "p", text: "On a computer, Chrome and Edge let you install Sessions Garden as its own app in a few clicks." },
            { type: "steps", items: [
              "Open Sessions Garden in Chrome or Edge on your computer.",
              "Look at the end of the address bar for the small install icon — a monitor with a downward arrow.",
              "Click it, then choose Install.",
              "The app opens in its own window and gets a desktop shortcut — open it like any other program from now on."
            ] }
          ]
        },
        {
          id: "topic-install-safari",
          title: "Safari on a Mac",
          priority: 1,
          covers: ["sw.js", "manifest.json"],
          body: [
            { type: "glyph", name: "install-safari" },
            { type: "p", text: "On a Mac, Safari can add Sessions Garden straight to your Dock." },
            { type: "steps", items: [
              "Open Sessions Garden in Safari on your Mac.",
              "In the menu bar, open the File menu (or the Share menu) and choose Add to Dock.",
              "Confirm the name and click Add.",
              "Sessions Garden now lives in your Dock — click it to open the app in its own window."
            ] }
          ]
        },
        {
          id: "topic-install-mobile-note",
          title: "A note about phones",
          priority: 2,
          covers: ["manifest.json"],
          body: [
            { type: "p", text: "Sessions Garden is built for your computer, where you do your session work." },
            { type: "note", text: "You can open it in a phone browser, but your clients and sessions live on each device separately — there is no sync between your computer and your phone. Keep your real work on the computer where you installed the app." }
          ]
        }
      ]
    },
    {
      id: "license",
      title: "License and devices",
      group: "technical",
      featured: false,
      topics: [
        {
          id: "topic-activation",
          title: "Activating your license",
          priority: 1,
          covers: ["license.html", "assets/license.js"],
          body: [
            { type: "p", text: "A license key unlocks the full app. You enter it once." },
            { type: "steps", items: [
              "Open {ui:nav.license}.",
              "Paste the license key from your purchase email.",
              "Activate — this is the one moment Sessions Garden needs the internet.",
              "Once activated, the whole app works offline from then on."
            ] }
          ]
        },
        {
          id: "topic-trial",
          title: "Trying it out first",
          priority: 1,
          covers: ["license.html", "landing.html"],
          body: [
            { type: "p", text: "Want to explore first? The live demo on the welcome page lets you try Sessions Garden with sample data — it resets each time, and nothing you enter there is saved. The full app opens once you activate a license key; from that moment everything you record is kept safely on your computer." }
          ]
        },
        {
          id: "topic-two-devices",
          title: "Moving to a new computer",
          priority: 2,
          covers: ["license.html", "assets/license.js"],
          body: [
            { type: "p", text: "Your license covers two activations — two browsers or computers." },
            { type: "note", text: "Moving to a new computer? Deactivate on the old one first, then activate on the new one, so you stay within the two-activation limit. Remember to carry your data across with a backup file." }
          ]
        }
      ]
    },
    {
      id: "troubleshooting",
      title: "Troubleshooting",
      group: "technical",
      featured: false,
      topics: [
        {
          id: "topic-missing-clients",
          title: "\"I don't see my clients\"",
          priority: 1,
          covers: ["index.html", "assets/db.js"],
          body: [
            { type: "p", text: "Your clients and sessions are stored inside this browser on this computer. If they seem to have vanished, they are almost always hidden, not lost." },
            { type: "steps", items: [
              "Check you are in the same browser and profile you normally use — data does not move between browsers.",
              "Make sure you have not cleared site data or history for this site.",
              "If you switched computers, restore your latest backup from {ui:overview.backupRestore}."
            ] }
          ]
        },
        {
          id: "topic-report-problem",
          title: "Reporting a problem",
          priority: 2,
          covers: ["settings.html", "report.html", "assets/report.js", "assets/crashlog.js"],
          body: [
            { type: "p", text: "If something is not working right, you can send us a diagnostic report — but nothing is ever sent automatically." },
            { type: "steps", items: [
              "Open Settings and find {ui:settings.report.label}.",
              "Choose {ui:report.action.copy} to copy a diagnostic report.",
              "Paste it into an email to contact@sessionsgarden.app and tell us what happened."
            ] },
            { type: "note", text: "Still stuck? Write to us at contact@sessionsgarden.app — a real person reads every message." }
          ]
        }
      ]
    }
  ];

  window.HELP_CONTENT_EN = SECTIONS;

  // Empty-state coaching trio anchor contract (Plan 05) — each maps to a real
  // section id above. The integrity test verifies every value resolves.
  window.HELP_DEEPLINKS = {
    addClient: "adding-a-client",
    startSession: "starting-a-session",
    readDashboard: "overview"
  };
})();
