const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { randomUUID } = require("crypto");
const { requireEnv, getEnv } = require("../config/env");
const { executeQuery } = require("../utils/dbQuery");
const { getSignedUrl } = require("./employeeStorageService");
const { db } = require("../config/db");
const moduleAuthService = require("./moduleAuthService"); // Use moduleAuthService instead

const JWT_SECRET = requireEnv("JWT_SECRET");
const JWT_REFRESH_SECRET = requireEnv("JWT_REFRESH_SECRET");
const JWT_EXPIRES_IN = getEnv("JWT_EXPIRES_IN", "15m");
const REFRESH_TOKEN_EXPIRES_IN = getEnv("JWT_REFRESH_EXPIRES_IN", "7d");

async function findUserByUsername(username) {
  const [rows] = await executeQuery(
    `
      SELECT
        Users.uuid,
        Users.employee_uuid,
        Users.username,
        Users.password_hash,
        Users.role_uuid,
        Users.is_active,
        Users.refresh_token,
        Users.token_version,
        Employees.department_uuid
      FROM Users
      LEFT JOIN Employees ON Employees.uuid = Users.employee_uuid
      WHERE Users.username = ?
      LIMIT 1
    `,
    [String(username || "").trim()],
  );
  return rows[0] || null;
}

async function findUserByUuid(uuid) {
  const [rows] = await executeQuery(
    `
      SELECT
        Users.uuid,
        Users.employee_uuid,
        Users.username,
        Users.password_hash,
        Users.role_uuid,
        Users.is_active,
        Users.refresh_token,
        Users.last_activity,
        Employees.department_uuid
      FROM Users
      LEFT JOIN Employees ON Employees.uuid = Users.employee_uuid
      WHERE Users.uuid = ?
      LIMIT 1
    `,
    [String(uuid || "").trim()],
  );
  return rows[0] || null;
}

async function updateUserRefreshToken(userUuid, refreshToken) {
  await executeQuery(`UPDATE Users SET refresh_token = ? WHERE uuid = ?`, [
    refreshToken,
    userUuid,
  ]);
}

async function updateUserAuthState(userUuid, refreshToken) {
  await executeQuery(
    `UPDATE Users SET refresh_token = ?, last_login = CURRENT_TIMESTAMP, last_activity = CURRENT_TIMESTAMP WHERE uuid = ?`,
    [refreshToken, userUuid],
  );
}

async function updateUserPassword(userUuid, passwordHash) {
  await executeQuery(`UPDATE Users SET password_hash = ? WHERE uuid = ?`, [
    passwordHash,
    userUuid,
  ]);
}

