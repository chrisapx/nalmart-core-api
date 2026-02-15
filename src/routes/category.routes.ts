import { Router } from 'express';
import {
  createCategory,
  getCategories,
  getCategoryById,
  getCategoryBySlug,
  updateCategory,
  deleteCategory,
  getTopLevelCategories,
  getCategoryTree,
  getChildCategories,
  getCategoryPath,
  reorderCategories,
} from '../controllers/category.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { validateBody } from '../middleware/validation';
import {
  createCategorySchema,
  updateCategorySchema,
} from '../validators/category.validator';

const router = Router();

// Public endpoints
router.get('/', getCategories);

router.get('/top-level', getTopLevelCategories);

router.get('/tree', getCategoryTree);

router.get('/slug/:slug', getCategoryBySlug);

router.get('/:id', getCategoryById);

router.get('/:id/children', getChildCategories);

router.get('/:id/path', getCategoryPath);

// Protected endpoints
router.post(
  '/',
  validateBody(createCategorySchema),
  createCategory
);

router.put(
  '/:id',
  validateBody(updateCategorySchema),
  updateCategory
);

router.delete(
  '/:id',
  authenticate,  // 🔒 ACTIVE RBAC TEST ENDPOINT
  authorize('DELETE_CATEGORY'),
  deleteCategory
);

router.post(
  '/reorder',
  reorderCategories
);

export default router;
