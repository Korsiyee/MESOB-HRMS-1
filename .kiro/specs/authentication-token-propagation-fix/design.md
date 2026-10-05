# Authentication Token Propagation Bugfix Design

## Overview

This design addresses a critical authentication bug where the Authorization header with JWT tokens is lost when API calls are made through the axios-compatible wrapper methods in `frontend/src/api/apiClient.js`. While the underlying `apiRequest()` function in `frontend/src/utils/apiClient.js` correctly retrieves tokens from localStorage and adds them to headers, the wrapper class methods fail to preserve these headers through the call chain. This results in immediate user logout after successful authentication, as all subsequent API calls return 401 Unauthorized due to missing Authorization headers.

The fix requires ensuring proper header merging in the axios-compatible wrapper methods so that the Authorization header added by `apiRequest()` is never overwritten or lost, while still allowing custom headers from callers to be included.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when authenticated API calls are made through axios-compatible wrapper methods (get, post, put, patch, delete) and the Authorization header is not propagated to the underlying `apiRequest` function
- **Property (P)**: The desired behavior - Authorization headers set by `apiRequest()` must be preserved and sent to the backend, resulting in successful authentication
- **Preservation**: Existing functionality that must remain unchanged - token refresh logic, terminal error handling, custom header support, unauthenticated requests, and activity tracking
- **apiRequest()**: The core request function in `frontend/src/utils/apiClient.js` that retrieves JWT tokens from localStorage and adds the Authorization header to fetch requests
- **ApiClient class**: The axios-compatible wrapper in `frontend/src/api/apiClient.js` that provides methods (get, post, put, patch, delete) wrapping `apiRequest()`
- **Header propagation**: The process of ensuring headers set by one function layer are preserved through subsequent function calls
- **Header merging**: Combining headers from multiple sources (default, authentication, custom) without overwriting critical headers

## Bug Details

### Bug Condition

The bug manifests when authenticated API calls are made through any of the axios-compatible wrapper methods (get, post, put, patch, delete) in the `ApiClient` class. The wrapper methods receive a `config` object that may contain custom headers, extract those headers, and pass them to `apiRequest()`. However, the current implementation does not ensure proper header merging, resulting in the Authorization header being lost somewhere in the call chain.

**Formal Specification:**
```
FUNCTION isBugCondition(request)
  INPUT: request of type {method: string, url: string, config: object}
  OUTPUT: boolean
  
  RETURN request.method IN ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
         AND authTokenExistsInLocalStorage()
         AND wrapperMethodUsed(request)
         AND NOT authorizationHeaderReachesBackend(request)
END FUNCTION
```

### Examples

- **Example 1**: After successful login, calling `apiClient.get('/employees/search', { params: { searchTerm: 'John' } })` results in backend logs showing "Authorization header: undefined" even though localStorage contains a valid authToken
  - **Expected**: Backend receives "Authorization: Bearer eyJhbG..." and authenticates successfully
  - **Actual**: Backend receives no Authorization header, returns 401 Unauthorized with "UNAUTHORIZED" error

- **Example 2**: Attempting to check permissions via `apiClient.post('/auth/check-permission', { resource: 'employees', action: 'read' })` immediately after `/auth/me` succeeds
  - **Expected**: Request includes Authorization header, backend validates token, returns permission result
  - **Actual**: No Authorization header present, backend rejects with 401, frontend triggers forceLogout()

- **Example 3**: Department head updating attendance via `apiClient.put('/attendance/123', { status: 'approved' }, { headers: { 'X-Custom-Header': 'value' } })`
  - **Expected**: Both Authorization header and X-Custom-Header are sent to backend
  - **Actual**: Authorization header is missing, only X-Custom-Header is present, request fails with 401

- **Edge Case**: Direct calls to `apiRequest()` bypassing the wrapper work correctly because headers are constructed directly within the function, demonstrating the issue is isolated to the wrapper layer

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Token retrieval from localStorage in `apiRequest()` must continue working exactly as before
- Token refresh logic when receiving "TOKEN_EXPIRED" error must continue working
- Terminal error handling (TOKEN_REVOKED, ACCOUNT_DEACTIVATED, INACTIVE_SESSION, INVALID_TOKEN) must continue triggering immediate logout
- Unauthenticated requests (when no token exists) must continue working for public endpoints
- Activity tracking via `updateGlobalActivity()` must continue preventing idle timeout
- Custom headers provided by API callers must continue being included in requests
- The `skipRefresh` option must continue preventing token refresh for login/refresh endpoints

**Scope:**
All inputs that do NOT involve authenticated API calls through the axios-compatible wrapper should be completely unaffected by this fix. This includes:
- Direct calls to `apiRequest()` function
- Unauthenticated requests to public endpoints (e.g., `/auth/login`)
- Token refresh mechanism behavior
- Error handling and forceLogout logic
- Query parameter handling in GET requests
- Request body serialization in POST/PUT/PATCH requests

## Hypothesized Root Cause

