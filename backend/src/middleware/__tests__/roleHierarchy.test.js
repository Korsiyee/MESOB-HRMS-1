/**
 * Role Hierarchy Middleware Tests
 * 
 * Tests for role hierarchy enforcement middleware functions
 */

const { canModifyRole, canAssignRole, canModifyUser, preventSystemRoleModification } = require('../roleHierarchy');
const rbacService = require('../../services/rbacService');
const { sendError } = require('../../utils/response');

// Mock dependencies
jest.mock('../../services/rbacService');
jest.mock('../../utils/response');

describe('Role Hierarchy Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock request, response, next
    mockReq = {
      user: {
        uuid: 'user-uuid-123',
        username: 'testuser'
      },
      params: {},
      body: {}
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    mockNext = jest.fn();
    
    // Mock sendError to actually send the error
    sendError.mockImplementation((res, error) => {
      res.status(error.status).json({ error: error.message });
    });
  });

  describe('canModifyRole', () => {
    it('should allow Super Admin to modify any role', async () => {
      mockReq.params.roleUuid = 'target-role-uuid';
      
      rbacService.getUserRole.mockResolvedValue({
        uuid: 'super-admin-role-uuid',
        code: 'SUPER_ADMIN',
        hierarchy_level: 100
      });
      
      const middleware = canModifyRole('roleUuid');
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(sendError).not.toHaveBeenCalled();
    });

    it('should allow modification if actor has higher hierarchy', async () => {
      mockReq.params.roleUuid = 'target-role-uuid';
      
      rbacService.getUserRole.mockResolvedValue({
        uuid: 'admin-role-uuid',
        code: 'ADMIN',
        hierarchy_level: 80
      });
      
      rbacService.canModifyRole.mockResolvedValue(true);
      
      const middleware = canModifyRole('roleUuid');
      await middleware(mockReq, mockRes, mockNext);
      
      expect(rbacService.canModifyRole).toHaveBeenCalledWith('admin-role-uuid', 'target-role-uuid');
      expect(mockNext).toHaveBeenCalled();
      expect(sendError).not.toHaveBeenCalled();
    });

    it('should block modification if hierarchy check fails', async () => {
      mockReq.params.roleUuid = 'target-role-uuid';
      
      rbacService.getUserRole.mockResolvedValue({
        uuid: 'manager-role-uuid',
        code: 'MANAGER',
        hierarchy_level: 50
      });
      
      rbacService.canModifyRole.mockResolvedValue(false);
      
      rbacService.getRoleByUuid.mockResolvedValue({
        uuid: 'target-role-uuid',
        name: 'Senior Manager',
        hierarchy_level: 60
      });
      
      const middleware = canModifyRole('roleUuid');
      await middleware(mockReq, mockRes, mockNext);
      
      expect(sendError).toHaveBeenCalledWith(mockRes, expect.objectContaining({
        status: 403,
        error: 'HIERARCHY_VIOLATION'
      }));
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return error if user has no role', async () => {
      mockReq.params.roleUuid = 'target-role-uuid';
      
      rbacService.getUserRole.mockResolvedValue(null);
      
      const middleware = canModifyRole('roleUuid');
      await middleware(mockReq, mockRes, mockNext);
      
      expect(sendError).toHaveBeenCalledWith(mockRes, expect.objectContaining({
        status: 403,
        error: 'NO_ROLE'
      }));
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return error if target role UUID is missing', async () => {
      // No roleUuid in params or body
      const middleware = canModifyRole('roleUuid');
      await middleware(mockReq, mockRes, mockNext);
      
      expect(sendError).toHaveBeenCalledWith(mockRes, expect.objectContaining({
        status: 400,
        error: 'INVALID_INPUT'
      }));
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('canAssignRole', () => {
    it('should allow role assignment if hierarchy check passes', async () => {
      mockReq.body.roleUuid = 'role-to-assign-uuid';
      
      rbacService.canAssignRole.mockResolvedValue(true);
      
      const middleware = canAssignRole('roleUuid');
      await middleware(mockReq, mockRes, mockNext);
      
      expect(rbacService.canAssignRole).toHaveBeenCalledWith('user-uuid-123', 'role-to-assign-uuid');
      expect(mockNext).toHaveBeenCalled();
      expect(sendError).not.toHaveBeenCalled();
    });

    it('should block role assignment if hierarchy check fails', async () => {
      mockReq.body.roleUuid = 'role-to-assign-uuid';
      
      rbacService.canAssignRole.mockResolvedValue(false);
      
      rbacService.getRoleByUuid.mockResolvedValue({
        uuid: 'role-to-assign-uuid',
        name: 'Senior Role',
        hierarchy_level: 70
      });
      
      rbacService.getUserRole.mockResolvedValue({
        uuid: 'actor-role-uuid',
        hierarchy_level: 60
      });
      
      const middleware = canAssignRole('roleUuid');
      await middleware(mockReq, mockRes, mockNext);
      
      expect(sendError).toHaveBeenCalledWith(mockRes, expect.objectContaining({
        status: 403,
        error: 'HIERARCHY_VIOLATION'
      }));
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return error if role UUID is missing', async () => {
      const middleware = canAssignRole('roleUuid');
      await middleware(mockReq, mockRes, mockNext);
      
      expect(sendError).toHaveBeenCalledWith(mockRes, expect.objectContaining({
        status: 400,
        error: 'INVALID_INPUT'
      }));
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('canModifyUser', () => {
    it('should allow Super Admin to modify any user', async () => {
      mockReq.params.uuid = 'target-user-uuid';
      
      rbacService.getUserRole
        .mockResolvedValueOnce({
          uuid: 'super-admin-role-uuid',
          code: 'SUPER_ADMIN',
          hierarchy_level: 100
        });
      
      const middleware = canModifyUser('uuid');
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(sendError).not.toHaveBeenCalled();
    });

    it('should allow modification if target user has lower hierarchy', async () => {
      mockReq.params.uuid = 'target-user-uuid';
      
      rbacService.getUserRole
        .mockResolvedValueOnce({
          uuid: 'admin-role-uuid',
          code: 'ADMIN',
          hierarchy_level: 80
        })
        .mockResolvedValueOnce({
          uuid: 'manager-role-uuid',
          hierarchy_level: 60
        });
      
      const middleware = canModifyUser('uuid');
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(sendError).not.toHaveBeenCalled();
    });

    it('should block modification if target user has equal or higher hierarchy', async () => {
      mockReq.params.uuid = 'target-user-uuid';
      
      rbacService.getUserRole
        .mockResolvedValueOnce({
          uuid: 'manager-role-uuid',
          hierarchy_level: 60
        })
        .mockResolvedValueOnce({
          uuid: 'senior-manager-role-uuid',
          hierarchy_level: 70
        });
      
      const middleware = canModifyUser('uuid');
      await middleware(mockReq, mockRes, mockNext);
      
      expect(sendError).toHaveBeenCalledWith(mockRes, expect.objectContaining({
        status: 403,
        error: 'HIERARCHY_VIOLATION'
      }));
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow self-modification', async () => {
      mockReq.params.uuid = 'user-uuid-123'; // Same as req.user.uuid
      
      const middleware = canModifyUser('uuid');
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(rbacService.getUserRole).not.toHaveBeenCalled();
    });

    it('should allow modification if target has no role', async () => {
      mockReq.params.uuid = 'target-user-uuid';
      
      rbacService.getUserRole
        .mockResolvedValueOnce({
          uuid: 'admin-role-uuid',
          hierarchy_level: 80
        })
        .mockResolvedValueOnce(null); // Target has no role
      
      const middleware = canModifyUser('uuid');
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(sendError).not.toHaveBeenCalled();
    });
  });

  describe('preventSystemRoleModification', () => {
    it('should allow modification of custom roles', async () => {
      mockReq.params.roleUuid = 'custom-role-uuid';
      
      rbacService.getRoleByUuid.mockResolvedValue({
        uuid: 'custom-role-uuid',
        name: 'Custom Role',
        is_system_role: false
      });
      
      const middleware = preventSystemRoleModification('roleUuid');
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(sendError).not.toHaveBeenCalled();
    });

    it('should block modification of system roles', async () => {
      mockReq.params.roleUuid = 'system-role-uuid';
      
      rbacService.getRoleByUuid.mockResolvedValue({
        uuid: 'system-role-uuid',
        name: 'System Admin',
        is_system_role: true
      });
      
      const middleware = preventSystemRoleModification('roleUuid');
      await middleware(mockReq, mockRes, mockNext);
      
      expect(sendError).toHaveBeenCalledWith(mockRes, expect.objectContaining({
        status: 403,
        error: 'SYSTEM_ROLE_PROTECTED'
      }));
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 404 if role not found', async () => {
      mockReq.params.roleUuid = 'non-existent-role-uuid';
      
      rbacService.getRoleByUuid.mockResolvedValue(null);
      
      const middleware = preventSystemRoleModification('roleUuid');
      await middleware(mockReq, mockRes, mockNext);
      
      expect(sendError).toHaveBeenCalledWith(mockRes, expect.objectContaining({
        status: 404,
        error: 'NOT_FOUND'
      }));
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return error if role UUID is missing', async () => {
      const middleware = preventSystemRoleModification('roleUuid');
      await middleware(mockReq, mockRes, mockNext);
      
      expect(sendError).toHaveBeenCalledWith(mockRes, expect.objectContaining({
        status: 400,
        error: 'INVALID_INPUT'
      }));
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully in canModifyRole', async () => {
      mockReq.params.roleUuid = 'target-role-uuid';
      
      rbacService.getUserRole.mockRejectedValue(new Error('Database error'));
      
      const middleware = canModifyRole('roleUuid');
      await middleware(mockReq, mockRes, mockNext);
      
      expect(sendError).toHaveBeenCalledWith(mockRes, expect.objectContaining({
        status: 500,
        error: 'INTERNAL_ERROR'
      }));
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully in canAssignRole', async () => {
      mockReq.body.roleUuid = 'role-uuid';
      
      rbacService.canAssignRole.mockRejectedValue(new Error('Database error'));
      
      const middleware = canAssignRole('roleUuid');
      await middleware(mockReq, mockRes, mockNext);
      
      expect(sendError).toHaveBeenCalledWith(mockRes, expect.objectContaining({
        status: 500,
        error: 'INTERNAL_ERROR'
      }));
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully in preventSystemRoleModification', async () => {
      mockReq.params.roleUuid = 'role-uuid';
      
      rbacService.getRoleByUuid.mockRejectedValue(new Error('Database error'));
      
      const middleware = preventSystemRoleModification('roleUuid');
      await middleware(mockReq, mockRes, mockNext);
      
      expect(sendError).toHaveBeenCalledWith(mockRes, expect.objectContaining({
        status: 500,
        error: 'INTERNAL_ERROR'
      }));
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
