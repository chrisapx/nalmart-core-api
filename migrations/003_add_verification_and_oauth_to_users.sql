-- Add phone verification and Google OAuth fields to users table
-- Migration: 003_add_verification_and_oauth_to_users.sql

ALTER TABLE users
  ADD COLUMN phone_verified BOOLEAN DEFAULT FALSE AFTER email_verified_at,
  ADD COLUMN phone_verified_at TIMESTAMP NULL AFTER phone_verified,
  ADD COLUMN account_verified BOOLEAN DEFAULT FALSE COMMENT 'Account is verified if email OR phone is verified' AFTER phone_verified_at,
  ADD COLUMN verification_method ENUM('email', 'phone', 'google', 'none') DEFAULT 'none' COMMENT 'Primary verification method used' AFTER account_verified,
  ADD COLUMN google_id VARCHAR(255) NULL UNIQUE AFTER verification_method,
  ADD COLUMN google_email VARCHAR(255) NULL AFTER google_id,
  ADD COLUMN google_avatar VARCHAR(500) NULL AFTER google_email;

-- Add indexes for new fields
CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_users_account_verified ON users(account_verified);
CREATE INDEX idx_users_verification_method ON users(verification_method);

-- Update existing users to set account_verified based on email_verified
UPDATE users SET account_verified = email_verified WHERE email_verified = TRUE;
UPDATE users SET verification_method = 'email' WHERE email_verified = TRUE;
