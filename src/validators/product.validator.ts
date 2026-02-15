import Joi from 'joi';

export const createProductSchema = Joi.object({
  name: Joi.string().max(255).required().messages({
    'string.empty': 'Product name is required',
    'string.max': 'Product name must not exceed 255 characters',
    'any.required': 'Product name is required',
  }),

  slug: Joi.string().max(255).pattern(/^[a-z0-9-]+$/).optional().messages({
    'string.pattern.base':
      'Slug must contain only lowercase letters, numbers, and hyphens',
    'string.max': 'Slug must not exceed 255 characters',
  }),

  description: Joi.string().optional().allow('', null).messages({
    'string.base': 'Description must be a string',
  }),

  short_description: Joi.string().optional().allow('', null),

  features: Joi.string().optional().allow('', null).messages({
    'string.base': 'Features must be a string',
  }),

  sku: Joi.string().max(20).optional().allow('', null).messages({
    'string.max': 'SKU must not exceed 20 characters',
  }),

  jug: Joi.string().max(20).optional().allow('', null).messages({
    'string.max': 'JUG must not exceed 20 characters',
  }),

  price: Joi.number().precision(2).min(0).required().messages({
    'number.base': 'Price must be a number',
    'number.min': 'Price must be at least 0',
    'any.required': 'Price is required',
  }),

  compare_at_price: Joi.number()
    .precision(2)
    .min(0)
    .optional()
    .allow(null)
    .messages({
      'number.base': 'Compare at price must be a number',
      'number.min': 'Compare at price must be at least 0',
    }),

  cost_price: Joi.number().precision(2).min(0).default(0).messages({
    'number.base': 'Cost price must be a number',
    'number.min': 'Cost price must be at least 0',
  }),

  category_id: Joi.number().integer().positive().optional().allow(null).messages({
    'number.base': 'Category ID must be a number',
    'number.integer': 'Category ID must be an integer',
    'number.positive': 'Category ID must be positive',
  }),

  stock_quantity: Joi.number().integer().min(0).default(0).messages({
    'number.base': 'Stock quantity must be a number',
    'number.integer': 'Stock quantity must be an integer',
    'number.min': 'Stock quantity must be at least 0',
  }),

  low_stock_threshold: Joi.number()
    .integer()
    .min(0)
    .optional()
    .allow(null)
    .messages({
      'number.base': 'Low stock threshold must be a number',
      'number.integer': 'Low stock threshold must be an integer',
      'number.min': 'Low stock threshold must be at least 0',
    }),

  stock_status: Joi.string()
    .valid('in_stock', 'out_of_stock', 'backorder')
    .default('in_stock')
    .messages({
      'any.only':
        'Stock status must be one of: in_stock, out_of_stock, backorder',
    }),

  is_active: Joi.boolean().default(true),

  is_featured: Joi.boolean().default(false),

  is_published: Joi.boolean().default(false).messages({
    'boolean.base': 'Is published must be a boolean',
  }),

  brand: Joi.string().max(100).optional().allow('', null).messages({
    'string.max': 'Brand must not exceed 100 characters',
  }),

  eligible_for_return: Joi.boolean().default(true).messages({
    'boolean.base': 'Eligible for return must be a boolean',
  }),

  return_policy: Joi.string().optional().allow('', null).messages({
    'string.base': 'Return policy must be a string',
  }),

  meta_title: Joi.string().max(255).optional().allow('', null).messages({
    'string.max': 'Meta title must not exceed 255 characters',
  }),

  meta_description: Joi.string().optional().allow('', null),

  weight: Joi.number().precision(2).min(0).optional().allow(null).messages({
    'number.base': 'Weight must be a number',
    'number.min': 'Weight must be at least 0',
  }),

  dimensions: Joi.object({
    length: Joi.number().min(0).required(),
    width: Joi.number().min(0).required(),
    height: Joi.number().min(0).required(),
  })
    .optional()
    .allow(null)
    .messages({
      'object.base': 'Dimensions must be an object with length, width, height',
    }),

  metadata: Joi.object().optional().allow(null),
});

