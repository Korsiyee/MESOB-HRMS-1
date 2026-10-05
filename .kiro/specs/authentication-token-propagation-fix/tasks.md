# Implementation Plan

## Overview

This task list implements the fix for the authentication token propagation bug where Authorization headers are lost when making authenticated API calls through axios-compatible wrapper methods. The tasks follow the exploratory bugfix workflow: explore the bug first with tests that fail on unfixed code, write preservation tests, then implement the fix and verify both sets of tests pass.

---

## Tasks

- [ ] 1. Write bug condition exploration test (BEFORE implementing fix)
  - **Property 1: Bug Condition** - Authorization Header Lost in Wrapper Methods
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the Authorization header is not reaching the backend when using axios-compatible wrapper methods
  - **Scoped PBT Approach**: Scope the property to authenticated API calls through wrapper methods (GET, POST, PUT, PATCH, DELETE) where a valid token exists in localStorage
  - Test implementation details:
    - Set up a valid authentication token in localStorage
    - Make API calls through each wrapper method: `apiClient.get()`, `apiClient.post()`, `apiClient.put()`, `apiClient.patch()`, `apiClient.delete()`
    - Add extensive logging in wrapper methods (`frontend/src/api/apiClient.js`) to trace headers being passed
    - Add logging in `apiRequest()` (`frontend/src/utils/apiClient.js`) to confirm header reception
    - Add backend endpoint logging to capture received Authorization header
    - Assert that Authorization header should be present with format "Bearer {token}"
    - Assert backend should authenticate successfully (not return 401 Unauthorized)
  - The test assertions should match the Expected Behavior Properties from design:
    - **Property 1**: For authenticated requests through wrapper methods, Authorization header SHALL be present in the final fetch request
    - Verify header format: `Authorization: Bearer {jwt_token}`
    - Verify backend receives the header (not undefined)
    - Verify authentication succeeds (not 401)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS with these counterexamples:
    - Backend logs show "Authorization header: undefined"
    - Backend returns 401 Unauthorized with error "UNAUTHORIZED"
    - Frontend triggers forceLogout() immediately after successful login
    - Token exists in localStorage but never reaches backend
  - Document counterexamples found to understand root cause:
    - Which wrapper method calls fail?
    - Where exactly are headers lost? (wrapper method? apiRequest? fetch call?)
    - Are custom headers being passed but Authorization missing?
    - Do direct apiRequest() calls work correctly?
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Wrapper and Unauthenticated Request Behavior
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (cases where bug condition does NOT hold):
    - Direct `apiRequest()` calls (bypassing wrapper methods)
    - Unauthenticated requests when no token exists in localStorage
    - Token refresh mechanism when TOKEN_EXPIRED error occurs
    - Terminal error handling (TOKEN_REVOKED, ACCOUNT_DEACTIVATED, etc.)
    - Custom header support in wrapper methods
    - Activity tracking via `updateGlobalActivity()`
    - Public endpoint access (e.g., `/auth/login`, `/auth/refresh`)
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements:
    - **Test 1**: Direct apiRequest() calls - Verify Authorization header IS added correctly when bypassing wrapper
    - **Test 2**: Unauthenticated requests - Verify no Authorization header when token absent
    - **Test 3**: Token refresh - Verify TOKEN_EXPIRED triggers refresh and retry
    - **Test 4**: Terminal errors - Verify TOKEN_REVOKED, INVALID_TOKEN trigger immediate logout
    - **Test 5**: Custom headers - Verify custom headers are passed to apiRequest()
    - **Test 6**: Activity tracking - Verify `updateGlobalActivity()` is called for all requests
    - **Test 7**: Public endpoints - Verify `/auth/login` works with `skipRefresh: true`
  - Property-based testing generates many test cases for stronger guarantees:
    - Generate random unauthenticated scenarios (no token in localStorage)
    - Generate random direct apiRequest() calls with various endpoints
    - Generate random custom header combinations
    - Generate random token states (expired, revoked, invalid)
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (confirms baseline behavior to preserve):
    - Direct apiRequest() calls succeed with Authorization header
    - Unauthenticated requests work without Authorization header
    - Token refresh mechanism triggers correctly
    - Terminal errors cause immediate logout
    - Custom headers are preserved
    - Activity tracking occurs for all requests
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ] 3. Fix for Authorization Header Propagation Bug

  - [ ] 3.1 Add defensive logging to trace header flow
    - Add console.log in each wrapper method (`frontend/src/api/apiClient.js`) before calling apiRequest():
      - Log method name (GET, POST, etc.)
      - Log URL being called
      - Log headers received in config: `console.log('[ApiClient.get] Headers from config:', config?.headers)`
      - Log headers being passed to apiRequest: `console.log('[ApiClient.get] Passing to apiRequest:', { headers, ...options })`
    - Add console.log in apiRequest() (`frontend/src/utils/apiClient.js`):
      - Log received options: `console.log('[apiRequest] Received options:', options)`
      - Log headers before Authorization addition: `console.log('[apiRequest] Headers before auth:', headers)`
      - Log Authorization header after addition: `console.log('[apiRequest] Authorization header:', headers['Authorization'])`
      - Log final headers before fetch: `console.log('[apiRequest] Final headers:', Object.keys(headers))`
    - Add temporary backend logging to capture received headers
    - _Bug_Condition: isBugCondition(request) where request.method IN ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] AND authTokenExistsInLocalStorage() AND wrapperMethodUsed(request) AND NOT authorizationHeaderReachesBackend(request)_
    - _Expected_Behavior: Authorization headers set by apiRequest() must be preserved and sent to the backend, resulting in successful authentication_
    - _Preservation: Direct apiRequest() calls, unauthenticated requests, token refresh logic, terminal error handling, custom headers, activity tracking_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ] 3.2 Verify and fix header passing in wrapper methods
    - Review current implementation in `frontend/src/api/apiClient.js`:
      - Check `get()` method: Verify `const { headers, ...options } = config;` correctly destructures
      - Check `post()`, `put()`, `patch()`, `delete()` methods: Same verification
      - Verify each method passes headers to apiRequest() as: `apiRequest(url, { method, headers, ...options })`
    - Identify the issue:
      - If headers are being overwritten, adjust the order of spreading
      - If headers are not being passed correctly, fix the destructuring pattern
      - Ensure headers object is explicitly in the options parameter to apiRequest()
    - Implement the fix:
      - Ensure consistent pattern across all wrapper methods:
        ```javascript
        async get(url, config = {}) {
          const { headers, ...options } = config;
          return await apiRequest(url, {
            method: 'GET',
            headers: headers, // Explicitly pass headers
            ...options
          });
        }
        ```
      - Repeat for post(), put(), patch(), delete() with appropriate methods
      - Verify no accidental header overwriting in the spread operations
    - _Bug_Condition: isBugCondition(request) from design_
    - _Expected_Behavior: expectedBehavior(result) - Authorization header reaches backend in fetch call_
    - _Preservation: Preservation Requirements from design - all non-buggy request behaviors unchanged_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ] 3.3 Verify header merging in apiRequest() function
    - Review header construction in `frontend/src/utils/apiClient.js`:
      - Check current pattern:
        ```javascript
        const headers = {
          "Content-Type": "application/json",
          ...(options.headers || {}),
        };
        ```
      - Verify Authorization header is added AFTER spreading options.headers:
        ```javascript
        const token = localStorage.getItem("authToken");
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
        ```
    - Verify fetch call receives headers correctly:
      - Check: `fetch(API_BASE + path, { headers, ...options })`
      - Ensure options does NOT also contain a headers property that would overwrite
      - If needed, separate headers from options before fetch: `const { headers: _, ...fetchOptions } = options;`
    - Test the fix:
      - Use logging from 3.1 to verify headers flow correctly
      - Confirm Authorization header is present in final fetch call
      - Verify backend receives the header
    - _Bug_Condition: isBugCondition(request) from design_
    - _Expected_Behavior: expectedBehavior(result) from design_
    - _Preservation: Preservation Requirements from design_
    - _Requirements: 2.2, 2.3_

  - [ ] 3.4 Ensure proper header merging with custom headers
    - Test scenario: Caller provides custom headers alongside authentication
      - Example: `apiClient.get('/employees', { headers: { 'X-Custom': 'value' } })`
    - Verify both Authorization and custom headers are present:
      - Custom headers from caller should be in options.headers
      - Authorization header should be added by apiRequest()
      - Final fetch should have BOTH headers
    - Fix any conflicts:
      - Ensure Authorization is added AFTER spreading custom headers
      - Ensure custom headers don't accidentally overwrite Authorization
      - Verify order of operations preserves both
    - Test edge cases:
      - Empty headers object: `{ headers: {} }`
      - No headers provided: `{}`
      - Multiple custom headers
      - Headers with special characters
    - _Bug_Condition: isBugCondition(request) from design_
    - _Expected_Behavior: expectedBehavior(result) - both Authorization and custom headers present_
    - _Preservation: Custom header support from Preservation Requirements_
    - _Requirements: 2.4, 3.6_

  - [ ] 3.5 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Authorization Header Reaches Backend
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES with these confirmations:
      - Backend logs show "Authorization header: Bearer eyJ..." (not undefined)
      - Backend logs show "JWT verified" with user UUID
      - Backend returns 200 OK (or appropriate success status) instead of 401
      - Frontend does NOT trigger forceLogout()
      - User session persists beyond initial `/auth/me` call
    - Verify for ALL wrapper methods:
      - GET requests with authentication succeed
      - POST requests with authentication succeed
      - PUT requests with authentication succeed
      - PATCH requests with authentication succeed
      - DELETE requests with authentication succeed
    - Document successful counterexample resolution:
      - Headers now flow correctly through wrapper → apiRequest → fetch → backend
      - Token from localStorage is properly retrieved and formatted
      - Backend successfully authenticates requests
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ] 3.6 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Buggy Request Behavior Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions):
      - Direct apiRequest() calls still work correctly with Authorization header
      - Unauthenticated requests still work without Authorization header
      - Token refresh mechanism still triggers on TOKEN_EXPIRED
      - Terminal errors still cause immediate logout
      - Custom headers are still preserved and passed correctly
      - Activity tracking still occurs for all requests
      - Public endpoints still work with skipRefresh option
    - Verify property-based test results:
      - All generated unauthenticated scenarios pass
      - All generated direct apiRequest() scenarios pass
      - All generated custom header combinations pass
      - All generated token state scenarios pass
    - Confirm all tests still pass after fix (no regressions introduced)
    - Document preservation verification:
      - All non-buggy input behaviors remain identical to original
      - No existing functionality broken by the fix
      - Header merging works for both authentication and custom headers
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ] 4. Comprehensive Testing and Validation

  - [ ] 4.1 Write unit tests for header propagation
    - Test each wrapper method individually:
      - `apiClient.get()` with authentication
      - `apiClient.post()` with authentication and request body
      - `apiClient.put()` with authentication and request body
      - `apiClient.patch()` with authentication and request body
      - `apiClient.delete()` with authentication
    - Test header merging scenarios:
      - Authentication only (no custom headers)
      - Custom headers only (no authentication token)
      - Both authentication and custom headers
      - Empty headers object
      - No headers provided
    - Test query parameter handling:
      - GET with params and authentication
      - Verify params don't interfere with headers
    - Test request body serialization:
      - POST/PUT/PATCH with JSON body and authentication
      - Verify body doesn't interfere with headers
    - Mock localStorage and fetch to isolate unit testing
    - Assert Authorization header format: `Bearer {token}`
    - Assert custom headers coexist with Authorization
    - _Requirements: 2.1, 2.2, 2.4, 2.5, 3.6_

  - [ ] 4.2 Write integration tests for full authentication flow
    - Test complete user journey:
      - User submits login credentials
      - Backend validates and returns token
      - Frontend stores token in localStorage
      - User navigates to dashboard
      - Dashboard fetches employee data via `apiClient.get('/employees')`
      - Verify request succeeds with 200 OK
      - Verify user remains logged in
    - Test session persistence:
      - Login successfully
      - Make multiple API calls through wrapper methods
      - Verify no logout occurs between calls
      - Verify all calls authenticated successfully
    - Test token refresh during wrapper call:
      - Make request with expired token
      - Verify TOKEN_EXPIRED error triggers refresh
      - Verify original request is retried with new token
      - Verify retry succeeds
    - Test concurrent wrapper requests:
      - Make multiple authenticated requests simultaneously
      - Verify all receive Authorization header
      - Verify all authenticate successfully
    - Test mixed direct and wrapper calls:
      - Make some calls via `apiRequest()` directly
      - Make some calls via `apiClient.get()` wrapper
      - Verify both approaches work correctly
    - Use real backend endpoints (or test doubles)
    - Verify end-to-end header propagation
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 3.1, 3.2, 3.3_

  - [ ] 4.3 Write property-based tests for edge cases
    - Generate random authenticated API requests:
      - Random HTTP methods (GET, POST, PUT, PATCH, DELETE)
      - Random endpoints
      - Random request bodies for POST/PUT/PATCH
      - Random query parameters for GET
      - Verify Authorization header ALWAYS present when token exists
    - Generate random custom header combinations:
      - Random header names and values
      - Multiple custom headers (1 to 10)
      - Special characters in header values
      - Verify Authorization coexists with all custom headers
    - Generate random unauthenticated scenarios:
      - No token in localStorage
      - Expired token
      - Invalid token format
      - Verify Authorization header NEVER added when no valid token
    - Generate random token states:
      - Valid token → expect success
      - Expired token → expect refresh → expect retry success
      - Revoked token → expect immediate logout
      - Invalid token → expect immediate logout
    - Use property-based testing library (e.g., fast-check for JavaScript)
    - Run thousands of generated test cases
    - Catch edge cases that manual tests might miss
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ] 4.4 Manual testing in browser
    - Test in development environment:
      - Start backend server
      - Start frontend dev server
      - Open browser to login page
      - Open browser DevTools Network tab
    - Login and verify token flow:
      - Submit login credentials
      - Verify `/auth/login` returns token
      - Verify token stored in localStorage
      - Verify redirect to dashboard
    - Inspect first authenticated request:
      - Look at network request to `/employees` or `/auth/me`
      - Verify Request Headers include `Authorization: Bearer ...`
      - Verify response is 200 OK (not 401)
      - Verify user NOT logged out
    - Test navigation between pages:
      - Navigate to Employees page
      - Navigate to Attendance page
      - Navigate to Departments page
      - Verify each page loads data successfully
      - Verify no logouts occur
    - Test with custom headers:
      - Use DevTools to monitor a request that includes custom headers
      - Verify both Authorization and custom headers present
    - Test token expiration:
      - Wait for token to expire (or manually expire in backend)
      - Make an API call
      - Verify TOKEN_EXPIRED triggers refresh
      - Verify new token obtained
      - Verify original request retried and succeeds
    - Document manual testing results:
      - Screenshots of successful Authorization headers in Network tab
      - Confirmation that user sessions persist
      - Verification that all features work correctly
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 3.2, 3.3_

