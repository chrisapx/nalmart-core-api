import Review from '../models/Review';
import Product from '../models/Product';
import User from '../models/User';
import logger from '../utils/logger';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { Op } from 'sequelize';

interface CreateReviewInput {
  product_id: number;
  user_id?: number;
  rating: number;
  title?: string;
  comment: string;
  customer_name: string;
  customer_email?: string;
  is_verified_purchase?: boolean;
  image_urls?: string[];
}

interface UpdateReviewInput {
  rating?: number;
  title?: string;
  comment?: string;
  status?: string;
  admin_notes?: string;
  helpful_count?: number;
  unhelpful_count?: number;
}

export class ReviewService {
  /**
   * Create a new review
   */
  static async createReview(data: CreateReviewInput): Promise<Review> {
    try {
      // Validate product exists
      const product = await Product.findByPk(data.product_id);
      if (!product) {
        throw new NotFoundError(`Product with ID ${data.product_id} not found`);
      }

      // Validate rating
      if (data.rating < 1 || data.rating > 5) {
        throw new BadRequestError('Rating must be between 1 and 5');
      }

      // Check if user already reviewed this product
      if (data.user_id) {
        const existingReview = await Review.findOne({
          where: {
            product_id: data.product_id,
            user_id: data.user_id,
            status: { [Op.ne]: 'rejected' }, // Exclude rejected reviews
          },
        });

        if (existingReview) {
          throw new BadRequestError('You have already reviewd this product');
        }
      }

      const review = await Review.create({
        product_id: data.product_id,
        user_id: data.user_id,
        rating: data.rating,
        title: data.title,
        comment: data.comment,
        customer_name: data.customer_name,
        customer_email: data.customer_email,
        is_verified_purchase: data.is_verified_purchase || false,
        image_urls: data.image_urls || [],
        status: 'pending', // New reviews are pending moderation
      });

      logger.info(`✅ Review created for product ${data.product_id}`);
      return review;
    } catch (error) {
      logger.error('Error creating review:', error);
      throw error;
    }
  }

  /**
   * Get review by ID
   */
  static async getReviewById(reviewId: number): Promise<Review | null> {
    try {
      return await Review.findByPk(reviewId, {
        include: [
          {
            model: Product,
            attributes: ['id', 'name', 'slug'],
          },
          {
            model: User,
            attributes: ['id', 'first_name', 'last_name', 'email'],
          },
        ],
      });
    } catch (error) {
      logger.error('Error fetching review:', error);
      throw error;
    }
  }

  /**
   * Get product reviews with filtering and pagination
   */
  static async getProductReviews(
    productId: number,
    query: any = {}
  ): Promise<{ data: Review[]; count: number; stats: any }> {
    try {
      const limit = parseInt(query.limit) || 20;
      const offset = parseInt(query.offset) || 0;
      const rating = query.rating; // Optional filter by rating
      const status = query.status || 'approved'; // Default to approved reviews only

      const where: any = {
        product_id: productId,
        status,
      };

      if (rating) {
        where.rating = rating;
      }

      const { count, rows } = await Review.findAndCountAll({
        where,
        include: [
          {
            model: User,
            attributes: ['id', 'first_name', 'last_name'],
          },
        ],
        limit,
        offset,
        order: [['created_at', 'DESC']],
      });

      // Calculate review statistics
      const allReviews = await Review.findAll({
        where: { product_id: productId, status: 'approved' },
        attributes: ['rating'],
      });

      const stats = {
        averageRating: 0,
        totalReviews: count,
        ratingDistribution: {
          '5': 0,
          '4': 0,
          '3': 0,
          '2': 0,
          '1': 0,
        } as Record<string, number>,
      };

      if (allReviews.length > 0) {
        const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
        stats.averageRating = parseFloat((totalRating / allReviews.length).toFixed(2));

        // Calculate distribution
        allReviews.forEach((review) => {
          stats.ratingDistribution[review.rating.toString()]++;
        });
      }

      return { data: rows, count, stats };
    } catch (error) {
      logger.error('Error fetching product reviews:', error);
      throw error;
    }
  }

  /**
   * Get all reviews (for admin moderation)
   */
  static async getReviews(query: any = {}): Promise<{ data: Review[]; count: number; pagination: any }> {
    try {
      const limit = parseInt(query.limit) || 20;
      const offset = parseInt(query.offset) || 0;
      const status = query.status;
      const rating = query.rating;
      const productId = query.productId;

      const where: any = {};

      if (status) where.status = status;
      if (rating) where.rating = rating;
      if (productId) where.product_id = productId;

      const { count, rows } = await Review.findAndCountAll({
        where,
        include: [
          {
            model: Product,
            attributes: ['id', 'name', 'slug'],
          },
          {
            model: User,
            attributes: ['id', 'first_name', 'last_name', 'email'],
          },
        ],
        limit,
        offset,
        order: [['created_at', 'DESC']],
      });

      return {
        data: rows,
        count,
        pagination: {
          limit,
          offset,
          total: count,
          pages: Math.ceil(count / limit),
        },
      };
    } catch (error) {
      logger.error('Error fetching reviews:', error);
      throw error;
    }
  }

