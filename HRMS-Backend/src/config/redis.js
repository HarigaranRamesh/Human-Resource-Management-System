// src/config/redis.js
// Production-grade resilient Redis Cache with In-Memory fallback

let redisClient = null;
let isRedisConnected = false;
const memoryStore = new Map();

async function initRedis() {
  if (process.env.NODE_ENV === 'test') {
    return;
  }
  const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  try {
    const { createClient } = require('redis');
    redisClient = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 3) {
            return false; // Stop hammering if Redis is not installed
          }
          return Math.min(retries * 500, 2000);
        },
      },
    });

    redisClient.on('error', (err) => {
      if (isRedisConnected) {
        console.warn('⚠️ [Redis] Connection error, using memory fallback:', err.message);
      }
      isRedisConnected = false;
    });

    redisClient.on('connect', () => {
      isRedisConnected = true;
      console.log('⚡ [Redis] Connected successfully to', redisUrl);
    });

    await redisClient.connect();
  } catch (err) {
    isRedisConnected = false;
    console.log('ℹ️ [Redis] Local Redis not detected. Gracefully running on In-Memory High-Speed Cache.');
  }
}

// Start connection attempt non-blockingly
initRedis().catch(() => {});

async function getCache(key) {
  try {
    if (isRedisConnected && redisClient) {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    }
  } catch (e) {
    // Fall back to memory
  }

  // In-Memory cache fallback
  const item = memoryStore.get(key);
  if (!item) return null;
  if (item.expiry && item.expiry < Date.now()) {
    memoryStore.delete(key);
    return null;
  }
  return item.value;
}

async function setCache(key, value, ttlSeconds = 60) {
  try {
    if (isRedisConnected && redisClient) {
      await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
      return;
    }
  } catch (e) {
    // Fall back to memory
  }

  // In-Memory cache fallback
  memoryStore.set(key, {
    value,
    expiry: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
  });
}

async function delCache(patternOrKey) {
  try {
    if (isRedisConnected && redisClient) {
      await redisClient.del(patternOrKey);
      return;
    }
  } catch (e) {
    // Fall back
  }
  memoryStore.delete(patternOrKey);
}

module.exports = {
  getCache,
  setCache,
  delCache,
  isRedisConnected: () => isRedisConnected,
};
