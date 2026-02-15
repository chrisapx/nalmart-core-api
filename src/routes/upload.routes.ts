import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import {
  uploadSingleImage,
  uploadMultipleImages,
  uploadProductImages,
  uploadCategoryImage,
  uploadUserAvatar,
  deleteImage,
  deleteProductImage,
  getSignedUrl,
  getFileMetadata,
  makeFilePublic,
  healthCheck,
} from '../controllers/upload.controller';
import {
  uploadSingleImage as multerSingleImage,
  uploadMultipleImages as multerMultipleImages,
  uploadProductImages as multerProductImages,
  handleMulterError,
} from '../config/multer';

const router = Router();

/**
 * @route   GET /api/v1/upload/health
 * @desc    Health check for upload service
 * @access  Public
 */
router.get('/health', healthCheck);

/**
 * @route   POST /api/v1/upload/image
 * @desc    Upload a single image (general purpose)
 * @access  Private - Requires authentication
 */
router.post(
  '/image',
  authenticate,
  multerSingleImage,
  handleMulterError,
  uploadSingleImage
);

/**
 * @route   POST /api/v1/upload/images
 * @desc    Upload multiple images (general purpose)
 * @access  Private - Requires authentication
 */
router.post(
  '/images',
  authenticate,
  multerMultipleImages,
  handleMulterError,
  uploadMultipleImages
);

/**
 * @route   POST /api/v1/upload/product-images
 * @desc    Upload product images and create ProductImage records
 * @access  Private - Requires UPLOAD_PRODUCT_IMAGES permission
 */
router.post(
  '/product-images',
  // authenticate,  // Disabled for development
  // authorize('UPLOAD_PRODUCT_IMAGES'),
  multerProductImages,
  handleMulterError,
  uploadProductImages
);

/**
 * @route   POST /api/v1/upload/category-image
 * @desc    Upload category image
 * @access  Private - Requires UPLOAD_CATEGORY_IMAGES permission
 */
router.post(
  '/category-image',
  // authenticate,  // Disabled for development
  // authorize('UPLOAD_CATEGORY_IMAGES'),
  multerSingleImage,
  handleMulterError,
  uploadCategoryImage
);

/**
 * @route   POST /api/v1/upload/avatar
 * @desc    Upload user avatar
 * @access  Private - Requires authentication (own avatar)
 */
router.post(
  '/avatar',
  // authenticate,  // Disabled for development
  multerSingleImage,
  handleMulterError,
  uploadUserAvatar
);

/**
 * @route   DELETE /api/v1/upload/image
 * @desc    Delete an image from S3
 * @access  Private - Requires authentication
 */
router.delete('/image', /* authenticate, */ deleteImage);  // Disabled for development

/**
 * @route   DELETE /api/v1/upload/product-image/:id
 * @desc    Delete a product image (from S3 and database)
 * @access  Private - Requires DELETE_PRODUCT_IMAGES permission
 */
router.delete(
  '/product-image/:id',
  // authenticate,  // Disabled for development
  // authorize('DELETE_PRODUCT_IMAGES'),
  deleteProductImage
);

/**
 * @route   GET /api/v1/upload/signed-url
 * @desc    Get a signed URL for private file access
 * @access  Private - Requires authentication
 */
router.get('/signed-url', authenticate, getSignedUrl);

/**
 * @route   GET /api/v1/upload/metadata
 * @desc    Get file metadata from S3
 * @access  Private - Requires authentication
 */
router.get('/metadata', authenticate, getFileMetadata);

/**
 * @route   POST /api/v1/upload/make-public
 * @desc    Make an existing S3 file publicly readable
 * @access  Private - Requires authentication
 */
router.post('/make-public', authenticate, makeFilePublic);

export default router;
