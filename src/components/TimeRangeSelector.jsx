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
      const start = new Date(startDate);
      const end = new Date(endDate);
      const today = new Date();

      // Validation: start must be before end
      if (start >= end) {
        alert('Start date must be before end date');
        return;
      }

      // Validation: end date cannot be in the future
      if (end > today) {
        alert('End date cannot be in the future');
        return;
      }

      // Validation: reasonable date range (not too old)
      const minDate = new Date('1990-01-01');
      if (start < minDate) {
        alert('Start date cannot be before 1990');
        return;
      }

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
                min="1990-01-01"
                max={new Date().toISOString().split('T')[0]}
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
                min="1990-01-01"
                max={new Date().toISOString().split('T')[0]}
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
