/**
 * Data Cache System
 * Manages localStorage-based caching with TTL for stock price data
 */

const CACHE_PREFIX = 'stock_cache_';
const METADATA_KEY = 'cache_metadata';

/**
 * Cache entry structure:
 * {
 *   data: any,           // The actual data
 *   timestamp: number,   // When cached (ms)
 *   source: string,      // 'api' | 'mock'
 *   fetchAttempt: number // Last fetch attempt timestamp
 * }
 */

/**
 * Get cache key for a symbol
 */
const getCacheKey = (symbol, dataType = 'current') => {
  return `${CACHE_PREFIX}${symbol}_${dataType}`;
};

/**
 * Get cached data if still valid
 * @param {string} symbol - Stock symbol
 * @param {number} ttl - Time to live in milliseconds
 * @param {string} dataType - 'current' | 'historical'
 * @returns {Object|null} Cached data or null if stale/missing
 */
export const getCachedData = (symbol, ttl = 300000, dataType = 'current') => {
  try {
    const key = getCacheKey(symbol, dataType);
    const cached = localStorage.getItem(key);

    if (!cached) return null;

    const entry = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is still valid
    if (now - entry.timestamp < ttl) {
      return {
        data: entry.data,
        source: entry.source,
        timestamp: entry.timestamp,
        fromCache: true,
        age: now - entry.timestamp
      };
    }

    return null;
  } catch (error) {
    console.error('Error reading cache:', error);
    return null;
  }
};

/**
 * Store data in cache
 * @param {string} symbol - Stock symbol
 * @param {any} data - Data to cache
 * @param {string} source - 'api' | 'mock'
 * @param {string} dataType - 'current' | 'historical'
 */
export const setCachedData = (symbol, data, source, dataType = 'current') => {
  try {
    const key = getCacheKey(symbol, dataType);
    const entry = {
      data,
      timestamp: Date.now(),
      source,
      fetchAttempt: Date.now()
    };

    localStorage.setItem(key, JSON.stringify(entry));

    // Update metadata
    updateCacheMetadata(symbol, dataType, entry.timestamp, source);
  } catch (error) {
    console.error('Error writing cache:', error);

    // If quota exceeded, try to clear old entries
    if (error.name === 'QuotaExceededError') {
      clearOldestEntries(5);
      try {
        localStorage.setItem(key, JSON.stringify(entry));
      } catch (retryError) {
        console.error('Failed to cache after cleanup:', retryError);
      }
    }
  }
};

/**
 * Check if cache is valid without retrieving data
 * @param {string} symbol - Stock symbol
 * @param {number} ttl - Time to live in milliseconds
 * @param {string} dataType - 'current' | 'historical'
 * @returns {boolean} True if cache is valid
 */
export const isCacheValid = (symbol, ttl = 300000, dataType = 'current') => {
  try {
    const key = getCacheKey(symbol, dataType);
    const cached = localStorage.getItem(key);

    if (!cached) return false;

    const entry = JSON.parse(cached);
    const age = Date.now() - entry.timestamp;

    return age < ttl;
  } catch (error) {
    return false;
  }
};

/**
 * Clear cache for a specific symbol or all symbols
 * @param {string|null} symbol - Symbol to clear, or null for all
 * @param {string|null} dataType - Data type to clear, or null for all
 */
export const clearCache = (symbol = null, dataType = null) => {
  try {
    if (symbol) {
      if (dataType) {
        localStorage.removeItem(getCacheKey(symbol, dataType));
      } else {
        // Clear all data types for this symbol
        localStorage.removeItem(getCacheKey(symbol, 'current'));
        localStorage.removeItem(getCacheKey(symbol, 'historical'));
      }
    } else {
      // Clear all cache entries
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(CACHE_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    }

    // Update metadata
    if (symbol) {
      removeCacheMetadata(symbol, dataType);
    } else {
      localStorage.removeItem(METADATA_KEY);
    }
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
};

/**
 * Get cache metadata for a symbol
 * @param {string} symbol - Stock symbol
 * @returns {Object|null} Metadata or null
 */
export const getCacheMetadata = (symbol) => {
  try {
    const metadata = JSON.parse(localStorage.getItem(METADATA_KEY) || '{}');
    return metadata[symbol] || null;
  } catch (error) {
    return null;
  }
};

/**
 * Get all cache metadata
 * @returns {Object} All metadata
 */
export const getAllCacheMetadata = () => {
  try {
    return JSON.parse(localStorage.getItem(METADATA_KEY) || '{}');
  } catch (error) {
    return {};
  }
};

/**
 * Update cache metadata
 */
const updateCacheMetadata = (symbol, dataType, timestamp, source) => {
  try {
    const metadata = getAllCacheMetadata();

    if (!metadata[symbol]) {
      metadata[symbol] = {};
    }

    metadata[symbol][dataType] = {
      timestamp,
      source,
      age: 0
    };

    localStorage.setItem(METADATA_KEY, JSON.stringify(metadata));
  } catch (error) {
    console.error('Error updating metadata:', error);
  }
};

/**
 * Remove cache metadata
 */
const removeCacheMetadata = (symbol, dataType = null) => {
  try {
    const metadata = getAllCacheMetadata();

    if (dataType) {
      if (metadata[symbol]) {
        delete metadata[symbol][dataType];
        if (Object.keys(metadata[symbol]).length === 0) {
          delete metadata[symbol];
        }
      }
    } else {
      delete metadata[symbol];
    }

    localStorage.setItem(METADATA_KEY, JSON.stringify(metadata));
  } catch (error) {
    console.error('Error removing metadata:', error);
  }
};

/**
 * Clear oldest cache entries to free up space
 * @param {number} count - Number of entries to remove
 */
const clearOldestEntries = (count = 5) => {
  try {
    const keys = Object.keys(localStorage);
    const cacheEntries = [];

    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        try {
          const entry = JSON.parse(localStorage.getItem(key));
          cacheEntries.push({ key, timestamp: entry.timestamp });
        } catch (e) {
          // Invalid entry, remove it
          localStorage.removeItem(key);
        }
      }
    });

    // Sort by timestamp (oldest first)
    cacheEntries.sort((a, b) => a.timestamp - b.timestamp);

    // Remove oldest entries
    for (let i = 0; i < Math.min(count, cacheEntries.length); i++) {
      localStorage.removeItem(cacheEntries[i].key);
    }
  } catch (error) {
    console.error('Error clearing old entries:', error);
  }
};

/**
 * Get cache statistics
 * @returns {Object} Cache stats
 */
export const getCacheStats = () => {
  const keys = Object.keys(localStorage);
  const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));

  let totalSize = 0;
  let validCount = 0;
  const now = Date.now();

  cacheKeys.forEach(key => {
    try {
      const value = localStorage.getItem(key);
      totalSize += value.length;

      const entry = JSON.parse(value);
      if (now - entry.timestamp < 300000) {
        validCount++;
      }
    } catch (e) {
      // Skip invalid entries
    }
  });

  return {
    totalEntries: cacheKeys.length,
    validEntries: validCount,
    staleEntries: cacheKeys.length - validCount,
    approximateSize: `${(totalSize / 1024).toFixed(2)} KB`
  };
};
