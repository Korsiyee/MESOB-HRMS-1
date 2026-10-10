# Implementation Plan: Role Management Module

## Overview

This implementation plan transforms the role management module from two legacy implementations (roleManagementController and moduleRoleController) into a unified, modern RBAC system with exceptional UI/UX.

**IMPORTANT: Bugfix Workflow**
This consolidation follows the bugfix methodology to ensure we don't break existing functionality:
1. **Exploration Tests (Tasks 0.1)**: Write tests BEFORE consolidation to confirm the duplication bug exists
2. **Preservation Tests (Task 0.2)**: Write tests BEFORE consolidation to capture current working behavior
3. **Implementation (Tasks 1-20)**: Apply the consolidation with continuous validation

The implementation includes:

- Backend services with comprehensive RBAC business logic
- RESTful API endpoints with proper authentication and authorization
- React frontend components with accessibility features (WCAG 2.1 AA)
- Permission matrix for intuitive permission assignment
- Complete audit trail for all RBAC operations
- Legacy code cleanup and migration

The implementation follows a layered architecture with clear separation between data access, business logic, API, and presentation layers.

## Tasks

### Phase 0: Bugfix Validation (BEFORE Consolidation)

- [ ] 0.1 Write bug condition exploration test (BEFORE implementing consolidation)
  - **Property 1: Bug Condition** - Duplicate Controller API Inconsistency
  - **CRITICAL**: This test MUST demonstrate the bug exists - failure confirms duplication issues
  - **DO NOT attempt to fix the controllers when inconsistencies are found**
  - **NOTE**: This test encodes the expected unified behavior - it will validate the consolidation when it passes
  - **GOAL**: Surface counterexamples that demonstrate controller duplication causes API inconsistencies
  - **Test Approach**: Call equivalent endpoints from different controllers and document inconsistencies
  - Test that roleManagementController and moduleRoleController provide different API contracts for the same operations
  - Document the following inconsistencies:
    - Route differences: `/api/role-management/*` vs `/api/rbac/*` vs other paths
    - Response format differences: different JSON structures for same data
    - Feature availability: operations available in one controller but not the other
    - Database schema differences: incompatible table references or field names
  - Run test with CURRENT code (unfixed)
  - **EXPECTED OUTCOME**: Test FAILS or documents inconsistencies (this is correct - it proves the bug exists)
  - Document specific counterexamples found:
    - Example: "GET /api/role-management/roles returns {data: {roles: [...]}} but moduleRoleController uses different route"
    - Example: "roleManagementController uses rbacService while moduleRoleController uses direct SQL queries"
    - Example: "Permission assignment endpoints have different parameter names"
  - Mark task complete when test is written, run, and inconsistencies are documented
  - _Requirements: 9.1, 9.2 (Legacy Code Cleanup requirements)_
  - _Bug_Condition: Multiple controllers (roleManagementController, moduleRoleController, rbacController) exist with overlapping functionality_
  - _Expected_Behavior: Single unified controller at `/api/rbac/*` with consistent API contract_

- [ ] 0.2 Write preservation property tests (BEFORE implementing consolidation)
  - **Property 2: Preservation** - Existing Functionality Must Be Preserved
  - **IMPORTANT**: Follow observation-first methodology
  - **Observe behavior on CURRENT code** for all working role management operations:
    - Test creating a role via roleManagementController and observe the response format
    - Test retrieving roles and observe the data structure returned
    - Test permission assignment (if available) and observe the API contract
    - Test any other working endpoints and document their exact behavior
  - Write property-based or unit tests capturing the observed working behavior:
    - Property: "Creating a role with valid data returns 201 status and role object with uuid"
    - Property: "Retrieving all roles returns array of role objects with required fields"
    - Property: "Role response includes: uuid, code, name, description, hierarchy_level, is_system_role, is_active"
    - Property: "System roles cannot be deleted (returns 403 error)"
    - Property: "Invalid role code format is rejected with validation error"
  - Run tests on CURRENT code (before consolidation)
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - These tests will serve as regression tests during consolidation
  - Mark task complete when tests are written, run, and passing on current code
  - _Requirements: 9.7 (Maintain backward compatibility during migration)_
  - _Preservation: All currently working role management operations must continue to work after consolidation_

### Phase 1: Implementation with Continuous Validation

