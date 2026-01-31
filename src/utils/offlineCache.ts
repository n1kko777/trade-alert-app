/**
 * Offline Cache Utility
 * Manages caching of critical data for offline access with TTL-based invalidation
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  ApiPortfolio,
  ApiUser,
  ApiSignal,
} from '../api/types';

// =============================================================================
// Types
// =============================================================================

interface CacheEntry<T> {
  data: T;
  cachedAt: number;
  expiresAt: number;
}

interface CacheConfig {
  /** Time-to-live in milliseconds */
  ttl: number;
  /** Storage key prefix */
  keyPrefix: string;
}

// =============================================================================
// Constants
// =============================================================================

const CACHE_PREFIX = '@tradepulse_cache_';

const CACHE_KEYS = {
  portfolio: `${CACHE_PREFIX}portfolio`,
  userProfile: `${CACHE_PREFIX}user_profile`,
  signals: `${CACHE_PREFIX}signals`,
  tickers: `${CACHE_PREFIX}tickers`,
} as const;

// Default TTLs (in milliseconds)
const DEFAULT_TTLS = {
  portfolio: 30 * 60 * 1000,     // 30 minutes
  userProfile: 60 * 60 * 1000,   // 1 hour
  signals: 15 * 60 * 1000,       // 15 minutes
  tickers: 5 * 60 * 1000,        // 5 minutes
} as const;

// Maximum number of signals to cache
const MAX_CACHED_SIGNALS = 10;

// =============================================================================
// Core Cache Functions
// =============================================================================

/**
 * Set a value in the cache with TTL
 */
async function setCacheEntry<T>(
  key: string,
  data: T,
  ttl: number
): Promise<void> {
  const now = Date.now();
  const entry: CacheEntry<T> = {
    data,
    cachedAt: now,
    expiresAt: now + ttl,
  };

  try {
    await AsyncStorage.setItem(key, JSON.stringify(entry));
    if (__DEV__) {
      console.log(`[OfflineCache] Cached ${key}, expires in ${ttl / 1000}s`);
    }
  } catch (error) {
    console.error(`[OfflineCache] Failed to cache ${key}:`, error);
  }
}

/**
 * Get a value from cache, returns null if expired or not found
 */
async function getCacheEntry<T>(key: string): Promise<{
  data: T;
  cachedAt: Date;
  isStale: boolean;
} | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;

    const entry: CacheEntry<T> = JSON.parse(raw);
    const now = Date.now();
    const isExpired = now > entry.expiresAt;

    // Return data even if expired (stale), let caller decide what to do
    return {
      data: entry.data,
      cachedAt: new Date(entry.cachedAt),
      isStale: isExpired,
    };
  } catch (error) {
    console.error(`[OfflineCache] Failed to read ${key}:`, error);
    return null;
  }
}

/**
 * Remove a specific cache entry
 */
async function removeCacheEntry(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error(`[OfflineCache] Failed to remove ${key}:`, error);
  }
}

/**
 * Clear all cache entries
 */
async function clearAllCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((key) => key.startsWith(CACHE_PREFIX));
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
      if (__DEV__) {
        console.log(`[OfflineCache] Cleared ${cacheKeys.length} cache entries`);
      }
    }
  } catch (error) {
    console.error('[OfflineCache] Failed to clear cache:', error);
  }
}

// =============================================================================
// Portfolio Cache
// =============================================================================

/**
 * Cache portfolio data
 */
export async function cachePortfolio(portfolio: ApiPortfolio): Promise<void> {
  await setCacheEntry(CACHE_KEYS.portfolio, portfolio, DEFAULT_TTLS.portfolio);
}

/**
 * Get cached portfolio data
 */
export async function getCachedPortfolio(): Promise<{
  data: ApiPortfolio;
  cachedAt: Date;
  isStale: boolean;
} | null> {
  return getCacheEntry<ApiPortfolio>(CACHE_KEYS.portfolio);
}

/**
 * Clear cached portfolio
 */
export async function clearCachedPortfolio(): Promise<void> {
  await removeCacheEntry(CACHE_KEYS.portfolio);
}

// =============================================================================
// User Profile Cache
// =============================================================================

/**
 * Cache user profile
 */
export async function cacheUserProfile(user: ApiUser): Promise<void> {
  await setCacheEntry(CACHE_KEYS.userProfile, user, DEFAULT_TTLS.userProfile);
}

/**
 * Get cached user profile
 */
export async function getCachedUserProfile(): Promise<{
  data: ApiUser;
  cachedAt: Date;
  isStale: boolean;
} | null> {
  return getCacheEntry<ApiUser>(CACHE_KEYS.userProfile);
}

