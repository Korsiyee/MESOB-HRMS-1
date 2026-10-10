const express = require("express");
const {
  getBalance,
  rebuildBalance,
  rebuildBalanceByBody,
  rebuildAllBalances,
  getAggregatedBalances,
} = require("../controllers/leaveController");
// Use module-level authorization
const { requireModule, checkSelfAccess } = require("../middleware/moduleAuth");

const router = express.Router();

// Get aggregated balance stats for dashboard
router.get("/balances/aggregated", requireModule('LEAVE_REQUESTS'), getAggregatedBalances);

// Employee can view their own balance, or those with LEAVE module
router.get("/balances/:uuid", checkSelfAccess('LEAVE_REQUESTS'), getBalance);

// HR can rebuild individual balances
router.post("/balances/:uuid/rebuild", requireModule('LEAVE_SETTINGS'), rebuildBalance);
router.post("/balances/rebuild", requireModule('LEAVE_SETTINGS'), rebuildBalanceByBody);

// Only users with LEAVE_SETTINGS module can rebuild all balances
router.post("/balances/rebuild-all", requireModule('LEAVE_SETTINGS'), rebuildAllBalances);

module.exports = router;
