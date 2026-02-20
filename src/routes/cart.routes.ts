import { Router } from 'express';
import {
  getMyCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
} from '../controllers/cart.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * @route   GET /api/v1/cart
 * @desc    Get current user's cart
 * @access  Private (Authentication required)
 */
router.get('/', authenticate, getMyCart);

/**
 * @route   POST /api/v1/cart/add
 * @desc    Add item to cart
 * @access  Private (Authentication required)
 */
router.post('/add', authenticate, addToCart);

/**
 * @route   PUT /api/v1/cart/item/:item_id
 * @desc    Update cart item quantity
 * @access  Private (Authentication required)
 */
router.put('/item/:item_id', authenticate, updateCartItem);

/**
 * @route   DELETE /api/v1/cart/item/:item_id
 * @desc    Remove item from cart
 * @access  Private (Authentication required)
 */
router.delete('/item/:item_id', authenticate, removeCartItem);

/**
 * @route   DELETE /api/v1/cart
 * @desc    Clear entire cart
 * @access  Private (Authentication required)
 */
router.delete('/', authenticate, clearCart);

export default router;
