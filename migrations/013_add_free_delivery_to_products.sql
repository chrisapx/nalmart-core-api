-- Migration: Add free_delivery field to products table
-- Date: 2026-03-11
-- Description: Add support for admin-controlled free delivery tag on products

ALTER TABLE products
ADD COLUMN free_delivery BOOLEAN DEFAULT FALSE
COMMENT 'Admin-controlled flag for free delivery eligibility';

-- Create an index for filtering products with free delivery
CREATE INDEX idx_products_free_delivery ON products(free_delivery);
