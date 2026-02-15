import { Op } from 'sequelize';
import Campaign from '../models/Campaign';
import Promotion from '../models/Promotion';
import { NotFoundError, BadRequestError } from '../utils/errors';
import logger from '../utils/logger';

export class CampaignService {
  /**
   * Create a campaign
   */
  static async createCampaign(data: Partial<Campaign>): Promise<Campaign> {
    try {
      // Validate dates
      const startDate = new Date(data.start_date!);
      const endDate = new Date(data.end_date!);

      if (startDate >= endDate) {
        throw new BadRequestError('Start date must be before end date');
      }

      const campaign = await Campaign.create(data);
      logger.info(`Campaign created: ${campaign.name}`);
      return campaign;
    } catch (error) {
      if (error instanceof BadRequestError) {
        throw error;
      }
      logger.error('Error creating campaign:', error);
      throw new Error('Failed to create campaign');
    }
  }

  /**
   * Get campaign by ID
   */
  static async getCampaignById(id: number): Promise<Campaign | null> {
    try {
      return await Campaign.findByPk(id, {
        include: [{ model: Promotion }],
      });
    } catch (error) {
      logger.error('Error fetching campaign:', error);
      throw new Error('Failed to fetch campaign');
    }
  }

  /**
   * Get all active campaigns
   */
  static async getActiveCampaigns(): Promise<Campaign[]> {
    try {
      const now = new Date();
      return await Campaign.findAll({
        where: {
          is_active: true,
          start_date: { [Op.lte]: now },
          end_date: { [Op.gte]: now },
        },
        order: [['priority', 'DESC'], ['start_date', 'ASC']],
        include: [{ model: Promotion }],
      });
    } catch (error) {
      logger.error('Error fetching active campaigns:', error);
      throw new Error('Failed to fetch campaigns');
    }
  }

  /**
   * Get all campaigns with filters
   */
  static async getCampaigns(query: any = {}): Promise<{ data: Campaign[]; count: number; pagination: any }> {
    try {
      const limit = parseInt(query.limit) || 20;
      const offset = parseInt(query.offset) || 0;
      const status = query.status; // 'active', 'upcoming', 'ended'
      const type = query.type; // discount type

      const where: any = {};

      if (status) {
        const now = new Date();
        if (status === 'active') {
          where.start_date = { [Op.lte]: now };
          where.end_date = { [Op.gte]: now };
        } else if (status === 'upcoming') {
          where.start_date = { [Op.gt]: now };
        } else if (status === 'ended') {
          where.end_date = { [Op.lt]: now };
        }
      }

      if (type) where.discount_type = type;

      const { count, rows } = await Campaign.findAndCountAll({
        where,
        include: [{ model: Promotion }],
        limit,
        offset,
        order: [['created_at', 'DESC']],
      });

      return {
        data: rows,
        count,
        pagination: {
          limit,
          offset,
          total: count,
          pages: Math.ceil(count / limit),
        },
      };
    } catch (error) {
      logger.error('Error fetching campaigns:', error);
      throw new Error('Failed to fetch campaigns');
    }
  }

  /**
   * Update campaign
   */
  static async updateCampaign(id: number, data: Partial<Campaign>): Promise<Campaign> {
    try {
      const campaign = await Campaign.findByPk(id);
      if (!campaign) {
        throw new NotFoundError('Campaign not found');
      }

      // Validate dates if updating them
      if (data.start_date && data.end_date) {
        const startDate = new Date(data.start_date);
        const endDate = new Date(data.end_date);
        if (startDate >= endDate) {
          throw new BadRequestError('Start date must be before end date');
        }
      }

      await campaign.update(data);
      logger.info(`Campaign updated: ${campaign.name}`);
      return campaign;
    } catch (error) {
      if (error instanceof (NotFoundError || BadRequestError)) {
        throw error;
      }
      logger.error('Error updating campaign:', error);
      throw new Error('Failed to update campaign');
    }
  }

  /**
   * Delete campaign
   */
  static async deleteCampaign(id: number): Promise<void> {
    try {
      const campaign = await Campaign.findByPk(id);
      if (!campaign) {
        throw new NotFoundError('Campaign not found');
      }

      await campaign.destroy();
      logger.info(`Campaign deleted: ${campaign.name}`);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Error deleting campaign:', error);
      throw new Error('Failed to delete campaign');
    }
  }

  /**
   * Create promotion code for campaign
   */
  static async createPromotion(data: {
    campaign_id: number;
    code: string;
    discount_value?: number;
    max_uses?: number;
  }): Promise<Promotion> {
    try {
      const campaign = await Campaign.findByPk(data.campaign_id);
      if (!campaign) {
        throw new NotFoundError('Campaign not found');
      }

      // Check if code already exists
      const existing = await Promotion.findOne({
        where: { code: data.code.toUpperCase() },
      });

      if (existing) {
        throw new BadRequestError('Promotion code already exists');
      }

      const promotion = await Promotion.create({
        campaign_id: data.campaign_id,
        code: data.code.toUpperCase(),
        discount_value: data.discount_value || campaign.discount_value,
        max_uses: data.max_uses,
      });

      logger.info(`Promotion code created: ${promotion.code}`);
      return promotion;
    } catch (error) {
      if (error instanceof (NotFoundError || BadRequestError)) {
        throw error;
      }
      logger.error('Error creating promotion:', error);
      throw new Error('Failed to create promotion');
    }
  }

