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

const router = Router();

// All RBAC routes require authentication (admin only in production)
router.use(authenticate);

// --- Roles ---
router.get('/roles', getRoles);
router.get('/roles/:id', getRoleById);
router.post('/roles', createRole);
router.put('/roles/:id', updateRole);
router.delete('/roles/:id', deleteRole);

// --- Role Permissions ---
router.get('/roles/:id/permissions', getRolePermissions);
router.put('/roles/:id/permissions', setRolePermissions);

// --- Permissions list ---
router.get('/permissions', getPermissions);

// --- Users ---
router.get('/users', getUsers);
router.post('/users/:userId/roles', assignRoleToUser);
router.delete('/users/:userId/roles/:roleId', removeRoleFromUser);

export default router;
