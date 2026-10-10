/**
 * Unit Tests for RBAC Permission Service
 * 
 * Tests the permission query methods for the Role Management Module
 */

const rbacPermissionService = require('../rbacPermissionService');
const { executeQuery } = require('../../utils/dbQuery');

// Mock the database query utility
jest.mock('../../utils/dbQuery');

describe('RBAC Permission Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllPermissionsGroupedByResource', () => {
    it('should return permissions grouped by resource with proper sorting', async () => {
      // Mock resources query
      executeQuery
        .mockResolvedValueOnce([[
          {
            uuid: 'resource-1',
            code: 'Employees',
            name: 'Employees',
            description: 'Employee management',
            category: 'Core',
            display_order: 1,
            is_active: 1
          },
          {
            uuid: 'resource-2',
            code: 'Attendance',
            name: 'Attendance',
            description: 'Attendance tracking',
            category: 'Core',
            display_order: 2,
            is_active: 1
          }
        ]])
        // Mock permissions query
        .mockResolvedValueOnce([[
          {
            uuid: 'perm-1',
            resource_uuid: 'resource-1',
            code: 'Employees.View',
            action: 'View',
            name: 'View Employees',
            description: 'View employee records',
            requires_scope: 1,
            is_sensitive: 0,
            display_order: 1,
            is_active: 1
          },
          {
            uuid: 'perm-2',
            resource_uuid: 'resource-1',
            code: 'Employees.Create',
            action: 'Create',
            name: 'Create Employees',
            description: 'Create new employee records',
            requires_scope: 1,
            is_sensitive: 0,
            display_order: 2,
            is_active: 1
          },
          {
            uuid: 'perm-3',
            resource_uuid: 'resource-2',
            code: 'Attendance.View',
            action: 'View',
            name: 'View Attendance',
            description: 'View attendance records',
            requires_scope: 1,
            is_sensitive: 0,
            display_order: 1,
            is_active: 1
          }
        ]]);

      const result = await rbacPermissionService.getAllPermissionsGroupedByResource();

      expect(result).toHaveLength(2);
      expect(result[0].code).toBe('Employees');
      expect(result[0].permissions).toHaveLength(2);
      expect(result[0].permissions[0].code).toBe('Employees.View');
      expect(result[0].permissions[0].requires_scope).toBe(true);
      expect(result[1].code).toBe('Attendance');
      expect(result[1].permissions).toHaveLength(1);
    });

    it('should handle resources with no permissions', async () => {
      executeQuery
        .mockResolvedValueOnce([[
          {
            uuid: 'resource-1',
            code: 'EmptyResource',
            name: 'Empty Resource',
            description: null,
            category: 'Test',
            display_order: 1,
            is_active: 1
          }
        ]])
        .mockResolvedValueOnce([[]]);

      const result = await rbacPermissionService.getAllPermissionsGroupedByResource();

      expect(result).toHaveLength(1);
      expect(result[0].permissions).toHaveLength(0);
    });
  });

  describe('getPermissionsForRole', () => {
    it('should return permissions for a specific role with scope information', async () => {
      const roleUuid = 'role-uuid-1';
      
      executeQuery.mockResolvedValueOnce([[
        {
          permission_uuid: 'perm-1',
          code: 'Employees.View',
          action: 'View',
          name: 'View Employees',
          description: 'View employee records',
          requires_scope: 1,
          is_sensitive: 0,
          display_order: 1,
          resource_uuid: 'resource-1',
          resource_code: 'Employees',
          resource_name: 'Employees',
          resource_display_order: 1,
          scope_uuid: 'scope-1',
          scope_code: 'DEPARTMENT',
          scope_name: 'Department',
          scope_hierarchy: 50,
          scope_configuration: null,
          granted_by: 'admin-uuid',
          granted_at: new Date('2024-01-15')
        }
      ]]);

      const result = await rbacPermissionService.getPermissionsForRole(roleUuid);

      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('Employees.View');
      expect(result[0].resource.code).toBe('Employees');
      expect(result[0].scope).toBeDefined();
      expect(result[0].scope.code).toBe('DEPARTMENT');
      expect(result[0].granted_by).toBe('admin-uuid');
    });

    it('should return permissions without scope when not assigned', async () => {
      const roleUuid = 'role-uuid-1';
      
      executeQuery.mockResolvedValueOnce([[
        {
          permission_uuid: 'perm-1',
          code: 'Employees.Create',
          action: 'Create',
          name: 'Create Employees',
          description: 'Create employee records',
          requires_scope: 0,
          is_sensitive: 0,
          display_order: 2,
          resource_uuid: 'resource-1',
          resource_code: 'Employees',
          resource_name: 'Employees',
          resource_display_order: 1,
          scope_uuid: null,
          scope_code: null,
          scope_name: null,
          scope_hierarchy: null,
          scope_configuration: null,
          granted_by: 'admin-uuid',
          granted_at: new Date('2024-01-15')
        }
      ]]);

      const result = await rbacPermissionService.getPermissionsForRole(roleUuid);

      expect(result).toHaveLength(1);
      expect(result[0].scope).toBeNull();
    });

    it('should throw error when roleUuid is not provided', async () => {
      await expect(
        rbacPermissionService.getPermissionsForRole(null)
      ).rejects.toThrow('Role UUID is required');
    });
  });

  describe('getAllResources', () => {
    it('should return all active resources sorted by display_order', async () => {
      executeQuery.mockResolvedValueOnce([[
        {
          uuid: 'resource-1',
          code: 'Employees',
          name: 'Employees',
          description: 'Employee management',
          category: 'Core',
          display_order: 1,
          is_active: 1
        },
        {
          uuid: 'resource-2',
          code: 'Attendance',
          name: 'Attendance',
          description: 'Attendance tracking',
          category: 'Core',
          display_order: 2,
          is_active: 1
        }
      ]]);

      const result = await rbacPermissionService.getAllResources();

      expect(result).toHaveLength(2);
      expect(result[0].code).toBe('Employees');
      expect(result[0].is_active).toBe(true);
      expect(result[1].code).toBe('Attendance');
    });

    it('should return empty array when no resources exist', async () => {
      executeQuery.mockResolvedValueOnce([[]]);

      const result = await rbacPermissionService.getAllResources();

      expect(result).toHaveLength(0);
    });
  });

  describe('getPermissionsByResource', () => {
    it('should return all permissions for a specific resource', async () => {
      const resourceCode = 'Employees';
      
      executeQuery.mockResolvedValueOnce([[
        {
          uuid: 'perm-1',
          code: 'Employees.View',
          action: 'View',
          name: 'View Employees',
          description: 'View employee records',
          requires_scope: 1,
          is_sensitive: 0,
          display_order: 1,
          resource_uuid: 'resource-1',
          resource_code: 'Employees',
          resource_name: 'Employees'
        },
        {
          uuid: 'perm-2',
          code: 'Employees.Create',
          action: 'Create',
          name: 'Create Employees',
          description: 'Create employee records',
          requires_scope: 1,
          is_sensitive: 0,
          display_order: 2,
          resource_uuid: 'resource-1',
          resource_code: 'Employees',
          resource_name: 'Employees'
        }
      ]]);

      const result = await rbacPermissionService.getPermissionsByResource(resourceCode);

      expect(result).toHaveLength(2);
      expect(result[0].code).toBe('Employees.View');
      expect(result[1].code).toBe('Employees.Create');
    });

    it('should throw error when resourceCode is not provided', async () => {
      await expect(
        rbacPermissionService.getPermissionsByResource(null)
      ).rejects.toThrow('Resource code is required');
    });
  });

  describe('getPermissionByCode', () => {
    it('should return a single permission by code', async () => {
      const permissionCode = 'Employees.View';
      
      executeQuery.mockResolvedValueOnce([[
        {
          uuid: 'perm-1',
          code: 'Employees.View',
          action: 'View',
          name: 'View Employees',
          description: 'View employee records',
          requires_scope: 1,
          is_sensitive: 0,
          display_order: 1,
          resource_uuid: 'resource-1',
          resource_code: 'Employees',
          resource_name: 'Employees'
        }
      ]]);

      const result = await rbacPermissionService.getPermissionByCode(permissionCode);

      expect(result).toBeDefined();
      expect(result.code).toBe('Employees.View');
      expect(result.resource.code).toBe('Employees');
    });

    it('should return null when permission not found', async () => {
      executeQuery.mockResolvedValueOnce([[]]);

      const result = await rbacPermissionService.getPermissionByCode('NonExistent.Permission');

      expect(result).toBeNull();
    });

    it('should throw error when permissionCode is not provided', async () => {
      await expect(
        rbacPermissionService.getPermissionByCode(null)
      ).rejects.toThrow('Permission code is required');
    });
  });

  describe('getPermissionByUuid', () => {
    it('should return a single permission by UUID', async () => {
      const permissionUuid = 'perm-uuid-1';
      
      executeQuery.mockResolvedValueOnce([[
        {
          uuid: 'perm-uuid-1',
          code: 'Employees.View',
          action: 'View',
          name: 'View Employees',
          description: 'View employee records',
          requires_scope: 1,
          is_sensitive: 0,
          display_order: 1,
          resource_uuid: 'resource-1',
          resource_code: 'Employees',
          resource_name: 'Employees'
        }
      ]]);

      const result = await rbacPermissionService.getPermissionByUuid(permissionUuid);

      expect(result).toBeDefined();
      expect(result.uuid).toBe('perm-uuid-1');
      expect(result.code).toBe('Employees.View');
    });

    it('should return null when permission not found', async () => {
      executeQuery.mockResolvedValueOnce([[]]);

      const result = await rbacPermissionService.getPermissionByUuid('non-existent-uuid');

      expect(result).toBeNull();
    });

    it('should throw error when permissionUuid is not provided', async () => {
      await expect(
        rbacPermissionService.getPermissionByUuid(null)
      ).rejects.toThrow('Permission UUID is required');
    });
  });

  describe('getResourceByCode', () => {
    it('should return a single resource by code', async () => {
      const resourceCode = 'Employees';
      
      executeQuery.mockResolvedValueOnce([[
        {
          uuid: 'resource-1',
          code: 'Employees',
          name: 'Employees',
          description: 'Employee management',
          category: 'Core',
          display_order: 1,
          is_active: 1
        }
      ]]);

      const result = await rbacPermissionService.getResourceByCode(resourceCode);

      expect(result).toBeDefined();
      expect(result.code).toBe('Employees');
      expect(result.is_active).toBe(true);
    });

    it('should return null when resource not found', async () => {
      executeQuery.mockResolvedValueOnce([[]]);

      const result = await rbacPermissionService.getResourceByCode('NonExistent');

      expect(result).toBeNull();
    });

    it('should throw error when resourceCode is not provided', async () => {
      await expect(
        rbacPermissionService.getResourceByCode(null)
      ).rejects.toThrow('Resource code is required');
    });
  });

  describe('getResourceByUuid', () => {
    it('should return a single resource by UUID', async () => {
      const resourceUuid = 'resource-uuid-1';
      
      executeQuery.mockResolvedValueOnce([[
        {
          uuid: 'resource-uuid-1',
          code: 'Employees',
          name: 'Employees',
          description: 'Employee management',
          category: 'Core',
          display_order: 1,
          is_active: 1
        }
      ]]);

      const result = await rbacPermissionService.getResourceByUuid(resourceUuid);

      expect(result).toBeDefined();
      expect(result.uuid).toBe('resource-uuid-1');
      expect(result.code).toBe('Employees');
    });

    it('should return null when resource not found', async () => {
      executeQuery.mockResolvedValueOnce([[]]);

      const result = await rbacPermissionService.getResourceByUuid('non-existent-uuid');

      expect(result).toBeNull();
    });

    it('should throw error when resourceUuid is not provided', async () => {
      await expect(
        rbacPermissionService.getResourceByUuid(null)
      ).rejects.toThrow('Resource UUID is required');
    });
  });
});
