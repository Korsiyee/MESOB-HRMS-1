/**
 * Unit tests for RBAC Service - Scope Management
 * 
 * Tests the scope management functionality added in task 1.3:
 * - Assigning data scopes to role-permission combinations
 * - Scope validation and default scope logic
 * - Scope configuration JSON storage
 * - Scope removal with default fallback
 * 
 * Validates Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7
 */

const rbacService = require('../rbacService');
const { executeQuery } = require('../../utils/dbQuery');
const { v4: uuidv4 } = require('uuid');

// Mock the database query utility
jest.mock('../../utils/dbQuery');

describe('RBAC Service - Scope Management', () => {
  // Test data
  const mockRoleUuid = uuidv4();
  const mockPermissionUuid = uuidv4();
  const mockScopeUuid = uuidv4();
  const mockActorUuid = uuidv4();
  const mockDefaultScopeUuid = uuidv4();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('assignScopeToRolePermission', () => {
    it('should assign a scope to a role-permission combination', async () => {
      // Mock role exists
      executeQuery
        .mockResolvedValueOnce([[{ uuid: mockRoleUuid, code: 'TEST_ROLE', name: 'Test Role' }]])
        // Mock permission exists
        .mockResolvedValueOnce([[{ uuid: mockPermissionUuid, code: 'Employees.View', name: 'View Employees', requires_scope: 1 }]])
        // Mock scope exists
        .mockResolvedValueOnce([[{ uuid: mockScopeUuid, code: 'DEPARTMENT', name: 'Department', hierarchy_level: 30 }]])
        // Mock role has permission
        .mockResolvedValueOnce([[{ uuid: uuidv4() }]])
        // Mock no existing scope assignment
        .mockResolvedValueOnce([[]])
        // Mock insert success
        .mockResolvedValueOnce([{ insertId: 1 }]);

      const result = await rbacService.assignScopeToRolePermission(
        mockRoleUuid,
        mockPermissionUuid,
        mockScopeUuid,
        null,
        mockActorUuid
      );

      expect(result).toHaveProperty('uuid');
      expect(result.scope_code).toBe('DEPARTMENT');
      expect(result.permission_code).toBe('Employees.View');
    });

    it('should update existing scope assignment', async () => {
      const existingAssignmentUuid = uuidv4();
      const oldScopeUuid = uuidv4();

      // Mock role exists
      executeQuery
        .mockResolvedValueOnce([[{ uuid: mockRoleUuid, code: 'TEST_ROLE', name: 'Test Role' }]])
        // Mock permission exists
        .mockResolvedValueOnce([[{ uuid: mockPermissionUuid, code: 'Employees.View', name: 'View Employees', requires_scope: 1 }]])
        // Mock new scope exists
        .mockResolvedValueOnce([[{ uuid: mockScopeUuid, code: 'ALL', name: 'All Data', hierarchy_level: 100 }]])
        // Mock role has permission
        .mockResolvedValueOnce([[{ uuid: uuidv4() }]])
        // Mock existing scope assignment
        .mockResolvedValueOnce([[{ 
          uuid: existingAssignmentUuid, 
          data_scope_uuid: oldScopeUuid,
          scope_configuration: null
        }]])
        // Mock update success
        .mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await rbacService.assignScopeToRolePermission(
        mockRoleUuid,
        mockPermissionUuid,
        mockScopeUuid,
        null,
        mockActorUuid
      );

      expect(result.uuid).toBe(existingAssignmentUuid);
      expect(result.scope_code).toBe('ALL');
    });

    it('should store scope configuration JSON', async () => {
      const scopeConfig = {
        departmentUuids: [uuidv4(), uuidv4()]
      };

      // Mock role exists
      executeQuery
        .mockResolvedValueOnce([[{ uuid: mockRoleUuid, code: 'TEST_ROLE', name: 'Test Role' }]])
        // Mock permission exists
        .mockResolvedValueOnce([[{ uuid: mockPermissionUuid, code: 'Employees.View', name: 'View Employees', requires_scope: 1 }]])
        // Mock scope exists
        .mockResolvedValueOnce([[{ uuid: mockScopeUuid, code: 'SELECTED_DEPARTMENTS', name: 'Selected Departments', hierarchy_level: 40 }]])
        // Mock role has permission
        .mockResolvedValueOnce([[{ uuid: uuidv4() }]])
        // Mock no existing scope
        .mockResolvedValueOnce([[]])
        // Mock insert success
        .mockResolvedValueOnce([{ insertId: 1 }]);

      const result = await rbacService.assignScopeToRolePermission(
        mockRoleUuid,
        mockPermissionUuid,
        mockScopeUuid,
        scopeConfig,
        mockActorUuid
      );

      expect(result.scope_configuration).toEqual(scopeConfig);
      
      // Verify JSON was stringified in the insert call
      const insertCall = executeQuery.mock.calls.find(call => 
        call[0].includes('INSERT INTO Role_Permission_Scopes')
      );
      expect(insertCall[1]).toContain(JSON.stringify(scopeConfig));
    });

    it('should throw error if role not found', async () => {
      // Mock role not exists
      executeQuery.mockResolvedValueOnce([[]]);

      await expect(
        rbacService.assignScopeToRolePermission(
          mockRoleUuid,
          mockPermissionUuid,
          mockScopeUuid,
          null,
          mockActorUuid
        )
      ).rejects.toThrow('Role not found');
    });

    it('should throw error if permission not found', async () => {
      // Mock role exists
      executeQuery
        .mockResolvedValueOnce([[{ uuid: mockRoleUuid }]])
        // Mock permission not exists
        .mockResolvedValueOnce([[]]);

      await expect(
        rbacService.assignScopeToRolePermission(
          mockRoleUuid,
          mockPermissionUuid,
          mockScopeUuid,
          null,
          mockActorUuid
        )
      ).rejects.toThrow('Permission not found');
    });

    it('should throw error if scope not found or inactive', async () => {
      // Mock role exists
      executeQuery
        .mockResolvedValueOnce([[{ uuid: mockRoleUuid }]])
        // Mock permission exists
        .mockResolvedValueOnce([[{ uuid: mockPermissionUuid, code: 'Test.Action', requires_scope: 1 }]])
        // Mock scope not exists
        .mockResolvedValueOnce([[]]);

      await expect(
        rbacService.assignScopeToRolePermission(
          mockRoleUuid,
          mockPermissionUuid,
          mockScopeUuid,
          null,
          mockActorUuid
        )
      ).rejects.toThrow('Data scope not found or inactive');
    });

    it('should throw error if permission not assigned to role', async () => {
      // Mock role exists
      executeQuery
        .mockResolvedValueOnce([[{ uuid: mockRoleUuid }]])
        // Mock permission exists
        .mockResolvedValueOnce([[{ uuid: mockPermissionUuid, code: 'Test.Action', requires_scope: 1 }]])
        // Mock scope exists
        .mockResolvedValueOnce([[{ uuid: mockScopeUuid, code: 'DEPARTMENT', hierarchy_level: 30 }]])
        // Mock role doesn't have permission
        .mockResolvedValueOnce([[]]);

      await expect(
        rbacService.assignScopeToRolePermission(
          mockRoleUuid,
          mockPermissionUuid,
          mockScopeUuid,
          null,
          mockActorUuid
        )
      ).rejects.toThrow('Permission must be assigned to role before assigning scope');
    });
  });

  describe('removeScopeFromRolePermission', () => {
    it('should remove scope from permission that does not require scope', async () => {
      const assignmentUuid = uuidv4();

      // Mock role exists
      executeQuery
        .mockResolvedValueOnce([[{ uuid: mockRoleUuid }]])
        // Mock permission exists (requires_scope: 0)
        .mockResolvedValueOnce([[{ uuid: mockPermissionUuid, code: 'Test.Action', requires_scope: 0 }]])
        // Mock existing scope assignment
        .mockResolvedValueOnce([[{ 
          uuid: assignmentUuid,
          scope_code: 'DEPARTMENT',
          scope_name: 'Department',
          scope_configuration: null
        }]])
        // Mock delete success
        .mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await rbacService.removeScopeFromRolePermission(
        mockRoleUuid,
        mockPermissionUuid,
        mockActorUuid
      );

      expect(result.removed).toBe(true);
      expect(result.defaulted_to_scope).toBeNull();
      expect(result.message).toContain('removed successfully');
    });

    it('should default to lowest hierarchy scope when permission requires scope', async () => {
      const assignmentUuid = uuidv4();

      // Mock role exists
      executeQuery
        .mockResolvedValueOnce([[{ uuid: mockRoleUuid }]])
        // Mock permission exists (requires_scope: 1)
        .mockResolvedValueOnce([[{ uuid: mockPermissionUuid, code: 'Employees.View', requires_scope: 1 }]])
        // Mock existing scope assignment (currently DEPARTMENT)
        .mockResolvedValueOnce([[{ 
          uuid: assignmentUuid,
          scope_code: 'DEPARTMENT',
          scope_name: 'Department',
          scope_configuration: null
        }]])
        // Mock get default scope (OWN)
        .mockResolvedValueOnce([[{ 
          uuid: mockDefaultScopeUuid,
          code: 'OWN',
          name: 'Own Data'
        }]])
        // Mock update success
        .mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await rbacService.removeScopeFromRolePermission(
        mockRoleUuid,
        mockPermissionUuid,
        mockActorUuid
      );

      expect(result.removed).toBe(true);
      expect(result.defaulted_to_scope).not.toBeNull();
      expect(result.defaulted_to_scope.code).toBe('OWN');
      expect(result.message).toContain('defaulted to lowest hierarchy scope');
    });

    it('should throw error if role not found', async () => {
      // Mock role not exists
      executeQuery.mockResolvedValueOnce([[]]);

      await expect(
        rbacService.removeScopeFromRolePermission(
          mockRoleUuid,
          mockPermissionUuid,
          mockActorUuid
        )
      ).rejects.toThrow('Role not found');
    });

    it('should throw error if permission not found', async () => {
      // Mock role exists
      executeQuery
        .mockResolvedValueOnce([[{ uuid: mockRoleUuid }]])
        // Mock permission not exists
        .mockResolvedValueOnce([[]]);

      await expect(
        rbacService.removeScopeFromRolePermission(
          mockRoleUuid,
          mockPermissionUuid,
          mockActorUuid
        )
      ).rejects.toThrow('Permission not found');
    });

    it('should throw error if no scope assignment found', async () => {
      // Mock role exists
      executeQuery
        .mockResolvedValueOnce([[{ uuid: mockRoleUuid }]])
        // Mock permission exists
        .mockResolvedValueOnce([[{ uuid: mockPermissionUuid, code: 'Test.Action', requires_scope: 0 }]])
        // Mock no existing scope assignment
        .mockResolvedValueOnce([[]]);

      await expect(
        rbacService.removeScopeFromRolePermission(
          mockRoleUuid,
          mockPermissionUuid,
          mockActorUuid
        )
      ).rejects.toThrow('No scope assignment found');
    });

    it('should throw error if no default scope available for required scope permission', async () => {
      const assignmentUuid = uuidv4();

      // Mock role exists
      executeQuery
        .mockResolvedValueOnce([[{ uuid: mockRoleUuid }]])
        // Mock permission exists (requires_scope: 1)
        .mockResolvedValueOnce([[{ uuid: mockPermissionUuid, code: 'Test.Action', requires_scope: 1 }]])
        // Mock existing scope assignment
        .mockResolvedValueOnce([[{ 
          uuid: assignmentUuid,
          scope_code: 'DEPARTMENT',
          scope_name: 'Department',
          scope_configuration: null
        }]])
        // Mock no default scope available
        .mockResolvedValueOnce([[]]);

      await expect(
        rbacService.removeScopeFromRolePermission(
          mockRoleUuid,
          mockPermissionUuid,
          mockActorUuid
        )
      ).rejects.toThrow('No default scope available');
    });
  });

  describe('getScopeForRolePermission', () => {
    it('should retrieve scope assignment for role-permission', async () => {
      const assignmentUuid = uuidv4();
      const scopeConfig = { departmentUuids: [uuidv4()] };

      executeQuery.mockResolvedValueOnce([[{
        assignment_uuid: assignmentUuid,
        scope_configuration: JSON.stringify(scopeConfig),
        scope_uuid: mockScopeUuid,
        scope_code: 'SELECTED_DEPARTMENTS',
        scope_name: 'Selected Departments',
        scope_description: 'Access to selected departments only',
        hierarchy_level: 40,
        scope_type: 'SELECTED_DEPARTMENTS',
        permission_code: 'Employees.View',
        permission_name: 'View Employees',
        requires_scope: 1
      }]]);

      const result = await rbacService.getScopeForRolePermission(
        mockRoleUuid,
        mockPermissionUuid
      );

      expect(result).not.toBeNull();
      expect(result.assignment_uuid).toBe(assignmentUuid);
      expect(result.scope.code).toBe('SELECTED_DEPARTMENTS');
      expect(result.scope_configuration).toEqual(scopeConfig);
      expect(result.permission.code).toBe('Employees.View');
      expect(result.permission.requires_scope).toBe(true);
    });

    it('should return null if no scope assignment exists', async () => {
      executeQuery.mockResolvedValueOnce([[]]);

      const result = await rbacService.getScopeForRolePermission(
        mockRoleUuid,
        mockPermissionUuid
      );

      expect(result).toBeNull();
    });
  });

  describe('validateScopeConfiguration', () => {
    it('should validate SELECTED_DEPARTMENTS configuration', () => {
      const validConfig = {
        departmentUuids: [uuidv4(), uuidv4()]
      };

      const result = rbacService.validateScopeConfiguration(validConfig, 'SELECTED_DEPARTMENTS');
      expect(result).toBe(true);
    });

    it('should reject SELECTED_DEPARTMENTS with empty array', () => {
      const invalidConfig = {
        departmentUuids: []
      };

      const result = rbacService.validateScopeConfiguration(invalidConfig, 'SELECTED_DEPARTMENTS');
      expect(result).toBe(false);
    });

    it('should reject SELECTED_DEPARTMENTS without departmentUuids', () => {
      const invalidConfig = {
        otherField: 'value'
      };

      const result = rbacService.validateScopeConfiguration(invalidConfig, 'SELECTED_DEPARTMENTS');
      expect(result).toBe(false);
    });

    it('should accept null configuration for any scope', () => {
      expect(rbacService.validateScopeConfiguration(null, 'ALL')).toBe(true);
      expect(rbacService.validateScopeConfiguration(null, 'DEPARTMENT')).toBe(true);
      expect(rbacService.validateScopeConfiguration(undefined, 'OWN')).toBe(true);
    });

    it('should accept empty object for non-selective scopes', () => {
      expect(rbacService.validateScopeConfiguration({}, 'ALL')).toBe(true);
      expect(rbacService.validateScopeConfiguration({}, 'DEPARTMENT')).toBe(true);
      expect(rbacService.validateScopeConfiguration({}, 'OWN')).toBe(true);
    });

    it('should reject non-object configuration', () => {
      expect(rbacService.validateScopeConfiguration('string', 'ALL')).toBe(false);
      expect(rbacService.validateScopeConfiguration(123, 'DEPARTMENT')).toBe(false);
      expect(rbacService.validateScopeConfiguration([1, 2, 3], 'OWN')).toBe(false);
    });
  });

  describe('getAllScopesForRole', () => {
    it('should retrieve all scope assignments for a role', async () => {
      const mockAssignments = [
        {
          assignment_uuid: uuidv4(),
          scope_configuration: null,
          scope_uuid: uuidv4(),
          scope_code: 'DEPARTMENT',
          scope_name: 'Department',
          hierarchy_level: 30,
          permission_uuid: uuidv4(),
          permission_code: 'Employees.View',
          permission_name: 'View Employees',
          requires_scope: 1,
          resource_uuid: uuidv4(),
          resource_code: 'Employees',
          resource_name: 'Employees'
        },
        {
          assignment_uuid: uuidv4(),
          scope_configuration: JSON.stringify({ departmentUuids: [uuidv4()] }),
          scope_uuid: uuidv4(),
          scope_code: 'SELECTED_DEPARTMENTS',
          scope_name: 'Selected Departments',
          hierarchy_level: 40,
          permission_uuid: uuidv4(),
          permission_code: 'Leave.Approve',
          permission_name: 'Approve Leave',
          requires_scope: 1,
          resource_uuid: uuidv4(),
          resource_code: 'Leave',
          resource_name: 'Leave Management'
        }
      ];

      executeQuery.mockResolvedValueOnce([mockAssignments]);

      const result = await rbacService.getAllScopesForRole(mockRoleUuid);

      expect(result).toHaveLength(2);
      expect(result[0].permission.code).toBe('Employees.View');
      expect(result[0].scope.code).toBe('DEPARTMENT');
      expect(result[0].scope_configuration).toBeNull();
      
      expect(result[1].permission.code).toBe('Leave.Approve');
      expect(result[1].scope.code).toBe('SELECTED_DEPARTMENTS');
      expect(result[1].scope_configuration).toHaveProperty('departmentUuids');
    });

    it('should return empty array if role has no scope assignments', async () => {
      executeQuery.mockResolvedValueOnce([[]]);

      const result = await rbacService.getAllScopesForRole(mockRoleUuid);

      expect(result).toEqual([]);
    });
  });
});
