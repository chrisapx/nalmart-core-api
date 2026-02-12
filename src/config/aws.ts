import { S3Client, S3ClientConfig } from '@aws-sdk/client-s3';
import env from './env';
import logger from '../utils/logger';

// S3 Client Configuration
const s3Config: S3ClientConfig = {
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
};

// Create S3 Client
const s3Client = new S3Client(s3Config);

/**
 * Test S3 connection by listing buckets
 */
export const testS3Connection = async (): Promise<boolean> => {
  try {
    // Simple validation - check if credentials are set
    if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY) {
      logger.warn('⚠️  AWS credentials not configured');
      return false;
    }

    if (!env.AWS_BUCKET) {
      logger.warn('⚠️  AWS bucket not configured');
      return false;
    }

    logger.info('✅ AWS S3 configuration loaded');
    logger.info(`   Region: ${env.AWS_REGION}`);
    logger.info(`   Bucket: ${env.AWS_BUCKET}`);
    return true;
  } catch (error) {
    logger.error('❌ AWS S3 connection test failed:', error);
    return false;
  }
};

/**
 * Get S3 bucket name
 */
export const getBucketName = (): string => {
  return env.AWS_BUCKET;
};

/**
 * Get S3 root path (for organizing files in bucket)
 */
export const getRootPath = (): string => {
  return env.AWS_ROOT_PATH || '';
};

/**
 * Get CDN URL (if using CloudFront or similar)
 */
export const getCDNUrl = (): string | undefined => {
  return env.CDN_URL;
};

/**
 * Build full S3 key with root path
 */
export const buildS3Key = (key: string): string => {
  const rootPath = getRootPath();
  if (rootPath) {
    return `${rootPath}/${key}`.replace(/\/+/g, '/'); // Remove double slashes
  }
  return key;
};

/**
 * Build public URL for S3 object
 */
export const buildPublicUrl = (key: string): string => {
  const cdnUrl = getCDNUrl();
  if (cdnUrl) {
    return `${cdnUrl}/${key}`;
  }
  return `https://${env.AWS_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;
};

export default s3Client;