async function generatePasswordHash(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

async function createAccessToken(user) {
  // JWT contains minimal identity data
  const payload = {
    uuid: user.uuid,
    employee_uuid: user.employee_uuid,
    role_uuid: user.role_uuid,
    department_uuid: user.department_uuid || null,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

async function createRefreshToken(user) {
  // Refresh token also contains minimal identity data
  const payload = {
    uuid: user.uuid,
    employee_uuid: user.employee_uuid,
    role_uuid: user.role_uuid,
    department_uuid: user.department_uuid || null,
    tokenId: randomUUID(),
  };
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, JWT_REFRESH_SECRET);
}

async function login(username, password) {
  const user = await findUserByUsername(username);
  if (!user || !user.is_active) {
    const error = new Error("Invalid credentials.");
    error.status = 401;
    throw error;
  }

  const passwordMatches = await verifyPassword(password, user.password_hash);
  if (!passwordMatches) {
    const error = new Error("Invalid credentials.");
    error.status = 401;
    throw error;
  }

  const accessToken = await createAccessToken(user);
  const refreshToken = await createRefreshToken(user);
  await updateUserAuthState(user.uuid, refreshToken);

  // Fetch employee data if linked to get full name and profile photo
  let employeeData = null;
  let profilePhotoUrl = null;
  if (user.employee_uuid) {
    try {
      const [employees] = await executeQuery(
        `SELECT e.first_name, e.middle_name, e.last_name, e.profile_photo_key, e.mesob_id,
                a.email
         FROM Employees e
           LEFT JOIN Positions p ON p.uuid = e.position_uuid
         LEFT JOIN EmployeeAddresses a ON e.uuid = a.employee_uuid AND a.address_type = 'CURRENT'
         WHERE e.uuid = ?`,
        [user.employee_uuid]
      );
      if (employees && employees.length > 0) {
        employeeData = employees[0];
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
      // Ignore employee lookup errors, just return user data
      console.error("Error fetching employee data during login:", err);
    }
  }

  // Build full name from employee data
  const fullName = employeeData
    ? [employeeData.first_name, employeeData.middle_name, employeeData.last_name]
        .filter(Boolean)
        .join(" ")
    : null;

  // Get role and modules using STATIC mapping
  const moduleAuthService = require("./moduleAuthService");
  let roleData = null;
  let dashboard = 'employee'; // default
  let modules = [];
  
  try {
    const permissions = await moduleAuthService.getUserPermissions(user.uuid);
    if (permissions) {
      roleData = permissions.role;
      dashboard = permissions.dashboard;
      modules = permissions.modules;
    }
  } catch (err) {
    console.error("Error fetching role and modules during login:", err);
  }

  return {
    accessToken,
    refreshToken,
    user: {
      uuid: user.uuid,
      employee_uuid: user.employee_uuid,
      department_uuid: user.department_uuid || null,
      username: user.username,
      email: employeeData?.email || null,
      role_uuid: user.role_uuid,
      is_active: Boolean(user.is_active),
      full_name: fullName,
      profile_photo_url: profilePhotoUrl,
      mesob_id: employeeData?.mesob_id || null,
    },
    role: roleData,
    dashboard: dashboard,
    modules: modules
  };
}

async function refreshToken(oldRefreshToken) {
  if (!oldRefreshToken) {
    const error = new Error("Refresh token is required.");
    error.status = 401;
    throw error;
  }

  let payload;
  try {
    payload = verifyRefreshToken(oldRefreshToken);
  } catch (error) {
    const authError = new Error("Invalid refresh token.");
    authError.status = 401;
    throw authError;
  }

  // Use transaction to prevent race conditions during concurrent refresh requests
  const connection = await db.promise().getConnection();
  try {
    await connection.beginTransaction();

    // Lock the user row for update to prevent concurrent modifications
    const [users] = await connection.execute(
      `SELECT u.uuid, u.employee_uuid, u.username, u.role_uuid, u.is_active, u.refresh_token, e.department_uuid
       FROM Users u
       LEFT JOIN Employees e ON e.uuid = u.employee_uuid
       WHERE u.uuid = ? 
       FOR UPDATE`,
      [payload.uuid]
    );

    const user = users[0];

    // Validate user and token
    if (!user || !user.is_active) {
      await connection.rollback();
      const error = new Error("Invalid refresh token.");
      error.status = 401;
      throw error;
    }

    // Validate stored refresh token matches
    if (user.refresh_token !== oldRefreshToken) {
      await connection.rollback();
      const error = new Error("Invalid refresh token.");
      error.status = 401;
      throw error;
    }

    // Generate new tokens
    const accessToken = await createAccessToken(user);
    const refreshToken = await createRefreshToken(user);

    // Update refresh token in database atomically
    await connection.execute(
      `UPDATE Users SET refresh_token = ?, last_activity = CURRENT_TIMESTAMP WHERE uuid = ?`,
      [refreshToken, user.uuid]
    );

    await connection.commit();

    return {
      accessToken,
      refreshToken,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function logout(userUuid) {
  await updateUserRefreshToken(userUuid, null);
}

/**
 * Revoke all tokens for a user by incrementing token version
 * This immediately invalidates all access and refresh tokens
 */
async function revokeAllUserTokens(userUuid) {
  await executeQuery(
    `UPDATE Users 
     SET refresh_token = NULL,
         last_activity = NULL
     WHERE uuid = ?`,
    [userUuid]
  );
}

/**
 * Force logout user from all devices
 * Used by admins or security actions
 */
async function forceLogout(userUuid) {
  await revokeAllUserTokens(userUuid);
}

/**
 * Get user with occupations and full profile data
 * Used by getCurrentUser endpoint to return fresh data including occupations
 */
async function getUserWithOccupations(userUuid) {
  const user = await findUserByUuid(userUuid);
  
  if (!user || !user.is_active) {
    const error = new Error("User not found or inactive.");
    error.status = 404;
    throw error;
  }

  // Fetch employee data if linked
  let employeeData = null;
  let profilePhotoUrl = null;
  if (user.employee_uuid) {
    try {
      const [employees] = await executeQuery(
        `SELECT e.first_name, e.middle_name, e.last_name, e.profile_photo_key, e.mesob_id,
                a.email
         FROM Employees e
         LEFT JOIN EmployeeAddresses a ON e.uuid = a.employee_uuid AND a.address_type = 'CURRENT'
         WHERE e.uuid = ?`,
        [user.employee_uuid]
      );
      if (employees && employees.length > 0) {
        employeeData = employees[0];
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
      console.error("Error fetching employee data:", err);
    }
  }

  // Build full name from employee data
  const fullName = employeeData
    ? [employeeData.first_name, employeeData.middle_name, employeeData.last_name]
        .filter(Boolean)
        .join(" ")
    : null;

  // Get role and modules using moduleAuthService
  const moduleAuthService = require("./moduleAuthService");
  let roleData = null;
  let dashboard = 'employee';
  let modules = [];
  try {
    const permissions = await moduleAuthService.getUserPermissions(user.uuid);
    if (permissions) {
      roleData = permissions.role;
      dashboard = permissions.dashboard;
      modules = permissions.modules;
    }
  } catch (err) {
    console.error("Error fetching role and modules:", err);
  }

  return {
    uuid: user.uuid,
    employee_uuid: user.employee_uuid,
    department_uuid: user.department_uuid || null,
    username: user.username,
    email: employeeData?.email || null,
    role_uuid: user.role_uuid,
    is_active: Boolean(user.is_active),
    full_name: fullName,
    profile_photo_url: profilePhotoUrl,
    mesob_id: employeeData?.mesob_id || null,
    role: roleData,
    dashboard: dashboard,
    modules: modules,
  };
}

async function register(registrationData, actorRoleId = null) {
  const {
    username,
    password,
    first_name,
    middle_name,
    last_name,
    hire_date,
    prior_gov_service,
    role, // DEPRECATED: Use role_id
    role_id, // NEW: Direct role_id assignment
    title,
    gender,
    date_of_birth,
    mother_name,
    nationality,
    department_uuid,
    position_uuid,
    occupation_uuid,
    addresses,
  } = registrationData;

  // Validate required fields
  if (!username || !password || !first_name || !last_name || !hire_date) {
    const error = new Error(
      "username, password, first_name, last_name, and hire_date are required.",
    );
    error.status = 400;
    throw error;
  }

  // Check if username already exists
  const existingUser = await findUserByUsername(username);
  if (existingUser) {
    const error = new Error("Username already exists.");
    error.status = 409;
    throw error;
  }
  
  // Determine target role_uuid
  let targetRoleUuid = role_id;
  
  // Default to Employee role if not specified
  if (!targetRoleUuid) {
    const [roleRows] = await executeQuery(
      `SELECT uuid FROM Roles WHERE code = 'EMPLOYEE' AND is_active = 1 LIMIT 1`
    );
    if (roleRows && roleRows.length > 0) {
      targetRoleUuid = roleRows[0].uuid;
    } else {
      const error = new Error("Default EMPLOYEE role not found in database.");
      error.status = 500;
      throw error;
    }
  }

  // Create employee
  const EmployeeService = require("./employeeService");
  const employee = await EmployeeService.createEmployee({
    title: title || null,
    first_name,
    middle_name: middle_name || null,
    last_name,
    mother_name: mother_name || null,
    gender: gender || null,
    date_of_birth: date_of_birth || null,
    nationality: nationality || "Ethiopian",
    hire_date,
    prior_gov_service: prior_gov_service || 0,
    status: "ACTIVE",
    attendance_exempt: false,
    department_uuid: department_uuid || null,
    position_uuid: position_uuid || null,
    occupation_uuid: occupation_uuid || null,
    addresses: addresses || [],
  });

  // Create user account
  const userUuid = randomUUID();
  const passwordHash = await generatePasswordHash(password);

  await executeQuery(
    `INSERT INTO Users (uuid, employee_uuid, username, password_hash, role_uuid, is_active)
     VALUES (?, ?, ?, ?, ?, 1)`,
    [userUuid, employee.uuid, username, passwordHash, targetRoleUuid],
  );

  // Fetch the created user
  const user = await findUserByUuid(userUuid);

  // Create tokens
  const accessToken = await createAccessToken(user);
  const refreshTokenValue = await createRefreshToken(user);
  await updateUserRefreshToken(userUuid, refreshTokenValue);

  // Get role info for response
  let roleCode = null;
  let roleName = null;
  try {
    const moduleAuthService = require("./moduleAuthService");
    const permissions = await moduleAuthService.getUserPermissions(userUuid);
    if (permissions && permissions.role) {
      roleCode = permissions.role.code;
      roleName = permissions.role.name;
    }
  } catch (err) {
    console.error('[Auth] Failed to get role info:', err.message);
  }

  return {
    accessToken,
    refreshToken: refreshTokenValue,
    user: {
      uuid: user.uuid,
      employee_uuid: user.employee_uuid,
      department_uuid: user.department_uuid || null,
      username: user.username,
      role_uuid: targetRoleUuid,
      role: roleCode,
      role_name: roleName,
      is_active: Boolean(user.is_active),
    },
    employee: {
      uuid: employee.uuid,
      mesob_id: employee.mesob_id,
      first_name: employee.first_name,
      last_name: employee.last_name,
      hire_date: employee.hire_date,
      status: employee.status,
    },
  };
}

module.exports = {
  login,
  refreshToken,
  logout,
  forceLogout,
  revokeAllUserTokens,
  register,
  findUserByUuid,
  findUserByUsername,
  updateUserPassword,
  generatePasswordHash,
  verifyPassword,
  verifyAccessToken,
  getUserWithOccupations,
};
