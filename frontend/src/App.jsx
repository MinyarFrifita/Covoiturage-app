import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Login from './components/Login';
import DriverDashboard from './components/DriverDashboard';
import PassengerDashboard from './components/PassengerDashboard';
import Home from './components/Home';
import NotFound from './components/NotFound';
import Register from './components/Register';
import AdminDashboard from './components/AdminDashboard';
import Profile from './components/Profile';
import api from './services/api';
import bg from './assets/Background.png';

class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="h-screen w-screen bg-cover bg-center bg-no-repeat flex items-center justify-center"
          style={{ backgroundImage: `url(${bg})` }}
          onError={(e) => {
            console.error('Background image failed to load:', e);
            e.target.style.backgroundImage = "url('https://via.placeholder.com/1920x1080')";
          }}
        >
          <h1 className="text-white text-center">Something went wrong. Please try again later.</h1>
        </div>
      );
    }
    return this.props.children;
  }
}

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
    console.log('App component mounted with token:', storedToken);
  }, []);

  useEffect(() => {
    const checkTokenExpiration = () => {
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (!payload || !payload.exp) {
            console.warn('Invalid token payload, clearing token');
            localStorage.removeItem('token');
            localStorage.removeItem('role');
            setToken(null);
            setUserRole(null);
            return;
          }
          const exp = payload.exp * 1000;
          if (exp < Date.now()) {
            console.log('Token expired, please log in again');
            localStorage.removeItem('token');
            localStorage.removeItem('role');
            setToken(null);
            setUserRole(null);
          }
        } catch (error) {
          console.error('Error decoding token:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('role');
          setToken(null);
          setUserRole(null);
        }
      }
    };
    checkTokenExpiration();
  }, [token]);

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
      <ErrorBoundary>
        <div
          className="h-screen w-screen bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${bg})` }}
          onError={(e) => {
            console.error('Background image failed to load:', e);
            e.target.style.backgroundImage = "url('https://via.placeholder.com/1920x1080')";
          }}
        >
          <Routes>
            <Route
              path="/"
              element={<Home token={token} userRole={userRole} onLogout={handleLogout} />}
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
              path="/driver-dashboard/create-trip"
              element={
                <ProtectedRoute requiredRole="driver">
                  <DriverDashboard token={token} onLogout={handleLogout} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/driver-dashboard/my-trips"
              element={
                <ProtectedRoute requiredRole="driver">
                  <DriverDashboard token={token} onLogout={handleLogout} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/driver-dashboard/trip-requests"
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
              path="/passenger-dashboard/available-trips"
              element={
                <ProtectedRoute requiredRole="passenger">
                  <PassengerDashboard token={token} onLogout={handleLogout} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/passenger-dashboard/my-trips"
              element={
                <ProtectedRoute requiredRole="passenger">
                  <PassengerDashboard token={token} onLogout={handleLogout} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/passenger-dashboard/request-a-trip"
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
            <Route
              path="/profile/:passengerId"
              element={
                <ProtectedRoute>
                  <Profile token={token} onLogout={handleLogout} />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </ErrorBoundary>
    </Router>
  );
}

export default App;
