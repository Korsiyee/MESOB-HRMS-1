/**
 * Role Management Routes
 * 
 * Simplified routes for static RBAC system:
 * - View roles (read-only)
 * - Assign roles to users
 * - View role hierarchy
 * 
 * Note: Module assignments are STATIC and cannot be modified via API
 */

const express = require('express');
const router = express.Router();
const roleManagementController = require('../controllers/roleManagementController');
const { requireRole } = require('../middleware/moduleAuth');

// ============================================================================
// ROLES (Read-Only)
// ============================================================================

/**
 * Get all roles
 * HR_ADMIN and SUPER_ADMIN can view all roles for assignment
 */
router.get(
  '/roles',
  requireRole(['HR_ADMIN', 'SUPER_ADMIN']),
  roleManagementController.getAllRoles
);

/**
 * Get role details with modules (read-only)
 */
router.get(
  '/roles/:roleUuid',
  requireRole(['HR_ADMIN', 'SUPER_ADMIN']),
  roleManagementController.getRoleDetails
);

/**
 * Get users assigned to role
 */
router.get(
  '/roles/:roleUuid/users',
  requireRole(['HR_ADMIN', 'SUPER_ADMIN']),
  roleManagementController.getRoleUsers
);

/**
 * Get role hierarchy
 */
router.get(
  '/roles/hierarchy',
  requireRole(['HR_ADMIN', 'SUPER_ADMIN']),
  roleManagementController.getRoleHierarchy
);

/**
 * Get role statistics
 */
router.get(
  '/roles/:roleUuid/statistics',
  requireRole(['HR_ADMIN', 'SUPER_ADMIN']),
  roleManagementController.getRoleStatistics
);

// ============================================================================
// USER ROLE ASSIGNMENT
// ============================================================================

/**
 * Assign role to user
 * Only HR_ADMIN and SUPER_ADMIN can assign roles
 */
router.put(
  '/users/:userUuid/role',
  requireRole(['HR_ADMIN', 'SUPER_ADMIN']),
  roleManagementController.assignRoleToUser
);

/**
 * Get user's current role
 */
router.get(
  '/users/:userUuid/role',
  requireRole(['HR_ADMIN', 'SUPER_ADMIN']),
  roleManagementController.getUserRole
);

// ============================================================================
// CURRENT USER INFO
// ============================================================================

/**
 * Get current user's role and modules
 * Available to all authenticated users
 */
router.get(
  '/my-permissions',
  roleManagementController.getMyPermissions
);

/**
 * Check if current user can manage roles
 */
router.get(
  '/can-manage',
  roleManagementController.canManageRoles
);

module.exports = router;
