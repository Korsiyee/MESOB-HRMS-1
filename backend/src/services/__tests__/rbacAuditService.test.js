/**
 * Tests for RBAC Audit Service
 * 
 * Tests audit logging functionality for RBAC operations
 */

const rbacAuditService = require('../rbacAuditService');
const { executeQuery } = require('../../utils/dbQuery');

// Mock the database query function
jest.mock('../../utils/dbQuery');

describe('rbacAuditService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock executeQuery to return success
    executeQuery.mockResolvedValue([]);
  });

  describe('Role CRUD Logging', () => {
    test('logRoleCreated should log role creation with correct parameters', async () => {
      const roleUuid = 'test-role-uuid';
      const roleData = {
        code: 'TEST_ROLE',
        name: 'Test Role',
        description: 'Test role description',
        hierarchy_level: 50
      };
      const actorUuid = 'test-actor-uuid';
      const ipAddress = '192.168.1.1';
      const userAgent = 'Mozilla/5.0';

      await rbacAuditService.logRoleCreated(roleUuid, roleData, actorUuid, ipAddress, userAgent);

      expect(executeQuery).toHaveBeenCalledTimes(1);
      const call = executeQuery.mock.calls[0];
      expect(call[0]).toContain('INSERT INTO AuthorizationAuditLogs');
      expect(call[1]).toEqual(expect.arrayContaining([
        expect.any(String), // uuid
        actorUuid,
        'ROLE_CREATED',
        'ROLE',
        roleUuid,
        null, // previous_value
        expect.stringContaining('TEST_ROLE'),
        'Role created',
        ipAddress,
        userAgent
      ]));
    });

    test('logRoleUpdated should log role updates with changes', async () => {
      const roleUuid = 'test-role-uuid';
      const previousData = {
        name: 'Old Name',
        description: 'Old description',
        hierarchy_level: 40
      };
      const newData = {
        name: 'New Name',
        description: 'New description',
        hierarchy_level: 50
      };
      const actorUuid = 'test-actor-uuid';

      await rbacAuditService.logRoleUpdated(roleUuid, previousData, newData, actorUuid);

      expect(executeQuery).toHaveBeenCalledTimes(1);
      const call = executeQuery.mock.calls[0];
      expect(call[1][2]).toBe('ROLE_UPDATED');
      expect(call[1][6]).toContain('Old Name');
      expect(call[1][7]).toContain('New Name');
    });

    test('logRoleDeleted should log soft delete', async () => {
      const roleUuid = 'test-role-uuid';
      const roleData = {
        code: 'TEST_ROLE',
        name: 'Test Role'
      };
      const actorUuid = 'test-actor-uuid';

      await rbacAuditService.logRoleDeleted(roleUuid, roleData, actorUuid);

      expect(executeQuery).toHaveBeenCalledTimes(1);
      const call = executeQuery.mock.calls[0];
      expect(call[1][2]).toBe('ROLE_DELETED');
      expect(call[1][8]).toContain('soft deleted');
    });

    test('logRoleStatusChanged should log status changes', async () => {
      const roleUuid = 'test-role-uuid';
      const actorUuid = 'test-actor-uuid';

      await rbacAuditService.logRoleStatusChanged(roleUuid, true, false, actorUuid);

      expect(executeQuery).toHaveBeenCalledTimes(1);
      const call = executeQuery.mock.calls[0];
      expect(call[1][2]).toBe('ROLE_STATUS_CHANGED');
      expect(call[1][6]).toBe('active');
      expect(call[1][7]).toBe('inactive');
    });
  });

  describe('Permission Assignment Logging', () => {
    test('logPermissionAssigned should log permission assignment', async () => {
      const roleUuid = 'test-role-uuid';
      const permissionUuid = 'test-perm-uuid';
      const permissionCode = 'Employees.View';
      const actorUuid = 'test-actor-uuid';

      await rbacAuditService.logPermissionAssigned(
        roleUuid,
        permissionUuid,
        permissionCode,
        null,
        null,
        actorUuid
      );

      expect(executeQuery).toHaveBeenCalledTimes(1);
      const call = executeQuery.mock.calls[0];
      expect(call[1][2]).toBe('PERMISSION_ASSIGNED');
      expect(call[1][7]).toContain('Employees.View');
    });

    test('logPermissionAssigned should include scope when provided', async () => {
      const roleUuid = 'test-role-uuid';
      const permissionUuid = 'test-perm-uuid';
      const permissionCode = 'Employees.View';
      const dataScopeUuid = 'test-scope-uuid';
      const dataScopeCode = 'DEPARTMENT';
      const actorUuid = 'test-actor-uuid';

      await rbacAuditService.logPermissionAssigned(
        roleUuid,
        permissionUuid,
        permissionCode,
        dataScopeUuid,
        dataScopeCode,
        actorUuid
      );

      expect(executeQuery).toHaveBeenCalledTimes(1);
      const call = executeQuery.mock.calls[0];
      expect(call[1][7]).toContain('DEPARTMENT');
    });

    test('logPermissionRemoved should log permission removal', async () => {
      const roleUuid = 'test-role-uuid';
      const permissionUuid = 'test-perm-uuid';
      const permissionCode = 'Employees.View';
      const actorUuid = 'test-actor-uuid';

      await rbacAuditService.logPermissionRemoved(
        roleUuid,
        permissionUuid,
        permissionCode,
        actorUuid
      );

      expect(executeQuery).toHaveBeenCalledTimes(1);
      const call = executeQuery.mock.calls[0];
      expect(call[1][2]).toBe('PERMISSION_REMOVED');
      expect(call[1][6]).toContain('Employees.View');
    });

    test('logBulkPermissionAssignment should log bulk operations', async () => {
      const roleUuid = 'test-role-uuid';
      const actorUuid = 'test-actor-uuid';

      await rbacAuditService.logBulkPermissionAssignment(
        roleUuid,
        5,
        2,
        actorUuid
      );

      expect(executeQuery).toHaveBeenCalledTimes(1);
      const call = executeQuery.mock.calls[0];
      expect(call[1][2]).toBe('BULK_PERMISSION_ASSIGNED');
      expect(call[1][7]).toContain('"assigned":5');
      expect(call[1][7]).toContain('"skipped":2');
    });

    test('logPermissionReplacement should log permission replacement', async () => {
      const roleUuid = 'test-role-uuid';
      const actorUuid = 'test-actor-uuid';

      await rbacAuditService.logPermissionReplacement(
        roleUuid,
        3,
        5,
        actorUuid
      );

      expect(executeQuery).toHaveBeenCalledTimes(1);
      const call = executeQuery.mock.calls[0];
      expect(call[1][2]).toBe('PERMISSIONS_REPLACED');
    });
  });

  describe('Scope Assignment Logging', () => {
    test('logScopeAssigned should log scope assignment', async () => {
      const roleUuid = 'test-role-uuid';
      const permissionUuid = 'test-perm-uuid';
      const permissionCode = 'Employees.View';
      const dataScopeUuid = 'test-scope-uuid';
      const dataScopeCode = 'DEPARTMENT';
      const actorUuid = 'test-actor-uuid';

      await rbacAuditService.logScopeAssigned(
        roleUuid,
        permissionUuid,
        permissionCode,
        dataScopeUuid,
        dataScopeCode,
        null,
        actorUuid
      );

      expect(executeQuery).toHaveBeenCalledTimes(1);
      const call = executeQuery.mock.calls[0];
      expect(call[1][2]).toBe('SCOPE_ASSIGNED');
      expect(call[1][7]).toContain('DEPARTMENT');
    });

    test('logScopeRemoved should log scope removal', async () => {
      const roleUuid = 'test-role-uuid';
      const permissionUuid = 'test-perm-uuid';
      const permissionCode = 'Employees.View';
      const previousScopeCode = 'DEPARTMENT';
      const actorUuid = 'test-actor-uuid';

      await rbacAuditService.logScopeRemoved(
        roleUuid,
        permissionUuid,
        permissionCode,
        previousScopeCode,
        actorUuid
      );

      expect(executeQuery).toHaveBeenCalledTimes(1);
      const call = executeQuery.mock.calls[0];
      expect(call[1][2]).toBe('SCOPE_REMOVED');
      expect(call[1][6]).toContain('DEPARTMENT');
    });

    test('logScopeUpdated should log scope changes', async () => {
      const roleUuid = 'test-role-uuid';
      const permissionUuid = 'test-perm-uuid';
      const permissionCode = 'Employees.View';
      const actorUuid = 'test-actor-uuid';

      await rbacAuditService.logScopeUpdated(
        roleUuid,
        permissionUuid,
        permissionCode,
        'DEPARTMENT',
        'ORGANIZATION',
        actorUuid
      );

      expect(executeQuery).toHaveBeenCalledTimes(1);
      const call = executeQuery.mock.calls[0];
      expect(call[1][2]).toBe('SCOPE_UPDATED');
      expect(call[1][6]).toContain('DEPARTMENT');
      expect(call[1][7]).toContain('ORGANIZATION');
    });
  });

  describe('User Role Assignment Logging', () => {
    test('logRoleAssignedToUser should log role assignment', async () => {
      const userUuid = 'test-user-uuid';
      const roleUuid = 'test-role-uuid';
      const roleCode = 'HR_MANAGER';
      const roleName = 'HR Manager';
      const actorUuid = 'test-actor-uuid';

      await rbacAuditService.logRoleAssignedToUser(
        userUuid,
        roleUuid,
        roleCode,
        roleName,
        null,
        actorUuid
      );

      expect(executeQuery).toHaveBeenCalledTimes(1);
      const call = executeQuery.mock.calls[0];
      expect(call[1][2]).toBe('ROLE_ASSIGNED');
      expect(call[1][5]).toBe(userUuid);
      expect(call[1][7]).toContain('HR_MANAGER');
    });

    test('logRoleAssignedToUser should log previous role when changed', async () => {
      const userUuid = 'test-user-uuid';
      const roleUuid = 'test-role-uuid';
      const roleCode = 'HR_MANAGER';
      const roleName = 'HR Manager';
      const previousRoleCode = 'EMPLOYEE';
      const actorUuid = 'test-actor-uuid';

      await rbacAuditService.logRoleAssignedToUser(
        userUuid,
        roleUuid,
        roleCode,
        roleName,
        previousRoleCode,
        actorUuid
      );

      expect(executeQuery).toHaveBeenCalledTimes(1);
      const call = executeQuery.mock.calls[0];
      expect(call[1][6]).toContain('EMPLOYEE');
      expect(call[1][8]).toContain('changed from');
    });

    test('logRoleRemovedFromUser should log role removal', async () => {
      const userUuid = 'test-user-uuid';
      const previousRoleCode = 'HR_MANAGER';
      const actorUuid = 'test-actor-uuid';

      await rbacAuditService.logRoleRemovedFromUser(
        userUuid,
        previousRoleCode,
        actorUuid
      );

      expect(executeQuery).toHaveBeenCalledTimes(1);
      const call = executeQuery.mock.calls[0];
      expect(call[1][2]).toBe('ROLE_REMOVED');
      expect(call[1][6]).toContain('HR_MANAGER');
    });
  });

  describe('Query Audit Logs', () => {
    test('getAuditLogs should query with pagination', async () => {
      executeQuery.mockResolvedValueOnce([[{ total: 25 }]]);
      executeQuery.mockResolvedValueOnce([[]]);

      const result = await rbacAuditService.getAuditLogs({
        page: 1,
        limit: 20
      });

      expect(executeQuery).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        logs: [],
        total: 25,
        page: 1,
        limit: 20,
        totalPages: 2
      });
    });

    test('getAuditLogs should apply filters', async () => {
      executeQuery.mockResolvedValueOnce([[{ total: 10 }]]);
      executeQuery.mockResolvedValueOnce([[]]);

      await rbacAuditService.getAuditLogs({
        actor_user_uuid: 'test-actor',
        action_type: 'ROLE_CREATED',
        resource_type: 'ROLE',
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      });

      expect(executeQuery).toHaveBeenCalledTimes(2);
      const countCall = executeQuery.mock.calls[0];
      expect(countCall[0]).toContain('WHERE');
      expect(countCall[1]).toContain('test-actor');
      expect(countCall[1]).toContain('ROLE_CREATED');
    });

    test('getAuditLogs should enforce max limit', async () => {
      executeQuery.mockResolvedValueOnce([[{ total: 5 }]]);
      executeQuery.mockResolvedValueOnce([[]]);

      await rbacAuditService.getAuditLogs({
        page: 1,
        limit: 500 // Should be capped at 100
      });

      const logsCall = executeQuery.mock.calls[1];
      expect(logsCall[1]).toContain(100);
    });
  });

  describe('Error Handling', () => {
    test('should not throw on audit logging failure', async () => {
      executeQuery.mockRejectedValue(new Error('Database error'));

      // Should not throw
      const result = await rbacAuditService.logRoleCreated(
        'test-uuid',
        { code: 'TEST', name: 'Test', description: 'Test', hierarchy_level: 50 },
        'actor-uuid'
      );

      expect(result).toBeNull();
    });

    test('should throw on query failure', async () => {
      executeQuery.mockRejectedValue(new Error('Database error'));

      await expect(
        rbacAuditService.getAuditLogs({})
      ).rejects.toThrow('Database error');
    });
  });
});
