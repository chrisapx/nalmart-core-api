import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../types/express';
import { LoginRequest, RegisterRequest, AuthResponse, RefreshTokenRequest } from '../types/auth.types';
import User from '../models/User';
import { generateTokenPair, verifyRefreshToken, getTokenExpiry } from '../utils/jwt';
import { blacklistToken, isTokenBlacklisted } from '../config/redis';
import { sendSuccess, sendError } from '../utils/response';
import { ValidationError, AuthenticationError, ConflictError } from '../utils/errors';
import { SessionService } from '../services/session.service';
import { VerificationService } from '../services/verification.service';
import env from '../config/env';
import logger from '../utils/logger';

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { first_name, last_name, email, password, phone }: RegisterRequest = req.body;

    // Validate required fields
    if (!first_name || !last_name || !email || !password) {
      throw new ValidationError('First name, last name, email, and password are required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError('Invalid email format');
    }

    // Validate password strength
    if (password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters long');
    }

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Create user (password will be hashed by User model hook)
    const user = await User.create({
      first_name,
      last_name,
      email,
      password,
      phone,
      account_verified: false,
    });

    // Extract session info from request
    const { ipAddress, userAgent } = SessionService.extractSessionInfo(req);

    // Create login session
    const session = await SessionService.createSession({
      userId: user.id,
      ipAddress,
      userAgent,
      expiresIn: 7 * 24 * 60 * 60, // 7 days
    });

    // Generate tokens with session ID
    const tokens = generateTokenPair(
      user.id,
      session.session_id,
      user.email,
      user.account_verified
    );

    // Send verification email
    try {
      await VerificationService.sendEmailVerification(user);
    } catch (error: any) {
      logger.error('Failed to send verification email:', {
        error: error.message,
        stack: error.stack,
        user_id: user.id,
        user_email: user.email,
      });
      // Don't fail registration if email fails
    }

    // Prepare response
    const response: AuthResponse = {
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone,
        avatar_url: user.avatar_url,
        status: user.status,
        email_verified: user.email_verified,
        account_verified: user.account_verified,
        created_at: user.created_at,
      },
      tokens: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: env.JWT_EXPIRES_IN,
      },
      requires_verification: !user.account_verified,
    };

    logger.info(`User registered successfully: ${user.email}`);
    sendSuccess(res, response, 'User registered successfully. Please verify your email or phone.', 201);
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password }: LoginRequest = req.body;

    // Validate required fields
    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }

    // Find user by email (or phone if it looks like a phone number)
    const isPhone = /^\+?\d{10,15}$/.test(email);
    const user = await User.findOne({
      where: isPhone ? { phone: email } : { email },
    });

    if (!user) {
      throw new AuthenticationError('Invalid credentials');
    }

    // Check if user is active
    if (user.status !== 'active') {
      throw new AuthenticationError('User account is not active');
    }

    // Extract session info from request
    const { ipAddress, userAgent } = SessionService.extractSessionInfo(req);

    // Check if user account is verified
    if (!user.account_verified) {
      logger.warn(`Unverified account attempted login: ${user.email}`);
      
      // Send verification email reminder
      try {
        await VerificationService.sendEmailVerification(user);
      } catch (error: any) {
        logger.error('Failed to send verification email reminder:', error.message);
        // Don't fail the response if email fails
      }

      // Return response indicating verification is required
      const response = {
        requires_verification: true,
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          account_verified: user.account_verified,
        },
      };
      sendSuccess(res, response, 'Please verify your account. A verification email has been sent.');
      return;
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid credentials');
    }

    // Update last login
    user.last_login_at = new Date();
    user.last_login_ip = ipAddress;
    await user.save();

    // Create login session
    const session = await SessionService.createSession({
      userId: user.id,
      ipAddress,
      userAgent,
      expiresIn: 7 * 24 * 60 * 60, // 7 days
    });

    // Generate tokens with session ID
    const tokens = generateTokenPair(
      user.id,
      session.session_id,
      user.email,
      user.account_verified
    );

    // Prepare response
    const response: AuthResponse = {
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone,
        avatar_url: user.avatar_url,
        status: user.status,
        email_verified: user.email_verified,
        account_verified: user.account_verified,
        created_at: user.created_at,
      },
      tokens: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: env.JWT_EXPIRES_IN,
      },
      requires_verification: !user.account_verified,
    };

    logger.info(`User logged in successfully: ${user.email}`);
    sendSuccess(res, response, 'Login successful');
  } catch (error) {
    next(error);
  }
};

