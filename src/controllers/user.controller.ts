import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../types/express';
import User from '../models/User';
import { sendSuccess, sendError } from '../utils/response';
import { ValidationError, ConflictError, NotFoundError } from '../utils/errors';
import { VerificationService } from '../services/verification.service';
import logger from '../utils/logger';

interface CreateUserRequest {
  first_name: string;
  last_name: string;
  email: string;
  password?: string;
  phone?: string;
  auto_verify?: boolean;
  send_verification_email?: boolean;
}

/**
 * Admin endpoint to create a new user
 * Requires CREATE_USER permission
 */
export const createUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      first_name,
      last_name,
      email,
      password,
      phone,
      auto_verify = false,
      send_verification_email = true,
    }: CreateUserRequest = req.body;

    // Validate required fields
    if (!first_name || !last_name || !email) {
      throw new ValidationError('First name, last name, and email are required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError('Invalid email format');
    }

    // Validate password if provided
    if (password && password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters long');
    }

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Generate random password if not provided
    const userPassword = password || Math.random().toString(36).slice(-12) + 'A1!';

    // Create user
    const user = await User.create({
      first_name,
      last_name,
      email,
      password: userPassword,
      phone,
      account_verified: auto_verify,
      email_verified: auto_verify,
      verification_method: auto_verify ? 'email' : 'none',
    });

    // Send verification email if requested and not auto-verified
    let verification_link = null;
    if (send_verification_email && !auto_verify) {
      try {
        const verificationToken = await VerificationService.sendEmailVerification(user);
        verification_link = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken.token}`;
      } catch (error) {
        logger.error('Failed to send verification email:', error);
      }
    }

    logger.info(`User created by admin: ${user.email} (created by user ID: ${req.user?.id})`);

    sendSuccess(
      res,
      {
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
        verification_link,
        temporary_password: password ? undefined : userPassword,
      },
      auto_verify
        ? 'User created and verified successfully'
        : 'User created successfully. Verification email sent.',
      201
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get all users (paginated)
 * Requires VIEW_USER permission
 */
export const getUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const search = req.query.search as string;
    const sort_by = (req.query.sort_by as string) || 'created_at';
    const order = ((req.query.order as string) || 'DESC').toUpperCase();

    const offset = (page - 1) * limit;

    const where: any = {};
    if (status) {
      where.status = status;
    }

    // Search by name or email
    if (search && search.trim()) {
      const { Op } = require('sequelize');
      where[Op.or] = [
        { first_name: { [Op.like]: `%${search.trim()}%` } },
        { last_name: { [Op.like]: `%${search.trim()}%` } },
        { email: { [Op.like]: `%${search.trim()}%` } },
      ];
    }

    // Validate sort field to prevent SQL injection
    const allowedSortFields = ['id', 'first_name', 'last_name', 'email', 'status', 'created_at', 'updated_at'];
    const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'created_at';
    const sortOrder = order === 'ASC' ? 'ASC' : 'DESC';

    const { rows: users, count } = await User.findAndCountAll({
      where,
      limit,
      offset,
      attributes: { exclude: ['password'] },
      order: [[sortField, sortOrder]],
    });

    sendSuccess(res, {
      users,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
        hasMore: page < Math.ceil(count / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user by ID
 * Requires VIEW_USER permission
 */
export const getUserById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = parseInt(Array.isArray(id) ? id[0] : id, 10);

    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password'] },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    sendSuccess(res, { user });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user
 * Requires UPDATE_USER permission
 */
export const updateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = parseInt(Array.isArray(id) ? id[0] : id, 10);
    const { first_name, last_name, phone, status } = req.body;

    const user = await User.findByPk(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Update allowed fields
    if (first_name !== undefined) user.first_name = first_name;
    if (last_name !== undefined) user.last_name = last_name;
    if (phone !== undefined) user.phone = phone;
    if (status !== undefined) user.status = status;

    await user.save();

    sendSuccess(res, {
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
        updated_at: user.updated_at,
      },
    }, 'User updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete user (soft delete by setting status to inactive)
 * Requires DELETE_USER permission
 */
export const deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = parseInt(Array.isArray(id) ? id[0] : id, 10);

    const user = await User.findByPk(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Soft delete by setting status to inactive
    user.status = 'inactive';
    await user.save();

    logger.info(`User soft deleted: ${user.email} (ID: ${user.id})`);

    sendSuccess(res, null, 'User deleted successfully');
  } catch (error) {
    next(error);
  }
};
