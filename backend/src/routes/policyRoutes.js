const express = require("express");
const {
  listPolicies,
  getPolicy,
  createPolicy,
  updatePolicy,
  deletePolicy,
} = require("../controllers/policyController");
const { authorize } = require("../middleware/authorize");
const { authenticateJwt } = require("../middleware/authMiddleware");

const router = express.Router();

// View policies (all authenticated users)
router.get("/", authenticateJwt, listPolicies);
router.get("/:leaveType", authenticateJwt, getPolicy);

// Manage policies (requires Policies permission)
router.post("/", authorize("Policies.Create"), createPolicy);
router.patch("/:leaveType", authorize("Policies.Update"), updatePolicy);

// Delete policy (critical operation - requires delete permission)
router.delete("/:leaveType", authorize("Policies.Delete"), deletePolicy);

module.exports = router;
