import React, { useState, useEffect } from 'react';
import api from '../services/api';

function AdminDashboard({ token: propToken, onLogout }) {
  const [users, setUsers] = useState([]);
  const [trips, setTrips] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      if (!propToken) {
        setError('No authentication token available.');
        console.error('No token found in props');
        return;
      }
      const [usersResponse, tripsResponse] = await Promise.all([
        api.get('/admin/users', { headers: { Authorization: `Bearer ${propToken}` } }),
        api.get('/admin/trips', { headers: { Authorization: `Bearer ${propToken}` } }),
      ]);
      setUsers(usersResponse.data);
      setTrips(tripsResponse.data);
    } catch (err) {
      setError('Failed to fetch data: ' + err.response?.data?.detail || err.message);
      console.error('Fetch error:', err);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!propToken) {
      setError('No authentication token available.');
      console.error('No token found in props for delete');
      return;
    }

    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        console.log(`Attempting to delete user with ID: ${userId}, Token: ${propToken.substring(0, 10)}...`);
        const response = await api.delete(`/admin/users/${userId}`, {
          headers: { Authorization: `Bearer ${propToken}` },
        });
        console.log('Delete response:', response.data);
        fetchData(); // Rafraîchir les données
      } catch (err) {
        setError('Failed to delete user: ' + err.response?.data?.detail || err.message);
        console.error('Delete error:', err.response || err);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto mt-10 p-4">
      <h2 className="text-2xl font-bold mb-4">Admin Dashboard</h2>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <h3 className="text-xl font-bold mb-2">Users</h3>
      {users.length === 0 ? (
        <p>No users found.</p>
      ) : (
        <ul className="list-disc pl-5">
          {users.map((user) => (
            <li key={user.id} className="mb-2">
              {user.email} ({user.role})
              <button
                onClick={() => handleDeleteUser(user.id)}
                className="ml-4 bg-red-500 text-white p-1 rounded"
                disabled={!propToken}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
      <h3 className="text-xl font-bold mb-2 mt-4">Trips</h3>
      {trips.length === 0 ? (
        <p>No trips found.</p>
      ) : (
        <ul className="list-disc pl-5">
          {trips.map((trip) => (
            <li key={trip.id}>
              {trip.departure_city} to {trip.destination} ({trip.available_seats} seats)
            </li>
          ))}
        </ul>
      )}
      <button onClick={onLogout} className="mt-4 bg-red-500 text-white p-2 rounded">Logout</button>
    </div>
  );
}

export default AdminDashboard;
