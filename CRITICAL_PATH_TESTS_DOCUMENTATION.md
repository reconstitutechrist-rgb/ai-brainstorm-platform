# Critical Path Tests - Enhanced Sandbox Session Review System

**Test Suite Creation Date:** October 25, 2025
**Coverage:** Backend + Frontend + Integration
**Status:** ✅ Complete

---

## Overview

This document describes the critical path test suite for the Enhanced Sandbox Session Review System. These tests ensure the core workflow functions correctly and prevent regressions.

### Test Coverage Summary

| Category | Files | Tests | Coverage |
|----------|-------|-------|----------|
| Backend Services | 1 | 15+ | Core business logic |
| API Endpoints | 1 | 12+ | All REST routes |
| Frontend Components | 1 | 18+ | UI workflows |
| Integration E2E | 1 | 4 | Full user journey |
| **Total** | **4** | **49+** | **Critical paths** |

---

## 1. Backend Service Tests

**File:** `backend/src/tests/sessionCompletion.test.ts`

### Purpose
Test the `SessionCompletionService` which orchestrates the entire session finalization workflow.

### Test Cases

#### Happy Path
```typescript
✅ should successfully complete a session with all steps
   - Creates session record
   - Generates documents
   - Updates project items
   - Updates conversation status
   - Updates sandbox status
   - Returns complete summary

✅ should add accepted ideas to project with correct state
   - Items default to "decided" state
   - Items include brainstorm metadata
   - Items preserve original idea data
   - Session ID tracked in metadata

✅ should update conversation and sandbox status correctly
   - Conversation marked as "completed"
   - Final decisions stored
   - Completed_at timestamp set
   - Sandbox status set to "saved_as_alternative"
```

#### Error Handling
```typescript
✅ should throw error if conversation not found
✅ should throw error if sandbox not found
✅ should handle document generation failures gracefully
```

#### Edge Cases
```typescript
✅ should handle session with no accepted ideas
   - Project items not added
   - Documents still created
   - Summary shows 0 items added

✅ should handle session with unmarked ideas
   - Unmarked ideas stored separately
   - Not added to project
   - Available for later review
```

#### Session Retrieval
```typescript
✅ should retrieve session with associated documents
✅ should retrieve all sessions for a project ordered by date
```

### How to Run
```bash
cd backend
npm test sessionCompletion.test.ts
```

---

## 2. API Endpoint Tests

**File:** `backend/src/tests/sessionReviewRoutes.test.ts`

### Purpose
Test all REST API endpoints for the session review workflow.

### Test Cases

#### POST /api/session-review/detect-end-intent
```typescript
✅ should detect end session intent with high confidence
   - Recognizes "I'm ready to end" phrases
   - Returns isEndIntent: true
   - Returns confidence score > 70

✅ should detect non-end intent
   - Normal conversation not flagged
   - Returns isEndIntent: false

✅ should return 400 if userMessage is missing

✅ should handle AI errors gracefully
   - Returns 500 with error message
   - Doesn't crash server
```

#### POST /api/session-review/generate-summary
```typescript
✅ should generate summary with grouped ideas
   - Groups ideas by topic
   - Generates summary text
   - Updates conversation status to "reviewing"

✅ should return 400 if conversationId is missing

✅ should return 404 if conversation not found
```

#### POST /api/session-review/parse-decisions
```typescript
✅ should parse natural language decisions correctly
   - Identifies accepted ideas
   - Identifies rejected ideas
   - Returns confidence score
   - Determines if clarification needed

✅ should handle decisions requiring clarification
   - Detects unmarked ideas
   - Generates clarification question
   - Sets needsClarification: true

✅ should return 400 if parameters are missing
```

#### POST /api/session-review/finalize
```typescript
✅ should finalize session and return summary
   - Creates session record
   - Generates documents
   - Updates project
   - Returns complete summary

✅ should return 400 if parameters are missing

✅ should handle finalization errors
   - Returns 500 with error message
   - Provides helpful error details
```

#### POST /api/session-review/cancel
```typescript
✅ should cancel review and reset conversation status
   - Sets status back to "active"
   - Returns success message

✅ should return 400 if conversationId is missing

✅ should handle database errors
```

### How to Run
```bash
cd backend
npm test sessionReviewRoutes.test.ts
```

---

## 3. Frontend Component Tests

**File:** `frontend/src/components/sandbox/__tests__/SessionReviewModal.test.tsx`

### Purpose
Test the `SessionReviewModal` multi-step wizard workflow.

### Test Cases

