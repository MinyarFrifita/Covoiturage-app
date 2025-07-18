import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import Navbarr from '../components/Navbarr';
import bg from '../assets/Background.png';
import defaultProfile from '../assets/default-profile.png';

const API_BASE_URL = 'http://localhost:8000';

function PassengerDashboard({ token, onLogout }) {
  const [trips, setTrips] = useState([]);
  const [myTrips, setMyTrips] = useState([]);
  const [error, setError] = useState(null);
  const [searchDeparture, setSearchDeparture] = useState('');
  const [searchDestination, setSearchDestination] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [bookingDetails, setBookingDetails] = useState({ seats: 1 });
  const [feedback, setFeedback] = useState({ comment: '', rating: 5 });
  const [newTripRequest, setNewTripRequest] = useState({
    departure_city: '',
    destination: '',
    date_time: '',
    sexe: '',
  });
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!token) {
      setError('No authentication token available.');
      return;
    }
    const pathname = location.pathname;
    if (pathname === '/passenger-dashboard') {
      fetchUserProfile();
    } else if (pathname === '/passenger-dashboard/available-trips') {
      fetchTrips(currentPage);
    } else if (pathname === '/passenger-dashboard/my-trips') {
      fetchMyTrips(currentPage);
    } else if (pathname === '/passenger-dashboard/request-a-trip') {
      // Pas de fetch spécifique ici
    }
    fetchNotifications();
  }, [token, location.pathname, currentPage]);

  const fetchUserProfile = async () => {
    try {
      const response = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCurrentUser(response.data);
    } catch (err) {
      setError('Failed to fetch user profile: ' + (err.response?.data?.detail || err.message || 'Network error'));
      console.error(err);
    }
  };

  const fetchTrips = async (page = 1) => {
    try {
      if (!token) {
        setError('No authentication token available.');
        return;
      }
      const response = await api.get('/trips/', {
        headers: { Authorization: `Bearer ${token}` },
        params: { page, per_page: 5, t: new Date().getTime() },
      });
      console.log('Fetched trips data:', response.data);
      setTrips(response.data.results || []);
      setTotalPages(Math.ceil(response.data.total / 5) || 1);
    } catch (err) {
      const errorMessage = err.response?.status === 404
        ? 'Trips endpoint not found. Please contact support.'
        : 'Failed to fetch trips: ' + (err.response?.data?.detail || err.message || 'Network error');
      setError(errorMessage);
    }
  };

  const fetchMyTrips = async (page = 1) => {
    try {
      if (!token) {
        setError('No authentication token available.');
        return;
      }
      const response = await api.get('/trips/booked', {
        headers: { Authorization: `Bearer ${token}` },
        params: { page, per_page: 5 },
      });
      console.log('Fetched my trips:', response.data);
      setMyTrips(response.data.results || []);
      setTotalPages(Math.ceil(response.data.total / 5) || 1);
    } catch (err) {
      const errorMessage = err.response?.status === 404
        ? 'Booked trips endpoint not found. Please contact support.'
        : 'Failed to fetch my trips: ' + (err.response?.data?.detail || err.message || 'Network error');
      setError(errorMessage);
    }
  };

  const fetchNotifications = async () => {
    try {
      if (!token) {
        setError('No authentication token available.');
        return;
      }
      const response = await api.get('/notifications/notifications/', {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Fetched notifications:', response.data);
      setNotifications(response.data.results || response.data || []);
    } catch (err) {
      const errorMessage = err.response?.status === 404
        ? 'Notifications endpoint not found. Please contact support.'
        : 'Failed to fetch notifications: ' + (err.response?.data?.detail || err.message || 'Network error');
      setError(errorMessage);
    }
  };

  const sendNotification = async (tripId, message) => {
    try {
      if (!token || !currentUser || !currentUser.id) {
        setError('No authentication token or user ID available.');
        return;
      }
      if (!tripId) {
        setError('Trip ID is required for notification.');
        return;
      }
      const trip = trips.find((t) => t.id === tripId);
      if (!trip || !trip.driver_id) {
        setError('Trip or driver not found.');
        return;
      }
      console.log('Sending notification with passenger_id:', currentUser.id, 'message:', message, 'tripId:', tripId);
      const response = await api.post(
        '/notifications/notifications/',
        {
          passenger_id: currentUser.id,
          message: message || 'New update regarding your trip',
          trip_id: tripId,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('Notification sent:', response.data);
      fetchNotifications();
    } catch (err) {
      setError('Failed to send notification: ' + (err.response?.data?.detail || err.message || 'Network error'));
      console.error('Notification error:', err.response?.data);
    }
  };

  const filteredTrips = trips.filter((trip) => {
    const currentDate = new Date();
    const tripDate = new Date(trip.date_time);
    const matchesDate = tripDate >= currentDate;
    const matchesDeparture = searchDeparture
      ? trip.departure_city.toLowerCase().includes(searchDeparture.toLowerCase())
      : true;
    const matchesDestination = searchDestination
      ? trip.destination.toLowerCase().includes(searchDestination.toLowerCase())
      : true;
    const matchesSearchDate = searchDate
      ? new Date(trip.date_time).toISOString().split('T')[0] === searchDate
      : true;
    const matchesSexe = newTripRequest.sexe === 'female'
      ? trip.driver?.sexe === 'female' && trip.available_seats > 0
      : trip.available_seats > 0;
    return matchesDate && matchesDeparture && matchesDestination && matchesSearchDate && matchesSexe;
  });

  const handleBookTrip = async (tripId) => {
    try {
      const trip = trips.find((t) => t.id === tripId);
      if (!trip) throw new Error('Trip not found in local state');
      if (bookingDetails.seats > trip.available_seats) {
        setError(`Only ${trip.available_seats} seat(s) available.`);
        return;
      }
      await api.post(
        `/trips/${tripId}/book`,
        new URLSearchParams({ seats_booked: bookingDetails.seats }).toString(),
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      await sendNotification(tripId, `Booking confirmed for trip ${tripId}`);
      fetchTrips(currentPage);
      setSelectedTrip(trip);
      setBookingSuccess(true);
    } catch (err) {
      setError('Failed to book trip: ' + (err.response?.data?.detail || err.message || 'Network error'));
    }
  };

  const handleFeedbackSubmit = async (e, tripId) => {
    e.preventDefault();
    const trip = myTrips.find((t) => t.id === tripId) || selectedTrip;
    if (!trip || !currentUser?.id || !myTrips.some((t) => t.id === tripId)) {
      setError('You can only submit feedback for your booked trips.');
      return;
    }
    if (!feedback.comment.trim()) {
      setError('Comment is required for feedback.');
      return;
    }
    try {
      const response = await api.post(
        '/feedback/feedback/',
        { trip_id: trip.id, comment: feedback.comment, rating: feedback.rating },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('Feedback submitted for trip:', trip.id, 'Response:', response.data);
      setFeedback({ comment: '', rating: 5 });
      setSelectedTrip(null);
      fetchMyTrips(currentPage);
      alert('Feedback submitted successfully');
    } catch (err) {
      console.error('Failed to submit feedback:', err.response?.data || err.message);
      setError('Failed to submit feedback: ' + (err.response?.data?.detail || err.message || 'Network error'));
    }
  };

  const handleTripRequestSubmit = async (e) => {
    e.preventDefault();
    if (!newTripRequest.departure_city.trim() || !newTripRequest.destination.trim() || !newTripRequest.date_time) {
      setError('All fields (Departure City, Destination, and Date/Time) are required.');
      return;
    }
    try {
      const response = await api.post(
        '/trip-requests/',
        {
          departure_city: newTripRequest.departure_city,
          destination: newTripRequest.destination,
          date_time: newTripRequest.date_time,
          sexe: newTripRequest.sexe,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('Trip request submitted:', response.data);
      setNewTripRequest({ departure_city: '', destination: '', date_time: '', sexe: '' });
      setError(null);
      alert('Trip request submitted successfully!');
    } catch (err) {
      setError('Failed to submit trip request: ' + (err.response?.data?.detail || err.message || 'Network error'));
      console.error('Trip request error:', err.response?.data);
    }
  };

  const getDriverEmailForNotification = (tripId) => {
    const trip = myTrips.find((t) => t.id === tripId);
    return trip?.driver?.email || 'N/A';
  };

  const hasSubmittedFeedback = (tripId) => {
    const userId = currentUser?.id;
    const trip = myTrips.find((t) => t.id === tripId);
    console.log('Trip feedbacks:', trip?.feedbacks, 'User ID:', userId);
    return trip?.feedbacks?.some((f) => f.user_id === userId) || false;
  };

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const renderContent = () => {
    const pathname = location.pathname;
    if (pathname === '/passenger-dashboard') {
      return currentUser ? (
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl mx-auto text-center">
          <h3 className="text-2xl font-bold mb-6">Passenger Profile</h3>
          <div className="relative">
            <div className="bg-blue-500 rounded-full w-48 h-48 flex items-center justify-center mx-auto mb-4">
              <img
                src={currentUser.photo_path ? `${API_BASE_URL}/users/${currentUser.id}/photo` : defaultProfile}
                alt="Passenger Profile"
                className="w-40 h-40 rounded-full object-cover border-4 border-blue-500 shadow-md"
                onError={(e) => {
                  console.error('Failed to load profile photo:', e);
                  e.target.src = defaultProfile;
                }}
                crossOrigin="anonymous"
              />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold">
              {currentUser.role.charAt(0).toUpperCase()}
            </div>
          </div>
          <h3 className="text-xl font-semibold text-gray-900">{currentUser.email || 'Unknown Passenger'}</h3>
          <p className="text-gray-600 mt-2">Role: <span className="font-medium text-blue-700">{currentUser.role}</span></p>
          {currentUser.sexe && <p className="text-gray-600 mt-1">Gender: <span className="font-medium text-blue-700">{currentUser.sexe}</span></p>}
          <p className="text-gray-600 mt-1">Joined: <span className="font-medium text-blue-700">{new Date(currentUser.created_at).toLocaleDateString()}</span></p>
        </div>
      ) : (
        <div className="text-center py-4 text-gray-600">Loading profile...</div>
      );
    } else if (pathname === '/passenger-dashboard/available-trips') {
      return (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6 text-center">Available Trips</h2>
          <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
            <input
              type="text"
              placeholder="Departure city..."
              className="border p-2 rounded w-full"
              value={searchDeparture}
              onChange={(e) => setSearchDeparture(e.target.value)}
            />
            <input
              type="text"
              placeholder="Destination city..."
              className="border p-2 rounded w-full"
              value={searchDestination}
              onChange={(e) => setSearchDestination(e.target.value)}
            />
            <input
              type="date"
              className="border p-2 rounded w-full"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
            />
            <select
              value={newTripRequest.sexe}
              onChange={(e) => setNewTripRequest({ ...newTripRequest, sexe: e.target.value })}
              className="border p-2 rounded w-full"
            >
              <option value="">All</option>
              <option value="female">Female Only</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-3 px-4 border">From</th>
                  <th className="py-3 px-4 border">To</th>
                  <th className="py-3 px-4 border">Date & Time</th>
                  <th className="py-3 px-4 border">Car Type</th>
                  <th className="py-3 px-4 border">Return Date</th>
                  <th className="py-3 px-4 border">Description</th>
                  <th className="py-3 px-4 border">Seats</th>
                  <th className="py-3 px-4 border">Price (DT)</th>
                  <th className="py-3 px-4 border">Driver Email</th>
                  <th className="py-3 px-4 border">Driver Gender</th>
                  <th className="py-3 px-4 border">Driver Photo</th>
                  <th className="py-3 px-4 border">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrips.length === 0 ? (
                  <tr>
                    <td colSpan="12" className="py-4 text-center">
                      No trips available or matching your search
                    </td>
                  </tr>
                ) : (
                  filteredTrips.map((trip) => (
                    <tr key={trip.id} className="hover:bg-gray-50">
                      <td className="py-2 px-4 border">{trip.departure_city || 'N/A'}</td>
                      <td className="py-2 px-4 border">{trip.destination || 'N/A'}</td>
                      <td className="py-2 px-4 border">
                        {new Date(trip.date_time).toLocaleString()}
                      </td>
                      <td className="py-2 px-4 border">{trip.car_type || 'N/A'}</td>
                      <td className="py-2 px-4 border">
                        {trip.return_date ? new Date(trip.return_date).toLocaleString() : 'N/A'}
                      </td>
                      <td className="py-2 px-4 border">{trip.description || 'N/A'}</td>
                      <td className="py-2 px-4 border">{trip.available_seats || 'N/A'}</td>
                      <td className="py-2 px-4 border">{trip.price || 'N/A'}</td>
                      <td className="py-2 px-4 border">{trip.driver?.email || 'N/A'}</td>
                      <td className="py-2 px-4 border">{trip.driver?.sexe || 'N/A'}</td>
                      <td className="py-2 px-4 border">
                        {trip.driver?.id ? (
                          <img
                            src={`${API_BASE_URL}/users/${trip.driver.id}/photo`}
                            alt="Driver Photo"
                            className="w-12 h-12 rounded-full object-cover"
                            onError={(e) => {
                              console.error('Failed to load driver photo:', e);
                              e.target.src = defaultProfile;
                            }}
                            crossOrigin="anonymous"
                          />
                        ) : (
                          <img
                            src={defaultProfile}
                            alt="Default Driver Photo"
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        )}
                      </td>
                      <td className="py-2 px-4 border">
                        {trip.available_seats > 0 ? (
                          <>
                            <select
                              value={bookingDetails.seats}
                              onChange={(e) =>
                                setBookingDetails({ seats: parseInt(e.target.value) || 1 })
                              }
                              className="border p-1 rounded mr-2"
                            >
                              {[...Array(trip.available_seats).keys()].map((i) => (
                                <option key={i + 1} value={i + 1}>
                                  {i + 1}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleBookTrip(trip.id)}
                              className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                            >
                              Book Now
                            </button>
                          </>
                        ) : (
                          <span className="text-gray-500">Full</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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
        </div>
      );
    } else if (pathname === '/passenger-dashboard/my-trips') {
      return (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6 text-center">My Trips</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-3 px-4 border">From</th>
                  <th className="py-3 px-4 border">To</th>
                  <th className="py-3 px-4 border">Date & Time</th>
                  <th className="py-3 px-4 border">Status</th>
                  <th className="py-3 px-4 border">Actions</th>
                </tr>
              </thead>
              <tbody>
                {myTrips.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-4 text-center">
                      No trips booked yet.
                    </td>
                  </tr>
                ) : (
                  myTrips.map((trip) => (
                    <tr key={trip.id} className="hover:bg-gray-50">
                      <td className="py-2 px-4 border">{trip.departure_city || 'N/A'}</td>
                      <td className="py-2 px-4 border">{trip.destination || 'N/A'}</td>
                      <td className="py-2 px-4 border">
                        {new Date(trip.date_time).toLocaleString()}
                      </td>
                      <td className="py-2 px-4 border">{trip.status || 'N/A'}</td>
                      <td className="py-2 px-4 border">
                        {trip.status === 'completed' && !hasSubmittedFeedback(trip.id) ? (
                          <button
                            onClick={(e) => {
                              setSelectedTrip(trip);
                              setFeedback({ comment: '', rating: 5 });
                            }}
                            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 mr-2"
                          >
                            Submit Feedback
                          </button>
                        ) : (
                          <span className="text-gray-500">N/A</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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
        </div>
      );
    } else if (pathname === '/passenger-dashboard/request-a-trip') {
      return (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6 text-center">Request a Trip</h2>
          <form onSubmit={handleTripRequestSubmit} className="space-y-4">
            <input
              type="text"
              value={newTripRequest.departure_city}
              onChange={(e) =>
                setNewTripRequest({ ...newTripRequest, departure_city: e.target.value })
              }
              placeholder="Departure City"
              className="w-full p-2 border rounded"
              required
            />
            <input
              type="text"
              value={newTripRequest.destination}
              onChange={(e) =>
                setNewTripRequest({ ...newTripRequest, destination: e.target.value })
              }
              placeholder="Destination"
              className="w-full p-2 border rounded"
              required
            />
            <input
              type="datetime-local"
              value={newTripRequest.date_time}
              onChange={(e) =>
                setNewTripRequest({ ...newTripRequest, date_time: e.target.value })
              }
              className="w-full p-2 border rounded"
              required
            />
            <select
              value={newTripRequest.sexe}
              onChange={(e) =>
                setNewTripRequest({ ...newTripRequest, sexe: e.target.value })
              }
              className="w-full p-2 border rounded"
            >
              <option value="">Any</option>
              <option value="female">Female Only</option>
            </select>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white p-2 rounded"
            >
              Request Trip
            </button>
          </form>
          {error && <p className="text-red-500 mt-2">{error}</p>}
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
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}
          {renderContent()}
        </div>
      </div>
      <Navbarr token={token} onLogout={onLogout} />
      {selectedTrip && (
        <div className="mt-4">
          <h3 className="text-xl font-bold mb-2">Leave Feedback for Trip #{selectedTrip.id}</h3>
          <p className="mb-2">Your email: {localStorage.getItem('userEmail') || 'Not available'}</p>
          <form onSubmit={(e) => handleFeedbackSubmit(e, selectedTrip.id)} className="space-y-4">
            <textarea
              value={feedback.comment}
              onChange={(e) => setFeedback({ ...feedback, comment: e.target.value })}
              placeholder="Leave feedback for this trip..."
              className="w-full p-2 border rounded"
              required
            />
            <input
              type="number"
              min="1"
              max="5"
              value={feedback.rating}
              onChange={(e) =>
                setFeedback({ ...feedback, rating: parseInt(e.target.value) || 5 })
              }
              placeholder="Rating (1-5)"
              className="w-full p-2 border rounded"
              required
            />
            <button
              type="submit"
              className="w-full bg-green-500 text-white p-2 rounded"
              disabled={error?.includes('Failed to submit feedback')}
            >
              Submit Feedback
            </button>
            {error && <p className="text-red-500">{error}</p>}
          </form>
        </div>
      )}
      {bookingSuccess && (
        <div className="mt-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          Booking confirmed for Trip #{selectedTrip.id}! A notification has been sent to the driver.
          <button
            onClick={() => setBookingSuccess(false)}
            className="ml-2 text-green-700 hover:text-green-900"
          >
            Close
          </button>
        </div>
      )}
      <button
        onClick={() => setShowNotifications(true)}
        className="mt-4 w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
      >
        View Notifications
      </button>
      {showNotifications && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Your Notifications</h3>
            {notifications.length === 0 ? (
              <p className="text-center">No notifications available.</p>
            ) : (
              <ul className="space-y-2">
                {notifications.map((notification) => (
                  <li key={notification.id} className="border-b py-2">
                    <p>
                      <strong>Message:</strong> {notification.message || 'N/A'}
                    </p>
                    <p>
                      <strong>Date:</strong>{' '}
                      {notification.created_at
                        ? new Date(notification.created_at).toLocaleString()
                        : 'N/A'}
                    </p>
                    {notification.trip_id && (
                      <>
                        <p>
                          <strong>Trip ID:</strong> {notification.trip_id}
                        </p>
                        <p>
                          <strong>Driver Email:</strong>{' '}
                          {getDriverEmailForNotification(notification.trip_id)}
                        </p>
                      </>
                    )}
                    {notification.driver_email && (
                      <p>
                        <strong>From Driver Email:</strong> {notification.driver_email}
                      </p>
                    )}
                    {notification.departure_city && notification.destination && (
                      <>
                        <p>
                          <strong>Departure:</strong> {notification.departure_city}
                        </p>
                        <p>
                          <strong>Destination:</strong> {notification.destination}
                        </p>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <button
              onClick={() => setShowNotifications(false)}
              className="mt-4 w-full bg-red-500 text-white p-2 rounded hover:bg-red-600"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default PassengerDashboard;
