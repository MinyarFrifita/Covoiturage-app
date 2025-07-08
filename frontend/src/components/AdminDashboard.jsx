import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  ResponsiveContainer,
} from 'recharts';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import api from '../services/api';
import './AdminDashboard.css';
import bg from '/home/Minyar/covoiturage-app/frontend/src/assets/Background.png';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];
const defaultBg = 'https://via.placeholder.com/1920x1080';

const AdminDashboard = ({ token, onLogout, currentAdmin }) => {
  const [state, setState] = useState({
    users: [],
    trips: [],
    stats: {},
    notifications: [],
    loading: true,
    error: null,
    activeTab: 0,
    searchTerm: '',
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-12-31'),
  });

  const formatDate = (dateObj) => dateObj.toISOString().split('T')[0];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        const headers = { headers: { Authorization: `Bearer ${token}` } };
        const params = { start_date: formatDate(state.startDate), end_date: formatDate(state.endDate) };

        const [usersRes, statsRes, tripsRes, notificationsRes] = await Promise.all([
          api.get('/admin/users', headers),
          api.get('/admin/stats', headers),
          api.get('/admin/trips', { ...headers, params }).catch((e) => ({ data: [] })),
          api.get('/notifications/', headers),
        ]);

        console.log('Trips data structure:', tripsRes.data); // Débogage
        setState((prev) => ({
          ...prev,
          users: usersRes.data.filter((u) => u.email !== 'admin@gmail.com'),
          trips: tripsRes.data,
          stats: statsRes.data,
          notifications: notificationsRes.data,
          loading: false,
        }));
      } catch (err) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err.response?.data?.detail || err.message,
        }));
      }
    };

    fetchData();
  }, [token, state.startDate, state.endDate]);

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Confirm user deletion?')) return;
    try {
      await api.delete(`/admin/users/${userId}`, { headers: { Authorization: `Bearer ${token}` } });
      setState((prev) => ({
        ...prev,
        users: prev.users.filter((user) => user.id !== userId),
        loading: false,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err.response?.data?.detail || err.message,
      }));
    }
  };

  const filteredUsers = state.users.filter(
    (user) =>
      user.email.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
      (user.role && user.role.toLowerCase().includes(state.searchTerm.toLowerCase()))
  );

  const filteredTrips = state.trips.filter(
    (trip) =>
      trip.departure_city.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
      trip.destination.toLowerCase().includes(state.searchTerm.toLowerCase())
  );

  const userRolesData = state.users.reduce((acc, user) => {
    const role = user.role || 'unknown';
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {});

  const roleChartData = Object.entries(userRolesData).map(([name, value]) => ({ name, value }));

  const totalTrips = state.stats.total_trips || 0;
  const newUsersThisWeek = state.stats.new_users_week || 0;
  const recentTripsThisWeek = state.stats.recent_trips_week || 0;
  const totalAvailableSeats = state.trips.reduce((sum, trip) => sum + (trip.available_seats || 0), 0);
  const averagePrice =
    state.trips.length > 0
      ? state.trips.reduce((sum, trip) => sum + (trip.price || 0), 0) / state.trips.length
      : 0;

  if (state.loading) return <div className="loading">Loading...</div>;

  return (
    <div
      className="h-screen w-screen bg-cover bg-center bg-no-repeat bg-fixed flex flex-col"
      style={{ backgroundImage: `url(${bg})` }}
      onError={(e) => {
        console.error('Background image failed to load:', e);
        e.target.style.backgroundImage = `url(${defaultBg})`;
      }}
    >
      <div className="flex-1 bg-black bg-opacity-50 flex flex-col p-4 overflow-auto mb-16">
        <div className="max-w-4xl mx-auto mt-10">
          <header>
            <h1 className="text-white font-bold mb-4 text-5xl">Admin Dashboard</h1>
            <div className="admin-actions">
              <span className="text-white font-bold ">WELCOME</span>
              <button onClick={onLogout} className="text-blue font-bold">
                Logout
              </button>
            </div>
          </header>

          <div className="controls">
            <div className="date-range">
              <DatePicker
                selected={state.startDate}
                onChange={(date) => setState((prev) => ({ ...prev, startDate: date }))}
                selectsStart
                startDate={state.startDate}
                endDate={state.endDate}
                className="date-picker"
              />
              <DatePicker
                selected={state.endDate}
                onChange={(date) => setState((prev) => ({ ...prev, endDate: date }))}
                selectsEnd
                startDate={state.startDate}
                endDate={state.endDate}
                minDate={state.startDate}
                className="date-picker"
              />
            </div>
            <input
              type="text"
              placeholder="Search..."
              value={state.searchTerm}
              onChange={(e) => setState((prev) => ({ ...prev, searchTerm: e.target.value }))}
              className="search-input"
            />
          </div>

          {state.error && <div className="error">{state.error}</div>}

          <div className="stats-grid">
            <div className="stat-card">
              <h3 className="text-gray-300">Total Users</h3>
              <p className="text-white">{state.stats.total_users || 0}</p>
              <small className="text-green-300">+{newUsersThisWeek} this week</small>
            </div>
            <div className="stat-card">
              <h3 className="text-gray-300">Total Trips</h3>
              <p className="text-white">{totalTrips}</p>
              <small className="text-green-300">+{recentTripsThisWeek} this week</small>
            </div>
            <div className="stat-card">
              <h3 className="text-gray-300">Available Seats</h3>
              <p className="text-white">{totalAvailableSeats}</p>
              <small className="text-gray-500">Total across all trips</small>
            </div>
            <div className="stat-card">
              <h3 className="text-gray-300">Average Price</h3>
              <p className="text-white">{averagePrice.toFixed(2)} dt</p>
              <small className="text-gray-500">Per trip</small>
            </div>
          </div>

          <Tabs selectedIndex={state.activeTab} onSelect={(index) => setState((prev) => ({ ...prev, activeTab: index }))}>
            <TabList>
              <Tab>Overview</Tab>
              <Tab>Users ({state.users.length})</Tab>
              <Tab>Trips ({state.trips.length})</Tab>

            </TabList>

            <TabPanel>
              <div className="charts">
                <div className="chart-container">
                  <h3 className="text-gray-300">User Roles</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={roleChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label
                      >
                        {roleChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="chart-container">
                  <h3 className="text-gray-300">Trips by Week</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={[{ name: 'This Week', value: recentTripsThisWeek }, { name: 'Total', value: totalTrips }]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </TabPanel>

            <TabPanel>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="text-center text-gray-300">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id}>
                        <td>{user.email || 'N/A'}</td>
                        <td>{user.role || 'N/A'}</td>
                        <td>
                          <button onClick={() => handleDeleteUser(user.id)} className="delete-btn">
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </TabPanel>

            <TabPanel>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>From</th>
                    <th>To</th>
                    <th>Date</th>
                    <th>Return Date</th>
                    <th>Seats</th>
                    <th>Price</th>
                    <th>Car Type</th>
                    <th>Description</th>
                    <th>driver Sexe</th>
                    <th>Driver Email</th>
                    <th>Driver Photo</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrips.length === 0 ? (
                    <tr>
                      <td colSpan="11" className="text-center text-gray-300">
                        No trips available in the selected date range
                      </td>
                    </tr>
                  ) : (
                    filteredTrips.map((trip) => (
                      <tr key={trip.id} className="hover:bg-gray-50">
                        <td className="py-2 px-4 border">{trip.departure_city || 'N/A'}</td>
                        <td className="py-2 px-4 border">{trip.destination || 'N/A'}</td>
                        <td className="py-2 px-4 border">
                          {trip.date_time ? new Date(trip.date_time).toLocaleString() : 'N/A'}
                        </td>
                        <td className="py-2 px-4 border">
                          {trip.return_date ? new Date(trip.return_date).toLocaleString() : 'N/A'}
                        </td>
                        <td className="py-2 px-4 border">{trip.available_seats || 'N/A'}</td>
                        <td className="py-2 px-4 border">
                          {trip.price ? `${trip.price} dt` : 'N/A'}
                        </td>
                        <td className="py-2 px-4 border">{trip.car_type || 'N/A'}</td>
                        <td className="py-2 px-4 border">{trip.description || 'N/A'}</td>
                        <td className="py-2 px-4 border">{trip.sexe || 'N/A'}</td>
                        <td className="py-2 px-4 border">{trip.driver_email || 'N/A'}</td>
                        <td className="py-2 px-4 border">
                          {trip.driver_photo ? (
                            <img
                              src={`/uploads/${trip.driver_photo}`}
                              alt="Driver"
                              className="w-12 h-12 object-cover rounded-full"
                              onError={(e) => {
                                console.error(`Image load failed for ${trip.driver_photo}:`, e);
                                e.target.src = defaultBg;
                              }}
                            />
                          ) : (
                            'N/A'
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </TabPanel>

            
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
