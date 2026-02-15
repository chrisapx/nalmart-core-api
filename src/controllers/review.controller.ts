import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/express';
import { ReviewService } from '../services/review.service';
import { successResponse } from '../utils/response';
import { BadRequestError } from '../utils/errors';
import logger from '../utils/logger';

/**
 * Create a new review for a product
 */
export const createReview = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { product_id, rating, title, comment, customer_name, customer_email, image_urls } = req.body;

    const review = await ReviewService.createReview({
      product_id,
      user_id: req.user?.id,
      rating,
      title,
      comment,
      customer_name,
      customer_email,
      is_verified_purchase: false,
      image_urls,
    });

    successResponse(res, review, 'Review created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Get reviews for a product
 */
export const getProductReviews = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const productIdStr = Array.isArray(req.params.productId) ? req.params.productId[0] : req.params.productId;
    const productId = parseInt(productIdStr as string, 10);

    if (isNaN(productId) || productId < 1) {
      throw new Error('Invalid product ID');
    }

    const result = await ReviewService.getProductReviews(productId, req.query);

    successResponse(res, result.data, 'Product reviews retrieved successfully', 200, {
      pagination: {
        total: result.count,
        limit: parseInt((req.query.limit as string) || '20'),
        offset: parseInt((req.query.offset as string) || '0'),
      },
      stats: result.stats,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all reviews (admin)
 */
export const getReviews = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await ReviewService.getReviews(req.query);

    successResponse(res, result.data, 'Reviews retrieved successfully', 200, {
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get review by ID
 */
export const getReviewById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const idStr = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const reviewId = parseInt(idStr as string, 10);

    if (isNaN(reviewId) || reviewId < 1) {
      throw new Error('Invalid review ID');
    }

    const review = await ReviewService.getReviewById(reviewId);

    if (!review) {
      return void successResponse(res, null, 'Review not found', 404);
    }

    successResponse(res, review, 'Review retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Update review (admin moderation)
 */
export const updateReview = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const idStr = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const reviewId = parseInt(idStr as string, 10);

    if (isNaN(reviewId) || reviewId < 1) {
      throw new Error('Invalid review ID');
    }

    const review = await ReviewService.updateReview(reviewId, req.body);

    successResponse(res, review, 'Review updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Approve review (admin)
 */
export const approveReview = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const idStr = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const reviewId = parseInt(idStr as string, 10);

    if (isNaN(reviewId) || reviewId < 1) {
      throw new Error('Invalid review ID');
    }

    const review = await ReviewService.approveReview(reviewId, req.user?.id);

    successResponse(res, review, 'Review approved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Reject review (admin)
 */
export const rejectReview = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const idStr = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const reviewId = parseInt(idStr as string, 10);

    if (isNaN(reviewId) || reviewId < 1) {
      throw new Error('Invalid review ID');
    }

    const { reason } = req.body;
    const review = await ReviewService.rejectReview(reviewId, reason);

    successResponse(res, review, 'Review rejected successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Mark review as helpful
 */
export const markHelpful = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const idStr = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const reviewId = parseInt(idStr as string, 10);

    if (isNaN(reviewId) || reviewId < 1) {
      throw new Error('Invalid review ID');
    }

    const review = await ReviewService.markHelpful(reviewId);

    successResponse(res, review, 'Review marked as helpful');
  } catch (error) {
    next(error);
  }
};

/**
 * Mark review as unhelpful
 */
export const markUnhelpful = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const idStr = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const reviewId = parseInt(idStr as string, 10);

    if (isNaN(reviewId) || reviewId < 1) {
      throw new Error('Invalid review ID');
    }

    const review = await ReviewService.markUnhelpful(reviewId);

    successResponse(res, review, 'Review marked as unhelpful');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete review (admin)
 */
export const deleteReview = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const idStr = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const reviewId = parseInt(idStr as string, 10);

    if (isNaN(reviewId) || reviewId < 1) {
      throw new Error('Invalid review ID');
    }

    await ReviewService.deleteReview(reviewId);

    successResponse(res, null, 'Review deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get user reviews
 */
export const getUserReviews = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

    const result = await ReviewService.getUserReviews(req.user?.id || 0, limit, offset);

    successResponse(res, result.data, 'User reviews retrieved successfully', 200, {
      pagination: { total: result.count, limit, offset },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get review statistics (admin dashboard)
 */
export const getReviewStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stats = await ReviewService.getReviewStats();

    successResponse(res, stats, 'Review statistics retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export default {
  createReview,
  getProductReviews,
  getReviews,
  getReviewById,
  updateReview,
  approveReview,
  rejectReview,
  markHelpful,
  markUnhelpful,
  deleteReview,
  getUserReviews,
  getReviewStats,
};
