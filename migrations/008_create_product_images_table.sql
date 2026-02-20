-- Migration: Create product_images table
-- Purpose: Store product images with S3 URLs and metadata

CREATE TABLE IF NOT EXISTS `product_images` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `product_id` BIGINT NOT NULL,
  `url` VARCHAR(1000) NOT NULL COMMENT 'S3 URL - no file storage, URLs only',
  `name` VARCHAR(255) NOT NULL,
  `alt_text` VARCHAR(255),
  `size` INT COMMENT 'File size in bytes',
  `mime_type` VARCHAR(50),
  `is_primary` BOOLEAN DEFAULT false,
  `image_type` ENUM('cover', 'gallery', 'demo') NOT NULL DEFAULT 'gallery' COMMENT 'Type of image: cover (main product image), gallery (additional product images), demo (usage demonstration images)',
  `sort_order` INT DEFAULT 0,
  `width` INT COMMENT 'Image width in pixels',
  `height` INT COMMENT 'Image height in pixels',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_product_images_product_id` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE,
  KEY `idx_product_id` (`product_id`),
  KEY `idx_is_primary` (`is_primary`),
  KEY `idx_image_type` (`image_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Log migration
SELECT 'Migration 008: Created product_images table' as migration_status;
