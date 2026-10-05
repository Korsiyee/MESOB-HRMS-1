/**
 * Permit.io Routes
 * 
 * Endpoints for fetching Permit configuration
 */

const express = require('express');
const router = express.Router();
const permitController = require('../controllers/permitController');
const { authenticateJwt } = require('../middleware/authMiddleware');

// Get all roles (authenticated users only - needed for dropdowns)
// Note: Authorization happens when actually assigning roles, not when viewing the list
router.get('/roles', authenticateJwt, permitController.getRoles);

// Get all resources (authenticated users only - for documentation)
router.get('/resources', authenticateJwt, permitController.getResources);

// Get current user's permissions (any authenticated user)
router.get('/my-permissions', authenticateJwt, permitController.getMyPermissions);

module.exports = router;
