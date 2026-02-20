import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/express';
import { OrderService } from '../services/order.service';
import { CartService } from '../services/cart.service';
import { successResponse } from '../utils/response';
import { BadRequestError, NotFoundError } from '../utils/errors';
import logger from '../utils/logger';
import Cart from '../models/Cart';

/**
 * Create a new order
 */
export const createOrder = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Ensure user is authenticated
    if (!req.user || !req.user.id) {
      throw new BadRequestError('Authentication required to create an order');
    }

    const { items, coupon_code, payment_method, shipping_address, billing_address, customer_notes } = req.body;

    const order = await OrderService.createOrder({
      user_id: req.user.id,
      items,
      coupon_code,
      payment_method,
      shipping_address,
      billing_address,
      customer_notes,
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
    });

    successResponse(res, order, 'Order created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Create order from cart
 */
export const createOrderFromCart = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Ensure user is authenticated
    if (!req.user || !req.user.id) {
      throw new BadRequestError('Authentication required to create an order');
    }

    // Get user's cart with items
    const cart = await Cart.findOne({
      where: { user_id: req.user.id },
      include: [
        {
          association: 'CartItems',
          attributes: ['product_id', 'quantity', 'unit_price'],
        },
      ],
    });

    if (!cart || !cart.CartItems || cart.CartItems.length === 0) {
      throw new NotFoundError('Cart is empty');
    }

    // Format cart items for order creation
    const items = cart.CartItems.map((item: any) => ({
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
    }));

    const { coupon_code, payment_method, shipping_address, billing_address, customer_notes } = req.body;

    const order = await OrderService.createOrder({
      user_id: req.user.id,
      items,
      coupon_code,
      payment_method,
      shipping_address,
      billing_address,
      customer_notes,
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
    });

    // Clear cart after successful order
    await CartService.clearCart(req.user.id);

    successResponse(res, order, 'Order created from cart successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Get all orders (admin)
 */
export const getOrders = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await OrderService.getOrders(req.query);

    successResponse(res, result.data, 'Orders retrieved successfully', 200, {
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's orders
 */
export const getUserOrders = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Ensure user is authenticated
    if (!req.user || !req.user.id) {
      throw new BadRequestError('Authentication required to retrieve orders');
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

    const result = await OrderService.getUserOrders(req.user.id, limit, offset);

    successResponse(res, result.data, 'User orders retrieved successfully', 200, {
      pagination: { total: result.count, limit, offset },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get order by ID
 */
export const getOrderById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const idStr = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const orderId = parseInt(idStr as string, 10);

    if (isNaN(orderId) || orderId < 1) {
      throw new Error('Invalid order ID');
    }

    const order = await OrderService.getOrderById(orderId);

    if (!order) {
      return void successResponse(res, null, 'Order not found', 404);
    }

    // Authorization is handled by route middleware
    // Users can view their own orders, admins can view all

    successResponse(res, order, 'Order retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get order by order number
 */
export const getOrderByNumber = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const orderNumber = req.params.orderNumber;

    const order = await OrderService.getOrderByNumber(orderNumber as string);

    if (!order) {
      return void successResponse(res, null, 'Order not found', 404);
    }

    successResponse(res, order, 'Order retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Update order (admin only)
 */
export const updateOrder = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const idStr = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const orderId = parseInt(idStr as string, 10);

    if (isNaN(orderId) || orderId < 1) {
      throw new Error('Invalid order ID');
    }

    const order = await OrderService.updateOrder(orderId, req.body);

    successResponse(res, order, 'Order updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel order
 */
export const cancelOrder = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Ensure user is authenticated
    if (!req.user || !req.user.id) {
      throw new BadRequestError('Authentication required to cancel an order');
    }

    const idStr = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const orderId = parseInt(idStr as string, 10);

    if (isNaN(orderId) || orderId < 1) {
      throw new Error('Invalid order ID');
    }

    const { reason } = req.body;
    const order = await OrderService.cancelOrder(orderId, reason);

    successResponse(res, order, 'Order cancelled successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Ship order
 */
export const shipOrder = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const idStr = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const orderId = parseInt(idStr as string, 10);

    if (isNaN(orderId) || orderId < 1) {
      throw new Error('Invalid order ID');
    }

    const { tracking_number, carrier } = req.body;
    const order = await OrderService.shipOrder(orderId, tracking_number, carrier);

    successResponse(res, order, 'Order shipped successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Deliver order
 */
export const deliverOrder = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Ensure user is authenticated
    if (!req.user || !req.user.id) {
      throw new BadRequestError('Authentication required to mark order as delivered');
    }

    const idStr = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const orderId = parseInt(idStr as string, 10);

    if (isNaN(orderId) || orderId < 1) {
      throw new Error('Invalid order ID');
    }

    const order = await OrderService.deliverOrder(orderId);

    successResponse(res, order, 'Order delivered successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Record payment
 */
export const recordPayment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Ensure user is authenticated
    if (!req.user || !req.user.id) {
      throw new BadRequestError('Authentication required to record payment');
    }

    const idStr = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const orderId = parseInt(idStr as string, 10);

    if (isNaN(orderId) || orderId < 1) {
      throw new Error('Invalid order ID');
    }

    const { transaction_id, payment_method } = req.body;

    if (!transaction_id) {
      throw new BadRequestError('transaction_id is required');
    }

    const order = await OrderService.recordPayment(orderId, transaction_id, payment_method);

    successResponse(res, order, 'Payment recorded successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get order statistics (admin)
 */
export const getOrderStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stats = await OrderService.getOrderStats();

    successResponse(res, stats, 'Order statistics retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export default {
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
};
