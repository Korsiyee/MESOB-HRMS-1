const express = require("express");
const {
  createAccount,
  listAccounts,
  getAccount,
  changeAccountRole,
  changeAccountStatus,
  resetAccountPassword,
} = require("../controllers/accountController");
const { authorize } = require("../middleware/authorize");

const router = express.Router();

// All account management operations require Accounts permissions
router.post("/", authorize({ permissions: 'Accounts.Create' }), createAccount);
router.get("/", authorize({ permissions: 'Accounts.View' }), listAccounts);
router.get("/:uuid", authorize({ permissions: 'Accounts.View' }), getAccount);
router.patch("/:uuid/role", authorize({ permissions: 'Accounts.Update' }), changeAccountRole);
router.patch("/:uuid/status", authorize({ permissions: 'Accounts.Update' }), changeAccountStatus);
router.patch("/:uuid/reset-password", authorize({ permissions: 'Accounts.Update' }), resetAccountPassword);

module.exports = router;
