import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import TripCard from '../components/TripCard';
import Navbar from '../components/Navbar';
import bg from '../assets/Background.png';
import defaultProfile from '../assets/default-profile.png';

const API_BASE_URL = 'http://localhost:8000';

function DriverDashboard({ token, onLogout }) {
  const [trips, setTrips] = useState([]);
  const [tripRequests, setTripRequests] = useState([]);
  const [driverProfile, setDriverProfile] = useState(null);
  const [error, setError] = useState(null);
  const [newTrip, setNewTrip] = useState({
    departure_city: '',
    destination: '',
    date_time: '',
    available_seats: 1,
    price: 0,
    car_type: '',
    description: '',
    return_date: '',
    sexe: '',
  });
  const [message, setMessage] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchDriverProfile();
    const pathname = location.pathname;
    if (pathname === '/driver-dashboard/my-trips') {
      fetchTrips(currentPage);
    }
    if (pathname === '/driver-dashboard/trip-requests') {
      fetchTripRequests(currentPage);
    }
  }, [token, location.pathname, currentPage]);

  const fetchDriverProfile = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDriverProfile(response.data);
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Session expired. Please log in again.');
        onLogout();
        navigate('/login');
      } else {
        setError('Failed to fetch driver profile: ' + (err.response?.data?.detail || err.message || 'Network error'));
        console.error('Fetch driver profile error:', err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTrips = async (page = 1) => {
    try {
      setIsLoading(true);
      const response = await api.get('/trips/', {
        headers: { Authorization: `Bearer ${token}` },
        params: { page, per_page: 5 },
      });
      setTrips(response.data.results || response.data); 
      setTotalPages(Math.ceil((response.data.total || response.data.length) / 5)); 
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Session expired. Please log in again.');
        onLogout();
        navigate('/login');
      } else {
        setError('Failed to fetch trips: ' + (err.response?.data?.detail || err.message || 'Network error'));
        console.error('Fetch trips error:', err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTripRequests = async (page = 1) => {
    try {
      setIsLoading(true);
      const response = await api.get('/trip-requests/driver', {
        headers: { Authorization: `Bearer ${token}` },
        params: { page, per_page: 5 },
      });
      setTripRequests(response.data || []); 
      setTotalPages(Math.ceil((response.data.total || response.data.length) / 5) || 1);
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Session expired. Please log in again.');
        onLogout();
        navigate('/login');
      } else {
        setError('Failed to fetch trip requests: ' + (err.response?.data?.detail || err.message || 'Network error'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTrip = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const currentDate = new Date();
    const tripDate = new Date(newTrip.date_time);

    if (!newTrip.departure_city || !newTrip.destination || !newTrip.date_time || 
        !newTrip.available_seats || !newTrip.price) {
      setError('Please fill all required fields');
      setIsLoading(false);
      return;
    }

    if (tripDate <= currentDate) {
      setError('Trip date must be in the future');
      setIsLoading(false);
      return;
    }

    const tripData = {
      departure_city: newTrip.departure_city,
      destination: newTrip.destination,
      date_time: newTrip.date_time,
      available_seats: newTrip.available_seats,
      price: newTrip.price,
      car_type: newTrip.car_type,
      description: newTrip.description,
      return_date: newTrip.return_date,
      sexe: newTrip.sexe,
    };

    try {
      await api.post('/trips/', tripData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setNewTrip({
        departure_city: '',
        destination: '',
        date_time: '',
        available_seats: 1,
        price: 0,
        car_type: '',
        description: '',
        return_date: '',
        sexe: '',
      });
      setError(null);
      setCurrentPage(1);
      await fetchTrips(1);
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Session expired. Please log in again.');
        onLogout();
        navigate('/login');
      } else {
        setError('Failed to create trip: ' + (err.response?.data?.detail || err.message || 'Network error'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const sendNotification = async (passengerId) => {
    if (!message.trim() || !selectedRequest) {
      setError('Please enter a message');
      return;
    }

    try {
      setIsLoading(true);
      const response = await api.post(
        '/notifications/notifications/',
        { 
          passenger_id: passengerId, 
          message, 
          trip_id: selectedRequest.trip_id 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const { email_status, error_detail } = response.data;
      if (email_status === 'sent') {
        alert('Notification sent successfully! Email sent.');
      } else if (email_status === 'failed') {
        alert(`Notification sent but email failed: ${error_detail || 'Unknown error'}`);
      } else {
        alert('Notification sent successfully!');
      }

      setMessage('');
      setSelectedRequest(null);
      setCurrentPage(1);
      await fetchTripRequests(1);
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Session expired. Please log in again.');
        onLogout();
        navigate('/login');
      } else {
        setError('Failed to send notification: ' + (err.response?.data?.detail || err.message || 'Network error'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePassengerClick = (passengerId) => {
    console.log('Navigating to profile with passengerId:', passengerId);
    if (passengerId) {
      navigate(`/profile/${passengerId}`);
    } else {
      console.error('Invalid passengerId:', passengerId);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const renderContent = () => {
    const pathname = location.pathname;
    if (pathname === '/driver-dashboard/create-trip') {
      return (
        <form onSubmit={handleCreateTrip} className="mb-8 bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-4">Create New Trip</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Departure City*</label>
              <input
                type="text"
                value={newTrip.departure_city}
                onChange={(e) => setNewTrip({...newTrip, departure_city: e.target.value})}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Destination*</label>
              <input
                type="text"
                value={newTrip.destination}
                onChange={(e) => setNewTrip({...newTrip, destination: e.target.value})}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date & Time*</label>
              <input
                type="datetime-local"
                value={newTrip.date_time}
                onChange={(e) => setNewTrip({...newTrip, date_time: e.target.value})}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Available Seats*</label>
              <input
                type="number"
                min="1"
                value={newTrip.available_seats}
                onChange={(e) => setNewTrip({...newTrip, available_seats: parseInt(e.target.value) || 1})}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Price (DT)*</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={newTrip.price}
                onChange={(e) => setNewTrip({...newTrip, price: parseFloat(e.target.value) || 0})}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Car Type</label>
              <input
                type="text"
                value={newTrip.car_type}
                onChange={(e) => setNewTrip({...newTrip, car_type: e.target.value})}
                className="w-full p-2 border rounded"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Description</label>
            <input
              type="text"
              value={newTrip.description}
              onChange={(e) => setNewTrip({...newTrip, description: e.target.value})}
              className="w-full p-2 border rounded"
              placeholder="Any special instructions?"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Return Date (optional)</label>
              <input
                type="datetime-local"
                value={newTrip.return_date}
                onChange={(e) => setNewTrip({...newTrip, return_date: e.target.value})}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Preferred Gender</label>
              <select
                value={newTrip.sexe}
                onChange={(e) => setNewTrip({...newTrip, sexe: e.target.value})}
                className="w-full p-2 border rounded"
              >
                <option value="">Any</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-2 px-4 rounded-md text-white font-medium ${
              isLoading ? 'bg-green-600 opacity-70' : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {isLoading ? 'Creating...' : 'Create Trip'}
          </button>
        </form>
      );
    } else if (pathname === '/driver-dashboard/my-trips') {
      return (
        <div className="mb-8">
          <h3 className="text-white font-bold mb-4 text-2xl">My Trips</h3>
          {isLoading && trips.length === 0 ? (
            <div className="text-center py-8">Loading your trips...</div>
          ) : trips.length === 0 ? (
            <div className="bg-white p-4 rounded-lg text-center">
              You haven't created any trips yet.
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {trips.map((trip) => (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    token={token}
                    onUpdate={fetchTrips}
                  />
                ))}
              </div>
              <div className="flex justify-center mt-4 space-x-2 text-white">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 bg-blue-500 rounded hover:bg-blue-600 disabled:bg-gray-400"
                >
                  Previous
                </button>
                <span>Page {currentPage} of {totalPages}</span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 bg-blue-500 rounded hover:bg-blue-600 disabled:bg-gray-400"
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      );
    } else if (pathname === '/driver-dashboard/trip-requests') {
      return (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-4">Passenger Trip Requests</h3>
          {isLoading && tripRequests.length === 0 ? (
            <div className="text-center py-4">Loading requests...</div>
          ) : tripRequests.length === 0 ? (
            <div className="text-center py-4">No trip requests yet.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="py-3 px-4 border text-left">From</th>
                      <th className="py-3 px-4 border text-left">To</th>
                      <th className="py-3 px-4 border text-left">Date & Time</th>
                      <th className="py-3 px-4 border text-left">Passenger</th>
                      <th className="py-3 px-4 border text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tripRequests.map((request) => (
                      <tr key={request.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4 border">{request.departure_city}</td>
                        <td className="py-3 px-4 border">{request.destination}</td>
                        <td className="py-3 px-4 border">
                          {new Date(request.date_time).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 border">
                          <div 
                            className="flex items-center cursor-pointer hover:text-blue-600"
                            onClick={() => handlePassengerClick(request.passenger_id)}
                          >
                            <img 
                              src={defaultProfile} 
                              alt=" "
                              className="w-8 h-8 rounded-full mr-2 object-cover"
                            />
                            <span>{request.passenger?.email || 'Unknown Passenger'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 border">
                          <button
                            onClick={() => setSelectedRequest(request)}
                            className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                          >
                            Respond
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-center mt-4 space-x-2 text-black">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 bg-blue-500 rounded hover:bg-blue-600 disabled:bg-gray-400 text-white"
                >
                  Previous
                </button>
                <span>Page {currentPage} of {totalPages}</span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 bg-blue-500 rounded hover:bg-blue-600 disabled:bg-gray-400 text-white"
                >
                  Next
                </button>
              </div>
            </>
          )}
          {selectedRequest && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
              <h4 className="font-medium mb-2">
                Message to {selectedRequest.passenger?.email || 'passenger'}
              </h4>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your response..."
                className="w-full p-2 border rounded mb-2"
                rows="3"
              />
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="px-3 py-1 border rounded hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={() => sendNotification(selectedRequest.passenger_id)}
                  disabled={isLoading || !message.trim()}
                  className={`px-3 py-1 rounded text-white ${
                    isLoading || !message.trim() 
                      ? 'bg-green-400' 
                      : 'bg-green-500 hover:bg-green-600'
                  }`}
                >
                  {isLoading ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          )}
        </div>
      );
    } else if (pathname === '/driver-dashboard') {
      return (
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl mx-auto">
          <h3 className="text-2xl font-bold text-gray-800 mb-6 border-b-2 border-gray-200 pb-2">Driver Profile</h3>
          {isLoading ? (
            <div className="text-center py-4 text-gray-600">Loading profile...</div>
          ) : error ? (
            <div className="text-red-500 text-center p-4 bg-red-100 rounded">{error}</div>
          ) : driverProfile ? (
            <div className="text-center">
              <div className="relative">
                <div className="bg-green-500 rounded-full w-48 h-48 flex items-center justify-center mx-auto mb-4">
                  <img
                    src={driverProfile.photo_path ? `${API_BASE_URL}/users/${driverProfile.id}/photo` : defaultProfile}
                    alt="Driver photo"
                    className="w-40 h-40 rounded-full object-cover border-4 border-green-500 shadow-md"
                    onError={(e) => { e.target.src = defaultProfile; console.error('Image load failed:', e); }}
                  />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold">
                  {driverProfile.role.charAt(0).toUpperCase()}
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">{driverProfile.email || 'Unknown Driver'}</h3>
              <p className="text-gray-600 mt-2">Role: <span className="font-medium text-green-700">{driverProfile.role}</span></p>
              {driverProfile.sexe && <p className="text-gray-600 mt-1">Gender: <span className="font-medium text-green-700">{driverProfile.sexe}</span></p>}
              <p className="text-gray-600 mt-1">Joined: <span className="font-medium text-green-700">{new Date(driverProfile.created_at).toLocaleDateString()}</span></p>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-600">No profile data available.</div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div
      className="h-screen w-screen bg-cover bg-center bg-no-repeat bg-fixed flex flex-col"
      style={{ backgroundImage: `url(${bg})` }}
      onError={(e) => {
        console.error('Background image failed to load:', e);
        e.target.style.backgroundImage = "url('https://via.placeholder.com/1920x1080')";
      }}
    >
      <div className="flex-1 bg-black bg-opacity-50 flex items-center justify-center p-4 overflow-auto">
        <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-5xl">
          <h2 className="text-white font-bold mb-6 text-3xl">Driver Dashboard</h2>
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}
          {renderContent()}
        </div>
      </div>
      <Navbar token={token} onLogout={onLogout} />
    </div>
  );
}

export default DriverDashboard;
