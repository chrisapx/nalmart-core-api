import { Response, NextFunction } from 'express';
import { Op } from 'sequelize';
import { AuthRequest } from '../types/express';
import { successResponse } from '../utils/response';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import Store from '../models/Store';
import StoreUser from '../models/StoreUser';
import Product from '../models/Product';
import ProductImage from '../models/ProductImage';
import ProductAuditLog from '../models/ProductAuditLog';
import Order from '../models/Order';
import OrderItem from '../models/OrderItem';
import Payment from '../models/Payment';
import User from '../models/User';
import Category from '../models/Category';
import logger from '../utils/logger';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Parse a numeric route param */
const parseId = (param: string | string[]): number =>
  parseInt(Array.isArray(param) ? param[0] : param, 10);

/**
 * Resolve which stores the current user may access.
 * Super-admins see ALL stores.
 * Vendors see only stores they are a member of.
 */
async function resolveAccessibleStoreIds(
  user: any,
  requestedStoreId?: number
): Promise<number[]> {
  if (user?.is_super_admin) {
    if (requestedStoreId !== undefined) return [requestedStoreId];
    const all = await Store.findAll({ attributes: ['id'], where: { is_active: true } });
    return all.map((s) => s.id);
  }

  const memberships = await StoreUser.findAll({
    where: { user_id: user.id, is_active: true },
    attributes: ['store_id'],
  });
  const ids = memberships.map((m) => m.store_id);

  if (requestedStoreId !== undefined && !ids.includes(requestedStoreId)) {
    throw new ForbiddenError('You do not have access to this store');
  }
  return requestedStoreId !== undefined ? [requestedStoreId] : ids;
}

// ── Vendor endpoints ─────────────────────────────────────────────────────────

/**
 * GET /vendor/stores
 * List all stores the current user can access (vendors see only their stores).
 */
