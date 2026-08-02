import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Navigate } from 'react-router-dom';
import '../assets/css/auth.css';

const Login = () => {
  const { user, login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [role, setRole] = useState('guard');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  
  if (user) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const data = await login(role, username, password);
      if (data.error) {
        setError(data.error);
      } else {
        navigate(data.user.role === 'admin' ? '/admin' : '/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Try again.');
    }
  };

  return (
    <main className="auth-wrap">
      <section className="auth-card">
        <div className="auth-head">
          <span className="auth-badge">Secure Access</span>
          <h1>ParkSphere Login</h1>
          <p className="muted">Login as guard to access dashboard, or as admin to manage guards.</p>
        </div>

        {error && (
          <p className="error">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="stack">
          <label>
            Role
            <select name="role" value={role} onChange={(e) => setRole(e.target.value)} required>
              <option value="guard">Guard</option>
              <option value="admin">Admin</option>
            </select>
          </label>

          <label>
            Username
            <input 
              name="username" 
              placeholder="Enter username" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required 
            />
          </label>

          <label>
            Password
            <input 
              type="password" 
              name="password" 
              placeholder="Enter password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </label>

          <button type="submit">Login</button>
        </form>

        <p className="auth-note">Only authorized staff can access this portal.</p>
      </section>
    </main>
  );
};

export default Login;
