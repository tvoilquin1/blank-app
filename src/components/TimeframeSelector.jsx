import './TimeframeSelector.css';

const TimeframeSelector = ({ onTimeframeChange, currentTimeframe }) => {
  const timeframes = [
    { id: '5min', label: '5 Min', value: '5min' },
    { id: '1hour', label: 'Hourly', value: '1hour' },
    { id: '4hour', label: '4 Hour', value: '4hour' },
    { id: '1day', label: 'Daily', value: '1day' },
  ];

  return (
    <div className="timeframe-selector">
      <label className="selector-label">Timeframe:</label>
      <div className="timeframe-buttons">
        {timeframes.map((tf) => (
          <button
            key={tf.id}
            onClick={() => onTimeframeChange(tf.value)}
            className={`timeframe-button ${currentTimeframe === tf.value ? 'active' : ''}`}
          >
            {tf.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TimeframeSelector;
