const express = require("express");
const {
  getBalance,
  rebuildBalance,
  rebuildBalanceByBody,
  rebuildAllBalances,
  getAggregatedBalances,
} = require("../controllers/leaveController");
const { requirePermission, requirePermissionOrSelfAccess } = require("../middleware/requirePermission");
const { requireScope } = require("../middleware/requireScope");

const router = express.Router();

// Authorization helpers using new RBAC middleware
const canManageLeaveBalances = requirePermission({ 
  occupations: 'Leave - Manage Requests' 
});

// Get aggregated balance stats for dashboard (HR/Admin only)
router.get("/balances/aggregated",
  requirePermission({
    occupations: 'Dashboard'
  }),
  getAggregatedBalances
);

// Employee can view their own balance, HR can view all with scope
router.get("/balances/:uuid", 
  requirePermissionOrSelfAccess({
    occupations: 'Leave - Overview',
    isSelfAccess: (req) => req.params.uuid === req.user.employee_uuid
  }),
  getBalance
);

// HR can rebuild individual balances
router.post("/balances/:uuid/rebuild", canManageLeaveBalances, rebuildBalance);
router.post("/balances/rebuild", canManageLeaveBalances, rebuildBalanceByBody);

// Only SUPER_ADMIN can rebuild all balances (super critical operation)
router.post("/balances/rebuild-all", 
  requirePermission({ roles: ['SUPER_ADMIN'] }),
  rebuildAllBalances
);

module.exports = router;
