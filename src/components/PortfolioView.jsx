import { useState, useEffect } from 'react';
import {
  getPortfolioEntries,
  deletePortfolioEntry,
  calculateCostBasis,
  calculateGainLoss,
  calculateGainLossPercent,
  calculatePortfolioPercent
} from '../utils/portfolioStorage';
import { getCurrentPrice } from '../utils/stockApi';
import './PortfolioView.css';

function PortfolioView({ currentPrices = {}, onEditEntry }) {
  const [entries, setEntries] = useState([]);
  const [sortBy, setSortBy] = useState('date'); // 'date', 'symbol', 'value'

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = () => {
    const portfolioEntries = getPortfolioEntries();
    setEntries(portfolioEntries);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
      deletePortfolioEntry(id);
      loadEntries();
    }
  };

  const getPrice = (symbol) => {
    return currentPrices[symbol] || getCurrentPrice(symbol);
  };

  const getSortedEntries = () => {
    const sorted = [...entries];
    switch (sortBy) {
      case 'symbol':
        return sorted.sort((a, b) => a.symbol.localeCompare(b.symbol));
      case 'value':
        return sorted.sort((a, b) => calculateCostBasis(b) - calculateCostBasis(a));
      case 'gainloss':
        return sorted.sort((a, b) => {
          const gainA = calculateGainLoss(a, getPrice(a.symbol));
          const gainB = calculateGainLoss(b, getPrice(b.symbol));
          return gainB - gainA;
        });
      case 'date':
      default:
        return sorted.sort((a, b) => {
          const dateA = new Date(a.purchaseDate.split('/').reverse().join('-'));
          const dateB = new Date(b.purchaseDate.split('/').reverse().join('-'));
          return dateB - dateA;
        });
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatPercent = (value) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const getTotalCostBasis = () => {
    return entries.reduce((sum, entry) => sum + calculateCostBasis(entry), 0);
  };

  const getTotalGainLoss = () => {
    return entries.reduce((sum, entry) => {
      const price = getPrice(entry.symbol);
      return sum + calculateGainLoss(entry, price);
    }, 0);
  };

  const sortedEntries = getSortedEntries();

  if (entries.length === 0) {
    return (
      <div className="portfolio-view">
        <div className="portfolio-header">
          <h2>My Portfolio</h2>
        </div>
        <div className="portfolio-empty">
          <p>Your portfolio is empty. Add stocks using the "Add to Portfolio" button on any chart.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="portfolio-view">
      <div className="portfolio-header">
        <h2>My Portfolio</h2>
        <div className="portfolio-stats">
          <div className="stat">
            <span className="stat-label">Total Holdings:</span>
            <span className="stat-value">{entries.length}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Total Cost Basis:</span>
            <span className="stat-value">{formatCurrency(getTotalCostBasis())}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Total Gain/Loss:</span>
            <span className={`stat-value ${getTotalGainLoss() >= 0 ? 'positive' : 'negative'}`}>
              {formatCurrency(getTotalGainLoss())}
            </span>
          </div>
        </div>
      </div>

      <div className="portfolio-controls">
        <label htmlFor="sort">Sort by:</label>
        <select id="sort" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="date">Purchase Date</option>
          <option value="symbol">Symbol</option>
          <option value="value">Cost Basis</option>
          <option value="gainloss">Gain/Loss</option>
        </select>
      </div>

      <div className="portfolio-table-container">
        <table className="portfolio-table">
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Purchase Date</th>
              <th>Purchase Price</th>
              <th>Quantity</th>
              <th>Cost Basis</th>
              <th>% of Account</th>
              <th>Current Price</th>
              <th>$ Gain/Loss</th>
              <th>% Gain/Loss</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedEntries.map((entry) => {
              const currentPrice = getPrice(entry.symbol);
              const costBasis = calculateCostBasis(entry);
              const gainLoss = calculateGainLoss(entry, currentPrice);
              const gainLossPercent = calculateGainLossPercent(entry, currentPrice);
              const portfolioPercent = calculatePortfolioPercent(entry, getTotalCostBasis());

              return (
                <tr key={entry.id}>
                  <td className="symbol-cell">{entry.symbol}</td>
                  <td>{entry.purchaseDate}</td>
                  <td>{formatCurrency(entry.purchasePrice)}</td>
                  <td>{entry.quantity}</td>
                  <td className="value-cell">{formatCurrency(costBasis)}</td>
                  <td>{portfolioPercent.toFixed(2)}%</td>
                  <td>{formatCurrency(currentPrice)}</td>
                  <td className={gainLoss >= 0 ? 'gain' : 'loss'}>
                    {formatCurrency(gainLoss)}
                  </td>
                  <td className={gainLossPercent >= 0 ? 'gain' : 'loss'}>
                    {formatPercent(gainLossPercent)}
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="edit-btn"
                        onClick={() => onEditEntry(entry)}
                        title="Edit entry"
                      >
                        Edit
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => handleDelete(entry.id)}
                        title="Delete entry"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PortfolioView;
