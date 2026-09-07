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

  // Fetch fresh user data with occupations
  const user = await AuthService.getUserWithOccupations(req.user.uuid);

  return sendSuccess(res, {
    status: 200,
    data: user,
  });
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
  const result = await AuthService.register(req.body || {});
  return sendSuccess(res, {
    status: 201,
    data: result,
  });
});
