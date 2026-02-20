import nodemailer from 'nodemailer';
import { Op } from 'sequelize';
import crypto from 'crypto';
import User from '../models/User';
import VerificationToken from '../models/VerificationToken';
import env from '../config/env';
import logger from '../utils/logger';
import { NotFoundError, ValidationError } from '../utils/errors';

/**
 * Verification Service
 * Handles email and phone verification for user accounts
 */
export class VerificationService {
  private static emailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASSWORD || '',
    },
  });

  /**
   * Generate token and expiry based on type
   */
  private static generateTokenForType(type: string): { token: string; expires_at: Date } {
    let token: string;
    
    // Generate 6-digit code for email/phone/login_otp, 32-char token for password reset
    if (type === 'email' || type === 'phone' || type === '2fa' || type === 'login_otp') {
      token = Math.floor(100000 + Math.random() * 900000).toString();
    } else {
      token = crypto.randomBytes(32).toString('hex');
    }

    // Email/Phone codes expire in 15 minutes, Password reset tokens expire in 1 hour
    const expiryMinutes = type === 'password_reset' ? 60 : 15;
    const expires_at = new Date(Date.now() + expiryMinutes * 60 * 1000);

    return { token, expires_at };
  }

  /**
   * Generate and send email verification code
   */
  static async sendEmailVerification(user: User): Promise<VerificationToken> {
    // Invalidate any existing email verification tokens
    await VerificationToken.update(
      { used_at: new Date() },
      {
        where: {
          user_id: user.id,
          type: 'email',
          used_at: {
            [Op.is]: null,
          },
        },
      }
    );

    // Generate token and expiry
    const { token, expires_at } = this.generateTokenForType('email');

    // Create new verification token
    const verificationToken = await VerificationToken.create({
      user_id: user.id,
      type: 'email',
      sent_to: user.email,
      token,
      expires_at,
    });

    // Send email
    try {
      await this.emailTransporter.sendMail({
        from: process.env.EMAIL_FROM || 'Nalmart <noreply@nalmart.com>',
        to: user.email,
        subject: 'Verify Your Nalmart Account',
        html: this.getEmailVerificationTemplate(user.first_name, verificationToken.token),
      });

      logger.info(`Email verification sent to ${user.email}`);
    } catch (error) {
      logger.error('Failed to send verification email:', error);
      throw new Error('Failed to send verification email');
    }

    return verificationToken;
  }

  /**
   * Generate and send phone verification code (SMS)
   */
  static async sendPhoneVerification(user: User): Promise<VerificationToken> {
    if (!user.phone) {
      throw new ValidationError('User has no phone number');
    }

    // Invalidate any existing phone verification tokens
    await VerificationToken.update(
      { used_at: new Date() },
      {
        where: {
          user_id: user.id,
          type: 'phone',
          used_at: {
            [Op.is]: null,
          },
        },
      }
    );

    // Generate token and expiry
    const { token, expires_at } = this.generateTokenForType('phone');

    // Create new verification token
    const verificationToken = await VerificationToken.create({
      user_id: user.id,
      type: 'phone',
      sent_to: user.phone,
      token,
      expires_at,
    });

    // Send SMS (placeholder - integrate with Twilio, SNS, or other SMS provider)
    try {
      await this.sendSMS(user.phone, verificationToken.token);
      logger.info(`Phone verification sent to ${user.phone}`);
    } catch (error) {
      logger.error('Failed to send verification SMS:', error);
      throw new Error('Failed to send verification SMS');
    }

    return verificationToken;
  }

  /**
   * Verify email with code
   */
  static async verifyEmail(userId: number, code: string): Promise<boolean> {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.email_verified) {
      throw new ValidationError('Email already verified');
    }

    const token = await VerificationToken.findOne({
      where: {
        user_id: userId,
        token: code,
        type: 'email',
        used_at: null,
      },
    });

    if (!token) {
      throw new ValidationError('Invalid or expired verification code');
    }

    // Check if token is expired
    if (token.isExpired()) {
      throw new ValidationError('Verification code has expired');
    }

    // Check attempts
    if (token.attempts >= 5) {
      throw new ValidationError('Too many failed attempts. Please request a new code.');
    }

    // Mark token as used and update user
    token.markAsUsed();
    await token.save();

    user.email_verified = true;
    user.email_verified_at = new Date();
    user.account_verified = true;
    user.verification_method = 'email';
    await user.save();

    logger.info(`Email verified for user ${user.email}`);
    return true;
  }

  /**
   * Verify phone with code
   */
  static async verifyPhone(userId: number, code: string): Promise<boolean> {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.phone_verified) {
      throw new ValidationError('Phone already verified');
    }

    const token = await VerificationToken.findOne({
      where: {
        user_id: userId,
        token: code,
        type: 'phone',
        used_at: null,
      },
    });

    if (!token) {
      throw new ValidationError('Invalid or expired verification code');
    }

    // Check if token is expired
    if (token.isExpired()) {
      throw new ValidationError('Verification code has expired');
    }

    // Check attempts
    if (token.attempts >= 5) {
      throw new ValidationError('Too many failed attempts. Please request a new code.');
    }

    // Mark token as used and update user
    token.markAsUsed();
    await token.save();

    user.phone_verified = true;
    user.phone_verified_at = new Date();
    user.account_verified = true;
    user.verification_method = 'phone';
    await user.save();

    logger.info(`Phone verified for user ${user.email}`);
    return true;
  }

  /**
   * Resend verification code
   */
  static async resendVerification(
    userId: number,
    type: 'email' | 'phone'
  ): Promise<VerificationToken> {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Check if already verified
    if (type === 'email' && user.email_verified) {
      throw new ValidationError('Email already verified');
    }
    if (type === 'phone' && user.phone_verified) {
      throw new ValidationError('Phone already verified');
    }

    // Check rate limiting (max 3 resends per hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentTokens = await VerificationToken.count({
      where: {
        user_id: userId,
        type,
        created_at: {
          [Op.gte]: oneHourAgo,
        },
      },
    });

    if (recentTokens >= 3) {
      throw new ValidationError('Too many verification attempts. Please try again later.');
    }

    // Send new verification
    if (type === 'email') {
      return await this.sendEmailVerification(user);
    } else {
      return await this.sendPhoneVerification(user);
    }
  }

  /**
   * Send password reset email
   */
  static async sendPasswordReset(user: User): Promise<VerificationToken> {
    // Invalidate any existing password reset tokens
    await VerificationToken.update(
      { used_at: new Date() },
      {
        where: {
          user_id: user.id,
          type: 'password_reset',
          used_at: {
            [Op.is]: null,
          },
        },
      }
    );

    // Generate token and expiry
    const { token, expires_at } = this.generateTokenForType('password_reset');

    // Create new password reset token
    const verificationToken = await VerificationToken.create({
      user_id: user.id,
      type: 'password_reset',
      sent_to: user.email,
      token,
      expires_at,
    });

    // Send password reset email
    try {
      await this.emailTransporter.sendMail({
        from: process.env.EMAIL_FROM || 'Nalmart <noreply@nalmart.com>',
        to: user.email,
        subject: 'Reset Your Nalmart Password',
        html: this.getPasswordResetTemplate(user.first_name, verificationToken.token),
      });

      logger.info(`Password reset email sent to ${user.email}`);
    } catch (error) {
      logger.error('Failed to send password reset email:', error);
      throw new Error('Failed to send password reset email');
    }

    return verificationToken;
  }

  /**
   * Verify password reset token and update password
   */
  static async verifyPasswordReset(code: string, newPassword: string): Promise<void> {
    const token = await VerificationToken.findOne({
      where: {
        token: code,
        type: 'password_reset',
        used_at: null,
      },
    });

    if (!token) {
      throw new ValidationError('Invalid or expired reset token');
    }

    // Check if token is expired
    if (token.isExpired()) {
      throw new ValidationError('Reset token has expired');
    }

    // Get user
    const user = await User.findByPk(token.user_id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Update password (will be hashed by User model hook)
    user.password = newPassword;
    await user.save();

    // Mark token as used
    token.markAsUsed();
    await token.save();

    logger.info(`Password reset for user: ${user.email}`);
  }

  /**
   * Send OTP for login
   */
  static async sendLoginOTP(user: User): Promise<VerificationToken> {
    // Invalidate any existing login OTP codes
    await VerificationToken.update(
      { used_at: new Date() },
      {
        where: {
          user_id: user.id,
          type: 'login_otp',
          used_at: {
            [Op.is]: null,
          },
        },
      }
    );

    // Generate token and expiry
    const { token, expires_at } = this.generateTokenForType('login_otp');

    // Create new login OTP token
    const verificationToken = await VerificationToken.create({
      user_id: user.id,
      type: 'login_otp',
      sent_to: user.email,
      token,
      expires_at,
    });

    // Send OTP via email
    try {
      await this.emailTransporter.sendMail({
        from: process.env.EMAIL_FROM || 'Nalmart <noreply@nalmart.com>',
        to: user.email,
        subject: 'Your Nalmart Login Code',
        html: this.getLoginOTPTemplate(user.first_name, verificationToken.token),
      });

      logger.info(`Login OTP sent to ${user.email}`);
    } catch (error) {
      logger.error('Failed to send login OTP:', error);
      throw new Error('Failed to send login OTP');
    }

    return verificationToken;
  }

  /**
   * Verify login OTP
   */
  static async verifyLoginOTP(userId: number, code: string): Promise<void> {
    const token = await VerificationToken.findOne({
      where: {
        user_id: userId,
        token: code,
        type: 'login_otp',
        used_at: null,
      },
    });

    if (!token) {
      throw new ValidationError('Invalid or expired OTP');
    }

    // Check if token is expired
    if (token.isExpired()) {
      throw new ValidationError('OTP has expired');
    }

    // Check attempts
    if (token.attempts >= 5) {
      throw new ValidationError('Too many failed attempts. Please request a new OTP.');
    }

    // Mark token as used
    token.markAsUsed();
    await token.save();

    logger.info(`OTP verified for user ID: ${userId}`);
  }

  /**
   * Send SMS (placeholder - integrate with SMS provider)
   */
  private static async sendSMS(phone: string, code: string): Promise<void> {
    // TODO: Integrate with Twilio, AWS SNS, or other SMS provider
    // For now, just log it
    logger.info(`SMS Verification Code for ${phone}: ${code}`);
    
    // Example Twilio integration (commented out):
    /*
    const twilio = require('twilio');
    const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
    
    await client.messages.create({
      body: `Your Nalmart verification code is: ${code}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });
    */
  }

  /**
   * Email verification HTML template
   */
  private static getEmailVerificationTemplate(firstName: string, code: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; background: #f9fafb; }
          .code { font-size: 32px; font-weight: bold; color: #4F46E5; text-align: center; 
                  padding: 20px; background: white; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Verify Your Nalmart Account</h1>
          </div>
          <div class="content">
            <p>Hi ${firstName},</p>
            <p>Thank you for registering with Nalmart! Please use the verification code below to complete your registration:</p>
            <div class="code">${code}</div>
            <p>This code will expire in 15 minutes.</p>
            <p>If you didn't create an account with Nalmart, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; 2026 Nalmart. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Password reset HTML template
   */
  private static getPasswordResetTemplate(firstName: string, token: string): string {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; background: #f9fafb; }
          .button { display: inline-block; padding: 12px 30px; background: #4F46E5; 
                    color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Reset Your Password</h1>
          </div>
          <div class="content">
            <p>Hi ${firstName},</p>
            <p>We received a request to reset your Nalmart password. Click the button below to set a new password:</p>
            <center>
              <a href="${resetUrl}" class="button">Reset Password</a>
            </center>
            <p>Or copy and paste this link in your browser:</p>
            <p style="word-break: break-all; color: #666;">${resetUrl}</p>
            <p style="color: #e74c3c;"><strong>This link will expire in 1 hour.</strong></p>
            <p>If you didn't request a password reset, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; 2026 Nalmart. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Login OTP HTML template
   */
  private static getLoginOTPTemplate(firstName: string, code: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; background: #f9fafb; }
          .code { font-size: 36px; font-weight: bold; color: #4F46E5; text-align: center; 
                  padding: 20px; background: white; border-radius: 8px; margin: 20px 0; 
                  letter-spacing: 10px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Your Nalmart Login Code</h1>
          </div>
          <div class="content">
            <p>Hi ${firstName},</p>
            <p>Use the code below to sign in to your Nalmart account:</p>
            <div class="code">${code}</div>
            <p>This code will expire in 15 minutes.</p>
            <p style="color: #e74c3c;"><strong>Never share this code with anyone.</strong></p>
            <p>If you didn't request this code, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; 2026 Nalmart. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}