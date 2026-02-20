import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/express';
import { CartService } from '../services/cart.service';
import { successResponse } from '../utils/response';
import { BadRequestError } from '../utils/errors';
import logger from '../utils/logger';

/**
 * Get user's cart
 */
export const getMyCart = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.id) {
      throw new BadRequestError('Authentication required');
    }

    const result = await CartService.getCart(req.user.id);

    successResponse(res, result, 'Cart retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
};

/**
 * Add item to cart
 */
export const addToCart = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.id) {
      throw new BadRequestError('Authentication required');
    }

    const { product_id, quantity, variants } = req.body;

    if (!product_id || !quantity) {
      throw new BadRequestError('Product ID and quantity are required');
    }

    const item = await CartService.addToCart(req.user.id, product_id, quantity, variants || {});

    successResponse(res, item, 'Item added to cart successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Update cart item quantity
 */
export const updateCartItem = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.id) {
      throw new BadRequestError('Authentication required');
    }

    const itemId = Array.isArray(req.params.item_id) ? req.params.item_id[0] : req.params.item_id;
    const { quantity } = req.body;

    if (!itemId || quantity === undefined) {
      throw new BadRequestError('Item ID and quantity are required');
    }

    const item = await CartService.updateCartItem(req.user.id, parseInt(itemId), quantity);

    successResponse(res, item, 'Cart item updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Remove item from cart
 */
export const removeCartItem = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.id) {
      throw new BadRequestError('Authentication required');
    }

    const itemId = Array.isArray(req.params.item_id) ? req.params.item_id[0] : req.params.item_id;

    if (!itemId) {
      throw new BadRequestError('Item ID is required');
    }

    await CartService.removeFromCart(req.user.id, parseInt(itemId));

    successResponse(res, null, 'Item removed from cart successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Clear entire cart
 */
export const clearCart = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.id) {
      throw new BadRequestError('Authentication required');
    }

    await CartService.clearCart(req.user.id);

    successResponse(res, null, 'Cart cleared successfully');
  } catch (error) {
    next(error);
  }
};