export const logout = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.token;

    if (!token) {
      throw new AuthenticationError('No token provided');
    }

    // Get token expiry time
    const expiry = getTokenExpiry(token);
    if (expiry) {
      const ttl = expiry - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        // Add token to blacklist with TTL
        await blacklistToken(token, ttl);
      }
    }

    // Revoke session if sessionId available
    if (req.user && (req as any).sessionId) {
      try {
        await SessionService.revokeSession((req as any).sessionId, 'User logout');
      } catch (error) {
        logger.error('Failed to revoke session:', error);
        // Don't fail logout if session revocation fails
      }
    }

    logger.info(`User logged out: ${req.user?.email}`);
    sendSuccess(res, null, 'Logout successful');
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { refresh_token }: RefreshTokenRequest = req.body;

    if (!refresh_token) {
      throw new ValidationError('Refresh token is required');
    }

    // Check if refresh token is blacklisted
    const isBlacklisted = await isTokenBlacklisted(refresh_token);
    if (isBlacklisted) {
      throw new AuthenticationError('Refresh token has been revoked');
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refresh_token);

    // Find user
    const user = await User.findByPk(decoded.userId);
    if (!user) {
      throw new AuthenticationError('User not found');
    }

    // Check if user is active
    if (user.status !== 'active') {
      throw new AuthenticationError('User account is not active');
    }

    // Verify session is still valid
    const sessionId = decoded.sessionId;
    if (sessionId) {
      const isSessionValid = await SessionService.isSessionValid(sessionId);
      if (!isSessionValid) {
        throw new AuthenticationError('Session has been revoked');
      }
      // Update session activity
      await SessionService.updateActivity(sessionId);
    }

    // Generate new token pair with same session ID
    const tokens = generateTokenPair(
      user.id,
      sessionId,
      user.email,
      user.account_verified
    );

    // Blacklist old refresh token
    const oldTokenExpiry = getTokenExpiry(refresh_token);
    if (oldTokenExpiry) {
      const ttl = oldTokenExpiry - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        await blacklistToken(refresh_token, ttl);
      }
    }

    sendSuccess(
      res,
      {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: env.JWT_EXPIRES_IN,
      },
      'Token refreshed successfully'
    );
  } catch (error) {
    next(error);
  }
};

export const getProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user;

    if (!user) {
      throw new AuthenticationError('User not found');
    }

    sendSuccess(res, user, 'Profile retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// VERIFICATION ENDPOINTS
// ============================================================================

export const verifyEmail = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      throw new ValidationError('Email and verification code are required');
    }

    // Look up user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new AuthenticationError('User not found');
    }

    await VerificationService.verifyEmail(user.id, code);

    sendSuccess(res, null, 'Email verified successfully');
  } catch (error) {
    next(error);
  }
};

export const verifyPhone = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { phone, code } = req.body;

    if (!phone || !code) {
      throw new ValidationError('Phone number and verification code are required');
    }

    // Look up user by phone
    const user = await User.findOne({ where: { phone } });
    if (!user) {
      throw new AuthenticationError('User not found');
    }

    await VerificationService.verifyPhone(user.id, code);

    sendSuccess(res, null, 'Phone verified successfully');
  } catch (error) {
    next(error);
  }
};

export const resendVerification = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, type } = req.body;

    if (!email) {
      throw new ValidationError('Email is required');
    }

    if (!type || !['email', 'phone'].includes(type)) {
      throw new ValidationError('Type must be either "email" or "phone"');
    }

    // Look up user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new AuthenticationError('User not found');
    }

    await VerificationService.resendVerification(user.id, type);

    sendSuccess(res, null, `Verification code sent to your ${type}`);
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// SESSION MANAGEMENT ENDPOINTS
// ============================================================================

export const getActiveSessions = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId;

    if (!userId) {
      throw new AuthenticationError('User not authenticated');
    }

    const sessions = await SessionService.getActiveSessions(userId);

    sendSuccess(res, sessions, 'Active sessions retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const revokeSession = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const sessionId = Array.isArray(req.params.sessionId)
      ? req.params.sessionId[0]
      : req.params.sessionId;

    if (!sessionId) {
      throw new ValidationError('Session ID is required');
    }

    await SessionService.revokeSession(sessionId, 'User revoked session');

    sendSuccess(res, null, 'Session revoked successfully');
  } catch (error) {
    next(error);
  }
};

export const logoutAllDevices = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId;
    const currentSessionId = (req as any).sessionId;

    if (!userId) {
      throw new AuthenticationError('User not authenticated');
    }

    // Revoke all sessions except current
    const revokedCount = await SessionService.revokeAllSessions(userId, currentSessionId);

    sendSuccess(
      res,
      { revoked_count: revokedCount },
      `Logged out from ${revokedCount} device(s)`
    );
  } catch (error) {
    next(error);
  }
};