export const updateProductSchema = Joi.object({
  name: Joi.string().max(255).optional().messages({
    'string.empty': 'Product name cannot be empty',
    'string.max': 'Product name must not exceed 255 characters',
  }),

  slug: Joi.string().max(255).pattern(/^[a-z0-9-]+$/).optional().messages({
    'string.pattern.base':
      'Slug must contain only lowercase letters, numbers, and hyphens',
    'string.max': 'Slug must not exceed 255 characters',
  }),

  description: Joi.string().optional().allow('', null).messages({
    'string.base': 'Description must be a string',
  }),

  short_description: Joi.string().optional().allow('', null),

  features: Joi.string().optional().allow('', null).messages({
    'string.base': 'Features must be a string',
  }),

  sku: Joi.string().max(20).optional().allow('', null).messages({
    'string.max': 'SKU must not exceed 20 characters',
  }),

  jug: Joi.string().max(20).optional().allow('', null).messages({
    'string.max': 'JUG must not exceed 20 characters',
  }),

  price: Joi.number().precision(2).min(0).optional().messages({
    'number.base': 'Price must be a number',
    'number.min': 'Price must be at least 0',
  }),

  compare_at_price: Joi.number()
    .precision(2)
    .min(0)
    .optional()
    .allow(null)
    .messages({
      'number.base': 'Compare at price must be a number',
      'number.min': 'Compare at price must be at least 0',
    }),

  cost_price: Joi.number().precision(2).min(0).optional().messages({
    'number.base': 'Cost price must be a number',
    'number.min': 'Cost price must be at least 0',
  }),

  category_id: Joi.number().integer().positive().optional().allow(null).messages({
    'number.base': 'Category ID must be a number',
    'number.integer': 'Category ID must be an integer',
    'number.positive': 'Category ID must be positive',
  }),

  stock_quantity: Joi.number().integer().min(0).optional().messages({
    'number.base': 'Stock quantity must be a number',
    'number.integer': 'Stock quantity must be an integer',
    'number.min': 'Stock quantity must be at least 0',
  }),

  low_stock_threshold: Joi.number()
    .integer()
    .min(0)
    .optional()
    .allow(null)
    .messages({
      'number.base': 'Low stock threshold must be a number',
      'number.integer': 'Low stock threshold must be an integer',
      'number.min': 'Low stock threshold must be at least 0',
    }),

  stock_status: Joi.string()
    .valid('in_stock', 'out_of_stock', 'backorder')
    .optional()
    .messages({
      'any.only':
        'Stock status must be one of: in_stock, out_of_stock, backorder',
    }),

  is_active: Joi.boolean().optional(),

  is_featured: Joi.boolean().optional(),

  is_published: Joi.boolean().optional().messages({
    'boolean.base': 'Is published must be a boolean',
  }),

  brand: Joi.string().max(100).optional().allow('', null).messages({
    'string.max': 'Brand must not exceed 100 characters',
  }),

  eligible_for_return: Joi.boolean().optional().messages({
    'boolean.base': 'Eligible for return must be a boolean',
  }),

  return_policy: Joi.string().optional().allow('', null).messages({
    'string.base': 'Return policy must be a string',
  }),

  meta_title: Joi.string().max(255).optional().allow('', null).messages({
    'string.max': 'Meta title must not exceed 255 characters',
  }),

  meta_description: Joi.string().optional().allow('', null),

  weight: Joi.number().precision(2).min(0).optional().allow(null).messages({
    'number.base': 'Weight must be a number',
    'number.min': 'Weight must be at least 0',
  }),

  dimensions: Joi.object({
    length: Joi.number().min(0).required(),
    width: Joi.number().min(0).required(),
    height: Joi.number().min(0).required(),
  })
    .optional()
    .allow(null)
    .messages({
      'object.base': 'Dimensions must be an object with length, width, height',
    }),

  metadata: Joi.object().optional().allow(null),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
});

