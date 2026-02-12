import Joi from 'joi';

export const createCategorySchema = Joi.object({
  name: Joi.string().max(100).required().messages({
    'string.empty': 'Category name is required',
    'string.max': 'Category name must not exceed 100 characters',
    'any.required': 'Category name is required',
  }),

  slug: Joi.string()
    .max(100)
    .pattern(/^[a-z0-9-]+$/)
    .optional()
    .messages({
      'string.pattern.base':
        'Slug must contain only lowercase letters, numbers, and hyphens',
      'string.max': 'Slug must not exceed 100 characters',
    }),

  description: Joi.string().optional().allow('', null),

  parent_id: Joi.number().integer().positive().optional().allow(null).messages({
    'number.base': 'Parent ID must be a number',
    'number.integer': 'Parent ID must be an integer',
    'number.positive': 'Parent ID must be positive',
  }),

  image_url: Joi.string().max(500).optional().allow('', null).messages({
    'string.max': 'Image URL must not exceed 500 characters',
  }),

  is_active: Joi.boolean().default(true),

  sort_order: Joi.number().integer().min(0).default(0).messages({
    'number.base': 'Sort order must be a number',
    'number.integer': 'Sort order must be an integer',
    'number.min': 'Sort order must be at least 0',
  }),
});

export const updateCategorySchema = Joi.object({
  name: Joi.string().max(100).optional().messages({
    'string.empty': 'Category name cannot be empty',
    'string.max': 'Category name must not exceed 100 characters',
  }),

  slug: Joi.string()
    .max(100)
    .pattern(/^[a-z0-9-]+$/)
    .optional()
    .messages({
      'string.pattern.base':
        'Slug must contain only lowercase letters, numbers, and hyphens',
      'string.max': 'Slug must not exceed 100 characters',
    }),

  description: Joi.string().optional().allow('', null),

  parent_id: Joi.number().integer().positive().optional().allow(null).messages({
    'number.base': 'Parent ID must be a number',
    'number.integer': 'Parent ID must be an integer',
    'number.positive': 'Parent ID must be positive',
  }),

  image_url: Joi.string().max(500).optional().allow('', null).messages({
    'string.max': 'Image URL must not exceed 500 characters',
  }),

  is_active: Joi.boolean().optional(),

  sort_order: Joi.number().integer().min(0).optional().messages({
    'number.base': 'Sort order must be a number',
    'number.integer': 'Sort order must be an integer',
    'number.min': 'Sort order must be at least 0',
  }),
})
  .min(1)
  .messages({
    'object.min': 'At least one field must be provided for update',
  });

export const getCategoriesQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).messages({
    'number.base': 'Page must be a number',
    'number.integer': 'Page must be an integer',
    'number.min': 'Page must be at least 1',
  }),

  limit: Joi.number().integer().min(1).max(100).default(20).messages({
    'number.base': 'Limit must be a number',
    'number.integer': 'Limit must be an integer',
    'number.min': 'Limit must be at least 1',
    'number.max': 'Limit must not exceed 100',
  }),

  sort_by: Joi.string()
    .valid('name', 'sort_order', 'created_at', 'updated_at')
    .default('sort_order')
    .messages({
      'any.only':
        'Sort by must be one of: name, sort_order, created_at, updated_at',
    }),

  order: Joi.string().valid('ASC', 'DESC').default('ASC').messages({
    'any.only': 'Order must be either ASC or DESC',
  }),

  search: Joi.string().optional().allow('').messages({
    'string.base': 'Search must be a string',
  }),

  parent_id: Joi.number().integer().optional().allow(null).messages({
    'number.base': 'Parent ID must be a number',
    'number.integer': 'Parent ID must be an integer',
  }),

  is_active: Joi.boolean().optional(),

  include_products: Joi.boolean().default(false),
});

export const categoryIdParamSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    'number.base': 'Category ID must be a number',
    'number.integer': 'Category ID must be an integer',
    'number.positive': 'Category ID must be positive',
    'any.required': 'Category ID is required',
  }),
});