export const getSessionStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId;

    if (!userId) {
      throw new AuthenticationError('User not authenticated');
    }

    const stats = await SessionService.getSessionStats(userId);

    sendSuccess(res, stats, 'Session statistics retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// PASSWORD RECOVERY ENDPOINTS
// ============================================================================

/**
 * Request password reset
 * Generates a password reset token and sends it via email
 */
export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new ValidationError('Email is required');
    }

    // Find user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      // Don't leak whether email exists - return success anyway
      sendSuccess(res, null, 'If an account exists, a reset link will be sent');
      return;
    }

    // Generate password reset token
    const token = await VerificationService.sendPasswordReset(user);

    sendSuccess(res, null, 'Password reset link sent to your email');
  } catch (error) {
    next(error);
  }
};

/**
 * Reset password with token
 * Validates the reset token and updates the password
 */
export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { token: resetToken, password } = req.body;

    if (!resetToken) {
      throw new ValidationError('Reset token is required');
    }

    if (!password) {
      throw new ValidationError('New password is required');
    }

    if (password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters');
    }

    // Verify and use the reset token
    await VerificationService.verifyPasswordReset(resetToken, password);

    sendSuccess(res, null, 'Password reset successfully');
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// OTP LOGIN ENDPOINTS
// ============================================================================

/**
 * Request OTP for login
 * Generates and sends a login OTP code
 */
export const requestLoginOTP = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new ValidationError('Email is required');
    }

    // Find user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      // Don't leak whether email exists - return success anyway
      sendSuccess(res, null, 'If an account exists, an OTP will be sent');
      return;
    }

    // Generate and send login OTP
    await VerificationService.sendLoginOTP(user);

    sendSuccess(res, null, 'OTP sent to your email');
  } catch (error) {
    next(error);
  }
};

/**
 * Login with OTP
 * Validates the OTP and returns authentication tokens
 */
export const loginWithOTP = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, code } = req.body;

    if (!email) {
      throw new ValidationError('Email is required');
    }

    if (!code) {
      throw new ValidationError('OTP code is required');
    }

    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new AuthenticationError('User not found');
    }

    // Verify OTP
    await VerificationService.verifyLoginOTP(user.id, code);

    // Extract session info from request
    const { ipAddress, userAgent } = SessionService.extractSessionInfo(req);

    // Update last login
    user.last_login_at = new Date();
    user.last_login_ip = ipAddress;
    await user.save();

    // Create login session
    const session = await SessionService.createSession({
      userId: user.id,
      ipAddress,
      userAgent,
      expiresIn: 7 * 24 * 60 * 60, // 7 days
    });

    // Generate tokens
    const tokens = generateTokenPair(
      user.id,
      session.session_id,
      user.email,
      user.account_verified
    );

    logger.info(`User logged in with OTP: ${user.email}`);

    // Prepare response
    const response: AuthResponse = {
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone,
        avatar_url: user.avatar_url,
        status: user.status,
        email_verified: user.email_verified,
        account_verified: user.account_verified,
        created_at: user.created_at,
      },
      tokens: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: env.JWT_EXPIRES_IN,
      },
      requires_verification: false,
    };

    sendSuccess(res, response, 'Login successful');
  } catch (error) {
    next(error);
  }
};

/**
 * Google OAuth callback handler
 * Called after successful Google authentication
 */
export const googleCallback = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user as User;

    if (!user) {
      logger.error('Google OAuth callback: No user found in request');
      throw new AuthenticationError('Google authentication failed: User not found');
    }

    logger.info(`✅ Google OAuth successful for user: ${user.email}`);

    // Extract session info from request
    const { ipAddress, userAgent } = SessionService.extractSessionInfo(req);

    // Update last login
    user.last_login_at = new Date();
    user.last_login_ip = ipAddress;
    await user.save();

    // Create login session
    const session = await SessionService.createSession({
      userId: user.id,
      ipAddress,
      userAgent,
      expiresIn: 7 * 24 * 60 * 60, // 7 days
    });

    // Generate tokens with session ID
    const tokens = generateTokenPair(
      user.id,
      session.session_id,
      user.email,
      user.account_verified
    );

    logger.debug(`Generated JWT tokens for Google OAuth user: ${user.email}`);

    // Redirect to frontend with tokens
    const frontendUrl = env.FRONTEND_URL || 'http://localhost:5173';
    const redirectUrl = `${frontendUrl}/auth/google/callback?access_token=${tokens.access_token}&refresh_token=${tokens.refresh_token}&user_id=${user.id}`;

    logger.debug(`Redirecting to: ${frontendUrl}/auth/google/callback`);
    res.redirect(redirectUrl);
  } catch (error) {
    logger.error('Google OAuth callback error:', error);
    next(error);
  }
};

/**
 * Initiate Google OAuth flow
 * This will be handled by passport middleware
 */
export const googleAuth = (req: Request, res: Response, next: NextFunction): void => {
  // This is a placeholder - actual authentication is handled by passport middleware
  next();
};
