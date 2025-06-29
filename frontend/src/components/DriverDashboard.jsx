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
  });

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    try {
      const response = await api.get('/trips/my', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTrips(response.data);
    } catch (err) {
      setError('Failed to fetch trips: ' + err.message);
    }
  };

  const handleCreateTrip = async (e) => {
    e.preventDefault();
    try {
      await api.post('/trips/', newTrip, {
        headers: { Authorization: `Bearer ${token}` },
      });F
      fetchTrips();
      setNewTrip({ departure_city: '', destination: '', date_time: '', available_seats: 1, price: 0 });
    } catch (err) {
      setError('Failed to create trip: ' + err.message);
    }
  };

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
      <div className="flex-1 bg-black bg-opacity-50 flex flex-col p-4 overflow-auto">
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
              onChange={(e) => setNewTrip({ ...newTrip, available_seats: parseInt(e.target.value) })}
              min="1"
              className="w-full p-2 border rounded"
              required
            />
            <input
              type="number"
              value={newTrip.price}
              onChange={(e) => setNewTrip({ ...newTrip, price: parseFloat(e.target.value) })}
              step="0.01"
              className="w-full p-2 border rounded"
              required
            />
            <button type="submit" className="w-full bg-green-500 text-white p-2 rounded">Create Trip</button>
          </form>
          <h3 className="text-white font-bold mb-2 text-2xl">My Trips</h3>
          {trips.length === 0 ? (
            <p>No trips created yet.</p>
          ) : (
            trips.map((trip) => <TripCard key={trip.id} trip={trip} token={token} onUpdate={fetchTrips} />)
          )}
        </div>
      </div>

      {/* Navigation fixe en bas */}
      <nav className="bg-blue-600 p-4 text-white fixed bottom-0 w-full">
        <ul className="flex flex-wrap justify-center gap-4">
          <li><button
              onClick={onLogout}
              className="text-blue-500 hover:underline px-3 py-1" 
            >
             Home
            </button></li>
          <li>
            <button
              onClick={onLogout}
              className="text-blue-500 hover:underline px-3 py-1" 
            >
              Logout
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}

export default DriverDashboard;
