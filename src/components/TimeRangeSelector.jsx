import { useState } from 'react';
import './TimeRangeSelector.css';

const TimeRangeSelector = ({ onRangeChange, currentRange }) => {
  const [showCustom, setShowCustom] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const ranges = [
    { id: 'ytd', label: 'YTD' },
    { id: '1y', label: '1Y' },
    { id: '5y', label: '5Y' },
    { id: 'custom', label: 'Custom' },
  ];

  const handleRangeClick = (rangeId) => {
    if (rangeId === 'custom') {
      setShowCustom(true);
    } else {
      setShowCustom(false);
      onRangeChange(rangeId);
    }
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (startDate && endDate) {
      onRangeChange('custom', { start: startDate, end: endDate });
      setShowCustom(false);
    }
  };

  return (
    <div className="time-range-selector">
      <label className="selector-label">Time Range:</label>
      <div className="range-buttons">
        {ranges.map((range) => (
          <button
            key={range.id}
            onClick={() => handleRangeClick(range.id)}
            className={`range-button ${currentRange === range.id ? 'active' : ''}`}
          >
            {range.label}
          </button>
        ))}
      </div>

      {showCustom && (
        <form onSubmit={handleCustomSubmit} className="custom-range-form">
          <div className="date-inputs">
            <div className="date-input-group">
              <label>Start Date:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="date-input"
                required
              />
            </div>
            <div className="date-input-group">
              <label>End Date:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="date-input"
                required
              />
            </div>
          </div>
          <button type="submit" className="custom-submit">
            Apply
          </button>
        </form>
      )}
    </div>
  );
};

export default TimeRangeSelector;
