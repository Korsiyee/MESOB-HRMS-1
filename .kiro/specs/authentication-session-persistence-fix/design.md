# Authentication Session Persistence Bugfix Design

## Overview

This bugfix addresses the critical issue where users cannot access the application after successfully logging in. The root cause is a combination of inconsistent API client usage, missing authentication credentials in certain fetch requests, and improper base URL configuration in the Topbar component. The fix ensures that all API requests consistently include authentication tokens and use the centralized API client for proper credential handling.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when authenticated API requests fail to include proper authentication credentials or use incorrect base URLs
- **Property (P)**: The desired behavior - all authenticated API requests should include valid JWT tokens via the Authorization header and succeed after login
- **Preservation**: Existing authentication flow, token refresh mechanism, and CORS configuration that must remain unchanged by the fix
- **apiClient**: The centralized HTTP client in `frontend/src/utils/apiClient.js` and `frontend/src/api/apiClient.js` that handles authentication token injection, refresh, and error handling
- **authToken**: The JWT access token stored in localStorage that authenticates API requests
- **API_BASE**: The configured API base URL (from environment variable or defaults to `http://localhost:5000/api`)

## Bug Details

### Bug Condition

The bug manifests when the Topbar component fetches employee data immediately after login, and when the usePermission hook makes permission check requests. The Topbar's `fetch` call bypasses the centralized `apiClient`, fails to include authentication headers, and uses an incorrect relative URL path that doesn't resolve to the backend API.

**Formal Specification:**
```
FUNCTION isBugCondition(request)
  INPUT: request of type HTTPRequest
  OUTPUT: boolean
  
  RETURN (request.url STARTS_WITH '/api/' AND NOT request.url STARTS_WITH API_BASE)
         OR (request.requiresAuth = true AND request.headers['Authorization'] IS NULL)
         OR (request.method = 'fetch' AND request.caller = 'Topbar.jsx' AND NOT usesApiClient)
END FUNCTION
```

### Examples

- **Example 1**: Topbar component fetches employee data with `fetch('/api/employees/emp-1001')` - this resolves to `http://localhost:5173/api/employees/emp-1001` (frontend dev server) instead of `http://localhost:5000/api/employees/emp-1001` (backend API), and lacks authentication headers → **401 Unauthorized**

- **Example 2**: After successful login, `usePermission` hook calls `/auth/check-permission?action=dashboard&resource=view_organization` via `apiClient.get()` - this correctly includes Authorization header and uses proper base URL → **Expected: 200 OK, Actual: May fail if Topbar's fetch triggers logout cascade**

- **Example 3**: User logs in successfully and `AuthContext` stores token in localStorage - subsequent API calls using `apiClient.get('/employees')` properly include `Authorization: Bearer <token>` header → **Should succeed but may fail due to cascading errors from Topbar**

- **Edge Case**: User navigates directly to `/my-account` after login - Topbar immediately fetches employee data using raw `fetch()` without authentication, receives 401, triggers logout before permission checks complete → **User immediately logged out**

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- The centralized `apiClient` authentication token injection mechanism must continue to work exactly as before
- Token refresh logic with retry on TOKEN_EXPIRED must continue to function correctly
- CORS configuration allowing cross-origin requests from frontend (port 5173) to backend (port 5000) must remain unchanged
- Login flow storing authToken and refreshToken in localStorage must remain unchanged
- AuthContext activity tracking and inactivity timeout must remain unchanged
- Error handling for terminal error codes (TOKEN_REVOKED, ACCOUNT_DEACTIVATED, etc.) must remain unchanged

**Scope:**
All API requests that currently use the `apiClient` properly should be completely unaffected by this fix. This includes:
- Permission check requests via `usePermission` hook
- Employee CRUD operations via employee service
- Attendance, leave, and other module API calls
- Authentication endpoints (login, logout, refresh) that already work correctly
- Notification polling and real-time updates

## Hypothesized Root Cause

Based on the bug description and code analysis, the most likely issues are:

1. **Inconsistent API Client Usage**: The Topbar component uses raw `fetch()` instead of the centralized `apiClient`, bypassing authentication token injection
   - File: `frontend/src/components/layout/Topbar.jsx`, line ~120-126
   - Impact: Authentication header not included, causing 401 errors

2. **Incorrect Base URL in Fetch Calls**: The Topbar uses a relative URL `/api/employees/...` which resolves against the frontend dev server (localhost:5173) instead of the backend API (localhost:5000)
   - Current: `fetch('/api/employees/...')`
   - Problem: Browser resolves this to `http://localhost:5173/api/employees/...` (frontend) instead of `http://localhost:5000/api/employees/...` (backend)

