import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/express';
import FavoriteService from '../services/favorite.service';
import { successResponse } from '../utils/response';
import logger from '../utils/logger';

/**
 * Add product to favorites
 */
export const addFavorite = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const favorite = await FavoriteService.addFavorite({
      ...req.body,
      user_id: req.user?.id,
    });

    successResponse(res, favorite, 'Product added to favorites', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Remove product from favorites
 */
export const removeFavorite = async (
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

    await FavoriteService.removeFavorite(req.user?.id || 0, productId);

    successResponse(res, null, 'Product removed from favorites');
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's favorites
 */
export const getUserFavorites = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const offset = (page - 1) * limit;
    const sortBy = (req.query.sortBy as string) || 'created_at';
    const order = ((req.query.order as string) || 'DESC').toUpperCase() as 'ASC' | 'DESC';

    const result = await FavoriteService.getUserFavorites(
      req.user?.id || 0,
      limit,
      offset,
      sortBy,
      order
    );

    successResponse(res, result.data, 'User favorites retrieved successfully', 200, {
      pagination: { total: result.count, limit, page },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Check if product is favorited
 */
export const isFavorited = async (
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

    const isFav = await FavoriteService.isFavorited(req.user?.id || 0, productId);

    successResponse(res, { is_favorited: isFav }, 'Favorite status retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * Get favorite by ID
 */
export const getFavoriteById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const idStr = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const favoriteId = parseInt(idStr as string, 10);

    if (isNaN(favoriteId) || favoriteId < 1) {
      throw new Error('Invalid favorite ID');
    }

    const favorite = await FavoriteService.getFavoriteById(favoriteId);

    if (!favorite) {
      return void successResponse(res, null, 'Favorite not found', 404);
    }

    successResponse(res, favorite, 'Favorite retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Update favorite
 */
export const updateFavorite = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const idStr = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const favoriteId = parseInt(idStr as string, 10);

    if (isNaN(favoriteId) || favoriteId < 1) {
      throw new Error('Invalid favorite ID');
    }

    const favorite = await FavoriteService.updateFavorite(
      favoriteId,
      req.user?.id || 0,
      req.body
    );

    successResponse(res, favorite, 'Favorite updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get all favorites (admin only)
 */
export const getAllFavorites = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const offset = (page - 1) * limit;

    const result = await FavoriteService.getAllFavorites(limit, offset);

    successResponse(res, result.data, 'All favorites retrieved successfully', 200, {
      pagination: { total: result.count, limit, page },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get popular products (most favorited)
 */
export const getPopularProducts = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

    const products = await FavoriteService.getPopularProducts(limit);

    successResponse(res, products, 'Popular products retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get favorite statistics (admin dashboard)
 */
export const getFavoriteStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stats = await FavoriteService.getFavoriteStats();

    successResponse(res, stats, 'Favorite statistics retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export default {
  addFavorite,
  removeFavorite,
  getUserFavorites,
  isFavorited,
  getFavoriteById,
  updateFavorite,
  getAllFavorites,
  getPopularProducts,
  getFavoriteStats,
};
