/**
 * Module Role Management Controller
 * 
 * Handles role management for the new module-level permission system
 */

const { sendSuccess, sendError } = require('../utils/response');
const { db } = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const moduleAuthService = require('../services/moduleAuthService');

/**
 * Get all roles
 */
async function getAllRoles(req, res) {
  try {
    const [roles] = await db.promise().query(`
      SELECT 
        r.uuid,
        r.code,
        r.name,
        r.description,
        r.hierarchy_level,
        r.is_system_role,
        r.is_active,
        r.created_at,
        s.uuid as default_scope_uuid,
        s.code as default_scope_code,
        s.name as default_scope_name,
        (SELECT COUNT(*) FROM Users WHERE role_uuid = r.uuid) as user_count
      FROM Roles r
      LEFT JOIN Scopes s ON r.default_scope_uuid = s.uuid
      WHERE r.is_active = TRUE
      ORDER BY r.hierarchy_level DESC, r.name
    `);

    return sendSuccess(res, {
      message: 'Roles retrieved successfully',
      data: { roles }
    });
  } catch (error) {
    console.error('[RoleController] Error fetching roles:', error);
    return sendError(res, {
      status: 500,
      message: 'Failed to fetch roles',
      error: 'INTERNAL_SERVER_ERROR'
    });
  }
}

/**
 * Get role by UUID with full permissions
 */
async function getRoleById(req, res) {
  try {
    const { uuid } = req.params;

    const role = await moduleAuthService.getRolePermissions(uuid);

    if (!role) {
      return sendError(res, {
        status: 404,
        message: 'Role not found',
        error: 'NOT_FOUND'
      });
    }

    return sendSuccess(res, {
      message: 'Role retrieved successfully',
      data: { role }
    });
  } catch (error) {
    console.error('[RoleController] Error fetching role:', error);
    return sendError(res, {
      status: 500,
      message: 'Failed to fetch role',
      error: 'INTERNAL_SERVER_ERROR'
    });
  }
}

/**
 * Create a new role
 */