#### Step 1: Summary Display
```typescript
✅ should render summary step correctly
   - Shows "Session Review" title
   - Displays summary text
   - Lists all topic groups
   - Shows idea counts

✅ should list all ideas under each topic
   - OAuth Support
   - Two-Factor Auth
   - Dark Mode

✅ should advance to decisions step when button clicked
```

#### Step 2: Decisions Input
```typescript
✅ should render decisions textarea and examples
   - Placeholder text present
   - Example text visible
   - Textarea is editable

✅ should allow user to input decisions
   - User can type in textarea
   - Input value updates correctly

✅ should submit decisions and advance to confirmation
   - Calls onSubmitDecisions
   - Parses response
   - Advances to step 4 if no clarification needed

✅ should navigate back to summary when back button clicked
```

#### Step 3: Clarification (Conditional)
```typescript
✅ should show clarification step when needed
   - Displays clarification question
   - Shows unmarked ideas
   - Provides textarea for response

✅ should allow clarification input and resubmit
   - User can input clarification
   - Resubmits combined decisions
   - Advances if clarification sufficient
```

#### Step 4: Confirmation
```typescript
✅ should display accepted and rejected ideas correctly
   - Shows "Accepted (N)" section
   - Shows "Rejected (N)" section
   - Lists correct ideas in each

✅ should finalize session when confirmed
   - Calls onConfirmFinal with decisions
   - Waits for completion

✅ should show loading state during finalization
   - Shows "Finalizing..." text
   - Disables button
```

#### Modal Behavior
```typescript
✅ should close when close button clicked
✅ should not render when isOpen is false
```

#### Error Handling
```typescript
✅ should handle submission errors gracefully
   - Shows alert with error message
   - Keeps modal open
   - Allows retry
```

### How to Run
```bash
cd frontend
npm test SessionReviewModal.test.tsx
```

---

## 4. Integration E2E Tests

**File:** `backend/src/tests/integration/sessionReviewE2E.test.ts`

### Purpose
Test the complete end-to-end workflow from user input to database state.

### Test Cases

#### Full Workflow
```typescript
✅ should complete the full session review workflow (30s timeout)
   STEP 1: Group ideas by context
   - Creates topic groups
   - Identifies Auth, UI, Mobile topics

   STEP 2: Generate review summary
   - Calls SessionReviewAgent
   - Returns summary text

   STEP 3: Parse user decisions
   - Parses "I want OAuth and Dark Mode. I don't want mobile app."
   - Identifies 2 accepted, 1 rejected
   - No clarification needed

   STEP 4: Finalize session
   - Calls SessionCompletionService
   - Returns success summary

   STEP 5: Verify database state
   - Brainstorm session record created
   - Conversation status = "completed"
   - Sandbox status = "saved_as_alternative"
   - Project items added (2)
   - Documents generated (2)
   - Documents have correct content

   STEP 6: Verify session retrieval
   - Can fetch session by ID
   - Includes associated documents

   STEP 7: Verify project sessions list
   - Shows session in project list
   - Ordered by date
```

#### Clarification Workflow
```typescript
✅ should handle clarification workflow correctly (20s timeout)
   - First parse has unmarked ideas
   - Generates clarification question
   - Second parse with clarification
   - All ideas marked
   - No more clarification needed
```

#### Edge Cases
```typescript
✅ should handle session with only accepted ideas
   - All ideas added to project
   - Rejected doc created but empty
   - Success response

✅ should handle session with only rejected ideas
   - No items added to project
   - Accepted doc created but empty
   - Success response
```

### How to Run
```bash
cd backend
npm test sessionReviewE2E.test.ts
```