Based on the bug description and code analysis, the most likely issues are:

1. **Incomplete Header Merging in Wrapper Methods**: The axios-compatible wrapper methods extract headers from the `config` object and pass them to `apiRequest()`, but they may be overwriting the headers object that `apiRequest()` constructs. If the wrapper passes `headers: config.headers` and `apiRequest()` creates a new headers object with `{ "Content-Type": "application/json", ...(options.headers || {}) }`, the spread operator might not be preserving the Authorization header if it was meant to be added later.

2. **Order of Operations Issue**: The `apiRequest()` function adds the Authorization header AFTER constructing the initial headers object using `{ "Content-Type": "application/json", ...(options.headers || {}) }`. If the wrapper methods are passing headers in a way that causes this spread to fail or be overwritten, the Authorization header may never make it into the final fetch call.

3. **Object Reference vs Value Issue**: The wrapper methods may be passing a reference to the config.headers object that gets modified elsewhere, or the `apiRequest()` function may be mutating an object in a way that doesn't propagate back to the fetch call.

4. **Timing Issue with Token Retrieval**: Although less likely given the debug logs show tokens exist in localStorage, there could be a race condition where the token is checked but not yet set when subsequent calls are made, though the immediate nature of the failures suggests this is not the primary issue.

## Correctness Properties

Property 1: Bug Condition - Authorization Header Propagation

_For any_ authenticated API request made through the axios-compatible wrapper methods (get, post, put, patch, delete) where a valid JWT token exists in localStorage, the fixed implementation SHALL retrieve the token from localStorage, add it to the Authorization header as "Bearer {token}", and ensure this header is present in the final fetch request sent to the backend, resulting in successful authentication instead of 401 Unauthorized.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

Property 2: Preservation - Non-Wrapper Request Behavior

_For any_ API request that does NOT use the axios-compatible wrapper methods or does NOT require authentication (no token in localStorage), the fixed implementation SHALL produce exactly the same behavior as the original code, preserving direct `apiRequest()` calls, unauthenticated public endpoint access, token refresh logic, terminal error handling, activity tracking, and custom header support.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct (incomplete header merging in wrapper methods):

**File**: `frontend/src/api/apiClient.js`

**Class**: `ApiClient`

**Specific Changes**:

1. **Verify Header Passing Pattern**: Ensure that all wrapper methods (get, post, put, patch, delete) are passing the `headers` from config correctly to `apiRequest()` within the options object, not as a separate parameter or in a way that could cause overwriting

2. **Add Debug Logging**: Temporarily add console.log statements in each wrapper method to trace:
   - The headers received in config
   - The headers being passed to apiRequest()
   - Confirmation that headers are in the options object

3. **Review Header Extraction**: Check if the destructuring pattern `const { headers, ...options } = config;` is correctly preserving headers when passed to apiRequest as `{ headers, ...options }`

4. **Verify apiRequest Options Handling**: Confirm that `apiRequest(url, { method: 'GET', headers, ...options })` properly receives the headers and that the spread in `{ "Content-Type": "application/json", ...(options.headers || {}) }` correctly merges them

5. **Potential Fix Pattern**: If the issue is that headers are being passed but not merged correctly, ensure the pattern is:
   ```javascript
   await apiRequest(url, {
     method: 'GET',
     headers: headers, // or just headers if using shorthand
     ...options
   });
   ```
   This ensures headers are explicitly in the options object that apiRequest expects.

**File**: `frontend/src/utils/apiClient.js` (if issue is in apiRequest)

**Function**: `apiRequest(path, options = {})`

**Potential Changes** (if root cause is in apiRequest itself):

1. **Header Construction Verification**: Ensure the headers object construction preserves Authorization:
   ```javascript
   const headers = {
     "Content-Type": "application/json",
     ...(options.headers || {}),
   };
   
   const token = localStorage.getItem("authToken");
   if (token) {
     headers["Authorization"] = `Bearer ${token}`;
   }
   ```
   The Authorization header is added AFTER spreading options.headers, which should work correctly, but verify this is actually executing.

2. **Add Defensive Check**: Add logging to confirm the Authorization header is present in the headers object before fetch:
   ```javascript
   console.log('[apiRequest] Final headers before fetch:', Object.keys(headers));
   ```

3. **Verify Fetch Call**: Ensure the fetch call receives the headers correctly:
   ```javascript
   let response = await fetch(`${API_BASE}${path}`, {
     headers, // <-- Must be the headers object with Authorization
     ...options,
   });
   ```
   If options also contains a headers property, this could cause overwriting.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code by observing that Authorization headers are missing in backend logs, then verify the fix works correctly by confirming headers reach the backend and preserve existing functionality.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis by observing where the Authorization header is lost in the call chain.

**Test Plan**: Write test cases that make authenticated API calls through each axios-compatible wrapper method, add extensive logging in both the wrapper and `apiRequest()` to trace header presence, and run these tests on the UNFIXED code to observe failures and pinpoint the exact location where headers are lost.

