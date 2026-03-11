-- Create delivery_categories table
CREATE TABLE IF NOT EXISTS delivery_categories (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(50) NOT NULL UNIQUE,
  type ENUM('normal', 'instant', 'express', 'scheduled') NOT NULL DEFAULT 'normal',
  default_per_km_rate DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT 'Default per-kilometer rate in UGX for this category',
  description TEXT COMMENT 'Description of this delivery category',
  estimated_hours INT COMMENT 'Estimated delivery time in hours',
  is_active BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Whether this category is currently active',
  sort_order INT NOT NULL DEFAULT 0 COMMENT 'Sort order for display (lower = higher priority)',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) COMMENT='Delivery category types with default per-km rates';

-- Insert default categories
INSERT INTO delivery_categories (name, slug, type, default_per_km_rate, description, estimated_hours, is_active, sort_order)
VALUES 
  ('Normal Delivery', 'normal', 'normal', 600.00, 'Standard delivery service with economical rates', 48, TRUE, 1),
  ('Instant Delivery', 'instant', 'instant', 1000.00, 'Fast delivery service with priority handling', 2, TRUE, 2)
ON DUPLICATE KEY UPDATE name=name;

-- Add delivery_category_id to stores table (skip if already exists)
SET @schema = 'nalmart_dev';
SET @table = 'stores';
SET @column = 'delivery_category_id';

SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_SCHEMA = @schema 
               AND TABLE_NAME = @table 
               AND COLUMN_NAME = @column);

SET @sqlstmt := IF(@exist = 0, 
  CONCAT('ALTER TABLE ', @table, ' ADD COLUMN ', @column, ' BIGINT COMMENT ''Default delivery category for this store'''),
  'SELECT ''Column already exists'' AS message');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign key constraint (skip if already exists)
SET @fk_exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
                  WHERE CONSTRAINT_SCHEMA = @schema 
                  AND TABLE_NAME = @table 
                  AND CONSTRAINT_NAME = 'fk_stores_delivery_category');

SET @sqlstmt2 := IF(@fk_exist = 0,
  CONCAT('ALTER TABLE ', @table, ' ADD CONSTRAINT fk_stores_delivery_category FOREIGN KEY (delivery_category_id) REFERENCES delivery_categories(id) ON UPDATE CASCADE ON DELETE SET NULL'),
  'SELECT ''Foreign key already exists'' AS message');
PREPARE stmt2 FROM @sqlstmt2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- Set all existing stores to use Normal Delivery (id: 1)
UPDATE stores SET delivery_category_id = 1 WHERE delivery_category_id IS NULL;

