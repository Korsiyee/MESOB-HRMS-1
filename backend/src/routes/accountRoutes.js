const express = require("express");
const {
  createAccount,
  listAccounts,
  getAccount,
  changeAccountRole,
  changeAccountStatus,
  resetAccountPassword,
} = require("../controllers/accountController");
// NEW: Use Permit middleware instead of old RBAC
const { authorize } = require("../middleware/permitMiddleware");

const router = express.Router();

// All account management operations require "accounts" permissions
router.post("/", 
  authorize("create", "accounts"),
  createAccount
);

router.get("/", 
  authorize("view", "accounts"),
  listAccounts
);

router.get("/:uuid",
  authorize("view", "accounts"),
  getAccount
);

router.patch("/:uuid/role",
  authorize("assign_role", "accounts"),
  changeAccountRole
);

router.patch("/:uuid/status",
  authorize("update", "accounts"),
  changeAccountStatus
);

router.patch("/:uuid/reset-password",
  authorize("reset_password", "accounts"),
  resetAccountPassword
);

module.exports = router;