async function createRole(req, res) {
  try {
    const {
      code,
      name,
      description,
      default_scope_uuid,
      hierarchy_level = 50,
      modules = [] // Array of { module_uuid, scope_uuid }
    } = req.body;

    // Validation
    if (!code || !name) {
      return sendError(res, {
        status: 400,
        message: 'Role code and name are required',
        error: 'VALIDATION_ERROR'
      });
    }

    // Check if code already exists
    const [existing] = await db.promise().query(
      'SELECT uuid FROM Roles WHERE code = ?',
      [code]
    );

    if (existing.length > 0) {
      return sendError(res, {
        status: 409,
        message: 'Role with this code already exists',
        error: 'DUPLICATE_ERROR'
      });
    }

    const connection = await db.promise().getConnection();

    try {
      await connection.beginTransaction();

      const roleUuid = uuidv4();

      // Create role
      await connection.query(
        `INSERT INTO Roles 
         (uuid, code, name, description, default_scope_uuid, hierarchy_level, is_system_role, is_active) 
         VALUES (?, ?, ?, ?, ?, ?, FALSE, TRUE)`,
        [roleUuid, code, name, description || null, default_scope_uuid || null, hierarchy_level]
      );

      // Assign module permissions
      for (const modulePerm of modules) {
        await connection.query(
          'INSERT INTO RoleModules (uuid, role_uuid, module_uuid, scope_uuid) VALUES (?, ?, ?, ?)',
          [uuidv4(), roleUuid, modulePerm.module_uuid, modulePerm.scope_uuid]
        );
      }

      await connection.commit();

      // Fetch the created role with permissions
      const role = await moduleAuthService.getRolePermissions(roleUuid);

      return sendSuccess(res, {
        status: 201,
        message: 'Role created successfully',
        data: { role }
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('[RoleController] Error creating role:', error);
    return sendError(res, {
      status: 500,
      message: 'Failed to create role',
      error: 'INTERNAL_SERVER_ERROR'
    });
  }
}

/**
 * Update a role
 */
async function updateRole(req, res) {
  try {
    const { uuid } = req.params;
    const {
      name,
      description,
      default_scope_uuid,
      hierarchy_level,
      modules // Array of { module_uuid, scope_uuid }
    } = req.body;

    // Check if role exists
    const [existing] = await db.promise().query(
      'SELECT is_system_role FROM Roles WHERE uuid = ?',
      [uuid]
    );

    if (existing.length === 0) {
      return sendError(res, {
        status: 404,
        message: 'Role not found',
        error: 'NOT_FOUND'
      });
    }

    // Prevent modifying certain system role properties
    if (existing[0].is_system_role && hierarchy_level !== undefined) {
      return sendError(res, {
        status: 403,
        message: 'Cannot change hierarchy level of system roles',
        error: 'FORBIDDEN'
      });
    }

    const connection = await db.promise().getConnection();

    try {
      await connection.beginTransaction();

      // Update role details
      const updates = [];
      const values = [];

      if (name !== undefined) {
        updates.push('name = ?');
        values.push(name);
      }
      if (description !== undefined) {
        updates.push('description = ?');
        values.push(description);
      }
      if (default_scope_uuid !== undefined) {
        updates.push('default_scope_uuid = ?');
        values.push(default_scope_uuid);
      }
      if (hierarchy_level !== undefined && !existing[0].is_system_role) {
        updates.push('hierarchy_level = ?');
        values.push(hierarchy_level);
      }

      if (updates.length > 0) {
        values.push(uuid);
        await connection.query(
          `UPDATE Roles SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE uuid = ?`,
          values
        );
      }

      // Update module permissions if provided
      if (modules !== undefined) {
        // Remove existing permissions
        await connection.query('DELETE FROM RoleModules WHERE role_uuid = ?', [uuid]);

        // Add new permissions
        for (const modulePerm of modules) {
          await connection.query(
            'INSERT INTO RoleModules (uuid, role_uuid, module_uuid, scope_uuid) VALUES (?, ?, ?, ?)',
            [uuidv4(), uuid, modulePerm.module_uuid, modulePerm.scope_uuid]
          );
        }
      }

      await connection.commit();

      // Fetch updated role
      const role = await moduleAuthService.getRolePermissions(uuid);

      return sendSuccess(res, {
        message: 'Role updated successfully',
        data: { role }
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('[RoleController] Error updating role:', error);
    return sendError(res, {
      status: 500,
      message: 'Failed to update role',
      error: 'INTERNAL_SERVER_ERROR'
    });
  }
}

/**
 * Delete a role (soft delete)
 */
async function deleteRole(req, res) {
  try {
    const { uuid } = req.params;

    // Check if role exists
    const [existing] = await db.promise().query(
      'SELECT is_system_role FROM Roles WHERE uuid = ?',
      [uuid]
    );

    if (existing.length === 0) {
      return sendError(res, {
        status: 404,
        message: 'Role not found',
        error: 'NOT_FOUND'
      });
    }

    // Prevent deleting system roles
    if (existing[0].is_system_role) {
      return sendError(res, {
        status: 403,
        message: 'Cannot delete system roles',
        error: 'FORBIDDEN'
      });
    }

    // Check if role is assigned to users
    const [users] = await db.promise().query(
      'SELECT COUNT(*) as count FROM Users WHERE role_uuid = ?',
      [uuid]
    );

    if (users[0].count > 0) {
      return sendError(res, {
        status: 409,
        message: `Cannot delete role. It is assigned to ${users[0].count} user(s)`,
        error: 'CONFLICT'
      });
    }

    // Soft delete
    await db.promise().query(
      'UPDATE Roles SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE uuid = ?',
      [uuid]
    );

    return sendSuccess(res, {
      message: 'Role deleted successfully',
      data: { uuid }
    });
  } catch (error) {
    console.error('[RoleController] Error deleting role:', error);
    return sendError(res, {
      status: 500,
      message: 'Failed to delete role',
      error: 'INTERNAL_SERVER_ERROR'
    });
  }
}

/**
 * Get all modules
 */
async function getAllModules(req, res) {
  try {
    const modules = await moduleAuthService.getAllModules();

    return sendSuccess(res, {
      message: 'Modules retrieved successfully',
      data: { modules }
    });
  } catch (error) {
    console.error('[RoleController] Error fetching modules:', error);
    return sendError(res, {
      status: 500,
      message: 'Failed to fetch modules',
      error: 'INTERNAL_SERVER_ERROR'
    });
  }
}

/**
 * Get all scopes
 */
async function getAllScopes(req, res) {
  try {
    const scopes = await moduleAuthService.getAllScopes();

    return sendSuccess(res, {
      message: 'Scopes retrieved successfully',
      data: { scopes }
    });
  } catch (error) {
    console.error('[RoleController] Error fetching scopes:', error);
    return sendError(res, {
      status: 500,
      message: 'Failed to fetch scopes',
      error: 'INTERNAL_SERVER_ERROR'
    });
  }
}

/**
 * Get user's permissions
 */
async function getUserPermissions(req, res) {
  try {
    const userUuid = req.user.uuid;

    const permissions = await moduleAuthService.getUserPermissions(userUuid);

    if (!permissions) {
      return sendError(res, {
        status: 404,
        message: 'User permissions not found',
        error: 'NOT_FOUND'
      });
    }

    return sendSuccess(res, {
      message: 'User permissions retrieved successfully',
      data: { permissions }
    });
  } catch (error) {
    console.error('[RoleController] Error fetching user permissions:', error);
    return sendError(res, {
      status: 500,
      message: 'Failed to fetch user permissions',
      error: 'INTERNAL_SERVER_ERROR'
    });
  }
}

/**
 * Check module access
 */
async function checkModuleAccess(req, res) {
  try {
    const userUuid = req.user.uuid;
    const { moduleCode } = req.query;

    if (!moduleCode) {
      return sendError(res, {
        status: 400,
        message: 'Module code is required',
        error: 'VALIDATION_ERROR'
      });
    }

    const access = await moduleAuthService.checkModuleAccess(userUuid, moduleCode);

    return sendSuccess(res, {
      message: 'Module access checked successfully',
      data: {
        hasAccess: !!access,
        access
      }
    });
  } catch (error) {
    console.error('[RoleController] Error checking module access:', error);
    return sendError(res, {
      status: 500,
      message: 'Failed to check module access',
      error: 'INTERNAL_SERVER_ERROR'
    });
  }
}

module.exports = {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  getAllModules,
  getAllScopes,
  getUserPermissions,
  checkModuleAccess
};
