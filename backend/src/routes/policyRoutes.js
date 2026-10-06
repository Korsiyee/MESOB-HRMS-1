const express = require("express");
const {
  listPolicies,
  getPolicy,
  createPolicy,
  updatePolicy,
  deletePolicy,
} = require("../controllers/policyController");
// Use module-level authorization (policies are part of LEAVE module)
const { requireModule } = require("../middleware/moduleAuth");
const { authenticateJwt } = require("../middleware/authMiddleware");

const router = express.Router();

// View policies (all authenticated users)
router.get("/", authenticateJwt, listPolicies);
router.get("/:leaveType", authenticateJwt, getPolicy);

// Manage policies (requires LEAVE module)
router.post("/", requireModule('LEAVE'), createPolicy);
router.patch("/:leaveType", requireModule('LEAVE'), updatePolicy);
router.delete("/:leaveType", requireModule('LEAVE'), deletePolicy);

module.exports = router;