- [ ] 5. Clean up and finalize

  - [ ] 5.1 Remove defensive logging
    - Remove all temporary console.log statements added in task 3.1
    - Remove backend logging added for debugging
    - Keep any logging that provides value for production debugging
    - Ensure no verbose debug logs remain in production code
    - _Requirements: All requirements (cleanup task)_

  - [ ] 5.2 Update documentation
    - Document the fix in code comments:
      - Add comment in wrapper methods explaining header passing
      - Add comment in apiRequest() explaining header merging
      - Document the order of operations for header construction
    - Update any relevant API documentation:
      - Document header behavior in apiClient.js
      - Document expected usage patterns for custom headers
    - Add troubleshooting guide:
      - How to verify Authorization headers are being sent
      - How to debug header propagation issues
      - Common pitfalls to avoid
    - _Requirements: All requirements (documentation task)_

  - [ ] 5.3 Code review and verification
    - Review all changes made:
      - Verify wrapper methods are consistent
      - Verify header merging logic is correct
      - Verify no unintended side effects
    - Run full test suite:
      - Unit tests
      - Integration tests
      - Property-based tests
      - Verify all tests pass
    - Check for code quality:
      - No hardcoded values
      - Consistent naming conventions
      - Proper error handling
      - No dead code
    - Verify fix scope:
      - Only files related to header propagation modified
      - No unnecessary refactoring
      - Changes are minimal and targeted
    - _Requirements: All requirements (verification task)_

