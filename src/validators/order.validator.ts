import Joi from 'joi';

export const createOrderSchema = Joi.object({
  items: Joi.array()
    .items(
      Joi.object({
        product_id: Joi.number().integer().required().messages({
          'number.base': 'Product ID must be a number',
          'any.required': 'Product ID is required',
        }),
        quantity: Joi.number().integer().min(1).required().messages({
          'number.base': 'Quantity must be a number',
          'number.min': 'Quantity must be at least 1',
          'any.required': 'Quantity is required',
        }),
        unit_price: Joi.number().precision(2).min(0).optional().messages({
          'number.base': 'Unit price must be a number',
          'number.min': 'Unit price must be at least 0',
        }),
      })
    )
    .min(1)
    .required()
    .messages({
      'array.min': 'Order must contain at least one item',
      'any.required': 'Items are required',
    }),

  coupon_code: Joi.string().max(100).optional().allow('', null).messages({
    'string.max': 'Coupon code must not exceed 100 characters',
  }),

  payment_method: Joi.string()
    .valid('card', 'bank_transfer', 'wallets', 'cash_on_delivery')
    .optional()
    .allow('', null)
    .messages({
      'any.only': 'Invalid payment method',
    }),

  shipping_address: Joi.object({
    name: Joi.string().max(255).optional(),
    phone: Joi.string().max(20).optional(),
    address_line1: Joi.string().max(255).optional(),
    address_line2: Joi.string().max(255).optional(),
    city: Joi.string().max(100).optional(),
    state: Joi.string().max(100).optional(),
    postal_code: Joi.string().max(20).optional(),
    country: Joi.string().max(100).optional(),
  })
    .optional()
    .allow(null),

  billing_address: Joi.object({
    name: Joi.string().max(255).optional(),
    phone: Joi.string().max(20).optional(),
    address_line1: Joi.string().max(255).optional(),
    address_line2: Joi.string().max(255).optional(),
    city: Joi.string().max(100).optional(),
    state: Joi.string().max(100).optional(),
    postal_code: Joi.string().max(20).optional(),
    country: Joi.string().max(100).optional(),
  })
    .optional()
    .allow(null),

  customer_notes: Joi.string().max(1000).optional().allow('', null).messages({
    'string.max': 'Customer notes must not exceed 1000 characters',
  }),
});

export const updateOrderSchema = Joi.object({
  payment_method: Joi.string()
    .valid('card', 'bank_transfer', 'wallets', 'cash_on_delivery')
    .optional()
    .messages({
      'any.only': 'Invalid payment method',
    }),

  payment_transaction_id: Joi.string().max(255).optional(),

  status: Joi.string()
    .valid('pending', 'processing', 'confirmed', 'shipped', 'delivered', 'cancelled', 'refunded', 'failed')
    .optional()
    .messages({
      'any.only': 'Invalid order status',
    }),

  payment_status: Joi.string()
    .valid('pending', 'paid', 'failed', 'refunded', 'partially_refunded')
    .optional()
    .messages({
      'any.only': 'Invalid payment status',
    }),

  fulfillment_status: Joi.string()
    .valid('pending', 'processing', 'shipped', 'delivered', 'cancelled')
    .optional()
    .messages({
      'any.only': 'Invalid fulfillment status',
    }),

  tracking_number: Joi.string().max(255).optional().allow('', null),

  shipping_carrier: Joi.string().max(100).optional().allow('', null),

  shipped_at: Joi.date().optional().allow(null),

  delivered_at: Joi.date().optional().allow(null),

  cancelled_at: Joi.date().optional().allow(null),

  admin_notes: Joi.string().max(1000).optional().allow('', null),
});

export const cancelOrderSchema = Joi.object({
  reason: Joi.string().max(1000).optional().allow('', null).messages({
    'string.max': 'Reason must not exceed 1000 characters',
  }),
});

export const shipOrderSchema = Joi.object({
  tracking_number: Joi.string().max(255).optional().messages({
    'string.max': 'Tracking number must not exceed 255 characters',
  }),

  carrier: Joi.string().max(100).optional().messages({
    'string.max': 'Carrier must not exceed 100 characters',
  }),
});

export const recordPaymentSchema = Joi.object({
  transaction_id: Joi.string().max(255).required().messages({
    'string.empty': 'Transaction ID is required',
    'any.required': 'Transaction ID is required',
  }),

  payment_method: Joi.string()
    .valid('card', 'bank_transfer', 'wallets', 'cash_on_delivery')
    .optional()
    .messages({
      'any.only': 'Invalid payment method',
    }),
});

export default {
  createOrderSchema,
  updateOrderSchema,
  cancelOrderSchema,
  shipOrderSchema,
  recordPaymentSchema,
};
