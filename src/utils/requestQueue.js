/**
 * Request Queue System
 * Manages API request throttling with rate limiting and retry logic
 */

class RequestQueue {
  constructor(options = {}) {
    this.rateLimit = options.rateLimit || 4; // requests per interval
    this.interval = options.interval || 60000; // 1 minute in ms
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 2000; // Initial retry delay

    this.queue = [];
    this.activeRequests = 0;
    this.completedRequests = 0;
    this.failedRequests = 0;
    this.requestTimestamps = [];
    this.isProcessing = false;

    // Callbacks
    this.onProgress = options.onProgress || (() => {});
    this.onComplete = options.onComplete || (() => {});
    this.onError = options.onError || (() => {});
  }

  /**
   * Add a request to the queue
   * @param {Function} fn - Async function to execute
   * @param {Object} metadata - Request metadata (symbol, priority, etc.)
   * @returns {Promise} Promise that resolves with the result
   */
  add(fn, metadata = {}) {
    return new Promise((resolve, reject) => {
      const request = {
        fn,
        metadata: {
          symbol: metadata.symbol || 'unknown',
          priority: metadata.priority || 0,
          retries: 0,
          addedAt: Date.now(),
          ...metadata
        },
        resolve,
        reject
      };

      // Insert by priority (higher priority first)
      const insertIndex = this.queue.findIndex(
        req => req.metadata.priority < request.metadata.priority
      );

      if (insertIndex === -1) {
        this.queue.push(request);
      } else {
        this.queue.splice(insertIndex, 0, request);
      }

      // Start processing if not already running
      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  /**
   * Process the queue with rate limiting
   */
  async processQueue() {
    if (this.isProcessing) return;
    if (this.queue.length === 0) return;

    this.isProcessing = true;

    while (this.queue.length > 0) {
      // Check if we can make a request (rate limiting)
      while (!this.canMakeRequest()) {
        await this.sleep(1000); // Wait 1 second and check again
      }

      const request = this.queue.shift();
      this.activeRequests++;

      // Notify progress
      this.onProgress({
        status: 'processing',
        symbol: request.metadata.symbol,
        queued: this.queue.length,
        active: this.activeRequests,
        completed: this.completedRequests,
        failed: this.failedRequests,
        total: this.queue.length + this.activeRequests + this.completedRequests + this.failedRequests
      });

      // Execute request with retry logic
      this.executeWithRetry(request)
        .then(() => {
          this.activeRequests--;
          this.completedRequests++;
        })
        .catch(() => {
          this.activeRequests--;
          this.failedRequests++;
        });

      // Record request timestamp
      this.requestTimestamps.push(Date.now());
    }

    // Wait for all active requests to complete
    while (this.activeRequests > 0) {
      await this.sleep(100);
    }

    this.isProcessing = false;
    this.onComplete({
      completed: this.completedRequests,
      failed: this.failedRequests,
      total: this.completedRequests + this.failedRequests
    });
  }

  /**
   * Execute request with exponential backoff retry
   */
  async executeWithRetry(request) {
    let lastError;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await request.fn();
        request.resolve(result);
        return;
      } catch (error) {
        lastError = error;
        request.metadata.retries = attempt + 1;

        // If this was the last retry, reject
        if (attempt === this.maxRetries) {
          this.onError({
            symbol: request.metadata.symbol,
            error,
            retries: attempt + 1
          });
          request.reject(error);
          return;
        }

        // Exponential backoff: 2s, 4s, 8s
        const delay = this.retryDelay * Math.pow(2, attempt);
        await this.sleep(delay);
      }
    }
  }

  /**
   * Check if we can make a request based on rate limit
   * @returns {boolean}
   */
  canMakeRequest() {
    const now = Date.now();
    const windowStart = now - this.interval;

    // Remove timestamps outside the current window
    this.requestTimestamps = this.requestTimestamps.filter(
      timestamp => timestamp > windowStart
    );

    // Check if we're under the rate limit
    return this.requestTimestamps.length < this.rateLimit;
  }

  /**
   * Get current queue status
   * @returns {Object}
   */
  getStatus() {
    return {
      queued: this.queue.length,
      active: this.activeRequests,
      completed: this.completedRequests,
      failed: this.failedRequests,
      isProcessing: this.isProcessing,
      total: this.queue.length + this.activeRequests + this.completedRequests + this.failedRequests
    };
  }

  /**
   * Clear the queue
   */
  clear() {
    // Reject all pending requests
    this.queue.forEach(request => {
      request.reject(new Error('Queue cleared'));
    });

    this.queue = [];
    this.completedRequests = 0;
    this.failedRequests = 0;
  }

  /**
   * Reset the queue for new batch
   */
  reset() {
    this.clear();
    this.requestTimestamps = [];
    this.activeRequests = 0;
    this.isProcessing = false;
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance for global use
let globalQueueInstance = null;

/**
 * Get or create the global queue instance
 * @param {Object} options - Queue options
 * @returns {RequestQueue}
 */
export const getRequestQueue = (options = {}) => {
  if (!globalQueueInstance) {
    globalQueueInstance = new RequestQueue(options);
  }
  return globalQueueInstance;
};

/**
 * Reset the global queue instance
 */
export const resetRequestQueue = () => {
  if (globalQueueInstance) {
    globalQueueInstance.reset();
  }
  globalQueueInstance = null;
};

export default RequestQueue;
