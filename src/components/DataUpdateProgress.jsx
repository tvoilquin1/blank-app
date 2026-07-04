import { useState } from 'react';
import './DataUpdateProgress.css';

/**
 * Format milliseconds to human-readable time
 */
const formatDuration = (ms) => {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
};

/**
 * Format timestamp to relative time
 */
const formatTimeAgo = (timestamp) => {
  const ms = Date.now() - timestamp;
  const seconds = Math.floor(ms / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

function DataUpdateProgress({ progress }) {
  const [showDetails, setShowDetails] = useState(false);

  if (!progress || !progress.isActive) {
    return null;
  }

  const { stats, symbols, elapsedTime, phase } = progress;
  const percentage = Math.round(progress.progress);

  // Get phase display text
  const getPhaseText = () => {
    switch (phase) {
      case 'fetching':
        return 'Fetching data...';
      case 'processing':
        return 'Processing...';
      case 'complete':
        return 'Complete!';
      default:
        return 'Updating...';
    }
  };

  // Get status icon and color
  const getStatusDisplay = (symbol) => {
    switch (symbol.status) {
      case 'success':
        return { icon: '✓', color: 'success', text: symbol.source || 'Success' };
      case 'loading':
        return { icon: '⟳', color: 'loading', text: 'Loading...' };
      case 'failed':
        return { icon: '✕', color: 'failed', text: 'Failed' };
      case 'pending':
        return { icon: '○', color: 'pending', text: 'Pending' };
      default:
        return { icon: '?', color: 'unknown', text: 'Unknown' };
    }
  };

  // Get source badge
  const getSourceBadge = (source) => {
    switch (source) {
      case 'api':
        return <span className="source-badge api">Live</span>;
      case 'cached':
        return <span className="source-badge cached">Cached</span>;
      case 'stale_cache':
        return <span className="source-badge stale">Stale Cache</span>;
      case 'mock':
        return <span className="source-badge mock">Mock</span>;
      default:
        return null;
    }
  };

  return (
    <div className="data-update-progress-overlay">
      <div className="progress-card">
        <div className="progress-header">
          <div className="progress-title">
            <span className="progress-icon">📊</span>
            <h3>{getPhaseText()}</h3>
          </div>
          <div className="progress-summary">
            {stats.completed} of {stats.total} symbols
            {elapsedTime > 0 && <span className="elapsed-time"> • {formatDuration(elapsedTime)}</span>}
          </div>
        </div>

        <div className="progress-bar-container">
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div className="progress-percentage">{percentage}%</div>
        </div>

        <div className="progress-stats">
          {stats.success > 0 && <span className="stat success">✓ {stats.success}</span>}
          {stats.loading > 0 && <span className="stat loading">⟳ {stats.loading}</span>}
          {stats.cached > 0 && <span className="stat cached">💾 {stats.cached}</span>}
          {stats.failed > 0 && <span className="stat failed">✕ {stats.failed}</span>}
          {stats.pending > 0 && <span className="stat pending">○ {stats.pending}</span>}
        </div>

        {symbols && symbols.length > 0 && (
          <div className="progress-details">
            <button
              className="details-toggle"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? '▼' : '▶'} {showDetails ? 'Hide' : 'Show'} Details
            </button>

            {showDetails && (
              <div className="symbols-list">
                {symbols.map((symbol) => {
                  const display = getStatusDisplay(symbol);
                  return (
                    <div key={symbol.symbol} className={`symbol-item status-${display.color}`}>
                      <span className="symbol-icon">{display.icon}</span>
                      <span className="symbol-name">{symbol.symbol}</span>
                      <span className="symbol-status">{display.text}</span>
                      {symbol.source && getSourceBadge(symbol.source)}
                      {symbol.timestamp && symbol.status === 'success' && (
                        <span className="symbol-time">{formatTimeAgo(symbol.timestamp)}</span>
                      )}
                      {symbol.error && (
                        <span className="symbol-error" title={symbol.error}>⚠</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default DataUpdateProgress;
