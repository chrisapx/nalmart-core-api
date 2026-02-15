import { Router } from 'express';
import * as CampaignController from '../controllers/campaign.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { validateBody, validateQuery } from '../middleware/validation';
import {
  createCampaignSchema,
  updateCampaignSchema,
  createPromotionSchema,
  validatePromoCodeSchema,
  calculateDiscountSchema,
  applyPromoCodeSchema,
  campaignFilterSchema,
} from '../validators/campaign.validator';

const router = Router();

/**
 * POST /api/v1/campaigns
 * Create campaign
 */
router.post(
  '/',
  validateBody(createCampaignSchema),
  CampaignController.createCampaign
);

/**
 * GET /api/v1/campaigns
 * Get all campaigns with filters
 */
router.get(
  '/',
  validateQuery(campaignFilterSchema),
  CampaignController.getCampaigns
);

/**
 * GET /api/v1/campaigns/active
 * Get active campaigns (public)
 */
router.get('/active', CampaignController.getActiveCampaigns);

/**
 * GET /api/v1/campaigns/:id
 * Get campaign by ID
 */
router.get('/:id', CampaignController.getCampaignById);

/**
 * PUT /api/v1/campaigns/:id
 * Update campaign
 */
router.put(
  '/:id',
  validateBody(updateCampaignSchema),
  CampaignController.updateCampaign
);

/**
 * DELETE /api/v1/campaigns/:id
 * Delete campaign
 */
router.delete(
  '/:id',
  authenticate,  // 🔒 ACTIVE RBAC TEST ENDPOINT
  authorize('DELETE_CAMPAIGN'),
  CampaignController.deleteCampaign
);

/**
 * POST /api/v1/campaigns/:id/promotions
 * Create promotion code
 */
router.post(
  '/:id/promotions',
  validateBody(createPromotionSchema),
  CampaignController.createPromotion
);

/**
 * POST /api/v1/campaigns/validate-code
 * Validate promo code (public)
 */
router.post(
  '/validate-code',
  validateBody(validatePromoCodeSchema),
  CampaignController.validatePromoCode
);

/**
 * POST /api/v1/campaigns/calculate-discount
 * Calculate discount from promo code (public)
 */
router.post(
  '/calculate-discount',
  validateBody(calculateDiscountSchema),
  CampaignController.calculateDiscount
);

/**
 * POST /api/v1/campaigns/apply-code
 * Apply promo code
 */
router.post(
  '/apply-code',
  validateBody(applyPromoCodeSchema),
  CampaignController.applyPromoCode
);

/**
 * GET /api/v1/campaigns/stats
 * Get campaign statistics
 */
router.get(
  '/stats',
  CampaignController.getCampaignStats
);

export default router;
