import Joi from 'joi';

/**
 * Schema for creating a campaign
 */
export const createCampaignSchema = Joi.object({
  name: Joi.string().max(255).required().messages({
    'any.required': 'Campaign name is required',
    'string.max': 'Campaign name cannot exceed 255 characters',
  }),
  description: Joi.string().max(5000).optional(),
  banner_image_url: Joi.string().uri().optional(),
  discount_type: Joi.string()
    .valid('percentage', 'fixed_amount', 'buy_x_get_y', 'free_shipping')
    .required(),
  discount_value: Joi.number().positive().required(),
  min_order_amount: Joi.number().min(0).optional(),
  max_discount: Joi.number().min(0).optional(),
  start_date: Joi.date().iso().required(),
  end_date: Joi.date().iso().required(),
  max_uses: Joi.number().min(1).optional(),
  max_uses_per_customer: Joi.number().min(1).optional(),
  is_active: Joi.boolean().optional().default(true),
  applicability: Joi.string()
    .valid('all_products', 'specific_products', 'specific_categories')
    .optional()
    .default('all_products'),
  applicable_items: Joi.array().items(Joi.number()).optional(),
  target_segments: Joi.array().items(Joi.string()).optional(),
  is_stackable: Joi.boolean().optional().default(false),
  priority: Joi.number().min(0).optional().default(0),
});

/**
 * Schema for updating a campaign
 */
export const updateCampaignSchema = Joi.object({
  name: Joi.string().max(255).optional(),
  description: Joi.string().max(5000).optional(),
  banner_image_url: Joi.string().uri().optional(),
  discount_type: Joi.string()
    .valid('percentage', 'fixed_amount', 'buy_x_get_y', 'free_shipping')
    .optional(),
  discount_value: Joi.number().positive().optional(),
  min_order_amount: Joi.number().min(0).optional(),
  max_discount: Joi.number().min(0).optional(),
  start_date: Joi.date().iso().optional(),
  end_date: Joi.date().iso().optional(),
  max_uses: Joi.number().min(1).optional(),
  max_uses_per_customer: Joi.number().min(1).optional(),
  is_active: Joi.boolean().optional(),
  applicability: Joi.string()
    .valid('all_products', 'specific_products', 'specific_categories')
    .optional(),
  applicable_items: Joi.array().items(Joi.number()).optional(),
  target_segments: Joi.array().items(Joi.string()).optional(),
  is_stackable: Joi.boolean().optional(),
  priority: Joi.number().min(0).optional(),
}).min(1);

/**
 * Schema for creating a promotion code
 */
export const createPromotionSchema = Joi.object({
  campaign_id: Joi.number().required().messages({
    'any.required': 'Campaign ID is required',
  }),
  code: Joi.string().alphanum().max(50).required().messages({
    'any.required': 'Promotion code is required',
    'string.alphanum': 'Code can only contain letters and numbers',
    'string.max': 'Code cannot exceed 50 characters',
  }),
  discount_value: Joi.number().min(0).optional(),
  max_uses: Joi.number().min(1).optional(),
});

/**
 * Schema for validating promo code
 */
export const validatePromoCodeSchema = Joi.object({
  code: Joi.string().required().messages({
    'any.required': 'Promo code is required',
  }),
});

/**
 * Schema for calculating discount
 */
export const calculateDiscountSchema = Joi.object({
  code: Joi.string().required(),
  order_subtotal: Joi.number().positive().required(),
  order_items: Joi.array()
    .items(
      Joi.object({
        product_id: Joi.number().required(),
        quantity: Joi.number().min(1).required(),
        price: Joi.number().positive().required(),
      })
    )
    .optional(),
});

/**
 * Schema for applying promo code
 */
export const applyPromoCodeSchema = Joi.object({
  code: Joi.string().required(),
});

/**
 * Schema for pagination and filtering
 */
export const campaignFilterSchema = Joi.object({
  limit: Joi.number().min(1).max(100).optional().default(20),
  offset: Joi.number().min(0).optional().default(0),
  status: Joi.string().valid('active', 'upcoming', 'ended').optional(),
  type: Joi.string()
    .valid('percentage', 'fixed_amount', 'buy_x_get_y', 'free_shipping')
    .optional(),
});

export default {
  createCampaignSchema,
  updateCampaignSchema,
  createPromotionSchema,
  validatePromoCodeSchema,
  calculateDiscountSchema,
  applyPromoCodeSchema,
  campaignFilterSchema,
};
