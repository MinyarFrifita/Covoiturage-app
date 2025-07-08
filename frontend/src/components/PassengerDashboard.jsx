import React, { useState, useEffect } from 'react';
import api from '../services/api';
import bg from '../assets/Background.png';

function PassengerDashboard({ token, onLogout }) {
  const [trips, setTrips] = useState([]);
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

  useEffect(() => {
    fetchTrips();
    fetchNotifications();
  }, [token]);

  const fetchTrips = async () => {
    try {
      if (!token) {
        setError('No authentication token available.');
        return;
      }
      const response = await api.get(`/trips/?t=${new Date().getTime()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Fetched trips data:', response.data); // Débogage
      setTrips(response.data);
    } catch (err) {
      setError('Failed to fetch trips: ' + (err.response?.data?.detail || err.message));
    }
  };

  const fetchNotifications = async () => {
    try {
      if (!token) {
        setError('No authentication token available.');
        return;
      }
      const response = await api.get('/notifications/', {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Fetched notifications:', response.data); // Débogage
      setNotifications(response.data);
    } catch (err) {
      setError('Failed to fetch notifications: ' + (err.response?.data?.detail || err.message));
    }
  };

  const filteredTrips = trips.filter((trip) => {
    const currentDate = new Date('2025-07-08T11:00:00+02:00'); // Date actuelle CET
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
      await api.post(
        `/trips/${tripId}/notify`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchTrips();
      setSelectedTrip(trip);
      setBookingSuccess(true); // Confirmation visuelle
    } catch (err) {
      setError('Failed to book trip: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (selectedTrip && feedback.comment.trim()) {
      try {
        const response = await api.post(
          '/feedback/',
          { trip_id: selectedTrip.id, comment: feedback.comment, rating: feedback.rating },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log('Feedback submitted for trip:', selectedTrip.id, 'Response:', response.data);
        setFeedback({ comment: '', rating: 5 });
        setSelectedTrip(null);
        alert('Feedback submitted successfully');
        fetchTrips(); // Rafraîchir les trips après feedback
      } catch (err) {
        console.error('Failed to submit feedback:', err.response?.data || err.message);
        setError('Failed to submit feedback: ' + (err.response?.data?.detail || err.message));
      }
    } else {
      setError('Comment is required for feedback.');
    }
  };

  const handleTripRequestSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/trip-requests/', newTripRequest, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNewTripRequest({ departure_city: '', destination: '', date_time: '', sexe: '' });
      alert('Trip request submitted successfully');
    } catch (err) {
      setError('Failed to submit trip request: ' + err.message);
    }
  };

  const getDriverEmailForNotification = (tripId) => {
    const trip = trips.find((t) => t.id === tripId);
    return trip?.driver?.email || 'N/A';
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
                        {trip.driver?.photo_path ? (
                          <img
                            src={`/uploads/${trip.driver.photo_path}`}
                            alt="Driver Photo"
                            className="w-16 h-16 object-cover rounded-full"
                            onError={(e) => {
                              console.error('Driver photo failed to load:', e);
                              e.target.src = 'https://via.placeholder.com/64';
                            }}
                          />
                        ) : (
                          <img
                            src="https://via.placeholder.com/64"
                            alt="No Driver Photo"
                            className="w-16 h-16 object-cover rounded-full"
                          />
                        )}
                      </td>
                      <td className="py-2 px-4 border">
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
                          disabled={trip.available_seats <= 0}
                          className={`px-3 py-1 rounded ${
                            trip.available_seats > 0
                              ? 'bg-green-500 text-white hover:bg-green-600'
                              : 'bg-gray-300 cursor-not-allowed'
                          }`}
                        >
                          {trip.available_seats > 0 ? 'Book Now' : 'Full'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {selectedTrip && (
            <div className="mt-4">
              <h3 className="text-xl font-bold mb-2">Leave Feedback for Trip #{selectedTrip.id}</h3>
              <p className="mb-2">Your email: {localStorage.getItem('userEmail') || 'Not available'}</p>
              <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                <textarea
                  value={feedback.comment}
                  onChange={(e) =>
                    setFeedback({ ...feedback, comment: e.target.value })
                  }
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
                    setFeedback({
                      ...feedback,
                      rating: parseInt(e.target.value) || 5,
                    })
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

          <h3 className="text-xl font-bold mb-2 mt-4">Request a Trip</h3>
          <form onSubmit={handleTripRequestSubmit} className="space-y-4">
            <input
              type="text"
              value={newTripRequest.departure_city}
              onChange={(e) =>
                setNewTripRequest({
                  ...newTripRequest,
                  departure_city: e.target.value,
                })
              }
              placeholder="Departure City"
              className="w-full p-2 border rounded"
              required
            />
            <input
              type="text"
              value={newTripRequest.destination}
              onChange={(e) =>
                setNewTripRequest({
                  ...newTripRequest,
                  destination: e.target.value,
                })
              }
              placeholder="Destination"
              className="w-full p-2 border rounded"
              required
            />
            <input
              type="datetime-local"
              value={newTripRequest.date_time}
              onChange={(e) =>
                setNewTripRequest({
                  ...newTripRequest,
                  date_time: e.target.value,
                })
              }
              className="w-full p-2 border rounded"
              required
            />
            <select
              value={newTripRequest.sexe}
              onChange={(e) =>
                setNewTripRequest({
                  ...newTripRequest,
                  sexe: e.target.value,
                })
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
      </div>
      <nav className="bg-blue-600 p-4 text-white">
        <div className="container mx-auto flex justify-center">
          <button
            onClick={onLogout}
            className="bg-white text-blue-600 px-6 py-2 rounded-lg hover:bg-blue-50 transition"
          >
            Logout
          </button>
        </div>
      </nav>
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white p-2 rounded">
          {error}
        </div>
      )}
    </div>
  );
}

export default PassengerDashboard;