- [ ] 1. Set up backend service layer and database utilities
  - [ ] 1.1 Create RBAC service with role CRUD operations
    - Implement `rbacService.js` with methods for creating, reading, updating, and deleting roles
    - Add validation for role code format (uppercase + underscores)
    - Implement soft delete functionality (set is_active to false)
    - Include system role protection logic
    - Add helper methods for checking role constraints
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_
  
  - [ ] 1.2 Implement permission management in RBAC service
    - Add methods for assigning and removing permissions from roles
    - Implement bulk permission assignment with transaction support
    - Add permission replacement functionality (atomic replace all)
    - Include duplicate detection and prevention
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.7_
  
  - [ ] 1.3 Implement scope management in RBAC service
    - Add methods for assigning data scopes to role-permission combinations
    - Implement scope validation and default scope logic
    - Add scope configuration JSON storage support
    - Include scope removal with default fallback
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_
  
  - [ ] 1.4 Create audit service for RBAC operations
    - Implement `auditService.js` with logging methods for all RBAC actions
    - Add methods for role created, updated, deleted events
    - Add methods for permission assigned, removed events
    - Add methods for scope assigned, removed events
    - Add method for user role assignment events
    - Include IP address and user agent capture
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_
  
  - [ ] 1.5 Create permission service for queries
    - Implement `permissionService.js` for retrieving permissions
    - Add method to get all permissions grouped by resource
    - Add method to get permissions for a specific role
    - Add method to get all resources
    - Include proper sorting by display_order
    - _Requirements: 2.1, 7.1_
  
  - [ ] 1.6 Create scope service for data scope operations
    - Implement `scopeService.js` for scope queries
    - Add method to get all data scopes sorted by hierarchy
    - Add method to get scope for specific role-permission
    - Add method to get default scope (lowest hierarchy)
    - _Requirements: 3.1_

- [ ] 2. Checkpoint - Verify service layer
  - Ensure all services are properly structured with clear interfaces
  - Verify database queries use parameterized statements
  - **CRITICAL**: Re-run preservation tests from task 0.2 to ensure no regressions
  - Ensure all tests pass, ask the user if questions arise

- [ ] 3. Implement API endpoints and middleware
  - [ ] 3.1 Create authorization middleware
    - Implement `authorize.js` middleware with permission checking
    - Add support for AND/OR logic for multiple permissions
    - Query user's effective permissions via role
    - Return 403 Forbidden for insufficient permissions
    - _Requirements: 13.6, 13.7, 13.8, 13.9, 13.10, 13.11_
  
  - [ ] 3.2 Create role hierarchy middleware
    - Implement `roleHierarchy.js` middleware
    - Add function to check if actor can modify target role
    - Add function to prevent system role modifications
    - Include hierarchy level comparison logic
    - _Requirements: 1.6_
  
  - [ ] 3.3 Create unified role controller
    - Implement `roleController.js` consolidating legacy controllers
    - Add CRUD methods: getAllRoles, getRoleDetails, createRole, updateRole, deleteRole, setRoleStatus
    - Include proper request validation and error handling
    - Format responses with consistent structure
    - Extract actor UUID from req.user for audit trails
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.7_
  
  - [ ] 3.4 Add permission management endpoints to controller
    - Add methods: getAllPermissions, assignPermission, removePermission, bulkAssignPermissions, replacePermissions
    - Include transaction handling for bulk operations
    - Add proper validation for permission UUIDs and scope requirements
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [ ] 3.5 Add scope management endpoints to controller
    - Add methods: getAllScopes, assignScope, removeScope
    - Include scope requirement validation
    - Add scope configuration JSON handling
    - _Requirements: 3.1, 3.2, 3.4, 3.5_
  
  - [ ] 3.6 Add user role assignment endpoints to controller
    - Add methods: getRoleUsers, assignRoleToUser
    - Include role validation (exists and is_active)
    - Return re-login notification message
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  
  - [ ] 3.7 Add audit log endpoints to controller
    - Add getAuditLogs method with filtering support
    - Include pagination for large result sets
    - Join with Users and Roles for display names
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_
  
  - [ ] 3.8 Create API routes with proper middleware chain
    - Create `/api/rbac/roles` routes file
    - Wire up all controller methods to RESTful endpoints
    - Apply authorization middleware with appropriate permissions
    - Apply role hierarchy middleware where needed
    - Include rate limiting middleware
    - _Requirements: 13.6, 13.7, 13.8, 13.9, 13.10_
  
  - [ ] 3.9 Implement error handler middleware
    - Create `errorHandler.js` with consistent error response format
    - Map database errors to user-friendly messages
    - Map validation errors with field information
    - Include proper HTTP status codes
    - Log detailed errors server-side
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 11.9, 11.10_

