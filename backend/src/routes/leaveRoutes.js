const express = require("express");
const {
  getBalance,
  rebuildBalance,
  rebuildBalanceByBody,
  rebuildAllBalances,
  getAggregatedBalances,
} = require("../controllers/leaveController");
const { authorize } = require("../middleware/authorize");

const router = express.Router();

// Helper middleware for self-access OR permission
const allowSelfOrPermission = (permission) => {
  return (req, res, next) => {
    const isSelf = req.params.uuid === req.user.employee_uuid;
    if (isSelf) return next();
    return authorize(permission)(req, res, next);
  };
};

// Get aggregated balance stats for dashboard
router.get("/balances/aggregated", authorize("Dashboard.View"), getAggregatedBalances);

// Employee can view their own balance, HR can view all
router.get("/balances/:uuid", allowSelfOrPermission("Leave.View"), getBalance);

// HR can rebuild individual balances
router.post("/balances/:uuid/rebuild", authorize("Leave.Update"), rebuildBalance);
router.post("/balances/rebuild", authorize("Leave.Update"), rebuildBalanceByBody);

// Only users with explicit permission can rebuild all balances (critical operation)
router.post("/balances/rebuild-all", authorize("Leave.RebuildAll"), rebuildAllBalances);

module.exports = router;
