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
// ── Schema (enforced by tests/39-help-integrity.test.js) ──────────────────
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
            { type: "note", text: "This changes what you see everywhere you record a session — nothing is ever deleted, so you can turn a section back on any time." }
          ]
        },
        {
          id: "topic-renaming",
          title: "Renaming sections",
          priority: 2,
          covers: ["settings.html", "assets/settings.js"],
          body: [
            { type: "p", text: "In {ui:settings.tab.fields} you can rename any session section to the exact words you use with your clients, so the form speaks your language." }
          ]
        },
        {
          id: "topic-date-format",
          title: "Your date format",
          priority: 2,
          covers: ["settings.html", "assets/settings.js"],
          body: [
            { type: "p", text: "Set your {ui:settings.dateFormat.label} once, in Settings under {ui:settings.tab.personalize}, and Sessions Garden uses it everywhere — including your exports." },
            { type: "note", text: "Leave it on {ui:settings.dateFormat.auto} to follow your app language, or pick the exact style you are used to reading." }
          ]
        },
        {
          id: "topic-session-formats",
          title: "Custom session formats",
          priority: 2,
          covers: ["settings.html", "assets/settings.js"],
          body: [
            { type: "p", text: "Beyond the built-in {ui:session.type.clinic}, {ui:session.type.online}, and {ui:session.type.other} formats, you can add your own under {ui:settings.sessionTypes.heading} in {ui:settings.tab.personalize} — so a session is always labelled the way you think about it." }
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
          covers: ["add-client.html", "index.html"],
          body: [
            { type: "p", text: "A client is the person, child, or animal you work with. Adding one takes a moment." },
            { type: "steps", items: [
              "Open {ui:nav.addClient} from the main menu.",
              "Enter the {ui:client.form.name} — this is the only detail you truly need to start.",
              "Choose a {ui:client.form.type}, then add anything else that helps, like a birth date or notes.",
              "Press {ui:client.form.save}, or {ui:client.form.saveAndSession} to jump straight into your first session."
            ] },
            { type: "note", text: "In a hurry? While starting a session you can choose {ui:session.form.addClientInline} to create the client without leaving the page." }
          ]
        },
        {
          id: "topic-client-types",
          title: "Client types",
          priority: 2,
          covers: ["add-client.html"],
          body: [
            { type: "p", text: "Pick a {ui:client.form.type} when you add someone — {ui:client.form.type.adult}, {ui:client.form.type.child}, {ui:client.form.type.animal}, or {ui:client.form.type.other}. The form gently adapts to each." }
          ]
        },
        {
          id: "topic-client-photo",
          title: "Client photos",
          priority: 3,
          covers: ["add-client.html", "assets/crop.js"],
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
          covers: ["sessions.html", "add-session.html"],
          body: [
            { type: "p", text: "There are two calm ways to open a new session — use whichever fits the moment." },
            { type: "steps", items: [
              "From your overview, open a client and choose {ui:overview.table.newSession}.",
              "Or open {ui:nav.addSession} and pick the client there.",
              "Set the {ui:session.form.date}, and you are ready to begin recording."
            ] }
          ]
        },
        {
          id: "topic-past-sessions",
          title: "A client's past sessions",
          priority: 2,
          covers: ["sessions.html"],
          body: [
            { type: "p", text: "Open {ui:nav.sessions} to see everything you have recorded, or use {ui:overview.table.viewSessions} on a client to scan their history before you begin." }
          ]
        }
      ]
    },
    {
      id: "capturing-emotions",
      title: "Capturing emotions",
      group: "session-loop",
      featured: false,
      topics: [
        {
          id: "topic-quick-paste",
          title: "Capturing emotions fast",
          priority: 1,
          covers: ["add-session.html"],
          body: [
            { type: "p", text: "During a session you want to record emotions without breaking your flow." },
            { type: "steps", items: [
              "Open the session and expand {ui:session.accordion.emotions}.",
              "Type or paste the emotions as they come up — in whatever words you use, one thought at a time.",
              "Keep going; there is no need to stop and tidy the wording until you are done."
            ] }
          ]
        },
        {
          id: "topic-snippets",
          title: "Snippets — type less",
          priority: 2,
          covers: ["add-session.html", "assets/snippets.js"],
          body: [
            { type: "p", text: "Snippets are short triggers that expand into text you write often, so you type less mid-session and stay present with your client." },
            { type: "note", text: "Create and edit them in Settings under {ui:settings.tab.snippets}." }
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
            { type: "p", text: "Rating each issue before and after the work shows change over time, in the client's own numbers." },
            { type: "steps", items: [
              "Give the issue a name in {ui:session.form.issueName}.",
              "Set {ui:session.form.beforeSeverity} on a 0 to 10 scale at the start.",
              "At the end of the session, set {ui:session.form.afterSeverity} for the same issue."
            ] }
          ]
        },
        {
          id: "topic-multiple-issues",
          title: "Multiple issues",
          priority: 2,
          covers: ["add-session.html"],
          body: [
            { type: "p", text: "Working on more than one thing in a session? Choose {ui:session.form.addIssue} to track another issue, each with its own before-and-after ratings." }
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
          covers: ["assets/export-modal.js", "assets/pdf-export.js"],
          body: [
            { type: "p", text: "When a session is finished, you can send a beautifully formatted copy to your client or file it in your own records." },
            { type: "steps", items: [
              "Open the saved session and choose {ui:session.export}.",
              "Review — and lightly edit — what will be shared.",
              "Pick {ui:export.download.pdf} for a polished document, or {ui:export.download.text} to copy plain text."
            ] }
          ]
        },
        {
          id: "topic-export-formats",
          title: "Choosing a format",
          priority: 2,
          covers: ["assets/export-modal.js"],
          body: [
            { type: "p", text: "PDF is best for sending a finished, good-looking document to your client. Plain text is best when you want to paste the notes into your own records or another app." }
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
          title: "Reading your dashboard",
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
            { type: "p", text: "Set {ui:session.form.nextSessionDate} on a session and it appears in your overview under {ui:overview.table.nextSession} — turning to {ui:overview.table.nextSession.overdue} once the date has passed, so no one slips through the cracks." }
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
          covers: ["settings.html", "assets/backup.js", "assets/backup-modal.js"],
          body: [
            { type: "p", text: "A backup is a single file that holds all your clients and sessions. Making one takes under a minute." },
            { type: "steps", items: [
              "Open {ui:overview.backupRestore}.",
              "Under {ui:backup.export.heading}, choose {ui:backup.action.export} to save a backup file — you can protect it with a passphrase.",
              "Keep that file somewhere safe, like an external drive or your own cloud storage.",
              "To bring your data back, open the same panel, choose {ui:backup.action.import}, and pick your backup file."
            ] },
            { type: "note", text: "The cloud icon in the header shows how recently you last backed up — a gentle nudge when it is time again." }
          ]
        },
        {
          id: "topic-working-offline",
          title: "Working offline",
          priority: 2,
          covers: ["sw.js"],
          body: [
            { type: "p", text: "Once Sessions Garden is open in your browser, it keeps working with no internet at all — recording sessions, exporting, everything except the one-time license activation." }
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
          title: "What the trial allows",
          priority: 1,
          covers: ["license.html", "landing.html"],
          body: [
            { type: "p", text: "Before you activate, you can explore Sessions Garden and see how it works. When the trial ends, activating your license opens the full app — your data is always kept safe in the meantime." }
          ]
        },
        {
          id: "topic-two-devices",
          title: "Moving to a new computer",
          priority: 2,
          covers: ["license.html", "assets/license.js"],
          body: [
            { type: "p", text: "Your license covers two computers." },
            { type: "note", text: "Moving to a new computer? Deactivate on the old one first, then activate on the new one, so you stay within the two-device limit. Remember to carry your data across with a backup file." }
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
          covers: ["settings.html", "report.html", "assets/crashlog.js"],
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