- [ ] 4. Checkpoint - Test backend API
  - Manually test all endpoints using curl or Postman
  - Verify authorization middleware blocks unauthorized access
  - Verify audit logs are created for all operations
  - **CRITICAL**: Re-run preservation tests from task 0.2 to ensure API compatibility
  - **CRITICAL**: Re-run bug condition test from task 0.1 - it should now demonstrate unified behavior
  - Ensure all tests pass, ask the user if questions arise

- [ ] 5. Implement frontend API client
  - [ ] 5.1 Create role API client module
    - Implement `api/roleAPI.js` with Axios
    - Add methods for all role CRUD operations
    - Add methods for permission management operations
    - Add methods for scope management operations
    - Add methods for user role assignment
    - Include proper error handling with consistent structure
    - Add JWT token injection from auth context
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.2, 2.3, 2.4, 2.5, 3.2, 3.4, 3.5, 4.1, 4.3_

- [ ] 6. Implement core UI components and utilities
  - [ ] 6.1 Create reusable form components
    - Implement `FormField` component with label, error, help text
    - Implement `SearchBar` component with debouncing
    - Implement `FilterButtonGroup` component for filter options
    - Implement `SortableHeader` component for table sorting
    - All components must have proper ARIA labels
    - All components must support keyboard navigation
    - _Requirements: 5.3, 5.4, 6.2, 6.3, 10.3, 10.8_
  
  - [ ] 6.2 Create UI utility components
    - Implement `LoadingSpinner` component with ARIA live region
    - Implement `EmptyState` component for empty lists
    - Implement `Badge` component for status indicators
    - Implement `Modal` component with focus trap and ESC key support
    - Implement `Breadcrumbs` component for navigation
    - All components must meet WCAG 2.1 AA standards
    - _Requirements: 8.9, 10.3, 10.4_
  
  - [ ] 6.3 Create permission utility functions
    - Implement `utils/permissions.js` with hasPermission helper
    - Add function to check single permission
    - Add function to check multiple permissions with AND/OR logic
    - Include proper type validation
    - _Requirements: 5.7, 8.5, 8.6, 8.7_
  
  - [ ] 6.4 Create validation utility functions
    - Implement `utils/validation.js` with validateRoleCode
    - Add role code regex validation
    - Add UUID format validation
    - Add form validation helper functions
    - _Requirements: 6.2, 11.1, 11.2, 11.9_
  
  - [ ] 6.5 Create error handling utilities
    - Implement `utils/errorHandler.js` for API error handling
    - Map error codes to user-friendly messages
    - Include session expiration handling with redirect
    - Add notification display integration
    - _Requirements: 11.3, 11.4, 11.5, 11.6, 11.7, 11.8_
  
  - [ ] 6.6 Create custom hooks
    - Implement `hooks/useForm.js` for form state management
    - Include validation rules support
    - Add touched state tracking
    - Add error state management
    - Include field-level and form-level validation
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

- [ ] 7. Implement Role List View
  - [ ] 7.1 Create Role List View component
    - Implement `pages/RoleManagement/RoleListView.jsx`
    - Display roles in responsive table with all required columns
    - Include search bar with debounced filtering
    - Include filter options for system/custom roles and active/inactive status
    - Include sortable column headers
    - Include create role button with permission check
    - Display empty state when no roles exist
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.8, 5.9_
  
  - [ ] 7.2 Create Role Row component
    - Implement `RoleRow` component for table rows
    - Display role code, name, description, hierarchy level, type, user count
    - Add system role badge styling
    - Include action buttons (edit, delete) with permission checks
    - Make rows clickable to navigate to detail view
    - Include delete confirmation dialog
    - _Requirements: 5.2, 5.6, 5.7, 5.9_
  
  - [ ] 7.3 Add responsive design for mobile
    - Implement card layout for screens < 768px
    - Stack information vertically on mobile
    - Ensure touch targets are at least 44x44 pixels
    - Test on various screen sizes (320px to 2560px)
    - _Requirements: 10.1, 10.2, 10.7_
  
  - [ ] 7.4 Add accessibility features to Role List View
    - Add proper ARIA labels to all interactive elements
    - Implement keyboard navigation for table rows
    - Add skip navigation links
    - Ensure color contrast meets WCAG 2.1 AA (4.5:1)
    - Test with screen reader
    - _Requirements: 10.3, 10.4, 10.5, 10.8, 10.9, 10.10_

