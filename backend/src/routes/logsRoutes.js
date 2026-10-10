const express = require("express");
const {
  listLogs,
  getLog,
  getActions,
  getEntityTypes,
  exportLogs,
} = require("../controllers/logController");
const { requireModule } = require("../middleware/moduleAuth");

const router = express.Router();

router.use(requireModule("AUDIT_LOGS"));

router.get("/", listLogs);
router.get("/actions", getActions);
router.get("/entity-types", getEntityTypes);
router.get("/export", exportLogs);
router.get("/:uuid", getLog);

module.exports = router;
