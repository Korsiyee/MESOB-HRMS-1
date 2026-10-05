/**
 * Permit.io Controller
 * 
 * Provides endpoints for fetching Permit configuration
 * Used by frontend to dynamically fetch roles and permissions
 */

const { permit } = require('../config/permit');

/**
 * Get all available roles from Permit
 * Used by frontend role selection dropdowns
 * 
 * @route GET /api/permit/roles
 * @access Admin only
 */
async function getRoles(req, res) {
  try {
    const roles = await permit.api.roles.list();
    
    // Format for frontend consumption
    const formatted = roles.map(role => ({
      key: role.key,
      name: role.name,
      description: role.description,
    }));
    
    res.json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    console.error('[Permit] Failed to fetch roles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch roles from Permit',
    });
  }
}

/**
 * Get all available resources from Permit
 * Used for documentation or admin interfaces
 * 
 * @route GET /api/permit/resources
 * @access Admin only
 */
async function getResources(req, res) {
  try {
    const resources = await permit.api.resources.list();
    
    const formatted = resources.map(resource => ({
      key: resource.key,
      name: resource.name,
      description: resource.description,
      actions: Object.keys(resource.actions || {}),
    }));
    
    res.json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    console.error('[Permit] Failed to fetch resources:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch resources from Permit',
    });
  }
}

/**
 * Get user's assigned permissions
 * Shows what the current user can do
 * 
 * @route GET /api/permit/my-permissions
 * @access Authenticated
 */
async function getMyPermissions(req, res) {
  try {
    if (!req.user || !req.user.uuid) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }
    
    // Get user's role assignments
    const user = await permit.api.users.get(req.user.uuid);
    
    res.json({
      success: true,
      data: {
        role: user.role || null,
        attributes: user.attributes || {},
      },
    });
  } catch (error) {
    console.error('[Permit] Failed to fetch user permissions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch permissions',
    });
  }
}

module.exports = {
  getRoles,
  getResources,
  getMyPermissions,
};
