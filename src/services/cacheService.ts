import { getRedisClient } from '../config/redis';

/**
 * Cache Service for Redis operations
 */

// TTL (Time To Live) in seconds
export const CacheTTL = {
  USER_PROFILE: 300, // 5 minutes
  TASK_LIST: 60, // 1 minute
  ANALYTICS: 600, // 10 minutes
  SEARCH_RESULTS: 120, // 2 minutes
};

/**
 * Get value from cache
 */
export const get = async (key: string): Promise<any | null> => {
  try {
    const redis = getRedisClient();
    if (!redis) return null;

    const data = await redis.get(key);
    if (!data) return null;

    return JSON.parse(data);
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
};

/**
 * Set value in cache with TTL
 */
export const set = async (key: string, value: any, ttl: number = 300): Promise<boolean> => {
  try {
    const redis = getRedisClient();
    if (!redis) return false;

    await redis.setex(key, ttl, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error('Cache set error:', error);
    return false;
  }
};

/**
 * Delete specific key from cache
 */
export const del = async (key: string): Promise<boolean> => {
  try {
    const redis = getRedisClient();
    if (!redis) return false;

    await redis.del(key);
    return true;
  } catch (error) {
    console.error('Cache delete error:', error);
    return false;
  }
};

/**
 * Delete all keys matching pattern
 */
export const delPattern = async (pattern: string): Promise<number> => {
  try {
    const redis = getRedisClient();
    if (!redis) return 0;

    const keys = await redis.keys(pattern);
    if (keys.length === 0) return 0;

    await redis.del(...keys);
    return keys.length;
  } catch (error) {
    console.error('Cache delete pattern error:', error);
    return 0;
  }
};

/**
 * Check if key exists in cache
 */
export const exists = async (key: string): Promise<boolean> => {
  try {
    const redis = getRedisClient();
    if (!redis) return false;

    const result = await redis.exists(key);
    return result === 1;
  } catch (error) {
    console.error('Cache exists error:', error);
    return false;
  }
};

/**
 * Generate cache key for task list queries
 */
export const getTaskListKey = (userId: string, page: number, filters: any): string => {
  const filterHash = JSON.stringify(filters);
  return `tasks:list:${userId}:${page}:${Buffer.from(filterHash).toString('base64')}`;
};

/**
 * Generate cache key for user profile
 */
export const getUserProfileKey = (userId: string): string => {
  return `user:profile:${userId}`;
};

/**
 * Generate cache key for analytics
 */
export const getAnalyticsKey = (type: string, identifier?: string): string => {
  if (identifier) {
    return `analytics:${type}:${identifier}`;
  }
  return `analytics:${type}`;
};

/**
 * Invalidate all task-related caches
 */
export const invalidateTaskCaches = async (): Promise<void> => {
  try {
    await delPattern('tasks:*');
    await delPattern('analytics:*');
    console.log('✨ Task caches invalidated');
  } catch (error) {
    console.error('Failed to invalidate task caches:', error);
  }
};

/**
 * Invalidate user-specific caches
 */
export const invalidateUserCache = async (userId: string): Promise<void> => {
  try {
    await del(getUserProfileKey(userId));
    await delPattern(`tasks:list:${userId}:*`);
    console.log(`✨ User cache invalidated: ${userId}`);
  } catch (error) {
    console.error('Failed to invalidate user cache:', error);
  }
};

/**
 * Invalidate analytics caches
 */
export const invalidateAnalyticsCaches = async (): Promise<void> => {
  try {
    await delPattern('analytics:*');
    console.log('✨ Analytics caches invalidated');
  } catch (error) {
    console.error('Failed to invalidate analytics caches:', error);
  }
};

/**
 * Wrapper function for caching expensive operations
 */
export const cached = async <T>(
  key: string,
  ttl: number,
  fetchFunction: () => Promise<T>
): Promise<T> => {
  // Try to get from cache
  const cachedData = await get(key);
  if (cachedData !== null) {
    console.log(`🎯 Cache HIT: ${key}`);
    return cachedData as T;
  }

  console.log(`⏳ Cache MISS: ${key}`);
  
  // Fetch fresh data
  const freshData = await fetchFunction();
  
  // Store in cache
  await set(key, freshData, ttl);
  
  return freshData;
};

/**
 * Clear all caches (use with caution)
 */
export const clearAll = async (): Promise<void> => {
  try {
    const redis = getRedisClient();
    if (!redis) return;

    await redis.flushdb();
    console.log('🗑️  All caches cleared');
  } catch (error) {
    console.error('Failed to clear all caches:', error);
  }
};
