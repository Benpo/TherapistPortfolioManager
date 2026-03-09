# Codebase Concerns

**Analysis Date:** 2026-02-01

## Tech Debt

**Database Transaction Pattern Redundancy:**
- Issue: Multiple async functions wrap database operations differently, creating inconsistent patterns
- Files: `assets/db.js` (lines 25-34, 36-45, 56-63, 67-74)
- Impact: Code duplication makes maintenance harder and increases bug surface area. Each operation has slight variations in error handling.
- Fix approach: Extract a reusable `withDB()` helper that standardizes all IndexedDB transaction patterns. The `withStore()` function (line 25) exists but isn't used consistently by all operations.

**Closure-Based Module Pattern Without State Isolation:**
- Issue: Module-level closures store state without clear initialization or reset mechanisms
- Files: `assets/add-session.js` (lines 1-3, 141-142), `assets/overview.js` (line 77), `assets/sessions.js` (line 10)
- Impact: Global module state (`clientCache`, `issues`, `inlinePhotoData`) can cause unexpected behavior if pages are revisited or if multiple instances exist
- Fix approach: Implement explicit initialization function that clears state at page load rather than relying on closure initialization

**Hardcoded Constants Scattered Across Files:**
- Issue: Magic numbers and strings appear in multiple places without centralization
- Files: `assets/add-session.js` (line 143 MAX_ISSUES=3), `assets/db.js` (lines 2-3 DB_NAME, DB_VERSION)
- Impact: Changes to constraints require updating multiple files; no single source of truth
- Fix approach: Create a `config.js` file with all constants and import from there

## Security Considerations

**Data Storage Without Encryption:**
- Risk: Client photos and session data stored as base64 in IndexedDB without encryption
- Files: `assets/db.js` (store creation lines 10-18), `assets/add-session.js` (line 438 photoData = await readFileAsDataURL)
- Current mitigation: None - relies on browser's localStorage security model
- Recommendations:
  - Document that IndexedDB is not encrypted and data is accessible via browser DevTools
  - Consider warning users about sensitive data
  - Implement client-side encryption if handling protected health information

**No Input Validation on Form Data:**
- Risk: User input (names, emails, notes) stored directly without sanitization
- Files: `assets/add-client.js` (lines 117-128), `assets/add-session.js` (lines 516-532)
- Current mitigation: HTML form type attributes provide basic browser validation
- Recommendations:
  - Add email format validation beyond HTML input type
  - Validate age as positive integer
  - Trim whitespace (already done with .trim()) but validate maximum lengths
  - Sanitize text fields that are later displayed as innerHTML or textContent

**Photo Upload Without Size Limits:**
- Risk: Large image files converted to base64 could bloat IndexedDB
- Files: `assets/add-session.js` (lines 434-444), `assets/add-client.js` (lines 46-56)
- Current mitigation: None
- Recommendations:
  - Add file size check before readFileAsDataURL()
  - Add file type validation (check MIME type, not just extension)
  - Compress image before storing or limit resolution

**Export Contains Unencrypted Sensitive Data:**
- Risk: JSON export includes all client info and photos as base64
- Files: `assets/overview.js` (lines 362-371, 373-383)
- Current mitigation: No password protection on export
- Recommendations:
  - Add optional password encryption to export
  - Warn users that export files contain sensitive data
  - Consider excluding photo data from exports by default

**No Rate Limiting on Database Operations:**
- Risk: Rapid API-like usage could cause performance issues
- Files: `assets/overview.js` (renderSessions calls getAllSessions() on every filter change)
- Impact: Every filter change triggers full table scan and re-render
- Fix approach: Implement debouncing on filter change events

## Performance Bottlenecks

**Full Table Scans on Every Filter:**
- Problem: Sessions table filters require loading all sessions into memory
- Files: `assets/sessions.js` (lines 58-72)
- Cause: IndexedDB doesn't support complex multi-field queries with date ranges; client-side filtering is necessary
- Improvement path:
  - Implement result pagination to limit DOM nodes
  - Cache filtered results and only update changed rows
  - Consider adding session count indicators

