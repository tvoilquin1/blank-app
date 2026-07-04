import './DataStatusBadge.css';

/**
 * Format timestamp to relative time
 */
const formatTimeAgo = (timestamp) => {
  if (!timestamp) return '';

  const ms = Date.now() - timestamp;
  const seconds = Math.floor(ms / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

/**
 * Data Status Badge
 * Shows freshness and source of data
 */
function DataStatusBadge({ source, timestamp, symbol }) {
  if (!source) return null;

  const getDisplay = () => {
    switch (source) {
      case 'api':
        return {
          icon: '🟢',
          text: 'Live',
          className: 'api',
          title: 'Real-time data from API'
        };
      case 'cached':
        return {
          icon: '🔵',
          text: `Cached`,
          className: 'cached',
          title: `Cached data - ${formatTimeAgo(timestamp)}`
        };
      case 'stale_cache':
        return {
          icon: '🟡',
          text: 'Stale',
          className: 'stale',
          title: 'Using stale cached data (API unavailable)'
        };
      case 'mock':
        return {
          icon: '🟡',
          text: 'Mock',
          className: 'mock',
          title: 'Simulated data (API unavailable)'
        };
      default:
        return null;
    }
  };

  const display = getDisplay();
  if (!display) return null;

  return (
    <span
      className={`data-status-badge ${display.className}`}
      title={display.title}
    >
      <span className="badge-icon">{display.icon}</span>
      <span className="badge-text">{display.text}</span>
      {timestamp && source === 'cached' && (
        <span className="badge-time">({formatTimeAgo(timestamp)})</span>
      )}
    </span>
  );
}

export default DataStatusBadge;
