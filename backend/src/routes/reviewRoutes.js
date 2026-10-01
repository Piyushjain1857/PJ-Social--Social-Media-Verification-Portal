const express = require('express');
const router = express.Router();
const {
  getPendingReviews,
  getSubmissionReviewDetails,
  submitReviewVerdict,
  approveReview,
  rejectReview,
  postInternalNote,
  postClarificationRequest,
  getQueueNavigationDetails,
  getSubmissionReviewHistory,
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

// Navigation within moderation queue
router.get('/submission/:id/navigation', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), getQueueNavigationDetails);
router.get('/:id/navigation', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), getQueueNavigationDetails);

// Full review history & audit trail
router.get('/submission/:id/history', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), getSubmissionReviewHistory);
router.get('/:id/history', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), getSubmissionReviewHistory);

// Internal notes attached by administrators
router.post('/submission/:id/notes', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), postInternalNote);
router.post('/:id/notes', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), postInternalNote);

// Clarification requests sent to creators
router.post('/submission/:id/clarification', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), postClarificationRequest);
router.post('/:id/clarification', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), postClarificationRequest);

// Detailed submission review endpoints
router.get('/submission/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), getSubmissionReviewDetails);
router.get('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), getSubmissionReviewDetails);

// Submit human moderation verdict (Approve / Reject)
router.post('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), submitReviewVerdict);
router.post('/:id/approve', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), approveReview);
router.post('/:id/reject', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), rejectReview);
router.put('/:id/approve', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), approveReview);
router.put('/:id/reject', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), rejectReview);

// Submission path aliases for frontend or external client consistency
router.post('/submission/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), submitReviewVerdict);
router.post('/submission/:id/approve', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), approveReview);
router.post('/submission/:id/reject', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), rejectReview);
router.put('/submission/:id/approve', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), approveReview);
router.put('/submission/:id/reject', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), rejectReview);

module.exports = router;
