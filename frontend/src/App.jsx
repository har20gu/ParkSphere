import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Bill from './pages/Bill';
import Admin from './pages/Admin';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <Router>
        <ToastContainer position="top-right" autoClose={3000} />
        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Dashboard Route - Protected */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute allowedRoles={['guard', 'admin']}>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          
          {/* Bill Route - Protected */}
          <Route 
            path="/dashboard/bill/:id" 
            element={
              <ProtectedRoute allowedRoles={['guard', 'admin']}>
                <Bill />
              </ProtectedRoute>
            } 
          />
          
          {/* Admin Route - Protected */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Admin />
              </ProtectedRoute>
            } 
          />

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
