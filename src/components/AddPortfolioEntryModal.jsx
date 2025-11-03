import { useState } from 'react';
import './AddPortfolioEntryModal.css';

function AddPortfolioEntryModal({ symbol, onClose, onSave }) {
  const [formData, setFormData] = useState({
    purchasePrice: '',
    purchaseDate: '',
    quantity: '',
  });

  const [errors, setErrors] = useState({});

  const parseAndValidateDate = (dateString) => {
    // Accept flexible formats: M/D/YYYY, MM/DD/YYYY, M/D/YY, MM/DD/YY
    const dateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/;
    const match = dateString.match(dateRegex);

    if (!match) {
      return { error: 'Date must be in M/D/YYYY or MM/DD/YY format (e.g., 3/1/2025 or 03/01/25)' };
    }

    let [, month, day, year] = match.map(Number);

    // Convert 2-digit year to 4-digit year
    if (year < 100) {
      // Assume years 00-49 are 2000-2049, and 50-99 are 1950-1999
      year = year < 50 ? 2000 + year : 1900 + year;
    }

    // Validate month and day ranges
    if (month < 1 || month > 12) {
      return { error: 'Month must be between 1 and 12' };
    }

    if (day < 1 || day > 31) {
      return { error: 'Day must be between 1 and 31' };
    }

    // Create date object and validate it's a real date
    const date = new Date(year, month - 1, day);

    if (date.getMonth() + 1 !== month || date.getDate() !== day || date.getFullYear() !== year) {
      return { error: 'Invalid date' };
    }

    if (date > new Date()) {
      return { error: 'Purchase date cannot be in the future' };
    }

    // Return the standardized DD/MM/YYYY format
    const standardizedDate = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
    return { date: standardizedDate, error: null };
  };

  const validateForm = () => {
    const newErrors = {};

    // Validate purchase price
    const price = parseFloat(formData.purchasePrice);
    if (!formData.purchasePrice || isNaN(price) || price <= 0) {
      newErrors.purchasePrice = 'Purchase price must be a positive number';
    }

    // Validate purchase date
    const dateValidation = parseAndValidateDate(formData.purchaseDate);
    if (dateValidation.error) {
      newErrors.purchaseDate = dateValidation.error;
    }

    // Validate quantity
    const quantity = parseInt(formData.quantity);
    if (!formData.quantity || isNaN(quantity) || quantity <= 0 || !Number.isInteger(quantity)) {
      newErrors.quantity = 'Quantity must be a positive whole number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0 ? dateValidation : null;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const dateValidation = validateForm();
    if (dateValidation && dateValidation.date) {
      const entry = {
        symbol: symbol.toUpperCase(),
        purchasePrice: parseFloat(formData.purchasePrice),
        purchaseDate: dateValidation.date, // Use standardized DD/MM/YYYY format
        quantity: parseInt(formData.quantity),
      };
      onSave(entry);
    }
  };

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: null });
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target.className === 'modal-overlay') {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content">
        <div className="modal-header">
          <h2>Add {symbol} to Portfolio</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="purchasePrice">Purchase Price ($)</label>
            <input
              type="text"
              id="purchasePrice"
              value={formData.purchasePrice}
              onChange={(e) => handleChange('purchasePrice', e.target.value)}
              placeholder="150.00"
              className={errors.purchasePrice ? 'error' : ''}
            />
            {errors.purchasePrice && <span className="error-message">{errors.purchasePrice}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="purchaseDate">Purchase Date</label>
            <input
              type="text"
              id="purchaseDate"
              value={formData.purchaseDate}
              onChange={(e) => handleChange('purchaseDate', e.target.value)}
              placeholder="3/1/2025 or 03/01/25"
              className={errors.purchaseDate ? 'error' : ''}
            />
            {errors.purchaseDate && <span className="error-message">{errors.purchaseDate}</span>}
            <span className="field-hint">Accepts: M/D/YYYY, MM/DD/YY (displays as DD/MM/YYYY)</span>
          </div>

          <div className="form-group">
            <label htmlFor="quantity">Quantity (shares)</label>
            <input
              type="text"
              id="quantity"
              value={formData.quantity}
              onChange={(e) => handleChange('quantity', e.target.value)}
              placeholder="100"
              className={errors.quantity ? 'error' : ''}
            />
            {errors.quantity && <span className="error-message">{errors.quantity}</span>}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-save">Add to Portfolio</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddPortfolioEntryModal;
