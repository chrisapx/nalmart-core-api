import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../types/express';
import { LoginRequest, RegisterRequest, AuthResponse, RefreshTokenRequest } from '../types/auth.types';
import User from '../models/User';
import { generateTokenPair, verifyRefreshToken, getTokenExpiry } from '../utils/jwt';
import { blacklistToken, isTokenBlacklisted } from '../config/redis';
import { sendSuccess, sendError } from '../utils/response';
import { ValidationError, AuthenticationError, ConflictError } from '../utils/errors';
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
    });

    // Generate tokens
    const tokens = generateTokenPair(user.id, user.email);

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
        created_at: user.created_at,
      },
      tokens: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: env.JWT_EXPIRES_IN,
      },
    };

    logger.info(`User registered successfully: ${user.email}`);
    sendSuccess(res, response, 'User registered successfully', 201);
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

    // Find user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Check if user is active
    if (user.status !== 'active') {
      throw new AuthenticationError('User account is not active');
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Update last login
    user.last_login_at = new Date();
    user.last_login_ip = req.ip || req.socket.remoteAddress || '';
    await user.save();

    // Generate tokens
    const tokens = generateTokenPair(user.id, user.email);

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
        created_at: user.created_at,
      },
      tokens: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: env.JWT_EXPIRES_IN,
      },
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

    // Generate new token pair
    const tokens = generateTokenPair(user.id, user.email);

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
