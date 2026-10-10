# Bugfix Requirements Document: Role and Permission Management Consolidation

## Introduction

The Mesob HRMS system currently has duplicate and conflicting Role and Permission management implementations that prevent the system from functioning correctly. There are three separate backend controllers (moduleRoleController, rbacController, roleManagementController) and two frontend pages (RoleManagementPage in two locations) attempting to manage roles and permissions using different, incompatible database schemas and approaches. This has resulted in a broken user experience where:

- The Role Management page displays system roles but fails with errors when trying to view role details
- Permission assignments do not persist or sync between frontend and backend
- The database contains multiple conflicting RBAC table schemas applied simultaneously
- Users cannot effectively manage roles, assign permissions, or configure access control

This bugfix will consolidate all Role and Permission management functionality into a single, working implementation using the existing database schema and preserving all unrelated working code.

**Impact**: This bug completely blocks Role and Permission management functionality, preventing administrators from configuring access control in the HRMS system.

## Bug Analysis

### Current Behavior (Defect)

**Section 1: Backend Duplication and Conflicts**

1.1 WHEN accessing `/api/module-role/*` endpoints THEN the system uses `moduleRoleController` which operates on `Roles`, `Modules`, `RoleModules`, and `Scopes` tables

1.2 WHEN accessing `/api/rbac/*` endpoints THEN the system uses `rbacController` which operates on `Occupations`, `RoleOccupations`, and `EmployeeOccupations` tables

1.3 WHEN accessing `/api/role-management/*` endpoints THEN the system uses `roleManagementController` which expects `Resources`, `Permissions`, `Role_Permissions`, and related RBAC tables

1.4 WHEN the database has multiple conflicting schemas applied (schema_clean.sql with Roles/Modules, ADD_RBAC_TABLES.sql with Resources/Permissions, rbac_migration.sql with RolePermissions) THEN queries fail or return inconsistent data due to missing tables or conflicting structures

1.5 WHEN the frontend makes API calls THEN requests may go to the wrong controller endpoint, resulting in 404 errors or data mismatches

**Section 2: Frontend Duplication and Routing Issues**

2.1 WHEN navigating to `/admin/roles` THEN the route renders `RoleManagementPage.jsx` from `/pages/RoleManagementPage.jsx` which calls the `roleManagementAPI` expecting `/role-management/*` endpoints

2.2 WHEN navigating to `/rbac/roles` THEN the route renders `RoleManagementPage.jsx` from `/pages/rbac/RoleManagementPage.jsx` which calls `RbacApi` expecting `/rbac/*` endpoints

2.3 WHEN clicking the "View Details" button on a role THEN the application attempts to navigate to `/admin/roles/:uuid` and fetch role details from an endpoint that may not exist or returns incompatible data, resulting in errors

2.4 WHEN the frontend attempts to display role information THEN it renders placeholder or mock data because the backend responses do not match the expected data structure

**Section 3: Permission Assignment and Persistence Issues**

3.1 WHEN attempting to assign permissions to a role THEN the frontend may call an API endpoint that doesn't exist or uses a different data model, causing the assignment to fail silently or with errors

3.2 WHEN permissions are successfully saved to one set of tables (e.g., `Role_Permissions`) THEN they are not recognized by middleware or other components expecting data in different tables (e.g., `RoleModules`), so permissions appear not to work

3.3 WHEN the `authorize` middleware checks permissions THEN it may query tables that don't contain the expected data, resulting in incorrect authorization decisions or errors

3.4 WHEN a user logs in THEN their permissions may not load correctly because the permission resolution logic expects a different database schema than what's actually in use

**Section 4: Data Schema Inconsistency**

4.1 WHEN the application initializes THEN multiple SQL migration files (`schema_clean.sql`, `ADD_RBAC_TABLES.sql`, `rbac_migration.sql`) have been applied, creating conflicting table structures

4.2 WHEN both `RoleModules` (linking roles to modules/scopes) and `Role_Permissions` (linking roles to permissions) tables exist THEN the system doesn't know which to use as the source of truth

4.3 WHEN `Permissions` table exists alongside `Modules` table THEN the system has two different ways of representing permissions with incompatible structures

