/**
 * Module Role Management Routes
 * 
 * Routes for managing roles, modules, and permissions in the new system
 */

const express = require('express');
const router = express.Router();
const moduleRoleController = require('../controllers/moduleRoleController');
const { authenticateJwt } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticateJwt);

// Role management endpoints
router.get('/roles', moduleRoleController.getAllRoles);
router.get('/roles/:uuid', moduleRoleController.getRoleById);
router.post('/roles', moduleRoleController.createRole);
router.put('/roles/:uuid', moduleRoleController.updateRole);
router.delete('/roles/:uuid', moduleRoleController.deleteRole);

// Module and scope endpoints
router.get('/modules', moduleRoleController.getAllModules);
router.get('/scopes', moduleRoleController.getAllScopes);

// User permission endpoints
router.get('/permissions/me', moduleRoleController.getUserPermissions);
router.get('/permissions/check', moduleRoleController.checkModuleAccess);

module.exports = router;
