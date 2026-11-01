const express = require('express');
const router = express.Router();
const { initializeDatabaseViaHTTP } = require('../controllers/initController');

// Database initialization endpoint
// GET /api/init/database?secret=mesob-init-2024
router.get('/database', initializeDatabaseViaHTTP);

module.exports = router;
