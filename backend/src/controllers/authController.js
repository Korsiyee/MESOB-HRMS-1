const AuthService = require("../services/authService");
const asyncHandler = require("../middleware/asyncHandler");
const { ApiError } = require("../utils/errors");
const { sendSuccess } = require("../utils/response");
const { sanitizeUsername } = require("../utils/sanitize");
const { safeLogEvent } = require("../services/auditLogService");
const { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } = require("../config/constants");
const { getClientIp } = require("../utils/request");

exports.login = asyncHandler(async (req, res) => {
  const { username, password } = req.body || {};
  const normalizedUsername = sanitizeUsername(username);

  try {
    const result = await AuthService.login(normalizedUsername, password);

    await safeLogEvent({
      actorUuid: result.user.uuid,
      action: AUDIT_ACTIONS.AUTH_LOGIN_SUCCESS,
      entityType: AUDIT_ENTITY_TYPES.USER,
      entityUuid: result.user.uuid,
      diff: { username: normalizedUsername },
      ipAddress: getClientIp(req),
    });

    return sendSuccess(res, {
      status: 200,
      message: "Login successful.",
      data: result,
    });
  } catch (error) {
    await safeLogEvent({
      actorUuid: null,
      action: AUDIT_ACTIONS.AUTH_LOGIN_FAILED,
      entityType: AUDIT_ENTITY_TYPES.AUTH,
      entityUuid: null,
      diff: { username: normalizedUsername },
      ipAddress: getClientIp(req),
    });

    throw error;
  }
});

exports.refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body || {};
  const token = await AuthService.refreshToken(refreshToken);
  return sendSuccess(res, {
    status: 200,
    message: "Token refreshed.",
    data: token,
  });
});

exports.getCurrentUser = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new ApiError("Not authenticated.", 401, "UNAUTHORIZED");
  }

  try {
    // Fetch fresh user data
    const user = await AuthService.getUserWithOccupations(req.user.uuid);
    
    // Fetch module permissions (FIXED - use moduleAuthService not rbacService)
    const moduleAuthService = require("../services/moduleAuthService");
    const modulePermissions = await moduleAuthService.getUserPermissions(req.user.uuid);
    
    // Combine user data with module permissions
    const userData = {
      ...user,
      permissions: modulePermissions  // Add module permissions to response
    };

    return sendSuccess(res, {
      status: 200,
      data: userData,
    });
  } catch (error) {
    console.error('[getCurrentUser] Error:', error);
    // Return user data without permissions if fetch fails
    const user = await AuthService.getUserWithOccupations(req.user.uuid);
    return sendSuccess(res, {
      status: 200,
      data: user,
    });
  }
});

exports.logout = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new ApiError("Not authenticated.", 401, "UNAUTHORIZED");
  }

  await AuthService.logout(req.user.uuid);
  await safeLogEvent({
    actorUuid: req.user.uuid,
    action: AUDIT_ACTIONS.AUTH_LOGOUT,
    entityType: AUDIT_ENTITY_TYPES.USER,
    entityUuid: req.user.uuid,
    diff: null,
    ipAddress: getClientIp(req),
  });

  return sendSuccess(res, {
    status: 200,
    message: "Logged out successfully.",
  });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body || {};

  if (!req.user) {
    throw new ApiError("Not authenticated.", 401, "UNAUTHORIZED");
  }

  if (oldPassword === newPassword) {
    throw new ApiError(
      "New password must be different from the old password.",
      400,
      "VALIDATION_ERROR",
    );
  }

  const user = await AuthService.findUserByUuid(req.user.uuid);
  if (!user || !user.is_active) {
    throw new ApiError("User not found.", 404, "NOT_FOUND");
  }

  const match = await AuthService.verifyPassword(
    oldPassword,
    user.password_hash,
  );
  if (!match) {
    await safeLogEvent({
      actorUuid: req.user.uuid,
      action: AUDIT_ACTIONS.AUTH_PASSWORD_CHANGE_FAILED,
      entityType: AUDIT_ENTITY_TYPES.USER,
      entityUuid: req.user.uuid,
      diff: null,
      ipAddress: getClientIp(req),
    });

    throw new ApiError("Old password is incorrect.", 401, "UNAUTHORIZED");
  }

  const passwordHash = await AuthService.generatePasswordHash(newPassword);
  await AuthService.updateUserPassword(req.user.uuid, passwordHash);
  
  // Revoke all tokens to force re-login with new password
  await AuthService.revokeAllUserTokens(req.user.uuid);

  await safeLogEvent({
    actorUuid: req.user.uuid,
    action: AUDIT_ACTIONS.AUTH_PASSWORD_CHANGE,
    entityType: AUDIT_ENTITY_TYPES.USER,
    entityUuid: req.user.uuid,
    diff: null,
    ipAddress: getClientIp(req),
  });

  return sendSuccess(res, {
    status: 200,
    message: "Password changed successfully. Please login again with your new password.",
  });
});

