import { Router } from 'express';
import * as FavoriteController from '../controllers/favorite.controller';
import { validateBody, validateQuery } from '../middleware/validation';
import {
  addFavoriteSchema,
  updateFavoriteSchema,
  paginationSchema,
} from '../validators/favorite.validator';

const router = Router();

/**
 * POST /api/v1/favorites
 * Add product to favorites
 */
router.post(
  '/',
  validateBody(addFavoriteSchema),
  FavoriteController.addFavorite
);

/**
 * GET /api/v1/favorites
 * Get user's favorites
 */
router.get(
  '/',
  validateQuery(paginationSchema),
  FavoriteController.getUserFavorites
);

/**
 * GET /api/v1/favorites/:id
 * Get favorite by ID
 */
router.get('/:id', FavoriteController.getFavoriteById);

/**
 * PUT /api/v1/favorites/:id
 * Update favorite
 */
router.put(
  '/:id',
  validateBody(updateFavoriteSchema),
  FavoriteController.updateFavorite
);

/**
 * DELETE /api/v1/favorites/product/:productId
 * Remove product from favorites
 */
router.delete(
  '/product/:productId',
  FavoriteController.removeFavorite
);

/**
 * GET /api/v1/favorites/product/:productId/status
 * Check if product is favorited
 */
router.get('/product/:productId/status', FavoriteController.isFavorited);

/**
 * GET /api/v1/favorites/all
 * Get all favorites
 */
router.get(
  '/all',
  validateQuery(paginationSchema),
  FavoriteController.getAllFavorites
);

/**
 * GET /api/v1/favorites/popular
 * Get most favorited products (public)
 */
router.get('/popular', FavoriteController.getPopularProducts);

/**
 * GET /api/v1/favorites/stats
 * Get favorite statistics
 */
router.get(
  '/stats',
  FavoriteController.getFavoriteStats
);

export default router;
