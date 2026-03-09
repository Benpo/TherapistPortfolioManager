# Testing Patterns

**Analysis Date:** 2026-02-01

## Test Framework

**Status:** Not detected

**Current State:**
- No test framework configured (Jest, Vitest, Mocha, etc. not found)
- No test files present in codebase (no .test.js, .spec.js, .test.ts, .spec.ts files)
- No test configuration files: no jest.config.js, vitest.config.js, or similar
- No test runners in package.json (no package.json found; vanilla HTML/JS project)
- No testing dependencies detected

**Test Environment:**
- Project is vanilla JavaScript running in browser environment
- IndexedDB for data storage (would require mocking or special test setup)
- DOM manipulation heavy (requires jsdom or similar for testing)

## Test File Organization

**Current Pattern:**
- No test files present
- No established test directory structure

**Recommended Structure for Future Testing:**
- Test files would typically follow co-located pattern: `assets/__tests__/` or adjacent to source
- Suggested naming: `assets/app.test.js`, `assets/db.test.js`, `assets/add-client.test.js`

## Codebase Testability Assessment

**Easily Testable:**
- Database abstraction layer in `assets/db.js` - could be unit tested with mocked IndexedDB
- Pure functions: `formatDate()`, `severityColor()`, `formatSessionType()`, `getClientDisplayName()`
- Utility functions: `readFileAsDataURL()`, `createSeverityScale()`, `getSeverityValue()`
- Translation system: `App.t()`, `setLanguage()` - could test with mock I18N data

**Difficult to Test (Currently):**
- DOM-heavy page initialization scripts (`add-client.js`, `add-session.js`, `overview.js`, `reporting.js`)
- Form submission handlers with mixed business logic and DOM updates
- Modal dialog handling with event listeners and manual DOM state management
- LocalStorage and IndexedDB interactions tightly coupled with UI logic

## Current Testing Approach

**De facto Testing Method:**
- Manual testing via browser
- User acceptance testing in production/staging
- Visual regression (implicit - no automated checks)

**Test Data:**
- IndexedDB used for local persistence in browser
- No test fixtures or seed data found
- Import/export JSON feature allows manual test data setup: `assets/overview.js` has `exportData()` and `importData()` functions

## Code Patterns That Would Need Testing

**Async Database Operations:**
- All database functions return Promises
- Operations include: `addClient()`, `updateClient()`, `deleteClient()`, `addSession()`, `deleteSession()`, `getAllClients()`, `getAllSessions()`, `getSessionsByClient()`
- Transaction handling: `withStore()` pattern would need test coverage

**Event Handlers:**
- Form submissions with validation
- Language change detection via custom events: `document.dispatchEvent(new CustomEvent("app:language", { detail: { lang } }))`
- Modal dialog confirmation: `App.confirmDialog({ titleKey, messageKey })`

**State Management:**
- Current language stored in module scope: `let currentLang`
- Client cache in session script: `let clientCache`
- Form state: `let editingClient`, `let isReadMode`, `let photoData`

**Data Transformations:**
- Client display name generation: `getClientDisplayName()`
- Date formatting with locale support
- Severity color calculation: `severityColor(value)`
- Session aggregation and statistics

## Manual Testing Observations

**Implicit Test Cases (from code review):**

1. **Client Management:**
   - Add new client with validation (firstName required)
   - Edit existing client
   - Delete client (with confirmation dialog)
   - Client type toggle between "human" and "animal"
   - Heart wall checkbox handling
   - Photo upload and preview

2. **Session Management:**
   - Create session for existing client
   - Create inline client during session creation
   - Edit existing session
   - Delete session (with confirmation)
   - Session issue list management
   - Session type selection (in-person, proxy, surrogate)
   - Severity scale 0-10 selection (before and after)

3. **Data Persistence:**
   - IndexedDB transactions complete successfully
   - Data survives browser refresh
   - Client-session relationships maintained

4. **Internationalization:**
   - Language toggle between English and Hebrew
   - RTL/LTR layout switching
   - All UI text translates correctly
   - Date formatting respects locale

5. **Import/Export:**
   - Export data as JSON file
   - Import valid JSON file
   - Import error handling (invalid JSON)

6. **UI State:**
   - Read mode vs. edit mode toggle
   - Modal dialogs show/hide correctly
   - Toast notifications appear and disappear
   - Empty state displays when no data

## Testing Dependencies (If Implemented)

**Recommended Stack for Testing:**
- **Runner:** Jest or Vitest (for unit tests)
- **Browser Simulation:** jsdom or happy-dom (for DOM tests)
- **Mocking:** Jest's built-in mocks for IndexedDB, localStorage
- **IndexedDB Mock:** fake-indexeddb or similar
- **Assertion Library:** Jest built-in or Chai

**Example Test Setup (Pseudo-code):**
```javascript
// jest.config.js would configure testEnvironment: "jsdom"
// Mock IndexedDB
jest.mock('indexedDB', () => ({...}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn()
};
global.localStorage = localStorageMock;
```

## Critical Untested Areas

**High Risk (No Test Coverage):**
- Database transaction integrity - could fail silently
- Concurrent database operations - no testing of race conditions
- File upload and data URL generation (`readFileAsDataURL()`)
- Modal dialog event cleanup (listener removal might leak memory)
- Language switching under high frequency
- Large dataset handling (performance not tested)

**Medium Risk:**
- Form validation edge cases
- Missing element handling (null checks in 160 places)
- Permission/accessibility scenarios
- Keyboard navigation in modals

**Low Risk:**
- Static translation keys (verified at runtime but not systematically)
- Basic CSS styling (visual regression not tested)

## Recommended Testing Strategy

**Phase 1 - Foundation:**
1. Set up Jest with jsdom
2. Create tests for pure utilities: `formatDate()`, `severityColor()`, `formatSessionType()`
3. Create tests for i18n: `App.t()`, `setLanguage()` with mock I18N
4. Create tests for IndexedDB layer (`db.js`) with mocked IndexedDB

**Phase 2 - Core Features:**
1. Test client CRUD operations via database layer
2. Test session CRUD operations via database layer
3. Test data aggregation/statistics (reporting calculations)
4. Test import/export JSON serialization

**Phase 3 - UI Integration:**
1. Test form submission flows with DOM simulation
2. Test modal dialog interactions
3. Test language switching UI updates
4. Test navigation between pages (localStorage and URL params)

**Phase 4 - E2E:**
1. Browser-based E2E tests (Playwright, Cypress)
2. Full user workflows: add client → add session → report → export

---

*Testing analysis: 2026-02-01*
