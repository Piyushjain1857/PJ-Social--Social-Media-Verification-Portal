const express = require('express');
const router = express.Router();
const {
  getPendingReviews,
  getSubmissionReviewDetails,
  submitReviewVerdict,
} = require('../controllers/reviewController');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

/**
 * Review Routes - /api/reviews
 *
 * Exclusively accessible to ADMIN and SUPER_ADMIN roles.
 * Normal users (USER) are rejected with HTTP 403 Forbidden.
 */

// GET /api/reviews/pending
// Filterable, searchable, paginated review queue
router.get('/pending', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), getPendingReviews);

// Detailed submission review endpoints
router.get('/submission/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), getSubmissionReviewDetails);
router.get('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), getSubmissionReviewDetails);

// Submit human moderation verdict (Approve / Reject)
router.post('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), submitReviewVerdict);

module.exports = router;
