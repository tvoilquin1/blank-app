/**
 * Progress Tracker
 * Centralized progress state management with event emitter pattern
 */

class ProgressTracker {
  constructor() {
    this.symbols = new Map();
    this.listeners = new Set();
    this.startTime = null;
    this.phase = 'idle'; // 'idle' | 'fetching' | 'processing' | 'complete'
  }

  /**
   * Subscribe to progress updates
   * @param {Function} callback - Called with progress state
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    this.listeners.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notify all listeners
   */
  notify() {
    const state = this.getState();
    this.listeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.error('Progress listener error:', error);
      }
    });
  }

  /**
   * Start tracking a new batch
   * @param {Array<string>} symbols - Symbols to track
   */
  start(symbols) {
    this.symbols.clear();
    this.startTime = Date.now();
    this.phase = 'fetching';

    symbols.forEach(symbol => {
      this.symbols.set(symbol, {
        status: 'pending',
        source: null,
        timestamp: null,
        error: null,
        retries: 0
      });
    });

    this.notify();
  }

  /**
   * Update symbol status
   * @param {string} symbol - Stock symbol
   * @param {Object} update - Status update
   */
  updateSymbol(symbol, update) {
    if (!this.symbols.has(symbol)) {
      this.symbols.set(symbol, {
        status: 'pending',
        source: null,
        timestamp: null,
        error: null,
        retries: 0
      });
    }

    const current = this.symbols.get(symbol);
    this.symbols.set(symbol, {
      ...current,
      ...update,
      timestamp: update.timestamp || Date.now()
    });

    this.notify();
  }

  /**
   * Mark symbol as loading
   * @param {string} symbol - Stock symbol
   */
  setLoading(symbol) {
    this.updateSymbol(symbol, {
      status: 'loading',
      timestamp: Date.now()
    });
  }

  /**
   * Mark symbol as success
   * @param {string} symbol - Stock symbol
   * @param {string} source - 'api' | 'cached' | 'mock'
   */
  setSuccess(symbol, source) {
    this.updateSymbol(symbol, {
      status: 'success',
      source,
      error: null
    });
  }

  /**
   * Mark symbol as failed
   * @param {string} symbol - Stock symbol
   * @param {Error} error - Error object
   */
  setFailed(symbol, error) {
    this.updateSymbol(symbol, {
      status: 'failed',
      error: error.message || 'Unknown error'
    });
  }

  /**
   * Mark symbol as cached
   * @param {string} symbol - Stock symbol
   * @param {number} timestamp - Cache timestamp
   */
  setCached(symbol, timestamp) {
    this.updateSymbol(symbol, {
      status: 'success',
      source: 'cached',
      timestamp
    });
  }

  /**
   * Set current phase
   * @param {string} phase - 'idle' | 'fetching' | 'processing' | 'complete'
   */
  setPhase(phase) {
    this.phase = phase;
    this.notify();
  }

  /**
   * Mark as complete
   */
  complete() {
    this.phase = 'complete';
    this.notify();
  }

  /**
   * Reset tracker
   */
  reset() {
    this.symbols.clear();
    this.startTime = null;
    this.phase = 'idle';
    this.notify();
  }

  /**
   * Get current state
   * @returns {Object}
   */
  getState() {
    const symbolsArray = Array.from(this.symbols.entries()).map(([symbol, data]) => ({
      symbol,
      ...data
    }));

    const total = this.symbols.size;
    const completed = symbolsArray.filter(s => s.status === 'success' || s.status === 'failed').length;
    const pending = symbolsArray.filter(s => s.status === 'pending').length;
    const loading = symbolsArray.filter(s => s.status === 'loading').length;
    const success = symbolsArray.filter(s => s.status === 'success').length;
    const failed = symbolsArray.filter(s => s.status === 'failed').length;
    const cached = symbolsArray.filter(s => s.source === 'cached').length;

    return {
      phase: this.phase,
      symbols: symbolsArray,
      stats: {
        total,
        completed,
        pending,
        loading,
        success,
        failed,
        cached
      },
      progress: total > 0 ? (completed / total) * 100 : 0,
      elapsedTime: this.startTime ? Date.now() - this.startTime : 0,
      isActive: this.phase === 'fetching' || this.phase === 'processing'
    };
  }

  /**
   * Get symbol status
   * @param {string} symbol - Stock symbol
   * @returns {Object|null}
   */
  getSymbolStatus(symbol) {
    return this.symbols.get(symbol) || null;
  }
}

// Singleton instance
let globalTrackerInstance = null;

/**
 * Get or create the global progress tracker
 * @returns {ProgressTracker}
 */
export const getProgressTracker = () => {
  if (!globalTrackerInstance) {
    globalTrackerInstance = new ProgressTracker();
  }
  return globalTrackerInstance;
};

/**
 * Reset the global progress tracker
 */
export const resetProgressTracker = () => {
  if (globalTrackerInstance) {
    globalTrackerInstance.reset();
  }
  globalTrackerInstance = null;
};

export default ProgressTracker;
