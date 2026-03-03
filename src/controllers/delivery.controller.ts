import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/express';
import DeliveryService from '../services/delivery.service';
import { successResponse } from '../utils/response';
import logger from '../utils/logger';

/**
 * Get all deliveries with pagination
 */
export const getAllDeliveries = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const offset = (page - 1) * limit;

    const result = await DeliveryService.getAllDeliveries(limit, offset);

    successResponse(res, result.data, 'Deliveries retrieved successfully', 200, {
      pagination: { total: result.count, limit, page },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get stores for delivery pricing
 */
export const getStores = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stores = await DeliveryService.getStores({
      is_active:
        req.query.is_active !== undefined
          ? String(req.query.is_active).toLowerCase() === 'true'
          : undefined,
      is_official:
        req.query.is_official !== undefined
          ? String(req.query.is_official).toLowerCase() === 'true'
          : undefined,
    });

    successResponse(res, stores, 'Stores retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Create store for delivery pricing
 */
export const createStore = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const store = await DeliveryService.createStore(req.body);
    successResponse(res, store, 'Store created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Update store
 */
export const updateStore = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const idStr = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const storeId = parseInt(idStr as string, 10);

    if (isNaN(storeId) || storeId < 1) {
      throw new Error('Invalid store ID');
    }

    const store = await DeliveryService.updateStore(storeId, req.body);
    successResponse(res, store, 'Store updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete store
 */
export const deleteStore = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const idStr = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const storeId = parseInt(idStr as string, 10);

    if (isNaN(storeId) || storeId < 1) {
      throw new Error('Invalid store ID');
    }

    await DeliveryService.deleteStore(storeId);
    successResponse(res, null, 'Store deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Calculate shipping fee for a delivery method
 */
export const calculateShippingFee = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { delivery_method_id, total_weight, order_subtotal } = req.body;

    const fee = await DeliveryService.calculateShippingFee(
      delivery_method_id,
      total_weight,
      order_subtotal
    );

    successResponse(res, { shipping_fee: fee }, 'Shipping fee calculated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Create a delivery for an order
 */
export const createDelivery = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const delivery = await DeliveryService.createDelivery(req.body);

    successResponse(res, delivery, 'Delivery created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Get delivery by ID
 */
export const getDeliveryById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const idStr = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const deliveryId = parseInt(idStr as string, 10);

    if (isNaN(deliveryId) || deliveryId < 1) {
      throw new Error('Invalid delivery ID');
    }

    const delivery = await DeliveryService.getDeliveryById(deliveryId);

    if (!delivery) {
      return void successResponse(res, null, 'Delivery not found', 404);
    }

    successResponse(res, delivery, 'Delivery retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get deliveries for an order
 */
export const getDeliveriesByOrder = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const orderIdStr = Array.isArray(req.params.orderId)
      ? req.params.orderId[0]
      : req.params.orderId;
    const orderId = parseInt(orderIdStr as string, 10);

    if (isNaN(orderId) || orderId < 1) {
      throw new Error('Invalid order ID');
    }

    const deliveries = await DeliveryService.getDeliveriesByOrderId(orderId);

    successResponse(res, deliveries, 'Deliveries retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Update delivery status
 */
export const updateDeliveryStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const idStr = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const deliveryId = parseInt(idStr as string, 10);

    if (isNaN(deliveryId) || deliveryId < 1) {
      throw new Error('Invalid delivery ID');
    }

    const { status, location, notes } = req.body;

    const delivery = await DeliveryService.updateDeliveryStatus(
      deliveryId,
      status,
      location,
      notes
    );

    successResponse(res, delivery, 'Delivery status updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Generate tracking number
 */
export const generateTrackingNumber = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const idStr = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const deliveryId = parseInt(idStr as string, 10);

    if (isNaN(deliveryId) || deliveryId < 1) {
      throw new Error('Invalid delivery ID');
    }

    const { carrier_name } = req.body;

    const trackingNumber = await DeliveryService.generateTrackingNumber(
      deliveryId,
      carrier_name
    );

    successResponse(res, { tracking_number: trackingNumber }, 'Tracking number generated');
  } catch (error) {
    next(error);
  }
};

/**
 * Get available delivery methods
 */
export const getAvailableMethods = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const methods = await DeliveryService.getAvailableMethods();

    successResponse(res, methods, 'Delivery methods retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Create delivery method (admin only)
 */
export const createDeliveryMethod = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const method = await DeliveryService.createDeliveryMethod(req.body);

    successResponse(res, method, 'Delivery method created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Update delivery method (admin only)
 */
export const updateDeliveryMethod = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const idStr = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const methodId = parseInt(idStr as string, 10);

    if (isNaN(methodId) || methodId < 1) {
      throw new Error('Invalid method ID');
    }

    const method = await DeliveryService.updateDeliveryMethod(methodId, req.body);

    successResponse(res, method, 'Delivery method updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Create delivery address
 */
export const createDeliveryAddress = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const address = await DeliveryService.createDeliveryAddress({
      ...req.body,
      user_id: req.user?.id,
    });

    successResponse(res, address, 'Delivery address created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's delivery addresses
 */
export const getUserDeliveryAddresses = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const addresses = await DeliveryService.getUserDeliveryAddresses(req.user?.id || 0);

    successResponse(res, addresses, 'Delivery addresses retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Update delivery address
 */
export const updateDeliveryAddress = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const idStr = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const addressId = parseInt(idStr as string, 10);

    if (isNaN(addressId) || addressId < 1) {
      throw new Error('Invalid address ID');
    }

    const address = await DeliveryService.updateDeliveryAddress(
      addressId,
      req.user?.id || 0,
      req.body
    );

    successResponse(res, address, 'Delivery address updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete delivery address
 */
export const deleteDeliveryAddress = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const idStr = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const addressId = parseInt(idStr as string, 10);

    if (isNaN(addressId) || addressId < 1) {
      throw new Error('Invalid address ID');
    }

    await DeliveryService.deleteDeliveryAddress(addressId, req.user?.id || 0);

    successResponse(res, null, 'Delivery address deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get delivery statistics (admin only)
 */
export const getDeliveryStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stats = await DeliveryService.getDeliveryStats();

    successResponse(res, stats, 'Delivery statistics retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/deliveries/methods/categorized
 * Returns methods grouped by category for the checkout delivery step UI.
 */
export const getCategorizedMethods = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const grouped = await DeliveryService.getCategorizedMethods();
    successResponse(res, grouped, 'Delivery methods retrieved by category');
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/deliveries/calculate-fee-by-category
 * Calculate fee using zone/city-aware pricing.
 * Body: { delivery_method_id, city?, weight?, order_subtotal? }
 */
export const calculateFeeByCategory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { delivery_method_id, city, weight, order_subtotal } = req.body;
    if (!delivery_method_id) throw new Error('delivery_method_id is required');
    const result = await DeliveryService.calculateFeeByCategory(
      Number(delivery_method_id),
      city,
      Number(weight || 0),
      Number(order_subtotal || 0),
    );
    successResponse(res, result, 'Delivery fee calculated');
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/deliveries/quote
 * Calculate delivery quote for the current cart + destination.
 */
export const quoteDeliveryFee = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.id) throw new Error('Authentication required');

    const result = await DeliveryService.quoteDeliveryFee({
      user_id: req.user.id,
      items: req.body.items,
      delivery_address_id: req.body.delivery_address_id,
      shipping_address: req.body.shipping_address,
    });

    successResponse(res, result, 'Delivery quote calculated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/deliveries/location/autocomplete
 */
export const autocompleteAddress = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const input = String(req.query.input || '').trim();
    const sessionToken = req.query.session_token ? String(req.query.session_token) : undefined;
    const suggestions = await DeliveryService.autocompleteAddress(input, sessionToken);
    successResponse(res, suggestions, 'Address suggestions retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/deliveries/location/resolve
 */
export const resolveAddressLocation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const resolved = await DeliveryService.resolveAddressLocation(req.body);
    successResponse(res, resolved, 'Address details resolved');
  } catch (error) {
    next(error);
  }
};

export default {
  getStores,
  createStore,
  updateStore,
  deleteStore,
  calculateShippingFee,
  calculateFeeByCategory,
  createDelivery,
  getAllDeliveries,
  getDeliveryById,
  getDeliveriesByOrder,
  updateDeliveryStatus,
  generateTrackingNumber,
  getAvailableMethods,
  getCategorizedMethods,
  quoteDeliveryFee,
  autocompleteAddress,
  resolveAddressLocation,
  createDeliveryMethod,
  updateDeliveryMethod,
  createDeliveryAddress,
  getUserDeliveryAddresses,
  updateDeliveryAddress,
  deleteDeliveryAddress,
  getDeliveryStats,
};
