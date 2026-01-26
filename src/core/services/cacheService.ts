/**
 * Unified Cache Service
 * Multi-layer caching for React Native: AsyncStorage (persistent) + Memory (fast)
 * Comprehensive logging for cache hits, misses, and API calls
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Cache TTL configurations (in seconds)
export const CACHE_TTL = {
  DASHBOARD_SUMMARY: 300, // 5 minutes
  QUIZZES_LIST: 600, // 10 minutes
  CLASSROOMS: 1800, // 30 minutes
  STUDENTS_LIST: 900, // 15 minutes
  USER_PROFILE: 3600, // 1 hour
  QUIZ_DETAILS: 1800, // 30 minutes
  ANALYTICS: 1800, // 30 minutes
  DEFAULT: 300, // 5 minutes
};

// In-memory cache for fast access (L1 cache)
interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
  source?: string; // Track where data came from
}

const memoryCache = new Map<string, CacheEntry>();
const DEFAULT_MEMORY_TTL = CACHE_TTL.DEFAULT;

// Cache statistics
interface CacheStats {
  memoryHits: number;
  storageHits: number;
  apiCalls: number;
  cacheMisses: number;
}

const stats: CacheStats = {
  memoryHits: 0,
  storageHits: 0,
  apiCalls: 0,
  cacheMisses: 0,
};

/**
 * Generate a consistent cache key
 */
function generateCacheKey(key: string): string {
  return `eduvijna:${key}`;
}

/**
 * Check if cache entry is expired
 */
function isExpired(entry: CacheEntry): boolean {
  const now = Date.now();
  return now - entry.timestamp > (entry.ttl * 1000);
}

/**
 * Clean up expired entries from memory
 */
function cleanupExpiredMemoryEntries(): void {
  const keysToDelete: string[] = [];
  const entries = Array.from(memoryCache.entries());

  for (const [key, entry] of entries) {
    if (isExpired(entry)) {
      keysToDelete.push(key);
    }
  }

  keysToDelete.forEach(key => memoryCache.delete(key));

  if (keysToDelete.length > 0) {
    console.log(`🧹 [CACHE CLEANUP] Removed ${keysToDelete.length} expired memory entries`);
  }
}

/**
 * Clean up expired entries from AsyncStorage
 */
