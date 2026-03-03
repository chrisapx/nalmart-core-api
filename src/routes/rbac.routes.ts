import { Router } from 'express';
import {
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  getRolePermissions,
  setRolePermissions,
  getPermissions,
  getUsers,
  assignRoleToUser,
  removeRoleFromUser,
} from '../controllers/rbac.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';

const router = Router();

// All RBAC routes require authentication (admin only in production)
router.use(authenticate);

// --- Roles ---
router.get('/roles', authorize(['VIEW_ROLE', 'MANAGE_ROLE']), getRoles);
router.get('/roles/:id', authorize(['VIEW_ROLE', 'MANAGE_ROLE']), getRoleById);
router.post('/roles', authorize(['CREATE_ROLE', 'MANAGE_ROLE']), createRole);
router.put('/roles/:id', authorize(['UPDATE_ROLE', 'MANAGE_ROLE']), updateRole);
router.delete('/roles/:id', authorize(['DELETE_ROLE', 'MANAGE_ROLE']), deleteRole);

// --- Role Permissions ---
router.get('/roles/:id/permissions', authorize(['VIEW_ROLE_PERMISSIONS', 'MANAGE_ROLE']), getRolePermissions);
router.put('/roles/:id/permissions', authorize(['ASSIGN_PERMISSION', 'MANAGE_ROLE']), setRolePermissions);

// --- Permissions list ---
router.get('/permissions', authorize(['VIEW_PERMISSION', 'MANAGE_ROLE']), getPermissions);

// --- Users ---
router.get('/users', authorize(['VIEW_USER', 'MANAGE_USER']), getUsers);
router.post('/users/:userId/roles', authorize(['ASSIGN_ROLE', 'MANAGE_ROLE']), assignRoleToUser);
router.delete('/users/:userId/roles/:roleId', authorize(['REMOVE_ROLE', 'MANAGE_ROLE']), removeRoleFromUser);

export default router;