**Test Cases**:
1. **GET Request Test**: Call `apiClient.get('/employees/search')` with valid token in localStorage, observe backend logs showing "Authorization header: undefined" (will fail on unfixed code)
2. **POST Request Test**: Call `apiClient.post('/auth/check-permission', { resource: 'employees', action: 'read' })` after successful login, observe missing Authorization header (will fail on unfixed code)
3. **PUT Request Test**: Call `apiClient.put('/attendance/123', { status: 'approved' })` with authentication required, observe 401 Unauthorized due to missing header (will fail on unfixed code)
4. **Custom Headers Test**: Call `apiClient.get('/employees/search', { headers: { 'X-Custom': 'value' } })`, observe if custom header is present but Authorization is missing (will fail on unfixed code)
5. **Direct apiRequest Test**: Call `apiRequest('/employees/search')` directly bypassing wrapper, observe if Authorization header IS present, confirming bug is in wrapper layer (should pass on unfixed code)

**Expected Counterexamples**:
- Backend logs show "Authorization header: undefined" for all wrapper method calls
- Backend logs show "NO TOKEN extracted from header" 
- Backend returns 401 Unauthorized with error code "UNAUTHORIZED"
- Frontend logs show token exists in localStorage but backend never receives it
- Possible causes: header merging failure in wrapper methods, options object structure mismatch, spread operator not preserving headers

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds (authenticated API calls through wrapper methods), the fixed function produces the expected behavior (Authorization header reaches backend).

**Pseudocode:**
```
FOR ALL request WHERE isBugCondition(request) DO
  result := axios_wrapper_fixed(request)
  ASSERT authorizationHeaderPresent(result.headers)
  ASSERT backendAuthenticationSucceeds(result)
  ASSERT NOT (result.status === 401 AND result.error === 'UNAUTHORIZED')
END FOR
```

**Test Plan**: After implementing the fix, run the same test cases from exploratory checking and verify:
- Backend logs show "Authorization header: Bearer eyJ..." (not undefined)
- Backend logs show "JWT verified" with user UUID
- Backend returns 200 OK (or appropriate success status) instead of 401
- Frontend does NOT trigger forceLogout()
- User session persists beyond initial `/auth/me` call

**Test Cases**:
1. **All Wrapper Methods**: Test GET, POST, PUT, PATCH, DELETE with authenticated requests
2. **With Custom Headers**: Verify Authorization header coexists with custom headers
3. **With Query Parameters**: Verify GET requests with params work correctly
4. **With Request Body**: Verify POST/PUT/PATCH with JSON body work correctly
5. **Token Refresh Scenario**: Verify that when token expires during a wrapper method call, refresh logic still works

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold (non-wrapper requests, unauthenticated requests), the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL request WHERE NOT isBugCondition(request) DO
  ASSERT apiRequest_original(request) = apiRequest_fixed(request)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for direct apiRequest calls, unauthenticated requests, and token refresh scenarios, then write property-based tests capturing that behavior and verifying it remains unchanged after the fix.

**Test Cases**:
1. **Direct apiRequest Preservation**: Call `apiRequest()` directly without wrapper, verify behavior is identical before and after fix
2. **Unauthenticated Request Preservation**: Call wrapper methods when no token exists, verify no Authorization header is added (as expected)
3. **Token Refresh Preservation**: Trigger TOKEN_EXPIRED scenario, verify refresh mechanism still works correctly
4. **Terminal Error Preservation**: Trigger TOKEN_REVOKED scenario, verify immediate logout still occurs
5. **Activity Tracking Preservation**: Verify `updateGlobalActivity()` is still called for all API requests
6. **Public Endpoint Preservation**: Verify `/auth/login` and `/auth/refresh` still work with `skipRefresh: true`

### Unit Tests

- Test each axios-compatible wrapper method (get, post, put, patch, delete) with authentication
- Test header merging when custom headers are provided alongside authentication
- Test query parameter building for GET requests with authentication
- Test request body serialization for POST/PUT/PATCH with authentication
- Test that direct `apiRequest()` calls continue working
- Test that unauthenticated requests omit Authorization header
- Test edge case: empty config object `apiClient.get(url, {})`
- Test edge case: config with empty headers `apiClient.get(url, { headers: {} })`

### Property-Based Tests

- Generate random authenticated API requests with various HTTP methods and verify Authorization header is always present
- Generate random combinations of custom headers and verify they coexist with Authorization header
- Generate random unauthenticated scenarios (no token) and verify Authorization header is never added
- Generate random token states (valid, expired, revoked) and verify appropriate handling

### Integration Tests

- Test full authentication flow: login → store token → make API call → verify success
- Test session persistence: login → navigate to dashboard → fetch employee data → verify no logout
- Test token refresh during wrapper method call: make request with expired token → verify refresh → verify retry succeeds
- Test concurrent requests through wrapper methods with authentication
- Test that mixing direct apiRequest calls and wrapper calls both work correctly
