import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import bg from '/home/Minyar/covoiturage-app/frontend/src/assets/Background.png'; 

function Register({ setToken, setUserRole }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'passenger'
  });
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // 1. Registration
      await api.post('/auth/register', {
        email: formData.email,
        password: formData.password,
        role: formData.role
      }, {
        headers: { 'Content-Type': 'application/json' },
      });

      // 2. Login after registration
      const tokenResponse = await api.post('/auth/token', 
        `username=${encodeURIComponent(formData.email)}&password=${encodeURIComponent(formData.password)}`,
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );

      const accessToken = tokenResponse.data.access_token;
      
      // 3. Get user role
      const userRoleResponse = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      // Save to state and storage
      localStorage.setItem('token', accessToken);
      localStorage.setItem('role', userRoleResponse.data.role);
      setToken(accessToken);
      setUserRole(userRoleResponse.data.role);

      navigate('/');
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 
                         err.response?.data?.message || 
                         err.message || 
                         'Registration failed. Please try again.';
      setError(errorMessage);
      console.error('Registration error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="h-screen w-screen bg-cover bg-center bg-no-repeat bg-fixed flex flex-col"
      style={{ backgroundImage: `url(${bg})` }}
    >
      {/* Overlay semi-transparent */}
      <div className="flex-1 bg-black bg-opacity-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Create Account</h2>
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-gray-700 text-sm font-medium mb-1">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your@email.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-gray-700 text-sm font-medium mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                minLength="6"
                autoComplete="new-password"
              />
            </div>

            <div>
              <label htmlFor="role" className="block text-gray-700 text-sm font-medium mb-1">
                Account Type
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="passenger">Passenger</option>
                <option value="driver">Driver</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-2 px-4 rounded-md text-white font-medium ${
                isLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isLoading ? 'Creating account...' : 'Register'}
            </button>
          </form>

          <div className="mt-4 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <a href="/login" className="text-blue-600 hover:underline">
              Login here
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
