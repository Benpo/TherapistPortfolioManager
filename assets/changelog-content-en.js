// changelog-content-en.js — the ONE structured changelog data source (Phase 42,
// CHLG-03 / CHLG-04; D-01/D-02/D-08/D-10/D-11).
//
// Registers ONE global:
//   window.CHANGELOG_CONTENT_EN — reverse-chronological array of release entries.
//     Both surfaces read THIS one array (never forked, never scraped from git):
//       - the What's-New popup (assets/whats-new.js, Plan 05) reads the LATEST
//         entry's .highlights;
//       - the changelog page (assets/changelog.js, Plan 06) renders the full
//         history from every entry.
//
// Loaded by help.html (popup) and changelog.html (page). Global i18n files carry
// the UI chrome (page title, New/Improved/Fixed labels); the release BODY lives
// here (EN-only for now; future translation adds changelog-content-de.js, etc.).
//
// ── Schema (enforced by tests/changelog-integrity.test.js) ─────────────────
//   entry: {
//     version    — semver string, UNIQUE, e.g. '1.3.0' (matches AppVersion
//                  .APP_VERSION semantics; version.js:27). The array is strictly
//                  REVERSE-CHRONOLOGICAL by version (newest first). NEVER read
//                  the SW/INTEGRITY_TOKEN layer or a second constant (CHLG-03).
//     anchor     — kebab deep-link id, UNIQUE, e.g. 'v1-3' (major-minor). This
//                  IS the changelog.html#v1-3 fragment target.
//     date       — human release date string, e.g. 'July 2026' (git/PROJECT.md
//                  sourced, D-03).
//     lede       — one benefit-led sentence (required for content entries).
//     highlights — array of 2-4 hand-picked strings (D-08; the popup source and
//                  the Phase-43 docs-rot hook). Content entries only.
//     categories — { new?: string[], improved?: string[], fixed?: string[] }
//                  each present category a non-empty string array; EMPTY
//                  categories are OMITTED entirely (D-11). New/Improved/Fixed
//                  headings are rendered by the page from i18n keys — never baked
//                  into the data.
//     origin     — optional boolean; v1.0 uses { version, anchor, date, lede,
//                  origin:true } with NO highlights/categories (one-line origin
//                  marker; v1.0 never reached customers, D-01).
//   }
//
// Terminology: client / session, Session Format, Heart-Wall — never patient /
// treatment. No emojis in any string (D-10). Versions, dates, and anchors are
// FINAL. Register nouns (New/Improved/Fixed) come from i18n, not the data.
//
// ── COPY STATUS: D-04 APPROVED BY BEN — 2026-07-09 ────────────────────────────
//   The lede / highlights / category BODY strings below were DRAFTED through the
//   D-03 wording pipeline (factual gate — grounded in the PROJECT.md Validated
//   ledger, the UNAPPROVED v1.2.4 users draft, and the milestone archives; then
//   the register filter so only user-feelable changes survive; then the
//   native-speaker gate; then the DNA/voice gate — calm, warm, benefit-led,
//   no-emoji garden register), then APPROVED by Ben on 2026-07-09 (Plan 11,
//   Task 2 D-04 gate) as rendered on the real /changelog page + What's-New popup.
//   Approval carried ONE verbatim revision applied in Task 3: the v1.1 lede and
//   section-comment label were reworded to drop an internal business-framing
//   opener that must not ship in user-facing copy — this asset, INCLUDING its
//   comments, is served to clients, so no internal framing may appear anywhere in
//   this file. All other entries (v1.3, v1.2, v1.0, popup highlights) approved
//   exactly as drafted. Versions / dates / anchors are FINAL. GATE-04 (Phase 43)
//   re-checks the v1.3 entry at the ship moment.
//
//   REVISION 2026-07-10 (Ben-directed, Plan 42.1-10 Task 3, supersedes D-04
//   "copy FINAL" for this one line): the v1.3 `improved` entry no longer promises
//   phone / mobile home-screen support — mobile is deliberately NOT published yet
//   (HELP-06: computer-only install guidance). Reworded EN "…adding Sessions
//   Garden to your phone's home screen" → "…installing Sessions Garden on your
//   computer", and mirrored natively in HE/DE/CS. Structure/version/anchor/date
//   unchanged; no-emoji/terminology rules preserved.

