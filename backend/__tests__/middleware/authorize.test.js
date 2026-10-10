/**
 * Authorization Middleware Tests
 * 
 * Tests for Task 3.1: Create authorization middleware
 * Requirements: 13.6, 13.7, 13.8, 13.9, 13.10, 13.11
 */

const { authorize } = require('../../src/middleware/authorize');
const rbacService = require('../../src/services/rbacService');

// Mock rbacService
jest.mock('../../src/services/rbacService');

// Mock sendError utility
jest.mock('../../src/utils/response', () => ({
  sendError: jest.fn((res, errorObj) => {
    res.status(errorObj.status).json({
      success: false,
      error: errorObj.error,
      message: errorObj.message
    });
  })
}));

describe('Authorization Middleware - Task 3.1', () => {
  let req, res, next;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup request, response, next
    req = {
      user: {
        uuid: 'test-user-uuid',
        username: 'testuser',
        employee_uuid: 'test-employee-uuid'
      },
      originalUrl: '/api/test'
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    
    next = jest.fn();
  });

  describe('Authentication Check', () => {
    it('should return 401 if user is not authenticated', async () => {
      req.user = null;
      
      const middleware = authorize({ permissions: 'Test.View' });
      await middleware(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'UNAUTHORIZED'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Single Permission Check', () => {
    it('should allow access when user has required permission', async () => {
      rbacService.isSuperAdmin.mockResolvedValue(false);
      rbacService.hasAnyPermission.mockResolvedValue(true);
      
      const middleware = authorize({ permissions: 'Employees.View' });
      await middleware(req, res, next);
      
      expect(rbacService.hasAnyPermission).toHaveBeenCalledWith(
        'test-user-uuid',
        ['Employees.View']
      );
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should deny access when user lacks required permission', async () => {
      rbacService.isSuperAdmin.mockResolvedValue(false);
      rbacService.hasAnyPermission.mockResolvedValue(false);
      
      const middleware = authorize({ permissions: 'Employees.View' });
      await middleware(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'FORBIDDEN'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Multiple Permissions with OR Logic', () => {
    it('should allow access when user has ANY of the required permissions', async () => {
      rbacService.isSuperAdmin.mockResolvedValue(false);
      rbacService.hasAnyPermission.mockResolvedValue(true);
      
      const middleware = authorize({
        permissions: ['Leave.Approve', 'Leave.Reject'],
        logic: 'OR'
      });
      await middleware(req, res, next);
      
      expect(rbacService.hasAnyPermission).toHaveBeenCalledWith(
        'test-user-uuid',
        ['Leave.Approve', 'Leave.Reject']
      );
      expect(next).toHaveBeenCalled();
    });

    it('should deny access when user has NONE of the required permissions', async () => {
      rbacService.isSuperAdmin.mockResolvedValue(false);
      rbacService.hasAnyPermission.mockResolvedValue(false);
      
      const middleware = authorize({
        permissions: ['Leave.Approve', 'Leave.Reject'],
        logic: 'OR'
      });
      await middleware(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Multiple Permissions with AND Logic', () => {
    it('should allow access when user has ALL required permissions', async () => {
      rbacService.isSuperAdmin.mockResolvedValue(false);
      rbacService.hasAllPermissions.mockResolvedValue(true);
      
      const middleware = authorize({
        permissions: ['Employees.View', 'Employees.Update'],
        logic: 'AND'
      });
      await middleware(req, res, next);
      
      expect(rbacService.hasAllPermissions).toHaveBeenCalledWith(
        'test-user-uuid',
        ['Employees.View', 'Employees.Update']
      );
      expect(next).toHaveBeenCalled();
    });

    it('should deny access when user lacks ANY of the required permissions', async () => {
      rbacService.isSuperAdmin.mockResolvedValue(false);
      rbacService.hasAllPermissions.mockResolvedValue(false);
      
      const middleware = authorize({
        permissions: ['Employees.View', 'Employees.Update'],
        logic: 'AND'
      });
      await middleware(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Super Admin Bypass', () => {
    it('should grant access to super admin regardless of permissions', async () => {
      rbacService.isSuperAdmin.mockResolvedValue(true);
      
      const middleware = authorize({
        permissions: ['SomeRestrictedPermission.Admin']
      });
      await middleware(req, res, next);
      
      expect(rbacService.isSuperAdmin).toHaveBeenCalledWith('test-user-uuid');
      expect(next).toHaveBeenCalled();
      // Should not check permissions for super admin
      expect(rbacService.hasAnyPermission).not.toHaveBeenCalled();
      expect(rbacService.hasAllPermissions).not.toHaveBeenCalled();
    });

    it('should respect skipSuperAdminBypass option', async () => {
      rbacService.isSuperAdmin.mockResolvedValue(true);
      rbacService.hasAnyPermission.mockResolvedValue(false);
      
      const middleware = authorize({
        permissions: ['Test.View'],
        skipSuperAdminBypass: true
      });
      await middleware(req, res, next);
      
      // Should still check permissions even for super admin
      expect(rbacService.hasAnyPermission).toHaveBeenCalled();
    });
  });

  describe('No Permissions Required', () => {
    it('should allow access when no permissions specified', async () => {
      rbacService.isSuperAdmin.mockResolvedValue(false);
      
      const middleware = authorize({ permissions: [] });
      await middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(rbacService.hasAnyPermission).not.toHaveBeenCalled();
      expect(rbacService.hasAllPermissions).not.toHaveBeenCalled();
    });

    it('should allow access when permissions option is omitted', async () => {
      rbacService.isSuperAdmin.mockResolvedValue(false);
      
      const middleware = authorize({});
      await middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      rbacService.isSuperAdmin.mockRejectedValue(new Error('Database error'));
      
      const middleware = authorize({ permissions: 'Test.View' });
      await middleware(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'INTERNAL_ERROR'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Requirements Validation', () => {
    it('Req 13.6: Enforces Roles.View permission check', async () => {
      rbacService.isSuperAdmin.mockResolvedValue(false);
      rbacService.hasAnyPermission.mockResolvedValue(true);
      
      const middleware = authorize({ permissions: 'Roles.View' });
      await middleware(req, res, next);
      
      expect(rbacService.hasAnyPermission).toHaveBeenCalledWith(
        'test-user-uuid',
        ['Roles.View']
      );
      expect(next).toHaveBeenCalled();
    });

    it('Req 13.7: Enforces Roles.Create permission check', async () => {
      rbacService.isSuperAdmin.mockResolvedValue(false);
      rbacService.hasAnyPermission.mockResolvedValue(true);
      
      const middleware = authorize({ permissions: 'Roles.Create' });
      await middleware(req, res, next);
      
      expect(rbacService.hasAnyPermission).toHaveBeenCalledWith(
        'test-user-uuid',
        ['Roles.Create']
      );
    });

    it('Req 13.8: Enforces Roles.Update permission check', async () => {
      rbacService.isSuperAdmin.mockResolvedValue(false);
      rbacService.hasAnyPermission.mockResolvedValue(true);
      
      const middleware = authorize({ permissions: 'Roles.Update' });
      await middleware(req, res, next);
      
      expect(rbacService.hasAnyPermission).toHaveBeenCalledWith(
        'test-user-uuid',
        ['Roles.Update']
      );
    });

    it('Req 13.9: Enforces Roles.Delete permission check', async () => {
      rbacService.isSuperAdmin.mockResolvedValue(false);
      rbacService.hasAnyPermission.mockResolvedValue(true);
      
      const middleware = authorize({ permissions: 'Roles.Delete' });
      await middleware(req, res, next);
      
      expect(rbacService.hasAnyPermission).toHaveBeenCalledWith(
        'test-user-uuid',
        ['Roles.Delete']
      );
    });

    it('Req 13.10: Enforces Roles.AssignPermissions permission check', async () => {
      rbacService.isSuperAdmin.mockResolvedValue(false);
      rbacService.hasAnyPermission.mockResolvedValue(true);
      
      const middleware = authorize({ permissions: 'Roles.AssignPermissions' });
      await middleware(req, res, next);
      
      expect(rbacService.hasAnyPermission).toHaveBeenCalledWith(
        'test-user-uuid',
        ['Roles.AssignPermissions']
      );
    });

    it('Req 13.11: Returns 403 Forbidden for insufficient permissions', async () => {
      rbacService.isSuperAdmin.mockResolvedValue(false);
      rbacService.hasAnyPermission.mockResolvedValue(false);
      
      const middleware = authorize({ permissions: 'Roles.View' });
      await middleware(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'FORBIDDEN',
          message: 'Insufficient permissions.'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });
});
