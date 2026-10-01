const express = require('express');
const router = express.Router();
const { globalSearch } = require('../controllers/searchController');
const { authenticate } = require('../middlewares/authMiddleware');

/**
 * GET /api/search
 * Protected: Authenticated users (USER, ADMIN, SUPER_ADMIN)
 * Unified cross-system global search endpoint.
 */
router.get('/', authenticate, globalSearch);

module.exports = router;
