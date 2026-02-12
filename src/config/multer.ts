import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';
import path from 'path';

/**
 * Multer configuration for file uploads
 * Using memory storage to upload directly to S3
 */

// File size limits (in bytes)
export const FILE_SIZE_LIMITS = {
  IMAGE: 10 * 1024 * 1024, // 10MB
  DOCUMENT: 20 * 1024 * 1024, // 20MB
  VIDEO: 100 * 1024 * 1024, // 100MB
};

// Allowed MIME types
export const ALLOWED_MIME_TYPES = {
  IMAGE: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
  ],
  DOCUMENT: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  VIDEO: ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo'],
};

/**
 * Memory storage - files are stored in memory as Buffer objects
 * This is ideal for uploading directly to S3
 */
const storage = multer.memoryStorage();

/**
 * File filter for images only
 */
const imageFileFilter = (
  req: Request,
  file: Express.Multer.File,
  callback: FileFilterCallback
): void => {
  if (ALLOWED_MIME_TYPES.IMAGE.includes(file.mimetype)) {
    callback(null, true);
  } else {
    callback(
      new Error(
        'Invalid file type. Only JPEG, PNG, GIF, WebP, and SVG images are allowed.'
      )
    );
  }
};

/**
 * File filter for documents only
 */
const documentFileFilter = (
  req: Request,
  file: Express.Multer.File,
  callback: FileFilterCallback
): void => {
  if (ALLOWED_MIME_TYPES.DOCUMENT.includes(file.mimetype)) {
    callback(null, true);
  } else {
    callback(
      new Error('Invalid file type. Only PDF and Office documents are allowed.')
    );
  }
};

/**
 * File filter for videos only
 */
const videoFileFilter = (
  req: Request,
  file: Express.Multer.File,
  callback: FileFilterCallback
): void => {
  if (ALLOWED_MIME_TYPES.VIDEO.includes(file.mimetype)) {
    callback(null, true);
  } else {
    callback(new Error('Invalid file type. Only MP4, MPEG, MOV, and AVI videos are allowed.'));
  }
};

/**
 * Generic file filter - allows any file type
 */
const anyFileFilter = (
  req: Request,
  file: Express.Multer.File,
  callback: FileFilterCallback
): void => {
  callback(null, true);
};

/**
 * Multer upload configurations
 */

// Single image upload (max 10MB)
export const uploadSingleImage = multer({
  storage,
  limits: { fileSize: FILE_SIZE_LIMITS.IMAGE },
  fileFilter: imageFileFilter,
}).single('image');

// Multiple images upload (max 10 files, 10MB each)
export const uploadMultipleImages = multer({
  storage,
  limits: {
    fileSize: FILE_SIZE_LIMITS.IMAGE,
    files: 10,
  },
  fileFilter: imageFileFilter,
}).array('images', 10);

// Product images (max 10 files)
export const uploadProductImages = multer({
  storage,
  limits: {
    fileSize: FILE_SIZE_LIMITS.IMAGE,
    files: 10,
  },
  fileFilter: imageFileFilter,
}).array('images', 10);

// Single document upload (max 20MB)
export const uploadSingleDocument = multer({
  storage,
  limits: { fileSize: FILE_SIZE_LIMITS.DOCUMENT },
  fileFilter: documentFileFilter,
}).single('document');

// Multiple documents upload (max 5 files, 20MB each)
export const uploadMultipleDocuments = multer({
  storage,
  limits: {
    fileSize: FILE_SIZE_LIMITS.DOCUMENT,
    files: 5,
  },
  fileFilter: documentFileFilter,
}).array('documents', 5);

// Single video upload (max 100MB)
export const uploadSingleVideo = multer({
  storage,
  limits: { fileSize: FILE_SIZE_LIMITS.VIDEO },
  fileFilter: videoFileFilter,
}).single('video');

// Mixed fields upload (for forms with multiple file inputs)
export const uploadMixedFields = multer({
  storage,
  limits: { fileSize: FILE_SIZE_LIMITS.IMAGE },
  fileFilter: imageFileFilter,
}).fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'images', maxCount: 10 },
  { name: 'documents', maxCount: 5 },
]);

// Any file upload (no restrictions on type)
export const uploadAnyFile = multer({
  storage,
  limits: { fileSize: FILE_SIZE_LIMITS.IMAGE },
  fileFilter: anyFileFilter,
}).any();

/**
 * Helper function to extract file extension
 */
export const getFileExtension = (filename: string): string => {
  return path.extname(filename).toLowerCase();
};

/**
 * Helper function to generate unique filename
 */
export const generateUniqueFilename = (originalName: string): string => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = getFileExtension(originalName);
  return `${timestamp}-${randomString}${extension}`;
};

/**
 * Multer error handler middleware
 */
export const handleMulterError = (error: any, req: Request, res: any, next: any): void => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size exceeds the allowed limit',
        error: error.message,
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files uploaded',
        error: error.message,
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field',
        error: error.message,
      });
    }
    return res.status(400).json({
      success: false,
      message: 'File upload error',
      error: error.message,
    });
  }

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.message || 'File upload error',
    });
  }

  next();
};

export default {
  uploadSingleImage,
  uploadMultipleImages,
  uploadProductImages,
  uploadSingleDocument,
  uploadMultipleDocuments,
  uploadSingleVideo,
  uploadMixedFields,
  uploadAnyFile,
  handleMulterError,
};
