-- Migration: Create product_videos table
-- Purpose: Store product videos with S3 URLs and metadata

CREATE TABLE IF NOT EXISTS `product_videos` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `product_id` BIGINT NOT NULL,
  `url` VARCHAR(1000) NOT NULL COMMENT 'S3 URL or external video URL (YouTube, Vimeo, etc.)',
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `thumbnail_url` VARCHAR(1000) COMMENT 'Thumbnail/preview image URL',
  `duration` INT COMMENT 'Video duration in seconds',
  `size` INT COMMENT 'File size in bytes (for uploaded videos)',
  `mime_type` VARCHAR(50),
  `video_type` ENUM('demo', 'tutorial', 'review', 'unboxing') NOT NULL DEFAULT 'demo' COMMENT 'Type of video content',
  `sort_order` INT DEFAULT 0,
  `platform` ENUM('local', 'youtube', 'vimeo', 'external') NOT NULL DEFAULT 'local' COMMENT 'Source platform of the video',
  `external_id` VARCHAR(255) COMMENT 'External video ID (for YouTube, Vimeo, etc.)',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_product_videos_product_id` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE,
  KEY `idx_product_id` (`product_id`),
  KEY `idx_video_type` (`video_type`),
  KEY `idx_platform` (`platform`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Log migration
SELECT 'Migration 009: Created product_videos table' as migration_status;