  /**
   * Update review (for admin moderation)
   */
  static async updateReview(reviewId: number, data: UpdateReviewInput): Promise<Review> {
    try {
      const review = await Review.findByPk(reviewId);
      if (!review) throw new NotFoundError('Review not found');

      if (data.rating) review.rating = data.rating;
      if (data.title) review.title = data.title;
      if (data.comment) review.comment = data.comment;
      if (data.status) review.status = data.status;
      if (data.admin_notes) review.admin_notes = data.admin_notes;
      if (data.helpful_count !== undefined) review.helpful_count = data.helpful_count;
      if (data.unhelpful_count !== undefined) review.unhelpful_count = data.unhelpful_count;

      if (data.status === 'approved' && !review.approved_at) {
        review.approved_at = new Date();
        // TODO: Set approved_by from user context
      }

      await review.save();
      logger.info(`✅ Review updated: ${reviewId}`);
      return review;
    } catch (error) {
      logger.error('Error updating review:', error);
      throw error;
    }
  }

  /**
   * Approve review (admin)
   */
  static async approveReview(reviewId: number, approvedBy?: number): Promise<Review> {
    try {
      const review = await Review.findByPk(reviewId);
      if (!review) throw new NotFoundError('Review not found');

      review.status = 'approved';
      review.approved_at = new Date();
      if (approvedBy) review.approved_by = approvedBy;

      await review.save();
      logger.info(`✅ Review approved: ${reviewId}`);
      return review;
    } catch (error) {
      logger.error('Error approving review:', error);
      throw error;
    }
  }

  /**
   * Reject review (admin)
   */
  static async rejectReview(reviewId: number, reason?: string): Promise<Review> {
    try {
      const review = await Review.findByPk(reviewId);
      if (!review) throw new NotFoundError('Review not found');

      review.status = 'rejected';
      if (reason) review.admin_notes = reason;

      await review.save();
      logger.info(`✅ Review rejected: ${reviewId}`);
      return review;
    } catch (error) {
      logger.error('Error rejecting review:', error);
      throw error;
    }
  }

  /**
   * Mark review as helpful
   */
  static async markHelpful(reviewId: number): Promise<Review> {
    try {
      const review = await Review.findByPk(reviewId);
      if (!review) throw new NotFoundError('Review not found');

      review.helpful_count += 1;
      await review.save();
      return review;
    } catch (error) {
      logger.error('Error marking review as helpful:', error);
      throw error;
    }
  }

  /**
   * Mark review as unhelpful
   */
  static async markUnhelpful(reviewId: number): Promise<Review> {
    try {
      const review = await Review.findByPk(reviewId);
      if (!review) throw new NotFoundError('Review not found');

      review.unhelpful_count += 1;
      await review.save();
      return review;
    } catch (error) {
      logger.error('Error marking review as unhelpful:', error);
      throw error;
    }
  }

  /**
   * Delete review (soft delete via status)
   */
  static async deleteReview(reviewId: number): Promise<void> {
    try {
      const review = await Review.findByPk(reviewId);
      if (!review) throw new NotFoundError('Review not found');

      review.status = 'hidden';
      await review.save();
      logger.info(`✅ Review hidden: ${reviewId}`);
    } catch (error) {
      logger.error('Error deleting review:', error);
      throw error;
    }
  }

  /**
   * Get user reviews
   */
  static async getUserReviews(userId: number, limit: number = 20, offset: number = 0): Promise<{ data: Review[]; count: number }> {
    try {
      const { count, rows } = await Review.findAndCountAll({
        where: { user_id: userId, status: 'approved' },
        include: [
          {
            model: Product,
            attributes: ['id', 'name', 'slug'],
          },
        ],
        limit,
        offset,
        order: [['created_at', 'DESC']],
      });

      return { data: rows, count };
    } catch (error) {
      logger.error('Error fetching user reviews:', error);
      throw error;
    }
  }

  /**
   * Get review statistics for dashboard
   */
  static async getReviewStats(): Promise<any> {
    try {
      const totalReviews = await Review.count();
      const pendingReviews = await Review.count({ where: { status: 'pending' } });
      const approvedReviews = await Review.count({ where: { status: 'approved' } });
      const rejectedReviews = await Review.count({ where: { status: 'rejected' } });

      const avgRating = await Review.findOne({
        attributes: [
          ['AVG(rating)', 'averageRating'],
        ],
        where: { status: 'approved' },
        raw: true,
      }) as any;

      return {
        totalReviews,
        pendingReviews,
        approvedReviews,
        rejectedReviews,
        averageRating: avgRating?.averageRating ? parseFloat(avgRating.averageRating).toFixed(2) : 0,
      };
    } catch (error) {
      logger.error('Error fetching review stats:', error);
      throw error;
    }
  }
}

export default ReviewService;
