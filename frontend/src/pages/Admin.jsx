import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../services/api';
import ThemeToggle from '../components/ThemeToggle';
import { toast } from 'react-toastify';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import '../assets/css/auth.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const Admin = () => {
  const { logout } = useContext(AuthContext);
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState({
    guards: [],
    metrics: { totalEntries: 0, exitedCount: 0, activeCount: 0, dailyRevenue: 0 },
    last7DaysEntries: [],
    selectedDate: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(true);
  
  const [guardName, setGuardName] = useState('');
  const [guardUsername, setGuardUsername] = useState('');
  const [guardPassword, setGuardPassword] = useState('');
  const [createdGuard, setCreatedGuard] = useState(null);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const date = searchParams.get('date') || '';
      const response = await api.get(`/api/admin?date=${date}`);
      setData(response.data);
    } catch (error) {
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
    // eslint-disable-next-line
  }, [searchParams]);

  const handleDateChange = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    setSearchParams({ date: formData.get('date') });
  };

  const handleCreateGuard = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/api/admin/guards', {
        name: guardName,
        username: guardUsername,
        password: guardPassword
      });
      setCreatedGuard(response.data.createdGuard);
      setGuardName('');
      setGuardUsername('');
      setGuardPassword('');
      toast.success('Guard created successfully.');
      fetchAdminData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Unable to create guard.');
    }
  };

  const handleResetPassword = async (id) => {
    if (!window.confirm("Are you sure you want to reset this guard's password?")) return;
    try {
      const response = await api.post(`/api/admin/guards/${id}/reset-password`);
      setCreatedGuard(response.data.createdGuard);
      toast.success('Guard password reset successfully.');
      fetchAdminData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Unable to reset password.');
    }
  };

  if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>Loading admin panel...</div>;

  const chartData = {
    labels: data.last7DaysEntries.map(item => 
      new Date(`${item.date}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })
    ),
    datasets: [
      {
        label: "Daily Entries",
        data: data.last7DaysEntries.map(item => item.entries),
        borderColor: "#6366f1",
        backgroundColor: "rgba(99, 102, 241, 0.2)", // fallback if gradient fails
        pointBackgroundColor: "#fff",
        pointBorderColor: "#6366f1",
        pointHoverBackgroundColor: "#f43f5e",
        pointHoverBorderColor: "#fff",
        pointRadius: 5,
        pointHoverRadius: 8,
        pointBorderWidth: 2,
        borderWidth: 4,
        tension: 0.4,
        fill: true
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      legend: { 
        display: true,
        labels: { font: { family: "'Outfit', sans-serif", size: 14 } }
      },
      tooltip: {
        backgroundColor: "rgba(15, 23, 42, 0.9)",
        titleFont: { family: "'Outfit', sans-serif", size: 14 },
        bodyFont: { family: "'Outfit', sans-serif", size: 14, weight: 'bold' },
        padding: 12,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          label: function(context) {
            return `🚗 ${context.parsed.y} Vehicles Entered`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { family: "'Outfit', sans-serif" } }
      },
      y: {
        beginAtZero: true,
        grid: { color: "rgba(0,0,0,0.05)" },
        ticks: { precision: 0, font: { family: "'Outfit', sans-serif" } }
      }
    }
  };

  return (
    <main className="admin-container">
      <header className="admin-header">
        <div>
          <h1>ParkSphere Admin Panel</h1>
          <p className="muted">Create guard accounts and monitor daily operations.</p>
        </div>
        <div className="actions">
          <ThemeToggle />
          <Link to={`/dashboard?date=${data.selectedDate}`}>Open Dashboard</Link>
          <button onClick={logout}>Logout</button>
        </div>
      </header>

      <section className="panel">
        <h2>Daily Summary</h2>
        <form onSubmit={handleDateChange} className="inline-form">
          <label>
            Date
            <input type="date" name="date" defaultValue={data.selectedDate} required />
          </label>
          <button type="submit">Load</button>
        </form>
        <div className="report-actions">
          <a href={`http://localhost:5000/admin/reports/csv?date=${data.selectedDate}`} target="_blank" rel="noreferrer">Download CSV</a>
          <a href={`http://localhost:5000/admin/reports/pdf?date=${data.selectedDate}`} target="_blank" rel="noreferrer">Download PDF</a>
        </div>
        <div className="metrics">
          <div><span>Entries</span><strong>{data.metrics.totalEntries}</strong></div>
          <div><span>Inside</span><strong>{data.metrics.activeCount}</strong></div>
          <div><span>Exited</span><strong>{data.metrics.exitedCount}</strong></div>
          <div><span>Revenue (Rs)</span><strong>{data.metrics.dailyRevenue}</strong></div>
        </div>
      </section>

      <section className="panel">
        <h2>Last 7 Days Entries</h2>
        <p className="muted">Track how many vehicles entered each day.</p>
        <div className="chart-wrap">
          <Line data={chartData} options={chartOptions} />
        </div>
      </section>

      <section className="panel">
        <h2>Register Guard</h2>
        <p className="muted">Leave username/password blank to auto-generate.</p>

        {createdGuard && (
          <div className="success">
            <p><strong>{createdGuard.isReset ? "Guard password reset successfully." : "Guard created successfully."}</strong></p>
            <p>Name: {createdGuard.name}</p>
            <p>Username: <strong>{createdGuard.username}</strong></p>
            <p>Password: <strong>{createdGuard.password}</strong></p>
            <p className="muted">Copy these once and share with guard.</p>
          </div>
        )}

        <form onSubmit={handleCreateGuard} className="stack">
          <label>
            Guard Name
            <input 
              name="name" 
              placeholder="Full name" 
              required 
              value={guardName} 
              onChange={e => setGuardName(e.target.value)} 
            />
          </label>
          <label>
            Username (optional)
            <input 
              name="username" 
              placeholder="Auto-generated if empty" 
              value={guardUsername} 
              onChange={e => setGuardUsername(e.target.value)} 
            />
          </label>
          <label>
            Password (optional)
            <input 
              name="password" 
              placeholder="Auto-generated if empty" 
              value={guardPassword} 
              onChange={e => setGuardPassword(e.target.value)} 
            />
          </label>
          <button type="submit">Create Guard</button>
        </form>
      </section>

      <section className="panel">
        <h2>Registered Guards</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Username</th>
              <th>Status</th>
              <th>Created</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {data.guards.map((guard) => (
              <tr key={guard._id}>
                <td>{guard.name}</td>
                <td>{guard.username}</td>
                <td>{guard.isActive ? "Active" : "Inactive"}</td>
                <td>{new Date(guard.createdAt).toLocaleString()}</td>
                <td>
                  <div className="inline-reset">
                    <button onClick={() => handleResetPassword(guard._id)}>Reset Password</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
};

export default Admin;
