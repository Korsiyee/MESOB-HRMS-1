const express = require("express");
const {
  getBalance,
  rebuildBalance,
  rebuildBalanceByBody,
  rebuildAllBalances,
  getAggregatedBalances,
} = require("../controllers/leaveController");
// NEW: Use Permit middleware instead of old RBAC
const { authorize, allowSelfOr } = require("../middleware/permitMiddleware");

const router = express.Router();

// Get aggregated balance stats for dashboard
router.get("/balances/aggregated", authorize("view", "dashboard"), getAggregatedBalances);

// Employee can view their own balance, HR can view all
router.get("/balances/:uuid", 
  allowSelfOr("view", "leave", req => req.params.uuid),
  getBalance
);

// HR can rebuild individual balances
router.post("/balances/:uuid/rebuild", authorize("update", "leave"), rebuildBalance);
router.post("/balances/rebuild", authorize("update", "leave"), rebuildBalanceByBody);

// Only users with explicit permission can rebuild all balances (critical operation)
router.post("/balances/rebuild-all", authorize("rebuild_all", "leave"), rebuildAllBalances);

module.exports = router;
