import { Router } from 'express';
import * as DeliveryController from '../controllers/delivery.controller';
import { validateBody } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import {
  calculateShippingFeeSchema,
  createDeliverySchema,
  updateDeliveryStatusSchema,
  generateTrackingNumberSchema,
  createDeliveryMethodSchema,
  updateDeliveryMethodSchema,
  createDeliveryAddressSchema,
  updateDeliveryAddressSchema,
  quoteDeliveryFeeSchema,
  resolveAddressLocationSchema,
  createStoreSchema,
  updateStoreSchema,
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
 * GET /api/v1/deliveries/categories
 */
router.get(
  '/categories',
  authenticate,
  authorize(['VIEW_STORE', 'MANAGE_STORE']),
  DeliveryController.getDeliveryCategories,
);

/**
 * PUT /api/v1/deliveries/categories/:id
 */
router.put(
  '/categories/:id',
  authenticate,
  authorize(['UPDATE_STORE', 'MANAGE_STORE']),
  DeliveryController.updateDeliveryCategory,
);

/**
 * GET /api/v1/deliveries/stores
 */
router.get('/stores', authenticate, authorize(['VIEW_STORE', 'MANAGE_STORE']), DeliveryController.getStores);

/**
 * POST /api/v1/deliveries/stores
 */
router.post(
  '/stores',
  authenticate,
  authorize(['CREATE_STORE', 'MANAGE_STORE']),
  validateBody(createStoreSchema),
  DeliveryController.createStore,
);

/**
 * PUT /api/v1/deliveries/stores/:id
 */
router.put(
  '/stores/:id',
  authenticate,
  authorize(['UPDATE_STORE', 'MANAGE_STORE']),
  validateBody(updateStoreSchema),
  DeliveryController.updateStore,
);

/**
 * DELETE /api/v1/deliveries/stores/:id
 */
router.delete(
  '/stores/:id',
  authenticate,
  authorize(['DELETE_STORE', 'MANAGE_STORE']),
  DeliveryController.deleteStore,
);

/**
 * GET /api/v1/deliveries/methods/categorized
 * Returns active methods grouped by category (PickUp / Door / PickUpXpress / DoorXpress).
 */
router.get('/methods/categorized', DeliveryController.getCategorizedMethods);

/**
 * POST /api/v1/deliveries/calculate-fee-by-category
 * Zone/city-aware fee calculation.
 */
router.post('/calculate-fee-by-category', DeliveryController.calculateFeeByCategory);

/**
 * POST /api/v1/deliveries/quote
 */
router.post(
  '/quote',
  authenticate,
  validateBody(quoteDeliveryFeeSchema),
  DeliveryController.quoteDeliveryFee,
);

/**
 * GET /api/v1/deliveries/location/autocomplete
 */
router.get('/location/autocomplete', DeliveryController.autocompleteAddress);

/**
 * POST /api/v1/deliveries/location/resolve
 */
router.post(
  '/location/resolve',
  validateBody(resolveAddressLocationSchema),
  DeliveryController.resolveAddressLocation,
);

/**
 * POST /api/v1/deliveries/methods
 */
router.post(
  '/methods',
  authenticate,
  authorize(['CONFIGURE_SHIPPING', 'MANAGE_SYSTEM']),
  validateBody(createDeliveryMethodSchema),
  DeliveryController.createDeliveryMethod
);

/**
 * PUT /api/v1/deliveries/methods/:id
 */
router.put(
  '/methods/:id',
  authenticate,
  authorize(['CONFIGURE_SHIPPING', 'MANAGE_SYSTEM']),
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

router.get(
  '/stats',
  authenticate,
  authorize(['VIEW_ORDER_ANALYTICS', 'MANAGE_SYSTEM']),
  DeliveryController.getDeliveryStats,
);

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