/**
 * Clear cached user profile
 */
export async function clearCachedUserProfile(): Promise<void> {
  await removeCacheEntry(CACHE_KEYS.userProfile);
}

// =============================================================================
// Signals Cache
// =============================================================================

/**
 * Cache recent signals (keeps only the last N)
 */
export async function cacheSignals(signals: ApiSignal[]): Promise<void> {
  // Only cache the most recent signals
  const toCache = signals.slice(0, MAX_CACHED_SIGNALS);
  await setCacheEntry(CACHE_KEYS.signals, toCache, DEFAULT_TTLS.signals);
}

/**
 * Get cached signals
 */
export async function getCachedSignals(): Promise<{
  data: ApiSignal[];
  cachedAt: Date;
  isStale: boolean;
} | null> {
  return getCacheEntry<ApiSignal[]>(CACHE_KEYS.signals);
}

/**
 * Clear cached signals
 */
export async function clearCachedSignals(): Promise<void> {
  await removeCacheEntry(CACHE_KEYS.signals);
}

// =============================================================================
// Ticker Cache (for quick price reference)
// =============================================================================

interface CachedTicker {
  symbol: string;
  price: number;
  change24h: number;
  updatedAt: string;
}

/**
 * Cache ticker data for key symbols
 */
export async function cacheTickers(
  tickers: CachedTicker[]
): Promise<void> {
  await setCacheEntry(CACHE_KEYS.tickers, tickers, DEFAULT_TTLS.tickers);
}

/**
 * Get cached tickers
 */
export async function getCachedTickers(): Promise<{
  data: CachedTicker[];
  cachedAt: Date;
  isStale: boolean;
} | null> {
  return getCacheEntry<CachedTicker[]>(CACHE_KEYS.tickers);
}

/**
 * Clear cached tickers
 */
export async function clearCachedTickers(): Promise<void> {
  await removeCacheEntry(CACHE_KEYS.tickers);
}

// =============================================================================
// Cache Management
// =============================================================================

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  entries: { key: string; size: number; cachedAt: Date | null; isStale: boolean }[];
  totalSize: number;
}> {
  const entries: { key: string; size: number; cachedAt: Date | null; isStale: boolean }[] = [];
  let totalSize = 0;

  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((key) => key.startsWith(CACHE_PREFIX));

    for (const key of cacheKeys) {
      const raw = await AsyncStorage.getItem(key);
      if (raw) {
        const size = raw.length;
        totalSize += size;

        try {
          const entry = JSON.parse(raw) as CacheEntry<unknown>;
          entries.push({
            key: key.replace(CACHE_PREFIX, ''),
            size,
            cachedAt: new Date(entry.cachedAt),
            isStale: Date.now() > entry.expiresAt,
          });
        } catch {
          entries.push({
            key: key.replace(CACHE_PREFIX, ''),
            size,
            cachedAt: null,
            isStale: true,
          });
        }
      }
    }
  } catch (error) {
    console.error('[OfflineCache] Failed to get stats:', error);
  }

  return { entries, totalSize };
}

/**
 * Remove all expired cache entries
 */
export async function pruneExpiredCache(): Promise<number> {
  let removed = 0;

  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((key) => key.startsWith(CACHE_PREFIX));
    const now = Date.now();

    const keysToRemove: string[] = [];

    for (const key of cacheKeys) {
      const raw = await AsyncStorage.getItem(key);
      if (raw) {
        try {
          const entry = JSON.parse(raw) as CacheEntry<unknown>;
          if (now > entry.expiresAt) {
            keysToRemove.push(key);
          }
        } catch {
          // Invalid entry, remove it
          keysToRemove.push(key);
        }
      }
    }

    if (keysToRemove.length > 0) {
      await AsyncStorage.multiRemove(keysToRemove);
      removed = keysToRemove.length;
      if (__DEV__) {
        console.log(`[OfflineCache] Pruned ${removed} expired entries`);
      }
    }
  } catch (error) {
    console.error('[OfflineCache] Failed to prune cache:', error);
  }

  return removed;
}

// =============================================================================
// Exports
// =============================================================================

export const offlineCache = {
  // Portfolio
  cachePortfolio,
  getCachedPortfolio,
  clearCachedPortfolio,
  // User Profile
  cacheUserProfile,
  getCachedUserProfile,
  clearCachedUserProfile,
  // Signals
  cacheSignals,
  getCachedSignals,
  clearCachedSignals,
  // Tickers
  cacheTickers,
  getCachedTickers,
  clearCachedTickers,
  // Management
  getCacheStats,
  pruneExpiredCache,
  clearAllCache,
};

export default offlineCache;
