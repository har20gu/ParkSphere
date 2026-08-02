import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import ThemeToggle from '../components/ThemeToggle';
import VehicleEntryForm from '../components/VehicleEntryForm';
import VehicleExitForm from '../components/VehicleExitForm';
import VehicleSearchForm from '../components/VehicleSearchForm';
import VehicleTable from '../components/VehicleTable';
import '../assets/css/dashboard.css';

const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState({
    vehicles: [],
    activeVehicles: [],
    slots: [],
    isSurge: false,
    selectedDate: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const date = searchParams.get('date') || '';
      const response = await api.get(`/api/dashboard?date=${date}`);
      setData(response.data);
    } catch (error) {
      console.error('Failed to load dashboard data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [searchParams]);

  const handleDateChange = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    setSearchParams({ date: formData.get('date') });
  };

  if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>Loading dashboard...</div>;

  const activeCount = data.vehicles.filter(v => v.status === "IN").length;
  const exitedCount = data.vehicles.filter(v => v.status === "OUT").length;
  const totalRevenue = data.vehicles.reduce((sum, v) => sum + (v.parkingFee || 0), 0);

  return (
    <main className="container">
      <header className="hero">
        <div>
          <p className="eyebrow">ParkSphere Security Portal</p>
          <h1>ParkSphere Dashboard</h1>
          <p className="subtitle">Manage entry, exit, and search from one place.</p>
          <p className="subtitle">Logged in as: <strong>{user?.name || user?.username || "Guard"}</strong></p>
        </div>
        <div className="hero-actions">
          <ThemeToggle />
          <button className="secondary-btn" onClick={fetchDashboardData}>Refresh</button>
          <button className="secondary-btn" onClick={logout}>Logout</button>
        </div>
      </header>

      {data.isSurge && (
        <div className="alert-surge">
          <strong>⚠️ Surge Pricing Active:</strong> The parking lot is currently busy (&gt;10 cars). A 25% price increase applies.
        </div>
      )}

      <section className="card date-filter-card">
        <form onSubmit={handleDateChange} className="date-filter-form">
          <label>
            View Date
            <input type="date" name="date" defaultValue={data.selectedDate} required />
          </label>
          <button type="submit" className="primary-btn">Show Daily Data</button>
        </form>
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <p>Total Records</p>
          <h2>{data.vehicles.length}</h2>
        </article>
        <article className="stat-card">
          <p>Currently Inside</p>
          <h2>{activeCount}</h2>
        </article>
        <article className="stat-card">
          <p>Exited</p>
          <h2>{exitedCount}</h2>
        </article>
        <article className="stat-card">
          <p>Total Revenue (Rs)</p>
          <h2>{totalRevenue}</h2>
        </article>
      </section>

      <section className="forms-grid">
        <VehicleEntryForm slots={data.slots} activeVehicles={data.activeVehicles} onSuccess={fetchDashboardData} />
        <VehicleExitForm activeVehicles={data.activeVehicles} onSuccess={fetchDashboardData} />
        <VehicleSearchForm selectedDate={data.selectedDate} />
      </section>

      <VehicleTable vehicles={data.vehicles} />
    </main>
  );
};

export default Dashboard;
