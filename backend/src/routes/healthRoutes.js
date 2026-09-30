const express = require('express');
const router = express.Router();
const { getHealthStatus, getPortalInfo } = require('../controllers/healthController');

router.get('/health', getHealthStatus);
router.get('/info', getPortalInfo);

module.exports = router;
