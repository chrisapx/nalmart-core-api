import Joi from 'joi';

/**
 * Schema for adding a favorite
 */
export const addFavoriteSchema = Joi.object({
  product_id: Joi.number().required().messages({
    'any.required': 'Product ID is required',
    'number.base': 'Product ID must be a number',
  }),
  notes: Joi.string().max(1000).optional(),
  expected_purchase_date: Joi.date().iso().optional(),
  priority: Joi.string().valid('high', 'medium', 'low').optional().default('medium'),
});

/**
 * Schema for updating a favorite
 */
export const updateFavoriteSchema = Joi.object({
  notes: Joi.string().max(1000).optional(),
  expected_purchase_date: Joi.date().iso().optional(),
  priority: Joi.string().valid('high', 'medium', 'low').optional(),
}).min(1);

/**
 * Schema for pagination and sorting
 */
export const paginationSchema = Joi.object({
  limit: Joi.number().min(1).max(100).optional().default(20),
  offset: Joi.number().min(0).optional().default(0),
  sortBy: Joi.string()
    .valid('created_at', 'updated_at', 'priority', 'expected_purchase_date')
    .optional()
    .default('created_at'),
  order: Joi.string().valid('ASC', 'DESC').optional().default('DESC'),
});

export default {
  addFavoriteSchema,
  updateFavoriteSchema,
  paginationSchema,
};
