/**
 * tour.js — the bespoke replayable guided-tour engine (Phase 41, Plan 03;
 * TOUR-01 / TOUR-02 / TOUR-03). window.Tour.
 *
 * WHY THIS EXISTS
 *   The tour walks a therapist through the v3 settings-first spine (12 steps across
 *   index / settings / add-session / sessions) as a spotlight + tethered tooltip:
 *   first make the app yours (the Settings chapter — personalize / fields /
 *   snippets), then walk the path a session travels. A step MAY declare an
 *   `activate` selector — a settings tab button the engine clicks on step entry
 *   (read-only view switch) to un-hide the panel its anchor lives on before the
 *   anchor is measured (honest deixis). It runs ONLY on an explicit start() (no
 *   auto-run — TOUR-01), it
 *   NEVER silently skips a step whose anchor is missing (it degrades to a
 *   centered fallback modal that names where the thing lives and offers a
 *   working "Take me there" link — TOUR-02), and it carries a single run across
 *   page navigations via a sessionStorage resume tier, always restarting from
 *   step 1 on a fresh launch (TOUR-03 / D-09). Render loop ported from the
 *   validated sketch .planning/sketches/003-tour-fallback/index.html, adapted to
 *   the cross-page route. Plan 04 adds: mid-tour LANGUAGE re-render on the
 *   document 'app:language' event (cleanup-then-replace, subscribed once —
 *   TOUR-04); a concise two-option EXIT CHOICE on Close (D-08); the FINISH card
 *   with the help-center handoff (D-10); and a small-screen BOTTOM-SHEET branch
 *   (D-05). Launch-surface + coordinator wiring arrive in Plan 05.
 *
 * PUBLIC SURFACE (one namespaced global, mirroring assets/attention-coordinator.js):
 *   window.Tour = { start, resume, isActive, next, prev, ...seams }
 *     start()  — PAGE-AWARE explicit launch. On step-1's page it renders in
 *                place; off it, it persists sg.tourResume {stepIndex:0} and
 *                navigates to STEPS[0].page so resume() renders step 1 there
 *                (a launch from any page reaches step 1's SPOTLIGHT, never a
 *                fallback — D-02 / architect-gate A2).
 *     resume() — read-and-continue from sg.tourResume when it matches the
 *                current page; otherwise no-op (fresh launch → start() at step 1).
 *     next()/prev() — advance/retreat; a page-crossing next() persists resume
 *                then navigates (D-06).
 *     isActive() — is a run currently mounted on this page.
 *   Injectable seams (exposed for jsdom tests / recovery; `_`-prefixed):
 *     _isAnchorVisible(el) — default el && el.offsetParent !== null (A5). render()
 *                calls THIS seam, never an inline offsetParent check, so tests can
 *                force both branches (jsdom hardcodes offsetParent === null).
 *     _navigate(href), _currentPage(), _render(), _endTour(),
 *     _getSteps(), _getStepIndex(), _setStepIndex(i).
 *
 * STORAGE
 *   sessionStorage 'sg.tourResume' — JSON {tourId, stepIndex}; the ONLY resume
 *                tier (D-09 / Pitfall 6). Cleared on finish and on mid-tour close.
 *   localStorage 'sg.tourCompleted'  — set when the finish card mounts (D-10).
 *   localStorage 'sg.tourRemindLater' — set by the exit choice "Remind me later".
 *   localStorage 'sg.tourNeverRemind' — set by the exit choice "I'll explore myself".
 *                These three sg.tour* flags are the decoupling seam the Plan 05
 *                coordinator reminder reads; they are tour-scoped and share NO key
 *                with the security-note cadence-backoff todo (D-08 constraint).
 *
 * INERTNESS WITHOUT SCROLL FREEZE (architect-gate A4)
 *   A full-viewport fixed overlay intercepts pointer events so the underlying
 *   page is inert (D-07). The engine does NOT call App.lockBodyScroll for
 *   spotlight steps — its .is-modal-open position:fixed would freeze the viewport
 *   and defeat scrollIntoView for below-the-fold anchors (steps 5-6). Scroll
 *   stays free: the engine scrollIntoView's each anchor then repositions
 *   spotlight+tooltip on scroll/resize (rAF-debounced). App.lockBodyScroll is
 *   reused ONLY for the centered fallback modal (no anchor to track).
 *
 * POSITIONING (physical coordinates — Plan 08 / UAT gaps 2-4)
 *   positionSpotlight writes PHYSICAL top/left/width/height from
 *   getBoundingClientRect (which is itself physical), so the ring/tooltip are
 *   direction-neutral and never mirror in RTL. On first mount the chrome is given
 *   the .sg-tour-instant class so it SNAPS onto the anchor (no grow-from-corner),
 *   then re-measures one rAF after scrollIntoView settles and restores the smooth
 *   transition for later scroll/resize reflows.
 *
 * TRUST BOUNDARY (T-41-01 / V5)
 *   All tour copy is injected via textContent — never assigned as raw markup.
 *   The save step renders ONE compile-time-literal export glyph as raw markup (a
 *   static SVG string, ZERO interpolation — same rule as the app.js "?" glyph);
 *   that is the only raw-markup assignment, and all other copy stays textContent.
 *
 * Zero dependencies, zero network. Modern evergreen baseline, no legacy shims (D-15).
 */