(function () {
  "use strict";

  window.CHANGELOG_CONTENT_EN = [

    // ═══ v1.5 — A session form shaped to your way of working ═══════════════════
    {
      version: "1.5.0",
      anchor: "v1-5",
      date: "July 2026",
      lede: "Shape the session form to your own way of working — reorder every section by drag or arrows, group and rename them, and decide when severity ratings apply.",
      highlights: [
        "Reorder the session sections — drag them or use the up and down arrows — into the order you actually work in, and your exports follow the same order.",
        "One switch turns severity ratings on or off for the whole app, and when they are on, every rating is optional.",
        "Skip a rating and it stays out of your exports and reads cleanly in your session history.",
      ],
      categories: {
        new: [
          "Reorder the session form: drag a section by its handle or move it with the up and down arrows. Related sections sit in groups you can rename, and turning a section off keeps its place so it returns exactly where it was.",
          "A single Issue severity switch turns all before-and-after ratings on or off across the whole app.",
        ],
        improved: [
          "Severity ratings are now optional — tap a rating again to clear it back to unrated. An unrated topic keeps its name; it just carries no numbers.",
          "The order you set for your sections is mirrored in every export.",
          "Session topics are now their own choice in an export, with the before-and-after ratings as a linked sub-option beneath them — offered whenever the app's severity ratings are switched on.",
          "An unrated topic is left out of your exports and shows its name only in your session history and client overview.",
        ],
      },
    },

    // ═══ v1.4 — Richer Sessions: formatting your notes, and notes that keep their shape ═══
    {
      version: "1.4.0",
      anchor: "v1-4",
      date: "July 2026",
      lede: "Formatting your session notes is now effortless — a toolbar over every note field and the export editor adds bold, lists, and headings, with a built-in preview that shows exactly how they will read.",
      highlights: [
        "A formatting toolbar above every note field and in the export editor — bold, italics, lists, headings, and keyboard shortcuts.",
        "Preview any note — or the export document — as a framed view of the finished result.",
        "Your formatting keeps its shape — in saved sessions and in PDF exports.",
      ],
      categories: {
        new: [
          "A formatting toolbar above every note field and in the export editor — bold, italics, bullet and numbered lists, a text-style menu for headings, indent and outdent, undo and redo.",
          "A built-in preview: the Edit / Preview switch swaps the writing area for a framed view of the finished result — Ctrl/Cmd+E flips between the two.",
          "Reading a saved session shows your notes as styled text.",
        ],
        improved: [
          "Formatting flows as you type — a dash or a number starts a list that continues on its own, and Tab nests items.",
          "A roomier export editor, with a maximize option.",
          "Choose whether an export includes the before-and-after emotion ratings.",
          "Clearer Heart-Wall wording in exports.",
          "PDF exports keep your formatting.",
        ],
        fixed: [
          "Importing a backup a second time now always asks for confirmation — before, a repeat import could silently do nothing.",
        ],
      },
    },

    // ═══ v1.3 — In-App Help, Onboarding & Changelog (self-hosting, CHLG-04) ═══
    {
      version: "1.3.0",
      anchor: "v1-3",
      date: "July 2026",
      lede: "This release is all about feeling at home in Sessions Garden, with gentle guidance right where you need it.",
      highlights: [
        "A help button on every page opens a searchable help center.",
        "A guided tour walks you through the app the first time you open it.",
        "Release notes now live inside the app, so you can always see what's new.",
      ],
      categories: {
        new: [
          "A searchable help center you can open from any page.",
          "A warm welcome screen the first time you open the app.",
          "A guided tour of the main workflow, whenever you'd like a refresher.",
          "This in-app changelog, so every update is easy to follow.",
        ],
        improved: [
          "A clearer hint for installing Sessions Garden on your computer.",
        ],
      },
    },

    // ═══ v1.2 — consolidated v1.2.1 to v1.2.4 (one story, D-02) ═══════════════
    {
      version: "1.2.0",
      anchor: "v1-2",
      date: "July 2026",
      lede: "Make Sessions Garden your own, with your date format, your session formats, and faster ways to find any session.",
      highlights: [
        "A new Personalize tab lets you choose how dates appear across the app.",
        "Rename the built-in session formats or add your own.",
        "Filter and sort your sessions to find what you need faster.",
      ],
      categories: {
        new: [
          "A Personalize tab in Settings for choosing your date format.",
          "Custom session formats you can rename or add to.",
          "A Session Format filter on the Overview and Sessions pages.",
          "A Heart-Wall filter to show only the sessions where a Heart-Wall was worked on.",
          "Click any column heading on the Overview to sort by it.",
        ],
        improved: [
          "Dates now look the same everywhere, including your PDF exports.",
          "More reliable installation on Safari.",
          "Heart-Wall is named consistently throughout the app.",
        ],
        fixed: [
          "The app now recovers on its own from certain database errors.",
          "Refreshed the legal pages.",
        ],
      },
    },

    // ═══ v1.1 — export, snippets & encrypted backups ═════════════════════════
    {
      version: "1.1.0",
      anchor: "v1-1",
      date: "June 2026",
      lede: "Built to help you export, reuse, and protect your work.",
      highlights: [
        "Export a polished PDF of any client's session history.",
        "Save reusable snippets to write session notes faster.",
        "Encrypted backups keep your data safe on your own device.",
      ],
      categories: {
        new: [
          "A client-facing PDF export of a client's full session history.",
          "Reusable text snippets for the notes you write again and again.",
          "Encrypted, passphrase-protected backups of your data.",
        ],
        improved: [
          "Gentle reminders to back up your work.",
        ],
      },
    },

    // ═══ v1.0 — origin marker only (never public, D-01) ══════════════════════
    {
      version: "1.0.0",
      anchor: "v1-0",
      date: "May 2026",
      lede: "Where it all began — the first seed of Sessions Garden.",
      origin: true,
    },

  ];
})();
