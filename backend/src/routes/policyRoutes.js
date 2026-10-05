const express = require("express");
const {
  listPolicies,
  getPolicy,
  createPolicy,
  updatePolicy,
  deletePolicy,
} = require("../controllers/policyController");
// NEW: Use Permit middleware instead of old RBAC
const { authorize } = require("../middleware/permitMiddleware");
const { authenticateJwt } = require("../middleware/authMiddleware");

const router = express.Router();

// View policies (all authenticated users)
router.get("/", authenticateJwt, listPolicies);
router.get("/:leaveType", authenticateJwt, getPolicy);

// Manage policies (requires Policies permission)
router.post("/", authorize("create", "policies"), createPolicy);
router.patch("/:leaveType", authorize("update", "policies"), updatePolicy);

// Delete policy (critical operation - requires delete permission)
router.delete("/:leaveType", authorize("delete", "policies"), deletePolicy);

module.exports = router;