3. **Missing Credentials in Cross-Origin Requests**: Even if the base URL were correct, the raw fetch call doesn't include credentials mode or proper headers
   - The `apiClient` automatically adds `Authorization: Bearer ${token}` header
   - Raw fetch needs explicit: `headers: { 'Authorization': \`Bearer ${token}\` }`

4. **Error Cascade Effect**: When Topbar's fetch fails with 401, it may not be caught properly, leading to unhandled rejection that triggers the AuthContext's global error handler, causing premature logout

## Correctness Properties

Property 1: Bug Condition - Authenticated API Requests Include Valid Tokens

_For any_ HTTP request made after successful user login where the request requires authentication (such as fetching employee data, checking permissions, or accessing protected resources), the fixed code SHALL include a valid JWT access token in the Authorization header using the format `Bearer <token>`, and the backend authentication middleware SHALL accept the request and return successful responses (200 OK) instead of 401 Unauthorized.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Preservation - Existing API Client Behavior

_For any_ API request that currently uses the centralized `apiClient` (from `frontend/src/utils/apiClient.js` or `frontend/src/api/apiClient.js`), the fixed code SHALL produce exactly the same behavior as the original code, preserving authentication token injection, automatic token refresh on TOKEN_EXPIRED errors, error handling for terminal error codes, and activity tracking.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `frontend/src/components/layout/Topbar.jsx`

**Function**: `useEffect` hook that fetches employee data (lines ~120-132)

**Specific Changes**:

1. **Replace raw fetch with apiClient**: Change from using browser's native `fetch()` to using the centralized `apiClient` from `frontend/src/api/apiClient.js`
   - Remove: `fetch('/api/employees/...')`
   - Add: `import apiClient from '../../api/apiClient';`
   - Use: `apiClient.get('/employees/...')`

2. **Fix URL path**: Remove leading slash to ensure proper base URL construction
   - Remove: `'/api/employees/${encodeURIComponent(user.employee_uuid)}'`
   - Use: `'/employees/${encodeURIComponent(user.employee_uuid)}'`
   - The apiClient will automatically prepend `API_BASE` (e.g., `http://localhost:5000/api`)

3. **Remove explicit Authorization header construction**: The apiClient handles this automatically
   - Remove: Manual token retrieval `const token = localStorage.getItem('authToken');`
   - Remove: Manual header construction `headers: { Authorization: \`Bearer ${token}\` }`
   - The apiClient automatically injects the Authorization header

4. **Update response handling**: Adjust for apiClient's response format
   - apiClient returns `{ data: responsePayload }` format for axios compatibility
   - Change: `.then(r => r.ok ? r.json() : null)` → `.then(response => response.data)`
   - Change: `.then(payload => { if (payload?.data) setEmpInfo(payload.data); })` → `.then(data => { if (data) setEmpInfo(data); })`

5. **Add proper error handling**: Use apiClient's error format
   - Current: `.catch(() => {})`  (silent failure)
   - Improved: `.catch(err => { console.error('[Topbar] Failed to fetch employee data:', err); })`

### Pseudocode for Fixed Implementation

```javascript
// In Topbar.jsx
import apiClient from '../../api/apiClient';

useEffect(() => {
  if (!user?.employee_uuid) return;
  
  // Use centralized apiClient instead of raw fetch
  apiClient.get(`/employees/${encodeURIComponent(user.employee_uuid)}`)
    .then(response => {
      // apiClient returns { data: payload } format
      if (response.data) {
        setEmpInfo(response.data);
      }
    })
    .catch(err => {
      console.error('[Topbar] Failed to fetch employee data:', err);
      // Don't block UI or trigger logout on employee fetch failure
    });
}, [user?.employee_uuid]);
```

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code by attempting authenticated requests and observing 401 errors, then verify the fix works correctly and preserves existing behavior by ensuring all authenticated requests include proper credentials and succeed.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Monitor network requests in browser DevTools during login flow. Observe the Topbar's employee fetch request to verify it:
1. Uses incorrect URL (resolves to frontend server, not backend)
2. Lacks Authorization header
3. Returns 401 Unauthorized
4. Triggers automatic logout cascade

Run these observations on the UNFIXED code to confirm the root cause.

**Test Cases**:
1. **Topbar Employee Fetch Test**: After successful login, observe network tab for request to `/api/employees/emp-XXXX` (will fail on unfixed code)
   - Expected failure: Request goes to `http://localhost:5173/api/employees/...` (404 or CORS error) OR goes to correct backend but lacks Authorization header (401)
   - Root cause confirmed if: Missing Authorization header or wrong base URL

