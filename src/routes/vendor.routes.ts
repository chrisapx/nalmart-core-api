import { Router } from 'express';
import {
  getAllStores,
  getMyStores,
  getStoreById,
  createStore,
  updateStore,
  getStoreProducts,
  getStoreOrders,
  getStorePayments,
  getStoreDashboard,
  getStoreAuditLogs,
  addStoreUser,
  removeStoreUser,
} from '../controllers/vendor.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';

const router = Router();

// ── All authenticated users (vendors see only their stores) ──────────────────

/** List stores I belong to */
router.get('/stores', authenticate, getMyStores);

/** Store detail */
router.get('/stores/:storeId', authenticate, getStoreById);

/** Products in a store */
router.get('/stores/:storeId/products', authenticate, getStoreProducts);

/** Orders for a store */
router.get('/stores/:storeId/orders', authenticate, getStoreOrders);

/** Payments for a store */
router.get('/stores/:storeId/payments', authenticate, getStorePayments);

/** Dashboard stats */
router.get('/stores/:storeId/dashboard', authenticate, getStoreDashboard);

/** Audit trail for all products in a store */
router.get('/stores/:storeId/audit-logs', authenticate, getStoreAuditLogs);

// ── Admin-only store management ───────────────────────────────────────────────

/** List ALL stores (super-admin / admin) */
router.get('/admin/stores', authenticate, authorize(['admin']), getAllStores);

/** Create a new store */
router.post('/admin/stores', authenticate, authorize(['admin']), createStore);

/** Update a store */
router.patch('/admin/stores/:storeId', authenticate, authorize(['admin']), updateStore);

/** Assign a user to a store */
router.post(
  '/admin/stores/:storeId/users',
  authenticate,
  authorize(['admin']),
  addStoreUser
);

/** Remove a user from a store */
router.delete(
  '/admin/stores/:storeId/users/:userId',
  authenticate,
  authorize(['admin']),
  removeStoreUser
);

export default router;
