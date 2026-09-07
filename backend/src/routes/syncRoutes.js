const express = require("express");
const { syncLeaveData } = require("../controllers/syncController");
const internalApiKeyMiddleware = require("../middleware/internalApiKeyMiddleware");

const router = express.Router();

router.post("/", internalApiKeyMiddleware, syncLeaveData);

module.exports = router;
