const express = require("express");
const {
  createAccount,
  listAccounts,
  getAccount,
  changeAccountRole,
  changeAccountStatus,
  resetAccountPassword,
} = require("../controllers/accountController");

const router = express.Router();

// All account management operations require Accounts permissions

module.exports = router;