/**
 * Force logout a user (admin only)
 * Revokes all tokens and terminates all active sessions
 */
exports.forceLogout = asyncHandler(async (req, res) => {
  const { userUuid } = req.params;

  if (!req.user) {
    throw new ApiError("Not authenticated.", 401, "UNAUTHORIZED");
  }

  // Verify user exists
  const targetUser = await AuthService.findUserByUuid(userUuid);
  if (!targetUser) {
    throw new ApiError("User not found.", 404, "NOT_FOUND");
  }

  // Revoke all tokens for the target user
  await AuthService.forceLogout(userUuid);

  await safeLogEvent({
    actorUuid: req.user.uuid,
    action: "FORCE_LOGOUT",
    entityType: AUDIT_ENTITY_TYPES.USER,
    entityUuid: userUuid,
    diff: { forced_by: req.user.uuid },
    ipAddress: getClientIp(req),
  });

  return sendSuccess(res, {
    status: 200,
    message: "User has been logged out from all devices.",
  });
});

exports.register = asyncHandler(async (req, res) => {
  // SECURITY: Pass actor's role_id for hierarchy validation
  const actorRoleId = req.user?.role_id || null;
  const result = await AuthService.register(req.body || {}, actorRoleId);
  
  // Log account creation
  await safeLogEvent({
    actorUuid: req.user?.uuid || null,
    action: AUDIT_ACTIONS.ACCOUNT_CREATED,
    entityType: AUDIT_ENTITY_TYPES.USER,
    entityUuid: result.user.uuid,
    diff: { 
      username: result.user.username,
      role_id: result.user.role_id,
      employee_uuid: result.employee.uuid 
    },
    ipAddress: getClientIp(req),
  });
  
  return sendSuccess(res, {
    status: 201,
    message: "Account created successfully.",
    data: result,
  });
});


/**
 * Check if user has permission (for frontend permission checks)
 * GET /api/auth/check-permission?action=view&resource=employees
 */
exports.checkPermission = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new ApiError("Not authenticated.", 401, "UNAUTHORIZED");
  }

  const { action, resource } = req.query;

  if (!action || !resource) {
    throw new ApiError("action and resource are required.", 400, "VALIDATION_ERROR");
  }

  // Check module access instead of action-level permissions
  const { checkModuleAccess } = require("../services/moduleAuthService");
  
  // Map resource to module code (simplified check)
  const resourceToModule = {
    'employees': 'EMPLOYEES',
    'departments': 'ORGANIZATION',
    'positions': 'ORGANIZATION',
    'levels': 'ORGANIZATION',
    'attendance': 'ATTENDANCE',
    'shifts': 'SHIFTS',
    'letters': 'LETTERS',
    'leave': 'LEAVE',
    'requests': 'LEAVE'
  };
  
  const moduleCode = resourceToModule[resource];
  const allowed = moduleCode ? await checkModuleAccess(req.user.uuid, moduleCode) : false;

  return sendSuccess(res, {
    status: 200,
    data: { allowed },
  });
});
