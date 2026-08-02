import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import '../assets/css/auth.css';

const Bill = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBill = async () => {
      try {
        const response = await api.get(`/api/bill/${id}`);
        setData(response.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Unable to load bill page.');
      } finally {
        setLoading(false);
      }
    };
    fetchBill();
  }, [id]);

  if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>Loading bill...</div>;

  if (error) {
    return (
      <main className="auth-wrap">
        <section className="auth-card">
          <p className="error">{error}</p>
          <Link to="/dashboard" className="primary-btn">Back to Dashboard</Link>
        </section>
      </main>
    );
  }

  const { vehicle, upiId, qrCodeDataUrl, upiPaymentLink } = data;

  return (
    <main className="auth-wrap">
      <section className="auth-card">
        <div className="auth-head">
          <span className="auth-badge">Payment</span>
          <h1>ParkSphere Exit Bill</h1>
          <p className="muted">Collect payment and confirm successful transaction before letting vehicle exit.</p>
        </div>

        <div className="stack">
          <label>
            Vehicle Number
            <input value={vehicle.vehicleNumber} readOnly />
          </label>
          <label>
            Owner Name
            <input value={vehicle.ownerName || '-'} readOnly />
          </label>
          <label>
            Parked Duration
            <input value={`${vehicle.parkedHours || 0} hour(s)`} readOnly />
          </label>
          <label>
            Total Amount (Rs)
            <input value={vehicle.parkingFee || 0} readOnly />
          </label>
        </div>

        {upiId && qrCodeDataUrl ? (
          <div className="bill-qr-wrap">
            <img src={qrCodeDataUrl} alt="UPI QR Code" className="bill-qr" />
            <p className="muted">Scan to pay via UPI</p>
            <p><strong>{upiId}</strong></p>
            <a href={upiPaymentLink} className="pay-link">Open UPI App</a>
          </div>
        ) : (
          <p className="error">UPI_ID not configured in .env. Please add it to display QR payment.</p>
        )}

        <div className="report-actions">
          <Link to="/dashboard">Back to Dashboard</Link>
          <a href={`http://localhost:5000/dashboard/receipt/${vehicle._id}`} target="_blank" rel="noreferrer">
            Download Receipt
          </a>
        </div>
      </section>
    </main>
  );
};

export default Bill;
