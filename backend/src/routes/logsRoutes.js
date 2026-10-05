const express = require("express");
const {
  listLogs,
  getLog,
  getActions,
  getEntityTypes,
  exportLogs,
} = require("../controllers/logController");
// NEW: Use Permit middleware instead of old RBAC
const { authorize } = require("../middleware/permitMiddleware");

const router = express.Router();

// List logs with filtering and pagination (scope filtering in controller)
router.get("/", 
  authorize("view", "logs"),
  listLogs
);

// Get available action types
router.get("/actions", authorize("view", "logs"), getActions);

// Get available entity types
router.get("/entity-types", authorize("view", "logs"), getEntityTypes);

// Export logs to CSV (scope filtering in controller)
router.get("/export", 
  authorize("export", "logs"),
  exportLogs
);

// Get single log entry (must be last to avoid route conflicts)
router.get("/:uuid", authorize("view", "logs"), getLog);

module.exports = router;
