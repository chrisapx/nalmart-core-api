import { Response, NextFunction } from 'express';
import { Op } from 'sequelize';
import { AuthRequest } from '../types/express';
import { successResponse } from '../utils/response';
import { NotFoundError, ForbiddenError, ValidationError } from '../utils/errors';
import StoreApplication from '../models/StoreApplication';
import Store from '../models/Store';
import StoreUser from '../models/StoreUser';
import User from '../models/User';
import logger from '../utils/logger';

// ── helpers ───────────────────────────────────────────────────────────────────

const parseId = (p: string | string[]) =>
  parseInt(Array.isArray(p) ? p[0] : p, 10);

// ── Public / authenticated endpoints ─────────────────────────────────────────

/**
 * POST /vendor/apply
 * Any authenticated user can submit a store application.
 */
export const applyForStore = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user as any;
    const {
      store_name,
      description,
      email,
      phone,
      business_type,
      website_url,
      logo_url,
      metadata,
    } = req.body;

    if (!store_name?.trim()) {
      throw new ValidationError('store_name is required');
    }

    // Prevent duplicate pending/under_review applications
    const existing = await StoreApplication.findOne({
      where: {
        applicant_id: user.id,
        status: { [Op.in]: ['pending', 'under_review'] },
      },
    });
    if (existing) {
      throw new ValidationError(
        'You already have an open application (pending or under review)'
      );
    }

    const application = await StoreApplication.create({
      applicant_id: user.id,
      store_name: store_name.trim(),
      description,
      email,
      phone,
      business_type,
      website_url,
      logo_url,
      metadata,
      status: 'pending',
    });

    logger.info(
      `Store application submitted: id=${application.id} by user=${user.id} (${store_name})`
    );
    successResponse(res, application, 'Application submitted', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /vendor/my-applications
 * Current user's own store applications.
 */
export const getMyApplications = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user as any;

    const applications = await StoreApplication.findAll({
      where: { applicant_id: user.id },
      order: [['created_at', 'DESC']],
      include: [
        {
          model: User,
          as: 'reviewer',
          attributes: ['id', 'first_name', 'last_name', 'email'],
          required: false,
        },
      ],
    });

    successResponse(res, applications, 'Applications retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /vendor/applications/:id
 * Get single application. Admin or the original applicant can access.
 */
export const getApplicationById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user          = req.user as any;
    const applicationId = parseId(req.params.id);

    const application = await StoreApplication.findByPk(applicationId, {
      include: [
        {
          model: User,
          as: 'applicant',
          attributes: ['id', 'first_name', 'last_name', 'email', 'avatar_url'],
        },
        {
          model: User,
          as: 'reviewer',
          attributes: ['id', 'first_name', 'last_name', 'email'],
          required: false,
        },
      ],
    });

    if (!application) throw new NotFoundError('Application not found');

    const isAdmin     = user?.is_super_admin || user?.role === 'admin';
    const isApplicant = application.applicant_id === user.id;
    if (!isAdmin && !isApplicant) {
      throw new ForbiddenError('Access denied');
    }

    successResponse(res, application, 'Application retrieved');
  } catch (error) {
    next(error);
  }
};

// ── Admin-only endpoints ──────────────────────────────────────────────────────

/**
 * GET /vendor/admin/applications
 * List all store applications with optional filters.
 * Query params: status, search, page, limit
 */
export const getApplications = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page   = req.query.page   ? parseInt(req.query.page   as string, 10) : 1;
    const limit  = req.query.limit  ? parseInt(req.query.limit  as string, 10) : 20;
    const offset = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (req.query.status) {
      where.status = req.query.status;
    }

    if (req.query.search) {
      const q = `%${req.query.search}%`;
      where[Op.or as any] = [
        { store_name: { [Op.like]: q } },
        { email:      { [Op.like]: q } },
      ];
    }

    const { count, rows } = await StoreApplication.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit,
      offset,
      include: [
        {
          model: User,
          as: 'applicant',
          attributes: ['id', 'first_name', 'last_name', 'email', 'avatar_url'],
        },
        {
          model: User,
          as: 'reviewer',
          attributes: ['id', 'first_name', 'last_name', 'email'],
          required: false,
        },
      ],
    });

    successResponse(res, rows, 'Applications retrieved', 200, {
      pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /vendor/admin/applications/:id/review
 * Admin reviews an application: approve / reject / under_review.
 *
 * Body: { action: 'approve'|'reject'|'under_review', review_notes?, store_settings? }
 *
 * On 'approve':
 *   1. Create a Store from application data (merged with optional store_settings)
 *   2. Create a StoreUser record (applicant = owner)
 *   3. Set application.store_id, status = 'approved'
 */
export const reviewApplication = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const admin         = req.user as any;
    const applicationId = parseId(req.params.id);
    const { action, review_notes, store_settings } = req.body;

    if (!['approve', 'reject', 'under_review'].includes(action)) {
      throw new ValidationError('action must be approve, reject, or under_review');
    }

    const application = await StoreApplication.findByPk(applicationId, {
      include: [
        {
          model: User,
          as: 'applicant',
          attributes: ['id', 'first_name', 'last_name', 'email'],
        },
      ],
    });

    if (!application) throw new NotFoundError('Application not found');

    if (application.status === 'approved') {
      throw new ValidationError('Application is already approved');
    }

    const now = new Date();

    if (action === 'approve') {
      // Create the store
      const store = await Store.create({
        name:         application.store_name,
        description:  application.description,
        email:        application.email,
        phone:        application.phone,
        website_url:  application.website_url,
        logo_url:     application.logo_url,
        is_active:    true,
        owner_id:     application.applicant_id,
        ...(store_settings ?? {}),
      });

      // Assign applicant as store owner
      await StoreUser.create({
        store_id:   store.id,
        user_id:    application.applicant_id,
        role:       'owner',
        invited_by: admin.id,
        is_active:  true,
      });

      // Update application
      await application.update({
        status:       'approved',
        reviewed_by:  admin.id,
        review_notes: review_notes ?? null,
        reviewed_at:  now,
        store_id:     store.id,
      });

      logger.info(
        `Application ${applicationId} APPROVED by admin ${admin.id} → store ${store.id}`
      );
      successResponse(res, { application, store }, 'Application approved and store created');
    } else {
      const statusMap: Record<string, string> = {
        reject:       'rejected',
        under_review: 'under_review',
      };

      await application.update({
        status:       statusMap[action],
        reviewed_by:  admin.id,
        review_notes: review_notes ?? null,
        reviewed_at:  now,
      });

      logger.info(
        `Application ${applicationId} set to ${statusMap[action]} by admin ${admin.id}`
      );
      successResponse(res, application, `Application ${statusMap[action]}`);
    }
  } catch (error) {
    next(error);
  }
};