**DOM Reconstruction on Language Change:**
- Problem: All translations re-applied to entire page on language switch
- Files: `assets/app.js` (lines 9-18, applyTranslations called everywhere), `assets/overview.js` (line 296)
- Cause: querySelectorAll searches entire document for [data-i18n] attributes
- Improvement path:
  - Maintain reference map of translated elements
  - Only update changed elements
  - Consider using translation tokens in a data structure instead of DOM attributes

**Repeated Client Lookups:**
- Problem: Same client fetched multiple times during session operations
- Files: `assets/add-session.js` (lines 288-294, 507, 685)
- Cause: No memoization of getSelectedClient() or client cache invalidation
- Improvement path: Use client cache consistently throughout page lifecycle

**Large File Size - add-session.js:**
- Problem: 847 lines in single file handling UI, form logic, and database operations
- Files: `assets/add-session.js`
- Cause: Multiple concerns bundled (issue management, form submission, inline client creation, client spotlight, heart wall logic)
- Improvement path: Split into:
  - `issue-block-manager.js` - Issue CRUD operations
  - `client-spotlight.js` - Client display widget
  - `session-form-submission.js` - Form validation and DB operations
  - `inline-client-form.js` - Inline client creation

## Fragile Areas

**Copy-to-Clipboard Fallback Logic:**
- Files: `assets/add-session.js` (lines 296-321)
- Why fragile: Uses deprecated `document.execCommand("copy")` as fallback for modern clipboard API
- Safe modification:
  - Check navigator.clipboard support at page load
  - Gracefully disable copy buttons if neither API available
  - Test in different browsers (execCommand removed in some modern browsers)
- Test coverage: No test for fallback path exists

**Toggle Group State Management:**
- Files: `assets/add-session.js` (lines 648-660), `assets/add-client.js` (lines 29-38)
- Why fragile: Duplicate toggle logic in multiple files; state tracked via class names and input.checked
- Safe modification:
  - Extract to reusable `setupToggleGroup()` helper
  - Ensure both class state and input state stay synchronized
  - Add validation that at least one option is selected
- Risk of breaking: Easy to miss updating both class and input state

**Modal Event Listener Cleanup:**
- Files: `assets/app.js` (lines 77-102)
- Why fragile: Event listeners added but not removed until modal closes; multiple simultaneous modals could cause listener stacking
- Safe modification:
  - Add cleanup function that explicitly removes all listeners
  - Prevent listener duplication with try-finally block
  - Test with rapid open-close cycles
- Test coverage: No test for edge cases like rapid clicks

**Read Mode Textarea Resizing:**
- Files: `assets/add-session.js` (lines 65-78, 102-108)
- Why fragile: Manual height calculation based on scrollHeight; may break with CSS changes
- Safe modification:
  - Extract to separate function with clear contract
  - Document that CSS padding/border affects calculation
  - Test with different font sizes and long content
- Test coverage: No test for edge cases

## Known Bugs

**Heart-Wall Logic Inconsistency:**
- Symptoms: Heart wall section visibility and selection state can become out of sync with client selection
- Files: `assets/add-session.js` (lines 675-697, 754-761)
- Trigger:
  1. Select heart-wall client
  2. Make heart-wall selection
  3. Change to non-heart-wall client
  4. Change back to heart-wall client
  5. Heart-wall section shows but may not reflect previous selection
- Workaround: Manually re-select heart-wall choice

**Inline Client Form Reset Incomplete:**
- Symptoms: Type toggle card state may not match radio button state after cancel
- Files: `assets/add-session.js` (lines 763-789)
- Trigger: Add inline client, select "Animal" type, click cancel, add inline client again
- Workaround: Refresh page

**Issue Counter Not Reset on Page Reload:**
- Symptoms: Issue IDs can get very high if session edited multiple times
- Files: `assets/add-session.js` (line 142 issueCounter)
- Impact: Issue IDs become unpredictable; not a functional bug but indicates poor state management
- Trigger: Edit same session multiple times on same page

