-- Migration: Add missing product fields
-- Date: 2026-02-13

-- Add is_published column
ALTER TABLE `products`
ADD COLUMN `is_published` BOOLEAN NOT NULL DEFAULT false AFTER `is_featured`;

-- Add brand column
ALTER TABLE `products`
ADD COLUMN `brand` VARCHAR(255) NULL AFTER `is_published`;

-- Add eligible_for_return column
ALTER TABLE `products`
ADD COLUMN `eligible_for_return` BOOLEAN NOT NULL DEFAULT true AFTER `brand`;

-- Add return_policy column
ALTER TABLE `products`
ADD COLUMN `return_policy` TEXT NULL AFTER `eligible_for_return`;

-- Add meta_title column
ALTER TABLE `products`
ADD COLUMN `meta_title` VARCHAR(255) NULL AFTER `return_policy`;

-- Add meta_description column
ALTER TABLE `products`
ADD COLUMN `meta_description` TEXT NULL AFTER `meta_title`;
