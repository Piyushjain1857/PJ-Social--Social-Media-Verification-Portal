const express = require('express');
const router = express.Router();
const {
  create,
  getMy,
  getAll,
  getById,
  review
} = require('../controllers/submissionController');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

/**
 * USER Permission: Create submissions
 * Open to USER, ADMIN, and SUPER_ADMIN
 */
router.post('/', authenticate, authorize('USER', 'ADMIN', 'SUPER_ADMIN'), create);

/**
 * USER Permission: View own submissions
 * Returns records where userId === req.user.id
 */
router.get('/my', authenticate, authorize('USER', 'ADMIN', 'SUPER_ADMIN'), getMy);

/**
 * ADMIN & SUPER_ADMIN Permission: View all submissions / moderation queue
 * Strict RBAC: Normal USER will receive HTTP 403 Forbidden!
 */
router.get('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), getAll);

/**
 * Specific submission inspection
 * USER can only inspect their own; ADMIN & SUPER_ADMIN can inspect all
 */
router.get('/:id', authenticate, authorize('USER', 'ADMIN', 'SUPER_ADMIN'), getById);

/**
 * ADMIN & SUPER_ADMIN Permission: Review submissions (Approve / Reject)
 * Strict RBAC: Normal USER will receive HTTP 403 Forbidden!
 */
router.post('/:id/review', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), review);
router.patch('/:id/review', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), review);

module.exports = router;
