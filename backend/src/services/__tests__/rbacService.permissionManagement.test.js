/**
 * RBAC Service - Permission Management Tests
 * 
 * Tests for:
 * - Task 1.2: Permission management in RBAC service
 * - Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.7
 * 
 * Testing:
 * - Assigning single permissions to roles
 * - Removing permissions from roles
 * - Bulk permission assignment
 * - Permission replacement (atomic replace all)
 * - Duplicate detection and prevention
 * - Transaction support
 */

const rbacService = require('../rbacService');
const { executeQuery } = require('../../utils/dbQuery');
const { v4: uuidv4 } = require('uuid');

// Mock dependencies
jest.mock('../../utils/dbQuery');
jest.mock('../rbacAuditService', () => ({
  logPermissionAssigned: jest.fn(),
  logPermissionRemoved: jest.fn(),
  logBulkPermissionAssignment: jest.fn(),
  logPermissionReplacement: jest.fn(),
}));

describe('RBAC Service - Permission Management', () => {
  const mockRoleUuid = uuidv4();
  const mockPermissionUuid = uuidv4();
  const mockScopeUuid = uuidv4();
  const mockActorUuid = uuidv4();
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('assignPermissionToRole', () => {
    it('should assign a permission to a role without scope', async () => {
      // Requirements: 2.2, 2.7
      
      // Mock role exists
      executeQuery
        .mockResolvedValueOnce([[{ uuid: mockRoleUuid, code: 'TEST_ROLE' }]]) // getRoleByUuid
        .mockResolvedValueOnce([[{ uuid: mockPermissionUuid, code: 'Test.View', requires_scope: false }]]) // permission exists
        .mockResolvedValueOnce([[]])  // permission not assigned yet
        .mockResolvedValueOnce([])    // START TRANSACTION
        .mockResolvedValueOnce([])    // INSERT Role_Permission
        .mockResolvedValueOnce([]);   // COMMIT
      
      const result = await rbacService.assignPermissionToRole(
        mockRoleUuid,
        mockPermissionUuid,
        null,
        mockActorUuid
      );
      
      expect(result.success).toBe(true);
      expect(result.permission).toBe('Test.View');
      expect(result.scope).toBeNull();
    });
    
    it('should assign a permission with a data scope', async () => {
      // Requirements: 2.2, 2.6
      
      // Mock role exists, permission exists with scope requirement
      executeQuery
        .mockResolvedValueOnce([[{ uuid: mockRoleUuid, code: 'TEST_ROLE' }]])
        .mockResolvedValueOnce([[{ uuid: mockPermissionUuid, code: 'Test.View', requires_scope: true }]])
        .mockResolvedValueOnce([[]])  // permission not assigned
        .mockResolvedValueOnce([[{ uuid: mockScopeUuid, code: 'DEPARTMENT', name: 'Department' }]]) // scope exists
        .mockResolvedValueOnce([])    // START TRANSACTION
        .mockResolvedValueOnce([])    // INSERT Role_Permission
        .mockResolvedValueOnce([])    // INSERT Role_Permission_Scope
        .mockResolvedValueOnce([]);   // COMMIT
      
      const result = await rbacService.assignPermissionToRole(
        mockRoleUuid,
        mockPermissionUuid,
        mockScopeUuid,
        mockActorUuid
      );
      
      expect(result.success).toBe(true);
      expect(result.permission).toBe('Test.View');
      expect(result.scope).toBe('DEPARTMENT');
    });
    
    it('should reject duplicate permission assignment', async () => {
      // Requirements: 2.7 - duplicate detection
      
      executeQuery
        .mockResolvedValueOnce([[{ uuid: mockRoleUuid, code: 'TEST_ROLE' }]])
        .mockResolvedValueOnce([[{ uuid: mockPermissionUuid, code: 'Test.View', requires_scope: false }]])
        .mockResolvedValueOnce([[{ uuid: 'existing' }]]); // permission already assigned
      
      await expect(
        rbacService.assignPermissionToRole(mockRoleUuid, mockPermissionUuid, null, mockActorUuid)
      ).rejects.toThrow('already assigned');
    });
    
    it('should auto-assign default scope for scoped permissions', async () => {
      // Requirements: 2.6 - automatic default scope
      
      const mockDefaultScopeUuid = uuidv4();
      
      executeQuery
        .mockResolvedValueOnce([[{ uuid: mockRoleUuid, code: 'TEST_ROLE' }]])
        .mockResolvedValueOnce([[{ uuid: mockPermissionUuid, code: 'Test.View', requires_scope: true }]])
        .mockResolvedValueOnce([[]])  // permission not assigned
        .mockResolvedValueOnce([[{ uuid: mockDefaultScopeUuid, code: 'OWN', name: 'Own' }]]) // default scope
        .mockResolvedValueOnce([])    // START TRANSACTION
        .mockResolvedValueOnce([])    // INSERT Role_Permission
        .mockResolvedValueOnce([])    // INSERT Role_Permission_Scope
        .mockResolvedValueOnce([]);   // COMMIT
      
      const result = await rbacService.assignPermissionToRole(
        mockRoleUuid,
        mockPermissionUuid,
        null, // No scope provided
        mockActorUuid
      );
      
      expect(result.success).toBe(true);
      expect(result.scope).toBe('OWN');
    });
    
    it('should rollback on error', async () => {
      // Transaction support
      
      executeQuery
        .mockResolvedValueOnce([[{ uuid: mockRoleUuid, code: 'TEST_ROLE' }]])
        .mockResolvedValueOnce([[{ uuid: mockPermissionUuid, code: 'Test.View', requires_scope: false }]])
        .mockResolvedValueOnce([[]])  // permission not assigned
        .mockResolvedValueOnce([])    // START TRANSACTION
        .mockRejectedValueOnce(new Error('Database error')); // INSERT fails
      
      await expect(
        rbacService.assignPermissionToRole(mockRoleUuid, mockPermissionUuid, null, mockActorUuid)
      ).rejects.toThrow('Database error');
    });
  });
  
  describe('removePermissionFromRole', () => {
    it('should remove a permission from a role', async () => {
      // Requirements: 2.3
      
      executeQuery
        .mockResolvedValueOnce([[{ uuid: mockRoleUuid, code: 'TEST_ROLE' }]])
        .mockResolvedValueOnce([[{ uuid: mockPermissionUuid, code: 'Test.View', requires_scope: false }]])
        .mockResolvedValueOnce([[{ uuid: 'existing' }]]) // permission is assigned
        .mockResolvedValueOnce([])    // START TRANSACTION
        .mockResolvedValueOnce([])    // DELETE Role_Permission_Scopes
        .mockResolvedValueOnce([])    // DELETE Role_Permissions
        .mockResolvedValueOnce([]);   // COMMIT
      
      const result = await rbacService.removePermissionFromRole(
        mockRoleUuid,
        mockPermissionUuid,
        mockActorUuid
      );
      
      expect(result.success).toBe(true);
      expect(result.permission).toBe('Test.View');
    });
    
    it('should reject removal of unassigned permission', async () => {
      // Requirements: 2.3
      
      executeQuery
        .mockResolvedValueOnce([[{ uuid: mockRoleUuid, code: 'TEST_ROLE' }]])
        .mockResolvedValueOnce([[{ uuid: mockPermissionUuid, code: 'Test.View', requires_scope: false }]])
        .mockResolvedValueOnce([[]]); // permission not assigned
      
      await expect(
        rbacService.removePermissionFromRole(mockRoleUuid, mockPermissionUuid, mockActorUuid)
      ).rejects.toThrow('not assigned');
    });
  });
  
  describe('bulkAssignPermissions', () => {
    it('should assign multiple permissions in bulk', async () => {
      // Requirements: 2.4, 2.7
      
      const perm1Uuid = uuidv4();
      const perm2Uuid = uuidv4();
      
      executeQuery
        .mockResolvedValueOnce([[{ uuid: mockRoleUuid, code: 'TEST_ROLE' }]]) // role exists
        .mockResolvedValueOnce([])    // START TRANSACTION
        // Permission 1
        .mockResolvedValueOnce([[{ uuid: perm1Uuid, code: 'Test.View', requires_scope: false }]])
        .mockResolvedValueOnce([[]])  // not assigned
        .mockResolvedValueOnce([])    // INSERT Role_Permission
        // Permission 2
        .mockResolvedValueOnce([[{ uuid: perm2Uuid, code: 'Test.Create', requires_scope: false }]])
        .mockResolvedValueOnce([[]])  // not assigned
        .mockResolvedValueOnce([])    // INSERT Role_Permission
        .mockResolvedValueOnce([]);   // COMMIT
      
      const assignments = [
        { permission_uuid: perm1Uuid },
        { permission_uuid: perm2Uuid }
      ];
      
      const result = await rbacService.bulkAssignPermissions(
        mockRoleUuid,
        assignments,
        mockActorUuid
      );
      
      expect(result.assigned).toBe(2);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);
    });
    
    it('should skip already assigned permissions', async () => {
      // Requirements: 2.7 - duplicate prevention
      
      const perm1Uuid = uuidv4();
      const perm2Uuid = uuidv4();
      
      executeQuery
        .mockResolvedValueOnce([[{ uuid: mockRoleUuid, code: 'TEST_ROLE' }]])
        .mockResolvedValueOnce([])    // START TRANSACTION
        // Permission 1 - new
        .mockResolvedValueOnce([[{ uuid: perm1Uuid, code: 'Test.View', requires_scope: false }]])
        .mockResolvedValueOnce([[]])  // not assigned
        .mockResolvedValueOnce([])    // INSERT
        // Permission 2 - already assigned
        .mockResolvedValueOnce([[{ uuid: perm2Uuid, code: 'Test.Create', requires_scope: false }]])
        .mockResolvedValueOnce([[{ uuid: 'existing' }]]) // already assigned
        .mockResolvedValueOnce([]);   // COMMIT
      
      const assignments = [
        { permission_uuid: perm1Uuid },
        { permission_uuid: perm2Uuid }
      ];
      
      const result = await rbacService.bulkAssignPermissions(
        mockRoleUuid,
        assignments,
        mockActorUuid
      );
      
      expect(result.assigned).toBe(1);
      expect(result.skipped).toBe(1);
    });
    
    it('should handle errors for individual permissions', async () => {
      // Partial success handling
      
      const perm1Uuid = uuidv4();
      const perm2Uuid = 'invalid-uuid';
      
      executeQuery
        .mockResolvedValueOnce([[{ uuid: mockRoleUuid, code: 'TEST_ROLE' }]])
        .mockResolvedValueOnce([])    // START TRANSACTION
        // Permission 1 - success
        .mockResolvedValueOnce([[{ uuid: perm1Uuid, code: 'Test.View', requires_scope: false }]])
        .mockResolvedValueOnce([[]])  // not assigned
        .mockResolvedValueOnce([])    // INSERT
        // Permission 2 - not found
        .mockResolvedValueOnce([[]])  // permission not found
        .mockResolvedValueOnce([]);   // COMMIT
      
      const assignments = [
        { permission_uuid: perm1Uuid },
        { permission_uuid: perm2Uuid }
      ];
      
      const result = await rbacService.bulkAssignPermissions(
        mockRoleUuid,
        assignments,
        mockActorUuid
      );
      
      expect(result.assigned).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain('not found');
    });
  });
  
  describe('replaceAllPermissions', () => {
    it('should atomically replace all permissions', async () => {
      // Requirements: 2.5
      
      const newPerm1Uuid = uuidv4();
      const newPerm2Uuid = uuidv4();
      
      executeQuery
        .mockResolvedValueOnce([[{ uuid: mockRoleUuid, code: 'TEST_ROLE' }]])
        .mockResolvedValueOnce([])    // START TRANSACTION
        .mockResolvedValueOnce([[{ count: 3 }]]) // 3 existing permissions
        .mockResolvedValueOnce([])    // DELETE Role_Permission_Scopes
        .mockResolvedValueOnce([])    // DELETE Role_Permissions
        // Add new permission 1
        .mockResolvedValueOnce([[{ uuid: newPerm1Uuid, code: 'Test.View', requires_scope: false }]])
        .mockResolvedValueOnce([])    // INSERT
        // Add new permission 2
        .mockResolvedValueOnce([[{ uuid: newPerm2Uuid, code: 'Test.Create', requires_scope: false }]])
        .mockResolvedValueOnce([])    // INSERT
        .mockResolvedValueOnce([]);   // COMMIT
      
      const assignments = [
        { permission_uuid: newPerm1Uuid },
        { permission_uuid: newPerm2Uuid }
      ];
      
      const result = await rbacService.replaceAllPermissions(
        mockRoleUuid,
        assignments,
        mockActorUuid
      );
      
      expect(result.success).toBe(true);
      expect(result.removed).toBe(3);
      expect(result.added).toBe(2);
    });
    
    it('should allow replacing with empty permission set', async () => {
      // Remove all permissions scenario
      
      executeQuery
        .mockResolvedValueOnce([[{ uuid: mockRoleUuid, code: 'TEST_ROLE' }]])
        .mockResolvedValueOnce([])    // START TRANSACTION
        .mockResolvedValueOnce([[{ count: 5 }]]) // 5 existing permissions
        .mockResolvedValueOnce([])    // DELETE Role_Permission_Scopes
        .mockResolvedValueOnce([])    // DELETE Role_Permissions
        .mockResolvedValueOnce([]);   // COMMIT
      
      const result = await rbacService.replaceAllPermissions(
        mockRoleUuid,
        [], // Empty array
        mockActorUuid
      );
      
      expect(result.success).toBe(true);
      expect(result.removed).toBe(5);
      expect(result.added).toBe(0);
    });
    
    it('should rollback on error during replacement', async () => {
      // Transaction support
      
      const newPermUuid = uuidv4();
      
      executeQuery
        .mockResolvedValueOnce([[{ uuid: mockRoleUuid, code: 'TEST_ROLE' }]])
        .mockResolvedValueOnce([])    // START TRANSACTION
        .mockResolvedValueOnce([[{ count: 2 }]]) // existing permissions
        .mockResolvedValueOnce([])    // DELETE Scopes
        .mockResolvedValueOnce([])    // DELETE Permissions
        .mockResolvedValueOnce([[{ uuid: newPermUuid, code: 'Test.View', requires_scope: false }]])
        .mockRejectedValueOnce(new Error('Insert failed')); // INSERT fails
      
      await expect(
        rbacService.replaceAllPermissions(
          mockRoleUuid,
          [{ permission_uuid: newPermUuid }],
          mockActorUuid
        )
      ).rejects.toThrow('Insert failed');
    });
  });
  
  describe('Integration scenarios', () => {
    it('should handle permission assignment with auto-scope and audit', async () => {
      // Full workflow test
      
      const mockDefaultScopeUuid = uuidv4();
      
      executeQuery
        .mockResolvedValueOnce([[{ uuid: mockRoleUuid, code: 'TEST_ROLE' }]])
        .mockResolvedValueOnce([[{ uuid: mockPermissionUuid, code: 'Employees.View', requires_scope: true }]])
        .mockResolvedValueOnce([[]])  // not assigned
        .mockResolvedValueOnce([[{ uuid: mockDefaultScopeUuid, code: 'OWN', name: 'Own' }]])
        .mockResolvedValueOnce([])    // START TRANSACTION
        .mockResolvedValueOnce([])    // INSERT Role_Permission
        .mockResolvedValueOnce([])    // INSERT Role_Permission_Scope
        .mockResolvedValueOnce([]);   // COMMIT
      
      const result = await rbacService.assignPermissionToRole(
        mockRoleUuid,
        mockPermissionUuid,
        null,
        mockActorUuid,
        { ipAddress: '127.0.0.1', userAgent: 'Test' }
      );
      
      expect(result.success).toBe(true);
      expect(result.scope).toBe('OWN');
      
      // Verify audit service was called
      const rbacAuditService = require('../rbacAuditService');
      expect(rbacAuditService.logPermissionAssigned).toHaveBeenCalledWith(
        mockRoleUuid,
        mockPermissionUuid,
        'Employees.View',
        mockDefaultScopeUuid,
        'OWN',
        mockActorUuid,
        '127.0.0.1',
        'Test'
      );
    });
  });
});
