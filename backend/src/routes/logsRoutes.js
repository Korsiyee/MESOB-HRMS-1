const express = require("express");
const {
  listLogs,
  getLog,
  getActions,
  getEntityTypes,
  exportLogs,
} = require("../controllers/logController");
const { authorize, requireScopeFilter } = require("../middleware/authorize");

const router = express.Router();

// List logs with filtering and pagination (with scope filtering for Dept Heads)
router.get("/", 
  authorize("AuditLogs.View"),
  requireScopeFilter('audit'),
  listLogs
);

// Get available action types
router.get("/actions", authorize("AuditLogs.View"), getActions);

// Get available entity types
router.get("/entity-types", authorize("AuditLogs.View"), getEntityTypes);

// Export logs to CSV (with scope filtering)
router.get("/export", 
  authorize("AuditLogs.Export"),
  requireScopeFilter('audit'),
  exportLogs
);

// Get single log entry (must be last to avoid route conflicts)
router.get("/:uuid", authorize("AuditLogs.View"), getLog);

module.exports = router;
