const express = require('express');
const router = express.Router();
const healthRoutes = require('./healthRoutes');

// Health and Diagnostics
router.use('/', healthRoutes);

module.exports = router;
