/**
 * Gaussian Channel Indicator
 * Ported from TradingView Pine Script
 *
 * This implements a recursive Gaussian filter where each output
 * depends on previous outputs (IIR filter), not just inputs
 */

/**
 * Recursive Gaussian filter implementation (9-pole)
 * Based on the Pine Script f_filt9x function
 *
 * The key insight: this creates 9 separate single-pole filters,
 * not one 9-pole recursive filter. Each pole is calculated independently.
 */
function calculateRecursiveFilter(alpha, sourceArray, poles) {
  if (poles < 1 || poles > 9) poles = 4;

  // Calculate each pole filter separately
  let filtered = [...sourceArray];

  for (let pole = 1; pole <= poles; pole++) {
    const temp = new Array(filtered.length);
    const x = 1 - alpha;

    for (let i = 0; i < filtered.length; i++) {
      if (i === 0) {
        // First value - no previous filter output
        temp[i] = alpha * filtered[i];
      } else {
        // Single-pole IIR filter: output = alpha * input + (1-alpha) * previous_output
        temp[i] = alpha * filtered[i] + x * temp[i - 1];
      }
    }

    filtered = temp;
  }

  return filtered;
}

/**
 * Calculate True Range for each candle
 */
function calculateTrueRange(data) {
  const tr = new Array(data.length).fill(0);

  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      tr[i] = data[i].high - data[i].low;
    } else {
      const highLow = data[i].high - data[i].low;
      const highClose = Math.abs(data[i].high - data[i - 1].close);
      const lowClose = Math.abs(data[i].low - data[i - 1].close);
      tr[i] = Math.max(highLow, highClose, lowClose);
    }
  }

  return tr;
}

/**
 * Calculate Gaussian Channel
 * @param {Array} data - OHLC candlestick data [{time, open, high, low, close}]
 * @param {Object} options - Configuration options
 * @returns {Object} Gaussian Channel data
 */
export function calculateGaussianChannel(data, options = {}) {
  const {
    poles = 4,
    period = 144,
    multiplier = 1.414,
    reducedLag = false,
    fastResponse = false
  } = options;

  if (!data || data.length === 0) {
    return { filter: [], upperBand: [], lowerBand: [], colors: [] };
  }

  // Calculate beta and alpha (same as Pine Script)
  const beta = (1 - Math.cos(4 * Math.asin(1) / period)) /
               (Math.pow(1.414, 2 / poles) - 1);
  const alpha = -beta + Math.sqrt(Math.pow(beta, 2) + 2 * beta);

  // Validate alpha is in valid range (0, 1)
  if (alpha <= 0 || alpha >= 1 || !isFinite(alpha)) {
    console.error('Invalid alpha value:', alpha, 'beta:', beta);
    return { filter: [], upperBand: [], lowerBand: [], colors: [] };
  }

  console.log('Gaussian Channel params - poles:', poles, 'period:', period, 'alpha:', alpha, 'beta:', beta);

  // Calculate lag for reduced lag mode
  const lag = Math.floor((period - 1) / (2 * poles));

  // Extract HLC3 (typical price) from data
  const hlc3 = data.map(d => (d.high + d.low + d.close) / 3);

  // Apply lag if in reduced lag mode
  let sourceData = hlc3;
  if (reducedLag && lag > 0) {
    sourceData = hlc3.map((value, i) => {
      if (i >= lag) {
        return value + (value - hlc3[i - lag]);
      }
      return value;
    });
  }

  // Calculate true range
  const tr = calculateTrueRange(data);

  // Apply lag to true range if in reduced lag mode
  let trData = tr;
  if (reducedLag && lag > 0) {
    trData = tr.map((value, i) => {
      if (i >= lag) {
        return value + (value - tr[i - lag]);
      }
      return value;
    });
  }

  // Apply Gaussian filter (recursive IIR filter)
  const filteredMain = calculateRecursiveFilter(alpha, sourceData, poles);
  const filteredTR = calculateRecursiveFilter(alpha, trData, poles);

  // Fast response mode uses average of N-pole and 1-pole filters
  let filter = filteredMain;
  let filteredTrueRange = filteredTR;

  if (fastResponse && poles > 1) {
    const filtered1Pole = calculateRecursiveFilter(alpha, sourceData, 1);
    const filteredTR1Pole = calculateRecursiveFilter(alpha, trData, 1);

    filter = filteredMain.map((v, i) => (v + filtered1Pole[i]) / 2);
    filteredTrueRange = filteredTR.map((v, i) => (v + filteredTR1Pole[i]) / 2);
  }

  // Calculate bands
  const upperBand = filter.map((f, i) => f + filteredTrueRange[i] * multiplier);
  const lowerBand = filter.map((f, i) => f - filteredTrueRange[i] * multiplier);

  // Prepare output with time stamps
  const filterLine = data.map((d, i) => ({ time: d.time, value: filter[i] }));
  const upperBandLine = data.map((d, i) => ({ time: d.time, value: upperBand[i] }));
  const lowerBandLine = data.map((d, i) => ({ time: d.time, value: lowerBand[i] }));

  // Determine color (green if filter trending up, red if trending down)
  const colors = filter.map((f, i) => {
    if (i === 0) return '#0aff68';
    return f > filter[i - 1] ? '#0aff68' : '#ff0a5a';
  });

  return {
    filter: filterLine,
    upperBand: upperBandLine,
    lowerBand: lowerBandLine,
    colors: colors,
    rawFilter: filter,
    rawUpperBand: upperBand,
    rawLowerBand: lowerBand
  };
}

/**
 * Default Gaussian Channel options
 */
export const DEFAULT_GAUSSIAN_OPTIONS = {
  poles: 4,
  period: 144,
  multiplier: 1.414,
  reducedLag: false,
  fastResponse: false
};
