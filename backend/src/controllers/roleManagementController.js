/**
 * Role Management Controller
 * 
 * Simplified controller for static role management:
 * - View 5 static roles (read-only)
 * - Assign roles to users
 * - View role hierarchy and statistics
 * 
 * Note: Roles and their module assignments are STATIC and defined in code.
 * Module assignments cannot be changed through the API.
 */

const roleManagementService = require("../services/roleManagementService");
const { sendSuccess, sendError } = require("../utils/response");
const asyncHandler = require("../middleware/asyncHandler");

// ============================================================================
// ROLE VIEWING (Read-Only)
// ============================================================================

/**
 * Get all roles (5 static roles)
 * GET /api/role-management/roles
 */
exports.getAllRoles = asyncHandler(async (req, res) => {
  const { includeInactive } = req.query;
  
  const roles = await roleManagementService.getAllRoles({
    includeInactive: includeInactive === 'true'
  });
  
  sendSuccess(res, {
    message: "Roles retrieved successfully",
    data: { roles }
  });
});

/**
 * Get role by UUID with full details including modules (read-only)
 * GET /api/role-management/roles/:roleUuid
 */
exports.getRoleDetails = asyncHandler(async (req, res) => {
  const { roleUuid } = req.params;
  
  const role = await roleManagementService.getRoleWithDetails(roleUuid);
  
  if (!role) {
    return sendError(res, {
      status: 404,
      message: "Role not found",
      error: "NOT_FOUND"
    });
  }
  
  sendSuccess(res, {
    message: "Role details retrieved successfully",
    data: { role }
  });
});

/**
 * Get users assigned to role
 * GET /api/role-management/roles/:roleUuid/users
 */
exports.getRoleUsers = asyncHandler(async (req, res) => {
  const { roleUuid } = req.params;
  
  const users = await roleManagementService.getUsersByRole(roleUuid);
  
  sendSuccess(res, {
    message: "Role users retrieved successfully",
    data: { users, count: users.length }
  });
});

/**
 * Get role hierarchy
 * GET /api/role-management/roles/hierarchy
 */
exports.getRoleHierarchy = asyncHandler(async (req, res) => {
  const hierarchy = await roleManagementService.getRoleHierarchy();
  
  sendSuccess(res, {
    message: "Role hierarchy retrieved successfully",
    data: { hierarchy }
  });
});

/**
 * Get role statistics
 * GET /api/role-management/roles/:roleUuid/statistics
 */
exports.getRoleStatistics = asyncHandler(async (req, res) => {
  const { roleUuid } = req.params;
  
  try {
    const statistics = await roleManagementService.getRoleStatistics(roleUuid);
    
    sendSuccess(res, {
      message: "Role statistics retrieved successfully",
      data: statistics
    });
  } catch (error) {
    return sendError(res, {
      status: 404,
      message: error.message,
      error: "NOT_FOUND"
    });
  }
});

// ============================================================================
// USER ROLE ASSIGNMENT
// ============================================================================

/**
 * Assign role to user
 * PUT /api/role-management/users/:userUuid/role
 */
exports.assignRoleToUser = asyncHandler(async (req, res) => {
  const { userUuid } = req.params;
  const { roleUuid } = req.body;
  
  if (!roleUuid) {
    return sendError(res, {
      status: 400,
      message: "Role UUID is required",
      error: "INVALID_INPUT"
    });
  }
  
  try {
    await roleManagementService.assignRoleToUser(
      userUuid,
      roleUuid,
      req.user.uuid
    );
    
    sendSuccess(res, {
      message: "Role assigned to user successfully. User must re-login for changes to take effect."
    });
  } catch (error) {
    return sendError(res, {
      status: error.message.includes('not found') ? 404 : 403,
      message: error.message,
      error: error.message.includes('not found') ? 'NOT_FOUND' : 'FORBIDDEN'
    });
  }
});

/**
 * Get user's current role
 * GET /api/role-management/users/:userUuid/role
 */
exports.getUserRole = asyncHandler(async (req, res) => {
  const { userUuid } = req.params;
  
  const role = await roleManagementService.getUserRole(userUuid);
  
  if (!role) {
    return sendError(res, {
      status: 404,
      message: "User not found or has no role assigned",
      error: "NOT_FOUND"
    });
  }
  
  sendSuccess(res, {
    message: "User role retrieved successfully",
    data: { role }
  });
});

/**
 * Get current user's role and modules
 * GET /api/role-management/my-permissions
 */
exports.getMyPermissions = asyncHandler(async (req, res) => {
  const moduleAuthService = require("../services/moduleAuthService");
  
  const permissions = await moduleAuthService.getUserPermissions(req.user.uuid);
  
  if (!permissions) {
    return sendError(res, {
      status: 404,
      message: "Unable to load user permissions",
      error: "NOT_FOUND"
    });
  }
  
  sendSuccess(res, {
    message: "Your permissions retrieved successfully",
    data: {
      role: permissions.role,
      dashboard: permissions.dashboard,
      modules: permissions.modules
    }
  });
});

// ============================================================================
// PERMISSIONS CHECK
// ============================================================================

/**
 * Check if current user can manage roles
 * GET /api/role-management/can-manage
 */
exports.canManageRoles = asyncHandler(async (req, res) => {
  const canManage = await roleManagementService.canManageRoles(req.user.uuid);
  
  sendSuccess(res, {
    message: "Permission check completed",
    data: { canManage }
  });
});
