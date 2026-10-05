# Bugfix Requirements Document

## Introduction

Users are immediately logged out after successful authentication due to a token propagation failure. Despite successful login with tokens stored in localStorage and an initial `/auth/me` call succeeding, all subsequent API calls to endpoints like `/employees/*` and `/auth/check-permission` fail with 401 Unauthorized because the Authorization header becomes undefined. This renders the application unusable as the session cannot persist beyond the first authenticated request.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user successfully logs in and the initial `/auth/me` request is made THEN the system includes the Authorization header with the JWT token and the request succeeds

1.2 WHEN subsequent API calls (e.g., `/employees/*`, `/auth/check-permission`) are made immediately after the successful `/auth/me` call THEN the system fails to include the Authorization header, resulting in backend logs showing "Authorization header: undefined" and "NO TOKEN extracted from header"

1.3 WHEN the backend receives requests without the Authorization header THEN the system returns 401 Unauthorized with error code "UNAUTHORIZED"

1.4 WHEN the frontend receives 401 Unauthorized responses with error code "UNAUTHORIZED" THEN the system triggers `forceLogout()`, clears localStorage, and redirects the user to the login page with message "Your session is invalid. Please log in again."

1.5 WHEN API calls are made through the axios-compatible wrapper methods (get, post, put, patch, delete) in `apiClient.js` THEN the system loses the Authorization header that should be automatically added by the underlying `apiRequest` function

### Expected Behavior (Correct)

2.1 WHEN a user successfully logs in and any authenticated API request is made THEN the system SHALL consistently include the Authorization header with the Bearer token from localStorage in every request

2.2 WHEN subsequent API calls are made after successful login through any API client method (get, post, put, patch, delete) THEN the system SHALL preserve and propagate the Authorization header to the underlying `apiRequest` function

2.3 WHEN the `apiRequest` function in `utils/apiClient.js` retrieves a token from localStorage THEN the system SHALL add the Authorization header to the fetch request headers object and it SHALL remain present throughout the request lifecycle

2.4 WHEN the axios-compatible wrapper methods pass headers configuration to `apiRequest` THEN the system SHALL merge the Authorization header with any custom headers provided by the caller without overwriting the token

2.5 WHEN the backend receives requests with valid Authorization headers THEN the system SHALL successfully authenticate the user and return appropriate responses instead of 401 Unauthorized

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user is not logged in and no token exists in localStorage THEN the system SHALL CONTINUE TO omit the Authorization header and allow unauthenticated requests to public endpoints

3.2 WHEN a token has genuinely expired and the backend returns error code "TOKEN_EXPIRED" THEN the system SHALL CONTINUE TO attempt token refresh using the refresh token

3.3 WHEN the backend returns terminal error codes (TOKEN_REVOKED, ACCOUNT_DEACTIVATED, INACTIVE_SESSION, INVALID_TOKEN) THEN the system SHALL CONTINUE TO trigger immediate logout without retry

3.4 WHEN custom headers are provided by API callers (e.g., Content-Type, custom application headers) THEN the system SHALL CONTINUE TO include these headers alongside the Authorization header

3.5 WHEN the `/auth/login` and `/auth/refresh` endpoints are called with `skipRefresh: true` option THEN the system SHALL CONTINUE TO skip automatic token refresh logic to prevent infinite loops

3.6 WHEN API requests track user activity by calling `updateGlobalActivity()` THEN the system SHALL CONTINUE TO update the last activity timestamp to prevent idle timeout during active use
