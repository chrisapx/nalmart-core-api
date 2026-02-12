import Redis from 'ioredis';
import env from './env';
import logger from '../utils/logger';

const redis = new Redis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
});

redis.on('connect', () => {
  logger.info('✅ Redis connection established successfully');
});

redis.on('error', (error) => {
  logger.error('❌ Redis connection error:', error);
});

redis.on('close', () => {
  logger.info('Redis connection closed');
});

export const connectRedis = async (): Promise<void> => {
  try {
    await redis.ping();
    logger.info('✅ Redis PING successful');
  } catch (error) {
    logger.error('❌ Unable to connect to Redis:', error);
    process.exit(1);
  }
};

export const disconnectRedis = async (): Promise<void> => {
  try {
    await redis.quit();
    logger.info('Redis connection closed gracefully');
  } catch (error) {
    logger.error('Error closing Redis connection:', error);
  }
};

// Token blacklist helpers
export const blacklistToken = async (token: string, expiresIn: number): Promise<void> => {
  await redis.setex(`blacklist:${token}`, expiresIn, '1');
};

export const isTokenBlacklisted = async (token: string): Promise<boolean> => {
  const result = await redis.get(`blacklist:${token}`);
  return result !== null;
};

// Cache helpers
export const setCache = async (key: string, value: string, expiresIn?: number): Promise<void> => {
  if (expiresIn) {
    await redis.setex(key, expiresIn, value);
  } else {
    await redis.set(key, value);
  }
};

export const getCache = async (key: string): Promise<string | null> => {
  return await redis.get(key);
};

export const deleteCache = async (key: string): Promise<void> => {
  await redis.del(key);
};

export const deleteCachePattern = async (pattern: string): Promise<void> => {
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
};

export default redis;
