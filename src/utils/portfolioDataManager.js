/**
 * Portfolio Data Manager
 * Orchestrates caching, queueing, and smart fetching for portfolio data
 */

import { getCachedData, setCachedData, isCacheValid, getAllCacheMetadata } from './dataCache';
import { getRequestQueue } from './requestQueue';
import { getProgressTracker } from './progressTracker';
import { fetchStockData } from './stockApi';

// Default configuration
const DEFAULT_CONFIG = {
  currentPriceTTL: 300000,    // 5 minutes
  historicalDataTTL: 1800000, // 30 minutes
  rateLimit: 4,                // 4 requests per minute
  maxRetries: 3,
  forceRefresh: false
};

class PortfolioDataManager {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.queue = null;
    this.tracker = getProgressTracker();
  }

  /**
   * Initialize the request queue with progress callbacks
   */
  initializeQueue() {
    if (!this.queue) {
      this.queue = getRequestQueue({
        rateLimit: this.config.rateLimit,
        interval: 60000,
        maxRetries: this.config.maxRetries,
        onProgress: (status) => {
          // Progress updates are handled via tracker
        },
        onError: (error) => {
          console.error('Request queue error:', error);
        }
      });
    }
    return this.queue;
  }

  /**
   * Fetch current prices for multiple symbols with smart caching
   * @param {Array<string>} symbols - Stock symbols
   * @param {Object} options - Options (forceRefresh, onProgress)
   * @returns {Promise<Object>} Map of symbol to price data
   */
  async fetchCurrentPrices(symbols, options = {}) {
    const { forceRefresh = false, onProgress } = options;
    const uniqueSymbols = [...new Set(symbols)];
    const results = {};
    const ttl = this.config.currentPriceTTL;

    // Initialize tracker
    this.tracker.start(uniqueSymbols);
    this.tracker.setPhase('fetching');

    // Subscribe to progress if callback provided
    let unsubscribe;
    if (onProgress) {
      unsubscribe = this.tracker.subscribe(onProgress);
    }

    try {
      // Phase 1: Check cache for each symbol
      const uncachedSymbols = [];

      for (const symbol of uniqueSymbols) {
        if (!forceRefresh) {
          const cached = getCachedData(symbol, ttl, 'current');

          if (cached) {
            results[symbol] = cached.data;
            this.tracker.setCached(symbol, cached.timestamp);
            continue;
          }
        }

        uncachedSymbols.push(symbol);
        this.tracker.updateSymbol(symbol, { status: 'pending' });
      }

      // Phase 2: Fetch uncached symbols with queueing
      if (uncachedSymbols.length > 0) {
        const queue = this.initializeQueue();

        const fetchPromises = uncachedSymbols.map(symbol =>
          queue.add(
            async () => {
              this.tracker.setLoading(symbol);

              try {
                const result = await fetchStockData(symbol, '1day', '1y', null);

                // Get the most recent price
                const price = result.data && result.data.length > 0
                  ? result.data[result.data.length - 1].close
                  : null;

                if (price !== null) {
                  const priceData = {
                    price,
                    timestamp: Date.now(),
                    symbol
                  };

                  // Cache the result
                  setCachedData(symbol, priceData, result.source, 'current');
                  results[symbol] = priceData;
                  this.tracker.setSuccess(symbol, result.source);

                  return priceData;
                } else {
                  throw new Error('No price data available');
                }
              } catch (error) {
                this.tracker.setFailed(symbol, error);
                throw error;
              }
            },
            { symbol, priority: 0 }
          )
        );

        // Wait for all fetches to complete (or fail)
        const settled = await Promise.allSettled(fetchPromises);

        // Process settled results
        settled.forEach((result, index) => {
          const symbol = uncachedSymbols[index];
          if (result.status === 'fulfilled' && result.value) {
            results[symbol] = result.value;
          } else {
            // Check if we have old cached data to fall back on
            const oldCached = getCachedData(symbol, Infinity, 'current');
            if (oldCached) {
              results[symbol] = oldCached.data;
              this.tracker.updateSymbol(symbol, {
                status: 'success',
                source: 'stale_cache',
                timestamp: oldCached.timestamp
              });
            }
          }
        });
      }

      this.tracker.setPhase('complete');
      this.tracker.complete();

      return results;
    } finally {
      if (unsubscribe) {
        unsubscribe();
      }
    }
  }

  /**
   * Fetch historical data for multiple symbols with smart caching
   * @param {Array<string>} symbols - Stock symbols
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {Object} options - Options (forceRefresh, onProgress)
   * @returns {Promise<Object>} Map of symbol to historical data
   */
  async fetchHistoricalData(symbols, startDate, endDate, options = {}) {
    const { forceRefresh = false, onProgress } = options;
    const uniqueSymbols = [...new Set(symbols)];
    const results = {};
    const ttl = this.config.historicalDataTTL;

    // Initialize tracker
    this.tracker.start(uniqueSymbols);
    this.tracker.setPhase('fetching');

    // Subscribe to progress if callback provided
    let unsubscribe;
    if (onProgress) {
      unsubscribe = this.tracker.subscribe(onProgress);
    }

    try {
      // Phase 1: Check cache
      const uncachedSymbols = [];

      for (const symbol of uniqueSymbols) {
        const cacheKey = `${symbol}_historical`;

        if (!forceRefresh) {
          const cached = getCachedData(cacheKey, ttl, 'historical');

          if (cached) {
            results[symbol] = cached.data;
            this.tracker.setCached(symbol, cached.timestamp);
            continue;
          }
        }

        uncachedSymbols.push(symbol);
        this.tracker.updateSymbol(symbol, { status: 'pending' });
      }

      // Phase 2: Fetch uncached symbols with queueing
      if (uncachedSymbols.length > 0) {
        const queue = this.initializeQueue();

        const fetchPromises = uncachedSymbols.map((symbol, index) =>
          queue.add(
            async () => {
              this.tracker.setLoading(symbol);

              try {
                const result = await fetchStockData(
                  symbol,
                  '1day',
                  'custom',
                  {
                    start: startDate.toISOString(),
                    end: endDate.toISOString()
                  }
                );

                if (result.data && result.data.length > 0) {
                  // Cache the result
                  setCachedData(`${symbol}_historical`, result.data, result.source, 'historical');
                  results[symbol] = result.data;
                  this.tracker.setSuccess(symbol, result.source);

                  return result.data;
                } else {
                  throw new Error('No historical data available');
                }
              } catch (error) {
                this.tracker.setFailed(symbol, error);
                throw error;
              }
            },
            { symbol, priority: 0 }
          )
        );

        // Wait for all fetches
        const settled = await Promise.allSettled(fetchPromises);

        // Process results with fallback to stale cache
        settled.forEach((result, index) => {
          const symbol = uncachedSymbols[index];
          if (result.status === 'fulfilled' && result.value) {
            results[symbol] = result.value;
          } else {
            // Try stale cache
            const cacheKey = `${symbol}_historical`;
            const oldCached = getCachedData(cacheKey, Infinity, 'historical');
            if (oldCached) {
              results[symbol] = oldCached.data;
              this.tracker.updateSymbol(symbol, {
                status: 'success',
                source: 'stale_cache',
                timestamp: oldCached.timestamp
              });
            }
          }
        });
      }

      this.tracker.setPhase('complete');
      this.tracker.complete();

      return results;
    } finally {
      if (unsubscribe) {
        unsubscribe();
      }
    }
  }

  /**
   * Get cache metadata for all symbols
   * @returns {Object}
   */
  getCacheMetadata() {
    return getAllCacheMetadata();
  }

  /**
   * Get current tracker state
   * @returns {Object}
   */
  getProgress() {
    return this.tracker.getState();
  }

  /**
   * Reset the manager
   */
  reset() {
    if (this.queue) {
      this.queue.reset();
    }
    this.tracker.reset();
  }
}

// Singleton instance
let globalManagerInstance = null;

/**
 * Get or create the global manager instance
 * @param {Object} config - Configuration options
 * @returns {PortfolioDataManager}
 */
export const getPortfolioDataManager = (config = {}) => {
  if (!globalManagerInstance) {
    globalManagerInstance = new PortfolioDataManager(config);
  }
  return globalManagerInstance;
};

/**
 * Reset the global manager instance
 */
export const resetPortfolioDataManager = () => {
  if (globalManagerInstance) {
    globalManagerInstance.reset();
  }
  globalManagerInstance = null;
};

export default PortfolioDataManager;
