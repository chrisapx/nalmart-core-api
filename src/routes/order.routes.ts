import { Router } from 'express';
import {
  createOrder,
  createOrderFromCart,
  getOrders,
  getUserOrders,
  getOrderById,
  getOrderByNumber,
  updateOrder,
  cancelOrder,
  shipOrder,
  deliverOrder,
  recordPayment,
  getOrderStats,
} from '../controllers/order.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';


const router = Router();

/**
 * @route   POST /api/v1/orders
 * @desc    Create a new order
 * @access  Private (Authentication required)
 */
router.post('/', authenticate, createOrder);

/**
 * @route   POST /api/v1/orders/from-cart
 * @desc    Create order from user's cart
 * @access  Private (Authentication required)
 */
router.post('/from-cart', authenticate, createOrderFromCart);

/**
 * @route   GET /api/v1/orders
 * @desc    Get all orders (with filters)
 * @access  Public
 */
router.get('/', getOrders);

/**
 * @route   GET /api/v1/orders/my-orders
 * @desc    Get current user's orders
 * @access  Private (Authentication required)
 */
router.get('/my-orders', authenticate, getUserOrders);

/**
 * @route   GET /api/v1/orders/:id/tracking
 * @desc    Get order tracking information
 * @access  Public
 */
router.get('/:id/tracking', getOrderById);

/**
 * @route   GET /api/v1/orders/stats
 * @desc    Get order statistics
 * @access  Public
 */
router.get('/stats', getOrderStats);

/**
 * @route   GET /api/v1/orders/number/:orderNumber
 * @desc    Get order by order number
 * @access  Public
 */
router.get('/number/:orderNumber', getOrderByNumber);

/**
 * @route   GET /api/v1/orders/:id
 * @desc    Get order by ID
 * @access  Public
 */
router.get('/:id', getOrderById);

/**
 * @route   PUT /api/v1/orders/:id
 * @desc    Update order
 * @access  Private (Authentication required)
 */
router.put('/:id', authenticate, updateOrder);

/**
 * @route   POST /api/v1/orders/:id/cancel
 * @desc    Cancel order
 * @access  Private (Authentication required)
 */
router.post('/:id/cancel', authenticate, cancelOrder);

/**
 * @route   POST /api/v1/orders/:id/ship
 * @desc    Mark order as shipped
 * @access  Public
 */
router.post(
  '/:id/ship',
  authenticate,  // 🔒 ACTIVE RBAC TEST ENDPOINT
  authorize('SHIP_ORDER'),
  shipOrder
);

/**
 * @route   POST /api/v1/orders/:id/deliver
 * @desc    Mark order as delivered
 * @access  Private (Authentication required - Admin)
 */
router.post('/:id/deliver', authenticate, deliverOrder);

/**
 * @route   POST /api/v1/orders/:id/payment
 * @desc    Record payment for order
 * @access  Private (Authentication required)
 */
router.post('/:id/payment', authenticate, recordPayment);

export default router;
