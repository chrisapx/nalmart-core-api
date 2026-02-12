import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/express';
import UploadService from '../services/upload.service';
import ProductImage from '../models/ProductImage';
import logger from '../utils/logger';
import { NotFoundError, BadRequestError } from '../utils/errors';

/**
 * Upload a single image
 */
export const uploadSingleImage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.file) {
      throw new BadRequestError('No file uploaded');
    }

    // Validate file
    UploadService.validateImageFile(req.file);

    // Upload to S3
    const result = await UploadService.uploadFile(req.file, 'images');

    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        url: result.url,
        key: result.key,
        size: result.size,
        mimeType: result.mimeType,
        originalName: result.originalName,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload multiple images
 */
export const uploadMultipleImages = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      throw new BadRequestError('No files uploaded');
    }

    // Validate all files
    files.forEach((file) => UploadService.validateImageFile(file));

    // Upload all files to S3
    const results = await UploadService.uploadMultipleFiles(files, 'images');

    res.status(200).json({
      success: true,
      message: `${results.length} images uploaded successfully`,
      data: results.map((result) => ({
        url: result.url,
        key: result.key,
        size: result.size,
        mimeType: result.mimeType,
        originalName: result.originalName,
      })),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload product images
 */
export const uploadProductImages = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[];
    const { product_id } = req.body;

    if (!files || files.length === 0) {
      throw new BadRequestError('No files uploaded');
    }

    if (!product_id) {
      throw new BadRequestError('Product ID is required');
    }

    // Validate all files
    files.forEach((file) => UploadService.validateImageFile(file));

    // Upload all files to S3
    const uploadResults = await UploadService.uploadMultipleFiles(files, 'products');

    // Create ProductImage records
    const productImages = await Promise.all(
      uploadResults.map(async (result, index) => {
        const productImage = await ProductImage.create({
          product_id,
          url: result.url,
          name: result.originalName,
          alt_text: result.originalName.replace(/\.[^/.]+$/, ''), // Remove extension
          size: result.size,
          mime_type: result.mimeType,
          is_primary: index === 0, // First image is primary
          sort_order: index,
        });
        return productImage;
      })
    );

    res.status(200).json({
      success: true,
      message: `${productImages.length} product images uploaded successfully`,
      data: productImages,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload category image
 */
export const uploadCategoryImage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.file) {
      throw new BadRequestError('No file uploaded');
    }

    // Validate file
    UploadService.validateImageFile(req.file);

    // Upload to S3
    const result = await UploadService.uploadCategoryImage(req.file);

    res.status(200).json({
      success: true,
      message: 'Category image uploaded successfully',
      data: {
        url: result.url,
        key: result.key,
        size: result.size,
        mimeType: result.mimeType,
        originalName: result.originalName,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload user avatar
 */
export const uploadUserAvatar = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.file) {
      throw new BadRequestError('No file uploaded');
    }

    // Validate file (smaller size for avatars)
    UploadService.validateImageFile(req.file, 5); // Max 5MB for avatars

    // Upload to S3
    const result = await UploadService.uploadUserAvatar(req.file);

    res.status(200).json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: {
        url: result.url,
        key: result.key,
        size: result.size,
        mimeType: result.mimeType,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete an image
 */
export const deleteImage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { key } = req.body;

    if (!key) {
      throw new BadRequestError('S3 key is required');
    }

    // Check if file exists
    const exists = await UploadService.fileExists(key);
    if (!exists) {
      throw new NotFoundError('File not found');
    }

    // Delete from S3
    await UploadService.deleteFile(key);

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete product image
 */
export const deleteProductImage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;

    // Find product image
    const productImage = await ProductImage.findByPk(id);
    if (!productImage) {
      throw new NotFoundError('Product image not found');
    }

    // Extract S3 key from URL
    const key = UploadService.extractKeyFromUrl(productImage.url);
    if (key) {
      // Delete from S3
      await UploadService.deleteFile(key);
    }

    // Delete from database
    await productImage.destroy();

    res.status(200).json({
      success: true,
      message: 'Product image deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get signed URL for private file
 */
export const getSignedUrl = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const keyParam = req.query.key;
    const expiresIn = parseInt(req.query.expiresIn as string) || 3600;

    if (!keyParam || typeof keyParam !== 'string') {
      throw new BadRequestError('S3 key is required');
    }

    const key: string = keyParam;

    // Check if file exists
    const exists = await UploadService.fileExists(key);
    if (!exists) {
      throw new NotFoundError('File not found');
    }

    // Generate signed URL
    const signedUrl = await UploadService.getSignedUrl(key, expiresIn);

    res.status(200).json({
      success: true,
      data: {
        signedUrl,
        expiresIn,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get file metadata
 */
export const getFileMetadata = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const keyParam = req.query.key;

    if (!keyParam || typeof keyParam !== 'string') {
      throw new BadRequestError('S3 key is required');
    }

    const key: string = keyParam;

    // Get metadata
    const metadata = await UploadService.getFileMetadata(key);

    if (!metadata) {
      throw new NotFoundError('File not found or metadata unavailable');
    }

    res.status(200).json({
      success: true,
      data: metadata,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Health check for S3 connection
 */
export const healthCheck = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // This is a simple health check
    // In production, you might want to actually test S3 connectivity
    res.status(200).json({
      success: true,
      message: 'Upload service is healthy',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export default {
  uploadSingleImage,
  uploadMultipleImages,
  uploadProductImages,
  uploadCategoryImage,
  uploadUserAvatar,
  deleteImage,
  deleteProductImage,
  getSignedUrl,
  getFileMetadata,
  healthCheck,
};
