import React, { useState } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';

const VehicleEntryForm = ({ slots, activeVehicles, onSuccess }) => {
  const [formData, setFormData] = useState({
    vehicleNumber: '',
    ownerName: '',
    phoneNumber: '',
    purpose: '',
    slot: ''
  });

  const isBusy = (slot) => activeVehicles.some(v => v.slot === slot);

  const handleSlotClick = (slot) => {
    if (isBusy(slot)) return;
    setFormData({ ...formData, slot });
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.slot) {
      toast.error('Please select a parking slot.');
      return;
    }
    
    try {
      await api.post('/api/vehicle/entry', formData);
      toast.success('Vehicle entry marked successfully!');
      setFormData({ vehicleNumber: '', ownerName: '', phoneNumber: '', purpose: '', slot: '' });
      if (onSuccess) onSuccess();
    } catch (error) {
      toast.error(error.response?.data || 'Error marking entry');
    }
  };

  return (
    <article className="card">
      <h3>Vehicle Entry</h3>
      <form id="entryForm" onSubmit={handleSubmit} className="form-stack">
        <label>
          Vehicle Number
          <input
            id="entryVehicleNumber"
            name="vehicleNumber"
            placeholder="RJ14AB1234"
            pattern="[A-Za-z]{2}[0-9]{2}[A-Za-z]{2}[0-9]{4}"
            required
            value={formData.vehicleNumber}
            onChange={handleChange}
          />
        </label>
        <label>
          Owner Name
          <input 
            id="entryOwnerName" 
            name="ownerName" 
            placeholder="Owner Name" 
            required 
            value={formData.ownerName}
            onChange={handleChange}
          />
        </label>
        <label>
          Phone Number
          <input
            id="entryPhoneNumber"
            name="phoneNumber"
            placeholder="+91 98765 43210"
            pattern="[0-9+\-\s()]{10,20}"
            title="Use 10-15 digits. You can include +, space, dash, or brackets."
            required
            value={formData.phoneNumber}
            onChange={handleChange}
          />
        </label>
        <label>
          Purpose
          <input 
            id="entryPurpose" 
            name="purpose" 
            placeholder="Meeting / Delivery / Visitor" 
            required 
            value={formData.purpose}
            onChange={handleChange}
          />
        </label>
        <label>
          Parking Slot
          <input 
            id="entrySlot" 
            name="slot" 
            placeholder="Select from grid below" 
            readOnly 
            required 
            value={formData.slot}
          />
        </label>

        <div className="slots-grid">
          {slots.map(slot => {
            const busy = isBusy(slot);
            const selected = formData.slot === slot;
            let slotClass = busy ? 'busy' : 'available';
            if (selected) slotClass = 'selected';
            
            return (
              <div 
                key={slot}
                className={`parking-slot ${slotClass}`} 
                onClick={() => handleSlotClick(slot)}
              >
                {slot}
              </div>
            );
          })}
        </div>

        <p id="entryHint" className="help-text"></p>
        <button type="submit" className="primary-btn">Mark Entry</button>
      </form>
    </article>
  );
};

export default VehicleEntryForm;
