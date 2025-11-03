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

  const popularTickers = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'NVDA', 'META'];

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
      <div className="popular-tickers">
        <span className="popular-label">Popular:</span>
        {popularTickers.map((ticker) => (
          <button
            key={ticker}
            onClick={() => {
              setInputValue(ticker);
              onTickerChange(ticker);
            }}
            className={`ticker-chip ${currentTicker === ticker ? 'active' : ''}`}
          >
            {ticker}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TickerInput;
