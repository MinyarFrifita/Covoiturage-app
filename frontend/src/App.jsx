import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import DriverDashboard from './components/DriverDashboard';
import PassengerDashboard from './components/PassengerDashboard';
import Home from './components/Home';
import NotFound from './components/NotFound';
import Register from './components/Register';
import AdminDashboard from './components/AdminDashboard';
import api from './services/api';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [userRole, setUserRole] = useState(localStorage.getItem('role'));

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedRole = localStorage.getItem('role');
    if (storedToken && storedRole) {
      setToken(storedToken);
      setUserRole(storedRole);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    setToken(null);
    setUserRole(null);
  };

  const ProtectedRoute = ({ children, requiredRole }) => {
    if (!token) {
      return <Navigate to="/login" replace />;
    }
    if (requiredRole && userRole !== requiredRole) {
      return <Navigate to="/login" replace />;
    }
    return children;
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Routes>
          <Route
            path="/"
            element={
              <Home token={token} userRole={userRole} onLogout={handleLogout} />
            }
          />
          <Route
            path="/login"
            element={!token ? <Login setToken={setToken} setUserRole={setUserRole} /> : <Navigate to="/" />}
          />
          <Route
            path="/register"
            element={!token ? <Register setToken={setToken} setUserRole={setUserRole} /> : <Navigate to="/" />}
          />
          <Route
            path="/driver-dashboard"
            element={
              <ProtectedRoute requiredRole="driver">
                <DriverDashboard token={token} onLogout={handleLogout} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/passenger-dashboard"
            element={
              <ProtectedRoute requiredRole="passenger">
                <PassengerDashboard token={token} onLogout={handleLogout} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin-dashboard"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard token={token} onLogout={handleLogout} />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
