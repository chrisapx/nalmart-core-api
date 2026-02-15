import Joi from 'joi';

/**
 * Schema for creating a review
 */
export const createReviewSchema = Joi.object({
  product_id: Joi.number().required().messages({
    'any.required': 'Product ID is required',
    'number.base': 'Product ID must be a number',
  }),
  rating: Joi.number().min(1).max(5).required().messages({
    'any.required': 'Rating is required',
    'number.base': 'Rating must be a number',
    'number.min': 'Rating must be at least 1',
    'number.max': 'Rating cannot exceed 5',
  }),
  title: Joi.string().max(255).required().messages({
    'any.required': 'Review title is required',
    'string.max': 'Title cannot exceed 255 characters',
  }),
  comment: Joi.string().max(5000).required().messages({
    'any.required': 'Review comment is required',
    'string.max': 'Comment cannot exceed 5000 characters',
  }),
  customer_name: Joi.string().max(100).required().messages({
    'any.required': 'Customer name is required',
    'string.max': 'Customer name cannot exceed 100 characters',
  }),
  customer_email: Joi.string().email().required().messages({
    'any.required': 'Customer email is required',
    'string.email': 'Customer email must be valid',
  }),
  image_urls: Joi.array()
    .items(Joi.string().uri())
    .max(5)
    .optional()
    .messages({
      'array.includes': 'All image URLs must be valid',
      'array.max': 'Maximum 5 images allowed',
    }),
});

/**
 * Schema for updating a review
 */
export const updateReviewSchema = Joi.object({
  title: Joi.string().max(255).optional(),
  comment: Joi.string().max(5000).optional(),
  rating: Joi.number().min(1).max(5).optional().messages({
    'number.min': 'Rating must be at least 1',
    'number.max': 'Rating cannot exceed 5',
  }),
  image_urls: Joi.array().items(Joi.string().uri()).max(5).optional().messages({
    'array.includes': 'All image URLs must be valid',
    'array.max': 'Maximum 5 images allowed',
  }),
}).min(1);

/**
 * Schema for rejecting a review
 */
export const rejectReviewSchema = Joi.object({
  reason: Joi.string().max(500).optional(),
});

/**
 * Schema for filtering reviews (admin)
 */
export const filterReviewsSchema = Joi.object({
  status: Joi.string()
    .valid('pending', 'approved', 'rejected', 'hidden')
    .optional(),
  rating: Joi.number().min(1).max(5).optional(),
  product_id: Joi.number().optional(),
  limit: Joi.number().min(1).max(100).optional().default(20),
  offset: Joi.number().min(0).optional().default(0),
});

/**
 * Schema for pagination
 */
export const paginationSchema = Joi.object({
  limit: Joi.number().min(1).max(100).optional().default(20),
  offset: Joi.number().min(0).optional().default(0),
});

export default {
  createReviewSchema,
  updateReviewSchema,
  rejectReviewSchema,
  filterReviewsSchema,
  paginationSchema,
};
