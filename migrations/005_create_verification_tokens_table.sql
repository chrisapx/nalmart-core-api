-- Create verification_tokens table for email/phone verification
-- Migration: 005_create_verification_tokens_table.sql

CREATE TABLE verification_tokens (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  token VARCHAR(255) NOT NULL COMMENT '6-digit code for email/phone, 32-char for password reset',
  type ENUM('email', 'phone', 'password_reset', '2fa') NOT NULL,
  sent_to VARCHAR(100) NULL COMMENT 'Email or phone number this token was sent to',
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP NULL,
  attempts INT DEFAULT 0 COMMENT 'Number of failed verification attempts',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  CONSTRAINT fk_verification_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  -- Indexes
  INDEX idx_verification_tokens_user_id (user_id),
  INDEX idx_verification_tokens_token (token),
  INDEX idx_verification_tokens_type (type),
  INDEX idx_verification_tokens_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
