const express = require("express");
const {
  checkDatabaseHealth,
  checkServiceHealth,
} = require("../controllers/healthController");

const router = express.Router();

router.get("/", checkServiceHealth);
router.get("/db", checkDatabaseHealth);

module.exports = router;
