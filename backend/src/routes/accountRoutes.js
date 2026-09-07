const express = require("express");
const {
  createAccount,
  listAccounts,
  getAccount,
  changeAccountRole,
  changeAccountStatus,
  resetAccountPassword,
} = require("../controllers/accountController");
const { requirePermission } = require("../middleware/requirePermission");
const { requireScope } = require("../middleware/requireScope");

const router = express.Router();

// All account management operations require "Accounts" occupation
const accountAccess = requirePermission({ 
  occupations: 'Accounts' 
});

router.post("/", accountAccess, createAccount);
router.get("/", 
  accountAccess, 
  requireScope('account'),
  listAccounts
);
router.get("/:uuid", accountAccess, getAccount);
router.patch("/:uuid/role", accountAccess, changeAccountRole);
router.patch("/:uuid/status", accountAccess, changeAccountStatus);
router.patch("/:uuid/reset-password", accountAccess, resetAccountPassword);

module.exports = router;
