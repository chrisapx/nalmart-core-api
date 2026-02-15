import { Op } from 'sequelize';
import Favorite from '../models/Favorite';
import Product from '../models/Product';
import User from '../models/User';
import { NotFoundError, BadRequestError } from '../utils/errors';
import logger from '../utils/logger';

export class FavoriteService {
  /**
   * Add a product to favorites
   */
  static async addFavorite(data: {
    user_id: number;
    product_id: number;
    notes?: string;
    expected_purchase_date?: Date;
    priority?: string;
  }): Promise<Favorite> {
    try {
      // Verify user exists
      const user = await User.findByPk(data.user_id);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Verify product exists
      const product = await Product.findByPk(data.product_id);
      if (!product) {
        throw new NotFoundError('Product not found');
      }

      // Check if already favorited
      const existing = await Favorite.findOne({
        where: {
          user_id: data.user_id,
          product_id: data.product_id,
        },
      });

      if (existing) {
        throw new BadRequestError('Product is already in your favorites');
      }

      // Create favorite
      const favorite = await Favorite.create({
        user_id: data.user_id,
        product_id: data.product_id,
        notes: data.notes,
        expected_purchase_date: data.expected_purchase_date,
        priority: data.priority || 'medium',
      });

      logger.info(`Product ${data.product_id} added to favorites for user ${data.user_id}`);
      return favorite;
    } catch (error) {
      if (error instanceof (NotFoundError || BadRequestError)) {
        throw error;
      }
      logger.error('Error adding favorite:', error);
      throw new Error('Failed to add favorite');
    }
  }

  /**
   * Remove a product from favorites
   */
  static async removeFavorite(userId: number, productId: number): Promise<void> {
    try {
      const favorite = await Favorite.findOne({
        where: { user_id: userId, product_id: productId },
      });

      if (!favorite) {
        throw new NotFoundError('Favorite not found');
      }

      await favorite.destroy();
      logger.info(`Product ${productId} removed from favorites for user ${userId}`);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Error removing favorite:', error);
      throw new Error('Failed to remove favorite');
    }
  }

  /**
   * Get user's favorites with product details
   */
  static async getUserFavorites(
    userId: number,
    limit: number = 20,
    offset: number = 0,
    sortBy: string = 'created_at',
    order: 'ASC' | 'DESC' = 'DESC'
  ): Promise<{ data: Favorite[]; count: number }> {
    try {
      const { count, rows } = await Favorite.findAndCountAll({
        where: { user_id: userId },
        include: [
          {
            model: Product,
            attributes: [
              'id',
              'name',
              'sku',
              'description',
              'price',
              'stock_status',
              'is_published',
            ],
          },
        ],
        order: [[sortBy, order]],
        limit,
        offset,
      });

      return { data: rows, count };
    } catch (error) {
      logger.error('Error fetching user favorites:', error);
      throw new Error('Failed to fetch favorites');
    }
  }

  /**
   * Check if a product is favorited by user
   */
  static async isFavorited(userId: number, productId: number): Promise<boolean> {
    try {
      const favorite = await Favorite.findOne({
        where: { user_id: userId, product_id: productId },
      });

      return !!favorite;
    } catch (error) {
      logger.error('Error checking favorite status:', error);
      throw new Error('Failed to check favorite status');
    }
  }

  /**
   * Get favorite by ID
   */
  static async getFavoriteById(favoriteId: number): Promise<Favorite | null> {
    try {
      return await Favorite.findByPk(favoriteId, {
        include: [
          {
            model: Product,
            attributes: [
              'id',
              'name',
              'sku',
              'description',
              'price',
              'stock_status',
              'is_published',
            ],
          },
        ],
      });
    } catch (error) {
      logger.error('Error fetching favorite:', error);
      throw new Error('Failed to fetch favorite');
    }
  }

