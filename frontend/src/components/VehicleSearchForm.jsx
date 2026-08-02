import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const VehicleSearchForm = ({ selectedDate }) => {
  const [number, setNumber] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    navigate(`/dashboard/search?number=${encodeURIComponent(number)}&date=${encodeURIComponent(selectedDate)}`);
  };

  return (
    <article className="card">
      <h3>Search Vehicle</h3>
      <form onSubmit={handleSubmit} className="form-stack">
        <label>
          Number
          <input 
            name="number" 
            placeholder="Enter full or partial number" 
            required 
            value={number}
            onChange={(e) => setNumber(e.target.value)}
          />
        </label>
        <button type="submit" className="primary-btn">Search</button>
      </form>
    </article>
  );
};

export default VehicleSearchForm;
