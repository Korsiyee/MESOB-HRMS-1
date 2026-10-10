const express = require("express");
const {
  createAccount,
  listAccounts,
  getAccount,
  changeAccountRole,
  changeAccountStatus,
  resetAccountPassword,
} = require("../controllers/accountController");
const { requireModule } = require("../middleware/moduleAuth");

const router = express.Router();

router.use(requireModule("ACCOUNTS"));

router.get("/", listAccounts);
router.post("/", createAccount);
router.get("/:uuid", getAccount);
router.patch("/:uuid/role", changeAccountRole);
router.patch("/:uuid/status", changeAccountStatus);
router.patch("/:uuid/reset-password", resetAccountPassword);

module.exports = router;
