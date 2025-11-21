import Redis from 'ioredis';
import { config } from './index';

let redisClient: Redis | null = null;
let redisAvailable = false;

export const connectRedis = (): Redis | null => {
  if (redisClient) {
    return redisClient;
  }

  try {
    redisClient = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password || undefined,
      db: config.redis.db,
      // Limit retries to avoid spam
      retryStrategy: (times) => {
        if (times > 3) {
          // Stop retrying after 3 attempts
          console.warn('⚠️  Redis unavailable - caching and advanced features disabled');
          return null;
        }
        return Math.min(times * 100, 500);
      },
      maxRetriesPerRequest: 1,
      lazyConnect: true, // Don't connect immediately
      enableOfflineQueue: false, // Don't queue commands when disconnected
    });

    redisClient.on('connect', () => {
      redisAvailable = true;
      console.log('✅ Redis Connected');
    });

    redisClient.on('error', (err) => {
      // Only log first error to avoid spam
      if (redisAvailable) {
        console.error('Redis Error:', err.message);
        redisAvailable = false;
      }
    });

    redisClient.on('ready', () => {
      redisAvailable = true;
      console.log('✅ Redis Ready');
    });

    // Try to connect
    redisClient.connect().catch(() => {
      // Silently fail - warning already shown in retryStrategy
      redisClient = null;
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      if (redisClient && redisAvailable) {
        await redisClient.quit();
        console.log('Redis connection closed');
      }
    });

    return redisClient;
  } catch (error) {
    console.warn('⚠️  Redis initialization failed - continuing without Redis');
    return null;
  }
};

export const getRedisClient = (): Redis | null => {
  return redisClient;
};
