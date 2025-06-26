import React, { useState } from 'react';
import api from '../services/api';

function TripCard({ trip, token, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTrip, setEditedTrip] = useState({ ...trip });

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/trips/${trip.id}`, editedTrip, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setIsEditing(false);
      onUpdate();
    } catch (err) {
      console.error('Failed to update trip:', err);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this trip?')) {
      try {
        await api.delete(`/trips/${trip.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        onUpdate();
      } catch (err) {
        console.error('Failed to delete trip:', err);
      }
    }
  };

  if (isEditing) {
    return (
      <div className="border p-4 mb-2">
        <form onSubmit={handleUpdate} className="space-y-2">
          <input
            type="text"
            value={editedTrip.departure_city}
            onChange={(e) => setEditedTrip({ ...editedTrip, departure_city: e.target.value })}
            className="w-full p-2 border rounded"
            required
          />
          <input
            type="text"
            value={editedTrip.destination}
            onChange={(e) => setEditedTrip({ ...editedTrip, destination: e.target.value })}
            className="w-full p-2 border rounded"
            required
          />
          <input
            type="datetime-local"
            value={editedTrip.date_time}
            onChange={(e) => setEditedTrip({ ...editedTrip, date_time: e.target.value })}
            className="w-full p-2 border rounded"
            required
          />
          <input
            type="number"
            value={editedTrip.available_seats}
            onChange={(e) => setEditedTrip({ ...editedTrip, available_seats: parseInt(e.target.value) })}
            min="0"
            className="w-full p-2 border rounded"
            required
          />
          <input
            type="number"
            value={editedTrip.price}
            onChange={(e) => setEditedTrip({ ...editedTrip, price: parseFloat(e.target.value) })}
            step="1"
            className="w-full p-2 border rounded"
            required
          />
          <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded">Save</button>
          <button type="button" onClick={() => setIsEditing(false)} className="w-full bg-gray-500 text-white p-2 rounded mt-2">Cancel</button>
        </form>
      </div>
    );
  }

  return (
    <div className="border p-4 mb-2">
      <p>From: {trip.departure_city} to {trip.destination}</p>
      <p>Date: {new Date(trip.date_time).toLocaleString()}</p>
      <p>Seats: {trip.available_seats} - Price: {trip.price}dt</p>
      <button onClick={() => setIsEditing(true)} className="bg-blue-600 text-white p-2 rounded mr-2">Edit</button>
      <button onClick={handleDelete} className="bg-red-500 text-white p-2 rounded">Delete</button>
    </div>
  );
}

export default TripCard;
