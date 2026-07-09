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
// ── Schema (enforced by tests/42-changelog-integrity.test.js) ─────────────────
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
// ── COPY STATUS: DRAFT / PLACEHOLDER ──────────────────────────────────────────
//   The lede / highlights / category BODY strings below are STRUCTURALLY-VALID
//   PLACEHOLDER copy seeded from the PROJECT.md Validated ledger + the v1.2.4
//   users draft. They satisfy the integrity contract but are NOT the final
//   wording. Final approved copy lands in Plan 10 via the D-03 wording pipeline
//   and Ben's explicit D-04 approval. Versions / dates / anchors are NOT
//   placeholder — they are final now.

(function () {
  "use strict";

  window.CHANGELOG_CONTENT_EN = [

    // ═══ v1.3 — In-App Help, Onboarding & Changelog (self-hosting, CHLG-04) ═══
    {
      version: "1.3.0",
      anchor: "v1-3",
      date: "July 2026",
      lede: "This release is all about feeling at home in Sessions Garden, with guidance right where you need it.",
      highlights: [
        "A help button on every page opens a searchable help center.",
        "A guided tour walks you through the app on first launch.",
        "Release notes now live inside the app.",
      ],
      categories: {
        new: [
          "A searchable help center reachable from every page.",
          "A first-run welcome screen that introduces the app.",
          "A guided tour of the main workflow.",
          "This in-app changelog, so you can see what changed.",
        ],
        improved: [
          "A clearer hint for installing the app on your phone.",
        ],
      },
    },

    // ═══ v1.2 — consolidated v1.2.1 to v1.2.4 (one story, D-02) ═══════════════
    {
      version: "1.2.0",
      anchor: "v1-2",
      date: "July 2026",
      lede: "Make the app your own, with your date format, your session formats, and faster ways to find a session.",
      highlights: [
        "A new Personalize tab lets you choose how dates appear everywhere.",
        "Rename the built-in session formats or add your own.",
        "Filter and sort sessions to find what you need faster.",
      ],
      categories: {
        new: [
          "A Personalize tab in Settings to choose your date format.",
          "Custom session formats you can rename or add.",
          "A Session Format filter on the Overview and Sessions pages.",
          "A Heart-Wall toggle to show only sessions where a Heart-Wall was worked on.",
          "Click a column header on the Overview to sort by it.",
        ],
        improved: [
          "Dates now look the same everywhere, including PDF exports.",
          "More reliable install on Safari.",
          "Heart-Wall is named consistently across the whole app.",
        ],
        fixed: [
          "The app now recovers on its own from certain database errors.",
          "Updated the legal pages.",
        ],
      },
    },

    // ═══ v1.1 — first paid release ═══════════════════════════════════════════
    {
      version: "1.1.0",
      anchor: "v1-1",
      date: "June 2026",
      lede: "The first paid release, built to help you export, reuse, and protect your work.",
      highlights: [
        "Export a polished PDF of any client's session history.",
        "Save reusable snippets for faster session notes.",
        "Encrypted backups keep your data safe on your device.",
      ],
      categories: {
        new: [
          "PDF export of a client's full session history.",
          "Reusable snippets for common session notes.",
          "Encrypted, passphrase-protected backups.",
        ],
        improved: [
          "Gentle reminders to back up your data.",
        ],
      },
    },

    // ═══ v1.0 — origin marker only (never public, D-01) ══════════════════════
    {
      version: "1.0.0",
      anchor: "v1-0",
      date: "May 2026",
      lede: "Where it all began, the first seed of Sessions Garden.",
      origin: true,
    },

  ];
})();
