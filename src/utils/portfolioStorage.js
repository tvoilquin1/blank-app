// Portfolio data management using localStorage

const STORAGE_KEY = 'stock_portfolio';

/**
 * Get all portfolio entries from localStorage
 * @returns {Array} Array of portfolio entries
 */
export const getPortfolioEntries = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error reading portfolio from localStorage:', error);
    return [];
  }
};

/**
 * Add a new portfolio entry
 * @param {Object} entry - Portfolio entry object
 * @param {string} entry.symbol - Stock ticker symbol
 * @param {number} entry.purchasePrice - Price per share
 * @param {string} entry.purchaseDate - Date in MM/DD/YYYY format
 * @param {number} entry.quantity - Number of shares
 * @returns {boolean} Success status
 */
export const addPortfolioEntry = (entry) => {
  try {
    const entries = getPortfolioEntries();
    const newEntry = {
      ...entry,
      id: Date.now().toString(), // Simple unique ID
      createdAt: new Date().toISOString(),
    };
    entries.push(newEntry);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    return true;
  } catch (error) {
    console.error('Error adding portfolio entry:', error);
    return false;
  }
};

/**
 * Update an existing portfolio entry
 * @param {string} id - Entry ID to update
 * @param {Object} updatedEntry - Updated entry data
 * @returns {boolean} Success status
 */
export const updatePortfolioEntry = (id, updatedEntry) => {
  try {
    const entries = getPortfolioEntries();
    const index = entries.findIndex(entry => entry.id === id);

    if (index === -1) {
      console.error('Entry not found:', id);
      return false;
    }

    // Keep the original id and createdAt, update everything else
    entries[index] = {
      ...entries[index],
      ...updatedEntry,
      id: entries[index].id,
      createdAt: entries[index].createdAt,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    return true;
  } catch (error) {
    console.error('Error updating portfolio entry:', error);
    return false;
  }
};

/**
 * Delete a portfolio entry by ID
 * @param {string} id - Entry ID to delete
 * @returns {boolean} Success status
 */
export const deletePortfolioEntry = (id) => {
  try {
    const entries = getPortfolioEntries();
    const filtered = entries.filter(entry => entry.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Error deleting portfolio entry:', error);
    return false;
  }
};

/**
 * Get portfolio entries for a specific symbol
 * @param {string} symbol - Stock ticker symbol
 * @returns {Array} Array of entries for the symbol
 */
export const getEntriesBySymbol = (symbol) => {
  const entries = getPortfolioEntries();
  return entries.filter(entry => entry.symbol.toUpperCase() === symbol.toUpperCase());
};

/**
 * Calculate cost basis (total investment) for an entry
 * @param {Object} entry - Portfolio entry
 * @returns {number} Cost basis amount
 */
export const calculateCostBasis = (entry) => {
  return entry.purchasePrice * entry.quantity;
};

/**
 * Calculate gain/loss for an entry
 * @param {Object} entry - Portfolio entry
 * @param {number} currentPrice - Current stock price
 * @returns {number} Dollar gain/loss
 */
export const calculateGainLoss = (entry, currentPrice) => {
  if (!currentPrice) return 0;
  const currentValue = currentPrice * entry.quantity;
  const costBasis = calculateCostBasis(entry);
  return currentValue - costBasis;
};

/**
 * Calculate percentage gain/loss for an entry
 * @param {Object} entry - Portfolio entry
 * @param {number} currentPrice - Current stock price
 * @returns {number} Percentage gain/loss
 */
export const calculateGainLossPercent = (entry, currentPrice) => {
  if (!currentPrice) return 0;
  const costBasis = calculateCostBasis(entry);
  if (costBasis === 0) return 0;
  const gainLoss = calculateGainLoss(entry, currentPrice);
  return (gainLoss / costBasis) * 100;
};

/**
 * Calculate percentage of total portfolio
 * @param {Object} entry - Portfolio entry
 * @param {number} totalCostBasis - Total cost basis of all entries
 * @returns {number} Percentage of portfolio
 */
export const calculatePortfolioPercent = (entry, totalCostBasis) => {
  if (totalCostBasis === 0) return 0;
  const costBasis = calculateCostBasis(entry);
  return (costBasis / totalCostBasis) * 100;
};

// Keep old function for backward compatibility
export const calculateTotalInvestment = calculateCostBasis;
