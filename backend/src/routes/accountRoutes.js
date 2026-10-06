const express = require("express");
const {
  createAccount,
  listAccounts,
  getAccount,
  changeAccountRole,
  changeAccountStatus,
  resetAccountPassword,
} = require("../controllers/accountController");
// Use module-level authorization (accounts are part of ORGANIZATION module)
const { requireModule } = require("../middleware/moduleAuth");

const router = express.Router();

// All account management operations require ORGANIZATION module
router.post("/", requireModule('ORGANIZATION'), createAccount);
router.get("/", requireModule('ORGANIZATION'), listAccounts);
router.get("/:uuid", requireModule('ORGANIZATION'), getAccount);
router.patch("/:uuid/role", requireModule('ORGANIZATION'), changeAccountRole);
router.patch("/:uuid/status", requireModule('ORGANIZATION'), changeAccountStatus);
router.patch("/:uuid/reset-password", requireModule('ORGANIZATION'), resetAccountPassword);

module.exports = router;
