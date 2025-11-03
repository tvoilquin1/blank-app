import { useState, useEffect } from 'react';
import Chart from './components/Chart';
import TickerInput from './components/TickerInput';
import TimeRangeSelector from './components/TimeRangeSelector';
import TimeframeSelector from './components/TimeframeSelector';
import AddPortfolioEntryModal from './components/AddPortfolioEntryModal';
import EditPortfolioEntryModal from './components/EditPortfolioEntryModal';
import PortfolioView from './components/PortfolioView';
import { fetchStockData, getCurrentPrice } from './utils/stockApi';
import { addPortfolioEntry, updatePortfolioEntry, getPortfolioEntries } from './utils/portfolioStorage';
import './App.css';

function App() {
  const [ticker, setTicker] = useState('AAPL');
  const [timeRange, setTimeRange] = useState('1y');
  const [customDates, setCustomDates] = useState(null);
  const [timeframe, setTimeframe] = useState('1day');
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [portfolioRefresh, setPortfolioRefresh] = useState(0);
  const [currentPrices, setCurrentPrices] = useState({});

  // Load data whenever parameters change
  useEffect(() => {
    loadStockData();
  }, [ticker, timeRange, timeframe, customDates]);

  // Update current prices when chart data changes
  useEffect(() => {
    if (chartData && chartData.length > 0 && ticker) {
      const price = getCurrentPrice(ticker, chartData);
      setCurrentPrices(prev => ({
        ...prev,
        [ticker]: price
      }));
    }
  }, [chartData, ticker]);

  // Load prices for all portfolio symbols on mount and when portfolio refreshes
  useEffect(() => {
    const loadPortfolioPrices = () => {
      const entries = getPortfolioEntries();
      const symbols = [...new Set(entries.map(e => e.symbol))];
      const prices = {};

      symbols.forEach(symbol => {
        // Use existing price if available, otherwise generate one
        prices[symbol] = currentPrices[symbol] || getCurrentPrice(symbol);
      });

      setCurrentPrices(prev => ({ ...prev, ...prices }));
    };

    loadPortfolioPrices();
  }, [portfolioRefresh]);

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

  const handleAddToPortfolio = () => {
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingEntry(null);
  };

  const handleSavePortfolioEntry = (entry) => {
    const success = addPortfolioEntry(entry);
    if (success) {
      setShowAddModal(false);
      setPortfolioRefresh(prev => prev + 1); // Trigger portfolio refresh
      alert(`Successfully added ${entry.symbol} to portfolio!`);
    } else {
      alert('Failed to add entry to portfolio. Please try again.');
    }
  };

  const handleEditEntry = (entry) => {
    setEditingEntry(entry);
    setShowEditModal(true);
  };

  const handleUpdatePortfolioEntry = (id, updatedEntry) => {
    const success = updatePortfolioEntry(id, updatedEntry);
    if (success) {
      setShowEditModal(false);
      setEditingEntry(null);
      setPortfolioRefresh(prev => prev + 1); // Trigger portfolio refresh
      alert(`Successfully updated ${updatedEntry.symbol} entry!`);
    } else {
      alert('Failed to update entry. Please try again.');
    }
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
          <Chart data={chartData} symbol={ticker} onAddToPortfolio={handleAddToPortfolio} />
        )}

        <PortfolioView
          key={portfolioRefresh}
          currentPrices={currentPrices}
          onEditEntry={handleEditEntry}
        />
      </div>

      {showAddModal && (
        <AddPortfolioEntryModal
          symbol={ticker}
          onClose={handleCloseModal}
          onSave={handleSavePortfolioEntry}
        />
      )}

      {showEditModal && editingEntry && (
        <EditPortfolioEntryModal
          entry={editingEntry}
          onClose={handleCloseEditModal}
          onSave={handleUpdatePortfolioEntry}
        />
      )}

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