- [ ] 8. Implement Role Form
  - [ ] 8.1 Create Role Form component
    - Implement `pages/RoleManagement/RoleForm.jsx`
    - Add input fields for code, name, description, hierarchy_level
    - Include real-time validation for code format
    - Include field-level error display
    - Disable code field when editing existing role
    - Disable hierarchy_level when editing system role
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [ ] 8.2 Add form submission handling
    - Handle create and update operations
    - Display loading state during submission
    - Handle server-side errors (duplicate code, etc.)
    - Display success notification on save
    - Navigate to detail view on success
    - _Requirements: 6.7, 6.8, 6.9_
  
  - [ ] 8.3 Add contextual help and validation
    - Add help text for each field
    - Display validation errors below inputs
    - Provide clear explanation for hierarchy_level
    - Include save and cancel buttons with proper states
    - _Requirements: 6.6, 6.7, 6.10_
  
  - [ ] 8.4 Add accessibility features to Role Form
    - Associate labels with inputs using htmlFor
    - Add aria-describedby for help text and errors
    - Support tab key navigation in logical order
    - Add aria-invalid for fields with errors
    - Include aria-busy during submission
    - _Requirements: 10.3, 10.4, 10.8, 10.9_

- [ ] 9. Implement Role Detail View
  - [ ] 9.1 Create Role Detail View component
    - Implement `pages/RoleManagement/RoleDetailView.jsx`
    - Display complete role information with breadcrumbs
    - Show system role and inactive badges
    - Include edit and delete action buttons with permission checks
    - Hide delete button for system roles or roles with users
    - Load role details on mount
    - _Requirements: 8.1, 8.2, 8.5, 8.6, 8.9_
  
  - [ ] 9.2 Create Role Info Card component
    - Implement `RoleInfoCard` displaying role properties
    - Show code, name, description, hierarchy level, type, status
    - Display created_at and updated_at timestamps
    - Format dates in user-friendly format
    - _Requirements: 8.1, 8.8_
  
  - [ ] 9.3 Create Role Permissions Card component
    - Implement `RolePermissionsCard` displaying assigned permissions
    - Group permissions by resource
    - Display data scope for each permission
    - Include manage permissions button with permission check
    - Show empty state if no permissions assigned
    - _Requirements: 8.2, 8.3, 8.7_
  
  - [ ] 9.4 Create Role Users Card component
    - Implement `RoleUsersCard` displaying assigned users
    - Show user count and user list
    - Include link to user management (if available)
    - Paginate if user count is large
    - _Requirements: 8.4_
  
  - [ ] 9.5 Add real-time updates
    - Refresh role details after permission changes
    - Update UI when role is modified
    - Add loading states during data fetches
    - _Requirements: 8.10_

- [ ] 10. Checkpoint - Test basic role management
  - Test creating, editing, and deleting roles
  - Verify system role protections work correctly
  - Test responsive design on different screen sizes
  - **CRITICAL**: Re-run preservation tests to ensure UI preserves existing functionality
  - Ensure all tests pass, ask the user if questions arise

