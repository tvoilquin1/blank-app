import { useState } from 'react';
import './StudiesSelector.css';

const StudiesSelector = ({ onStudyChange, currentStudy }) => {
  const studies = ['Gaussian', 'Study 2', 'Study 3'];

  const handleStudyClick = (study) => {
    // Toggle study: if already active, deactivate it
    if (currentStudy === study) {
      onStudyChange(null);
    } else {
      onStudyChange(study);
    }
  };

  return (
    <div className="studies-selector">
      <label className="studies-label">Studies:</label>
      <div className="studies-buttons">
        {studies.map((study) => (
          <button
            key={study}
            onClick={() => handleStudyClick(study)}
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
