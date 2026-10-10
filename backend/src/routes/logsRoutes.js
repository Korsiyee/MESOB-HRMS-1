const express = require("express");
const {
  listLogs,
  getLog,
  getActions,
  getEntityTypes,
  exportLogs,
} = require("../controllers/logController");

const router = express.Router();

// All log operations require AuditLogs permissions with scope enforcement

module.exports = router;