2. **Permission Check Test**: Observe `/api/auth/check-permission` requests immediately after login (may succeed initially)
   - Expected behavior: Should include Authorization header and succeed
   - Root cause confirmed if: Topbar's failed fetch triggers logout BEFORE permission checks complete

3. **Cascading Failure Test**: Login and navigate to `/my-account` (triggers Topbar mount)
   - Expected failure: Immediate 401 from Topbar, triggering logout message "Your session is invalid. Please log in again."
   - Root cause confirmed if: Logout happens before main page content loads

4. **Direct apiClient Test**: Make a manual API call using apiClient in browser console after login (should succeed)
   - Expected success: `apiClient.get('/employees').then(console.log)` should return data
   - Root cause confirmed if: apiClient works but raw fetch in Topbar does not

**Expected Counterexamples**:
- Topbar's fetch request missing Authorization header: `fetch('/api/employees/emp-1001')` → Headers do not include `Authorization: Bearer <token>`
- Topbar's fetch request using wrong URL: `http://localhost:5173/api/employees/...` instead of `http://localhost:5000/api/employees/...`
- 401 Unauthorized response triggering logout cascade immediately after successful login
- Possible causes: Raw fetch bypassing apiClient, incorrect base URL, missing authentication header

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds (authenticated requests requiring employee data or permissions), the fixed function produces the expected behavior (includes authentication credentials and succeeds).

**Pseudocode:**
```
FOR ALL request WHERE isBugCondition(request) DO
  result := makeRequest_fixed(request)
  ASSERT result.statusCode = 200
  ASSERT result.headers['Authorization'] IS NOT NULL
  ASSERT result.usesApiClient = true
END FOR
```

**Test Plan**: After implementing the fix, verify that:
1. Topbar's employee fetch uses `apiClient.get()` instead of raw `fetch()`
2. Request URL is correctly constructed as `API_BASE + '/employees/...'`
3. Authorization header is automatically included by apiClient
4. Request succeeds with 200 OK response
5. No automatic logout occurs after successful login

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold (API requests already using apiClient correctly), the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL request WHERE NOT isBugCondition(request) DO
  ASSERT makeRequest_original(request) = makeRequest_fixed(request)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain (different API endpoints, different authentication states, different user roles)
- It catches edge cases that manual unit tests might miss (token refresh during request, concurrent requests, race conditions)
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs (authentication flow, token refresh, error handling)

**Test Plan**: Observe behavior on UNFIXED code first for existing apiClient usage (permission checks, employee list fetches, attendance queries), then write property-based tests capturing that behavior.

**Test Cases**:
1. **Permission Check Preservation**: Verify `usePermission` hook continues to work exactly as before
   - Observe: `apiClient.get('/auth/check-permission', { params: { action, resource } })` succeeds on unfixed code
   - Verify: Same behavior after fix (200 OK, proper response format)

2. **Token Refresh Preservation**: Verify automatic token refresh on TOKEN_EXPIRED continues to work
   - Observe: When access token expires, apiClient automatically calls `/auth/refresh` and retries request
   - Verify: Same behavior after fix (transparent refresh, request succeeds after retry)

3. **Error Handling Preservation**: Verify terminal error codes (TOKEN_REVOKED, ACCOUNT_DEACTIVATED) continue to trigger logout
   - Observe: 401 with `error: 'TOKEN_REVOKED'` triggers `forceLogout()` on unfixed code
   - Verify: Same behavior after fix (immediate logout with appropriate message)

4. **Activity Tracking Preservation**: Verify API requests continue to update activity timestamp
   - Observe: `apiRequest()` calls `updateGlobalActivity()` on every request to prevent idle logout
   - Verify: Same behavior after fix (user remains active while making requests)

### Unit Tests

- Test Topbar employee fetch with valid employee_uuid (should use apiClient and include auth token)
- Test Topbar employee fetch with null employee_uuid (should skip fetch, no request made)
- Test apiClient.get() includes Authorization header for authenticated requests
- Test apiClient.get() constructs correct URL with API_BASE prefix
- Test error handling when employee fetch fails (should not trigger logout)

### Property-Based Tests

- Generate random employee UUIDs and verify all Topbar fetches use apiClient with proper authentication
- Generate random API endpoints and verify all apiClient requests include Authorization header
- Test that switching between authenticated and unauthenticated states handles requests correctly
- Verify concurrent permission checks do not interfere with employee data fetching

### Integration Tests

- Test full login flow → Topbar mount → employee fetch → permission check sequence
- Test navigation between pages after login (verify no premature logout)
- Test that Topbar displays correct employee name and photo after successful fetch
- Test that failed employee fetch (404, employee not found) does not break authentication
- Test that CORS headers are properly set for cross-origin requests with credentials
