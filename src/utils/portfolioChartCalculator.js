import { fetchStockData, calculateDateRange } from './stockApi';
import { getPortfolioEntries, calculateCostBasis } from './portfolioStorage';

/**
 * Parse MM/DD/YYYY date string to Date object
 */
const parsePortfolioDate = (dateStr) => {
  const [month, day, year] = dateStr.split('/');
  return new Date(year, month - 1, day);
};

/**
 * Fetch historical data for multiple symbols
 * @param {Array<string>} symbols - Array of stock symbols
 * @param {Date} startDate - Start date for historical data
 * @param {Date} endDate - End date for historical data
 * @returns {Object} Map of symbol to historical price data
 */
export const fetchMultipleSymbolsData = async (symbols, startDate, endDate) => {
  const uniqueSymbols = [...new Set(symbols)];
  const dataPromises = uniqueSymbols.map(symbol =>
    fetchStockData(symbol, '1day', 'custom', {
      start: startDate.toISOString(),
      end: endDate.toISOString()
    })
  );

  const results = await Promise.all(dataPromises);

  const dataMap = {};
  uniqueSymbols.forEach((symbol, index) => {
    dataMap[symbol] = results[index];
  });

  return dataMap;
};

/**
 * Get price for a symbol at a specific timestamp
 * @param {Array} symbolData - Historical data for symbol
 * @param {number} timestamp - Unix timestamp in seconds
 * @returns {number} Close price at or before timestamp
 */
const getPriceAtTime = (symbolData, timestamp) => {
  if (!symbolData || symbolData.length === 0) return null;

  // Find the closest price at or before the timestamp
  let closestPrice = null;
  for (let i = 0; i < symbolData.length; i++) {
    if (symbolData[i].time <= timestamp) {
      closestPrice = symbolData[i].close;
    } else {
      break;
    }
  }

  return closestPrice || symbolData[0].close;
};

/**
 * Calculate portfolio performance index with dynamic rebalancing
 * @param {string} rangeType - Date range type ('ytd', '1y', '5y', 'custom')
 * @param {Object} customDates - Custom date range if rangeType is 'custom'
 * @returns {Object} { chartData: Array, markers: Array, metadata: Object }
 */
export const calculatePortfolioPerformanceIndex = async (rangeType = '1y', customDates = null) => {
  const entries = getPortfolioEntries();

  if (entries.length === 0) {
    return { chartData: [], markers: [], metadata: {} };
  }

  // Find earliest purchase date
  const purchaseDates = entries.map(e => parsePortfolioDate(e.purchaseDate));
  const earliestPurchase = new Date(Math.min(...purchaseDates));

  // Calculate date range for chart
  const { startDate, endDate } = calculateDateRange(rangeType, customDates);

  // Use earliestPurchase as start, but not later than endDate
  const actualStartDate = earliestPurchase;

  // Get all unique symbols
  const symbols = [...new Set(entries.map(e => e.symbol))];

  // Fetch historical data for all symbols
  const historicalDataMap = await fetchMultipleSymbolsData(symbols, actualStartDate, endDate);

  // Build a sorted array of all unique timestamps from all symbols
  const timestampSet = new Set();
  Object.values(historicalDataMap).forEach(symbolData => {
    symbolData.forEach(point => timestampSet.add(point.time));
  });
  const timestamps = Array.from(timestampSet).sort((a, b) => a - b);

  // Prepare rebalancing markers (all purchase dates)
  const markers = entries.map(entry => ({
    time: Math.floor(parsePortfolioDate(entry.purchaseDate).getTime() / 1000),
    symbol: entry.symbol,
    quantity: entry.quantity,
    purchasePrice: entry.purchasePrice,
    costBasis: calculateCostBasis(entry)
  })).sort((a, b) => a.time - b.time);

  // Calculate portfolio index for each timestamp
  const chartData = [];
  let baselineValue = null;

  for (const timestamp of timestamps) {
    // Find which positions existed at this time
    const activeEntries = entries.filter(entry => {
      const purchaseTime = Math.floor(parsePortfolioDate(entry.purchaseDate).getTime() / 1000);
      return purchaseTime <= timestamp;
    });

    if (activeEntries.length === 0) continue;

    // Calculate total portfolio value at this timestamp
    let totalValue = 0;
    let hasAllPrices = true;

    for (const entry of activeEntries) {
      const price = getPriceAtTime(historicalDataMap[entry.symbol], timestamp);
      if (price === null) {
        hasAllPrices = false;
        break;
      }
      totalValue += price * entry.quantity;
    }

    if (!hasAllPrices) continue;

    // Set baseline at first valid data point
    if (baselineValue === null) {
      baselineValue = totalValue;
    }

    // Calculate index value (baseline = 100)
    const indexValue = (totalValue / baselineValue) * 100;

    chartData.push({
      time: timestamp,
      value: parseFloat(indexValue.toFixed(2))
    });
  }

  // Calculate metadata
  const metadata = {
    startDate: actualStartDate,
    endDate,
    baselineValue,
    currentValue: chartData.length > 0 ? chartData[chartData.length - 1].value : 100,
    totalReturn: chartData.length > 0 ? chartData[chartData.length - 1].value - 100 : 0,
    symbolCount: symbols.length,
    positionCount: entries.length
  };

  return { chartData, markers, metadata };
};

/**
 * Check if portfolio has any entries
 * @returns {boolean}
 */
export const hasPortfolioData = () => {
  return getPortfolioEntries().length > 0;
};

/**
 * Get current prices for all portfolio symbols using actual chart data
 * @returns {Promise<Object>} Map of symbol to current price
 */
export const getPortfolioCurrentPrices = async () => {
  const entries = getPortfolioEntries();
  if (entries.length === 0) return {};

  const symbols = [...new Set(entries.map(e => e.symbol))];
  const now = new Date();
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

  // Fetch recent data for all symbols
  const dataMap = await fetchMultipleSymbolsData(symbols, oneYearAgo, now);

  const prices = {};
  symbols.forEach(symbol => {
    const symbolData = dataMap[symbol];
    if (symbolData && symbolData.length > 0) {
      // Use the most recent close price
      prices[symbol] = symbolData[symbolData.length - 1].close;
    }
  });

  return prices;
};
