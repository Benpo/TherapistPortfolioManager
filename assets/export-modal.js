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
          const el = document.getElementById("customerSummary");
          return !!(el && el.value && el.value.trim().length > 0);
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

      // Issues section: always included, change shown when both before and after
      // exist. Scale labels are i18n'd ("Before/After/Change", etc.); "Change"
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
      // it with every other section's structure.
      if (heartShieldChecked) {
        lines.push(
          "",
          `## ${stripRequired(App.getSectionLabel("heartShield", "session.form.heartShield"))}`,
          shieldRemovedCopyValue === "yes"
            ? App.t("session.form.shieldRemoved.yes")
            : App.t("session.form.shieldRemoved.no")
        );
      }

      lines.push(
        "",
        `## ${stripRequired(App.getSectionLabel("issues", "session.form.issuesHeading"))}`,
        issuesText
      );

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
      if (summaryValue.length > 0) {
        lines.push("", `## ${stripRequired(App.getSectionLabel("nextSession", "session.form.nextSession"))}`, summaryValue);
      }

      return lines.join("\n");
    }

    // ============================================================
    // Export modal
    // 3-step flow: Step 1 selection -> Step 2 edit/preview -> Step 3 outputs
    // ============================================================
    const EXPORT_DEFAULT_CHECKED = {
      trapped: true,
      insights: true,
      limitingBeliefs: true,
      additionalTech: true,
      heartShieldEmotions: true, // only if data present (re-checked at render)
      nextSession: true,
      issues: false,
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
      // it with every other section's structure. (Same change as
      // buildSessionMarkdown.)
      if (heartShieldChecked && selected.has("heartShield")) {
        lines.push(
          "",
          `## ${stripRequired(App.getSectionLabel("heartShield", "session.form.heartShield"))}`,
          shieldRemovedValue === "yes"
            ? App.t("session.form.shieldRemoved.yes")
            : App.t("session.form.shieldRemoved.no")
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
      if (selected.has("nextSession") && summaryValue.length > 0) {
        lines.push("", `## ${stripRequired(App.getSectionLabel("nextSession", "session.form.nextSession"))}`, summaryValue);
      }

      return lines.join("\n");
    }

    let _exportState = null;

    function exportRenderStep1Rows(sessionData) {
      const container = document.getElementById("exportStep1Rows");
      if (!container) return;
      container.innerHTML = "";
      EXPORT_SECTION_ORDER.forEach((key) => {
        const enabled = App.isSectionEnabled(key);
        const label = App.getSectionLabel(key, exportDefaultI18nKey(key));
        const hasData = sectionHasData(key);
        let defaultChecked = !!EXPORT_DEFAULT_CHECKED[key];
        if (key === "heartShieldEmotions") defaultChecked = defaultChecked && hasData;

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

    function exportSetActiveStep(n) {
      const modal = document.getElementById("exportModal");
      if (!modal) return;
      _exportState.currentStep = n;

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

    function exportUpdatePreview() {
      const editor = document.getElementById("exportEditor");
      const preview = document.getElementById("exportPreview");
      if (!editor || !preview) return;
      if (window.MdRender && typeof window.MdRender.render === "function") {
        // MdRender.render escapes HTML before structural rules — safe to assign.
        preview.innerHTML = window.MdRender.render(editor.value);
      } else {
        preview.textContent = editor.value;
      }
    }

    function exportApplyMobileTabs() {
      const modal = document.getElementById("exportModal");
      if (!modal) return;
      const tabs = modal.querySelector(".export-mobile-tabs");
      const editor = document.getElementById("exportEditor");
      const preview = document.getElementById("exportPreview");
      const isMobile = window.matchMedia("(max-width: 768px)").matches;
      if (!tabs) return;
      tabs.classList.toggle("is-hidden", !isMobile);
      if (!isMobile) {
        // Desktop: both visible side-by-side
        if (editor) editor.classList.remove("is-hidden");
        if (preview) preview.classList.remove("is-hidden");
        return;
      }
      // Mobile: respect active tab (default to edit)
      const activeTab = tabs.querySelector(".tab-btn.is-active");
      const which = activeTab ? activeTab.dataset.tab : "edit";
      if (editor) editor.classList.toggle("is-hidden", which !== "edit");
      if (preview) preview.classList.toggle("is-hidden", which !== "preview");
    }

    function exportWireMobileTabs() {
      const modal = document.getElementById("exportModal");
      if (!modal) return;
      const tabs = modal.querySelectorAll(".export-mobile-tabs .tab-btn");
      tabs.forEach((btn) => {
        btn.addEventListener("click", () => {
          modal.querySelectorAll(".export-mobile-tabs .tab-btn").forEach((b) => b.classList.remove("is-active"));
          btn.classList.add("is-active");
          exportApplyMobileTabs();
        });
      });
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
    //   • exportedOn — today's date, localized via App.formatDate, distinct from
    //     the card's session date.
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
      const issues = (typeof getIssuesPayload === "function") ? getIssuesPayload() : [];
      const exportedOn = App.formatDate(new Date());

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
          sessionDate: data.sessionDateFormatted,
          sessionType: data.sessionTypeLabel,
          markdown: editor ? editor.value : "",
          sessionNumber: renderInputs.sessionNumber,
          issues: renderInputs.issues,
          exportedOn: renderInputs.exportedOn,
          severityAfterSections: renderInputs.severityAfterSections
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
          sessionDate: data.sessionDateFormatted,
          sessionType: data.sessionTypeLabel,
          markdown: editor.value,
          sessionNumber: renderInputs.sessionNumber,
          issues: renderInputs.issues,
          exportedOn: renderInputs.exportedOn,
          severityAfterSections: renderInputs.severityAfterSections
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
        cleanup: null
      };

      exportRenderStep1Rows(sessionData);
      exportSetActiveStep(1);

      const editor = document.getElementById("exportEditor");
      const preview = document.getElementById("exportPreview");
      // Defensively bind the export editor for snippet expansion. The static
      // editor already carries data-snippets="true" (bound by Snippets.init()
      // at DOMContentLoaded), but this idempotent call (guarded by Snippets'
      // internal _bound WeakMap) guarantees binding even if the modal markup
      // is ever re-rendered.
      if (window.Snippets && editor) window.Snippets.bindTextarea(editor);
      if (editor) editor.value = "";
      if (preview) preview.innerHTML = "";

      modal.classList.remove("is-hidden");
      App.lockBodyScroll();
      App.applyTranslations(modal);
      exportApplyMobileTabs();

      // Wire events for the lifetime of this dialog. Track listeners so we can detach.
      const closeBtn = document.getElementById("exportClose");
      const overlay = modal.querySelector(".modal-overlay");
      const backBtn = document.getElementById("exportBackBtn");
      const nextBtn = document.getElementById("exportNextBtn");
      const downloadPdfBtn = document.getElementById("exportDownloadPdf");
      const downloadMdBtn = document.getElementById("exportDownloadMd");
      const shareBtn = document.getElementById("exportShare");

      const onClose = () => exportCloseDialog(false);
      const onOverlay = () => exportCloseDialog(false);
      const onKey = (e) => { if (e.key === "Escape") exportCloseDialog(false); };
      const onBack = () => {
        if (_exportState.currentStep > 1) exportSetActiveStep(_exportState.currentStep - 1);
      };
      const onNext = () => {
        if (_exportState.currentStep === 1) {
          // Collect selected sections, build initial markdown, populate editor.
          const checks = modal.querySelectorAll('#exportStep1Rows input[type="checkbox"]');
          const selected = [];
          checks.forEach((cb) => { if (cb.checked && !cb.disabled) selected.push(cb.dataset.sectionKey); });
          const md = buildFilteredSessionMarkdown(selected);
          if (editor) editor.value = md;
          _exportState.hasEditedPreview = false;
          exportSetActiveStep(2);
          exportApplyMobileTabs();
          exportUpdatePreview();
        } else if (_exportState.currentStep === 2) {
          exportSetActiveStep(3);
        } else {
          exportCloseDialog(true);
        }
      };
      const onEditorInput = () => {
        _exportState.hasEditedPreview = true;
        exportUpdatePreview();
      };
      const onResize = () => exportApplyMobileTabs();
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
      window.addEventListener("resize", onResize);
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
        window.removeEventListener("resize", onResize);
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
