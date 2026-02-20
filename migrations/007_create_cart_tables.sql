-- Migration: Create shopping cart tables
-- Purpose: Enable users to add products to cart before checkout

-- Create carts table
CREATE TABLE IF NOT EXISTS `carts` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `total_items` INT DEFAULT 0 COMMENT 'Total quantity of items in cart',
  `total_price` DECIMAL(12,2) DEFAULT 0 COMMENT 'Total price of all items',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_carts_user_id` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_user_cart` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create cart_items table
CREATE TABLE IF NOT EXISTS `cart_items` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `cart_id` BIGINT NOT NULL,
  `product_id` BIGINT NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `unit_price` DECIMAL(12,2) NOT NULL COMMENT 'Price at time of adding to cart',
  `total_price` DECIMAL(12,2) NOT NULL COMMENT 'quantity * unit_price',
  `variant_data` JSON COMMENT 'Variant selections as JSON',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_cart_items_cart_id` FOREIGN KEY (`cart_id`) REFERENCES `carts`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cart_items_product_id` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE,
  KEY `idx_cart_id` (`cart_id`),
  KEY `idx_product_id` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Log migration
SELECT 'Migration 007: Created shopping cart tables' as migration_status;
