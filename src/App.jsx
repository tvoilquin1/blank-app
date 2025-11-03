import { useState, useEffect } from 'react';
import Chart from './components/Chart';
import TickerInput from './components/TickerInput';
import TimeRangeSelector from './components/TimeRangeSelector';
import TimeframeSelector from './components/TimeframeSelector';
import { fetchStockData } from './utils/stockApi';
import './App.css';

function App() {
  const [ticker, setTicker] = useState('AAPL');
  const [timeRange, setTimeRange] = useState('1y');
  const [customDates, setCustomDates] = useState(null);
  const [timeframe, setTimeframe] = useState('1day');
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load data whenever parameters change
  useEffect(() => {
    loadStockData();
  }, [ticker, timeRange, timeframe, customDates]);

  const loadStockData = async () => {
    if (!ticker) return;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchStockData(ticker, timeframe, timeRange, customDates);
      setChartData(data);
    } catch (err) {
      setError('Failed to load stock data. Please try again.');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTickerChange = (newTicker) => {
    setTicker(newTicker);
  };

  const handleRangeChange = (range, dates = null) => {
    setTimeRange(range);
    if (range === 'custom' && dates) {
      setCustomDates(dates);
    } else {
      setCustomDates(null);
    }
  };

  const handleTimeframeChange = (newTimeframe) => {
    setTimeframe(newTimeframe);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>📈 Stock Chart Viewer</h1>
        <p className="app-subtitle">Visualize stock price data with candlestick charts</p>
      </header>

      <div className="app-container">
        <div className="controls-section">
          <TickerInput onTickerChange={handleTickerChange} currentTicker={ticker} />

          <div className="control-group">
            <TimeRangeSelector onRangeChange={handleRangeChange} currentRange={timeRange} />
            <TimeframeSelector
              onTimeframeChange={handleTimeframeChange}
              currentTimeframe={timeframe}
            />
          </div>
        </div>

        {loading && (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading chart data...</p>
          </div>
        )}

        {error && (
          <div className="error-container">
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && (
          <Chart data={chartData} symbol={ticker} />
        )}
      </div>

      <footer className="app-footer">
        <p>
          Powered by TradingView's{' '}
          <a
            href="https://www.tradingview.com/lightweight-charts/"
            target="_blank"
            rel="noopener noreferrer"
          >
            lightweight-charts
          </a>
        </p>
        <p className="api-note">
          💡 Tip: Add your Alpha Vantage API key in .env file as VITE_ALPHA_VANTAGE_API_KEY for real data
        </p>
      </footer>
    </div>
  );
}

export default App;
