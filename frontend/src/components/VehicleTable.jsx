import React, { useState } from 'react';

const VehicleTable = ({ vehicles }) => {
  const [filter, setFilter] = useState('');

  const isOverdue = (entryTime, status) => {
    if (status !== 'IN') return false;
    const TEN_HOURS = 10 * 60 * 60 * 1000;
    return Date.now() - new Date(entryTime).getTime() >= TEN_HOURS;
  };

  const filteredVehicles = vehicles.filter(v => {
    const searchStr = `${v.vehicleNumber} ${v.ownerName || ''} ${v.phoneNumber || ''} ${v.purpose || ''} ${v.slot || ''}`.toLowerCase();
    return searchStr.includes(filter.toLowerCase());
  });

  return (
    <section className="card table-card">
      <div className="table-header">
        <h3>Vehicle Records</h3>
        <input 
          id="clientFilter" 
          type="text" 
          placeholder="Quick filter in table..." 
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      <div className="table-wrap">
        <table id="vehicleTable">
          <thead>
            <tr>
              <th>Number</th>
              <th>Owner</th>
              <th>Phone</th>
              <th>Purpose</th>
              <th>Slot</th>
              <th>Status</th>
              <th>Entry Time</th>
              <th>Exit Time</th>
              <th>Parked Hours</th>
              <th>Fee (Rs)</th>
              <th>Receipt</th>
            </tr>
          </thead>
          <tbody>
            {filteredVehicles.map(v => (
              <tr key={v._id} className={isOverdue(v.entryTime, v.status) ? 'row-overdue' : ''}>
                <td>{v.vehicleNumber}</td>
                <td>{v.ownerName}</td>
                <td>{v.phoneNumber || "-"}</td>
                <td>{v.purpose || "-"}</td>
                <td>{v.slot || "-"}</td>
                <td>
                  <span className={`status ${v.status === 'IN' ? 'status-in' : 'status-out'}`}>
                    {v.status}
                  </span>
                  {isOverdue(v.entryTime, v.status) && (
                    <span className="overdue-chip">Overdue &gt;10h</span>
                  )}
                </td>
                <td>{new Date(v.entryTime).toLocaleString()}</td>
                <td>{v.exitTime ? new Date(v.exitTime).toLocaleString() : "-"}</td>
                <td>{v.status === "OUT" ? (v.parkedHours || 0) : "-"}</td>
                <td>{v.status === "OUT" ? (v.parkingFee || 0) : "-"}</td>
                <td>
                  {v.status === "OUT" ? (
                    <a className="receipt-btn" href={`http://localhost:5000/dashboard/receipt/${v._id}`} target="_blank" rel="noreferrer">
                      Print Receipt
                    </a>
                  ) : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default VehicleTable;
