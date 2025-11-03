import './AddToPortfolio.css';

function AddToPortfolio({ symbol, onAddClick }) {
  return (
    <button className="add-to-portfolio-btn" onClick={onAddClick}>
      Add to Portfolio
    </button>
  );
}

export default AddToPortfolio;