**Date String Comparison Issues:**
- Symptoms: Date range filtering may have off-by-one errors or timezone issues
- Files: `assets/sessions.js` (lines 46-51)
- Cause: String comparison of ISO dates works but is fragile with different date formats
- Trigger: Sessions created in different timezones
- Fix: Parse dates before comparing

## Scaling Limits

**IndexedDB Size Limits:**
- Current capacity: Browser-dependent (typically 50MB+)
- Limit: Large photo collections or many clients will hit storage quota
- Scaling path:
  - Implement lazy loading of photos
  - Store photos separately with size limits
  - Consider cloud sync with Supabase/Firebase

**All-in-Memory Session Processing:**
- Current capacity: Works fine under ~1000 sessions
- Limit: Beyond 5000 sessions, UI becomes sluggish as entire table is loaded and filtered
- Scaling path:
  - Implement pagination (show 50 sessions per page)
  - Add server-side filtering if moving to cloud backend
  - Use virtual scrolling for large lists

**No Pagination in Overview:**
- Current capacity: 100+ clients still renders quickly
- Limit: 1000+ clients would create thousands of DOM nodes
- Scaling path: Add client pagination or search/filter by name

## Dependencies at Risk

**No Validation Library:**
- Risk: Manual validation scattered across form submission handlers
- Impact: Easy to miss validation cases; form constraints not DRY
- Migration plan: Add tiny validation library (e.g., `joi-browser` or `zod`) or create validation module

**No Testing Framework:**
- Risk: No tests to catch refactoring regressions
- Impact: Tech debt compounds - harder to refactor with confidence
- Migration plan:
  - Set up Jest with jsdom for DOM testing
  - Start with critical path tests (DB operations, form submission)
  - Aim for 70%+ coverage on core logic

**No Build Process:**
- Risk: All files served directly without minification or bundling
- Impact: Slightly worse performance and no tree-shaking of unused code
- Migration plan:
  - Minimal: Add gulp or npm scripts to minify JavaScript
  - Recommended: Set up Vite or esbuild for modern development

## Missing Critical Features

**No Data Backup Mechanism:**
- Problem: Only manual export/import; no automatic backups
- Blocks: Can't recover from accidental data deletion

**No Search Functionality:**
- Problem: Must scroll through clients or sessions manually
- Blocks: Finding specific client/session by name difficult with large datasets

**No Multi-Device Sync:**
- Problem: Data stored locally only; no cloud sync
- Blocks: Users can't access data on different devices

**No Conflict Resolution:**
- Problem: If importing data while local data exists, entire local DB cleared
- Blocks: Merging data from multiple exports impossible

## Test Coverage Gaps

**Database Operations:**
- What's not tested: Transaction error handling, concurrent access, recovery from failed transactions
- Files: `assets/db.js`
- Risk: Corruption or data loss on edge cases
- Priority: High

**Form Validation:**
- What's not tested: Boundary conditions (age >150, empty names after trim, very long notes)
- Files: `assets/add-client.js`, `assets/add-session.js`
- Risk: Invalid data stored or form acceptance of invalid input
- Priority: Medium

**Date Handling:**
- What's not tested: Leap years, timezone conversions, invalid date strings
- Files: `assets/app.js` (formatDate), `assets/sessions.js` (matchesDateRange)
- Risk: Incorrect date filtering or display
- Priority: Medium

**Internationalization:**
- What's not tested: Missing translation keys, RTL layout in Hebrew mode, special characters
- Files: `assets/app.js` (applyTranslations), `assets/i18n.js`
- Risk: Broken UI in Hebrew or with missing translations
- Priority: Medium

**Modal Dialog Edge Cases:**
- What's not tested: Rapid open-close, keyboard navigation, accessibility
- Files: `assets/app.js` (confirmDialog)
- Risk: Modal can be stuck open or listener accumulation
- Priority: Low

---

*Concerns audit: 2026-02-01*
