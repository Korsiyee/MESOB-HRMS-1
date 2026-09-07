const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { randomUUID } = require("crypto");
const { requireEnv, getEnv } = require("../config/env");
const { executeQuery } = require("../utils/dbQuery");
const { getSignedUrl } = require("./employeeStorageService");
const db = require("../config/db");
const permissionService = require("./permissionService");

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
        Users.role,
        Users.is_active,
        Users.refresh_token,
        Users.token_version,
        Users.permissions_version,
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
        Users.role,
        Users.is_active,
        Users.refresh_token,
        Users.token_version,
        Users.permissions_version,
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
  // Calculate effective occupations (role + direct + delegations)
  const occupations = await permissionService.calculateEffectiveOccupations(
    user.uuid,
    user.role,
    user.employee_uuid
  );
  
  // Get user scopes
  const scopes = await permissionService.getUserScopes(user.uuid);
  
  const payload = {
    uuid: user.uuid,
    employee_uuid: user.employee_uuid,
    role: user.role,
    department_uuid: user.department_uuid || null,
    token_version: user.token_version || 0,
    permissions_version: user.permissions_version || 1, // NEW: Fine-grained permission tracking
    occupations, // NEW: Include effective occupations
    scopes       // NEW: Include user scopes
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

async function createRefreshToken(user) {
  // Refresh token includes occupations/scopes for seamless token refresh
  const occupations = await permissionService.calculateEffectiveOccupations(
    user.uuid,
    user.role,
    user.employee_uuid
  );
  
  const scopes = await permissionService.getUserScopes(user.uuid);
  
  const payload = {
    uuid: user.uuid,
    employee_uuid: user.employee_uuid,
    role: user.role,
    department_uuid: user.department_uuid || null,
    token_version: user.token_version || 0,
    permissions_version: user.permissions_version || 1, // NEW: Fine-grained permission tracking
    occupations, // NEW: Include effective occupations
    scopes,      // NEW: Include user scopes
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

  return {
    accessToken,
    refreshToken,
    user: {
      uuid: user.uuid,
      employee_uuid: user.employee_uuid,
      department_uuid: user.department_uuid || null,
      username: user.username,
      email: employeeData?.email || null,
      role: user.role,
      is_active: Boolean(user.is_active),
      full_name: fullName,
      profile_photo_url: profilePhotoUrl,
      mesob_id: employeeData?.mesob_id || null,
    },
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
      `SELECT u.uuid, u.employee_uuid, u.username, u.role, u.is_active, u.refresh_token, u.token_version, e.department_uuid
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

    // Validate token version matches (prevents using old tokens after revocation)
    if ((user.token_version || 0) !== (payload.token_version || 0)) {
      await connection.rollback();
      const error = new Error("Token has been revoked. Please login again.");
      error.status = 401;
      error.code = "TOKEN_REVOKED";
      throw error;
    }

    // Generate new tokens with current token version
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
     SET token_version = token_version + 1, 
         refresh_token = NULL,
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

  // Fetch occupations
  let occupations = [];
  if (user.employee_uuid) {
    try {
      const [rows] = await executeQuery(
        `SELECT 
          eo.uuid AS assignment_uuid,
          eo.assigned_at,
          o.uuid AS occupation_uuid,
          o.name AS occupation_name,
          o.description AS occupation_description
        FROM EmployeeOccupations eo
        JOIN Occupations o ON o.uuid = eo.occupation_uuid
        WHERE eo.employee_uuid = ?
        ORDER BY eo.assigned_at DESC`,
        [user.employee_uuid]
      );
      occupations = rows || [];
    } catch (err) {
      console.error("Error fetching occupations:", err);
    }
  }

  // Build full name from employee data
  const fullName = employeeData
    ? [employeeData.first_name, employeeData.middle_name, employeeData.last_name]
        .filter(Boolean)
        .join(" ")
    : null;

  return {
    uuid: user.uuid,
    employee_uuid: user.employee_uuid,
    department_uuid: user.department_uuid || null,
    username: user.username,
    email: employeeData?.email || null,
    role: user.role,
    is_active: Boolean(user.is_active),
    full_name: fullName,
    profile_photo_url: profilePhotoUrl,
    mesob_id: employeeData?.mesob_id || null,
    occupations: occupations, // Include occupations in response
  };
}

async function register(registrationData) {
  const {
    username,
    password,
    first_name,
    middle_name,
    last_name,
    hire_date,
    prior_gov_service,
    role,
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
  const userRole = role || "EMPLOYEE";

  if (
    ![
      "EMPLOYEE",
      "DEPARTMENT_HEAD",
      "HR_OFFICER",
      "HR_ADMIN",
      "SUPER_ADMIN",
    ].includes(userRole)
  ) {
    const error = new Error("Invalid role specified.");
    error.status = 400;
    throw error;
  }

  await executeQuery(
    `INSERT INTO Users (uuid, employee_uuid, username, password_hash, role, is_active)
     VALUES (?, ?, ?, ?, ?, 1)`,
    [userUuid, employee.uuid, username, passwordHash, userRole],
  );

  // Fetch the created user
  const user = await findUserByUuid(userUuid);

  // Create tokens
  const accessToken = await createAccessToken(user);
  const refreshTokenValue = await createRefreshToken(user);
  await updateUserRefreshToken(userUuid, refreshTokenValue);

  return {
    accessToken,
    refreshToken: refreshTokenValue,
    user: {
      uuid: user.uuid,
      employee_uuid: user.employee_uuid,
      department_uuid: user.department_uuid || null,
      username: user.username,
      role: user.role,
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
