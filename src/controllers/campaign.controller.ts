import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/express';
import CampaignService from '../services/campaign.service';
import { successResponse } from '../utils/response';
import logger from '../utils/logger';

/**
 * Create campaign (admin only)
 */
export const createCampaign = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const campaign = await CampaignService.createCampaign(req.body);

    successResponse(res, campaign, 'Campaign created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Get campaign by ID
 */
export const getCampaignById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const idStr = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const campaignId = parseInt(idStr as string, 10);

    if (isNaN(campaignId) || campaignId < 1) {
      throw new Error('Invalid campaign ID');
    }

    const campaign = await CampaignService.getCampaignById(campaignId);

    if (!campaign) {
      return void successResponse(res, null, 'Campaign not found', 404);
    }

    successResponse(res, campaign, 'Campaign retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get active campaigns (public)
 */
export const getActiveCampaigns = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const campaigns = await CampaignService.getActiveCampaigns();

    successResponse(res, campaigns, 'Active campaigns retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get all campaigns with filters (admin)
 */
export const getCampaigns = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await CampaignService.getCampaigns(req.query);

    successResponse(res, result.data, 'Campaigns retrieved successfully', 200, {
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update campaign (admin only)
 */
export const updateCampaign = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const idStr = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const campaignId = parseInt(idStr as string, 10);

    if (isNaN(campaignId) || campaignId < 1) {
      throw new Error('Invalid campaign ID');
    }

    const campaign = await CampaignService.updateCampaign(campaignId, req.body);

    successResponse(res, campaign, 'Campaign updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete campaign (admin only)
 */
export const deleteCampaign = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const idStr = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const campaignId = parseInt(idStr as string, 10);

    if (isNaN(campaignId) || campaignId < 1) {
      throw new Error('Invalid campaign ID');
    }

    await CampaignService.deleteCampaign(campaignId);

    successResponse(res, null, 'Campaign deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Create promotion code (admin only)
 */
export const createPromotion = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const promotion = await CampaignService.createPromotion(req.body);

    successResponse(res, promotion, 'Promotion code created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Validate promo code
 */
export const validatePromoCode = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { code } = req.body;

    const result = await CampaignService.validatePromoCode(code);

    successResponse(res, result, 'Promotion code is valid');
  } catch (error) {
    next(error);
  }
};

/**
 * Calculate discount from promo code
 */
export const calculateDiscount = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { code, order_subtotal, order_items } = req.body;

    const discount = await CampaignService.calculateDiscount(
      code,
      order_subtotal,
      order_items
    );

    successResponse(res, discount, 'Discount calculated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Apply promo code to order
 */
export const applyPromoCode = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { code } = req.body;

    await CampaignService.applyPromoCode(code, req.user?.id || 0);

    successResponse(res, null, 'Promo code applied successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get campaign statistics (admin only)
 */
export const getCampaignStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stats = await CampaignService.getCampaignStats();

    successResponse(res, stats, 'Campaign statistics retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export default {
  createCampaign,
  getCampaignById,
  getActiveCampaigns,
  getCampaigns,
  updateCampaign,
  deleteCampaign,
  createPromotion,
  validatePromoCode,
  calculateDiscount,
  applyPromoCode,
  getCampaignStats,
};