async function cleanupExpiredStorageEntries(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const eduvijnaKeys = keys.filter(k => k.startsWith('eduvijna:'));
    
    let cleaned = 0;
    for (const key of eduvijnaKeys) {
      const value = await AsyncStorage.getItem(key);
      if (value) {
        try {
          const entry: CacheEntry = JSON.parse(value);
          if (isExpired(entry)) {
            await AsyncStorage.removeItem(key);
            cleaned++;
          }
        } catch (e) {
          // Invalid entry, remove it
          await AsyncStorage.removeItem(key);
          cleaned++;
        }
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 [CACHE CLEANUP] Removed ${cleaned} expired AsyncStorage entries`);
    }
  } catch (error) {
    console.error('❌ [CACHE CLEANUP] Error cleaning AsyncStorage:', error);
  }
}

/**
 * Initialize cache services
 */
export async function initializeCache(): Promise<void> {
  console.log('🚀 [CACHE INIT] Initializing multi-layer cache service...');
  console.log('📊 [CACHE INIT] L1: In-Memory Cache (fast access)');
  console.log('📊 [CACHE INIT] L2: AsyncStorage (persistent across restarts)');
  
  // Run cleanup every 5 minutes
  setInterval(() => {
    cleanupExpiredMemoryEntries();
    cleanupExpiredStorageEntries();
  }, 5 * 60 * 1000);
  
  // Initial cleanup
  await cleanupExpiredStorageEntries();
  
  console.log('✅ [CACHE INIT] Cache service initialized successfully');
}

/**
 * Close cache services
 */
export async function closeCache(): Promise<void> {
  console.log('🔌 [CACHE CLOSE] Closing cache service...');
  memoryCache.clear();
  console.log('✅ [CACHE CLOSE] Cache service closed');
}

/**
 * Get data from cache (L1: Memory, L2: AsyncStorage)
 */
export async function getCachedData<T>(key: string): Promise<T | null> {
  const fullKey = generateCacheKey(key);
  const timestamp = new Date().toISOString();

  // L1: Check memory cache first (fastest)
  const memoryEntry = memoryCache.get(fullKey);
  if (memoryEntry && !isExpired(memoryEntry)) {
    stats.memoryHits++;
    console.log(`✅ [${timestamp}] [L1 MEMORY HIT] ${key} | Source: Memory Cache | Age: ${Math.round((Date.now() - memoryEntry.timestamp) / 1000)}s`);
    return memoryEntry.data;
  } else if (memoryEntry) {
    memoryCache.delete(fullKey);
    console.log(`⏰ [${timestamp}] [L1 EXPIRED] ${key} | Checking L2...`);
  }

  // L2: Check AsyncStorage (persistent)
  try {
    const storageValue = await AsyncStorage.getItem(fullKey);
    if (storageValue) {
      const storageEntry: CacheEntry = JSON.parse(storageValue);
      
      if (!isExpired(storageEntry)) {
        // Promote to memory cache
        memoryCache.set(fullKey, storageEntry);
        stats.storageHits++;
        console.log(`✅ [${timestamp}] [L2 STORAGE HIT] ${key} | Source: AsyncStorage | Age: ${Math.round((Date.now() - storageEntry.timestamp) / 1000)}s | Promoted to L1`);
        return storageEntry.data;
      } else {
        // Remove expired entry
        await AsyncStorage.removeItem(fullKey);
        console.log(`⏰ [${timestamp}] [L2 EXPIRED] ${key} | Removed from AsyncStorage`);
      }
    }
  } catch (error) {
    console.error(`❌ [${timestamp}] [STORAGE ERROR] Failed to read ${key}:`, error);
  }

  stats.cacheMisses++;
  console.log(`❌ [${timestamp}] [CACHE MISS] ${key} | Will fetch from API`);
  return null;
}

/**
 * Set data in cache (both Memory and AsyncStorage)
 */
export async function setCachedData(
  key: string,
  data: any,
  ttl: number = DEFAULT_MEMORY_TTL,
  source: string = 'API'
): Promise<void> {
  const fullKey = generateCacheKey(key);
  const timestamp = Date.now();
  const logTime = new Date().toISOString();
  const entry: CacheEntry = { data, timestamp, ttl, source };

  // L1: Set in memory cache
  memoryCache.set(fullKey, entry);
  
  // L2: Set in AsyncStorage (persistent)
  try {
    await AsyncStorage.setItem(fullKey, JSON.stringify(entry));
    console.log(`💾 [${logTime}] [CACHE SET] ${key} | Source: ${source} | TTL: ${ttl}s | Stored in L1 (Memory) + L2 (AsyncStorage)`);
  } catch (error) {
    console.error(`❌ [${logTime}] [CACHE SET ERROR] Failed to save ${key} to AsyncStorage:`, error);
    console.log(`💾 [${logTime}] [CACHE SET] ${key} | Source: ${source} | TTL: ${ttl}s | Stored in L1 (Memory) only`);
  }
}

/**
 * Delete cache entry from both layers
 */
export async function clearCacheEntry(key: string): Promise<void> {
  const fullKey = generateCacheKey(key);
  const timestamp = new Date().toISOString();

  // Clear from L1 (memory)
  const memoryDeleted = memoryCache.delete(fullKey);
  
  // Clear from L2 (AsyncStorage)
  try {
    await AsyncStorage.removeItem(fullKey);
    console.log(`🗑️ [${timestamp}] [CACHE DELETE] ${key} | Removed from L1 + L2`);
  } catch (error) {
    if (memoryDeleted) {
      console.log(`🗑️ [${timestamp}] [CACHE DELETE] ${key} | Removed from L1 only`);
    }
  }
}

/**
 * Clear all cache entries from both layers
 */
export async function clearAllCache(): Promise<void> {
  const timestamp = new Date().toISOString();
  console.log(`🧹 [${timestamp}] [CACHE CLEAR ALL] Clearing all cache entries...`);

  // Clear L1 (memory)
  const memoryKeys = memoryCache.size;
  memoryCache.clear();

  // Clear L2 (AsyncStorage)
  try {
    const keys = await AsyncStorage.getAllKeys();
    const eduvijnaKeys = keys.filter(k => k.startsWith('eduvijna:'));
    await AsyncStorage.multiRemove(eduvijnaKeys);
    console.log(`✅ [${timestamp}] [CACHE CLEAR ALL] L1: ${memoryKeys} entries | L2: ${eduvijnaKeys.length} entries`);
  } catch (error) {
    console.error(`❌ [${timestamp}] [CACHE CLEAR ALL ERROR]`, error);
    console.log(`✅ [${timestamp}] [CACHE CLEAR ALL] L1: ${memoryKeys} entries cleared`);
  }
  
  // Reset statistics
  stats.memoryHits = 0;
  stats.storageHits = 0;
  stats.apiCalls = 0;
  stats.cacheMisses = 0;
}

/**
 * Make API call with caching (cache-first strategy)
 */
export async function cachedApiCall<T>(
  apiFunction: () => Promise<T>,
  cacheKey: string,
  ttl: number = DEFAULT_MEMORY_TTL,
  forceRefresh: boolean = false
): Promise<T> {
  const timestamp = new Date().toISOString();
  const startTime = Date.now();

  // Check cache first (unless force refresh)
  if (!forceRefresh) {
    const cachedData = await getCachedData<T>(cacheKey);
    if (cachedData !== null) {
      const duration = Date.now() - startTime;
      console.log(`⚡ [${timestamp}] [CACHE SERVED] ${cacheKey} | Duration: ${duration}ms | No API call needed`);
      return cachedData;
    }
  } else {
    console.log(`🔄 [${timestamp}] [FORCE REFRESH] ${cacheKey} | Cache bypassed`);
  }

  // Make API call
  stats.apiCalls++;
  console.log(`🌐 [${timestamp}] [API CALL START] ${cacheKey} | Fetching fresh data...`);
  
  try {
    const data = await apiFunction();
    const duration = Date.now() - startTime;

    // Cache the result
    await setCachedData(cacheKey, data, ttl, 'API');
    
    console.log(`✅ [${timestamp}] [API CALL SUCCESS] ${cacheKey} | Duration: ${duration}ms | Data cached for ${ttl}s`);

    return data;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [${timestamp}] [API CALL FAILED] ${cacheKey} | Duration: ${duration}ms | Error:`, error);
    throw error;
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStatistics(): Promise<{
  memory: { entries: number; size: string };
  storage: { entries: number };
  stats: CacheStats;
  hitRate: string;
}> {
  // Memory stats
  const memoryEntries = memoryCache.size;
  const memorySize = `${(JSON.stringify(Array.from(memoryCache.entries())).length / 1024).toFixed(2)} KB`;

  // AsyncStorage stats
  let storageEntries = 0;
  try {
    const keys = await AsyncStorage.getAllKeys();
    storageEntries = keys.filter(k => k.startsWith('eduvijna:')).length;
  } catch (error) {
    console.error('Error getting AsyncStorage stats:', error);
  }

  // Calculate hit rate
  const totalRequests = stats.memoryHits + stats.storageHits + stats.apiCalls;
  const totalHits = stats.memoryHits + stats.storageHits;
  const hitRate = totalRequests > 0 ? `${((totalHits / totalRequests) * 100).toFixed(1)}%` : '0%';

  return {
    memory: {
      entries: memoryEntries,
      size: memorySize,
    },
    storage: {
      entries: storageEntries,
    },
    stats: { ...stats },
    hitRate,
  };
}

/**
 * Print cache statistics to console
 */
export async function logCacheStatistics(): Promise<void> {
  const statistics = await getCacheStatistics();
  const timestamp = new Date().toISOString();
  
  console.log('\n' + '='.repeat(60));
  console.log(`📊 [${timestamp}] CACHE STATISTICS`);
  console.log('='.repeat(60));
  console.log(`L1 Memory Cache: ${statistics.memory.entries} entries (${statistics.memory.size})`);
  console.log(`L2 AsyncStorage: ${statistics.storage.entries} entries`);
  console.log('-'.repeat(60));
  console.log(`Memory Hits:    ${statistics.stats.memoryHits}`);
  console.log(`Storage Hits:   ${statistics.stats.storageHits}`);
  console.log(`API Calls:      ${statistics.stats.apiCalls}`);
  console.log(`Cache Misses:   ${statistics.stats.cacheMisses}`);
  console.log(`Hit Rate:       ${statistics.hitRate}`);
  console.log('='.repeat(60) + '\n');
}

/**
 * Health check for cache services
 */
export async function cacheHealthCheck(): Promise<{
  memory: boolean;
  storage: boolean;
}> {
  let storageHealthy = false;
  try {
    await AsyncStorage.setItem('eduvijna:health-check', 'OK');
    const value = await AsyncStorage.getItem('eduvijna:health-check');
    await AsyncStorage.removeItem('eduvijna:health-check');
    storageHealthy = value === 'OK';
  } catch (error) {
    console.error('AsyncStorage health check failed:', error);
  }

  return {
    memory: true, // Memory cache is always available
    storage: storageHealthy,
  };
}

/**
 * Enhanced logging for API calls with cache status
 */
export function logApiCall(
  endpoint: string,
  method: string = 'GET',
  cacheStatus: 'HIT' | 'MISS' | 'API' | 'ERROR',
  duration?: number,
  params?: Record<string, any>
): void {
  const timestamp = new Date().toISOString();
  const paramStr = params ? ` | Params: ${JSON.stringify(params)}` : '';
  const durationStr = duration ? ` | Duration: ${duration}ms` : '';

  const emoji = {
    HIT: '✅',
    MISS: '❌',
    API: '🌐',
    ERROR: '❌',
  };

  console.log(
    `${emoji[cacheStatus]} [${timestamp}] ${method} ${endpoint} | Cache: ${cacheStatus}${paramStr}${durationStr}`
  );
}