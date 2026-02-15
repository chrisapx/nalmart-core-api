-- Create login_sessions table for tracking user sessions
-- Migration: 004_create_login_sessions_table.sql

CREATE TABLE login_sessions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  session_id CHAR(36) NOT NULL UNIQUE COMMENT 'UUID stored in JWT payload',
  user_id BIGINT NOT NULL,
  
  -- Device Information
  device_fingerprint VARCHAR(255) NULL,
  device_type ENUM('desktop', 'mobile', 'tablet', 'unknown') DEFAULT 'unknown',
  device_name VARCHAR(255) NULL,
  browser VARCHAR(255) NULL,
  os VARCHAR(100) NULL,
  
  -- Network Information
  ip_address VARCHAR(50) NULL,
  city VARCHAR(100) NULL,
  country VARCHAR(100) NULL,
  country_code VARCHAR(10) NULL,
  
  -- Session Status
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP NOT NULL,
  last_activity_at TIMESTAMP NULL,
  revoked_at TIMESTAMP NULL,
  revocation_reason VARCHAR(100) NULL,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  CONSTRAINT fk_login_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  -- Indexes
  INDEX idx_login_sessions_user_id (user_id),
  INDEX idx_login_sessions_session_id (session_id),
  INDEX idx_login_sessions_is_active (is_active),
  INDEX idx_login_sessions_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
