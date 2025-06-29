import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import BookingForm from '../components/BookingForm';
import bg from '../assets/Background.png';

function PassengerDashboard({ token, onLogout }) {
  const [trips, setTrips] = useState([]);
  const [error, setError] = useState(null);
  const [searchCity, setSearchCity] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [selectedTrip, setSelectedTrip] = useState(null); // Nouvel état pour le trajet sélectionné

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
        <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
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
            <>
              <select
                value={selectedTrip ? selectedTrip.id : ''}
                onChange={(e) => {
                  const trip = filteredTrips.find((t) => t.id === parseInt(e.target.value));
                  setSelectedTrip(trip);
                }}
                className="w-full p-2 border rounded mb-4"
              >
                <option value="" disabled>Select a trip</option>
                {filteredTrips.map((trip) => (
                  <option key={trip.id} value={trip.id}>
                    {`${trip.departure_city} to ${trip.destination} - ${new Date(trip.date_time).toLocaleString()} (${trip.available_seats} seats)`}
                  </option>
                ))}
              </select>

              {selectedTrip && selectedTrip.available_seats > 0 && (
                <BookingForm trip={selectedTrip} token={token} onBook={fetchTrips} />
              )}
            </>
          )}
          
        </div>
      </div>

      {/* Navigation fixe en bas */}
      <nav className="bg-blue-600 p-4 text-white fixed bottom-0 w-full">
        <ul className="flex flex-wrap justify-center gap-4">
          <li><button onClick={onLogout} className="text-blue-500 hover:underline px-3 py-1">
              Home
            </button></li>
          <li>
            <button onClick={onLogout} className="text-blue-500 hover:underline px-3 py-1">
              Logout
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}

export default PassengerDashboard;
