const express = require("express");
const {
  listPolicies,
  getPolicy,
  createPolicy,
  updatePolicy,
  deletePolicy,
} = require("../controllers/policyController");
const { requirePermission } = require("../middleware/requirePermission");
const { authenticateJwt } = require("../middleware/authMiddleware");

const router = express.Router();

// Leave Policies occupation allows managing leave policies
const canManagePolicies = requirePermission({ 
  occupations: 'Leave Policies' 
});

// View policies (all authenticated users)
router.get("/", authenticateJwt, listPolicies);
router.get("/:leaveType", authenticateJwt, getPolicy);

// Create policy (requires Leave Policies occupation)
router.post("/", canManagePolicies, createPolicy);

// Update policy (requires Leave Policies occupation)
router.patch("/:leaveType", canManagePolicies, updatePolicy);

// Delete policy (SUPER_ADMIN only - super critical operation)
router.delete("/:leaveType", 
  requirePermission({ roles: ['SUPER_ADMIN'] }),
  deletePolicy
);

module.exports = router;
