/**
 * RBAC Management Routes
 * 
 * Routes for managing:
 * - Role-occupation mappings
 * - User-occupation assignments
 * 
 * Authorization: Most endpoints require SUPER_ADMIN or HR_ADMIN role
 */

const express = require("express");
const router = express.Router();
const rbacController = require("../controllers/rbacController");
const { authenticateJwt } = require("../middleware/authMiddleware");
const { requirePermission } = require("../middleware/requirePermission");

// All routes require authentication
router.use(authenticateJwt);

// ═══════════════════════════════════════════════════════════════════════
// OCCUPATION LIST (HR_ADMIN, SUPER_ADMIN)
// ═══════════════════════════════════════════════════════════════════════

// List all available occupations/permissions
router.get(
  "/occupations",
  requirePermission({ roles: ['SUPER_ADMIN', 'HR_ADMIN'] }),
  rbacController.listOccupations
);

// ═══════════════════════════════════════════════════════════════════════
// ROLE-OCCUPATION MANAGEMENT (SUPER_ADMIN only)
// ═══════════════════════════════════════════════════════════════════════

// Get all occupations for a role
router.get(
  "/roles/:role/occupations",
  requirePermission({ roles: ['SUPER_ADMIN', 'HR_ADMIN'] }),
  rbacController.getRoleOccupations
);

// Assign occupation to a role
router.post(
  "/roles/:role/occupations",
  requirePermission({ roles: ['SUPER_ADMIN'] }),
  rbacController.assignOccupationToRole
);

// Remove occupation from a role
router.delete(
  "/roles/:role/occupations/:occupation_uuid",
  requirePermission({ roles: ['SUPER_ADMIN'] }),
  rbacController.removeOccupationFromRole
);

// ═══════════════════════════════════════════════════════════════════════
// USER LIST FOR RBAC UI (HR_ADMIN, SUPER_ADMIN)
// ═══════════════════════════════════════════════════════════════════════

// List all users with employee info (for RBAC UI)
router.get(
  "/users",
  requirePermission({ roles: ['SUPER_ADMIN', 'HR_ADMIN'] }),
  rbacController.listUsersForRBAC
);

// ═══════════════════════════════════════════════════════════════════════
// USER-OCCUPATION MANAGEMENT (HR_ADMIN, SUPER_ADMIN)
// ═══════════════════════════════════════════════════════════════════════

// Get user's effective occupations
router.get(
  "/users/:user_uuid/occupations",
  requirePermission({ roles: ['SUPER_ADMIN', 'HR_ADMIN', 'HR_OFFICER'] }),
  rbacController.getUserOccupations
);

// Get user's complete effective access (debugging & admin)
router.get(
  "/users/:user_uuid/effective-access",
  requirePermission({ roles: ['SUPER_ADMIN', 'HR_ADMIN'] }),
  rbacController.getEffectiveAccess
);

// Assign occupation to a user
router.post(
  "/users/:user_uuid/occupations",
  requirePermission({ roles: ['SUPER_ADMIN', 'HR_ADMIN'] }),
  rbacController.assignOccupationToUser
);

// Remove occupation from a user
router.delete(
  "/users/:user_uuid/occupations/:occupation_uuid",
  requirePermission({ roles: ['SUPER_ADMIN', 'HR_ADMIN'] }),
  rbacController.removeOccupationFromUser
);

module.exports = router;
