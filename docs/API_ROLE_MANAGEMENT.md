# Role Management API Documentation

## Overview

This document describes the unified Role Management API (`/api/role-management/*`), which provides a comprehensive Permission-based RBAC (Role-Based Access Control) system for the Mesob HRMS application.

**Base URL:** `/api/role-management`

**Authentication:** All endpoints require JWT authentication via the `Authorization: Bearer <token>` header.

**Authorization:** Most endpoints require specific permissions as documented for each endpoint.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Concepts](#core-concepts)
3. [API Endpoints](#api-endpoints)
   - [Roles](#roles)
   - [Permissions & Resources](#permissions--resources)
   - [Permission Assignment](#permission-assignment)
   - [Scope Assignment](#scope-assignment)
   - [User Role Assignment](#user-role-assignment)
   - [User Permission Overrides](#user-permission-overrides)
   - [User Scope Overrides](#user-scope-overrides)
   - [Permission Delegations](#permission-delegations)
   - [User Permission Info](#user-permission-info)
   - [Audit Logs](#audit-logs)
4. [Common Response Format](#common-response-format)
5. [Error Handling](#error-handling)

---

## Architecture Overview

The Permission-based RBAC system follows this hierarchy:

```
Resources (System Modules)
    ↓
Permissions (Granular Actions)
    ↓
Role_Permissions (Assigned to Roles)
    ↓
DataScopes (Access Level Configuration)
    ↓
Users (via Roles table)
```

### Database Schema

The system uses the following core tables:

- **Resources**: System modules/resources (e.g., Employees, Attendance, Roles)
- **Permissions**: Granular permissions (e.g., Employees.View, Employees.Create)
- **Roles**: User roles (e.g., ADMIN, HR_MANAGER, EMPLOYEE)
- **Role_Permissions**: Maps roles to permissions
- **DataScopes**: Access scope levels (ALL, ORGANIZATION, DEPARTMENT, OWN)
- **Role_Permission_Scopes**: Maps role-permissions to data scopes

---

## Core Concepts

### Resources

System modules that can be protected. Examples:
- `Employees`
- `Attendance`
- `Roles`
- `Departments`

### Permissions

Granular actions on resources. Format: `Resource.Action`

Examples:
- `Employees.View` - View employee records
- `Employees.Create` - Create new employees
- `Roles.AssignPermissions` - Assign permissions to roles
- `Attendance.CheckIn` - Check-in attendance

### Roles

Named collections of permissions. Two types:
- **System Roles**: Predefined roles (ADMIN, HR_MANAGER, etc.) that cannot be deleted
- **Custom Roles**: User-created roles that can be fully managed

### Data Scopes

Define the level of data access for a permission:
- **ALL**: Access all records in the system
- **ORGANIZATION**: Access records in the user's organization
- **DEPARTMENT**: Access records in the user's department
- **OWN**: Access only the user's own records

### Permission Overrides

Temporary or permanent permission modifications for specific users:
- **GRANT**: Give a user additional permissions beyond their role
- **REVOKE**: Remove specific permissions from a user's role

### Permission Delegations

Temporary transfer of permissions from one user to another with start and end dates.

---

## API Endpoints

### Roles

#### Get All Roles

```http
GET /api/role-management/roles
```

**Required Permission:** `Roles.View`

**Query Parameters:**
- `includeInactive` (boolean, optional): Include inactive roles (default: false)
- `systemOnly` (boolean, optional): Return only system roles
- `customOnly` (boolean, optional): Return only custom roles

**Response:**
```json
{
  "success": true,
  "message": "Roles retrieved successfully",
  "data": {
    "roles": [
      {
        "uuid": "550e8400-e29b-41d4-a716-446655440000",
        "code": "ADMIN",
        "name": "Administrator",
        "description": "System administrator with full access",
        "hierarchy_level": 1,
        "is_system_role": true,
        "is_active": true,
        "created_at": "2024-01-15T10:30:00Z",
        "updated_at": "2024-01-15T10:30:00Z"
      }
    ]
  }
}
```

---

#### Get Role Details

```http
GET /api/role-management/roles/:roleUuid
```

**Required Permission:** `Roles.View`

**URL Parameters:**
- `roleUuid` (UUID, required): The role's UUID

**Response:**
```json
{
  "success": true,
  "message": "Role details retrieved successfully",
  "data": {
    "role": {
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "code": "HR_MANAGER",
      "name": "HR Manager",
      "description": "Human Resources Manager",
      "hierarchy_level": 3,
      "is_system_role": true,
      "is_active": true,
      "permissions": [
        {
          "permission_uuid": "660e8400-e29b-41d4-a716-446655440001",
          "permission_code": "Employees.View",
          "resource_name": "Employees",
          "action": "View",
          "data_scope": "DEPARTMENT",
          "scope_configuration": null
        },
        {
          "permission_uuid": "660e8400-e29b-41d4-a716-446655440002",
          "permission_code": "Employees.Create",
          "resource_name": "Employees",
          "action": "Create",
          "data_scope": null,
          "scope_configuration": null
        }
      ],
      "user_count": 15
    }
  }
}
```

---

#### Create Role

```http
POST /api/role-management/roles
```

**Required Permission:** `Roles.Create`

**Request Body:**
```json
{
  "code": "DEPT_MANAGER",
  "name": "Department Manager",
  "description": "Manages a specific department",
  "hierarchyLevel": 5
}
```

**Request Fields:**
- `code` (string, required): Unique role code (uppercase, underscores only)
- `name` (string, required): Display name for the role
- `description` (string, optional): Role description
- `hierarchyLevel` (number, optional): Hierarchy level (lower = higher authority)

**Response:**
```json
{
  "success": true,
  "message": "Role created successfully",
  "data": {
    "role": {
      "uuid": "770e8400-e29b-41d4-a716-446655440003",
      "code": "DEPT_MANAGER",
      "name": "Department Manager",
      "description": "Manages a specific department",
      "hierarchy_level": 5,
      "is_system_role": false,
      "is_active": true,
      "created_at": "2024-01-20T14:25:00Z"
    }
  }
}
```

---

#### Update Role

```http
PUT /api/role-management/roles/:roleUuid
```

**Required Permission:** `Roles.Update`

**Middleware Checks:**
- User's role must be higher in hierarchy than target role
- Cannot modify system roles (is_system_role = true)

**URL Parameters:**
- `roleUuid` (UUID, required): The role's UUID

**Request Body:**
```json
{
  "name": "Department Manager (Updated)",
  "description": "Updated description",
  "hierarchyLevel": 6
}
```

**Request Fields:**
- `name` (string, optional): Updated display name
- `description` (string, optional): Updated description
- `hierarchyLevel` (number, optional): Updated hierarchy level

**Response:**
```json
{
  "success": true,
  "message": "Role updated successfully",
  "data": {
    "role": {
      "uuid": "770e8400-e29b-41d4-a716-446655440003",
      "code": "DEPT_MANAGER",
      "name": "Department Manager (Updated)",
      "description": "Updated description",
      "hierarchy_level": 6,
      "is_system_role": false,
      "is_active": true,
      "updated_at": "2024-01-20T15:00:00Z"
    }
  }
}
```

---

#### Delete Role

```http
DELETE /api/role-management/roles/:roleUuid
```

**Required Permission:** `Roles.Delete`

**Middleware Checks:**
- User's role must be higher in hierarchy than target role
- Cannot delete system roles
- Cannot delete roles that have users assigned

**URL Parameters:**
- `roleUuid` (UUID, required): The role's UUID

**Response:**
```json
{
  "success": true,
  "message": "Role deleted successfully"
}
```

---

#### Set Role Status

```http
PATCH /api/role-management/roles/:roleUuid/status
```

**Required Permission:** `Roles.Update`

**Middleware Checks:**
- User's role must be higher in hierarchy than target role

**URL Parameters:**
- `roleUuid` (UUID, required): The role's UUID

**Request Body:**
```json
{
  "is_active": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Role deactivated successfully",
  "data": {
    "role": {
      "uuid": "770e8400-e29b-41d4-a716-446655440003",
      "is_active": false
    }
  }
}
```

---

#### Get Role Users

```http
GET /api/role-management/roles/:roleUuid/users
```

**Required Permissions:** `Roles.View` AND `Accounts.View`

**URL Parameters:**
- `roleUuid` (UUID, required): The role's UUID

**Response:**
```json
{
  "success": true,
  "message": "Role users retrieved successfully",
  "data": {
    "users": [
      {
        "uuid": "880e8400-e29b-41d4-a716-446655440010",
        "username": "john.doe",
        "email": "john.doe@example.com",
        "first_name": "John",
        "last_name": "Doe",
        "is_active": true
      }
    ],
    "count": 1
  }
}
```

---

### Permissions & Resources

#### Get All Permissions

```http
GET /api/role-management/permissions
```

**Required Permission:** `Roles.View`

**Response:**
```json
{
  "success": true,
  "message": "Permissions retrieved successfully",
  "data": {
    "resources": [
      {
        "resource_uuid": "990e8400-e29b-41d4-a716-446655440020",
        "resource_name": "Employees",
        "resource_code": "EMPLOYEES",
        "permissions": [
          {
            "uuid": "aa0e8400-e29b-41d4-a716-446655440030",
            "code": "Employees.View",
            "action": "View",
            "description": "View employee records"
          },
          {
            "uuid": "aa0e8400-e29b-41d4-a716-446655440031",
            "code": "Employees.Create",
            "action": "Create",
            "description": "Create new employees"
          }
        ]
      },
      {
        "resource_uuid": "990e8400-e29b-41d4-a716-446655440021",
        "resource_name": "Attendance",
        "resource_code": "ATTENDANCE",
        "permissions": [
          {
            "uuid": "aa0e8400-e29b-41d4-a716-446655440040",
            "code": "Attendance.View",
            "action": "View",
            "description": "View attendance records"
          }
        ]
      }
    ]
  }
}
```

---

#### Get All Data Scopes

```http
GET /api/role-management/scopes
```

**Required Permission:** `Roles.View`

**Response:**
```json
{
  "success": true,
  "message": "Data scopes retrieved successfully",
  "data": {
    "scopes": [
      {
        "uuid": "bb0e8400-e29b-41d4-a716-446655440050",
        "code": "ALL",
        "name": "All Records",
        "description": "Access all records in the system"
      },
      {
        "uuid": "bb0e8400-e29b-41d4-a716-446655440051",
        "code": "ORGANIZATION",
        "name": "Organization",
        "description": "Access records in user's organization"
      },
      {
        "uuid": "bb0e8400-e29b-41d4-a716-446655440052",
        "code": "DEPARTMENT",
        "name": "Department",
        "description": "Access records in user's department"
      },
      {
        "uuid": "bb0e8400-e29b-41d4-a716-446655440053",
        "code": "OWN",
        "name": "Own Records",
        "description": "Access only user's own records"
      }
    ]
  }
}
```

---

### Permission Assignment

#### Assign Single Permission to Role

```http
POST /api/role-management/roles/:roleUuid/permissions
```

**Required Permission:** `Roles.AssignPermissions`

**Middleware Checks:**
- User's role must be higher in hierarchy than target role

**URL Parameters:**
- `roleUuid` (UUID, required): The role's UUID

**Request Body:**
```json
{
  "permissionUuid": "aa0e8400-e29b-41d4-a716-446655440031"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Permission assigned successfully"
}
```

---

#### Remove Permission from Role

```http
DELETE /api/role-management/roles/:roleUuid/permissions/:permissionUuid
```

**Required Permission:** `Roles.AssignPermissions`

**Middleware Checks:**
- User's role must be higher in hierarchy than target role

**URL Parameters:**
- `roleUuid` (UUID, required): The role's UUID
- `permissionUuid` (UUID, required): The permission's UUID

**Response:**
```json
{
  "success": true,
  "message": "Permission removed successfully"
}
```

---

#### Bulk Assign Permissions to Role

```http
POST /api/role-management/roles/:roleUuid/permissions/bulk
```

**Required Permission:** `Roles.AssignPermissions`

**Middleware Checks:**
- User's role must be higher in hierarchy than target role

**URL Parameters:**
- `roleUuid` (UUID, required): The role's UUID

**Request Body:**
```json
{
  "permissionUuids": [
    "aa0e8400-e29b-41d4-a716-446655440031",
    "aa0e8400-e29b-41d4-a716-446655440032",
    "aa0e8400-e29b-41d4-a716-446655440033"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Permissions assigned successfully",
  "data": {
    "assigned": 3,
    "skipped": 0
  }
}
```

---

#### Replace All Role Permissions

```http
PUT /api/role-management/roles/:roleUuid/permissions
```

**Required Permission:** `Roles.AssignPermissions`

**Middleware Checks:**
- User's role must be higher in hierarchy than target role

**URL Parameters:**
- `roleUuid` (UUID, required): The role's UUID

**Request Body:**
```json
{
  "permissionUuids": [
    "aa0e8400-e29b-41d4-a716-446655440031",
    "aa0e8400-e29b-41d4-a716-446655440032"
  ]
}
```

**Description:** Removes all existing permissions and assigns the provided list.

**Response:**
```json
{
  "success": true,
  "message": "Role permissions updated successfully",
  "data": {
    "removed": 5,
    "assigned": 2
  }
}
```

---

### Scope Assignment

#### Assign Data Scope to Role-Permission

```http
POST /api/role-management/roles/:roleUuid/permissions/:permissionUuid/scope
```

**Required Permission:** `Roles.ManageScopes`

**Middleware Checks:**
- User's role must be higher in hierarchy than target role

**URL Parameters:**
- `roleUuid` (UUID, required): The role's UUID
- `permissionUuid` (UUID, required): The permission's UUID

**Request Body:**
```json
{
  "dataScopeUuid": "bb0e8400-e29b-41d4-a716-446655440052",
  "configuration": {
    "department_ids": [1, 2, 3]
  }
}
```

**Request Fields:**
- `dataScopeUuid` (UUID, required): The data scope UUID
- `configuration` (object, optional): Additional scope configuration (e.g., specific department IDs)

**Response:**
```json
{
  "success": true,
  "message": "Data scope assigned successfully"
}
```

---

#### Remove Data Scope from Role-Permission

```http
DELETE /api/role-management/roles/:roleUuid/permissions/:permissionUuid/scope
```

**Required Permission:** `Roles.ManageScopes`

**Middleware Checks:**
- User's role must be higher in hierarchy than target role

**URL Parameters:**
- `roleUuid` (UUID, required): The role's UUID
- `permissionUuid` (UUID, required): The permission's UUID

**Response:**
```json
{
  "success": true,
  "message": "Data scope removed successfully"
}
```

---

### User Role Assignment

#### Assign Role to User

```http
PUT /api/role-management/users/:userUuid/role
```

**Required Permission:** `Accounts.AssignRole`

**Middleware Checks:**
- User's role must be higher in hierarchy than both target user and target role
- Cannot assign a role higher than your own

**URL Parameters:**
- `userUuid` (UUID, required): The user's UUID

**Request Body:**
```json
{
  "roleUuid": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Role assigned to user successfully. User must re-login for changes to take effect."
}
```

**Important:** Users must log out and log back in for role changes to take effect.

---

### User Permission Overrides

#### Get User's Permission Overrides

```http
GET /api/role-management/users/:userUuid/overrides/permissions
```

**Required Permission:** `Accounts.View`

**URL Parameters:**
- `userUuid` (UUID, required): The user's UUID

**Response:**
```json
{
  "success": true,
  "message": "User permission overrides retrieved successfully",
  "data": {
    "overrides": [
      {
        "uuid": "cc0e8400-e29b-41d4-a716-446655440060",
        "user_uuid": "880e8400-e29b-41d4-a716-446655440010",
        "permission_uuid": "aa0e8400-e29b-41d4-a716-446655440031",
        "permission_code": "Employees.Create",
        "override_type": "GRANT",
        "reason": "Temporary access for project work",
        "expires_at": "2024-12-31T23:59:59Z",
        "created_at": "2024-01-20T10:00:00Z"
      }
    ]
  }
}
```

---

#### Add Permission Override for User

```http
POST /api/role-management/users/:userUuid/overrides/permissions
```

**Required Permission:** `Accounts.Update`

**Middleware Checks:**
- User's role must be higher in hierarchy than target user

**URL Parameters:**
- `userUuid` (UUID, required): The user's UUID

**Request Body:**
```json
{
  "permissionUuid": "aa0e8400-e29b-41d4-a716-446655440031",
  "overrideType": "GRANT",
  "reason": "Temporary access for special project",
  "expiresAt": "2024-12-31T23:59:59Z"
}
```

**Request Fields:**
- `permissionUuid` (UUID, required): The permission to grant/revoke
- `overrideType` (string, required): "GRANT" or "REVOKE"
- `reason` (string, optional): Justification for the override
- `expiresAt` (ISO 8601 datetime, optional): When the override expires

**Response:**
```json
{
  "success": true,
  "message": "Permission override added successfully",
  "data": {
    "override": {
      "uuid": "cc0e8400-e29b-41d4-a716-446655440061",
      "user_uuid": "880e8400-e29b-41d4-a716-446655440010",
      "permission_uuid": "aa0e8400-e29b-41d4-a716-446655440031",
      "override_type": "GRANT",
      "expires_at": "2024-12-31T23:59:59Z"
    }
  }
}
```

---

#### Remove Permission Override

```http
DELETE /api/role-management/overrides/permissions/:overrideUuid
```

**Required Permission:** `Accounts.Update`

**URL Parameters:**
- `overrideUuid` (UUID, required): The override's UUID

**Response:**
```json
{
  "success": true,
  "message": "Permission override removed successfully"
}
```

---

### User Scope Overrides

#### Get User's Scope Overrides

```http
GET /api/role-management/users/:userUuid/overrides/scopes
```

**Required Permission:** `Accounts.View`

**URL Parameters:**
- `userUuid` (UUID, required): The user's UUID

**Response:**
```json
{
  "success": true,
  "message": "User scope overrides retrieved successfully",
  "data": {
    "overrides": [
      {
        "uuid": "dd0e8400-e29b-41d4-a716-446655440070",
        "user_uuid": "880e8400-e29b-41d4-a716-446655440010",
        "permission_uuid": "aa0e8400-e29b-41d4-a716-446655440031",
        "permission_code": "Employees.View",
        "data_scope_uuid": "bb0e8400-e29b-41d4-a716-446655440050",
        "data_scope_code": "ALL",
        "scope_configuration": null,
        "reason": "Audit access required",
        "expires_at": "2024-06-30T23:59:59Z"
      }
    ]
  }
}
```

---

#### Add Scope Override for User

```http
POST /api/role-management/users/:userUuid/overrides/scopes
```

**Required Permission:** `Accounts.Update`

**Middleware Checks:**
- User's role must be higher in hierarchy than target user

**URL Parameters:**
- `userUuid` (UUID, required): The user's UUID

**Request Body:**
```json
{
  "permissionUuid": "aa0e8400-e29b-41d4-a716-446655440031",
  "dataScopeUuid": "bb0e8400-e29b-41d4-a716-446655440050",
  "scopeConfiguration": {
    "department_ids": [1, 5, 7]
  },
  "reason": "Temporary cross-department access",
  "expiresAt": "2024-06-30T23:59:59Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Scope override added successfully",
  "data": {
    "override": {
      "uuid": "dd0e8400-e29b-41d4-a716-446655440071",
      "user_uuid": "880e8400-e29b-41d4-a716-446655440010",
      "permission_uuid": "aa0e8400-e29b-41d4-a716-446655440031",
      "data_scope_uuid": "bb0e8400-e29b-41d4-a716-446655440050"
    }
  }
}
```

---

#### Remove Scope Override

```http
DELETE /api/role-management/overrides/scopes/:overrideUuid
```

**Required Permission:** `Accounts.Update`

**URL Parameters:**
- `overrideUuid` (UUID, required): The override's UUID

**Response:**
```json
{
  "success": true,
  "message": "Scope override removed successfully"
}
```

---

### Permission Delegations

#### Get User's Delegations

```http
GET /api/role-management/users/:userUuid/delegations
```

**Required Permission:** `Accounts.View`

**URL Parameters:**
- `userUuid` (UUID, required): The user's UUID

**Query Parameters:**
- `direction` (string, optional): "sent", "received", or "all" (default: "all")

**Response:**
```json
{
  "success": true,
  "message": "User delegations retrieved successfully",
  "data": {
    "delegations": [
      {
        "uuid": "ee0e8400-e29b-41d4-a716-446655440080",
        "from_user_uuid": "880e8400-e29b-41d4-a716-446655440010",
        "from_user_name": "John Doe",
        "to_user_uuid": "880e8400-e29b-41d4-a716-446655440011",
        "to_user_name": "Jane Smith",
        "permission_uuid": "aa0e8400-e29b-41d4-a716-446655440031",
        "permission_code": "Employees.Approve",
        "data_scope_code": "DEPARTMENT",
        "reason": "On vacation",
        "starts_at": "2024-07-01T00:00:00Z",
        "expires_at": "2024-07-15T23:59:59Z",
        "is_active": true
      }
    ]
  }
}
```

---

#### Create Delegation

```http
POST /api/role-management/delegations
```

**Required Permission:** `Accounts.Update`

**Request Body:**
```json
{
  "fromUserUuid": "880e8400-e29b-41d4-a716-446655440010",
  "toUserUuid": "880e8400-e29b-41d4-a716-446655440011",
  "permissionUuid": "aa0e8400-e29b-41d4-a716-446655440031",
  "dataScopeUuid": "bb0e8400-e29b-41d4-a716-446655440052",
  "scopeConfiguration": null,
  "reason": "Annual leave coverage",
  "startsAt": "2024-07-01T00:00:00Z",
  "expiresAt": "2024-07-15T23:59:59Z"
}
```

**Request Fields:**
- `fromUserUuid` (UUID, required): User delegating the permission
- `toUserUuid` (UUID, required): User receiving the permission
- `permissionUuid` (UUID, required): Permission to delegate
- `dataScopeUuid` (UUID, optional): Scope for the delegated permission
- `scopeConfiguration` (object, optional): Additional scope configuration
- `reason` (string, optional): Reason for delegation
- `startsAt` (ISO 8601 datetime, required): When delegation becomes active
- `expiresAt` (ISO 8601 datetime, required): When delegation expires

**Response:**
```json
{
  "success": true,
  "message": "Delegation created successfully",
  "data": {
    "delegation": {
      "uuid": "ee0e8400-e29b-41d4-a716-446655440081",
      "from_user_uuid": "880e8400-e29b-41d4-a716-446655440010",
      "to_user_uuid": "880e8400-e29b-41d4-a716-446655440011",
      "permission_uuid": "aa0e8400-e29b-41d4-a716-446655440031",
      "starts_at": "2024-07-01T00:00:00Z",
      "expires_at": "2024-07-15T23:59:59Z"
    }
  }
}
```

---

#### Revoke Delegation

```http
DELETE /api/role-management/delegations/:delegationUuid
```

**Required Permission:** `Accounts.Update`

**URL Parameters:**
- `delegationUuid` (UUID, required): The delegation's UUID

**Response:**
```json
{
  "success": true,
  "message": "Delegation revoked successfully"
}
```

---

### User Permission Info

#### Get User's Effective Permissions

```http
GET /api/role-management/users/:userUuid/effective-permissions
```

**Required Permission:** `Accounts.View`

**URL Parameters:**
- `userUuid` (UUID, required): The user's UUID

**Description:** Returns all effective permissions for a user, including role-based permissions, overrides, and active delegations.

**Response:**
```json
{
  "success": true,
  "message": "User effective permissions retrieved successfully",
  "data": {
    "role": {
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "code": "HR_MANAGER",
      "name": "HR Manager"
    },
    "permissions": [
      {
        "permission_code": "Employees.View",
        "source": "role",
        "data_scope": "DEPARTMENT"
      },
      {
        "permission_code": "Employees.Create",
        "source": "override",
        "data_scope": "ALL",
        "expires_at": "2024-12-31T23:59:59Z"
      },
      {
        "permission_code": "Attendance.Approve",
        "source": "delegation",
        "delegated_from": "John Doe",
        "expires_at": "2024-07-15T23:59:59Z"
      }
    ]
  }
}
```

---

#### Get Current User's Permissions

```http
GET /api/role-management/my-permissions
```

**Required Permission:** None (authentication only)

**Description:** Returns the authenticated user's role and permissions.

**Response:**
```json
{
  "success": true,
  "message": "Your permissions retrieved successfully",
  "data": {
    "role": {
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "code": "HR_MANAGER",
      "name": "HR Manager",
      "hierarchy_level": 3
    },
    "permissions": [
      "Employees.View",
      "Employees.Create",
      "Employees.Update",
      "Attendance.View",
      "Attendance.Approve"
    ]
  }
}
```

---

### Audit Logs

#### Get Authorization Audit Logs

```http
GET /api/role-management/audit-logs
```

**Required Permission:** `Logs.View`

**Query Parameters:**
- `limit` (number, optional): Number of records to return (default: 100)
- `offset` (number, optional): Number of records to skip (default: 0)
- `actionType` (string, optional): Filter by action type (e.g., "ASSIGN_ROLE", "GRANT_PERMISSION")
- `actorUserUuid` (UUID, optional): Filter by user who performed the action
- `targetUserUuid` (UUID, optional): Filter by user who was affected

**Response:**
```json
{
  "success": true,
  "message": "Audit logs retrieved successfully",
  "data": {
    "logs": [
      {
        "uuid": "ff0e8400-e29b-41d4-a716-446655440090",
        "action_type": "ASSIGN_ROLE",
        "actor_user_uuid": "880e8400-e29b-41d4-a716-446655440010",
        "actor_username": "admin",
        "target_user_uuid": "880e8400-e29b-41d4-a716-446655440011",
        "target_username": "jane.smith",
        "details": {
          "role_code": "HR_MANAGER",
          "role_name": "HR Manager"
        },
        "ip_address": "192.168.1.100",
        "created_at": "2024-01-20T14:30:00Z"
      }
    ],
    "pagination": {
      "total": 245,
      "limit": 100,
      "offset": 0
    }
  }
}
```

**Common Action Types:**
- `ASSIGN_ROLE` - Role assigned to user
- `GRANT_PERMISSION` - Permission granted via override
- `REVOKE_PERMISSION` - Permission revoked via override
- `CREATE_DELEGATION` - Permission delegated
- `REVOKE_DELEGATION` - Delegation revoked
- `ASSIGN_SCOPE` - Data scope assigned
- `CREATE_ROLE` - Role created
- `UPDATE_ROLE` - Role updated
- `DELETE_ROLE` - Role deleted

---

## Common Response Format

All API responses follow a consistent structure:

### Success Response

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data varies by endpoint
  }
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error message describing what went wrong",
  "error": "ERROR_CODE"
}
```

---

## Error Handling

### HTTP Status Codes

- `200 OK` - Successful GET, PUT, PATCH, DELETE requests
- `201 Created` - Successful POST requests creating new resources
- `400 Bad Request` - Invalid request parameters or body
- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - Insufficient permissions to perform action
- `404 Not Found` - Requested resource does not exist
- `409 Conflict` - Resource conflict (e.g., duplicate role code)
- `500 Internal Server Error` - Server-side error

### Common Error Codes

- `INVALID_INPUT` - Request validation failed
- `NOT_FOUND` - Resource not found
- `UNAUTHORIZED` - Authentication failed
- `FORBIDDEN` - Insufficient permissions
- `INVALID_CODE_FORMAT` - Role code format is invalid
- `SYSTEM_ROLE_MODIFICATION` - Cannot modify system roles
- `HIERARCHY_VIOLATION` - Role hierarchy rules violated
- `DUPLICATE_ENTRY` - Resource already exists

### Example Error Response

```json
{
  "success": false,
  "message": "Role code must contain only uppercase letters and underscores",
  "error": "INVALID_CODE_FORMAT"
}
```

---

## Permission Hierarchy

The following permissions are typically required for role management operations:

### Core Permissions

- **Roles.View** - View roles and their details
- **Roles.Create** - Create new custom roles
- **Roles.Update** - Update role details
- **Roles.Delete** - Delete custom roles
- **Roles.AssignPermissions** - Assign/remove permissions to/from roles
- **Roles.ManageScopes** - Manage data scopes for role permissions
- **Accounts.View** - View user accounts and their roles
- **Accounts.AssignRole** - Assign roles to users
- **Accounts.Update** - Modify user permission overrides and delegations
- **Logs.View** - View authorization audit logs

### Role Hierarchy Rules

1. Users can only modify roles **lower** in hierarchy than their own role
2. Users cannot assign roles **higher** in hierarchy than their own role
3. System roles (ADMIN, HR_MANAGER, etc.) cannot be deleted or have their code changed
4. Lower hierarchy_level values indicate higher authority (ADMIN = 1)

---

## Best Practices

### 1. Permission Naming Convention

Use the format `Resource.Action`:
- `Employees.View`
- `Employees.Create`
- `Attendance.CheckIn`

### 2. Role Code Naming

- Use UPPERCASE with underscores
- Be descriptive but concise
- Examples: `HR_MANAGER`, `DEPT_HEAD`, `PAYROLL_ADMIN`

### 3. Data Scopes

Choose the most restrictive scope necessary:
1. **OWN** - Most restrictive (user's own data only)
2. **DEPARTMENT** - Department-level access
3. **ORGANIZATION** - Organization-wide access
4. **ALL** - Least restrictive (all data)

### 4. Permission Overrides

- Always provide a clear `reason` for overrides
- Set `expiresAt` for temporary access to prevent permission creep
- Review and clean up expired overrides regularly

### 5. Delegations

- Use for temporary permission transfers (vacation coverage, leave)
- Always set both `startsAt` and `expiresAt`
- Document the reason clearly

### 6. Audit Logs

- Regularly review audit logs for suspicious activity
- Use filters to track specific users or action types
- Retain logs for compliance requirements

---

## Migration from Legacy Systems

If migrating from the old Module-based or Occupation-based RBAC systems:

### Deprecated Endpoints (DO NOT USE)

- ❌ `/api/module-role/*` - Removed (used Modules/RoleModules schema)
- ❌ `/api/rbac/*` - Removed (used Occupations/RoleOccupations schema)

### Migration Path

1. **Audit Current Permissions**: Export user roles and permissions from old system
2. **Map to New Schema**: Map old modules/occupations to new Resources and Permissions
3. **Create Roles**: Create equivalent roles in new system using POST `/api/role-management/roles`
4. **Assign Permissions**: Bulk assign permissions using PUT `/api/role-management/roles/:uuid/permissions`
5. **Assign Users**: Update user role assignments using PUT `/api/role-management/users/:uuid/role`
6. **Test Thoroughly**: Verify users can access their required resources
7. **Monitor Logs**: Watch audit logs for access denied errors

---

## Support

For questions or issues with the Role Management API, contact the development team or consult the main HRMS documentation.

**Last Updated:** January 2024  
**API Version:** 1.0
