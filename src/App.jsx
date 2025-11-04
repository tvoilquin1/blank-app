import { useState, useEffect } from 'react';
import Chart from './components/Chart';
import TickerInput from './components/TickerInput';
import TimeRangeSelector from './components/TimeRangeSelector';
import TimeframeSelector from './components/TimeframeSelector';
import StudiesSelector from './components/StudiesSelector';
import AddPortfolioEntryModal from './components/AddPortfolioEntryModal';
import EditPortfolioEntryModal from './components/EditPortfolioEntryModal';
import PortfolioView from './components/PortfolioView';
import { fetchStockData, getCurrentPrice } from './utils/stockApi';
import { addPortfolioEntry, updatePortfolioEntry, getPortfolioEntries } from './utils/portfolioStorage';
import { calculatePortfolioPerformanceIndex, getPortfolioCurrentPrices } from './utils/portfolioChartCalculator';
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
  const [chartMode, setChartMode] = useState('stock'); // 'stock' or 'portfolio'
  const [portfolioChartData, setPortfolioChartData] = useState([]);
  const [portfolioMarkers, setPortfolioMarkers] = useState([]);
  const [portfolioMetadata, setPortfolioMetadata] = useState({});
  const [currentStudy, setCurrentStudy] = useState(null);

  // Load data whenever parameters change (only for stock mode)
  useEffect(() => {
    if (chartMode === 'stock') {
      loadStockData();
    }
  }, [ticker, timeRange, timeframe, customDates, chartMode]);

  // Load portfolio chart data when in portfolio mode or when date range changes
  useEffect(() => {
    if (chartMode === 'portfolio') {
      loadPortfolioChartData();
    }
  }, [chartMode, timeRange, customDates, portfolioRefresh]);

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
    const loadPortfolioPrices = async () => {
      const prices = await getPortfolioCurrentPrices();
      setCurrentPrices(prev => ({ ...prev, ...prices }));
    };

    loadPortfolioPrices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const loadPortfolioChartData = async () => {
    setLoading(true);
    setError(null);

    try {
      const { chartData, markers, metadata } = await calculatePortfolioPerformanceIndex(timeRange, customDates);

      if (chartData.length === 0) {
        setError('No portfolio data available for the selected date range.');
      } else {
        setPortfolioChartData(chartData);
        setPortfolioMarkers(markers);
        setPortfolioMetadata(metadata);
      }
    } catch (err) {
      setError('Failed to load portfolio chart data. Please try again.');
      console.error('Error loading portfolio chart:', err);
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

  const handleViewPortfolioChart = async () => {
    setChartMode('portfolio');
  };

  const handleBackToStockChart = () => {
    setChartMode('stock');
  };

  const handleViewStockChart = (symbol) => {
    setTicker(symbol);
    setChartMode('stock');
  };

  const handleStudyChange = (study) => {
    setCurrentStudy(study);
    // TODO: Implement study logic
    console.log('Selected study:', study);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>📈 Portfolio Analyzer</h1>
        <p className="app-subtitle">Turn your portfolio into an index</p>
      </header>

      <div className="app-container">
        <div className="controls-section">
          <div className="controls-grid">
            {chartMode === 'stock' && (
              <div className="ticker-section">
                <TickerInput onTickerChange={handleTickerChange} currentTicker={ticker} />
              </div>
            )}

            {chartMode === 'stock' && (
              <div className="studies-section">
                <StudiesSelector onStudyChange={handleStudyChange} currentStudy={currentStudy} />
              </div>
            )}

            <div className="time-range-section">
              <TimeRangeSelector onRangeChange={handleRangeChange} currentRange={timeRange} />
            </div>

            {chartMode === 'stock' && (
              <div className="timeframe-section">
                <TimeframeSelector
                  onTimeframeChange={handleTimeframeChange}
                  currentTimeframe={timeframe}
                />
              </div>
            )}
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

        {!loading && !error && chartMode === 'stock' && (
          <Chart
            data={chartData}
            symbol={ticker}
            onAddToPortfolio={handleAddToPortfolio}
            mode="stock"
          />
        )}

        {!loading && !error && chartMode === 'portfolio' && (
          <Chart
            data={portfolioChartData}
            mode="portfolio"
            markers={portfolioMarkers}
            metadata={portfolioMetadata}
            onBackToStock={handleBackToStockChart}
          />
        )}

        <PortfolioView
          key={portfolioRefresh}
          currentPrices={currentPrices}
          onEditEntry={handleEditEntry}
          onViewPortfolioChart={handleViewPortfolioChart}
          onViewStockChart={handleViewStockChart}
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
