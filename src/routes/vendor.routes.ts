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
  getStoreMembers,
  addStoreStaff,
  updateStoreStaff,
  removeStoreStaff,
  getMyStorePermissions,
} from '../controllers/vendor.controller';
import {
  applyForStore,
  getMyApplications,
  getApplicationById,
  getApplications,
  reviewApplication,
} from '../controllers/storeApplication.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';

const router = Router();

// ── Store application (any authenticated user) ────────────────────────────────

/** Submit a store application */
router.post('/apply', authenticate, applyForStore);

/** My applications */
router.get('/my-applications', authenticate, getMyApplications);

/** Single application (applicant or admin) */
router.get('/applications/:id', authenticate, getApplicationById);

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

/** My effective permissions within a store */
router.get('/stores/:storeId/my-permissions', authenticate, getMyStorePermissions);

// ── Store member/staff management (owner, manager, or admin) ─────────────────

/** List all members of a store */
router.get('/stores/:storeId/members', authenticate, getStoreMembers);

/** Invite / add a staff member (manager or admin) */
router.post('/stores/:storeId/staff', authenticate, addStoreStaff);

/** Update a staff member's role or permissions (manager or admin) */
router.patch('/stores/:storeId/staff/:userId', authenticate, updateStoreStaff);

/** Remove a staff member (manager or admin) */
router.delete('/stores/:storeId/staff/:userId', authenticate, removeStoreStaff);

// ── Admin-only store management ───────────────────────────────────────────────

/** List ALL store applications */
router.get('/admin/applications', authenticate, authorize(['admin']), getApplications);

/** Review (approve / reject / under_review) an application */
router.patch(
  '/admin/applications/:id/review',
  authenticate,
  authorize(['admin']),
  reviewApplication
);

/** List ALL stores (super-admin / admin) */
router.get('/admin/stores', authenticate, authorize(['admin']), getAllStores);

/** Create a new store */
router.post('/admin/stores', authenticate, authorize(['admin']), createStore);

/** Update a store */
router.patch('/admin/stores/:storeId', authenticate, authorize(['admin']), updateStore);

/** Assign a user to a store (admin-level, any role) */
router.post(
  '/admin/stores/:storeId/users',
  authenticate,
  authorize(['admin']),
  addStoreUser
);

/** Remove a user from a store (admin-level) */
router.delete(
  '/admin/stores/:storeId/users/:userId',
  authenticate,
  authorize(['admin']),
  removeStoreUser
);

export default router;
