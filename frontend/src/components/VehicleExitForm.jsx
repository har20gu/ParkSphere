import React, { useState } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';

const VehicleExitForm = ({ activeVehicles, onSuccess }) => {
  const [vehicleNumber, setVehicleNumber] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/api/vehicle/exit', { vehicleNumber });
      toast.success('Vehicle marked as exited!');
      setVehicleNumber('');
      if (onSuccess) onSuccess();
      if (res.data.billId) {
        window.open(`/dashboard/bill/${res.data.billId}`, '_blank');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || error.response?.data || 'Error marking exit');
    }
  };

  return (
    <article className="card">
      <h3>Vehicle Exit</h3>
      <form id="exitForm" onSubmit={handleSubmit} className="form-stack">
        <label>
          Vehicle Number
          <input 
            name="vehicleNumber" 
            list="activeVehicleNumbers" 
            placeholder="RJ14AB1234" 
            required 
            value={vehicleNumber}
            onChange={(e) => setVehicleNumber(e.target.value)}
          />
        </label>
        <datalist id="activeVehicleNumbers">
          {activeVehicles.map(v => (
            <option key={v.vehicleNumber} value={v.vehicleNumber} />
          ))}
        </datalist>
        <p className="help-text">On submit, amount will be calculated first. Confirm after collecting money.</p>
        <button type="submit" className="danger-btn">Mark Exit</button>
      </form>
    </article>
  );
};

export default VehicleExitForm;
