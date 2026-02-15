import nodemailer from 'nodemailer';
import { Op } from 'sequelize';
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

    // Create new verification token
    const token = await VerificationToken.create({
      user_id: user.id,
      type: 'email',
      sent_to: user.email,
    });

    // Send email
    try {
      await this.emailTransporter.sendMail({
        from: process.env.EMAIL_FROM || 'Nalmart <noreply@nalmart.com>',
        to: user.email,
        subject: 'Verify Your Nalmart Account',
        html: this.getEmailVerificationTemplate(user.first_name, token.token),
      });

      logger.info(`Email verification sent to ${user.email}`);
    } catch (error) {
      logger.error('Failed to send verification email:', error);
      throw new Error('Failed to send verification email');
    }

    return token;
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

    // Create new verification token
    const token = await VerificationToken.create({
      user_id: user.id,
      type: 'phone',
      sent_to: user.phone,
    });

    // Send SMS (placeholder - integrate with Twilio, SNS, or other SMS provider)
    try {
      await this.sendSMS(user.phone, token.token);
      logger.info(`Phone verification sent to ${user.phone}`);
    } catch (error) {
      logger.error('Failed to send verification SMS:', error);
      throw new Error('Failed to send verification SMS');
    }

    return token;
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
}
