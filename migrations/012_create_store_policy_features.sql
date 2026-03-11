-- Create store_policy_features table
CREATE TABLE IF NOT EXISTS store_policy_features (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  store_id BIGINT COMMENT 'Store ID if feature is store-specific, null for global features',
  type ENUM('buyer_protection', 'returns', 'delivery', 'payment', 'support', 'warranty', 'insurance', 'guarantee') NOT NULL COMMENT 'Type of feature',
  title VARCHAR(100) NOT NULL COMMENT 'Feature title displayed to users',
  description TEXT COMMENT 'Feature description',
  icon VARCHAR(50) COMMENT 'Icon name (e.g., "Shield", "RefreshCw", "Truck")',
  value VARCHAR(255) COMMENT 'Value or detail of the feature (e.g., "30 Day Returns", "24/7")',
  is_active BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Whether this feature is currently active/enabled',
  sort_order INT NOT NULL DEFAULT 0 COMMENT 'Display order (lower numbers appear first)',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (store_id) REFERENCES stores(id) ON UPDATE CASCADE ON DELETE CASCADE
) COMMENT='Store policy features displayed to users (e.g., buyer protection, returns policy)';

-- Insert default global features
INSERT INTO store_policy_features (store_id, type, title, description, icon, value, is_active, sort_order)
VALUES 
  (NULL, 'buyer_protection', 'Buyer Protection', 'Your purchase is protected against fraud and misrepresentation', 'Shield', 'Protected', TRUE, 1),
  (NULL, 'returns', 'Easy Returns', '30-day hassle-free return policy on eligible items', 'RefreshCw', '30 Days', TRUE, 2),
  (NULL, 'delivery', 'Fast Delivery', 'Quick and reliable delivery to your doorstep', 'Truck', '2-48 Hours', TRUE, 3),
  (NULL, 'payment', 'Secure Payment', 'Your payment information is encrypted and secure', 'CreditCard', 'SSL Encrypted', TRUE, 4),
  (NULL, 'support', 'Customer Support', 'Our team is available to help you anytime', 'Headphones', '24/7', TRUE, 5)
ON DUPLICATE KEY UPDATE title=VALUES(title);

-- Add index on store_id for faster queries
CREATE INDEX idx_store_policy_features_store_id ON store_policy_features(store_id);

-- Add index on is_active and sort_order for efficient filtering
CREATE INDEX idx_store_policy_features_active_sort ON store_policy_features(is_active, sort_order);
