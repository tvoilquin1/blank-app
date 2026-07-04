import { subYears, startOfYear } from 'date-fns';

/**
 * Calculate date range based on selection
 */
export const calculateDateRange = (rangeType, customDates = null) => {
  const now = new Date();
  let startDate, endDate = now;

  switch (rangeType) {
    case 'ytd':
      startDate = startOfYear(now);
      break;
    case '1y':
      startDate = subYears(now, 1);
      break;
    case '5y':
      startDate = subYears(now, 5);
      break;
    case 'custom':
      if (customDates) {
        startDate = new Date(customDates.start);
        endDate = new Date(customDates.end);
      } else {
        startDate = subYears(now, 1);
      }
      break;
    default:
      startDate = subYears(now, 1);
  }

  return { startDate, endDate };
};

/**
 * Check if a date is during market hours
 * US Stock Market: Mon-Fri, 9:30 AM - 4:00 PM ET
 */
const isDuringMarketHours = (date, timeframe) => {
  // Daily timeframe doesn't need intraday checks
  if (timeframe === '1day') {
    const dayOfWeek = date.getDay();
    return dayOfWeek !== 0 && dayOfWeek !== 6; // Not weekend
  }

  // For intraday timeframes, check market hours
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) return false; // Weekend

  const hours = date.getHours();
  const minutes = date.getMinutes();

  // Market hours: 9:30 AM - 4:00 PM (using simple UTC-5 approximation)
  const marketOpen = 9 * 60 + 30; // 9:30 AM
  const marketClose = 16 * 60; // 4:00 PM
  const currentMinutes = hours * 60 + minutes;

  return currentMinutes >= marketOpen && currentMinutes < marketClose;
};

/**
 * Generate realistic mock candlestick data
 */
const generateMockData = (startDate, endDate, timeframe, symbol) => {
  const data = [];
  const now = endDate.getTime();
  const start = startDate.getTime();

  // Base price varies by symbol (updated 2026)
  const basePrices = {
    'AAPL': 225,
    'GOOGL': 165,
    'MSFT': 430,
    'AMZN': 180,
    'TSLA': 260,
    'NVDA': 800,
    'META': 500,
  };

  let basePrice = basePrices[symbol] || 100;

  // Determine interval in milliseconds
  let interval;
  switch (timeframe) {
    case '5min':
      interval = 5 * 60 * 1000;
      break;
    case '1hour':
      interval = 60 * 60 * 1000;
      break;
    case '4hour':
      interval = 4 * 60 * 60 * 1000;
      break;
    case '1day':
    default:
      interval = 24 * 60 * 60 * 1000;
  }

  let currentTime = start;
  let currentPrice = basePrice;

  while (currentTime <= now) {
    const date = new Date(currentTime);

    // Skip non-market hours
    if (!isDuringMarketHours(date, timeframe)) {
      currentTime += interval;
      continue;
    }

    // Generate realistic price movement with no bias
    const volatility = basePrice * 0.02;
    const trend = (Math.random() - 0.5) * volatility;
    currentPrice = Math.max(currentPrice + trend, basePrice * 0.5);

    const open = currentPrice;
    const change = (Math.random() - 0.5) * volatility;
    const close = open + change;

    // Ensure OHLC relationships are valid
    const bodyHigh = Math.max(open, close);
    const bodyLow = Math.min(open, close);
    const high = bodyHigh + Math.random() * volatility * 0.5;
    const low = Math.max(0.01, bodyLow - Math.random() * volatility * 0.5); // Prevent negative prices

    data.push({
      time: Math.floor(currentTime / 1000),
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
    });

    currentPrice = close;
    currentTime += interval;
  }

  return data;
};

/**
 * Aggregate hourly data into 4-hour candles
 */
