import { Router } from 'express';
import multer from 'multer';
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
  deleteProductImage,
  deleteProductVideo,
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
import { handleMulterError } from '../config/multer';

// Multer config for product media uploads
const storage = multer.memoryStorage();
const productUpload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB total
});

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
  // authenticate,  // Disabled for development
  // authorize('CREATE_PRODUCT'),
  productUpload.fields([
    { name: 'image_files', maxCount: 20 },
    { name: 'video_files', maxCount: 10 },
  ]),
  createProduct
);

router.put(
  '/:id',
  // authenticate,  // Disabled for development
  // authorize('UPDATE_PRODUCT'),
  validateParams(productIdParamSchema),
  productUpload.fields([
    { name: 'image_files', maxCount: 20 },
    { name: 'video_files', maxCount: 10 },
  ]),
  updateProduct
);

router.delete(
  '/:id',
  authenticate,  // 🔒 ACTIVE RBAC TEST ENDPOINT
  authorize('DELETE_PRODUCT'),
  validateParams(productIdParamSchema),
  deleteProduct
);

router.patch(
  '/:id/stock',
  // authenticate,  // Disabled for development
  // authorize('UPDATE_PRODUCT_STOCK'),
  validateParams(productIdParamSchema),
  validateBody(updateStockSchema),
  updateStock
);

router.patch(
  '/:id/publish',
  // authenticate,  // Disabled for development
  // authorize('UPDATE_PRODUCT'),
  validateParams(productIdParamSchema),
  validateBody(togglePublishSchema),
  togglePublishProduct
);

router.patch(
  '/:id/featured',
  // authenticate,  // Disabled for development
  // authorize('UPDATE_PRODUCT'),
  validateParams(productIdParamSchema),
  validateBody(toggleFeaturedSchema),
  toggleFeaturedProduct
);

router.post(
  '/:id/duplicate',
  // authenticate,  // Disabled for development
  // authorize('CREATE_PRODUCT'),
  validateParams(productIdParamSchema),
  duplicateProduct
);

/**
 * Media deletion endpoints
 */
router.delete(
  '/media/image/:imageId',
  // authenticate,  // Disabled for development
  // authorize('UPDATE_PRODUCT'),
  deleteProductImage
);

router.delete(
  '/media/video/:videoId',
  // authenticate,  // Disabled for development
  // authorize('UPDATE_PRODUCT'),
  deleteProductVideo
);

export default router;
