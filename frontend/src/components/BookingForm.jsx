import React, { useState } from 'react';
import api from '../services/api';

function BookingForm({ trip, token, onBook }) {
  const [error, setError] = useState(null);
  const [bookingDetails, setBookingDetails] = useState({
    seats: 1,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (bookingDetails.seats > trip.available_seats) {
      setError(`Only ${trip.available_seats} seat(s) available.`);
      return;
    }
    try {
      const response = await api.post(`/trips/${trip.id}/book`, new URLSearchParams({
        seats_booked: bookingDetails.seats,
      }).toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      console.log('Booking response:', response.data);
      onBook();
      alert('Trip booked successfully!');
    } catch (err) {
      console.error('Booking failed:', err.response?.data || err.message);
      setError('Booking failed: ' + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10">
      <h2 className="text-2xl font-bold mb-4">Book Trip</h2>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="number"
          min="1"
          max={trip.available_seats}
          value={bookingDetails.seats}
          onChange={(e) => setBookingDetails({ ...bookingDetails, seats: parseInt(e.target.value) || 1 })}
          placeholder="Number of seats"
          className="w-full p-2 border rounded"
          required
        />
        <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded" disabled={trip.available_seats === 0}>
          Book Now
        </button>
      </form>
    </div>
  );
}

export default BookingForm;