4.4 WHEN foreign key constraints reference tables that may or may not exist depending on which migration was run THEN database operations fail with constraint violations

### Expected Behavior (Correct)

**Section 2: Unified Backend Implementation**

2.1 WHEN accessing role management functionality THEN the system SHALL use a single, consolidated controller that operates on a consistent database schema

2.2 WHEN the backend processes role/permission requests THEN the system SHALL use the database tables that actually exist in the running database as the source of truth

2.3 WHEN API endpoints are called THEN the system SHALL have a single, documented set of RESTful routes at `/api/role-management/*` that handle all role and permission operations

2.4 WHEN database queries are executed THEN the system SHALL use parameterized queries against the correct, verified table names without attempting to access non-existent tables

2.5 WHEN role or permission data is retrieved THEN the system SHALL return consistent data structures that match what the frontend expects

**Section 3: Single Frontend Implementation**

3.1 WHEN users navigate to role management THEN the system SHALL provide a single route `/admin/roles` that leads to a working Role Management page

3.2 WHEN the Role Management page loads THEN the system SHALL successfully fetch and display all roles from the backend without errors

3.3 WHEN clicking "View Details" on a role THEN the system SHALL navigate to `/admin/roles/:uuid` and successfully display complete role information including assigned permissions

3.4 WHEN the frontend makes API calls THEN the system SHALL call the correct, working backend endpoints with properly formatted requests

**Section 4: Working Permission Assignment**

4.1 WHEN assigning permissions to a role through the UI THEN the system SHALL successfully save the permissions to the correct database tables

4.2 WHEN permissions are saved THEN the system SHALL immediately reflect those changes in the authorization middleware and permission checks

4.3 WHEN a user with a role logs in THEN the system SHALL correctly load all permissions associated with that role from the database

4.4 WHEN permission checks are performed THEN the system SHALL correctly determine whether the user has the required permission based on their role's assigned permissions

**Section 5: Consolidated Database Schema**

5.1 WHEN the application starts THEN the system SHALL use a single, consistent RBAC schema identified from the actual running database

5.2 WHEN determining the source of truth for role-permission mappings THEN the system SHALL query the tables that actually exist and contain data

5.3 WHEN foreign keys are referenced THEN the system SHALL only reference tables that exist in the database schema

5.4 WHEN migrations or schema updates are needed THEN the system SHALL document and provide a clear migration path from the current state to the desired state

### Unchanged Behavior (Regression Prevention)

**Section 3: Existing Module Functionality**

3.1 WHEN users access Employee, Department, Attendance, or other existing modules THEN the system SHALL CONTINUE TO function exactly as before with no changes to their behavior

3.2 WHEN authentication occurs THEN the system SHALL CONTINUE TO use the existing JWT authentication infrastructure without modification

3.3 WHEN the `authorize` middleware is used in other routes THEN the system SHALL CONTINUE TO enforce permissions correctly after the consolidation

3.4 WHEN audit logging occurs THEN the system SHALL CONTINUE TO log authorization events to `AuthorizationAuditLogs` as before

**Section 4: Database Integrity**

4.1 WHEN role and permission data exists in the database THEN the system SHALL CONTINUE TO preserve all existing role and permission assignments during consolidation

4.2 WHEN user accounts exist THEN the system SHALL CONTINUE TO preserve the link between users and their assigned roles

4.3 WHEN accessing non-RBAC tables THEN the system SHALL CONTINUE TO work with `Employees`, `Departments`, `Users`, and all other tables without any changes

4.4 WHEN querying employee permissions THEN the system SHALL CONTINUE TO respect the existing data access scope and hierarchy logic where it works

**Section 5: Working Features**

4.1 WHEN the RoleManagementPage displays system roles THEN the system SHALL CONTINUE TO show system roles correctly (this part currently works)

4.2 WHEN navigation and routing work correctly in other parts of the app THEN the system SHALL CONTINUE TO maintain those working routes

4.3 WHEN API endpoints for other modules work THEN the system SHALL CONTINUE TO function without affecting attendance, employee, or other module endpoints

4.4 WHEN frontend components not related to RBAC render THEN the system SHALL CONTINUE TO render them correctly without breaking existing UI patterns
