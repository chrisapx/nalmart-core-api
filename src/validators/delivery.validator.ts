import Joi from 'joi';

/**
 * Schema for calculating shipping fee
 */
export const calculateShippingFeeSchema = Joi.object({
  delivery_method_id: Joi.number().required().messages({
    'any.required': 'Delivery method ID is required',
    'number.base': 'Delivery method ID must be a number',
  }),
  total_weight: Joi.number().positive().required().messages({
    'any.required': 'Total weight is required',
    'number.base': 'Total weight must be a number',
    'number.positive': 'Total weight must be positive',
  }),
  order_subtotal: Joi.number().min(0).required().messages({
    'any.required': 'Order subtotal is required',
    'number.base': 'Order subtotal must be a number',
    'number.min': 'Order subtotal cannot be negative',
  }),
});

/**
 * Schema for creating a delivery
 */
export const createDeliverySchema = Joi.object({
  order_id: Joi.number().required().messages({
    'any.required': 'Order ID is required',
    'number.base': 'Order ID must be a number',
  }),
  delivery_method_id: Joi.number().required().messages({
    'any.required': 'Delivery method ID is required',
    'number.base': 'Delivery method ID must be a number',
  }),
  delivery_address_id: Joi.number().required().messages({
    'any.required': 'Delivery address ID is required',
    'number.base': 'Delivery address ID must be a number',
  }),
  total_weight: Joi.number().positive().required().messages({
    'any.required': 'Total weight is required',
    'number.base': 'Total weight must be a number',
    'number.positive': 'Total weight must be positive',
  }),
  delivery_type: Joi.string().valid('standard', 'signature_required', 'POD').optional(),
  insurance_cost: Joi.number().min(0).optional(),
  notes: Joi.string().max(1000).optional(),
});

/**
 * Schema for updating delivery status
 */
export const updateDeliveryStatusSchema = Joi.object({
  status: Joi.string()
    .valid(
      'pending',
      'processing',
      'dispatched',
      'in_transit',
      'out_for_delivery',
      'delivered',
      'failed',
      'cancelled',
      'returned'
    )
    .required()
    .messages({
      'any.required': 'Status is required',
    }),
  location: Joi.string().max(255).optional(),
  notes: Joi.string().max(1000).optional(),
});

/**
 * Schema for generating tracking number
 */
export const generateTrackingNumberSchema = Joi.object({
  carrier_name: Joi.string().max(100).required().messages({
    'any.required': 'Carrier name is required',
    'string.max': 'Carrier name cannot exceed 100 characters',
  }),
});

/**
 * Schema for creating a delivery method (admin)
 */
export const createDeliveryMethodSchema = Joi.object({
  name: Joi.string().max(100).required().messages({
    'any.required': 'Method name is required',
    'string.max': 'Method name cannot exceed 100 characters',
  }),
  description: Joi.string().max(1000).optional(),
  type: Joi.string()
    .valid('standard', 'express', 'overnight', 'same_day', 'pickup')
    .required(),
  base_fee: Joi.number().min(0).required().messages({
    'any.required': 'Base fee is required',
    'number.min': 'Base fee cannot be negative',
  }),
  fee_per_kg: Joi.number().min(0).required(),
  max_fee: Joi.number().min(0).optional(),
  delivery_days: Joi.number().min(1).required(),
  free_shipping_threshold: Joi.number().min(0).optional(),
  is_active: Joi.boolean().optional().default(true),
  coverage_areas: Joi.object().optional(),
  max_weight: Joi.number().positive().optional(),
  display_order: Joi.number().min(1).optional(),
});

/**
 * Schema for updating a delivery method (admin)
 */
export const updateDeliveryMethodSchema = Joi.object({
  name: Joi.string().max(100).optional(),
  description: Joi.string().max(1000).optional(),
  type: Joi.string().valid('standard', 'express', 'overnight', 'same_day', 'pickup').optional(),
  base_fee: Joi.number().min(0).optional(),
  fee_per_kg: Joi.number().min(0).optional(),
  max_fee: Joi.number().min(0).optional(),
  delivery_days: Joi.number().min(1).optional(),
  free_shipping_threshold: Joi.number().min(0).optional(),
  is_active: Joi.boolean().optional(),
  coverage_areas: Joi.object().optional(),
  max_weight: Joi.number().positive().optional(),
  display_order: Joi.number().min(1).optional(),
}).min(1);

/**
 * Schema for creating a delivery address
 */
export const createDeliveryAddressSchema = Joi.object({
  full_name: Joi.string().max(100).required().messages({
    'any.required': 'Full name is required',
    'string.max': 'Full name cannot exceed 100 characters',
  }),
  address_line_1: Joi.string().max(255).required().messages({
    'any.required': 'Address line 1 is required',
    'string.max': 'Address line 1 cannot exceed 255 characters',
  }),
  address_line_2: Joi.string().max(255).optional(),
  city: Joi.string().max(100).required().messages({
    'any.required': 'City is required',
  }),
  state: Joi.string().max(100).required().messages({
    'any.required': 'State is required',
  }),
  postal_code: Joi.string().max(20).required().messages({
    'any.required': 'Postal code is required',
  }),
  country: Joi.string().max(100).required().messages({
    'any.required': 'Country is required',
  }),
  phone: Joi.string()
    .regex(/^[+\d\s\-()]{7,20}$/)
    .required()
    .messages({
      'any.required': 'Phone number is required',
      'string.pattern.base': 'Phone number is invalid',
    }),
  is_default: Joi.boolean().optional(),
});

/**
 * Schema for updating a delivery address
 */
export const updateDeliveryAddressSchema = Joi.object({
  full_name: Joi.string().max(100).optional(),
  address_line_1: Joi.string().max(255).optional(),
  address_line_2: Joi.string().max(255).optional(),
  city: Joi.string().max(100).optional(),
  state: Joi.string().max(100).optional(),
  postal_code: Joi.string().max(20).optional(),
  country: Joi.string().max(100).optional(),
  phone: Joi.string()
    .regex(/^[+\d\s\-()]{7,20}$/)
    .optional(),
  is_default: Joi.boolean().optional(),
}).min(1);

export default {
  calculateShippingFeeSchema,
  createDeliverySchema,
  updateDeliveryStatusSchema,
  generateTrackingNumberSchema,
  createDeliveryMethodSchema,
  updateDeliveryMethodSchema,
  createDeliveryAddressSchema,
  updateDeliveryAddressSchema,
};