  /**
   * Validate and retrieve promotion by code
   */
  static async validatePromoCode(code: string): Promise<{ campaign: Campaign; promotion: Promotion }> {
    try {
      const promotion = await Promotion.findOne({
        where: { code: code.toUpperCase(), is_active: true },
        include: [{ model: Campaign }],
      });

      if (!promotion) {
        throw new NotFoundError('Promotion code not found or inactive');
      }

      const campaign = promotion.campaign as Campaign;

      // Check if campaign is active
      const now = new Date();
      if (campaign.start_date > now || campaign.end_date < now || !campaign.is_active) {
        throw new BadRequestError('This promotion is no longer valid');
      }

      // Check usage limits
      if (campaign.max_uses && campaign.usage_count >= campaign.max_uses) {
        throw new BadRequestError('This promotion has reached its maximum usage limit');
      }

      if (promotion.max_uses && promotion.usage_count >= promotion.max_uses) {
        throw new BadRequestError('This promotion code has reached its maximum usage limit');
      }

      return { campaign, promotion };
    } catch (error) {
      if (error instanceof (NotFoundError || BadRequestError)) {
        throw error;
      }
      logger.error('Error validating promo code:', error);
      throw new Error('Failed to validate promotion code');
    }
  }

  /**
   * Calculate discount for order
   */
  static async calculateDiscount(
    code: string,
    orderSubtotal: number,
    orderItems?: any[]
  ): Promise<{ discount_amount: number; discount_percentage: number; campaign_name: string }> {
    try {
      const { campaign, promotion } = await this.validatePromoCode(code);

      // Check minimum order amount
      if (campaign.min_order_amount && orderSubtotal < campaign.min_order_amount) {
        throw new BadRequestError(
          `Minimum order amount of $${campaign.min_order_amount} required for this promotion`
        );
      }

      let discountAmount = 0;

      if (campaign.discount_type === 'percentage') {
        discountAmount = (orderSubtotal * campaign.discount_value) / 100;
      } else if (campaign.discount_type === 'fixed_amount') {
        discountAmount = campaign.discount_value;
      } else if (campaign.discount_type === 'buy_x_get_y' && orderItems) {
        // Apply specific logic for buy x get y
        // This is a simplified version
        discountAmount = campaign.discount_value;
      } else if (campaign.discount_type === 'free_shipping') {
        discountAmount = campaign.discount_value; // This would be applied to shipping
      }

      // Apply max discount cap
      if (campaign.max_discount && discountAmount > campaign.max_discount) {
        discountAmount = campaign.max_discount;
      }

      return {
        discount_amount: Number(discountAmount.toFixed(2)),
        discount_percentage: campaign.discount_type === 'percentage' ? campaign.discount_value : 0,
        campaign_name: campaign.name,
      };
    } catch (error) {
      if (error instanceof (NotFoundError || BadRequestError)) {
        throw error;
      }
      logger.error('Error calculating discount:', error);
      throw new Error('Failed to calculate discount');
    }
  }

  /**
   * Apply promo code to order (increment usage counters)
   */
  static async applyPromoCode(code: string, userId: number): Promise<void> {
    try {
      const { campaign, promotion } = await this.validatePromoCode(code);

      // Increment usage counts
      await campaign.increment('usage_count');
      await promotion.increment('usage_count');

      // TODO: Track per-user usage in a separate table for max_uses_per_customer enforcement
      logger.info(`Promo code ${code} applied by user ${userId}`);
    } catch (error) {
      if (error instanceof (NotFoundError || BadRequestError)) {
        throw error;
      }
      logger.error('Error applying promo code:', error);
      throw new Error('Failed to apply promo code');
    }
  }

  /**
   * Get campaign statistics
   */
  static async getCampaignStats(): Promise<Record<string, any>> {
    try {
      const now = new Date();
      const activeCampaigns = await Campaign.count({
        where: {
          is_active: true,
          start_date: { [Op.lte]: now },
          end_date: { [Op.gte]: now },
        },
      });

      const totalCampaigns = await Campaign.count();
      const totalPromotions = await Promotion.count({
        where: { is_active: true },
      });

      const topCampaigns = await Campaign.findAll({
        attributes: [
          'id',
          'name',
          'usage_count',
          [Campaign.sequelize!.fn('COUNT', Campaign.sequelize!.col('Promotions.id')), 'promotion_count'],
        ],
        include: [{ model: Promotion, attributes: [] }],
        group: ['Campaign.id'],
        order: [['usage_count', 'DESC']],
        limit: 5,
        subQuery: false,
        raw: false,
      });

      return {
        total_campaigns: totalCampaigns,
        active_campaigns: activeCampaigns,
        total_promotions: totalPromotions,
        top_campaigns: topCampaigns,
      };
    } catch (error) {
      logger.error('Error fetching campaign stats:', error);
      throw new Error('Failed to fetch campaign statistics');
    }
  }
}

export default CampaignService;
