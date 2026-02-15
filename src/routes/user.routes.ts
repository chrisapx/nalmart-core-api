import { Router } from 'express';
import {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
} from '../controllers/user.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';

const router = Router();

/**
 * All user management routes require authentication
 * Most are protected by RBAC (commented out by default)
 */

// Create user (admin only)
router.post(
  '/',
  authenticate,
  authorize('CREATE_USER'),  // 🔒 ACTIVE RBAC
  createUser
);

// Get all users
router.get(
  '/',
  authenticate,
  // authorize('VIEW_USER'),
  getUsers
);

// Get user by ID
router.get(
  '/:id',
  authenticate,
  // authorize('VIEW_USER'),
  getUserById
);

// Update user
router.put(
  '/:id',
  authenticate,
  // authorize('UPDATE_USER'),
  updateUser
);

// Delete user (soft delete)
router.delete(
  '/:id',
  authenticate,
  // authorize('DELETE_USER'),
  deleteUser
);

export default router;
