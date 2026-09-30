const express = require('express');
const router = express.Router();
const { getHealthStatus, getDatabaseStatus, getPortalInfo } = require('../controllers/healthController');

router.get('/health', getHealthStatus);
router.get('/database/status', getDatabaseStatus);
router.get('/info', getPortalInfo);

module.exports = router;
