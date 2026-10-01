const express = require('express');
const router = express.Router();
const {
  listAccounts,
  getActiveAccounts,
  getAccountDetails
} = require('../controllers/socialAccountController');
const { authenticate } = require('../middlewares/authMiddleware');

/**
 * Official Social Media Accounts (Read-only for creators & staff)
 */

// List official accounts with server-side pagination, search, platform & status filters
router.get('/', authenticate, listAccounts);

// List active official accounts (used by creators when submitting activity)
router.get('/active', authenticate, getActiveAccounts);

// View official account dossier
router.get('/:id', authenticate, getAccountDetails);

module.exports = router;
