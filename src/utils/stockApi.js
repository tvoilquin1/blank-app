import { subDays, subYears, startOfYear, format } from 'date-fns';

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
 * Generate realistic mock candlestick data
 */
const generateMockData = (startDate, endDate, timeframe, symbol) => {
  const data = [];
  const now = endDate.getTime();
  const start = startDate.getTime();

  // Base price varies by symbol
  const basePrices = {
    'AAPL': 180,
    'GOOGL': 140,
    'MSFT': 380,
    'AMZN': 155,
    'TSLA': 240,
    'NVDA': 480,
    'META': 320,
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
    // Generate realistic price movement
    const volatility = basePrice * 0.02;
    const trend = (Math.random() - 0.48) * volatility;
    currentPrice = Math.max(currentPrice + trend, basePrice * 0.5);

    const open = currentPrice;
    const change = (Math.random() - 0.5) * volatility;
    const close = open + change;

    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;

    // Skip weekends for daily data
    const date = new Date(currentTime);
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (timeframe === '1day' && isWeekend) {
      currentTime += interval;
      continue;
    }

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
    '4hour': '60min', // Will need to aggregate
    '1day': 'daily',
  };

  const func = functionMap[timeframe];
  const interval = intervalMap[timeframe];

  try {
    const url = `https://www.alphavantage.co/query?function=${func}&symbol=${symbol}&interval=${interval}&apikey=${API_KEY}&outputsize=full`;
    const response = await fetch(url);
    const data = await response.json();

    if (data['Error Message'] || data['Note']) {
      console.error('API Error:', data);
      return null;
    }

    // Parse the response and convert to our format
    const timeSeriesKey = Object.keys(data).find(key => key.includes('Time Series'));
    if (!timeSeriesKey) {
      console.error('No time series data found');
      return null;
    }

    const timeSeries = data[timeSeriesKey];
    const parsedData = Object.entries(timeSeries)
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

    return parsedData;
  } catch (error) {
    console.error('Error fetching data:', error);
    return null;
  }
};

/**
 * Main function to fetch stock data
 * Will try real API first, fall back to mock data
 */
export const fetchStockData = async (symbol, timeframe, rangeType, customDates) => {
  const { startDate, endDate } = calculateDateRange(rangeType, customDates);

  // Try to fetch real data
  const realData = await fetchRealData(symbol, timeframe, startDate, endDate);

  if (realData && realData.length > 0) {
    return realData;
  }

  // Fall back to mock data
  console.log('Using mock data for', symbol);
  return generateMockData(startDate, endDate, timeframe, symbol);
};
