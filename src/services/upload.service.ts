import {
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  CopyObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import s3Client, { getBucketName, buildS3Key, buildPublicUrl } from '../config/aws';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import logger from '../utils/logger';

interface UploadResult {
  key: string;
  url: string;
  bucket: string;
  size: number;
  mimeType: string;
  originalName: string;
}

interface ImageMetadata {
  width?: number;
  height?: number;
  format?: string;
  size: number;
  mimeType: string;
}

export class UploadService {
  /**
   * Upload a file to S3
   */
  static async uploadFile(
    file: Express.Multer.File,
    folder: string = 'uploads'
  ): Promise<UploadResult> {
    try {
      const fileExtension = path.extname(file.originalname);
      const fileName = `${uuidv4()}${fileExtension}`;
      const key = buildS3Key(`${folder}/${fileName}`);

      const command = new PutObjectCommand({
        Bucket: getBucketName(),
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        // Make files publicly readable
        ACL: 'public-read',
        // Add metadata
        Metadata: {
          originalName: file.originalname,
          uploadedAt: new Date().toISOString(),
        },
      });

      await s3Client.send(command);

      const url = buildPublicUrl(key);

      logger.info(`✅ File uploaded to S3: ${key}`);

      return {
        key,
        url,
        bucket: getBucketName(),
        size: file.size,
        mimeType: file.mimetype,
        originalName: file.originalname,
      };
    } catch (error) {
      logger.error('❌ Error uploading file to S3:', error);
      throw new Error('Failed to upload file to S3');
    }
  }

  /**
   * Upload multiple files to S3
   */
  static async uploadMultipleFiles(
    files: Express.Multer.File[],
    folder: string = 'uploads'
  ): Promise<UploadResult[]> {
    try {
      const uploadPromises = files.map((file) => this.uploadFile(file, folder));
      return await Promise.all(uploadPromises);
    } catch (error) {
      logger.error('❌ Error uploading multiple files to S3:', error);
      throw new Error('Failed to upload files to S3');
    }
  }

  /**
   * Delete a file from S3
   */
  static async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: getBucketName(),
        Key: key,
      });

      await s3Client.send(command);
      logger.info(`✅ File deleted from S3: ${key}`);
    } catch (error) {
      logger.error('❌ Error deleting file from S3:', error);
      throw new Error('Failed to delete file from S3');
    }
  }

  /**
   * Delete multiple files from S3
   */
  static async deleteMultipleFiles(keys: string[]): Promise<void> {
    try {
      const deletePromises = keys.map((key) => this.deleteFile(key));
      await Promise.all(deletePromises);
      logger.info(`✅ Deleted ${keys.length} files from S3`);
    } catch (error) {
      logger.error('❌ Error deleting multiple files from S3:', error);
      throw new Error('Failed to delete files from S3');
    }
  }

  /**
   * Get a signed URL for private file access
   */
  static async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: getBucketName(),
        Key: key,
      });

      const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
      return signedUrl;
    } catch (error) {
      logger.error('❌ Error generating signed URL:', error);
      throw new Error('Failed to generate signed URL');
    }
  }

  /**
   * Check if a file exists in S3
   */
  static async fileExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: getBucketName(),
        Key: key,
      });

      await s3Client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get file metadata from S3
   */
  static async getFileMetadata(key: string): Promise<ImageMetadata | null> {
    try {
      const command = new HeadObjectCommand({
        Bucket: getBucketName(),
        Key: key,
      });

      const response = await s3Client.send(command);

      return {
        size: response.ContentLength || 0,
        mimeType: response.ContentType || 'application/octet-stream',
        format: response.ContentType?.split('/')[1],
      };
    } catch (error) {
      logger.error('❌ Error getting file metadata from S3:', error);
      return null;
    }
  }

  /**
   * Copy a file within S3
   */
  static async copyFile(sourceKey: string, destinationKey: string): Promise<string> {
    try {
      const command = new CopyObjectCommand({
        Bucket: getBucketName(),
        CopySource: `${getBucketName()}/${sourceKey}`,
        Key: destinationKey,
        ACL: 'public-read',
      });

      await s3Client.send(command);
      logger.info(`✅ File copied in S3: ${sourceKey} -> ${destinationKey}`);

      return buildPublicUrl(destinationKey);
    } catch (error) {
      logger.error('❌ Error copying file in S3:', error);
      throw new Error('Failed to copy file in S3');
    }
  }

  /**
   * Upload image for products
   */
  static async uploadProductImage(file: Express.Multer.File): Promise<UploadResult> {
    return this.uploadFile(file, 'products');
  }

  /**
   * Upload image for categories
   */
  static async uploadCategoryImage(file: Express.Multer.File): Promise<UploadResult> {
    return this.uploadFile(file, 'categories');
  }

  /**
   * Upload user avatar
   */
  static async uploadUserAvatar(file: Express.Multer.File): Promise<UploadResult> {
    return this.uploadFile(file, 'avatars');
  }

  /**
   * Extract S3 key from URL
   */
  static extractKeyFromUrl(url: string): string | null {
    try {
      // Handle S3 URLs
      const s3Pattern = /\.s3\.([a-z0-9-]+)\.amazonaws\.com\/(.+)/;
      const s3Match = url.match(s3Pattern);
      if (s3Match) {
        return s3Match[2];
      }

      // Handle CDN URLs (extract path after domain)
      const urlObj = new URL(url);
      return urlObj.pathname.substring(1); // Remove leading slash
    } catch (error) {
      logger.error('❌ Error extracting key from URL:', error);
      return null;
    }
  }

  /**
   * Validate file type
   */
  static isValidImageType(mimeType: string): boolean {
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
    ];
    return allowedTypes.includes(mimeType);
  }

  /**
   * Validate file size
   */
  static isValidFileSize(size: number, maxSizeMB: number = 10): boolean {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return size <= maxSizeBytes;
  }

  /**
   * Validate image file
   */
  static validateImageFile(file: Express.Multer.File, maxSizeMB: number = 10): void {
    if (!this.isValidImageType(file.mimetype)) {
      throw new Error(
        'Invalid file type. Allowed types: JPEG, PNG, GIF, WebP, SVG'
      );
    }

    if (!this.isValidFileSize(file.size, maxSizeMB)) {
      throw new Error(`File size exceeds maximum allowed size of ${maxSizeMB}MB`);
    }
  }
}

export default UploadService;
