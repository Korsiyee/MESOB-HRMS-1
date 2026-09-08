const express = require("express");
const {
  createAccount,
  listAccounts,
  getAccount,
  changeAccountRole,
  changeAccountStatus,
  resetAccountPassword,
} = require("../controllers/accountController");
const { authorize, requireScopeFilter } = require("../middleware/authorize");

const router = express.Router();

// All account management operations require "accounts" permissions
router.post("/", 
  authorize({ permissions: 'accounts.create' }),
  createAccount
);

router.get("/", 
  authorize({ permissions: 'accounts.view' }),
  requireScopeFilter('account'),
  listAccounts
);

router.get("/:uuid",
  authorize({ permissions: 'accounts.view' }),
  getAccount
);

router.patch("/:uuid/role",
  authorize({ permissions: 'accounts.update_role' }),
  changeAccountRole
);

router.patch("/:uuid/status",
  authorize({ permissions: 'accounts.update' }),
  changeAccountStatus
);

router.patch("/:uuid/reset-password",
  authorize({ permissions: 'accounts.reset_password' }),
  resetAccountPassword
);

module.exports = router;
