import { Router } from 'express';
import * as DeliveryController from '../controllers/delivery.controller';
import { validateBody } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
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

// ─── Static / prefixed routes MUST come before /:id wildcard ─────────────────

/**
 * POST /api/v1/deliveries/calculate-fee
 */
router.post(
  '/calculate-fee',
  validateBody(calculateShippingFeeSchema),
  DeliveryController.calculateShippingFee
);

/**
 * GET /api/v1/deliveries/methods/available
 */
router.get('/methods/available', DeliveryController.getAvailableMethods);

/**
 * POST /api/v1/deliveries/methods
 */
router.post(
  '/methods',
  validateBody(createDeliveryMethodSchema),
  DeliveryController.createDeliveryMethod
);

/**
 * PUT /api/v1/deliveries/methods/:id
 */
router.put(
  '/methods/:id',
  validateBody(updateDeliveryMethodSchema),
  DeliveryController.updateDeliveryMethod
);

/**
 * GET /api/v1/deliveries/order/:orderId
 */
router.get('/order/:orderId', DeliveryController.getDeliveriesByOrder);

/**
 * POST /api/v1/deliveries/addresses
 */
router.post(
  '/addresses',
  authenticate,
  validateBody(createDeliveryAddressSchema),
  DeliveryController.createDeliveryAddress
);

/**
 * GET /api/v1/deliveries/addresses
 */
router.get('/addresses', authenticate, DeliveryController.getUserDeliveryAddresses);

/**
 * PUT /api/v1/deliveries/addresses/:id
 */
router.put(
  '/addresses/:id',
  authenticate,
  validateBody(updateDeliveryAddressSchema),
  DeliveryController.updateDeliveryAddress
);

/**
 * DELETE /api/v1/deliveries/addresses/:id
 */
router.delete('/addresses/:id', authenticate, DeliveryController.deleteDeliveryAddress);

/**
 * GET /api/v1/deliveries/stats
 */
router.get('/stats', DeliveryController.getDeliveryStats);

// ─── Collection routes ───────────────────────────────────────────────────────

/**
 * POST /api/v1/deliveries
 */
router.post(
  '/',
  validateBody(createDeliverySchema),
  DeliveryController.createDelivery
);

/**
 * GET /api/v1/deliveries
 */
router.get('/', DeliveryController.getAllDeliveries);

// ─── Parameterised routes (/:id) come last to avoid shadowing prefixed paths ─

/**
 * GET /api/v1/deliveries/:id
 */
router.get('/:id', DeliveryController.getDeliveryById);

/**
 * PUT /api/v1/deliveries/:id/status
 */
router.put(
  '/:id/status',
  validateBody(updateDeliveryStatusSchema),
  DeliveryController.updateDeliveryStatus
);

/**
 * POST /api/v1/deliveries/:id/tracking
 */
router.post(
  '/:id/tracking',
  validateBody(generateTrackingNumberSchema),
  DeliveryController.generateTrackingNumber
);

export default router;
