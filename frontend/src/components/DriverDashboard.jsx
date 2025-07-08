import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import api from '../services/api';
import TripCard from '../components/TripCard';
import bg from '../assets/Background.png';

function DriverDashboard({ token, onLogout }) {
  const [trips, setTrips] = useState([]);
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
  const [selectedFile, setSelectedFile] = useState(null);
  const [tripRequests, setTripRequests] = useState([]);
  const [message, setMessage] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);

  useEffect(() => {
    fetchTrips();
    fetchTripRequests();
  }, []);

  const fetchTrips = async () => {
    try {
      const response = await api.get('/trips/my', {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Fetched trips data with feedbacks:', response.data.map(t => ({ id: t.id, feedbacks: t.feedbacks })));
      setTrips(response.data);
    } catch (err) {
      setError('Failed to fetch trips: ' + err.message);
      console.error('Fetch trips error:', err);
    }
  };

  const fetchTripRequests = async () => {
    try {
      const response = await api.get('/trip-requests/driver', {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Trip requests received with IDs:', response.data.map(r => ({ id: r.id, passenger_id: r.passenger_id, trip_id: r.trip_id })));
      setTripRequests(response.data);
    } catch (err) {
      setError('Failed to fetch trip requests: ' + (err.response?.status === 405 ? 'Method not allowed. Check backend route.' : err.message));
    }
  };

  const handleCreateTrip = async (e) => {
    e.preventDefault();
    const currentDate = new Date();
    const tripDate = new Date(newTrip.date_time);
    if (!newTrip.departure_city || !newTrip.destination || !newTrip.date_time || !newTrip.available_seats || !newTrip.price) {
      setError('All required fields (Departure City, Destination, Date & Time, Available Seats, Price) must be filled');
      return;
    }
    if (tripDate <= currentDate) {
      setError('Trip date cannot be in the past or current date. Use a future date.');
      return;
    }

    const formData = new FormData();
    formData.append('departure_city', newTrip.departure_city);
    formData.append('destination', newTrip.destination);
    formData.append('date_time', newTrip.date_time);
    formData.append('available_seats', newTrip.available_seats);
    formData.append('price', newTrip.price);
    formData.append('car_type', newTrip.car_type || '');
    formData.append('description', newTrip.description || '');
    formData.append('return_date', newTrip.return_date || '');
    formData.append('sexe', newTrip.sexe || '');
    if (selectedFile) {
      formData.append('photo', selectedFile);
    }

    try {
      await api.post('/trips/', formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });
      fetchTrips();
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
      setSelectedFile(null);
      setError(null);
    } catch (err) {
      setError('Failed to create trip: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const sendNotification = async (passengerId) => {
    if (!message.trim() || !selectedRequest) {
      setError('Message cannot be empty or no request selected');
      return;
    }
    const tripId = selectedRequest.trip_id || null;
    console.log('Sending notification with:', { passenger_id: passengerId, message, trip_id: tripId });
    try {
      const response = await api.post(
        `/notifications/`,
        { passenger_id: passengerId, message, trip_id: tripId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('Notification response:', response.data);
      const { email_status, error_detail } = response.data;
      if (email_status === 'sent') {
        alert('Notification sent successfully! Email sent.');
      } else if (email_status === 'not_sent') {
        alert('Notification sent successfully, but email was not sent (no trip associated).');
      } else if (email_status === 'failed') {
        alert(`Notification sent, but email failed to send due to an error: ${error_detail || 'Unknown error'}`);
      }
      setMessage('');
      setSelectedRequest(null);
    } catch (err) {
      console.error('Notification error:', err.response?.data || err.message);
      setError('Failed to send notification: ' + (err.response?.data?.detail || err.message));
    }
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
      <div className="flex-1 bg-black bg-opacity-50 flex flex-col p-4 overflow-auto mb-16">
        <div className="max-w-4xl mx-auto mt-10">
          <h2 className="text-white font-bold mb-4 text-4xl">Driver Dashboard</h2>
          {error && <p className="text-red-500 mb-4">{error}</p>}
          <form onSubmit={handleCreateTrip} className="mb-6 space-y-4">
            <input
              type="text"
              value={newTrip.departure_city}
              onChange={(e) => setNewTrip({ ...newTrip, departure_city: e.target.value })}
              placeholder="Departure City"
              className="w-full p-2 border rounded"
              required
            />
            <input
              type="text"
              value={newTrip.destination}
              onChange={(e) => setNewTrip({ ...newTrip, destination: e.target.value })}
              placeholder="Destination"
              className="w-full p-2 border rounded"
              required
            />
            <input
              type="datetime-local"
              value={newTrip.date_time}
              onChange={(e) => setNewTrip({ ...newTrip, date_time: e.target.value })}
              className="w-full p-2 border rounded"
              required
            />
            <input
              type="number"
              value={newTrip.available_seats}
              onChange={(e) => setNewTrip({ ...newTrip, available_seats: parseInt(e.target.value) || 1 })}
              min="1"
              className="w-full p-2 border rounded"
              required
            />
            <input
              type="number"
              value={newTrip.price}
              onChange={(e) => setNewTrip({ ...newTrip, price: parseFloat(e.target.value) || 0 })}
              step="0.01"
              className="w-full p-2 border rounded"
              required
            />
            <input
              type="text"
              value={newTrip.car_type}
              onChange={(e) => setNewTrip({ ...newTrip, car_type: e.target.value })}
              placeholder="Car Type"
              className="w-full p-2 border rounded"
            />
            <input
              type="text"
              value={newTrip.description}
              onChange={(e) => setNewTrip({ ...newTrip, description: e.target.value })}
              placeholder="Description (e.g., light baggage)"
              className="w-full p-2 border rounded"
            />
            <input
              type="datetime-local"
              value={newTrip.return_date}
              onChange={(e) => setNewTrip({ ...newTrip, return_date: e.target.value })}
              placeholder="Return Date (optional)"
              className="w-full p-2 border rounded"
            />
            
            <div className="mt-4">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full p-2 border rounded"
              />
              {selectedFile && <span className="ml-2 text-green-500">{selectedFile.name}</span>}
            </div>
            <button type="submit" className="w-full bg-green-500 text-white p-2 rounded">Create Trip</button>
          </form>

          <h3 className="text-white font-bold mb-2 text-2xl">My Trips</h3>
          {trips.length === 0 ? (
            <p>No trips created yet.</p>
          ) : (
            trips.map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                token={token}
                onUpdate={fetchTrips}
              />
            ))
          )}

          <h3 className="text-white font-bold mb-2 text-2xl mt-6">Passenger Trip Requests</h3>
          <div className="bg-white text-black">
            {tripRequests.length === 0 ? (
              <p className="text-center py-4">No trip requests yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white-700">
                  <thead>
                    <tr className="bg-white-bold 600">
                     
                      <th className="py-3 px-4 border">From</th>
                      <th className="py-3 px-4 border">To</th>
                      <th className="py-3 px-4 border">Date & Time</th>
                      <th className="py-3 px-4 border">Passenger Email</th>
                      <th className="py-3 px-4 border">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tripRequests.map((request) => (
                      <tr key={request.id} className="hover:bg-white-600">
                        
                        <td className="py-2 px-4 border">{request.departure_city}</td>
                        <td className="py-2 px-4 border">{request.destination}</td>
                        <td className="py-2 px-4 border">{new Date(request.date_time).toLocaleString()}</td>

                        <td className="py-2 px-4 border">{request.passenger?.email || ''}</td>
                        <td className="py-2 px-4 border">
                          <button
                            onClick={() => setSelectedRequest(request)}
                            className="bg-blue-500 text-white px-3 py-1 rounded mr-2"
                          >
                            Send Message
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {selectedRequest && (
                  <div className="bg-white-700 p-4 mt-4 rounded-lg text-black">
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="w-full p-2 mb-2 border rounded"
                    />
                    <button
                      onClick={() => sendNotification(selectedRequest.passenger_id)}
                      className="bg-green-500 text-white px-3 py-1 rounded"
                    >
                      Send Notification
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <nav className="bg-blue-600 p-4 text-white fixed bottom-0 w-full">
        <ul className="flex flex-wrap justify-center gap-4">
          <li><Link to="/" className="text-white hover:underline px-3 py-1">Home</Link></li>
          <li>
            <button onClick={onLogout} className="text-blue-500 hover:underline px-3 py-1">Logout</button>
          </li>
        </ul>
      </nav>
    </div>
  );
}

export default DriverDashboard;
