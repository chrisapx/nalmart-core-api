import Redis from 'ioredis';
import env from './env';
import logger from '../utils/logger';

const REDIS_ENABLED = env.REDIS_ENABLED === 'true';

// Initialize Redis only if enabled
let redis: Redis | null = null;

if (REDIS_ENABLED) {
  redis = new Redis({
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
} else {
  logger.info('⚠️  Redis is disabled (REDIS_ENABLED is false)');
}

// In-memory fallback for token blacklist when Redis is disabled
const inMemoryBlacklist = new Set<string>();

// Token expiry tracking for in-memory blacklist
const tokenExpiryMap = new Map<string, NodeJS.Timeout>();

export const connectRedis = async (): Promise<void> => {
  if (!REDIS_ENABLED) {
    logger.info('Redis is disabled, skipping Redis connection');
    return;
  }

  try {
    if (redis) {
      await redis.ping();
      logger.info('✅ Redis PING successful');
    }
  } catch (error) {
    logger.error('❌ Unable to connect to Redis:', error);
    process.exit(1);
  }
};

export const disconnectRedis = async (): Promise<void> => {
  if (!REDIS_ENABLED) {
    return;
  }

  try {
    if (redis) {
      await redis.quit();
      logger.info('Redis connection closed gracefully');
    }
  } catch (error) {
    logger.error('Error closing Redis connection:', error);
  }
};

// Token blacklist helpers
export const blacklistToken = async (token: string, expiresIn: number): Promise<void> => {
  if (REDIS_ENABLED && redis) {
    await redis.setex(`blacklist:${token}`, expiresIn, '1');
  } else {
    // In-memory fallback
    inMemoryBlacklist.add(token);
    
    // Clear any existing timeout for this token
    if (tokenExpiryMap.has(token)) {
      clearTimeout(tokenExpiryMap.get(token)!);
    }
    
    // Set timeout to remove token from blacklist after expiry
    const timeout = setTimeout(() => {
      inMemoryBlacklist.delete(token);
      tokenExpiryMap.delete(token);
    }, expiresIn * 1000);
    
    tokenExpiryMap.set(token, timeout);
  }
};

export const isTokenBlacklisted = async (token: string): Promise<boolean> => {
  if (REDIS_ENABLED && redis) {
    const result = await redis.get(`blacklist:${token}`);
    return result !== null;
  } else {
    // In-memory fallback
    return inMemoryBlacklist.has(token);
  }
};

// Cache helpers
export const setCache = async (key: string, value: string, expiresIn?: number): Promise<void> => {
  if (REDIS_ENABLED && redis) {
    if (expiresIn) {
      await redis.setex(key, expiresIn, value);
    } else {
      await redis.set(key, value);
    }
  } else {
    logger.debug('Cache operation skipped: Redis is disabled');
  }
};

export const getCache = async (key: string): Promise<string | null> => {
  if (REDIS_ENABLED && redis) {
    return await redis.get(key);
  } else {
    return null;
  }
};

export const deleteCache = async (key: string): Promise<void> => {
  if (REDIS_ENABLED && redis) {
    await redis.del(key);
  } else {
    logger.debug('Cache delete operation skipped: Redis is disabled');
  }
};

export const deleteCachePattern = async (pattern: string): Promise<void> => {
  if (REDIS_ENABLED && redis) {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } else {
    logger.debug('Cache pattern delete operation skipped: Redis is disabled');
  }
};

export default redis;
