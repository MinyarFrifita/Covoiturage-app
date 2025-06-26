import React, { useState, useEffect } from 'react';
import api from '../services/api';
import BookingForm from '../components/BookingForm';

function PassengerDashboard({ token, onLogout }) {
  const [trips, setTrips] = useState([]);
  const [error, setError] = useState(null);
  const [searchCity, setSearchCity] = useState(''); 
  const [searchDate, setSearchDate] = useState(''); 
  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    try {
      if (!token) {
        setError('No authentication token available.');
        return;
      }
      const response = await api.get('/trips/', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTrips(response.data);
    } catch (err) {
      setError('Failed to fetch trips: ' + err.response?.data?.detail || err.message);
      console.error('Fetch error:', err);
    }
  };

  // Filtrer les trajets en fonction de la ville et de la date
  const filteredTrips = trips.filter((trip) => {
    const matchesCity = searchCity
      ? trip.departure_city.toLowerCase().includes(searchCity.toLowerCase())
      : true;
    const matchesDate = searchDate
      ? new Date(trip.date_time).toISOString().split('T')[0] === searchDate
      : true;
    return matchesCity && matchesDate;
  });

  return (
    <div className="max-w-4xl mx-auto mt-10 p-4">
      <h2 className="text-2xl font-bold mb-4">Passenger Dashboard</h2>
      {error && <p className="text-red-500 mb-4">{error}</p>}

      {/* Champs de recherche */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by departure city..."
          value={searchCity}
          onChange={(e) => setSearchCity(e.target.value)}
          className="border p-2 mr-2 rounded"
        />
        <input
          type="date"
          value={searchDate}
          onChange={(e) => setSearchDate(e.target.value)}
          className="border p-2 rounded"
        />
      </div>

      <h3 className="text-xl font-bold mb-2">Available Trips</h3>
      {filteredTrips.length === 0 ? (
        <p>No trips available or matching your search.</p>
      ) : (
        filteredTrips.map((trip) => (
          <div key={trip.id} className="border p-4 mb-2">
            <p>From: {trip.departure_city} to {trip.destination}</p>
            <p>Date: {new Date(trip.date_time).toLocaleString()}</p>
            <p>Seats: {trip.available_seats} - Price: {trip.price}€</p>
            {trip.available_seats > 0 && <BookingForm trip={trip} token={token} onBook={fetchTrips} />}
          </div>
        ))
      )}
      <button onClick={onLogout} className="mt-4 bg-red-500 text-white p-2 rounded">Logout</button>
    </div>
  );
}

export default PassengerDashboard;
