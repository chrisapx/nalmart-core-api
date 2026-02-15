import { Router } from 'express';
import {
  createOrder,
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
 * @access  Public
 */
router.post('/', createOrder);

/**
 * @route   GET /api/v1/orders
 * @desc    Get all orders (with filters)
 * @access  Public
 */
router.get('/', getOrders);

/**
 * @route   GET /api/v1/orders/my-orders
 * @desc    Get current user's orders
 * @access  Public
 */
router.get('/my-orders', getUserOrders);

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
 * @access  Public
 */
router.put('/:id', updateOrder);

/**
 * @route   POST /api/v1/orders/:id/cancel
 * @desc    Cancel order
 * @access  Public
 */
router.post('/:id/cancel', cancelOrder);

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
 * @access  Public
 */
router.post('/:id/deliver', deliverOrder);

/**
 * @route   POST /api/v1/orders/:id/payment
 * @desc    Record payment for order
 * @access  Public
 */
router.post('/:id/payment', recordPayment);

export default router;
