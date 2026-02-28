-- Migration 010: Add 'login_otp' to verification_tokens.type ENUM
ALTER TABLE verification_tokens
  MODIFY COLUMN type ENUM('email', 'phone', 'password_reset', '2fa', 'login_otp') NOT NULL;