var Tour = (function () {
  'use strict';

  var TOUR_ID = 'main';
  var RESUME_KEY = 'sg.tourResume';

  // ── storage helpers (private-mode / quota safe — attention-coordinator idiom) ─
  function lsGet(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { window.localStorage.setItem(k, v); } catch (e) {} }
  function ssGet(k) { try { return window.sessionStorage.getItem(k); } catch (e) { return null; } }
  function ssSet(k, v) { try { window.sessionStorage.setItem(k, v); } catch (e) {} }
  function ssRemove(k) { try { window.sessionStorage.removeItem(k); } catch (e) {} }

  // ── i18n resolution for dynamically-mounted nodes (coordinator idiom) ─────────
  // The tour mounts chrome AFTER applyTranslations() walked the static DOM, so it
  // resolves copy itself, and stamps data-i18n so a later language switch (Plan 04)
  // can re-translate through the shared App pipeline.
  function t(key) {
    try {
      var lang = lsGet('portfolioLang') || window.I18N_DEFAULT || 'en';
      var dict = (window.I18N && (window.I18N[lang] || window.I18N.en)) || {};
      return (dict[key] != null) ? dict[key] : key;
    } catch (e) { return key; }
  }

  // ── the declarative 12-step v3 settings-first route (Pattern 1) ───────────────
  // Each entry: { id, page, anchor, i18nKey, screenName, takeMeThereHref, activate? }.
  // The anchor values match the 41-09 data-tour v3 contract exactly; i18nKey resolves
  // <key>.title / <key>.body against the 41-11 help.tour.step.* keys. A step MAY
  // declare an `activate` selector — a settings tab button the engine clicks on step
  // entry (read-only view switch) to un-hide the panel the anchor lives on BEFORE the
  // anchor is measured (honest deixis, steps 3-5). The render loop never changes when
  // steps are added/reordered. Spine (v3 §3): overview → settings → personalize →
  // fields → snippets → nav → session-setup → session-heart → session-save →
  // nav-sessions → backup → help. No Reporting step (named in the finish copy instead).
  var STEPS = [
    { id: 'overview',      page: 'index.html',       anchor: '[data-tour="overview"]',      i18nKey: 'help.tour.step.overview',     screenName: 'Overview',   takeMeThereHref: './index.html' },
    { id: 'settings',      page: 'index.html',       anchor: '[data-tour="settings"]',      i18nKey: 'help.tour.step.settings',     screenName: 'Overview',   takeMeThereHref: './index.html' },
    { id: 'personalize',   page: 'settings.html',    anchor: '[data-tour="personalize"]',   i18nKey: 'help.tour.step.personalize',  screenName: 'Settings',   takeMeThereHref: './settings.html',    activate: '#settingsTabPersonalizeBtn' },
    { id: 'fields',        page: 'settings.html',    anchor: '[data-tour="fields"]',        i18nKey: 'help.tour.step.fields',       screenName: 'Settings',   takeMeThereHref: './settings.html',    activate: '#settingsTabFieldsBtn' },
    { id: 'snippets',      page: 'settings.html',    anchor: '[data-tour="snippets"]',      i18nKey: 'help.tour.step.snippets',     screenName: 'Settings',   takeMeThereHref: './settings.html',    activate: '#settingsTabSnippetsBtn' },
    { id: 'nav',           page: 'settings.html',    anchor: '[data-tour="nav"]',           i18nKey: 'help.tour.step.ready',        screenName: 'Settings',   takeMeThereHref: './settings.html' },
    { id: 'session-setup', page: 'add-session.html', anchor: '[data-tour="session-setup"]', i18nKey: 'help.tour.step.setup',         screenName: 'Session',    takeMeThereHref: './add-session.html' },
    { id: 'session-heart', page: 'add-session.html', anchor: '[data-tour="session-heart"]', i18nKey: 'help.tour.step.heart',         screenName: 'Session',    takeMeThereHref: './add-session.html' },
    { id: 'session-save',  page: 'add-session.html', anchor: '[data-tour="session-save"]',  i18nKey: 'help.tour.step.save',          screenName: 'Session',    takeMeThereHref: './add-session.html' },
    { id: 'nav-sessions',  page: 'sessions.html',    anchor: '[data-tour="nav-sessions"]',  i18nKey: 'help.tour.step.sessions',     screenName: 'Sessions',   takeMeThereHref: './sessions.html' },
    { id: 'backup',        page: 'sessions.html',    anchor: '[data-tour="backup"]',        i18nKey: 'help.tour.step.backup',       screenName: 'Sessions',   takeMeThereHref: './sessions.html' },
    { id: 'help',          page: 'sessions.html',    anchor: '[data-tour="help"]',          i18nKey: 'help.tour.step.help',         screenName: 'Sessions',   takeMeThereHref: './sessions.html' }
  ];

  // ── run state ─────────────────────────────────────────────────────────────────
  var stepIndex = 0;
  var active = false;
  var root = null;          // the mounted .sg-tour-root container (or null)
  var spotlightEl = null;   // the spotlight ring (spotlight branch only)
  var tooltipEl = null;     // the tethered tooltip (spotlight branch only)
  var currentEl = null;     // the anchor currently spotlit (for reposition)
  var reflowRAF = 0;
  var reflowHandler = null; // scroll/resize reposition listener (spotlight only)
  var fallbackLocked = false; // did we App.lockBodyScroll for a fallback modal?
  var _langListenerInstalled = false; // once-only guard for the app:language listener (D-08/TOUR-04)

  // ── D-05 bottom-sheet breakpoint ──────────────────────────────────────────────
  // Below this viewport width the tooltip becomes a bottom-pinned sheet: no
  // tooltip-collision math on cramped screens (the spotlight still tracks the
  // anchor). CSS pins it via inset-inline:0 (see tour.css @media ≤640px).
  var BOTTOM_SHEET_MAX = 640;
  function isBottomSheet() {
    try { return (window.innerWidth || Infinity) <= BOTTOM_SHEET_MAX; } catch (e) { return false; }
  }

  var raf = (typeof window !== 'undefined' && window.requestAnimationFrame)
    ? function (cb) { return window.requestAnimationFrame(cb); }
    : function (cb) { return setTimeout(cb, 0); };

  // ── DOM helper — textContent only (never raw markup: XSS trust boundary) ──────
  function makeEl(tag, cls, key) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    if (key != null) { el.setAttribute('data-i18n', key); el.textContent = t(key); }
    return el;
  }

  function counterText(idx, total) {
    return t('help.tour.counter').replace('{n}', idx + 1).replace('{total}', total);
  }

  // Build the Close / Previous / Next(Done) control row (shared by both branches).
  function buildRow(isFinal) {
    var row = document.createElement('div');
    row.className = 'sg-tour-row';

    var closeBtn = makeEl('button', 'sg-tour-btn sg-tour-btn-close', 'help.tour.close');
    closeBtn.setAttribute('type', 'button');
    // D-08: closing mid-tour ends the run (clears resume, inactive) then offers a
    // concise two-option exit choice for what happens next session.
    closeBtn.onclick = function () { openExitChoice(); };

    var backBtn = makeEl('button', 'sg-tour-btn sg-tour-btn-neutral', 'help.tour.back');
    backBtn.setAttribute('type', 'button');
    backBtn.disabled = stepIndex === 0;
    backBtn.onclick = function () { if (stepIndex > 0) prev(); };

    var fwdBtn = makeEl('button', 'sg-tour-btn sg-tour-btn-fwd', isFinal ? 'help.tour.done' : 'help.tour.next');
    fwdBtn.setAttribute('type', 'button');
    // D-10: the last step's forward action mounts the finish card (help-center
    // handoff + first-action buttons) instead of a bare endTour().
    fwdBtn.onclick = function () { if (isFinal) mountFinish(); else next(); };

    row.appendChild(closeBtn);
    row.appendChild(backBtn);
    row.appendChild(fwdBtn);
    return row;
  }

  // ── reposition (spotlight branch only) — rAF-debounced on scroll + resize ─────
  function positionSpotlight(el) {
    if (!spotlightEl || !el) return;
    var r = el.getBoundingClientRect();
    var pad = 8;
    // PHYSICAL coordinates (gap-4 fix): getBoundingClientRect returns physical
    // viewport coords (r.left = distance from the viewport's LEFT edge, in every
    // direction). Writing them into LOGICAL inset props (inset-inline-start) made
    // RTL resolve r.left against the RIGHT edge, mirroring every off-center anchor.
    // Writing physical top/left is direction-neutral and cannot mirror.
    spotlightEl.style.top = (r.top - pad) + 'px';
    spotlightEl.style.left = (r.left - pad) + 'px';
    spotlightEl.style.width = (r.width + pad * 2) + 'px';
    spotlightEl.style.height = (r.height + pad * 2) + 'px';

    if (!tooltipEl) return;
    // D-05 bottom-sheet: the tooltip is CSS-pinned to the viewport bottom — skip
    // all tooltip-collision math (the spotlight above still tracks the anchor).
    if (tooltipEl.classList.contains('sg-tour-bottom-sheet')) return;
    var below = (window.innerHeight - r.bottom) > 220;
    tooltipEl.setAttribute('data-arrow', below ? 'top' : 'bottom');
    var tw = tooltipEl.offsetWidth || 0;
    var th = tooltipEl.offsetHeight || 0;
    var top = below ? (r.bottom + 14) : (r.top - th - 14);
    var anchorCenter = r.left + r.width / 2;
    var left = Math.max(12, Math.min(anchorCenter - tw / 2, window.innerWidth - tw - 12));
    // Physical top/left (matches tour.css, which now positions on physical axes).
    tooltipEl.style.top = top + 'px';
    tooltipEl.style.left = left + 'px';
    // --arrow-x is a physical offset from the tooltip's LEFT edge; tour.css consumes
    // it as physical `left: var(--arrow-x)`, so the arrow tracks the anchor without
    // re-mirroring in RTL (the two must agree — D-04).
    tooltipEl.style.setProperty('--arrow-x', Math.max(14, Math.min(anchorCenter - left - 7, tw - 28)) + 'px');
  }

  function onReflow() {
    if (reflowRAF) return;
    reflowRAF = raf(function () {
      reflowRAF = 0;
      if (active && currentEl) positionSpotlight(currentEl);
    });
  }

  function installReflow() {
    if (reflowHandler) return;
    reflowHandler = onReflow;
    try {
      window.addEventListener('scroll', reflowHandler, true);
      window.addEventListener('resize', reflowHandler);
    } catch (e) {}
  }

  function removeReflow() {
    if (!reflowHandler) return;
    try {
      window.removeEventListener('scroll', reflowHandler, true);
      window.removeEventListener('resize', reflowHandler);
    } catch (e) {}
    reflowHandler = null;
  }

  // ── teardown of any mounted chrome (cleanup-then-replace) ─────────────────────
  function clearTourChrome() {
    removeReflow();
    if (fallbackLocked) {
      try { if (window.App && window.App.unlockBodyScroll) window.App.unlockBodyScroll(); } catch (e) {}
      fallbackLocked = false;
    }
    if (root && root.parentNode) root.parentNode.removeChild(root);
    root = null;
    spotlightEl = null;
    tooltipEl = null;
    currentEl = null;
  }

  // ── render the current step: spotlight (anchor visible) OR fallback modal ─────
  function render() {
    clearTourChrome();
    active = true;

    var step = STEPS[stepIndex];
    var total = STEPS.length;
    var isFinal = stepIndex === total - 1;

    root = document.createElement('div');
    root.className = 'sg-tour-root';
    root.setAttribute('data-tour-chrome', '');

    // A4: a full-viewport pointer-events overlay makes the underlying page inert
    // (D-07) WITHOUT freezing scroll. The spotlight is pointer-events:none above it.
    var overlay = document.createElement('div');
    overlay.className = 'sg-tour-overlay';
    overlay.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); });
    root.appendChild(overlay);

    // Per-step tab activation (v3 §5): a step may declare an `activate` selector —
    // a settings tab button the engine clicks on entry to un-hide the panel its
    // anchor lives on BEFORE the anchor is measured (honest deixis, steps 3-5). A
    // missing button is a guarded no-op, so the degradation branch below (anchor
    // missing/hidden → centered fallback modal) is unchanged. The click is
    // idempotent when the tab is already active (defensive on a resume/replay).
    if (step.activate) {
      var tab = document.querySelector(step.activate);
      if (tab && typeof tab.click === 'function') tab.click();
    }

    var el = document.querySelector(step.anchor);
    // A5: branch selection goes through the injectable seam, never inline offsetParent.
    var visible = api._isAnchorVisible(el);

    if (visible) {
      renderSpotlight(step, el, isFinal, total);
    } else {
      renderFallback(step, isFinal, total);
    }

    document.body.appendChild(root);
  }

  function renderSpotlight(step, el, isFinal, total) {
    currentEl = el;

    spotlightEl = document.createElement('div');
    spotlightEl.className = 'sg-tour-spotlight';
    spotlightEl.setAttribute('aria-hidden', 'true');
    root.appendChild(spotlightEl);

    tooltipEl = document.createElement('div');
    tooltipEl.className = 'sg-tour-tooltip';
    tooltipEl.setAttribute('role', 'dialog');
    tooltipEl.setAttribute('aria-modal', 'false');
    tooltipEl.setAttribute('data-arrow', 'top');

    // D-05: on a cramped viewport, become a bottom-pinned sheet (no arrow, no
    // collision math). Evaluated at render time; the spotlight still highlights.
    if (isBottomSheet()) {
      tooltipEl.classList.add('sg-tour-bottom-sheet');
      tooltipEl.setAttribute('data-arrow', 'none');
    }

    var arrow = document.createElement('span');
    arrow.className = 'sg-tour-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    tooltipEl.appendChild(arrow);

    var counter = document.createElement('p');
    counter.className = 'sg-tour-counter';
    counter.textContent = counterText(stepIndex, total);
    tooltipEl.appendChild(counter);

    tooltipEl.appendChild(makeEl('h3', 'sg-tour-title', step.i18nKey + '.title'));
    tooltipEl.appendChild(makeEl('p', 'sg-tour-body', step.i18nKey + '.body'));

    // Save-step honest deixis (UAT gap 5): the copy says "this is its icon", so the
    // export glyph must be literally IN the tooltip. This is the ONE sanctioned
    // raw-markup assignment in tour.js — a compile-time string literal with ZERO
    // interpolation (same trust-boundary rule as the app.js "?" glyph, T-41-01).
    // stroke=currentColor inherits the tooltip text color (no literal hex;
    // RTL-neutral). Gated to the save step only; every other string stays textContent.
    if (step.id === 'session-save') {
      var glyph = document.createElement('span');
      glyph.className = 'sg-tour-glyph';
      glyph.setAttribute('aria-hidden', 'true');
      glyph.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"></path><path d="M16 6l-4-4-4 4"></path><path d="M12 2v14"></path></svg>';
      tooltipEl.appendChild(glyph);
    }

    tooltipEl.appendChild(buildRow(isFinal));

    root.appendChild(tooltipEl);

    // First-paint SNAP (gaps 2 + 3): suppress the freshly-mounted ring/tooltip's
    // transition so they land ON the anchor instead of animating up from their 0×0
    // mount base (the "grow-from-the-corner" offset). Restore the transition one rAF
    // later so subsequent scroll/resize reflows still glide smoothly.
    spotlightEl.classList.add('sg-tour-instant');
    tooltipEl.classList.add('sg-tour-instant');

    // Bring below-the-fold anchors into view, then position + track (A4). Scroll
    // stays free (NO App.lockBodyScroll on the spotlight path).
    try { if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'center', inline: 'nearest' }); } catch (e) {}
    positionSpotlight(el);
    installReflow();

    // Re-measure once the scroll has SETTLED (gap 2): scrollIntoView above hasn't
    // committed its new scroll offset yet when the first positionSpotlight runs, so
    // the ring would sit at the pre-scroll offset. One rAF later, re-measure against
    // the settled layout, then drop the instant class so later reflows animate.
    raf(function () {
      if (!active || currentEl !== el) return;
      positionSpotlight(el);
      if (spotlightEl) spotlightEl.classList.remove('sg-tour-instant');
      if (tooltipEl) tooltipEl.classList.remove('sg-tour-instant');
    });
  }

  function renderFallback(step, isFinal, total) {
    // Centered modal — NEVER blank, NEVER a silent skip (TOUR-02). No anchor to
    // track, so App.lockBodyScroll MAY be reused here (A4) — freezing is harmless.
    var scrim = document.createElement('div');
    scrim.className = 'sg-tour-modal-scrim';

    var card = document.createElement('div');
    card.className = 'sg-tour-tooltip sg-tour-fallback-card';
    card.setAttribute('role', 'dialog');
    card.setAttribute('data-arrow', 'none');

    var counter = document.createElement('p');
    counter.className = 'sg-tour-counter';
    counter.textContent = counterText(stepIndex, total);
    card.appendChild(counter);

    card.appendChild(makeEl('h3', 'sg-tour-title', step.i18nKey + '.title'));
    card.appendChild(makeEl('p', 'sg-tour-body', step.i18nKey + '.body'));

    // "This is on the {screen} screen." — names where it lives (soft landing).
    var loc = document.createElement('p');
    loc.className = 'sg-tour-fallback-loc';
    loc.textContent = t('help.tour.fallbackBody').replace('{screen}', step.screenName);
    card.appendChild(loc);

    // Working "Take me there" — A3: persist sg.tourResume {current stepIndex}
    // BEFORE navigating, so resume() re-renders the SAME step on the target page
    // (anchor present there → spotlight). Never navigate without persisting.
    var takeMe = makeEl('a', 'sg-tour-takeme', 'help.tour.takeMeThere');
    takeMe.setAttribute('href', step.takeMeThereHref);
    takeMe.onclick = function (e) {
      if (e && e.preventDefault) e.preventDefault();
      ssSet(RESUME_KEY, JSON.stringify({ tourId: TOUR_ID, stepIndex: stepIndex }));
      api._navigate(step.takeMeThereHref);
    };
    card.appendChild(takeMe);

    card.appendChild(buildRow(isFinal));

    scrim.appendChild(card);
    root.appendChild(scrim);

    try {
      if (window.App && window.App.lockBodyScroll) { window.App.lockBodyScroll(); fallbackLocked = true; }
    } catch (e) {}
  }

  // ── navigation-aware advance / retreat ────────────────────────────────────────
  function next() {
    var nextIndex = stepIndex + 1;
    if (nextIndex >= STEPS.length) { endTour(); return; }
    var nextStep = STEPS[nextIndex];
    if (nextStep.page !== api._currentPage()) {
      // Cross-page: persist resume then navigate; resume() continues on arrival.
      ssSet(RESUME_KEY, JSON.stringify({ tourId: TOUR_ID, stepIndex: nextIndex }));
      api._navigate(nextStep.takeMeThereHref);
      return;
    }
    stepIndex = nextIndex;
    render();
  }

  function prev() {
    if (stepIndex <= 0) return;
    var prevStep = STEPS[stepIndex - 1];
    if (prevStep.page !== api._currentPage()) {
      // Cross-page back-step mirrors next(): persist + navigate.
      stepIndex = stepIndex - 1;
      ssSet(RESUME_KEY, JSON.stringify({ tourId: TOUR_ID, stepIndex: stepIndex }));
      api._navigate(prevStep.takeMeThereHref);
      return;
    }
    stepIndex = stepIndex - 1;
    render();
  }

  // ── explicit, page-aware launch (A2) ──────────────────────────────────────────
  function start() {
    stepIndex = 0;
    if (STEPS[0].page !== api._currentPage()) {
      // Off step-1's page: persist resume {stepIndex:0} then navigate so resume()
      // renders step 1's SPOTLIGHT on arrival (never a fallback drop — D-02).
      ssSet(RESUME_KEY, JSON.stringify({ tourId: TOUR_ID, stepIndex: 0 }));
      api._navigate(STEPS[0].takeMeThereHref);
      return;
    }
    render();
  }

  // ── read-and-continue resume (single tier: sessionStorage) ────────────────────
  function resume() {
    var raw = ssGet(RESUME_KEY);
    if (!raw) return;                       // absent → fresh launch handles step 1 (D-09)
    var data;
    try { data = JSON.parse(raw); } catch (e) { return; }   // parse error → no-op
    if (!data || typeof data.stepIndex !== 'number') return;
    if (data.stepIndex < 0 || data.stepIndex >= STEPS.length) return;
    if (STEPS[data.stepIndex].page !== api._currentPage()) return;  // page mismatch → no-op
    stepIndex = data.stepIndex;
    render();
  }

  // ── finish / close — clear the resume tier so the next launch restarts (D-09) ─
  function endTour() {
    clearTourChrome();
    active = false;
    stepIndex = 0;
    ssRemove(RESUME_KEY);
  }

  // ── mid-tour exit choice (D-08) ───────────────────────────────────────────────
  // Close ends the run (endTour clears resume + goes inactive — the Plan-03
  // resume-state contract) THEN mounts a concise two-option prompt. Neither
  // option auto-runs anything: the tour still only RUNS on an explicit start()
  // (TOUR-01). The two flags are the seam the Plan 05 coordinator reminder reads.
  function openExitChoice() {
    endTour();

    var r = document.createElement('div');
    r.className = 'sg-tour-root sg-tour-exit-root';
    r.setAttribute('data-tour-chrome', '');

    var scrim = document.createElement('div');
    scrim.className = 'sg-tour-modal-scrim';

    var card = document.createElement('div');
    card.className = 'sg-tour-tooltip sg-tour-exit-card';
    card.setAttribute('role', 'dialog');
    card.setAttribute('data-arrow', 'none');

    card.appendChild(makeEl('h3', 'sg-tour-title', 'help.tour.exit.title'));

    var row = document.createElement('div');
    row.className = 'sg-tour-row sg-tour-exit-row';

    var laterBtn = makeEl('button', 'sg-tour-btn sg-tour-btn-neutral', 'help.tour.exit.remindLater');
    laterBtn.setAttribute('type', 'button');
    laterBtn.onclick = function () { lsSet('sg.tourRemindLater', '1'); teardown(r); };

    var exploreBtn = makeEl('button', 'sg-tour-btn sg-tour-btn-neutral', 'help.tour.exit.exploreMyself');
    exploreBtn.setAttribute('type', 'button');
    exploreBtn.onclick = function () { lsSet('sg.tourNeverRemind', '1'); teardown(r); };

    row.appendChild(laterBtn);
    row.appendChild(exploreBtn);
    card.appendChild(row);
    scrim.appendChild(card);
    r.appendChild(scrim);
    document.body.appendChild(r);
  }

  // ── finish card (D-10) ────────────────────────────────────────────────────────
  // Mounts on the last step's forward action: a garden-voice card with the
  // help-center handoff plus first-action buttons. ONE accent control only
  // ("Add your first client"); the other two stay neutral. Sets sg.tourCompleted
  // and clears the resume tier as it mounts.
  function mountFinish() {
    clearTourChrome();
    active = false;
    stepIndex = 0;
    lsSet('sg.tourCompleted', '1');
    ssRemove(RESUME_KEY);

    var r = document.createElement('div');
    r.className = 'sg-tour-root sg-tour-finish-root';
    r.setAttribute('data-tour-chrome', '');

    var scrim = document.createElement('div');
    scrim.className = 'sg-tour-modal-scrim';

    var card = document.createElement('div');
    card.className = 'sg-tour-tooltip sg-tour-finish-card';
    card.setAttribute('role', 'dialog');
    card.setAttribute('data-arrow', 'none');

    card.appendChild(makeEl('h3', 'sg-tour-finish-title', 'help.tour.finish.title'));
    card.appendChild(makeEl('p', 'sg-tour-body', 'help.tour.finish.body'));

    var actions = document.createElement('div');
    actions.className = 'sg-tour-finish-actions';

    // Single accent action (mirrors the forward-button treatment).
    var addClient = makeEl('a', 'sg-tour-btn sg-tour-btn-fwd sg-tour-finish-primary', 'help.tour.finish.addClient');
    addClient.setAttribute('href', './add-client.html');

    // Neutral secondary action.
    var startSession = makeEl('a', 'sg-tour-btn sg-tour-btn-neutral', 'help.tour.finish.startSession');
    startSession.setAttribute('href', './add-session.html');

    // Neutral help-center handoff link.
    var helpCenter = makeEl('a', 'sg-tour-takeme sg-tour-finish-help', 'help.tour.finish.helpCenter');
    helpCenter.setAttribute('href', './help.html');

    actions.appendChild(addClient);
    actions.appendChild(startSession);
    actions.appendChild(helpCenter);
    card.appendChild(actions);

    var closeBtn = makeEl('button', 'sg-tour-btn sg-tour-btn-close sg-tour-finish-close', 'help.tour.close');
    closeBtn.setAttribute('type', 'button');
    closeBtn.onclick = function () { teardown(r); };
    card.appendChild(closeBtn);

    scrim.appendChild(card);
    r.appendChild(scrim);
    document.body.appendChild(r);
  }

  // Remove a standalone (exit / finish) surface — main-tour chrome is torn down by
  // clearTourChrome(); these post-run surfaces own their own node.
  function teardown(node) {
    try { if (node && node.parentNode) node.parentNode.removeChild(node); } catch (e) {}
  }

  // ── mid-tour language re-render (TOUR-04) ─────────────────────────────────────
  // Subscribe ONCE to the document 'app:language' event App dispatches (app.js
  // line 126), guarded like initHelpEntry._listenerInstalled. On fire, if a tour
  // is active, re-render the CURRENT step: render() does cleanup-then-replace, so
  // every string re-resolves via t() in the new locale and the geometry re-measures
  // from getBoundingClientRect. Positioning is on PHYSICAL coordinates (top/left),
  // so it is direction-neutral by construction — the copy flips with the locale but
  // the ring/tooltip do NOT mirror to the opposite side in RTL. Inactive → no-op.
  // Post-run finish/exit surfaces are static (active === false) — left untouched.
  function onLanguageChange() {
    if (!active) return;
    render();
  }
  function installLangListener() {
    if (_langListenerInstalled) return;
    try { document.addEventListener('app:language', onLanguageChange); } catch (e) {}
    _langListenerInstalled = true;
  }

  function isActive() { return active; }

  // ── current-page seam — last path segment, default index.html ─────────────────
  function currentPage() {
    try {
      var p = (window.location && window.location.pathname) || '';
      var seg = p.split('/').pop();
      return seg || 'index.html';
    } catch (e) { return 'index.html'; }
  }

  // ── the public object + injectable seams (mutating a seam affects internal
  //    calls because the engine references api.* — architect-gate A5) ────────────
  var api = {
    start: start,
    resume: resume,
    isActive: isActive,
    next: next,
    prev: prev,

    // A5: default visibility test — el present AND laid out (offsetParent non-null).
    // render() calls this seam so tests can force BOTH branches (jsdom hardcodes
    // offsetParent === null for every element).
    _isAnchorVisible: function (el) { return !!(el && el.offsetParent !== null); },

    // Navigation seam — default assigns window.location.href; tests override to
    // capture the target without a real page load.
    _navigate: function (href) { try { window.location.href = href; } catch (e) {} },

    _currentPage: currentPage,
    _render: render,
    _endTour: endTour,
    _openExitChoice: openExitChoice,
    _mountFinish: mountFinish,
    _getSteps: function () { return STEPS; },
    _getStepIndex: function () { return stepIndex; },
    _setStepIndex: function (i) { stepIndex = i; }
  };

  // Subscribe to language changes exactly once at load (TOUR-04 / D-08).
  installLangListener();

  return api;
})();

if (typeof window !== 'undefined') window.Tour = Tour;