const aggregate4HourData = (hourlyData) => {
  const aggregated = [];

  // Sort by time to ensure correct order
  const sorted = [...hourlyData].sort((a, b) => a.time - b.time);

  for (let i = 0; i < sorted.length; i += 4) {
    const chunk = sorted.slice(i, i + 4);
    if (chunk.length === 0) continue;

    // Create 4-hour candle from 4 hourly candles
    aggregated.push({
      time: chunk[0].time,
      open: chunk[0].open,
      high: Math.max(...chunk.map(c => c.high)),
      low: Math.min(...chunk.map(c => c.low)),
      close: chunk[chunk.length - 1].close,
    });
  }

  return aggregated;
};

/**
 * Fetch stock data from Alpha Vantage API
 * Note: You'll need to sign up for a free API key at https://www.alphavantage.co/
 */
const fetchRealData = async (symbol, timeframe, startDate, endDate) => {
  const API_KEY = import.meta.env.VITE_ALPHA_VANTAGE_API_KEY;

  if (!API_KEY) {
    console.warn('No API key found. Using mock data instead.');
    return null;
  }

  // Map our timeframes to Alpha Vantage functions
  const functionMap = {
    '5min': 'TIME_SERIES_INTRADAY',
    '1hour': 'TIME_SERIES_INTRADAY',
    '4hour': 'TIME_SERIES_INTRADAY',
    '1day': 'TIME_SERIES_DAILY',
  };

  const intervalMap = {
    '5min': '5min',
    '1hour': '60min',
    '4hour': '60min', // Fetch hourly, then aggregate
    '1day': 'daily',
  };

  const func = functionMap[timeframe];
  const interval = intervalMap[timeframe];

  try {
    const url = `https://www.alphavantage.co/query?function=${func}&symbol=${symbol}&interval=${interval}&apikey=${API_KEY}&outputsize=full`;
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('API rate limit exceeded. Please try again later.');
      }
      if (response.status === 404) {
        throw new Error(`Symbol "${symbol}" not found.`);
      }
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();

    if (data['Error Message']) {
      throw new Error(`Invalid symbol: ${symbol}`);
    }

    if (data['Note']) {
      throw new Error('API rate limit reached. Please wait a minute and try again.');
    }

    // Parse the response and convert to our format
    const timeSeriesKey = Object.keys(data).find(key => key.includes('Time Series'));
    if (!timeSeriesKey) {
      console.error('No time series data found');
      return null;
    }

    const timeSeries = data[timeSeriesKey];
    let parsedData = Object.entries(timeSeries)
      .map(([time, values]) => ({
        time: Math.floor(new Date(time).getTime() / 1000),
        open: parseFloat(values['1. open']),
        high: parseFloat(values['2. high']),
        low: parseFloat(values['3. low']),
        close: parseFloat(values['4. close']),
      }))
      .filter(item => {
        const itemTime = item.time * 1000;
        return itemTime >= startDate.getTime() && itemTime <= endDate.getTime();
      })
      .sort((a, b) => a.time - b.time);

    // Aggregate to 4-hour candles if needed
    if (timeframe === '4hour') {
      parsedData = aggregate4HourData(parsedData);
    }

    return parsedData;
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
};

/**
 * Main function to fetch stock data
 * Will try real API first, fall back to mock data
 */
export const fetchStockData = async (symbol, timeframe, rangeType, customDates) => {
  const { startDate, endDate } = calculateDateRange(rangeType, customDates);

  // Try to fetch real data
  try {
    const realData = await fetchRealData(symbol, timeframe, startDate, endDate);

    if (realData && realData.length > 0) {
      return {
        data: realData,
        source: 'api',
        error: null
      };
    }
  } catch (error) {
    // If API fails, fall back to mock data
    console.warn('API fetch failed, using mock data:', error.message);
  }

  // Generate mock data
  console.log('Using mock data for', symbol);
  let mockData = generateMockData(startDate, endDate, timeframe, symbol);

  // Aggregate to 4-hour if needed
  if (timeframe === '4hour') {
    mockData = aggregate4HourData(mockData);
  }

  return {
    data: mockData,
    source: 'mock',
    error: null
  };
};
