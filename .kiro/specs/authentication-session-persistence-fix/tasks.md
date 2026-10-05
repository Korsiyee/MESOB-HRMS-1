# Implementation Plan

## Overview
This implementation plan follows the bugfix methodology using Bug Condition exploration, Preservation testing, and Expected Behavior validation. The fix addresses the critical issue where authenticated API requests fail due to inconsistent API client usage in the Topbar component.

## Implementation Tasks

- [ ] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Authenticated Requests Missing Credentials
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to the concrete failing case: Topbar employee fetch after login
  - Test implementation details from Bug Condition in design:
    - Monitor network requests during login flow in browser DevTools
    - After successful login, observe the Topbar's employee fetch request to `/api/employees/emp-XXXX`
    - Verify the request either:
      - Uses incorrect URL (resolves to `http://localhost:5173/api/employees/...` instead of `http://localhost:5000/api/employees/...`), OR
      - Lacks Authorization header (no `Authorization: Bearer <token>` present)
    - Observe that the request returns 401 Unauthorized
    - Verify that 401 error triggers automatic logout cascade
  - The test assertions should match the Expected Behavior Properties from design:
    - Request should use centralized apiClient (not raw fetch)
    - Request should include `Authorization: Bearer <token>` header
    - Request should use correct base URL (API_BASE + endpoint)
    - Request should return 200 OK with employee data
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found:
    - Example 1: `fetch('/api/employees/emp-1001')` → Missing Authorization header
    - Example 2: Request goes to `http://localhost:5173/api/employees/...` → Wrong base URL (frontend server instead of backend)
    - Example 3: 401 response triggers `forceLogout()` → Cascading logout immediately after login
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Existing API Client Behavior
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (requests already using apiClient correctly):
    1. Permission Check Requests:
       - Observe: `usePermission` hook calls `apiClient.get('/auth/check-permission', { params: { action, resource } })`
       - Observe: Request includes `Authorization: Bearer <token>` header automatically
       - Observe: Request succeeds with 200 OK response
       - Document: apiClient correctly injects authentication credentials
    2. Token Refresh Mechanism:
       - Observe: When access token expires, apiClient automatically calls `/auth/refresh`
       - Observe: Failed request is retried with new token transparently
       - Document: Token refresh works without manual intervention
    3. Terminal Error Handling:
       - Observe: 401 response with `error: 'TOKEN_REVOKED'` triggers `forceLogout()`
       - Observe: User is logged out with appropriate error message
       - Document: Error handling for revoked tokens works correctly
    4. Activity Tracking:
       - Observe: Each `apiClient` request calls `updateGlobalActivity()`
       - Observe: User activity timestamp is updated, preventing idle timeout
       - Document: Activity tracking prevents premature session expiration
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements:
    - Property: For all API requests using apiClient (excluding Topbar's raw fetch), authentication credentials are automatically included
    - Property: For all expired token scenarios, automatic refresh occurs without user intervention
    - Property: For all terminal error codes (TOKEN_REVOKED, ACCOUNT_DEACTIVATED, etc.), appropriate logout behavior occurs
    - Property: For all apiClient requests, activity tracking is updated correctly
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 3. Fix Topbar Component to Use Centralized API Client

  - [ ] 3.1 Update Topbar.jsx to use apiClient instead of raw fetch
    - File: `frontend/src/components/layout/Topbar.jsx` (lines ~120-132)
    - Add import: `import apiClient from '../../api/apiClient';`
    - Replace raw fetch call:
      - Remove: `fetch('/api/employees/${encodeURIComponent(user.employee_uuid)}')`
      - Remove: Manual token retrieval `const token = localStorage.getItem('authToken');`
      - Remove: Manual header construction `headers: { Authorization: \`Bearer ${token}\` }`
    - Use centralized apiClient:
      - Use: `apiClient.get(\`/employees/\${encodeURIComponent(user.employee_uuid)}\`)`
      - Note: apiClient automatically handles authentication token injection
      - Note: apiClient automatically prepends API_BASE to construct full URL
    - Update response handling for apiClient format:
      - Remove: `.then(r => r.ok ? r.json() : null)`
      - Remove: `.then(payload => { if (payload?.data) setEmpInfo(payload.data); })`
      - Use: `.then(response => { if (response.data) setEmpInfo(response.data); })`
      - Note: apiClient returns `{ data: payload }` format for axios compatibility
    - Add proper error handling:
      - Remove: `.catch(() => {})` (silent failure)
      - Use: `.catch(err => { console.error('[Topbar] Failed to fetch employee data:', err); })`
      - Note: Failed employee fetch should NOT trigger logout or block UI
    - _Bug_Condition: isBugCondition(request) where request uses raw fetch without authentication credentials_
    - _Expected_Behavior: All authenticated requests SHALL include valid JWT token via Authorization header using apiClient_
    - _Preservation: Existing apiClient authentication token injection, refresh mechanism, error handling, and activity tracking SHALL remain unchanged_
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Authenticated Requests Include Valid Tokens
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1:
      - Monitor network requests during login flow
      - Observe Topbar's employee fetch request after successful login
      - Verify request uses `apiClient.get()` (not raw fetch)
      - Verify request includes `Authorization: Bearer <token>` header
      - Verify request uses correct base URL (`http://localhost:5000/api/employees/...`)
      - Verify request returns 200 OK with employee data
      - Verify NO automatic logout occurs
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - Expected Behavior Properties validated:
      - Property 1: For all authenticated HTTP requests made after successful login (such as fetching employee data), the fixed code includes a valid JWT access token in the Authorization header using format `Bearer <token>`, and the backend authentication middleware accepts the request and returns 200 OK instead of 401 Unauthorized
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Existing API Client Behavior Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2:
      1. Permission Check Preservation:
         - Verify `usePermission` hook continues to work exactly as before
         - Verify `apiClient.get('/auth/check-permission')` succeeds with 200 OK
         - Verify proper response format is maintained
      2. Token Refresh Preservation:
         - Verify automatic token refresh on TOKEN_EXPIRED continues to work
         - Verify transparent refresh and retry mechanism is unchanged
      3. Error Handling Preservation:
         - Verify terminal error codes (TOKEN_REVOKED, ACCOUNT_DEACTIVATED) continue to trigger logout
         - Verify appropriate error messages are displayed
      4. Activity Tracking Preservation:
         - Verify API requests continue to update activity timestamp
         - Verify user remains active while making requests
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Preservation Properties validated:
      - Property 2: For all API requests that currently use the centralized apiClient, the fixed code produces exactly the same behavior as the original code, preserving authentication token injection, automatic token refresh on TOKEN_EXPIRED errors, error handling for terminal error codes, and activity tracking
    - Confirm all tests still pass after fix (no regressions introduced)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 4. Checkpoint - Ensure all tests pass
  - Run full test suite (exploration test + preservation tests)
  - Verify Topbar employee fetch succeeds after login with 200 OK
  - Verify no 401 Unauthorized errors occur for authenticated requests
  - Verify no automatic logout cascade after successful login
  - Verify existing apiClient functionality remains unchanged
  - Test full login flow → Topbar mount → employee fetch → permission check sequence
  - Test navigation between pages after login (verify no premature logout)
  - Test that Topbar displays correct employee name and photo
  - If any issues arise, document and ask the user for guidance before proceeding
  - Ensure all tests pass before considering bugfix complete

## Notes

### Bug Condition Methodology Summary
- **C(X)**: Bug Condition - `isBugCondition(request)` returns true when request uses raw fetch without authentication or incorrect base URL
- **P(result)**: Property - All authenticated requests include valid JWT token via Authorization header and succeed with 200 OK
- **¬C(X)**: Non-buggy inputs - Requests already using apiClient correctly (permission checks, existing API calls)
- **F**: Original (unfixed) function - Topbar using raw `fetch()` without authentication
- **F'**: Fixed function - Topbar using centralized `apiClient` with automatic authentication

### Testing Strategy
1. **Exploration Phase** (Task 1): Write test BEFORE fix, expect FAILURE on unfixed code, document counterexamples
2. **Preservation Phase** (Task 2): Observe UNFIXED code behavior, write property-based tests, expect PASS on unfixed code
3. **Implementation Phase** (Task 3.1): Apply fix based on understanding from exploration
4. **Validation Phase** (Task 3.2-3.3): Re-run same tests, expect exploration test to PASS (bug fixed) and preservation tests to PASS (no regressions)

### Key Files
- **Frontend**: `frontend/src/components/layout/Topbar.jsx` (main fix location)
- **API Client**: `frontend/src/api/apiClient.js` (centralized authentication handling)
- **Auth Context**: `frontend/src/contexts/AuthContext.jsx` (activity tracking, logout logic)
- **Permission Hook**: `frontend/src/hooks/usePermission.js` (permission check requests to preserve)

### Success Criteria
- ✅ Users can successfully log in and remain authenticated
- ✅ Topbar employee fetch includes authentication credentials and succeeds
- ✅ No 401 Unauthorized errors for authenticated requests after login
- ✅ No automatic logout cascade immediately after successful login
- ✅ Existing apiClient functionality (token refresh, error handling, activity tracking) remains unchanged
- ✅ All property-based tests pass (bug condition satisfied, preservation maintained)