- [ ] 6. Checkpoint - Ensure all tests pass
  - Run complete test suite one final time
  - Verify bug condition exploration test passes (Authorization headers reach backend)
  - Verify preservation tests pass (non-buggy behaviors unchanged)
  - Verify unit tests pass
  - Verify integration tests pass
  - Verify property-based tests pass
  - Confirm manual testing showed successful authentication flow
  - Ask the user if questions arise or if any issues remain
  - Document final status: bug fixed, tests passing, ready for deployment

---

## Requirements Traceability

### Bug Condition Requirements (Section 2)
- **2.1**: Authorization header is lost when using GET wrapper method → Validated by tasks 1, 3.2, 3.5, 4.1
- **2.2**: Authorization header is lost when using POST wrapper method → Validated by tasks 1, 3.2, 3.3, 3.5, 4.1, 4.2
- **2.3**: Authorization header is lost when using PUT wrapper method → Validated by tasks 1, 3.2, 3.3, 3.5, 4.2
- **2.4**: Authorization header is lost when using PATCH wrapper method → Validated by tasks 1, 3.2, 3.4, 4.1, 4.3
- **2.5**: Authorization header is lost when using DELETE wrapper method → Validated by tasks 1, 3.1, 3.2, 3.5, 4.1, 4.2, 4.3, 4.4

### Preservation Requirements (Section 3)
- **3.1**: Direct apiRequest() calls must continue working → Validated by tasks 2, 3.6, 4.2, 4.3
- **3.2**: Token refresh logic must continue working → Validated by tasks 2, 3.6, 4.2, 4.3, 4.4
- **3.3**: Terminal error handling must continue working → Validated by tasks 2, 3.6, 4.2, 4.3
- **3.4**: Unauthenticated requests must continue working → Validated by tasks 2, 3.6, 4.3
- **3.5**: Activity tracking must continue working → Validated by tasks 2, 3.6, 4.3
- **3.6**: Custom headers must continue working → Validated by tasks 2, 3.4, 3.6, 4.1, 4.3

---

## Notes

- This task list follows the exploratory bugfix workflow: explore → preserve → implement → validate
- Tasks 1 and 2 MUST be completed BEFORE task 3 (implementation)
- Task 1 exploration test is EXPECTED to FAIL on unfixed code - this is correct behavior
- Task 2 preservation tests are EXPECTED to PASS on unfixed code - confirming baseline
- The fix in task 3 should make task 1 tests pass while keeping task 2 tests passing
- Property-based testing is strongly recommended for comprehensive coverage
- Manual testing in task 4.4 provides final confidence before deployment