export const getMyStores = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user as any;
    const storeIds = await resolveAccessibleStoreIds(user);

    if (storeIds.length === 0) {
      successResponse(res, [], 'No stores found');
      return;
    }

    const stores = await Store.findAll({
      where: { id: { [Op.in]: storeIds } },
      include: [
        {
          model: User,
          as: 'users',
          attributes: ['id', 'first_name', 'last_name', 'email', 'avatar_url'],
          through: { attributes: ['role', 'is_active'] },
        },
      ],
    });

    successResponse(res, stores, 'Stores retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /vendor/stores/:storeId
 * Get a single store (with member list).
 */
export const getStoreById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const storeId = parseId(req.params.storeId);
    const user    = req.user as any;
    await resolveAccessibleStoreIds(user, storeId); // access check

    const store = await Store.findByPk(storeId, {
      include: [
        {
          model: User,
          as: 'users',
          attributes: ['id', 'first_name', 'last_name', 'email', 'avatar_url'],
          through: { attributes: ['role', 'is_active'] },
        },
      ],
    });

    if (!store) throw new NotFoundError('Store not found');
    successResponse(res, store, 'Store retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * POST /vendor/stores  (admin / super-admin only)
 * Create a new store.
 */
export const createStore = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const store = await Store.create(req.body);
    logger.info(`Store created: ${store.id} — ${store.name}`);
    successResponse(res, store, 'Store created', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /vendor/stores/:storeId  (admin / owner)
 * Update store details.
 */
export const updateStore = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const storeId = parseId(req.params.storeId);
    const user    = req.user as any;
    await resolveAccessibleStoreIds(user, storeId);

    const store = await Store.findByPk(storeId);
    if (!store) throw new NotFoundError('Store not found');
    await store.update(req.body);
    successResponse(res, store, 'Store updated');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /vendor/stores/:storeId/products
 * Products that belong to a store.
 */
export const getStoreProducts = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const storeId = parseId(req.params.storeId);
    const user    = req.user as any;
    await resolveAccessibleStoreIds(user, storeId);

    const page   = req.query.page  ? parseInt(req.query.page  as string, 10) : 1;
    const limit  = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const offset = (page - 1) * limit;

    const { count, rows } = await Product.findAndCountAll({
      where: { store_id: storeId },
      limit,
      offset,
      order: [['created_at', 'DESC']],
      paranoid: false,
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'slug'],
        },
        {
          model: ProductImage,
          as: 'images',
          attributes: ['id', 'url', 'is_primary', 'image_type'],
          order: [['sort_order', 'ASC']],
        },
        {
          model: User,
          as: 'createdByUser',
          attributes: ['id', 'first_name', 'last_name', 'email'],
        },
        {
          model: User,
          as: 'updatedByUser',
          attributes: ['id', 'first_name', 'last_name', 'email'],
        },
      ],
    });

    successResponse(res, rows, 'Store products retrieved', 200, {
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /vendor/stores/:storeId/orders
 * Orders that contain at least one product from this store.
 */
export const getStoreOrders = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const storeId = parseId(req.params.storeId);
    const user    = req.user as any;
    await resolveAccessibleStoreIds(user, storeId);

    const page   = req.query.page  ? parseInt(req.query.page  as string, 10) : 1;
    const limit  = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const offset = (page - 1) * limit;

    // Find product IDs that belong to this store
    const storeProducts = await Product.findAll({
      where: { store_id: storeId },
      attributes: ['id'],
      paranoid: false,
    });
    const productIds = storeProducts.map((p) => p.id);

    if (productIds.length === 0) {
      successResponse(res, [], 'No orders found', 200, {
        pagination: { page, limit, total: 0, totalPages: 0 },
      });
      return;
    }

    // Find order IDs that contain these products
    const orderItems = await OrderItem.findAll({
      where: { product_id: { [Op.in]: productIds } },
      attributes: ['order_id'],
      group: ['order_id'],
    });
    const orderIds = orderItems.map((oi: any) => oi.order_id);

    if (orderIds.length === 0) {
      successResponse(res, [], 'No orders found', 200, {
        pagination: { page, limit, total: 0, totalPages: 0 },
      });
      return;
    }

    const { count, rows } = await Order.findAndCountAll({
      where: { id: { [Op.in]: orderIds } },
      limit,
      offset,
      order: [['created_at', 'DESC']],
      include: [
        {
          model: OrderItem,
          as: 'items',
          where: { product_id: { [Op.in]: productIds } },
          required: false,
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'first_name', 'last_name', 'email'],
        },
      ],
    });

    successResponse(res, rows, 'Store orders retrieved', 200, {
      pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /vendor/stores/:storeId/payments
 * Payments for orders containing this store's products.
 */
export const getStorePayments = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const storeId = parseId(req.params.storeId);
    const user    = req.user as any;
    await resolveAccessibleStoreIds(user, storeId);

    const page   = req.query.page  ? parseInt(req.query.page  as string, 10) : 1;
    const limit  = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const offset = (page - 1) * limit;

    const storeProducts = await Product.findAll({
      where: { store_id: storeId },
      attributes: ['id'],
      paranoid: false,
    });
    const productIds = storeProducts.map((p) => p.id);

    if (productIds.length === 0) {
      successResponse(res, [], 'No payments found', 200, {
        pagination: { page, limit, total: 0, totalPages: 0 },
      });
      return;
    }

    const orderItems = await OrderItem.findAll({
      where: { product_id: { [Op.in]: productIds } },
      attributes: ['order_id'],
      group: ['order_id'],
    });
    const orderIds = orderItems.map((oi: any) => oi.order_id);

    if (orderIds.length === 0) {
      successResponse(res, [], 'No payments found', 200, {
        pagination: { page, limit, total: 0, totalPages: 0 },
      });
      return;
    }

    const { count, rows } = await Payment.findAndCountAll({
      where: { order_id: { [Op.in]: orderIds } },
      limit,
      offset,
      order: [['created_at', 'DESC']],
    });

    successResponse(res, rows, 'Store payments retrieved', 200, {
      pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /vendor/stores/:storeId/dashboard
 * Aggregate stats for a vendor store.
 */
export const getStoreDashboard = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const storeId = parseId(req.params.storeId);
    const user    = req.user as any;
    await resolveAccessibleStoreIds(user, storeId);

    const store = await Store.findByPk(storeId);
    if (!store) throw new NotFoundError('Store not found');

    const [totalProducts, storeProducts] = await Promise.all([
      Product.count({ where: { store_id: storeId } }),
      Product.findAll({ where: { store_id: storeId }, attributes: ['id'], paranoid: false }),
    ]);

    const productIds = storeProducts.map((p) => p.id);

    if (productIds.length === 0) {
      successResponse(res, {
        store,
        totalProducts,
        totalOrders: 0,
        totalRevenue: 0,
        pendingOrders: 0,
        recentOrders: [],
      }, 'Dashboard retrieved');
      return;
    }

    const orderItems = await OrderItem.findAll({
      where: { product_id: { [Op.in]: productIds } },
      attributes: ['order_id'],
      group: ['order_id'],
    });
    const orderIds = orderItems.map((oi: any) => oi.order_id);

    const [totalOrders, pendingOrders, revenueResult, recentOrders] = await Promise.all([
      Order.count({ where: { id: { [Op.in]: orderIds } } }),
      Order.count({ where: { id: { [Op.in]: orderIds }, status: 'pending' } }),
      Payment.sum('amount', { where: { order_id: { [Op.in]: orderIds }, status: 'completed' } }),
      Order.findAll({
        where: { id: { [Op.in]: orderIds } },
        order: [['created_at', 'DESC']],
        limit: 5,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'first_name', 'last_name', 'email'],
          },
        ],
      }),
    ]);

    successResponse(res, {
      store,
      totalProducts,
      totalOrders,
      totalRevenue: revenueResult ?? 0,
      pendingOrders,
      recentOrders,
    }, 'Dashboard retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /vendor/stores/:storeId/audit-logs
 * Product audit trail for all products in a store.
 */
export const getStoreAuditLogs = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const storeId = parseId(req.params.storeId);
    const user    = req.user as any;
    await resolveAccessibleStoreIds(user, storeId);

    const limit  = req.query.limit  ? parseInt(req.query.limit  as string, 10) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

    const storeProducts = await Product.findAll({
      where: { store_id: storeId },
      attributes: ['id'],
      paranoid: false,
    });
    const productIds = storeProducts.map((p) => p.id);

    if (productIds.length === 0) {
      successResponse(res, [], 'No audit logs found', 200, { total: 0 });
      return;
    }

    const { count, rows } = await ProductAuditLog.findAndCountAll({
      where: { product_id: { [Op.in]: productIds } },
      order: [['created_at', 'DESC']],
      limit,
      offset,
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'sku'],
          paranoid: false,
        },
      ],
    });

    successResponse(res, rows, 'Audit logs retrieved', 200, { total: count });
  } catch (error) {
    next(error);
  }
};

