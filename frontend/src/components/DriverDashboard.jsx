import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import axios from 'axios';

import { Link } from 'react-router-dom';
import api from '../services/api';
import TripCard from '../components/TripCard';

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
      });
      fetchTrips();
      setNewTrip({ departure_city: '', destination: '', date_time: '', available_seats: 1, price: 0 });
    } catch (err) {
      setError('Failed to create trip: ' + err.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto mt-10 p-4">
      <h2 className="text-2xl font-bold mb-4">Driver Dashboard</h2>
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
      <h3 className="text-xl font-bold mb-2">My Trips</h3>
      {trips.length === 0 ? (
        <p>No trips created yet.</p>
      ) : (
        trips.map((trip) => <TripCard key={trip.id} trip={trip} token={token} onUpdate={fetchTrips} />)
      )}
      <button onClick={onLogout} className="mt-4 bg-red-500 text-white p-2 rounded">Logout</button>
    </div>
  );
}

export default DriverDashboard;