  /**
   * Update favorite (notes, priority, expected purchase date)
   */
  static async updateFavorite(
    favoriteId: number,
    userId: number,
    data: Partial<Favorite>
  ): Promise<Favorite> {
    try {
      const favorite = await Favorite.findOne({
        where: { id: favoriteId, user_id: userId },
      });

      if (!favorite) {
        throw new NotFoundError('Favorite not found');
      }

      await favorite.update({
        notes: data.notes ?? favorite.notes,
        expected_purchase_date: data.expected_purchase_date ?? favorite.expected_purchase_date,
        priority: data.priority ?? favorite.priority,
      });

      logger.info(`Favorite ${favoriteId} updated for user ${userId}`);
      return favorite;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Error updating favorite:', error);
      throw new Error('Failed to update favorite');
    }
  }

  /**
   * Get all favorites (admin)
   */
  static async getAllFavorites(
    limit: number = 20,
    offset: number = 0
  ): Promise<{ data: Favorite[]; count: number }> {
    try {
      const { count, rows } = await Favorite.findAndCountAll({
        include: [
          {
            model: User,
            attributes: ['id', 'first_name', 'last_name', 'email'],
          },
          {
            model: Product,
            attributes: ['id', 'name', 'sku', 'price'],
          },
        ],
        limit,
        offset,
        order: [['created_at', 'DESC']],
      });

      return { data: rows, count };
    } catch (error) {
      logger.error('Error fetching all favorites:', error);
      throw new Error('Failed to fetch favorites');
    }
  }

  /**
   * Get popular products (favorited most)
   */
  static async getPopularProducts(limit: number = 20): Promise<any[]> {
    try {
      const results = await Favorite.findAll({
        attributes: [
          [Favorite.sequelize!.fn('COUNT', Favorite.sequelize!.col('id')), 'favorite_count'],
          'product_id',
        ],
        include: [
          {
            model: Product,
            attributes: ['id', 'name', 'sku', 'price'],
          },
        ],
        group: ['product_id'],
        raw: false,
        subQuery: false,
        limit,
        order: [[Favorite.sequelize!.fn('COUNT', Favorite.sequelize!.col('id')), 'DESC']],
      });

      return results;
    } catch (error) {
      logger.error('Error fetching popular products:', error);
      throw new Error('Failed to fetch popular products');
    }
  }

  /**
   * Get favorite statistics for dashboard
   */
  static async getFavoriteStats(): Promise<Record<string, any>> {
    try {
      const totalFavorites = await Favorite.count();
      const uniqueUsers = await Favorite.count({ distinct: true, col: 'user_id' });
      const uniqueProducts = await Favorite.count({ distinct: true, col: 'product_id' });

      // Get average favorites per user
      const avgPerUser = totalFavorites / (uniqueUsers || 1);

      // Get priority distribution
      const priorityDistribution = await Favorite.findAll({
        attributes: [
          'priority',
          [Favorite.sequelize!.fn('COUNT', Favorite.sequelize!.col('id')), 'count'],
        ],
        group: ['priority'],
        raw: true,
      });

      return {
        total_favorites: totalFavorites,
        unique_users: uniqueUsers,
        unique_products: uniqueProducts,
        avg_favorites_per_user: Number(avgPerUser.toFixed(2)),
        priority_distribution: priorityDistribution,
      };
    } catch (error) {
      logger.error('Error fetching favorite stats:', error);
      throw new Error('Failed to fetch favorite statistics');
    }
  }

  /**
   * Clear old favorites (admin - cleanup function)
   */
  static async clearOldFavorites(daysOld: number = 365): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const count = await Favorite.destroy({
        where: {
          updated_at: { [Op.lt]: cutoffDate },
        },
      });

      logger.info(`Cleared ${count} favorites older than ${daysOld} days`);
      return count;
    } catch (error) {
      logger.error('Error clearing old favorites:', error);
      throw new Error('Failed to clear old favorites');
    }
  }
}

export default FavoriteService;
