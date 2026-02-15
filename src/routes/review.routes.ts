import { Router } from 'express';
import * as ReviewController from '../controllers/review.controller';
import { validateBody, validateQuery } from '../middleware/validation';
import {
  createReviewSchema,
  updateReviewSchema,
  rejectReviewSchema,
  filterReviewsSchema,
  paginationSchema,
} from '../validators/review.validator';

const router = Router();

/**
 * GET /api/v1/reviews/stats
 * Get review statistics
 */
router.get('/stats', ReviewController.getReviewStats);

/**
 * GET /api/v1/reviews/my-reviews
 * Get current user's reviews
 */
router.get('/my-reviews', ReviewController.getUserReviews);

/**
 * GET /api/v1/reviews/product/:productId
 * Get reviews for a specific product
 */
router.get('/product/:productId', ReviewController.getProductReviews);

/**
 * GET /api/v1/reviews
 * Get all reviews with filtering
 */
router.get(
  '/',
  validateQuery(filterReviewsSchema),
  ReviewController.getReviews
);

/**
 * GET /api/v1/reviews/:id
 * Get review by ID
 */
router.get('/:id', ReviewController.getReviewById);

/**
 * POST /api/v1/reviews
 * Create a new review
 */
router.post(
  '/',
  validateBody(createReviewSchema),
  ReviewController.createReview
);

/**
 * PUT /api/v1/reviews/:id
 * Update review
 */
router.put(
  '/:id',
  validateBody(updateReviewSchema),
  ReviewController.updateReview
);

/**
 * POST /api/v1/reviews/:id/approve
 * Approve review
 */
router.post(
  '/:id/approve',
  ReviewController.approveReview
);

/**
 * POST /api/v1/reviews/:id/reject
 * Reject review
 */
router.post(
  '/:id/reject',
  validateBody(rejectReviewSchema),
  ReviewController.rejectReview
);

/**
 * POST /api/v1/reviews/:id/helpful
 * Mark review as helpful
 */
router.post('/:id/helpful', ReviewController.markHelpful);

/**
 * POST /api/v1/reviews/:id/unhelpful
 * Mark review as unhelpful
 */
router.post('/:id/unhelpful', ReviewController.markUnhelpful);

/**
 * DELETE /api/v1/reviews/:id
 * Delete review
 */
router.delete(
  '/:id',
  ReviewController.deleteReview
);

export default router;
