import { Router } from 'express';
import {
  createProduct,
  getProducts,
  getProductById,
  getProductBySlug,
  updateProduct,
  deleteProduct,
  updateStock,
  getFeaturedProducts,
  getRelatedProducts,
  getLowStockProducts,
  togglePublishProduct,
  toggleFeaturedProduct,
  duplicateProduct,
  getUniqueBrands,
} from '../controllers/product.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import {
  validateBody,
  validateQuery,
  validateParams,
} from '../middleware/validation';
import {
  createProductSchema,
  updateProductSchema,
  getProductsQuerySchema,
  productIdParamSchema,
  updateStockSchema,
  togglePublishSchema,
  toggleFeaturedSchema,
} from '../validators/product.validator';

const router = Router();

router.get(
  '/',
  getProducts
);

router.get(
  '/featured',
  getFeaturedProducts
);

router.get(
  '/brands',
  getUniqueBrands
);

router.get(
  '/low-stock',
  authenticate,
  authorize('VIEW_PRODUCT_ANALYTICS'),
  getLowStockProducts
);

router.get(
  '/:id/related',
  validateParams(productIdParamSchema),
  getRelatedProducts
);

router.get(
  '/slug/:slug',
  getProductBySlug
);

router.get(
  '/:id',
  validateParams(productIdParamSchema),
  getProductById
);

router.post(
  '/',
  authenticate,
  authorize('CREATE_PRODUCT'),
  validateBody(createProductSchema),
  createProduct
);

router.put(
  '/:id',
  authenticate,
  authorize('UPDATE_PRODUCT'),
  validateParams(productIdParamSchema),
  validateBody(updateProductSchema),
  updateProduct
);

router.delete(
  '/:id',
  authenticate,
  authorize('DELETE_PRODUCT'),
  validateParams(productIdParamSchema),
  deleteProduct
);

router.patch(
  '/:id/stock',
  authenticate,
  authorize('UPDATE_PRODUCT_STOCK'),
  validateParams(productIdParamSchema),
  validateBody(updateStockSchema),
  updateStock
);

router.patch(
  '/:id/publish',
  authenticate,
  authorize('UPDATE_PRODUCT'),
  validateParams(productIdParamSchema),
  validateBody(togglePublishSchema),
  togglePublishProduct
);

router.patch(
  '/:id/featured',
  authenticate,
  authorize('UPDATE_PRODUCT'),
  validateParams(productIdParamSchema),
  validateBody(toggleFeaturedSchema),
  toggleFeaturedProduct
);

router.post(
  '/:id/duplicate',
  authenticate,
  authorize('CREATE_PRODUCT'),
  validateParams(productIdParamSchema),
  duplicateProduct
);

export default router;
