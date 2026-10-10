const jwt = require("jsonwebtoken");
const { findUserByUuid, revokeAllUserTokens } = require("../services/authService");
const { requireEnv } = require("../config/env");
const { sendError } = require("../utils/response");
const { executeQuery } = require("../utils/dbQuery");
const { getSignedUrl } = require("../services/employeeStorageService");

const JWT_SECRET = requireEnv("JWT_SECRET");
const INACTIVITY_TIMEOUT = 60 * 60 * 1000; // 1 hour in milliseconds

function getBearerToken(authHeader) {
  if (!authHeader || typeof authHeader !== "string") {
    return null;
  }
  const parts = authHeader.trim().split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return null;
  }
  return parts[1];
}

async function authenticateJwt(req, res, next) {
  try {
    console.log('[authMiddleware] Authorization header:', req.headers.authorization?.substring(0, 50) + '...');
    const token = getBearerToken(req.headers.authorization);
    if (!token) {
      console.log('[authMiddleware] ❌ NO TOKEN extracted from header');
      return sendError(res, {
        status: 401,
        message: "Authorization token missing.",
        error: "UNAUTHORIZED",
      });
    }
    console.log('[authMiddleware] ✅ Token extracted, length:', token.length);

    // Verify JWT token and check expiration
    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
      console.log('[authMiddleware] ✅ JWT verified, uuid:', payload.uuid, 'role_uuid:', payload.role_uuid);
    } catch (error) {
      console.log('[authMiddleware] ❌ JWT verification failed:', error.message);
      if (error.name === "TokenExpiredError") {
        return sendError(res, {
          status: 401,
          message: "Token has expired. Please login again.",
          error: "TOKEN_EXPIRED",
        });
      }
      return sendError(res, {
        status: 401,
        message: "Invalid or malformed authorization token.",
        error: "INVALID_TOKEN",
      });
    }

    // Find user and check active status
    const user = await findUserByUuid(payload.uuid);
    if (!user) {
      return sendError(res, {
        status: 401,
        message: "User not found.",
        error: "UNAUTHORIZED",
      });
    }

    // Check if account is active
    if (!user.is_active) {
      return sendError(res, {
        status: 401,
        message: "User account has been deactivated.",
        error: "ACCOUNT_DEACTIVATED",
      });
    }

    // Check for inactivity timeout using database last_activity timestamp
    const now = Date.now();
    const lastActivity = user.last_activity 
      ? new Date(user.last_activity).getTime() 
      : now;
    const inactivityDuration = now - lastActivity;

    // If user has been inactive for too long, revoke all tokens and force re-login
    if (inactivityDuration > INACTIVITY_TIMEOUT) {
      // Revoke all tokens to ensure access token also becomes invalid
      await revokeAllUserTokens(user.uuid);
      
      return sendError(res, {
        status: 401,
        message: "Session expired due to inactivity. Please login again.",
        error: "INACTIVE_SESSION",
      });
    }

    // Update last activity timestamp in database for active requests
    // This happens AFTER validation to ensure consistent inactivity tracking
    await executeQuery(
      `UPDATE Users SET last_activity = CURRENT_TIMESTAMP WHERE uuid = ?`,
      [user.uuid]
    );

    // Fetch employee data if linked to get full name, profile photo, and department
    let employeeData = null;
    let profilePhotoUrl = null;
    let departmentUuid = null;
    if (user.employee_uuid) {
      try {
        const [employees] = await executeQuery(
          `SELECT e.first_name, e.middle_name, e.last_name, e.profile_photo_key, e.mesob_id,
                  e.department_uuid,
                  a.email
           FROM Employees e
           LEFT JOIN EmployeeAddresses a ON e.uuid = a.employee_uuid AND a.address_type = 'CURRENT'
           WHERE e.uuid = ?`,
          [user.employee_uuid]
        );
        if (employees && employees.length > 0) {
          employeeData = employees[0];
          departmentUuid = employeeData.department_uuid;
          // Generate signed URL for profile photo if it exists
          if (employeeData.profile_photo_key) {
            try {
              profilePhotoUrl = await getSignedUrl(employeeData.profile_photo_key);
            } catch (err) {
              console.error("Failed to generate signed URL for profile photo:", err);
            }
          }
        }
      } catch (err) {
        // Ignore employee lookup errors
        console.error("Error fetching employee data in auth middleware:", err);
      }
    }

    // Build full name from employee data
    const fullName = employeeData
      ? [employeeData.first_name, employeeData.middle_name, employeeData.last_name]
          .filter(Boolean)
          .join(" ")
      : null;

    // Look up role code from Roles table
    let roleCode = null;
    if (user.role_uuid) {
      try {
        const [roleRows] = await executeQuery(
          "SELECT code FROM Roles WHERE uuid = ? LIMIT 1",
          [user.role_uuid]
        );
        roleCode = roleRows[0]?.code || null;
      } catch (err) {
        console.error("Error fetching role code:", err);
      }
    }

    req.user = {
      uuid: user.uuid,
      employee_uuid: user.employee_uuid,
      department_uuid: departmentUuid || null,
      username: user.username,
      email: employeeData?.email || null,
      role_uuid: user.role_uuid,
      role: roleCode,
      full_name: fullName,
      profile_photo_url: profilePhotoUrl,
      mesob_id: employeeData?.mesob_id || null,
    };
    return next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return sendError(res, {
      status: 500,
      message: "Authentication failed.",
      error: "AUTH_ERROR",
    });
  }
}

module.exports = {
  authenticateJwt,
};
