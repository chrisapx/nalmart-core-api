import { Router } from 'express';
import * as DeliveryController from '../controllers/delivery.controller';
import { validateBody } from '../middleware/validation';
import {
  calculateShippingFeeSchema,
  createDeliverySchema,
  updateDeliveryStatusSchema,
  generateTrackingNumberSchema,
  createDeliveryMethodSchema,
  updateDeliveryMethodSchema,
  createDeliveryAddressSchema,
  updateDeliveryAddressSchema,
} from '../validators/delivery.validator';

const router = Router();

/**
 * POST /api/v1/deliveries/calculate-fee
 * Calculate shipping fee for a delivery method
 */
router.post(
  '/calculate-fee',
  validateBody(calculateShippingFeeSchema),
  DeliveryController.calculateShippingFee
);

/**
 * POST /api/v1/deliveries
 * Create a delivery for an order
 */
router.post(
  '/',
  validateBody(createDeliverySchema),
  DeliveryController.createDelivery
);

/**
 * GET /api/v1/deliveries
 * Get all deliveries with pagination
 */
router.get('/', DeliveryController.getAllDeliveries);

/**
 * GET /api/v1/deliveries/:id
 * Get delivery by ID
 */
router.get('/:id', DeliveryController.getDeliveryById);

/**
 * GET /api/v1/deliveries/order/:orderId
 * Get deliveries for a specific order
 */
router.get('/order/:orderId', DeliveryController.getDeliveriesByOrder);

/**
 * PUT /api/v1/deliveries/:id/status
 * Update delivery status
 */
router.put(
  '/:id/status',
  validateBody(updateDeliveryStatusSchema),
  DeliveryController.updateDeliveryStatus
);

/**
 * POST /api/v1/deliveries/:id/tracking
 * Generate tracking number
 */
router.post(
  '/:id/tracking',
  validateBody(generateTrackingNumberSchema),
  DeliveryController.generateTrackingNumber
);

/**
 * GET /api/v1/deliveries/methods/available
 * Get available delivery methods (public)
 */
router.get('/methods/available', DeliveryController.getAvailableMethods);

/**
 * POST /api/v1/deliveries/methods
 * Create delivery method
 */
router.post(
  '/methods',
  validateBody(createDeliveryMethodSchema),
  DeliveryController.createDeliveryMethod
);

/**
 * PUT /api/v1/deliveries/methods/:id
 * Update delivery method
 */
router.put(
  '/methods/:id',
  validateBody(updateDeliveryMethodSchema),
  DeliveryController.updateDeliveryMethod
);

/**
 * POST /api/v1/deliveries/addresses
 * Create delivery address
 */
router.post(
  '/addresses',
  validateBody(createDeliveryAddressSchema),
  DeliveryController.createDeliveryAddress
);

/**
 * GET /api/v1/deliveries/addresses
 * Get user's delivery addresses
 */
router.get('/addresses', DeliveryController.getUserDeliveryAddresses);

/**
 * PUT /api/v1/deliveries/addresses/:id
 * Update user's delivery address
 */
router.put(
  '/addresses/:id',
  validateBody(updateDeliveryAddressSchema),
  DeliveryController.updateDeliveryAddress
);

/**
 * DELETE /api/v1/deliveries/addresses/:id
 * Delete user's delivery address
 */
router.delete('/addresses/:id', DeliveryController.deleteDeliveryAddress);

/**
 * GET /api/v1/deliveries/stats
 * Get delivery statistics
 */
router.get(
  '/stats',
  DeliveryController.getDeliveryStats
);

export default router;