- [ ] 11. Implement Permission Matrix
  - [ ] 11.1 Create Permission Matrix Modal component
    - Implement `pages/RoleManagement/PermissionMatrix.jsx`
    - Load all permissions grouped by resource
    - Load all available data scopes
    - Initialize selected permissions from current role
    - Include search functionality for filtering permissions
    - _Requirements: 7.1, 7.12_
  
  - [ ] 11.2 Create Resource Section components
    - Implement resource grouping with expand/collapse
    - Display resource header with name and permission count
    - Include select all / deselect all per resource
    - Show permission checkboxes for each resource
    - _Requirements: 7.1, 7.2, 7.7_
  
  - [ ] 11.3 Implement permission checkbox interaction
    - Handle checkbox toggle with immediate state update
    - Show Scope Selector when scoped permission is checked
    - Auto-assign default scope for required scope permissions
    - Visually distinguish sensitive permissions
    - _Requirements: 7.2, 7.3, 7.4, 7.5, 7.6, 7.9_
  
  - [ ] 11.4 Create Scope Selector component
    - Implement dropdown for selecting data scope
    - Display adjacent to permissions with requires_scope
    - Show all available scopes sorted by hierarchy
    - Update scope when changed
    - _Requirements: 7.5, 7.6_
  
  - [ ] 11.5 Add bulk operations
    - Implement select all for entire resource
    - Implement deselect all for entire resource
    - Implement select all across all resources
    - Track permission count per resource
    - _Requirements: 7.7, 7.8_
  
  - [ ] 11.6 Implement save functionality
    - Build permission assignments array from selected state
    - Call replacePermissions API endpoint
    - Use atomic transaction (handled by backend)
    - Display loading state during save
    - Show success/error notifications
    - Close modal and refresh on success
    - _Requirements: 7.10, 7.11_
  
  - [ ] 11.7 Add responsive design for Permission Matrix
    - Adapt to vertical scrolling on mobile devices (< 768px)
    - Ensure modal is full screen on small devices
    - Make permission items stack vertically on mobile
    - Ensure touch targets meet minimum size
    - _Requirements: 10.1, 10.2, 10.6_
  
  - [ ] 11.8 Add accessibility features to Permission Matrix
    - Add proper ARIA labels to all checkboxes and selects
    - Implement keyboard navigation through checkboxes
    - Add aria-describedby for permission descriptions
    - Ensure focus management when modal opens/closes
    - Add ARIA live region for permission count updates
    - _Requirements: 10.3, 10.4, 10.8, 10.9_

- [ ] 12. Implement performance optimizations
  - [ ] 12.1 Add frontend caching
    - Implement `CacheService` for browser-side caching
    - Cache permission and resource metadata for 5 minutes
    - Add cache invalidation on permission changes
    - _Requirements: 12.4_
  
  - [ ] 12.2 Optimize Permission Matrix rendering
    - Use React.memo for PermissionRow components
    - Memoize permission groups to prevent re-renders
    - Implement virtual scrolling for large permission lists (if needed)
    - Debounce search input with 300ms delay
    - _Requirements: 12.6, 12.9_
  
  - [ ] 12.3 Optimize API requests
    - Implement request deduplication for concurrent requests
    - Add loading states to prevent duplicate submissions
    - Use optimistic UI updates for checkbox changes
    - Implement rollback on failure
    - _Requirements: 12.8_
  
  - [ ] 12.4 Add lazy loading
    - Lazy load Permission Matrix modal component
    - Lazy load Role Detail View if not in viewport
    - Code split large components
    - _Requirements: 12.7_
  
  - [ ] 12.5 Optimize backend queries
    - Verify database indexes exist on uuid, code, foreign keys
    - Use connection pooling for MySQL
    - Batch operations in single transactions
    - Minimize joins in list queries
    - _Requirements: 12.1, 12.2, 12.5_

- [ ] 13. Implement routing and navigation
  - [ ] 13.1 Create role management routes
    - Add routes to main app router
    - Route: `/rbac/roles` -> RoleListView
    - Route: `/rbac/roles/new` -> RoleForm (create)
    - Route: `/rbac/roles/:roleUuid` -> RoleDetailView
    - Route: `/rbac/roles/:roleUuid/edit` -> RoleForm (edit)
    - Include route guards with permission checks
    - _Requirements: 5.6, 8.9_
  
  - [ ] 13.2 Add navigation to main menu
    - Add "Role Management" menu item to admin navigation
    - Include permission check (Roles.View)
    - Add icon and proper styling
    - Highlight active menu item
    - _Requirements: 13.6_

- [ ] 14. Checkpoint - Test complete role management workflow
  - Test end-to-end role creation with permission assignment
  - Test editing roles and updating permissions
  - Test deleting roles with validation
  - Verify all permission checks work correctly
  - **CRITICAL**: Re-run bug condition test from task 0.1 - should now PASS with unified controller
  - **CRITICAL**: Re-run all preservation tests from task 0.2 - should still PASS
  - Ensure all tests pass, ask the user if questions arise

