import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function Register({ setToken, setUserRole }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('passenger');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {

      const registerResponse = await api.post('/auth/register', { email, password, role }, {
        headers: { 'Content-Type': 'application/json' },
      });
      console.log('Register response:', registerResponse.data);

      const tokenResponse = await api.post('/auth/token', { username: email, password }, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      const accessToken = tokenResponse.data.access_token;
      localStorage.setItem('token', accessToken);

      const userRoleResponse = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const confirmedRole = userRoleResponse.data.role;
      localStorage.setItem('role', confirmedRole);
      setToken(accessToken);
      setUserRole(confirmedRole);

      navigate('/');
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Registration or login failed.';
      setError(errorMessage);
      console.error('Error:', err);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10">
      <h2 className="text-2xl font-bold mb-4">Register</h2>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full p-2 border rounded"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full p-2 border rounded"
          required
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full p-2 border rounded"
        >
          <option value="passenger">Passenger</option>
          <option value="driver">Driver</option>
          <option value="admin">Admin</option>
        </select>
        <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded">Register</button>
      </form>
    </div>
  );
}

export default Register;
