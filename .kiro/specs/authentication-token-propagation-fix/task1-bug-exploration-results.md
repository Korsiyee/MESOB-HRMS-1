# Task 1: Bug Condition Exploration Test Results

## Test Execution Summary

**Date**: Task 1 completed
**Test File**: `frontend/src/api/apiClient.bugCondition.test.js`
**Status**: ✅ Test created and executed successfully
**Outcome**: 6 tests FAILED as expected (confirming bug exists), 1 test PASSED (baseline)

## Test Results on UNFIXED Code

### Failed Tests (Expected - Demonstrates the Bug)

All wrapper method tests FAILED with `Error: Session expired: UNAUTHORIZED`:

1. ❌ **GET requests** - Authorization header missing → 401 Unauthorized
2. ❌ **POST requests** - Authorization header missing → 401 Unauthorized  
3. ❌ **PUT requests** - Authorization header missing → 401 Unauthorized
4. ❌ **PATCH requests** - Authorization header missing → 401 Unauthorized
5. ❌ **DELETE requests** - Authorization header missing → 401 Unauthorized
6. ❌ **GET with custom headers** - Authorization header missing → 401 Unauthorized

### Passed Test (Expected - Confirms Bug Isolation)

7. ✅ **BASELINE: Direct apiRequest() call** - Authorization header IS present → Authentication succeeds

## Counterexamples Documented

### What the Tests Revealed

The bug exploration tests confirmed the following counterexamples on unfixed code:

1. **Token Exists in localStorage**: Valid JWT token `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` is present
2. **Wrapper Methods Fail**: All axios-compatible wrapper methods (GET, POST, PUT, PATCH, DELETE) result in 401 Unauthorized
3. **Backend Receives No Token**: Backend simulation shows "Authorization header: undefined"
4. **forceLogout() Triggered**: The error code "UNAUTHORIZED" triggers immediate logout
5. **Direct Calls Work**: Direct `apiRequest()` calls correctly include the Authorization header

### Error Stack Traces

All failed tests show the same pattern:

```
Error: Session expired: UNAUTHORIZED
 ❯ forceLogout src/utils/apiClient.js:76:9
 ❯ apiRequest src/utils/apiClient.js:176:7
 ❯ ApiClient.[method] src/api/apiClient.js:[line]
```

This confirms:
- The token is being checked in `apiRequest()`
- Authorization header is missing when fetch is called
- Backend returns 401 Unauthorized
- `forceLogout()` is triggered

### Root Cause Analysis

Based on the test results and code inspection:

**Location of Bug**: `frontend/src/api/apiClient.js` - Axios-compatible wrapper methods

**Issue**: The wrapper methods extract `headers` from the config object and pass them to `apiRequest()`, but the headers are not being properly merged with the Authorization header that `apiRequest()` adds.

**Specific Problem**: 
- In `apiClient.js`, each wrapper method does: `const { headers, ...options } = config;`
- Then calls: `await apiRequest(url, { method: 'GET', headers, ...options })`
- The `headers` object passed to `apiRequest()` does NOT contain the Authorization header yet
- In `apiRequest()` (`utils/apiClient.js`), the code does:
  ```javascript
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  ```
- The Authorization header is added AFTER:
  ```javascript
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  ```
- However, when fetch is called with `{ headers, ...options }`, if `options` also contains a `headers` property, it overwrites the merged headers object
- **The bug is that the spread operator `...options` comes AFTER the `headers` property in the fetch call, causing any headers in `options` to overwrite the Authorization header**

### Expected Behavior vs Actual Behavior

| Scenario | Expected | Actual | Result |
|----------|----------|--------|--------|
| GET request with token | Authorization: Bearer {token} | Authorization: undefined | ❌ 401 |
| POST request with token | Authorization: Bearer {token} | Authorization: undefined | ❌ 401 |
| PUT request with token | Authorization: Bearer {token} | Authorization: undefined | ❌ 401 |
| PATCH request with token | Authorization: Bearer {token} | Authorization: undefined | ❌ 401 |
| DELETE request with token | Authorization: Bearer {token} | Authorization: undefined | ❌ 401 |
| GET with custom headers + token | Both headers present | Only Authorization missing | ❌ 401 |
| Direct apiRequest() with token | Authorization: Bearer {token} | Authorization: Bearer {token} | ✅ 200 |

## Test File Location

- **Path**: `frontend/src/api/apiClient.bugCondition.test.js`
- **Lines of Code**: ~400 lines
- **Test Framework**: Vitest
- **Mocking**: localStorage, fetch, window.location, updateGlobalActivity

## Key Test Features

1. **Comprehensive Coverage**: Tests all 5 HTTP methods (GET, POST, PUT, PATCH, DELETE)
2. **Custom Headers Test**: Verifies both Authorization and custom headers should coexist
3. **Baseline Test**: Confirms direct apiRequest() calls work correctly
4. **Extensive Logging**: Added console.log statements to trace header flow
5. **Backend Simulation**: Mock fetch simulates backend behavior and logs received headers
6. **Isolated Testing**: Mocks external dependencies to isolate the bug

## Next Steps

- ✅ Task 1 Complete: Bug condition exploration test created and executed
- ⏭️ Task 2: Write preservation property tests (BEFORE implementing fix)
- ⏭️ Task 3: Implement the fix to propagate Authorization headers
- ⏭️ Task 4: Verify bug exploration test passes after fix
- ⏭️ Task 5: Verify preservation tests still pass after fix

## Validation

The test results confirm:
- **Bug exists**: Authorization headers are lost in wrapper methods ✅
- **Bug is isolated**: Direct apiRequest() calls work correctly ✅
- **All wrapper methods affected**: GET, POST, PUT, PATCH, DELETE all fail ✅
- **Custom headers also affected**: Even when providing custom headers, Authorization is still missing ✅

**Task 1 Status**: ✅ COMPLETE - Bug exploration test successfully demonstrates the bug on unfixed code