- [ ] 15. Implement legacy code cleanup (CRITICAL BUGFIX PHASE)
  - [ ] 15.1 Identify legacy controller references
    - Search codebase for imports of roleManagementController
    - Search codebase for imports of moduleRoleController
    - Search codebase for imports of rbacController
    - Identify all route definitions using legacy controllers
    - Document which functions are still in use
    - **Create migration map**: document which legacy endpoints map to new unified endpoints
    - _Requirements: 9.1, 9.2, 9.8_
  
  - [ ] 15.2 Update imports to unified controller
    - Replace legacy controller imports with new roleController
    - Update route files to use new controller methods
    - Update any middleware references
    - **Ensure route paths maintain backward compatibility** or provide redirect mappings
    - _Requirements: 9.6, 9.7_
  
  - [ ] 15.3 Remove unused legacy code
    - **BEFORE removing**: Verify bug condition test from task 0.1 passes with unified controller
    - **BEFORE removing**: Verify all preservation tests from task 0.2 still pass
    - Remove or deprecate roleManagementController
    - Remove or deprecate moduleRoleController  
    - Remove or deprecate rbacController
    - Remove unused exports from legacy controller files
    - Remove duplicate route definitions
    - Remove deprecated service methods
    - Remove orphaned UI components from old implementation
    - Add deprecation comments for temporarily retained code
    - _Requirements: 9.2, 9.3, 9.4, 9.5, 9.8_
    - _Bug_Condition: This task removes the duplicate controllers that caused the bug_
  
  - [ ] 15.4 Verify no broken references (BUGFIX VALIDATION)
    - Run ESLint to check for import errors
    - Search for undefined variables or functions
    - Test all RBAC functionality end-to-end
    - **FINAL VALIDATION**: Re-run bug condition test from task 0.1
      - **Property 1: Expected Behavior** - Unified API Contract
      - **IMPORTANT**: This is the SAME test from task 0.1
      - When this test passes, it confirms the consolidation is complete
      - **EXPECTED OUTCOME**: Test PASSES - only one controller exists with consistent API
    - **FINAL VALIDATION**: Re-run all preservation tests from task 0.2
      - **Property 2: Preservation** - No Regressions
      - **EXPECTED OUTCOME**: All tests PASS - existing functionality preserved
    - _Requirements: 9.9_

- [ ] 16. Add comprehensive error handling
  - [ ] 16.1 Enhance frontend error handling
    - Implement global error boundary component
    - Add specific error handling for role operations
    - Display user-friendly error messages
    - Add retry functionality for network errors
    - Handle session expiration with redirect
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8_
  
  - [ ] 16.2 Add validation error display
    - Show field-level errors in forms
    - Display server-side validation errors
    - Highlight invalid fields with visual indicators
    - Add ARIA invalid attributes for accessibility
    - _Requirements: 11.1, 11.2, 11.9_
  
  - [ ] 16.3 Implement backend error logging
    - Log all errors to console with full stack traces
    - Include request context (user, endpoint, params)
    - Consider integration with logging service
    - Return simplified errors to client
    - _Requirements: 11.10_

- [ ] 17. Add audit trail features
  - [ ] 17.1 Implement audit log viewing
    - Create AuditLogView component (optional, for admins)
    - Display all RBAC audit logs with filtering
    - Include actor, action, target, timestamp
    - Add pagination for large log sets
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_
  
  - [ ] 17.2 Add IP and user agent capture
    - Extract IP address from request headers
    - Extract user agent from request headers
    - Pass to audit service for all logged actions
    - _Requirements: 13.5_

- [ ] 18. Implement styling and theming
  - [ ] 18.1 Create role management styles
    - Create CSS/Tailwind styles for all components
    - Ensure consistent spacing and typography
    - Add hover states for interactive elements
    - Add focus indicators (3px outline)
    - Implement loading animations
    - _Requirements: 10.3, 10.5_
  
  - [ ] 18.2 Implement responsive breakpoints
    - Mobile: 320px - 767px (single column, cards)
    - Tablet: 768px - 1023px (adapt table, 2-column)
    - Desktop: 1024px - 1439px (full table)
    - Large Desktop: 1440px+ (max-width container)
    - _Requirements: 10.1, 10.7_
  
  - [ ] 18.3 Ensure color contrast compliance
    - Verify all text meets 4.5:1 contrast ratio
    - Verify large text meets 3:1 contrast ratio
    - Test with color contrast analyzer tool
    - Fix any failing contrast ratios
    - _Requirements: 10.5_
  
  - [ ] 18.4 Add visual indicators for states
    - Style system role badges distinctively
    - Style inactive role badges with muted colors
    - Style sensitive permissions with warning colors
    - Add loading spinners for async operations
    - _Requirements: 5.9, 7.9_

