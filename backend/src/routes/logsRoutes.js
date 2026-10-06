const express = require("express");
const {
  listLogs,
  getLog,
  getActions,
  getEntityTypes,
  exportLogs,
} = require("../controllers/logController");
// Use module-level authorization (logs are part of ORGANIZATION module for admins)
const { requireModule, withScope } = require("../middleware/moduleAuth");

const router = express.Router();

// All log operations require ORGANIZATION module with scope filtering
router.get("/", requireModule('ORGANIZATION'), withScope(), listLogs);
router.get("/actions", requireModule('ORGANIZATION'), getActions);
router.get("/entity-types", requireModule('ORGANIZATION'), getEntityTypes);
router.get("/export", requireModule('ORGANIZATION'), withScope(), exportLogs);
router.get("/:uuid", requireModule('ORGANIZATION'), getLog);

module.exports = router;
