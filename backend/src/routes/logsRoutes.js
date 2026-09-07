const express = require("express");
const {
  listLogs,
  getLog,
  getActions,
  getEntityTypes,
  exportLogs,
} = require("../controllers/logController");
const { requirePermission } = require("../middleware/requirePermission");
const { requireScope } = require("../middleware/requireScope");

const router = express.Router();

// Audit Logs occupation allows viewing audit logs
const canViewAuditLogs = requirePermission({ 
  occupations: 'Audit Logs' 
});

// List logs with filtering and pagination (with scope)
router.get("/", 
  canViewAuditLogs, 
  requireScope('audit'),
  listLogs
);

// Get available action types
router.get("/actions", canViewAuditLogs, getActions);

// Get available entity types
router.get("/entity-types", canViewAuditLogs, getEntityTypes);

// Export logs to CSV (with scope)
router.get("/export", 
  canViewAuditLogs, 
  requireScope('audit'),
  exportLogs
);

// Get single log entry (must be last to avoid route conflicts)
router.get("/:uuid", canViewAuditLogs, getLog);

module.exports = router;