- [ ] 19. Final testing and validation
  - [ ] 19.1 Manual testing checklist
    - Test all CRUD operations for roles
    - Test permission assignment and removal
    - Test scope assignment for scoped permissions
    - Test user role assignment
    - Test system role protections
    - Test role hierarchy enforcement
    - Test all error scenarios
    - Test on multiple browsers (Chrome, Firefox, Safari)
    - Test on mobile devices (iOS, Android)
    - _Requirements: All_
  
  - [ ] 19.2 Accessibility testing
    - Test keyboard navigation through all interfaces
    - Test with screen reader (NVDA or JAWS)
    - Verify focus indicators are visible
    - Verify ARIA labels are meaningful
    - Test color contrast with analyzer
    - Verify skip navigation works
    - _Requirements: 10.3, 10.4, 10.5, 10.8, 10.9, 10.10_
  
  - [ ] 19.3 Performance testing
    - Test role list loading with 100+ roles
    - Test permission matrix with all permissions
    - Measure page load times
    - Verify caching reduces redundant requests
    - Test bulk operations with many permissions
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 12.9, 12.10_
  
  - [ ] 19.4 Security testing
    - Verify unauthorized users cannot access RBAC routes
    - Test permission checks prevent unauthorized operations
    - Test role hierarchy prevents privilege escalation
    - Verify system roles cannot be deleted
    - Test audit logs capture all operations
    - Verify JWT token is required for all endpoints
    - _Requirements: 13.6, 13.7, 13.8, 13.9, 13.10, 13.11, 13.12_

- [ ] 20. Final checkpoint and deployment preparation
  - Ensure all functionality works end-to-end
  - Verify no console errors or warnings
  - Verify legacy code is properly cleaned up
  - Document any migration steps required
  - **FINAL BUGFIX VALIDATION**:
    - ✅ Bug condition test (task 0.1) PASSES - unified controller eliminates duplication
    - ✅ All preservation tests (task 0.2) PASS - no regressions introduced
    - ✅ Only one controller exists at `/api/rbac/*`
    - ✅ All legacy controllers removed or deprecated
  - Ensure all tests pass, ask the user if questions arise

## Notes

### Bugfix Methodology

This implementation follows the **bug condition methodology** to ensure safe consolidation:

**Bug Condition (C(X))**: Multiple duplicate controllers (roleManagementController, moduleRoleController, rbacController) exist with overlapping functionality, causing API inconsistencies and maintenance burden.

**Property (P(result))**: Desired behavior is a single unified controller at `/api/rbac/*` with consistent API contract, complete RBAC functionality, and no regressions.

**Non-buggy inputs (¬C(X))**: All currently working role management operations that should be preserved after consolidation.

**Testing Strategy**:
1. **Task 0.1 (Bug Condition Exploration)**: Write tests BEFORE consolidation that demonstrate the duplication bug exists
2. **Task 0.2 (Preservation)**: Write tests BEFORE consolidation that capture all working behavior to preserve
3. **Tasks 1-20 (Implementation)**: Build unified controller with continuous validation at checkpoints
4. **Task 15.4 (Final Validation)**: Verify bug condition test passes (unified) and preservation tests still pass (no regressions)

### Implementation Notes

- The implementation uses Node.js/Express for the backend and React/Vite for the frontend
- The database schema already exists in `ADD_RBAC_TABLES.sql` and should be verified as part of setup
- All backend services should use parameterized queries to prevent SQL injection
- All frontend components should use React hooks and functional components
- Tailwind CSS is available for styling
- The project already has JWT authentication infrastructure that should be leveraged
- Permission checks should be consistent between frontend (UI hiding) and backend (enforcement)
- System roles (is_system_role = TRUE) have special protections and cannot be deleted
- All CRUD operations must be logged to AuthorizationAuditLogs for compliance
- The Permission Matrix should be the primary interface for managing role permissions
- Legacy controllers (roleManagementController, moduleRoleController, rbacController) should be deprecated carefully
- Maintain backward compatibility during migration if other systems depend on legacy endpoints
- Consider adding migration guide comments for any temporarily retained legacy code

