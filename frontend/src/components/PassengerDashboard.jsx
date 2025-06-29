import React, { useState, useEffect } from 'react';
import api from '../services/api';
import bg from '../assets/Background.png';

function PassengerDashboard({ token, onLogout }) {
  const [trips, setTrips] = useState([]);
  const [error, setError] = useState(null);
  const [searchDeparture, setSearchDeparture] = useState('');
  const [searchDestination, setSearchDestination] = useState('');
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
      setError('Failed to fetch trips: ' + (err.response?.data?.detail || err.message));
    }
  };

  const filteredTrips = trips.filter((trip) => {
    const matchesDeparture = searchDeparture
      ? trip.departure_city.toLowerCase().includes(searchDeparture.toLowerCase())
      : true;

    const matchesDestination = searchDestination
      ? trip.destination.toLowerCase().includes(searchDestination.toLowerCase())
      : true;

    const matchesDate = searchDate
      ? new Date(trip.date_time).toISOString().split('T')[0] === searchDate
      : true;

    return matchesDeparture && matchesDestination && matchesDate;
  });

  const handleBookTrip = async (tripId) => {
    try {
      await api.post(`/trips/${tripId}/book`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchTrips();
      alert('Trip booked successfully!');
    } catch (err) {
      setError('Failed to book trip: ' + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <div
      className="h-screen w-screen bg-cover bg-center bg-no-repeat bg-fixed flex flex-col"
      style={{ backgroundImage: `url(${bg})` }}
    >
      <div className="flex-1 bg-black bg-opacity-50 flex items-center justify-center p-4 overflow-auto">
        <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-5xl">
          <h2 className="text-2xl font-bold mb-6 text-center">Available Trips</h2>

          {/* Search Inputs */}
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
          </div>

          {/* Trips Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-3 px-4 border">From</th>
                  <th className="py-3 px-4 border">To</th>
                  <th className="py-3 px-4 border">Date & Time</th>
                  <th className="py-3 px-4 border">Seats</th>
                  <th className="py-3 px-4 border">Driver</th>
                  <th className="py-3 px-4 border">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrips.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-4 text-center">
                      No trips available or matching your search
                    </td>
                  </tr>
                ) : (
                  filteredTrips.map((trip) => (
                    <tr key={trip.id} className="hover:bg-gray-50">
                      <td className="py-2 px-4 border">{trip.departure_city}</td>
                      <td className="py-2 px-4 border">{trip.destination}</td>
                      <td className="py-2 px-4 border">
                        {new Date(trip.date_time).toLocaleString()}
                      </td>
                      <td className="py-2 px-4 border">{trip.available_seats}</td>
                      <td className="py-2 px-4 border">
                        {trip.driver_email || trip.driver?.email || 'Unknown'}
                      </td>
                      <td className="py-2 px-4 border">
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
        </div>
      </div>

      {/* Footer */}
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
    </div>
  );
}

export default PassengerDashboard;

