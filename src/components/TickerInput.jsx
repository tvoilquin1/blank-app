import { useState } from 'react';
import './TickerInput.css';

const TickerInput = ({ onTickerChange, currentTicker }) => {
  const [inputValue, setInputValue] = useState(currentTicker || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onTickerChange(inputValue.trim().toUpperCase());
    }
  };

  return (
    <div className="ticker-input-wrapper">
      <form onSubmit={handleSubmit} className="ticker-form">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Enter ticker symbol (e.g., AAPL)"
          className="ticker-input"
        />
        <button type="submit" className="ticker-submit">
          Load
        </button>
      </form>
    </div>
  );
};

export default TickerInput;