### Controllers to Consolidate

**Keep:**
- New unified `roleController.js` at `/api/rbac/*`

**Remove/Deprecate:**
- `roleManagementController.js` (routes at `/api/role-management/*`)
- `moduleRoleController.js` (routes at `/api/module-role/*` or similar)
- `rbacController.js` (if exists with duplicate functionality)

### Migration Path

1. **Phase 0**: Document current behavior with tests (tasks 0.1, 0.2)
2. **Phase 1**: Build new unified controller and services (tasks 1-14)
3. **Phase 2**: Cleanup and validate (tasks 15-20)

## Task Dependency Graph

```json
{
  "waves": [
    {
      "id": 0,
      "description": "Phase 0: Bugfix validation (BEFORE consolidation)",
      "tasks": ["0.1", "0.2"]
    },
    {
      "id": 1,
      "description": "Phase 1: Backend services foundation",
      "tasks": ["1.1", "1.4", "1.5", "1.6"]
    },
    {
      "id": 2,
      "description": "Phase 1: Backend services - permissions and scopes",
      "tasks": ["1.2", "1.3", "3.1", "3.2"]
    },
    {
      "id": 3,
      "description": "Phase 1: Backend API layer",
      "tasks": ["3.3", "3.9", "5.1", "6.3", "6.4", "6.5"]
    },
    {
      "id": 4,
      "description": "Phase 1: API endpoints and frontend utilities",
      "tasks": ["3.4", "3.5", "3.6", "3.7", "6.1", "6.2", "6.6"]
    },
    {
      "id": 5,
      "description": "Phase 1: Routes and core UI",
      "tasks": ["3.8", "7.1", "8.1"]
    },
    {
      "id": 6,
      "description": "Phase 1: UI components development",
      "tasks": ["7.2", "8.2", "9.1"]
    },
    {
      "id": 7,
      "description": "Phase 1: UI enhancements and accessibility",
      "tasks": ["7.3", "7.4", "8.3", "8.4", "9.2", "9.3", "9.4"]
    },
    {
      "id": 8,
      "description": "Phase 1: Permission matrix foundation",
      "tasks": ["9.5", "11.1", "11.2"]
    },
    {
      "id": 9,
      "description": "Phase 1: Permission matrix interactions",
      "tasks": ["11.3", "11.4", "11.5"]
    },
    {
      "id": 10,
      "description": "Phase 1: Permission matrix completion",
      "tasks": ["11.6", "11.7", "11.8"]
    },
    {
      "id": 11,
      "description": "Phase 1: Performance optimizations",
      "tasks": ["12.1", "12.2", "12.3", "12.4", "12.5"]
    },
    {
      "id": 12,
      "description": "Phase 1: Navigation and routing",
      "tasks": ["13.1", "13.2"]
    },
    {
      "id": 13,
      "description": "Phase 2: Legacy code identification",
      "tasks": ["15.1"]
    },
    {
      "id": 14,
      "description": "Phase 2: Migration and error handling",
      "tasks": ["15.2", "16.1", "16.2", "16.3"]
    },
    {
      "id": 15,
      "description": "Phase 2: Legacy cleanup and finalization",
      "tasks": ["15.3", "17.1", "17.2", "18.1"]
    },
    {
      "id": 16,
      "description": "Phase 2: Final validation (BUGFIX VERIFICATION)",
      "tasks": ["15.4", "18.2", "18.3", "18.4"]
    },
    {
      "id": 17,
      "description": "Phase 2: Comprehensive testing",
      "tasks": ["19.1", "19.2", "19.3", "19.4"]
    }
  ]
}
```

### Critical Path

**Phase 0 (Bugfix Validation) → Phase 1 (Implementation) → Phase 2 (Cleanup & Validation)**

The critical bugfix workflow path:
1. **Task 0.1**: Document the bug (multiple duplicate controllers)
2. **Task 0.2**: Document behavior to preserve
3. **Tasks 1-14**: Build unified controller
4. **Task 15**: Cleanup legacy controllers
5. **Tasks 15.4, 20**: Final validation that bug is fixed and nothing broke
