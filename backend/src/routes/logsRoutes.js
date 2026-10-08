const express = require("express");
const {
  listLogs,
  getLog,
  getActions,
  getEntityTypes,
  exportLogs,
} = require("../controllers/logController");
const { authorize } = require("../middleware/authorize");

const router = express.Router();

// All log operations require AuditLogs permissions with scope enforcement
router.get("/", authorize({ permissions: 'AuditLogs.View', enforceScope: true }), listLogs);
router.get("/actions", authorize({ permissions: 'AuditLogs.View' }), getActions);
router.get("/entity-types", authorize({ permissions: 'AuditLogs.View' }), getEntityTypes);
router.get("/export", authorize({ permissions: 'AuditLogs.Export', enforceScope: true }), exportLogs);
router.get("/:uuid", authorize({ permissions: 'AuditLogs.View' }), getLog);

module.exports = router;