export const getProductsQuerySchema = Joi.object({
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
    .valid(
      'name',
      'price',
      'created_at',
      'updated_at',
      'rating',
      'sales_count',
      'view_count'
    )
    .default('created_at')
    .messages({
      'any.only':
        'Sort by must be one of: name, price, created_at, updated_at, rating, sales_count, view_count',
    }),

  order: Joi.string().valid('ASC', 'DESC').default('DESC').messages({
    'any.only': 'Order must be either ASC or DESC',
  }),

  search: Joi.string().optional().allow('').messages({
    'string.base': 'Search must be a string',
  }),

  category_id: Joi.number().integer().positive().optional().messages({
    'number.base': 'Category ID must be a number',
    'number.integer': 'Category ID must be an integer',
    'number.positive': 'Category ID must be positive',
  }),

  is_active: Joi.boolean().optional(),

  is_featured: Joi.boolean().optional(),

  is_published: Joi.boolean().optional(),

  stock_status: Joi.string()
    .valid('in_stock', 'out_of_stock', 'backorder')
    .optional()
    .messages({
      'any.only':
        'Stock status must be one of: in_stock, out_of_stock, backorder',
    }),

  min_price: Joi.number().min(0).optional().messages({
    'number.base': 'Min price must be a number',
    'number.min': 'Min price must be at least 0',
  }),

  max_price: Joi.number().min(0).optional().messages({
    'number.base': 'Max price must be a number',
    'number.min': 'Max price must be at least 0',
  }),

  min_rating: Joi.number().min(0).max(5).optional().messages({
    'number.base': 'Min rating must be a number',
    'number.min': 'Min rating must be at least 0',
    'number.max': 'Min rating must not exceed 5',
  }),
});

export const productIdParamSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    'number.base': 'Product ID must be a number',
    'number.integer': 'Product ID must be an integer',
    'number.positive': 'Product ID must be positive',
    'any.required': 'Product ID is required',
  }),
});

export const updateStockSchema = Joi.object({
  stock_quantity: Joi.number().integer().min(0).required().messages({
    'number.base': 'Stock quantity must be a number',
    'number.integer': 'Stock quantity must be an integer',
    'number.min': 'Stock quantity must be at least 0',
    'any.required': 'Stock quantity is required',
  }),

  stock_status: Joi.string()
    .valid('in_stock', 'out_of_stock', 'backorder')
    .optional()
    .messages({
      'any.only':
        'Stock status must be one of: in_stock, out_of_stock, backorder',
    }),
});

export const togglePublishSchema = Joi.object({
  is_published: Joi.boolean().required().messages({
    'boolean.base': 'Is published must be a boolean',
    'any.required': 'Is published is required',
  }),
});

export const toggleFeaturedSchema = Joi.object({
  is_featured: Joi.boolean().required().messages({
    'boolean.base': 'Is featured must be a boolean',
    'any.required': 'Is featured is required',
  }),
});
/**
 * Schema for media deletion during product update
 * Allows specifying which images and videos to delete
 */
export const mediaDeleteSchema = Joi.object({
  deletedImageIds: Joi.array().items(Joi.number().integer()).optional().messages({
    'array.base': 'Deleted image IDs must be an array',
    'number.base': 'Each image ID must be a number',
  }),

  deletedVideoIds: Joi.array().items(Joi.number().integer()).optional().messages({
    'array.base': 'Deleted video IDs must be an array',
    'number.base': 'Each video ID must be a number',
  }),
});

/**
 * Extended update product schema that includes media deletion
 */
export const updateProductWithMediaSchema = updateProductSchema.keys({
  deletedImageIds: Joi.array().items(Joi.number().integer()).optional().messages({
    'array.base': 'Deleted image IDs must be an array',
    'number.base': 'Each image ID must be a number',
  }),

  deletedVideoIds: Joi.array().items(Joi.number().integer()).optional().messages({
    'array.base': 'Deleted video IDs must be an array',
    'number.base': 'Each video ID must be a number',
  }),
});