// ── Store membership management (admin only) ─────────────────────────────────

/**
 * POST /vendor/stores/:storeId/users
 * Assign a user as a vendor/manager/owner of a store.
 */
export const addStoreUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const storeId    = parseId(req.params.storeId);
    const { user_id, role = 'vendor' } = req.body;

    const store = await Store.findByPk(storeId);
    if (!store) throw new NotFoundError('Store not found');

    const targetUser = await User.findByPk(user_id);
    if (!targetUser) throw new NotFoundError('User not found');

    const [record, created] = await StoreUser.findOrCreate({
      where: { store_id: storeId, user_id },
      defaults: { store_id: storeId, user_id, role, is_active: true },
    });

    if (!created) {
      await record.update({ role, is_active: true });
    }

    logger.info(`User ${user_id} assigned to store ${storeId} as ${role}`);
    successResponse(res, record, created ? 'User added to store' : 'Store membership updated', created ? 201 : 200);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /vendor/stores/:storeId/users/:userId
 * Remove a user from a store.
 */
export const removeStoreUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const storeId = parseId(req.params.storeId);
    const userId  = parseId(req.params.userId);

    const record = await StoreUser.findOne({ where: { store_id: storeId, user_id: userId } });
    if (!record) throw new NotFoundError('Membership not found');

    await record.destroy();
    logger.info(`User ${userId} removed from store ${storeId}`);
    successResponse(res, null, 'User removed from store');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /vendor/stores/all  (super admin — list every store with members)
 */
export const getAllStores = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stores = await Store.findAll({
      order: [['created_at', 'DESC']],
    });
    successResponse(res, stores, 'All stores retrieved');
  } catch (error) {
    next(error);
  }
};