**Note:** These tests require a test database. If `TEST_SUPABASE_URL` is not set in `.env.test`, the tests will be automatically skipped. See [Test Environment Setup](#test-environment-setup) below.

---

## Test Infrastructure

### Backend Setup Files

#### vitest.config.ts
```typescript
- Test environment: Node
- Setup files: './src/tests/setup.ts'
- Coverage provider: v8
- Timeout: 10 seconds
- Include: src/**/*.test.ts
```

#### src/tests/setup.ts
```typescript
- Mocks Anthropic API globally
- Loads .env.test variables
- Suppresses console errors/warnings
- Resets mocks before each test
```

### Frontend Setup Files

#### vitest.config.ts
```typescript
- Test environment: jsdom
- Setup files: './src/tests/setup.ts'
- Plugins: @vitejs/plugin-react
- Coverage provider: v8
```

#### src/tests/setup.ts
```typescript
- Extends expect with jest-dom matchers
- Cleanup after each test
- Mocks window.matchMedia
- Mocks IntersectionObserver
- Mocks ResizeObserver
- Suppresses console output
```

---

## Test Environment Setup

### 1. Install Dependencies

**Backend:**
```bash
cd backend
npm install -D vitest @vitest/ui @vitest/coverage-v8
npm install -D supertest @types/supertest
```

**Frontend:**
```bash
cd frontend
npm install -D vitest @vitest/ui @vitest/coverage-v8
npm install -D @testing-library/react @testing-library/jest-dom
npm install -D @testing-library/user-event jsdom
```

### 2. Create Test Database

```bash
# Create .env.test in backend/
TEST_SUPABASE_URL=http://localhost:54321
TEST_SUPABASE_KEY=your-test-anon-key
TEST_ANTHROPIC_API_KEY=test-key-mock
```

### 3. Run Migrations on Test DB
```bash
# Apply all migrations to test database
psql $TEST_DATABASE_URL -f database/migrations/*.sql
```

---

## Running Tests

### Quick Start
```bash
# Backend (runs all unit and API tests)
cd backend && npm test

# Frontend (runs all component tests)
cd frontend && npm test
```

**Expected Results:**
- Backend: ~113 tests passing, 4 E2E tests skipped (if no test DB configured)
- Frontend: Component tests passing (when dependencies installed)

### Run Specific Test File
```bash
# Backend
npm test sessionCompletion.test.ts

# Frontend
npm test SessionReviewModal.test.tsx
```

### Run with Coverage
```bash
npm test -- --coverage
```

### Run in Watch Mode
```bash
npm test -- --watch
```

### Run Integration Tests Only
```bash
npm test -- integration
```

### Run with UI
```bash
npm test -- --ui
```

---

## Test Metrics

### Expected Pass Rates
- **Unit Tests:** 100% pass (all critical paths covered)
- **Integration Tests:** 100% pass (database state verified)
- **Component Tests:** 100% pass (UI workflows functional)

### Coverage Goals
- **Backend Services:** >80% line coverage
- **API Routes:** 100% endpoint coverage
- **Frontend Components:** >75% line coverage
- **Critical Paths:** 100% workflow coverage

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd backend && npm install
      - run: cd backend && npm test
      - uses: codecov/codecov-action@v3

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: cd frontend && npm install
      - run: cd frontend && npm test
      - uses: codecov/codecov-action@v3
```

---

## Debugging Tests

### Common Issues

#### 1. Module Not Found
```bash
# Ensure vitest is installed
npm install -D vitest
```

#### 2. Supabase Client Errors
```bash
# Check .env.test is loaded
console.log(process.env.TEST_SUPABASE_URL)
```

#### 3. Timeout Errors
```typescript
// Increase timeout for specific test
it('slow test', async () => {
  // ...
}, 30000); // 30 second timeout
```

#### 4. Mock Not Working
```typescript
// Clear mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});
```

### Debug Mode
```bash
# Run with verbose logging
npm test -- --reporter=verbose

# Run single test with debugging
node --inspect-brk node_modules/.bin/vitest sessionCompletion.test.ts
```

---

## Test Maintenance

### When to Update Tests

1. **API Changes:** Update route tests when endpoints change
2. **Schema Changes:** Update integration tests when database changes
3. **UI Changes:** Update component tests when workflow changes
4. **New Features:** Add new test cases for new functionality

### Test Review Checklist

- [ ] All critical paths covered
- [ ] Edge cases tested
- [ ] Error handling verified
- [ ] Loading states tested
- [ ] Database state verified
- [ ] Mocks properly configured
- [ ] Tests run in isolation
- [ ] No flaky tests
- [ ] Documentation updated

---

## Performance Benchmarks

### Expected Test Execution Times

| Test Suite | Duration | Notes |
|------------|----------|-------|
| Backend Unit | <5s | Fast, mocked dependencies |
| API Routes | <10s | Includes server setup |
| Frontend Components | <15s | Includes DOM rendering |
| Integration E2E | <30s | Full database operations |
| **Total** | **<60s** | Complete test suite |

---

## Next Steps

### Immediate
1. ✅ Run tests locally to verify setup
2. ✅ Check coverage reports
3. ✅ Fix any failing tests

### Short Term
4. Add more edge case tests
5. Add performance regression tests
6. Add accessibility tests (aria-labels, keyboard nav)
7. Add visual regression tests (screenshots)

### Long Term
8. Add load testing for AI endpoints
9. Add chaos engineering tests
10. Add security penetration tests
11. Add cross-browser compatibility tests

---

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Supertest Docs](https://github.com/visionmedia/supertest)
- [Jest DOM Matchers](https://github.com/testing-library/jest-dom)

---

**Test Suite Status:** ✅ **Ready for Use**
**Last Updated:** October 25, 2025
**Maintainer:** Development Team
**Review Frequency:** After each feature release
