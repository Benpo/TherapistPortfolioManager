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

  // Where the structural severity block sits, expressed as the number of section
  // headings that precede it. The block is drawn just before the
  // (result + 1)-th document heading the PDF encounters, so this is the ordinal
  // of the end-of-session-severity slot among the sections ACTUALLY PRESENT in
  // the exported body.
  //
  // orderedKeys  — the therapist's saved section order (flattened to keys).
  // presentKeys  — the subset whose headings actually appear in the edited
  //                Step-2 text, in saved order (saved order ∩ parsed headings).
  //                Deriving from the edited text (not the build-time emission
  //                list) means deleting a heading in Step 2 shifts the block up
  //                one slot, exactly matching what the reader will see.
  //
  // Only present sections that come BEFORE the severity slot count; a present
  // section positioned after it does not. When the severity slot is not in the
  // saved order at all, the block falls to the end (all present sections
  // precede it). Pure — no DOM, no closure state — so it is testable in
  // isolation via the module test-hook seam.
  function deriveSeverityAfterSections(orderedKeys, presentKeys) {
    const ordered = Array.isArray(orderedKeys) ? orderedKeys : [];
    const present = Array.isArray(presentKeys) ? presentKeys : [];
    const presentSet = new Set(present);
    const slot = ordered.indexOf("afterSeverity");
    if (slot === -1) return present.length;
    let count = 0;
    for (let i = 0; i < slot; i++) {
      if (presentSet.has(ordered[i])) count++;
    }
    return count;
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

      // Scale labels are i18n'd ("Before/After/Change", etc.); "Change" replaces
      // the prior "Delta" wording (too scientific).
      const beforeLabel = App.t("session.copy.scale.before");
      const afterLabel = App.t("session.copy.scale.after");
      const changeLabel = App.t("session.copy.scale.change");
      const heartShieldChecked = heartShieldToggle ? heartShieldToggle.checked : false;

      const lines = [
        `# ${App.t("session.copy.title")}`
      ];

      // Every ## heading is wrapped with stripRequired() so any section label that
      // ends with the form-required marker "*" renders without the literal
      // asterisk leaking into the title. stripRequired() is a no-op on labels
      // that don't end with "*", so it is safe to apply to every heading.
      const pushSection = (key, body) => {
        lines.push("", `## ${stripRequired(App.getSectionLabel(key, exportDefaultI18nKey(key)))}`);
        if (Array.isArray(body)) {
          body.forEach((b) => { if (b) lines.push(b); });
        } else if (body) {
          lines.push(body);
        }
      };

      // The clipboard copy emits its sections in the therapist's saved order
      // (the same page-pinned source the filtered/PDF builder reads), so the two
      // export paths can never disagree on section sequence. Group names never
      // appear — the order is flattened to section keys only. Each section is
      // gated on its own content presence (an empty note emits nothing); the
      // topic/severity gating mirrors the filtered builder.
      orderedFormKeys().forEach((key) => {
        switch (key) {
          case "afterSeverity":
            // A clipboard copy has no structural bar block — the before/after
            // ratings are emitted as text beside the topic names in the Session-
            // topics section, so this slot itself contributes no heading.
            return;
          case "issues": {
            // Session topics: included unless the open dialog's selection
            // excluded it (outside a live selection the default is include). With
            // severity included, a fully-rated topic emits its before/after/change
            // line; a topic with an unrated (non-numeric) side emits its name
            // only — a null side is never string-interpolated into a rating line
            // nor subtracted into a NaN change value. With severity excluded, the
            // topic NAMES still list, but no rating text appears.
            if (!emotionsBlockIncluded()) return;
            const payload = (typeof getIssuesPayload === "function") ? getIssuesPayload() : [];
            if (payload.length === 0) {
              pushSection(key, `- ${App.t("session.copy.empty")}`);
              return;
            }
            const withSeverity = severityBlockIncluded();
            const body = payload.map((issue) => {
              const name = (issue && issue.name != null) ? String(issue.name) : "";
              if (withSeverity && typeof issue.before === "number" && typeof issue.after === "number") {
                const delta = issue.after - issue.before;
                const sign = delta > 0 ? "+" : "";
                return `- ${name} — ${beforeLabel}: ${issue.before}, ${afterLabel}: ${issue.after}, ${changeLabel}: ${sign}${delta}`;
              }
              return `- ${name}`;
            }).join("\n");
            pushSection(key, body);
            return;
          }
          case "heartShield": {
            // Heart shield is its own ## section. The value line carries
            // export-only wording (session.export.heartWall.*), NOT the form's
            // bare Yes/No radio labels: in a document, "No" reads as "not a
            // Heart-Wall session" when it actually means identified-but-not-
            // released.
            if (!heartShieldChecked) return;
            const shieldRemovedInput = document.querySelector("input[name='shieldRemoved']:checked");
            const shieldRemovedValue = shieldRemovedInput ? shieldRemovedInput.value : null;
            pushSection(key, shieldRemovedValue === "yes"
              ? App.t("session.export.heartWall.released")
              : App.t("session.export.heartWall.notReleased"));
            return;
          }
          case "heartShieldEmotions": {
            const el = document.getElementById("heartShieldEmotions");
            const v = (el ? el.value : "").trim();
            if (!heartShieldChecked || v.length === 0) return;
            pushSection(key, v);
            return;
          }
          case "trapped": {
            const v = ((document.getElementById("trappedEmotions") || {}).value || "").trim();
            if (v.length === 0) return;
            pushSection(key, v);
            return;
          }
          case "insights": {
            const v = (insightsInput ? insightsInput.value : "").trim();
            if (v.length === 0) return;
            pushSection(key, v);
            return;
          }
          case "limitingBeliefs": {
            const v = ((document.getElementById("limitingBeliefs") || {}).value || "").trim();
            if (v.length === 0) return;
            pushSection(key, v);
            return;
          }
          case "additionalTech": {
            const v = ((document.getElementById("additionalTech") || {}).value || "").trim();
            if (v.length === 0) return;
            pushSection(key, v);
            return;
          }
          case "comments": {
            const v = ((document.getElementById("sessionComments") || {}).value || "").trim();
            if (v.length === 0) return;
            pushSection(key, v);
            return;
          }
          case "nextSession": {
            // The formatted next-session date line (App.formatDate — the same
            // locale/RTL-aware engine the overview cell and PDF footer use,
            // honoring portfolioDateFormat) renders beside the note. The gate is
            // note-OR-date so a date-only session (empty note) still emits the
            // block; whichever of date/note is present renders. Read straight from
            // #nextSessionDate (the same source the save path reads).
            const summaryValue = (customerSummaryInput ? customerSummaryInput.value : "").trim();
            const nextDateRaw = document.getElementById("nextSessionDate")?.value || "";
            if (summaryValue.length === 0 && !nextDateRaw) return;
            const nextDateFormatted = nextDateRaw ? App.formatDate(nextDateRaw) : "";
            pushSection(key, [nextDateFormatted, summaryValue.length > 0 ? summaryValue : ""]);
            return;
          }
          default:
            return;
        }
      });

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

    // Fallback flattened key sequence, used ONLY when the shared saved-order
    // reader is unavailable (e.g. a minimal test host). It mirrors the app's
    // default section structure so even the fallback never diverges from what
    // the form renders. In production the saved-order reader below always wins.
    const DEFAULT_FLAT_ORDER = [
      "issues",
      "heartShield",
      "heartShieldEmotions",
      "trapped",
      "insights",
      "limitingBeliefs",
      "additionalTech",
      "afterSeverity",
      "comments",
      "nextSession"
    ];

    // The ONE order source every export consumer reads: the Step-1 checkbox
    // list, the filtered markdown builder, and the document-section labels all
    // iterate this same flattened key list, so their orderings can never
    // diverge. On the add-session page this is the snapshot the form pinned at
    // open, so a peer-tab reorder mid-edit cannot desync form and export.
    function orderedFormKeys() {
      try {
        if (typeof App.getSectionOrder === "function" && typeof App.flattenOrderKeys === "function") {
          const keys = App.flattenOrderKeys(App.getSectionOrder());
          if (Array.isArray(keys) && keys.length > 0) return keys;
        }
      } catch (e) {
        // fall through to the default structure
      }
      return DEFAULT_FLAT_ORDER.slice();
    }

    function exportDefaultI18nKey(sectionKey) {
      switch (sectionKey) {
        case "trapped": return "session.form.trapped";
        case "insights": return "session.form.insights";
        case "limitingBeliefs": return "session.form.limitingBeliefs";
        case "additionalTech": return "session.form.additionalTech";
        case "heartShield": return "session.form.heartShield";
        case "heartShieldEmotions": return "session.form.heartShieldEmotions";
        case "issues": return "session.form.issuesHeading";
        case "afterSeverity": return "session.form.afterSeverityTitle";
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
      // Step 1, emitted in the therapist's saved section order. Client/date/type
      // lines are omitted — they're redundant with the PDF title block, which
      // reads sessionData.clientName/sessionDate/sessionType directly from the
      // function args, not from the markdown body.
      //
      // Every ## heading is wrapped with stripRequired() so any section label
      // that ends with the form-required marker "*" renders without the literal
      // asterisk. stripRequired() is a no-op on labels that don't end with "*".
      //
      // Group NAMES never appear here — the order is flattened to section keys
      // only, so the exported document stays a flat sequence of section headings.
      const selected = new Set(selectedKeys);
      const heartShieldChecked = heartShieldToggle ? heartShieldToggle.checked : false;

      const lines = [
        `# ${App.t("session.copy.title")}`
      ];

      const pushSection = (key, body) => {
        lines.push("", `## ${stripRequired(App.getSectionLabel(key, exportDefaultI18nKey(key)))}`);
        if (Array.isArray(body)) {
          body.forEach((b) => { if (b) lines.push(b); });
        } else if (body) {
          lines.push(body);
        }
      };

      orderedFormKeys().forEach((key) => {
        if (!selected.has(key)) return;
        switch (key) {
          case "afterSeverity":
            // The end-of-session severity content is PDF-structural (the two-bar
            // before/after block), never markdown text — so this slot emits no
            // section here.
            return;
          case "issues": {
            // Session topics: the topic NAMES only. Numeric ratings stay
            // PDF-structural bars gated by the severity sub-option; no rating
            // text ever appears in this filtered markdown.
            const names = ((typeof getIssuesPayload === "function") ? getIssuesPayload() : [])
              .map((it) => (it && it.name != null) ? String(it.name).trim() : "")
              .filter((n) => n.length > 0);
            if (names.length === 0) return;
            pushSection(key, names.join("\n"));
            return;
          }
          case "heartShield": {
            if (!heartShieldChecked) return;
            // The value line carries the export-only wording
            // (session.export.heartWall.*), NOT the form's bare Yes/No radio
            // labels: in a document, "No" reads as "not a Heart-Wall session"
            // when it actually means identified-but-not-released.
            const shieldRemovedInput = document.querySelector("input[name='shieldRemoved']:checked");
            const shieldRemovedValue = shieldRemovedInput ? shieldRemovedInput.value : null;
            pushSection(key, shieldRemovedValue === "yes"
              ? App.t("session.export.heartWall.released")
              : App.t("session.export.heartWall.notReleased"));
            return;
          }
          case "heartShieldEmotions": {
            const el = document.getElementById("heartShieldEmotions");
            const v = (el ? el.value : "").trim();
            if (!heartShieldChecked || v.length === 0) return;
            pushSection(key, v);
            return;
          }
          case "trapped": {
            const v = ((document.getElementById("trappedEmotions") || {}).value || "").trim();
            if (v.length === 0) return;
            pushSection(key, v);
            return;
          }
          case "insights": {
            const v = (insightsInput ? insightsInput.value : "").trim();
            if (v.length === 0) return;
            pushSection(key, v);
            return;
          }
          case "limitingBeliefs": {
            const v = ((document.getElementById("limitingBeliefs") || {}).value || "").trim();
            if (v.length === 0) return;
            pushSection(key, v);
            return;
          }
          case "additionalTech": {
            const v = ((document.getElementById("additionalTech") || {}).value || "").trim();
            if (v.length === 0) return;
            pushSection(key, v);
            return;
          }
          case "comments": {
            const v = ((document.getElementById("sessionComments") || {}).value || "").trim();
            if (v.length === 0) return;
            pushSection(key, v);
            return;
          }
          case "nextSession": {
            // The per-section include-toggle gates BOTH note and date together.
            // The gate is note-OR-date so a date-only session still emits the
            // block, and the formatted date line (App.formatDate, honoring
            // portfolioDateFormat) renders beside the note (whichever is present).
            const summaryValue = (customerSummaryInput ? customerSummaryInput.value : "").trim();
            const nextDateRaw = document.getElementById("nextSessionDate")?.value || "";
            if (summaryValue.length === 0 && !nextDateRaw) return;
            const nextDateFormatted = nextDateRaw ? App.formatDate(nextDateRaw) : "";
            pushSection(key, [nextDateFormatted, summaryValue.length > 0 ? summaryValue : ""]);
            return;
          }
          default:
            return;
        }
      });

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
      const labels = orderedFormKeys().map(function (key) {
        return stripRequired(App.getSectionLabel(key, exportDefaultI18nKey(key)));
      });
      labels.push(App.t("session.copy.title"));
      return labels;
    }

    // The subset of the saved order whose section headings actually appear in
    // the exported body text, kept in saved order. A section-heading line is
    // `## <label>` where <label> is the same stripRequired(getSectionLabel(...))
    // string the builders emit; matching against the EDITED editor text (rather
    // than the build-time emission list) is what makes the severity-block slot
    // honour a manual heading deletion in Step 2. The severity slot itself never
    // emits a heading, so it is never in the returned set.
    function parsePresentSectionKeys(orderedKeys, markdown) {
      const headingTexts = {};
      const re = /^##[ \t]+(.+?)[ \t]*$/gm;
      let m;
      while ((m = re.exec(markdown)) !== null) {
        headingTexts[m[1].trim()] = true;
      }
      return orderedKeys.filter((key) => {
        const label = stripRequired(App.getSectionLabel(key, exportDefaultI18nKey(key)));
        return headingTexts[String(label).trim()] === true;
      });
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

    // Whether the end-of-session severity block (the two-bar before/after PDF
    // block) is included. Three gates, ALL required: the app-level severity
    // switch is on, Session topics is selected, and the dependent severity
    // sub-option is checked. When the switch is off, severity is suppressed even
    // for an old session whose stored ratings carry numbers. Outside a live
    // selection (dialog closed) the answer follows the switch and the
    // include-by-default posture, matching emotionsBlockIncluded's default.
    function severityTrackingEnabled() {
      return (typeof App.isSectionEnabled === "function") ? App.isSectionEnabled("afterSeverity") : true;
    }
    function severityBlockIncluded() {
      if (!severityTrackingEnabled()) return false;
      if (_exportState && Array.isArray(_exportState.selectedKeys)) {
        if (_exportState.selectedKeys.indexOf("issues") === -1) return false;
        // The dependent sub-option carries no markdown, so it can flip while
        // the dialog is open (Back → toggle → Continue) with the section
        // selection unchanged — a path that triggers no rebuild to re-capture
        // it. Prefer the live checkbox while it exists; fall back to the
        // captured snapshot only once the dialog DOM is gone.
        const subCb = document.getElementById("exportIncludeSeverity");
        if (subCb) return subCb.checked && !subCb.disabled;
        return _exportState.includeSeverity !== false;
      }
      return true;
    }

    function exportRenderStep1Rows(sessionData) {
      const container = document.getElementById("exportStep1Rows");
      if (!container) return;
      container.innerHTML = "";
      // The end-of-session severity item is an app-level switch (its Settings
      // enable toggle). When off, the dependent severity sub-option is not
      // offered at all — severity output is suppressed everywhere.
      const severityTrackingOn = (typeof App.isSectionEnabled === "function")
        ? App.isSectionEnabled("afterSeverity") : true;
      orderedFormKeys().forEach((key) => {
        // The end-of-session severity item is not a standalone export row — its
        // ratings are offered as a dependent sub-option beneath Session topics
        // (wired below), never as a sibling section.
        if (key === "afterSeverity") return;
        const enabled = App.isSectionEnabled(key);
        // The topics row is named identically to the in-session "Session topics"
        // title (so therapists recognise it); every other row keeps the
        // customizable section label.
        const label = (key === "issues")
          ? App.t("export.section.topics")
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

        // Session topics carries a dependent "Include severity before/after"
        // sub-option: an indented checkbox enabled only while topics is checked,
        // so selecting severity alone is impossible by construction. It is
        // offered only while end-of-session severity tracking is on. The
        // sub-option defaults checked when the session has issue data; toggling
        // topics off disables + unchecks it, and re-checking topics restores that
        // data-derived DEFAULT (never the last manual state). Nothing persists —
        // both reset on every export open.
        if (key === "issues" && severityTrackingOn) {
          const subDefault = hasData;
          const subRow = document.createElement("label");
          subRow.className = "export-section-row export-suboption-row";
          subRow.style.paddingInlineStart = "1.75rem";

          const subCb = document.createElement("input");
          subCb.type = "checkbox";
          subCb.id = "exportIncludeSeverity";
          subCb.checked = cb.checked && subDefault;
          subCb.disabled = !cb.checked;

          const subLabel = document.createElement("span");
          subLabel.className = "export-section-label";
          subLabel.textContent = App.t("export.suboption.includeSeverity");

          subRow.appendChild(subCb);
          subRow.appendChild(subLabel);
          container.appendChild(subRow);

          cb.addEventListener("change", () => {
            if (cb.checked) {
              subCb.disabled = false;
              subCb.checked = subDefault;
            } else {
              subCb.checked = false;
              subCb.disabled = true;
            }
          });
        }
      });
    }

    // Build the maximize/restore glyph with the DOM API (never innerHTML): two
    // diagonal double-headed arrows whose heads point OUTWARD to the corners
    // (maximize) or INWARD to the centre (restore) — the head reversal is what
    // tells the two states apart at a glance. Diagonal pairs mirror onto
    // themselves, so the glyph needs no RTL flip.
    function buildMaximizeIcon(isMax) {
      const SVG_NS = "http://www.w3.org/2000/svg";
      const el = document.createElementNS(SVG_NS, "svg");
      el.setAttribute("viewBox", "0 0 24 24");
      el.setAttribute("width", "18");
      el.setAttribute("height", "18");
      el.setAttribute("fill", "none");
      el.setAttribute("stroke", "currentColor");
      el.setAttribute("stroke-width", "2");
      el.setAttribute("stroke-linecap", "round");
      el.setAttribute("stroke-linejoin", "round");
      el.setAttribute("aria-hidden", "true");
      const polylines = isMax
        ? ["4 14 10 14 10 20", "20 10 14 10 14 4"]
        : ["15 3 21 3 21 9", "9 21 3 21 3 15"];
      polylines.forEach((pts) => {
        const p = document.createElementNS(SVG_NS, "polyline");
        p.setAttribute("points", pts);
        el.appendChild(p);
      });
      [["21", "3", "14", "10"], ["3", "21", "10", "14"]].forEach((c) => {
        const l = document.createElementNS(SVG_NS, "line");
        l.setAttribute("x1", c[0]);
        l.setAttribute("y1", c[1]);
        l.setAttribute("x2", c[2]);
        l.setAttribute("y2", c[3]);
        el.appendChild(l);
      });
      return el;
    }

    // Reflect the maximize toggle state onto the header button: the icon reverses
    // (arrows out ↔ arrows in) alongside the title/aria-label, set here from i18n
    // — an unchanged glyph would keep promising "maximize" while maximized.
    function updateMaximizeBtn(btn, isMax) {
      if (!btn) return;
      btn.setAttribute("aria-pressed", isMax ? "true" : "false");
      const titleKey = isMax ? "export.restore" : "export.maximize";
      const label = App.t(titleKey);
      btn.title = label;
      btn.setAttribute("aria-label", label);
      const oldIcon = btn.querySelector("svg");
      if (oldIcon) btn.removeChild(oldIcon);
      btn.appendChild(buildMaximizeIcon(isMax));
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
      // The end-of-session severity block is gated by severityBlockIncluded()
      // (switch on + topics selected + sub-option checked); when excluded,
      // forward an EMPTY issues array so the severity renderer early-returns and
      // the two-bar block is cleanly omitted.
      //
      // Unrated omission: keep only topics with at least one numeric rating
      // (before OR after is a Number). A fully-unrated topic (both sides
      // non-numeric) is dropped so it contributes no bar row; a partially-rated
      // topic keeps its row (one filled bar is real information). When zero
      // topics qualify the array is empty and the block is omitted via the same
      // empty-array early-return — no empty bars, no dash placeholder. The topic
      // NAME still exports under Session topics regardless of rating.
      let issues = (severityBlockIncluded() && typeof getIssuesPayload === "function")
        ? getIssuesPayload()
        : [];
      issues = issues.filter((it) => it && (typeof it.before === "number" || typeof it.after === "number"));
      const exportedOn = App.formatDate(window.DateFormat.todayLocalISO());

      // Tell the render tier WHERE the two-bar severity block sits: the ordinal
      // of the end-of-session-severity slot among the sections that ACTUALLY
      // appear in the body being exported, read in the therapist's saved order.
      // The PDF draws the block just before the (severityAfterSections + 1)-th
      // document heading it encounters, so moving severity in Settings moves the
      // block, and deleting a preceding heading in Step 2 moves it up one slot.
      // presentKeys is parsed from the edited editor text (not the build-time
      // emission list) so those manual Step-2 edits are honoured.
      let severityAfterSections = 0;
      try {
        const editorEl = document.getElementById("exportEditor");
        const md = editorEl ? editorEl.value : "";
        const orderedKeys = orderedFormKeys();
        const presentKeys = parsePresentSectionKeys(orderedKeys, md);
        severityAfterSections = deriveSeverityAfterSections(orderedKeys, presentKeys);
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
        // The dependent severity sub-option state, captured with the selection.
        // null until Step 1 is advanced — readers treat that as "no selection
        // yet" and fall back to the switch-driven default.
        includeSeverity: null,
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
      // previous export, preventing cross-open undo bleed. The always-visible
      // export bar then re-reads availability so its undo/redo dim matches the
      // now-empty history (no input event means no refresh fires on its own).
      if (editor && window.TextEdit && window.TextEdit.undoReset) window.TextEdit.undoReset(editor);
      if (editor && window.RichToolbar && window.RichToolbar.refreshButtonState) {
        window.RichToolbar.refreshButtonState(editor);
      }

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
      const onKey = (e) => {
        if (e.key !== "Escape") return;
        // While the shared confirm modal is open, Escape belongs to IT (its own
        // document-level handler cancels it). Starting the close flow here too
        // would open a second dialog on the same element and strand the first
        // one pending and invisible, its listeners still bound.
        const cm = document.getElementById("confirmModal");
        if (cm && !cm.classList.contains("is-hidden")) return;
        exportCloseDialog(false);
      };
      const onBack = () => {
        // Back is ALWAYS silent and non-destructive: the edited buffer (and its
        // undo stack) survives untouched. Any discard decision happens at the
        // moment a section checkbox is toggled, never on navigation. Leaving
        // the editor step does return an open preview to Edit, though — a
        // preview parked behind Step 1 keeps serving the document-level
        // Ctrl/Cmd+E shortcut against a hidden editor, and a later rebuild
        // would leave its render stale. resetPreview never forces focus.
        if (_exportState.currentStep === 2 &&
            window.RichToolbar && window.RichToolbar.resetPreview) {
          window.RichToolbar.resetPreview();
        }
        if (_exportState.currentStep > 1) exportSetActiveStep(_exportState.currentStep - 1);
      };
      // Read the CURRENT Step-1 selection from the live checkboxes.
      const collectSelectedKeys = () => {
        const checks = modal.querySelectorAll('#exportStep1Rows input[type="checkbox"]');
        const selected = [];
        // Only section rows carry data-section-key; the severity sub-option does
        // not, so it never enters the section-key selection (it is read
        // separately when the selection is captured).
        checks.forEach((cb) => { if (cb.checked && !cb.disabled && cb.dataset.sectionKey) selected.push(cb.dataset.sectionKey); });
        return selected;
      };
      // Rebuild the editor buffer from a selection: this is the ONE place the
      // selection, the generated baseline, the undo stack, and the dirty flag
      // move together, so the dialog state is always self-consistent.
      // Keeping the selection on the dialog state lets downstream assembly
      // (buildRenderInputs) and the copy builder gate the emotions before/after
      // block on the live choice. It dies with the dialog — the opt-out resets
      // on every export.
      const rebuildEditorFromSelection = (selected) => {
        // A rebuilt buffer must never sit behind a stale Frame: the direct
        // `.value =` below fires no input event, so an open preview would keep
        // rendering the PREVIOUS document while the buffer already holds the
        // new one. Return the surface to Edit first (the same call the close
        // path makes; it never forces focus).
        if (window.RichToolbar && window.RichToolbar.resetPreview) {
          window.RichToolbar.resetPreview();
        }
        _exportState.selectedKeys = selected;
        // Capture the dependent severity sub-option state alongside the section
        // selection so the PDF payload path reads one coherent snapshot.
        const subCb = document.getElementById("exportIncludeSeverity");
        _exportState.includeSeverity = subCb ? (subCb.checked && !subCb.disabled) : false;
        const md = buildFilteredSessionMarkdown(selected);
        if (editor) editor.value = md;
        _exportState.generatedMarkdown = md;
        // Direct `.value =` fires no input event; re-seed the undo baseline to
        // the generated markdown so the first undo removes the first real edit
        // rather than wiping the document back to empty.
        if (editor && window.TextEdit && window.TextEdit.undoReset) window.TextEdit.undoReset(editor);
        if (window.RichToolbar && window.RichToolbar.refreshButtonState) {
          window.RichToolbar.refreshButtonState(editor);
        }
        _exportState.hasEditedPreview = false;
      };
      const onNext = async () => {
        if (_exportState.currentStep === 1) {
          // Continue is SILENT. With the selection unchanged from the one that
          // generated (or last rebuilt) the buffer, land on Step 2 with edits and
          // undo stack intact — no dialog, no regeneration. A changed selection
          // can only be reached with a CLEAN buffer here (a toggle while dirty
          // either reverted or already rebuilt via the section-change guard), so
          // regenerating silently never destroys an edit.
          const selected = collectSelectedKeys();
          const unchanged = _exportState.selectedKeys !== null &&
            JSON.stringify(selected) === JSON.stringify(_exportState.selectedKeys);
          if (!unchanged) rebuildEditorFromSelection(selected);
          // The severity sub-option carries no markdown, so it can be toggled
          // (Back → change → Continue) with the section selection unchanged,
          // taking the no-rebuild path above. Re-capture it here so the payload
          // snapshot never trails the live checkbox.
          const subCb = document.getElementById("exportIncludeSeverity");
          if (subCb) _exportState.includeSeverity = subCb.checked && !subCb.disabled;
          exportSetActiveStep(2);
        } else if (_exportState.currentStep === 2) {
          exportSetActiveStep(3);
        } else {
          exportCloseDialog(true);
        }
      };
      // The discard decision lives at the SELECTION-CHANGE moment: toggling a
      // section while the buffer carries user edits asks first. Cancel reverts
      // the checkbox (edits and selection stay consistent, navigation stays
      // free); confirm rebuilds the buffer from the new selection right here, so
      // the state is truthful from that moment on and later toggles are
      // clean-path. Clean-buffer toggles are silent — Continue regenerates.
      const onSectionToggle = async (e) => {
        const cb = e && e.target;
        if (!cb || cb.type !== "checkbox" || !cb.dataset.sectionKey) return;
        if (!_exportState || !_exportState.hasEditedPreview) return;
        const ok = await App.confirmDialog({
          titleKey: "export.discard.title",
          messageKey: "export.discard.bodySections",
          confirmKey: "export.discard.yes",
          cancelKey: "export.discard.no"
        });
        // The dialog is async: the export dialog can be torn down while it
        // sits open. With no state left there is nothing to revert or rebuild
        // against — stand down.
        if (!_exportState) return;
        if (!ok) {
          // Programmatic revert fires no change event, so this cannot loop.
          cb.checked = !cb.checked;
          return;
        }
        rebuildEditorFromSelection(collectSelectedKeys());
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
      // Delegated on the rows container (rows are re-rendered on every open).
      const step1Rows = document.getElementById("exportStep1Rows");
      if (step1Rows) step1Rows.addEventListener("change", onSectionToggle);
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
        if (step1Rows) step1Rows.removeEventListener("change", onSectionToggle);
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
    window.__exportModalTestHooks.deriveSeverityAfterSections = deriveSeverityAfterSections;
  }
})();
