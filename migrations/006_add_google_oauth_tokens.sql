-- Migration: Add Google OAuth token storage to users table
-- Purpose: Store Google access and refresh tokens for OAuth integration

ALTER TABLE users
ADD COLUMN IF NOT EXISTS google_access_token LONGTEXT NULL COMMENT 'Google OAuth access token (encrypted)' AFTER google_avatar,
ADD COLUMN IF NOT EXISTS google_refresh_token LONGTEXT NULL COMMENT 'Google OAuth refresh token (encrypted)' AFTER google_access_token;

-- Add indexes for Google OAuth fields if needed
CREATE INDEX IF NOT EXISTS idx_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_verification_method ON users(verification_method);

-- Log migration completion
SELECT 'Migration 006: Added Google OAuth token storage' as migration_status;
