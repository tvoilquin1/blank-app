import { useState } from 'react';
import './StudiesSelector.css';

const StudiesSelector = ({ onStudyChange, currentStudy }) => {
  const studies = ['Gaussian', 'Study 2', 'Study 3'];

  return (
    <div className="studies-selector">
      <label className="studies-label">Studies:</label>
      <div className="studies-buttons">
        {studies.map((study) => (
          <button
            key={study}
            onClick={() => onStudyChange(study)}
            className={`study-btn ${currentStudy === study ? 'active' : ''}`}
          >
            {study}
          </button>
        ))}
      </div>
    </div>
  );
};

export default StudiesSelector;
