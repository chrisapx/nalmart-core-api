-- Migration: Add new product fields
-- Date: 2026-02-13

-- Add features column
ALTER TABLE `products`
ADD COLUMN `features` TEXT NULL AFTER `short_description`;

-- Add jug column
ALTER TABLE `products`
ADD COLUMN `jug` VARCHAR(255) NULL AFTER `sku`;

-- Add brand column
ALTER TABLE `products`
ADD COLUMN `brand` VARCHAR(255) NULL AFTER `is_published`;

-- Add eligible_for_return column
ALTER TABLE `products`
ADD COLUMN `eligible_for_return` BOOLEAN NOT NULL DEFAULT true AFTER `brand`;

-- Add return_policy column
ALTER TABLE `products`
ADD COLUMN `return_policy` TEXT NULL AFTER `eligible_for_return`;
