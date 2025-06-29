import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import bg from '../assets/Background.png';

function AdminDashboard({ token: propToken, onLogout, currentAdmin }) {
  const [users, setUsers] = useState([]);
  const [trips, setTrips] = useState([]);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('users');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      if (!propToken) {
        setError('No authentication token available.');
        return;
      }
      const [usersResponse, tripsResponse] = await Promise.all([
        api.get('/admin/users', { headers: { Authorization: `Bearer ${propToken}` } }),
        api.get('/admin/trips', { headers: { Authorization: `Bearer ${propToken}` } }),
      ]);
      // Filtrer l'admin de la liste des utilisateurs
      setUsers(usersResponse.data.filter(user => user.email !== "admin@gmail.com"));
      setTrips(tripsResponse.data);
    } catch (err) {
      setError('Failed to fetch data: ' + err.response?.data?.detail || err.message);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      await api.delete(`/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${propToken}` },
      });
      fetchData();
    } catch (err) {
      setError('Failed to delete user: ' + err.response?.data?.detail || err.message);
    }
  };

  // Filtrer les données selon le terme de recherche
  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTrips = trips.filter(trip => 
    trip.departure_city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    trip.destination.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div
      className="h-screen w-screen bg-cover bg-center bg-no-repeat bg-fixed flex flex-col"
      style={{
        backgroundImage: `url(${bg})`,
      }}
      onError={(e) => {
        console.error('Background image failed to load:', e);
        e.target.style.backgroundImage = "url('https://via.placeholder.com/1920x1080')";
      }}
    >
      {/* Overlay semi-transparent */}
      <div className="flex-1 bg-black bg-opacity-50 flex items-center justify-center p-4 overflow-auto">
        <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-4xl mx-4">
          {/* Header */}
          <div className="bg-blue-600 text-white p-4 rounded-t-lg">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              <div className="flex items-center space-x-4">
                
                <button 
                  onClick={onLogout}
                  className="bg-white text-blue-600 px-4 py-2 rounded hover:bg-blue-50 transition"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="p-4">
            {/* Search and Tabs */}
            <div className="mb-6">
              <div className="flex flex-col md:flex-row justify-between items-center mb-4">
                <div className="flex space-x-2 mb-4 md:mb-0">
                  <button
                    className={`px-4 py-2 rounded ${activeTab === 'users' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                    onClick={() => setActiveTab('users')}
                  >
                    Users
                  </button>
                  <button
                    className={`px-4 py-2 rounded ${activeTab === 'trips' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                    onClick={() => setActiveTab('trips')}
                  >
                    Trips
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Search..."
                  className="border p-2 rounded w-full md:w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Users Tab */}
              {activeTab === 'users' && (
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="py-2 px-4 border">Email</th>
                        <th className="py-2 px-4 border">Role</th>
                        <th className="py-2 px-4 border">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan="3" className="py-4 text-center">No users found</td>
                        </tr>
                      ) : (
                        filteredUsers.map(user => (
                          <tr key={user.id} className="hover:bg-gray-50">
                            <td className="py-2 px-4 border">{user.email}</td>
                            <td className="py-2 px-4 border">{user.role}</td>
                            <td className="py-2 px-4 border">
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Trips Tab */}
              {activeTab === 'trips' && (
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="py-2 px-4 border">From</th>
                        <th className="py-2 px-4 border">To</th>
                        <th className="py-2 px-4 border">Seats</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTrips.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="py-4 text-center">No trips found</td>
                        </tr>
                      ) : (
                        filteredTrips.map(trip => (
                          <tr key={trip.id} className="hover:bg-gray-50">
                            <td className="py-2 px-4 border">{trip.departure_city}</td>
                            <td className="py-2 px-4 border">{trip.destination}</td>
                            <td className="py-2 px-4 border">{trip.available_seats}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold">Total Users</h3>
                <p className="text-2xl">{users.length}</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold">Total Trips</h3>
                <p className="text-2xl">{trips.length}</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold">Active Today</h3>
                <p className="text-2xl">0</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
