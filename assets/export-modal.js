// assets/export-modal.js — page-private export-modal + markdown builders for the
// add-session page. Extracted out of the single add-session.js DOMContentLoaded
// closure. This is a behavior-preserving closure extraction: the export
// region captured ~10 closure-locals plus getIssuesPayload, so a plain cut-paste
// would throw ReferenceError. Instead add-session.js calls
// window.__exportModalInit(ctx) once at boot, passing live accessor closures for
// its mutable session state plus the shared DOM elements. Mutable JS state is read
// through ctx accessors at EVERY use site (never captured once) so the export
// module always sees add-session.js's live values.
//
// ctx = {
//   getEditingSession, getSessionId, isReadMode,   // mutable JS state accessors
//   getIssuesPayload,                              // issue payload accessor
//   els: { sessionDate, clientSelect, insightsInput, customerSummaryInput },
// }
//
// Only one global is added: the private window.__exportModalInit handshake. There
// is no public feature API and no new test hooks — the export flow is driven
// through real button clicks (copySessionBtn / exportSessionBtn).
(function () {
  "use strict";

  // ── derived chronological session ordinal ───────────────────────────────────
  // The export card's "Session #N" is a CHRONOLOGICAL ordinal computed at export
  // time — the 1-based position of this session among the client's sessions
  // sorted ascending by ISO `date` (tie-break: numeric `id`) — and NEVER the
  // autoIncrement key (db.js:225). So deleting a middle session renumbers the
  // rest with no gap (the Ben-flagged renumber case). The sort is a pure lexical
  // string compare on the ISO date (YYYY-MM-DD → lexical == chronological), with
  // a deliberate NO `new Date()` on the date field — parsing would drag in
  // TZ/locale ambiguity when parsing the ISO date. An unsaved session (id not
  // found) derives length+1: the ordinal it WILL become on save. Reads
  // window.PortfolioDB.getSessionsByClient at CALL time (never captured) so it
  // always sees the live DB. Defined at module scope (outside initExportModal)
  // so it is a pure, init-independent helper and testable in isolation via the
  // exposed __exportModalTestHooks seam below.
  async function deriveSessionOrdinal(clientId, thisSessionId) {
    const db = (typeof window !== "undefined" && window.PortfolioDB)
      ? window.PortfolioDB
      : (typeof PortfolioDB !== "undefined" ? PortfolioDB : null);
    if (!db || typeof db.getSessionsByClient !== "function") return 1;
    const sessions = (await db.getSessionsByClient(clientId)) || [];
    const sorted = sessions.slice().sort(function (a, b) {
      const da = (a && a.date != null) ? String(a.date) : "";
      const dbv = (b && b.date != null) ? String(b.date) : "";
      const byDate = da.localeCompare(dbv);
      if (byDate !== 0) return byDate;
      // Tie-break on numeric id (lower id first) — deterministic regardless of
      // the unsorted getAll() return order.
      return (Number(a && a.id) || 0) - (Number(b && b.id) || 0);
    });
    const idx = sorted.findIndex(function (s) { return s && s.id === thisSessionId; });
    return idx === -1 ? sorted.length + 1 : idx + 1;
  }

  function initExportModal(ctx) {
    // DOM elements: from ctx.els or re-resolved by the same static IDs (unchanged
    // in add-session.html). Mutable JS state (editingSession/sessionId/isReadMode)
    // is intentionally NOT cached here — read it via ctx.get*() at point of use.
    const sessionDate = ctx.els.sessionDate;
    const clientSelect = ctx.els.clientSelect;
    const insightsInput = ctx.els.insightsInput;
    const customerSummaryInput = ctx.els.customerSummaryInput;
    const getIssuesPayload = ctx.getIssuesPayload;
    // Live editing-session accessor (mutable JS state in add-session.js) — read
    // at every use site, never cached. Used to derive the session ordinal.
    const getEditingSession = ctx.getEditingSession;
    const heartShieldToggle = document.getElementById("heartShieldToggle");

    // Mount the shared formatting toolbar over the export editor so Step 2 offers
    // the full rich-text control set (headings included) — the same toolbar the
    // add-session note fields use. This mount is PERSISTENT: the export editor gets
    // its own bar docked permanently above it, always visible while Step 2 is shown
    // rather than appearing only on focus. Preview is via that bar's preview toggle
    // (the same per-field preview pane the note fields use), which opens under the
    // editor. The mount is additive — it leaves the note fields' focus-attached
    // toolbar untouched. Guarded so the page is a clean no-op if the toolbar module
    // has not loaded.
    const exportEditorForToolbar = document.getElementById("exportEditor");
    if (
      exportEditorForToolbar &&
      window.RichToolbar &&
      typeof window.RichToolbar.mount === "function"
    ) {
      window.RichToolbar.mount([exportEditorForToolbar], { headings: true, persistent: true });
    }

    // Copy text to the clipboard with a secure-context path and an execCommand
    // fallback. Shared shape with add-session.js's per-field copy helper; kept as a
    // self-contained pure helper here because it has no closure dependencies.
    async function copyTextToClipboard(text) {
      if (navigator.clipboard && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(text);
          return true;
        } catch (error) {
          return false;
        }
      }
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.top = "-1000px";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      try {
        document.execCommand("copy");
        return true;
      } catch (error) {
        return false;
      } finally {
        textarea.remove();
      }
    }

    // Resolve the client's display name for export filenames / PDF title. The
    // canonical lookup (getSelectedClient + getClientDisplayName over clientCache)
    // lives in add-session.js, and clientCache is its private mutable state, not
    // part of the injected ctx. add-session.js loadClients() sets each option's
    // textContent to client.name — exactly what getClientDisplayName returns — so
    // reading the selected option text is output-identical without forking
    // clientCache (the "" / "__new__" / unknown cases all map to unknownClient,
    // matching the NaN -> null -> "" path of the original).
    function getClientNameForCopy() {
      if (!clientSelect) return App.t("session.copy.unknownClient");
      const value = clientSelect.value;
      if (!value || value === "__new__") return App.t("session.copy.unknownClient");
      const opt = clientSelect.options[clientSelect.selectedIndex];
      const displayName = opt ? opt.textContent : "";
      return displayName || App.t("session.copy.unknownClient");
    }

    // Whether a section currently holds data. Mirrors add-session.js's
    // sectionHasData; every branch reads the live DOM (the "issues" branch counts
    // the rendered issue rows instead of the closure-local issues array).
    function sectionHasData(sectionKey) {
      switch (sectionKey) {
        case "trapped": {
          const el = document.getElementById("trappedEmotions");
          return !!(el && el.value && el.value.trim().length > 0);
        }
        case "insights": {
          const el = document.getElementById("sessionInsights");
          return !!(el && el.value && el.value.trim().length > 0);
        }
        case "limitingBeliefs": {
          const el = document.getElementById("limitingBeliefs");
          return !!(el && el.value && el.value.trim().length > 0);
        }
        case "additionalTech": {
          const el = document.getElementById("additionalTech");
          return !!(el && el.value && el.value.trim().length > 0);
        }
        case "comments": {
          const el = document.getElementById("sessionComments");
          return !!(el && el.value && el.value.trim().length > 0);
        }
        case "nextSession": {
          // Content = note OR date (D-09/NEXT-06): a date-only session (empty
          // #customerSummary note but a #nextSessionDate set) still counts as
          // having data, so the export step-1 include-toggle defaults ON for it.
          const el = document.getElementById("customerSummary");
          const noteHasText = !!(el && el.value && el.value.trim().length > 0);
          const dateEl = document.getElementById("nextSessionDate");
          const dateHasValue = !!(dateEl && dateEl.value);
          return noteHasText || dateHasValue;
        }
        case "heartShieldEmotions": {
          const el = document.getElementById("heartShieldEmotions");
          return !!(el && el.value && el.value.trim().length > 0);
        }
        case "heartShield": {
          return !!(heartShieldToggle && heartShieldToggle.checked);
        }
        case "issues": {
          return document.querySelectorAll("#issueList .issue-block").length > 0;
        }
        default:
          return false;
      }
    }

    function stripRequired(label) {
      return label.replace(/\s*\*$/, "");
    }

    function buildSessionMarkdown() {
      // Client/Date/Type metadata lines are intentionally omitted — they are
      // redundant with the title block in the PDF (drawPage1Header centers
      // clientName + sessionDate + sessionType at the top of page 1, reading
      // them directly from sessionData function args, NOT from this markdown).
      // The 3 corresponding i18n keys (session.copy.client/date/type) are
      // intentionally KEPT in the i18n files in case other consumers use them.

      // Issues section (the emotions before/after block): included by default,
      // but a pre-selected opt-out — the export dialog's Step-1 selection can
      // exclude it, and this copy builder honours that same live choice (see
      // emotionsBlockIncluded). Change shown when both before and after exist.
      // Scale labels are i18n'd ("Before/After/Change", etc.); "Change"
      // replaces the prior "Delta" wording (too scientific).
      const beforeLabel = App.t("session.copy.scale.before");
      const afterLabel = App.t("session.copy.scale.after");
      const changeLabel = App.t("session.copy.scale.change");
      const issuesPayload = getIssuesPayload();
      const issuesText = issuesPayload.length
        ? issuesPayload
            .map((issue) => {
              const hasBefore = issue.before !== null && issue.before !== undefined;
              const hasAfter = issue.after !== null && issue.after !== undefined;
              const before = hasBefore ? issue.before : "-";
              const after = hasAfter ? issue.after : "-";
              if (hasBefore && hasAfter) {
                const delta = issue.after - issue.before;
                const sign = delta > 0 ? "+" : "";
                return `- ${issue.name} — ${beforeLabel}: ${before}, ${afterLabel}: ${after}, ${changeLabel}: ${sign}${delta}`;
              }
              return `- ${issue.name} — ${beforeLabel}: ${before}, ${afterLabel}: ${after}`;
            })
            .join("\n")
        : `- ${App.t("session.copy.empty")}`;

      // Collect optional text fields -- only include if non-empty
      const trappedEl = document.getElementById("trappedEmotions");
      const limitingBeliefsEl = document.getElementById("limitingBeliefs");
      const additionalTechEl = document.getElementById("additionalTech");
      const commentsEl = document.getElementById("sessionComments");

      const trappedValue = (trappedEl ? trappedEl.value : "").trim();
      const limitingBeliefsValue = (limitingBeliefsEl ? limitingBeliefsEl.value : "").trim();
      const additionalTechValue = (additionalTechEl ? additionalTechEl.value : "").trim();
      const insightsValue = (insightsInput ? insightsInput.value : "").trim();
      const commentsValue = (commentsEl ? commentsEl.value : "").trim();
      const summaryValue = (customerSummaryInput ? customerSummaryInput.value : "").trim();

      // Heart Shield status for copy
      const heartShieldChecked = heartShieldToggle ? heartShieldToggle.checked : false;
      const shieldRemovedCopyInput = document.querySelector("input[name='shieldRemoved']:checked");
      const shieldRemovedCopyValue = shieldRemovedCopyInput ? shieldRemovedCopyInput.value : null;

      const lines = [
        `# ${App.t("session.copy.title")}`
      ];

      // Heart shield is its own ## section in the body -- previously a bare
      // label-and-value line ("**Heart Shield Session** No") that, after **
      // stripping, displayed as raw text between the title and the issues section,
      // looking like stray junk. Promoting it to a ## heading + body line aligns
      // it with every other section's structure. The value line carries
      // export-only wording (session.export.heartWall.*), NOT the form's bare
      // Yes/No radio labels: in a document, "No" reads as "not a Heart-Wall
      // session" when it actually means identified-but-not-released.
      if (heartShieldChecked) {
        lines.push(
          "",
          `## ${stripRequired(App.getSectionLabel("heartShield", "session.form.heartShield"))}`,
          shieldRemovedCopyValue === "yes"
            ? App.t("session.export.heartWall.released")
            : App.t("session.export.heartWall.notReleased")
        );
      }

      // The emotions before/after block is skipped entirely when the current
      // export dialog's selection excluded it; with no live selection the
      // default is to include (unchanged behaviour for anyone who never opts
      // out). Nothing is persisted — the choice resets on every export.
      if (emotionsBlockIncluded()) {
        lines.push(
          "",
          `## ${stripRequired(App.getSectionLabel("issues", "session.form.issuesHeading"))}`,
          issuesText
        );
      }

      // Heart Shield Emotions (only when Heart Shield is on)
      const heartShieldEmotionsEl = document.getElementById("heartShieldEmotions");
      const heartShieldEmotionsValue = (heartShieldEmotionsEl ? heartShieldEmotionsEl.value : "").trim();
      if (heartShieldChecked && heartShieldEmotionsValue.length > 0) {
        lines.push("", `## ${stripRequired(App.getSectionLabel("heartShieldEmotions", "session.form.heartShieldEmotions"))}`, heartShieldEmotionsValue);
      }

      // Every ## heading is wrapped with stripRequired() so any section label that
      // ends with the form-required marker "*" (currently
      // session.form.issuesHeading; potentially others if therapists customize
      // titles via Settings or new required sections are added) renders without
      // the literal asterisk leaking into the section title. stripRequired() is
      // a no-op on labels that don't end with "*", so it's safe to apply
      // defensively to every heading call site.
      // Order MUST mirror the add-session form DOM order (data-section-key in
      // add-session.html): Trapped -> Insights -> Limiting Beliefs -> Additional
      // Techniques -> Comments -> Next Session. Insights was previously emitted
      // last, so it sorted after Additional Techniques. The section-order test
      // suite asserts this invariant.
      if (trappedValue.length > 0) {
        lines.push("", `## ${stripRequired(App.getSectionLabel("trapped", "session.form.trapped"))}`, trappedValue);
      }
      if (insightsValue.length > 0) {
        lines.push("", `## ${stripRequired(App.getSectionLabel("insights", "session.form.insights"))}`, insightsValue);
      }
      if (limitingBeliefsValue.length > 0) {
        lines.push("", `## ${stripRequired(App.getSectionLabel("limitingBeliefs", "session.form.limitingBeliefs"))}`, limitingBeliefsValue);
      }
      if (additionalTechValue.length > 0) {
        lines.push("", `## ${stripRequired(App.getSectionLabel("additionalTech", "session.form.additionalTech"))}`, additionalTechValue);
      }
      if (commentsValue.length > 0) {
        lines.push("", `## ${stripRequired(App.getSectionLabel("comments", "session.form.comments"))}`, commentsValue);
      }
      // Next Session (D-09/NEXT-06): render the formatted next-session date line
      // (via App.formatDate — the same locale/RTL-aware engine the overview cell
      // and PDF footer use, honoring portfolioDateFormat) alongside the note. The
      // gate is now note-OR-date so a date-only session (empty note) still emits
      // the block; whichever of date/note is present renders. Read straight from
      // #nextSessionDate (the same source the save path reads at add-session.js).
      const nextDateRaw = document.getElementById("nextSessionDate")?.value || "";
      const nextDateFormatted = nextDateRaw ? App.formatDate(nextDateRaw) : "";
      if (summaryValue.length > 0 || nextDateRaw) {
        lines.push("", `## ${stripRequired(App.getSectionLabel("nextSession", "session.form.nextSession"))}`);
        if (nextDateFormatted) lines.push(nextDateFormatted);
        if (summaryValue.length > 0) lines.push(summaryValue);
      }

      return lines.join("\n");
    }

    // ============================================================
    // Export modal
    // 3-step flow: Step 1 selection -> Step 2 edit -> Step 3 outputs
    // ============================================================
    const EXPORT_DEFAULT_CHECKED = {
      trapped: true,
      insights: true,
      limitingBeliefs: true,
      additionalTech: true,
      heartShieldEmotions: true, // only if data present (re-checked at render)
      nextSession: true,
      issues: true, // pre-selected opt-out; only if data present (re-checked at render)
      comments: false,
      heartShield: false
    };

    const EXPORT_SECTION_ORDER = [
      "trapped",
      "insights",
      "limitingBeliefs",
      "additionalTech",
      "heartShield",
      "heartShieldEmotions",
      "issues",
      "comments",
      "nextSession"
    ];

    function exportDefaultI18nKey(sectionKey) {
      switch (sectionKey) {
        case "trapped": return "session.form.trapped";
        case "insights": return "session.form.insights";
        case "limitingBeliefs": return "session.form.limitingBeliefs";
        case "additionalTech": return "session.form.additionalTech";
        case "heartShield": return "session.form.heartShield";
        case "heartShieldEmotions": return "session.form.heartShieldEmotions";
        case "issues": return "session.form.issuesHeading";
        case "comments": return "session.form.comments";
        case "nextSession": return "session.form.nextSession";
        default: return sectionKey;
      }
    }

    function getCurrentSessionDataForExport() {
      const clientName = getClientNameForCopy();
      const sessionDateISO = (sessionDate && sessionDate.value) ? sessionDate.value : "";
      const sessionDateFormatted = sessionDateISO ? App.formatDate(sessionDateISO) : "-";
      const sessionTypeInput = document.querySelector("input[name='sessionType']:checked");
      const sessionTypeLabel = App.formatSessionType(sessionTypeInput ? sessionTypeInput.value : "");
      return { clientName, sessionDateISO, sessionDateFormatted, sessionTypeLabel };
    }

    function buildFilteredSessionMarkdown(selectedKeys) {
      // Build a markdown document filtered to only the section keys checked in
      // Step 1. Client/date/type lines are omitted — they're redundant with the
      // PDF title block, which reads sessionData.clientName/sessionDate/sessionType
      // directly from the function args, not from the markdown body.
      const selected = new Set(selectedKeys);

      const heartShieldChecked = heartShieldToggle ? heartShieldToggle.checked : false;
      const shieldRemovedInput = document.querySelector("input[name='shieldRemoved']:checked");
      const shieldRemovedValue = shieldRemovedInput ? shieldRemovedInput.value : null;

      const lines = [
        `# ${App.t("session.copy.title")}`
      ];

      // Heart shield is its own ## section in the body -- previously a bare
      // label-and-value line ("**Heart Shield Session** No") that, after **
      // stripping, displayed as raw text between the title and the issues section,
      // looking like stray junk. Promoting it to a ## heading + body line aligns
      // it with every other section's structure. The value line carries the
      // export-only wording (session.export.heartWall.*), NOT the form's bare
      // Yes/No radio labels — same reasoning as buildSessionMarkdown, and the
      // PDF renders this line from this markdown body.
      if (heartShieldChecked && selected.has("heartShield")) {
        lines.push(
          "",
          `## ${stripRequired(App.getSectionLabel("heartShield", "session.form.heartShield"))}`,
          shieldRemovedValue === "yes"
            ? App.t("session.export.heartWall.released")
            : App.t("session.export.heartWall.notReleased")
        );
      }

      // Every ## heading is wrapped with stripRequired() so any section label that
      // ends with the form-required marker "*" (currently
      // session.form.issuesHeading; potentially others if therapists customize
      // titles via Settings or new required sections are added) renders without
      // the literal asterisk leaking into the section title. stripRequired() is
      // a no-op on labels that don't end with "*", so it's safe to apply
      // defensively to every heading call site.
      // The issues/severity section is NO LONGER emitted
      // as markdown body text here. Severity now renders STRUCTURALLY in the PDF
      // as the two-bar before/after block (drawSeverityBlock in pdf-export.js),
      // fed by the structured issues[] forwarded on the buildSessionPDF input
      // contract (34-05). Dropping the markdown emission together with adding the
      // bars (same phase) guarantees severity appears EXACTLY ONCE — as bars —
      // never doubled and never missing. The FULL builder (buildSessionMarkdown,
      // the clipboard-copy path) still emits the text issues section unchanged.

      const heartShieldEmotionsEl = document.getElementById("heartShieldEmotions");
      const heartShieldEmotionsValue = (heartShieldEmotionsEl ? heartShieldEmotionsEl.value : "").trim();
      if (selected.has("heartShieldEmotions") && heartShieldChecked && heartShieldEmotionsValue.length > 0) {
        lines.push("", `## ${stripRequired(App.getSectionLabel("heartShieldEmotions", "session.form.heartShieldEmotions"))}`, heartShieldEmotionsValue);
      }

      const trappedValue = (document.getElementById("trappedEmotions") || {}).value || "";
      if (selected.has("trapped") && trappedValue.trim().length > 0) {
        lines.push("", `## ${stripRequired(App.getSectionLabel("trapped", "session.form.trapped"))}`, trappedValue.trim());
      }
      // Section order MUST mirror the add-session form DOM order (data-section-key
      // in add-session.html): trapped -> insights -> limitingBeliefs ->
      // additionalTech. Insights was previously emitted last, so it sorted after
      // additionalTech. The section-order test suite asserts this invariant.
      const insightsValue = (insightsInput ? insightsInput.value : "").trim();
      if (selected.has("insights") && insightsValue.length > 0) {
        lines.push("", `## ${stripRequired(App.getSectionLabel("insights", "session.form.insights"))}`, insightsValue);
      }
      const limitingBeliefsValue = (document.getElementById("limitingBeliefs") || {}).value || "";
      if (selected.has("limitingBeliefs") && limitingBeliefsValue.trim().length > 0) {
        lines.push("", `## ${stripRequired(App.getSectionLabel("limitingBeliefs", "session.form.limitingBeliefs"))}`, limitingBeliefsValue.trim());
      }
      const additionalTechValue = (document.getElementById("additionalTech") || {}).value || "";
      if (selected.has("additionalTech") && additionalTechValue.trim().length > 0) {
        lines.push("", `## ${stripRequired(App.getSectionLabel("additionalTech", "session.form.additionalTech"))}`, additionalTechValue.trim());
      }
      const commentsValue = (document.getElementById("sessionComments") || {}).value || "";
      if (selected.has("comments") && commentsValue.trim().length > 0) {
        lines.push("", `## ${stripRequired(App.getSectionLabel("comments", "session.form.comments"))}`, commentsValue.trim());
      }
      const summaryValue = (customerSummaryInput ? customerSummaryInput.value : "").trim();
      // Next Session (D-09/NEXT-06): the per-section include-toggle still gates
      // BOTH note and date together — if nextSession is excluded, neither renders.
      // When included, the gate is note-OR-date so a date-only session still emits
      // the block, and the formatted date line (App.formatDate, honoring
      // portfolioDateFormat) renders beside the note (whichever is present).
      const nextDateRaw = document.getElementById("nextSessionDate")?.value || "";
      const nextDateFormatted = nextDateRaw ? App.formatDate(nextDateRaw) : "";
      if (selected.has("nextSession") && (summaryValue.length > 0 || nextDateRaw)) {
        lines.push("", `## ${stripRequired(App.getSectionLabel("nextSession", "session.form.nextSession"))}`);
        if (nextDateFormatted) lines.push(nextDateFormatted);
        if (summaryValue.length > 0) lines.push(summaryValue);
      }

      return lines.join("\n");
    }

    // Phase 45 (45-03, D-02/D-03/WARNING 2): the document-structure heading
    // vocabulary the builders emit — every section key's localized `## ${label}`
    // (via the SAME stripRequired(App.getSectionLabel(...)) call the builders use)
    // PLUS the level-1 document title `# ${App.t("session.copy.title")}`. This set
    // is forwarded as DATA on the buildSessionPDF contract
    // (sessionData.documentSectionLabels) so the PDF block loop can tell a DOCUMENT
    // heading (keeps the Phase-34 branded leaf-diamond/vein-rule chrome AND, at
    // level >= 2, increments the section-count that places the severity block) from
    // a NOTE-typed heading a therapist hand-typed inside a note field (rendered
    // subordinate + chrome-free, never counted). It is passed as data, NEVER a
    // sentinel injected into the markdown, so editor.value / the clipboard copy /
    // the `.md` download all stay byte-clean (D-10). This mirrors the
    // severityAfterSections label-match above — document-heading identity is
    // re-derived by label equality, not by marking the text. The title MUST be in
    // the set (WARNING 2): the PDF chrome branch brands ALL heading levels 1-3, so
    // a levels-1-3 classification without the title would demote the document title
    // to the note register on every PDF.
    function buildDocumentSectionLabels() {
      const labels = EXPORT_SECTION_ORDER.map(function (key) {
        return stripRequired(App.getSectionLabel(key, exportDefaultI18nKey(key)));
      });
      labels.push(App.t("session.copy.title"));
      return labels;
    }

    let _exportState = null;

    // Whether the emotions before/after block (the issues + severity section)
    // is included in export outputs. It is a pre-selected opt-out: included
    // unless the open export dialog's Step-1 selection excluded it. Outside a
    // live selection (dialog closed, or Step 1 not yet advanced) the answer is
    // always "include" — the choice deliberately resets per export and is
    // never persisted. Both the PDF assembly (buildRenderInputs) and the
    // clipboard copy (buildSessionMarkdown) read this one decision so the two
    // paths can never disagree.
    function emotionsBlockIncluded() {
      if (_exportState && Array.isArray(_exportState.selectedKeys)) {
        return _exportState.selectedKeys.indexOf("issues") !== -1;
      }
      return true;
    }

    function exportRenderStep1Rows(sessionData) {
      const container = document.getElementById("exportStep1Rows");
      if (!container) return;
      container.innerHTML = "";
      EXPORT_SECTION_ORDER.forEach((key) => {
        const enabled = App.isSectionEnabled(key);
        // The issues row carries a clarified fixed label ("Emotions before /
        // after ratings") so therapists recognise it as the before/after block
        // rather than only "Issues addressed"; every other row keeps the
        // customizable section label.
        const label = (key === "issues")
          ? App.t("export.section.emotions")
          : App.getSectionLabel(key, exportDefaultI18nKey(key));
        const hasData = sectionHasData(key);
        let defaultChecked = !!EXPORT_DEFAULT_CHECKED[key];
        if (key === "heartShieldEmotions") defaultChecked = defaultChecked && hasData;
        // nextSession defaults ON only when it has data — note OR date (D-09/
        // NEXT-06). sectionHasData("nextSession") counts either, so a date-only
        // session defaults the toggle ON while a truly empty one defaults OFF.
        if (key === "nextSession") defaultChecked = defaultChecked && hasData;
        // The emotions before/after row is a pre-selected opt-out, but only
        // pre-selects when the session actually has issue rows — an empty
        // section would render nothing anyway, so a checked box would mislead.
        if (key === "issues") defaultChecked = defaultChecked && hasData;

        const row = document.createElement("label");
        row.className = "export-section-row";
        if (!enabled) row.classList.add("is-disabled");

        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.dataset.sectionKey = key;
        cb.checked = enabled ? defaultChecked : false;
        cb.disabled = !enabled;

        const labelSpan = document.createElement("span");
        labelSpan.className = "export-section-label";
        labelSpan.textContent = label; // textContent — never innerHTML (section labels are user-influenced)

        row.appendChild(cb);
        row.appendChild(labelSpan);

        if (!enabled) {
          const badge = document.createElement("span");
          badge.className = "disabled-indicator-badge";
          badge.textContent = App.t("settings.indicator.disabled");
          row.appendChild(badge);
          row.title = App.t("settings.indicator.disabled");
        }
        container.appendChild(row);
      });
    }

    // Reflect the maximize toggle state onto the header button (icon-only, so the
    // meaning lives in the title/aria-label, set here from i18n).
    function updateMaximizeBtn(btn, isMax) {
      if (!btn) return;
      btn.setAttribute("aria-pressed", isMax ? "true" : "false");
      const titleKey = isMax ? "export.restore" : "export.maximize";
      const label = App.t(titleKey);
      btn.title = label;
      btn.setAttribute("aria-label", label);
    }

    function exportSetActiveStep(n) {
      const modal = document.getElementById("exportModal");
      if (!modal) return;
      _exportState.currentStep = n;

      // The roomy 50%/maximize/flex-fill sizing is gated to the editor step: turn
      // it ON only while Step 2 is active so Steps 1/3 keep the natural card size,
      // and surface the maximize toggle only there. Leaving Step 2 also drops any
      // maximized state so re-entry always starts at the 50% default.
      const card = modal.querySelector(".export-card");
      const maximizeBtn = document.getElementById("exportMaximize");
      const isEditorStep = n === 2;
      if (card) {
        card.classList.toggle("is-editor-step", isEditorStep);
        if (!isEditorStep) card.classList.remove("is-maximized");
      }
      if (maximizeBtn) {
        maximizeBtn.classList.toggle("is-hidden", !isEditorStep);
        if (!isEditorStep) updateMaximizeBtn(maximizeBtn, false);
      }

      modal.querySelectorAll(".export-step").forEach((stepEl) => {
        const stepNum = Number(stepEl.dataset.step);
        stepEl.classList.toggle("is-active", stepNum === n);
      });
      modal.querySelectorAll(".export-step-dot").forEach((dot) => {
        const stepNum = Number(dot.dataset.step);
        dot.classList.toggle("is-active", stepNum === n);
        dot.classList.toggle("is-completed", stepNum < n);
      });
      // Mirror is-active / is-completed onto the .export-step-pill wrapper so the
      // label below/beside the dot picks up the active-step colour treatment.
      modal.querySelectorAll(".export-step-pill").forEach((pill) => {
        const stepNum = Number(pill.dataset.step);
        pill.classList.toggle("is-active", stepNum === n);
        pill.classList.toggle("is-completed", stepNum < n);
      });
      modal.querySelectorAll(".export-step-connector").forEach((conn, idx) => {
        // connector idx 0 sits between step 1 and 2; idx 1 between step 2 and 3
        conn.classList.toggle("is-completed", idx < n - 1);
      });
      const indicator = modal.querySelector(".export-step-indicator");
      if (indicator) indicator.setAttribute("aria-valuenow", String(n));

      const backBtn = document.getElementById("exportBackBtn");
      const nextBtn = document.getElementById("exportNextBtn");
      if (backBtn) backBtn.classList.toggle("is-hidden", n === 1);
      if (nextBtn) {
        if (n === 1) {
          nextBtn.setAttribute("data-i18n", "export.next1");
          nextBtn.textContent = App.t("export.next1");
        } else if (n === 2) {
          nextBtn.setAttribute("data-i18n", "export.next2");
          nextBtn.textContent = App.t("export.next2");
        } else {
          nextBtn.setAttribute("data-i18n", "export.done");
          nextBtn.textContent = App.t("export.done");
        }
      }
    }

    async function exportCloseDialog(skipDirtyCheck) {
      const modal = document.getElementById("exportModal");
      if (!modal) return;
      if (!skipDirtyCheck && _exportState && _exportState.hasEditedPreview) {
        const ok = await App.confirmDialog({
          titleKey: "export.discard.title",
          messageKey: "export.discard.body",
          confirmKey: "export.discard.yes",
          cancelKey: "export.discard.no"
        });
        if (!ok) return;
      }
      // Return any open preview to Edit before hiding, so a reopen of Step 2 starts
      // in Edit with a fresh render instead of a stale swapped-in Frame. resetPreview
      // does not force focus, so it is safe on a closing modal.
      if (window.RichToolbar && window.RichToolbar.resetPreview) {
        window.RichToolbar.resetPreview();
      }
      modal.classList.add("is-hidden");
      App.unlockBodyScroll();
      if (_exportState && _exportState.cleanup) {
        _exportState.cleanup();
      }
      _exportState = null;
    }

    // Assemble the data-tier render inputs the renderer needs as EXPLICIT args so
    // buildSessionPDF stays a pure function of its inputs:
    //   • sessionNumber — the chronological ordinal (1-based position among the
    //     client's sessions, ascending by ISO date). Derived from the editing
    //     session's clientId/id; for a new (unsaved) session we fall back to the
    //     selected client's count + 1 (deriveSessionOrdinal returns length+1 when
    //     the id is absent). Omitted gracefully (undefined) when no client is
    //     resolvable — the renderer then draws no card number.
    //   • issues — the STRUCTURED {name,before,after} array (NOT markdown) so the
    //     render tier can draw the severity bars from data.
    //   • exportedOn — today's LOCAL calendar day (via DateFormat.todayLocalISO,
    //     NOT `new Date()` which drags a wall-clock instant into a UTC parse),
    //     localized via App.formatDate in the chosen format, distinct from the
    //     card's session date (DATE-05).
    async function buildRenderInputs() {
      let sessionNumber;
      try {
        const es = (typeof getEditingSession === "function") ? getEditingSession() : null;
        let clientIdForOrdinal = (es && es.clientId != null) ? es.clientId : null;
        let thisSessionId = es ? es.id : null;
        if (clientIdForOrdinal == null && clientSelect && clientSelect.value && clientSelect.value !== "__new__") {
          const parsed = parseInt(clientSelect.value, 10);
          if (!Number.isNaN(parsed)) clientIdForOrdinal = parsed;
        }
        if (clientIdForOrdinal != null) {
          sessionNumber = await deriveSessionOrdinal(clientIdForOrdinal, thisSessionId);
        }
      } catch (err) {
        // Omit the ordinal gracefully — a render-tier convenience, never a hard
        // dependency of the export.
        sessionNumber = undefined;
      }
      // The emotions before/after block is a pre-selected opt-out: when the
      // Step-1 selection excluded it, forward an EMPTY issues array — the
      // severity renderer early-returns on an empty list, so the two-bar block
      // is cleanly omitted without touching any other render logic.
      const issues = (emotionsBlockIncluded() && typeof getIssuesPayload === "function")
        ? getIssuesPayload()
        : [];
      const exportedOn = App.formatDate(window.DateFormat.todayLocalISO());

      // Change 1 (owner revision): tell the render tier WHERE severity sits in
      // form order. The form DOM (add-session.html) places the issues/severity
      // section right after heartShield (position 2) and before every text
      // section, so the PDF must draw the two-bar block after the heartShield
      // section (when present) and before the rest — never last. We forward the
      // count of leading body sections that precede severity: 1 when the
      // heart-shield section heads the exported body, else 0. Read from the editor
      // markdown actually being exported (the heartShield ## is always the first
      // section when present, per buildFilteredSessionMarkdown) so manual Step-2
      // edits are honoured. Robust + locale-correct: it matches the SAME localized
      // heartShield label the builder emits.
      let severityAfterSections = 0;
      try {
        const editorEl = document.getElementById("exportEditor");
        const md = editorEl ? editorEl.value : "";
        const firstHeading = md.match(/^##[ \t]+(.+?)[ \t]*$/m);
        if (firstHeading) {
          const hsLabel = stripRequired(App.getSectionLabel("heartShield", "session.form.heartShield"));
          if (firstHeading[1].trim() === String(hsLabel).trim()) severityAfterSections = 1;
        }
      } catch (e) {
        severityAfterSections = 0;
      }

      return { sessionNumber, issues, exportedOn, severityAfterSections };
    }

    async function exportHandleDownloadPdf() {
      const btn = document.getElementById("exportDownloadPdf");
      const subtitle = document.getElementById("exportPdfSubtitle");
      if (!btn || !window.PDFExport) {
        App.showToast("", "export.pdf.failed");
        return;
      }
      try {
        btn.disabled = true;
        if (subtitle) subtitle.textContent = App.t("export.preparing");
        const editor = document.getElementById("exportEditor");
        const data = _exportState ? _exportState.sessionData : getCurrentSessionDataForExport();
        const renderInputs = await buildRenderInputs();
        const blob = await window.PDFExport.buildSessionPDF({
          clientName: data.clientName,
          sessionDate: data.sessionDateISO,
          sessionType: data.sessionTypeLabel,
          markdown: editor ? editor.value : "",
          sessionNumber: renderInputs.sessionNumber,
          issues: renderInputs.issues,
          exportedOn: renderInputs.exportedOn,
          severityAfterSections: renderInputs.severityAfterSections,
          // Phase 45 (45-03, D-02/D-03): the document-section label set lets the
          // PDF classify each editor.value heading as document (branded chrome +
          // counted) vs note-typed (subordinate, chrome-free). Passed as DATA — no
          // sentinel in editor.value, so the `.md` download stays byte-clean (D-10).
          documentSectionLabels: buildDocumentSectionLabels()
        }, {
          uiLang: localStorage.getItem("portfolioLang") || "en",
          onProgress: function (phase) {
            if (subtitle) {
              subtitle.textContent = phase === "done" ? "" : App.t("export.preparing");
            }
          }
        });
        const slug = window.PDFExport.slugify(data.clientName);
        const fname = slug + "_" + (data.sessionDateISO || "session") + ".pdf";
        window.PDFExport.triggerDownload(blob, fname);
        if (subtitle) subtitle.textContent = "";
      } catch (err) {
        console.error("PDF generation failed:", err);
        App.showToast("", "export.pdf.failed");
        if (subtitle) subtitle.textContent = "";
      } finally {
        btn.disabled = false;
      }
    }

    function exportHandleDownloadMd() {
      const btn = document.getElementById("exportDownloadMd");
      const editor = document.getElementById("exportEditor");
      if (!btn || !editor) return;
      const data = _exportState ? _exportState.sessionData : getCurrentSessionDataForExport();
      const blob = new Blob([editor.value], { type: "text/markdown;charset=utf-8" });
      const slug = (window.PDFExport && typeof window.PDFExport.slugify === "function")
        ? window.PDFExport.slugify(data.clientName)
        : (data.clientName || "Session").replace(/[<>:"\/\\|?*\x00-\x1F]/g, "");
      const fname = slug + "_" + (data.sessionDateISO || "session") + ".md";
      if (window.PDFExport && typeof window.PDFExport.triggerDownload === "function") {
        window.PDFExport.triggerDownload(blob, fname);
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fname;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    }

    async function exportHandleShare() {
      const btn = document.getElementById("exportShare");
      const editor = document.getElementById("exportEditor");
      if (!btn || !editor) return;
      if (typeof navigator.canShare !== "function" || typeof navigator.share !== "function") return;
      try {
        btn.disabled = true;
        const data = _exportState ? _exportState.sessionData : getCurrentSessionDataForExport();
        const renderInputs = await buildRenderInputs();
        const blob = await window.PDFExport.buildSessionPDF({
          clientName: data.clientName,
          sessionDate: data.sessionDateISO,
          sessionType: data.sessionTypeLabel,
          markdown: editor.value,
          sessionNumber: renderInputs.sessionNumber,
          issues: renderInputs.issues,
          exportedOn: renderInputs.exportedOn,
          severityAfterSections: renderInputs.severityAfterSections,
          // Phase 45 (45-03, D-02/D-03): document-section label set for note-vs-
          // document heading classification (same as the PDF-download path). Data,
          // not a sentinel — the shared editor.value stays byte-clean (D-10).
          documentSectionLabels: buildDocumentSectionLabels()
        }, { uiLang: localStorage.getItem("portfolioLang") || "en" });
        const slug = window.PDFExport.slugify(data.clientName);
        const fname = slug + "_" + (data.sessionDateISO || "session") + ".pdf";
        const file = new File([blob], fname, { type: "application/pdf" });
        if (!navigator.canShare({ files: [file] })) {
          btn.classList.add("is-hidden");
          return;
        }
        // Share the FILE ONLY. Including `text`/`title` here caused macOS Chrome's
        // Web Share to leak the temp WebShare file path as a separate text message
        // — and a duplicate attachment — into targets like WhatsApp. Files-only
        // delivers a single clean PDF.
        await navigator.share({
          files: [file]
        });
      } catch (err) {
        if (err && err.name === "AbortError") return; // user cancelled
        console.error("Share failed:", err);
      } finally {
        btn.disabled = false;
      }
    }

    function exportProbeShareSupport() {
      const btn = document.getElementById("exportShare");
      if (!btn) return;
      if (typeof navigator.canShare !== "function") return;
      try {
        const probe = new File(
          [new Blob(["x"], { type: "application/pdf" })],
          "x.pdf",
          { type: "application/pdf" }
        );
        if (navigator.canShare({ files: [probe] })) {
          btn.classList.remove("is-hidden");
        }
      } catch (e) {
        // export-modal: probe failed — leave button hidden
      }
    }

    async function openExportDialog() {
      const modal = document.getElementById("exportModal");
      if (!modal) return;
      const sessionData = getCurrentSessionDataForExport();
      _exportState = {
        currentStep: 1,
        sessionData,
        hasEditedPreview: false,
        // The last markdown generated into the editor on Step-2 entry. The dirty
        // check compares against this so undo/redo back to the generated text
        // clears the flag (no spurious discard prompt on a pristine document).
        generatedMarkdown: "",
        // The Step-1 section selection, captured on Next so the PDF assembly
        // and the copy builder can read the live choice. null until Step 1 is
        // advanced — readers treat that as "no selection yet" and fall back to
        // the include-everything-eligible default.
        selectedKeys: null,
        cleanup: null
      };

      exportRenderStep1Rows(sessionData);
      exportSetActiveStep(1);

      const editor = document.getElementById("exportEditor");
      // Defensively bind the export editor for snippet expansion. The static
      // editor already carries data-snippets="true" (bound by Snippets.init()
      // at DOMContentLoaded), but this idempotent call (guarded by Snippets'
      // internal _bound WeakMap) guarantees binding even if the modal markup
      // is ever re-rendered.
      if (window.Snippets && editor) window.Snippets.bindTextarea(editor);
      if (editor) editor.value = "";
      // Direct `.value =` fires no input event, so re-seed the undo baseline to
      // the reset (empty) state — this also clears any snapshots left over from a
      // previous export, preventing cross-open undo bleed.
      if (editor && window.TextEdit && window.TextEdit.undoReset) window.TextEdit.undoReset(editor);

      modal.classList.remove("is-hidden");
      App.lockBodyScroll();
      App.applyTranslations(modal);

      // Wire events for the lifetime of this dialog. Track listeners so we can detach.
      const closeBtn = document.getElementById("exportClose");
      const overlay = modal.querySelector(".modal-overlay");
      const backBtn = document.getElementById("exportBackBtn");
      const nextBtn = document.getElementById("exportNextBtn");
      const downloadPdfBtn = document.getElementById("exportDownloadPdf");
      const downloadMdBtn = document.getElementById("exportDownloadMd");
      const shareBtn = document.getElementById("exportShare");
      const maximizeBtn = document.getElementById("exportMaximize");

      // Title/aria are set here (applyTranslations only handles textContent), so
      // the button reads correctly the moment it is revealed on Step 2.
      updateMaximizeBtn(maximizeBtn, false);

      const onClose = () => exportCloseDialog(false);
      const onOverlay = () => exportCloseDialog(false);
      const onKey = (e) => { if (e.key === "Escape") exportCloseDialog(false); };
      const onBack = () => {
        if (_exportState.currentStep > 1) exportSetActiveStep(_exportState.currentStep - 1);
      };
      const onNext = async () => {
        if (_exportState.currentStep === 1) {
          // Advancing from Step 1 REGENERATES the editor from the section selection,
          // overwriting any Step-2 edits. If the user went Back with dirty edits,
          // confirm the discard BEFORE overwriting — cancel leaves the edits (and
          // the step) untouched. Reuses the same discard dialog the close path uses.
          if (_exportState.hasEditedPreview) {
            const ok = await App.confirmDialog({
              titleKey: "export.discard.title",
              messageKey: "export.discard.body",
              confirmKey: "export.discard.yes",
              cancelKey: "export.discard.no"
            });
            if (!ok) return;
          }
          // Collect selected sections, build initial markdown, populate editor.
          const checks = modal.querySelectorAll('#exportStep1Rows input[type="checkbox"]');
          const selected = [];
          checks.forEach((cb) => { if (cb.checked && !cb.disabled) selected.push(cb.dataset.sectionKey); });
          // Keep the selection on the dialog state so downstream assembly
          // (buildRenderInputs) and the copy builder can gate the emotions
          // before/after block on the live choice. It dies with the dialog —
          // the opt-out resets on every export.
          _exportState.selectedKeys = selected;
          const md = buildFilteredSessionMarkdown(selected);
          if (editor) editor.value = md;
          _exportState.generatedMarkdown = md;
          // Direct `.value =` fires no input event; re-seed the undo baseline to
          // the generated markdown so the first undo removes the first real edit
          // rather than wiping the document back to empty.
          if (editor && window.TextEdit && window.TextEdit.undoReset) window.TextEdit.undoReset(editor);
          _exportState.hasEditedPreview = false;
          exportSetActiveStep(2);
        } else if (_exportState.currentStep === 2) {
          exportSetActiveStep(3);
        } else {
          exportCloseDialog(true);
        }
      };
      // Track edits so closing a modified export prompts a discard confirm. The
      // formatted preview is on-demand via the toolbar's preview toggle, so no
      // live re-render is wired here.
      const onEditorInput = () => {
        // Undo/redo apply through the edit chokepoint and fire real input events,
        // so compare against the generated markdown: a document returned to its
        // pristine generated state is not dirty and closes without a discard prompt.
        _exportState.hasEditedPreview = editor ? (editor.value !== _exportState.generatedMarkdown) : false;
      };
      const onMaximize = () => {
        const cardEl = modal.querySelector(".export-card");
        if (!cardEl) return;
        const nowMax = cardEl.classList.toggle("is-maximized");
        updateMaximizeBtn(maximizeBtn, nowMax);
      };
      const onPdf = () => exportHandleDownloadPdf();
      const onMd = () => exportHandleDownloadMd();
      const onShare = () => exportHandleShare();

      // Event-delegated close on the modal root: survives any z-index issue,
      // any cleanup-ordering bug, and works identically on every step.
      // This guards a stacking-order issue on Step 3: the .modal-close had
      // no z-index inside .modal-card (z-index:1), and on Step 3 the
      // .export-output-card buttons (later in DOM order) painted at the same
      // stacking level — so direct clicks on the X were absorbed by the body
      // region rather than reaching the X listener.
      const onModalClick = (e) => {
        if (!e || !e.target) return;
        const t = e.target;
        if (t.closest && t.closest(".modal-close")) { onClose(); return; }
        if (t.classList && t.classList.contains("modal-overlay")) { onOverlay(); return; }
      };
      modal.addEventListener("click", onModalClick);
      document.addEventListener("keydown", onKey);
      if (backBtn) backBtn.addEventListener("click", onBack);
      if (nextBtn) nextBtn.addEventListener("click", onNext);
      if (editor) editor.addEventListener("input", onEditorInput);
      if (maximizeBtn) maximizeBtn.addEventListener("click", onMaximize);
      if (downloadPdfBtn) downloadPdfBtn.addEventListener("click", onPdf);
      if (downloadMdBtn) downloadMdBtn.addEventListener("click", onMd);
      if (shareBtn) shareBtn.addEventListener("click", onShare);

      exportProbeShareSupport();

      _exportState.cleanup = function () {
        modal.removeEventListener("click", onModalClick);
        document.removeEventListener("keydown", onKey);
        if (backBtn) backBtn.removeEventListener("click", onBack);
        if (nextBtn) nextBtn.removeEventListener("click", onNext);
        if (editor) editor.removeEventListener("input", onEditorInput);
        if (maximizeBtn) maximizeBtn.removeEventListener("click", onMaximize);
        if (downloadPdfBtn) downloadPdfBtn.removeEventListener("click", onPdf);
        if (downloadMdBtn) downloadMdBtn.removeEventListener("click", onMd);
        if (shareBtn) shareBtn.removeEventListener("click", onShare);
      };
    }

    // Export-button wiring (moved from the add-session.js DOMContentLoaded body).
    // copySessionBtn copies the full session markdown; exportSessionBtn opens the
    // 3-step export dialog.
    const copySessionBtn = document.getElementById("copySessionBtn");
    const exportSessionBtn = document.getElementById("exportSessionBtn");

    if (copySessionBtn) {
      copySessionBtn.addEventListener("click", async () => {
        const markdown = buildSessionMarkdown();
        const success = await copyTextToClipboard(markdown);
        if (success) App.showToast("", "toast.copied");
      });
    }

    if (exportSessionBtn) {
      // #exportSessionBtn is shown ONLY in read mode (add-session.js setReadMode:
      // `exportSessionBtn.classList.toggle("is-hidden", !isReadMode)`), so export
      // is only ever reachable while VIEWING an already-saved, read-only session.
      // The session is therefore always saved + clean at click time — just open
      // the dialog directly.
      exportSessionBtn.addEventListener("click", () => {
        openExportDialog();
      });
    }

    // Test seam (the __exportModalTestHooks idiom): expose the two markdown
    // builders + the document-section label set so tests can drive the REAL
    // editor.value pipeline (buildFilteredSessionMarkdown → buildSessionPDF) and
    // the REAL copy path (buildSessionMarkdown) directly against a populated form
    // DOM — no clicking through the modal, no source-slicing. These are the exact
    // functions production uses; exposing them (like deriveSessionOrdinal below)
    // adds no public feature API. Assigned here, inside initExportModal, because
    // the builders are closure-locals (unlike the module-scope deriveSessionOrdinal).
    if (typeof window !== "undefined") {
      window.__exportModalTestHooks = window.__exportModalTestHooks || {};
      window.__exportModalTestHooks.buildFilteredSessionMarkdown = buildFilteredSessionMarkdown;
      window.__exportModalTestHooks.buildSessionMarkdown = buildSessionMarkdown;
      window.__exportModalTestHooks.buildDocumentSectionLabels = buildDocumentSectionLabels;
    }
  }

  // Private handshake global — guarded so module eval is safe under a vm sandbox
  // (mirrors the add-session.js __addSessionTestHooks idiom).
  if (typeof window !== "undefined") {
    window.__exportModalInit = initExportModal;
    // Test seam (the __addSessionTestHooks idiom): expose the pure ordinal
    // derivation so tests/34-session-ordinal.test.js can drive it directly
    // against a seeded window.PortfolioDB — no DOM, no init handshake required.
    window.__exportModalTestHooks = window.__exportModalTestHooks || {};
    window.__exportModalTestHooks.deriveSessionOrdinal = deriveSessionOrdinal;
  }
})();
