/**
 * RBAC Management Routes
 * 
 * Routes for managing:
 * - Role-occupation mappings
 * - User-occupation assignments
 * 
 * Authorization: Requires rbac.view or rbac.manage permissions
 */

const express = require("express");
const router = express.Router();
const rbacController = require("../controllers/rbacController");
const { authenticateJwt } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/authorize");

// All routes require authentication
router.use(authenticateJwt);

// ═══════════════════════════════════════════════════════════════════════
// OCCUPATION LIST
// ═══════════════════════════════════════════════════════════════════════

// List all available occupations/permissions
router.get(
  "/occupations",
  authorize({ permissions: 'rbac.view' }),
  rbacController.listOccupations
);

// ═══════════════════════════════════════════════════════════════════════
// ROLE-OCCUPATION MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════

// Get all occupations for a role
router.get(
  "/roles/:role/occupations",
  authorize({ permissions: 'rbac.view' }),
  rbacController.getRoleOccupations
);

// Assign occupation to a role
router.post(
  "/roles/:role/occupations",
  authorize({ permissions: 'rbac.manage' }),
  rbacController.assignOccupationToRole
);

// Remove occupation from a role
router.delete(
  "/roles/:role/occupations/:occupation_uuid",
  authorize({ permissions: 'rbac.manage' }),
  rbacController.removeOccupationFromRole
);

// ═══════════════════════════════════════════════════════════════════════
// USER LIST FOR RBAC UI
// ═══════════════════════════════════════════════════════════════════════

// List all users with employee info (for RBAC UI)
router.get(
  "/users",
  authorize({ permissions: 'rbac.view' }),
  rbacController.listUsersForRBAC
);

// ═══════════════════════════════════════════════════════════════════════
// USER-OCCUPATION MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════

// Get user's effective occupations
router.get(
  "/users/:user_uuid/occupations",
  authorize({ permissions: 'rbac.view' }),
  rbacController.getUserOccupations
);

// Get user's complete effective access (debugging & admin)
router.get(
  "/users/:user_uuid/effective-access",
  authorize({ permissions: 'rbac.view' }),
  rbacController.getEffectiveAccess
);

// Assign occupation to a user
router.post(
  "/users/:user_uuid/occupations",
  authorize({ permissions: 'rbac.manage' }),
  rbacController.assignOccupationToUser
);

// Remove occupation from a user
router.delete(
  "/users/:user_uuid/occupations/:occupation_uuid",
  authorize({ permissions: 'rbac.manage' }),
  rbacController.removeOccupationFromUser
);

module.exports = router;
