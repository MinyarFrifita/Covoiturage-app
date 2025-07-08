import React, { useState, useEffect } from "react";
import api from "../services/api";
import bg from "/home/Minyar/covoiturage-app/frontend/src/assets/Background.png";

function TripCard({ trip, token, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTrip, setEditedTrip] = useState({ ...trip });
  const [feedbacks, setFeedbacks] = useState([]);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(false);
  const [errorFeedbacks, setErrorFeedbacks] = useState(null);

  const fetchFeedbacks = async () => {
    setLoadingFeedbacks(true);
    setErrorFeedbacks(null);
    try {
      const response = await api.get(`/feedback/trip/${trip.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("Feedbacks received:", response.data);
      setFeedbacks(response.data);
    } catch (err) {
      console.error("Failed to fetch feedbacks:", err.response?.data || err.message);
      setErrorFeedbacks("Failed to load feedbacks. Check console for details.");
      setFeedbacks([]);
    } finally {
      setLoadingFeedbacks(false);
    }
  };

  useEffect(() => {
    if (trip.available_seats === 0) {
      fetchFeedbacks();
    }
  }, [trip.id, trip.available_seats, token]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    const currentDate = new Date();
    const tripDate = new Date(editedTrip.date_time);
    if (tripDate <= currentDate) {
      alert("Trip date cannot be in the past or current date. Use a future date.");
      return;
    }

    const formData = new FormData();
    formData.append("departure_city", editedTrip.departure_city || "");
    formData.append("destination", editedTrip.destination || "");
    formData.append("date_time", editedTrip.date_time || "");
    formData.append("available_seats", editedTrip.available_seats || 0);
    formData.append("price", editedTrip.price || 0);
    formData.append("car_type", editedTrip.car_type || "");
    formData.append("description", editedTrip.description || "");
    formData.append("return_date", editedTrip.return_date || "");
    formData.append("sexe", editedTrip.sexe || "");

    try {
      const response = await api.put(`/trips/${trip.id}`, formData, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
      });
      setIsEditing(false);
      onUpdate();
      alert("Trip updated successfully!");
    } catch (err) {
      console.error("Failed to update trip:", err.response?.data || err.message);
      alert("Failed to update trip: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this trip?")) {
      try {
        const response = await api.delete(`/trips/${trip.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        alert(response.data?.message || "Trip deleted successfully");
        onUpdate();
      } catch (err) {
        console.error("Failed to delete trip:", err.response?.data || err.message);
        alert("Failed to delete trip: " + (err.response?.data?.detail || err.message));
      }
    }
  };

  const viewFeedback = () => {
    if (loadingFeedbacks) {
      alert("Loading feedbacks...");
      return;
    }
    if (errorFeedbacks) {
      alert(errorFeedbacks);
      return;
    }
    if (feedbacks.length > 0) {
      alert(
        `Feedback for Trip ${trip.id}:\n${feedbacks
          .map((f) => `${f.comment} (Rating: ${f.rating}) - Passenger: ${f.passenger_email || "Unknown"}`)
          .join("\n")}`
      );
    } else {
      alert(`No feedback available for Trip ${trip.id}.`);
    }
  };

  if (isEditing) {
    return (
      <div className="border p-4 mb-2 bg-white text-black">
        <form onSubmit={handleUpdate} className="space-y-2">
          <input
            type="text"
            value={editedTrip.departure_city || ""}
            onChange={(e) => setEditedTrip({ ...editedTrip, departure_city: e.target.value })}
            className="w-full p-2 border rounded"
            placeholder="Departure City"
            required
          />
          <input
            type="text"
            value={editedTrip.destination || ""}
            onChange={(e) => setEditedTrip({ ...editedTrip, destination: e.target.value })}
            className="w-full p-2 border rounded"
            placeholder="Destination"
            required
          />
          <input
            type="datetime-local"
            value={editedTrip.date_time ? editedTrip.date_time.slice(0, 16) : ""}
            onChange={(e) => setEditedTrip({ ...editedTrip, date_time: e.target.value })}
            className="w-full p-2 border rounded"
            required
          />
          <input
            type="number"
            value={editedTrip.available_seats || 0}
            onChange={(e) => setEditedTrip({ ...editedTrip, available_seats: parseInt(e.target.value) || 0 })}
            min="0"
            className="w-full p-2 border rounded"
            required
          />
          <input
            type="number"
            value={editedTrip.price || 0}
            onChange={(e) => setEditedTrip({ ...editedTrip, price: parseFloat(e.target.value) || 0 })}
            step="0.01"
            className="w-full p-2 border rounded"
            required
          />
          <input
            type="text"
            value={editedTrip.car_type || ""}
            onChange={(e) => setEditedTrip({ ...editedTrip, car_type: e.target.value })}
            className="w-full p-2 border rounded"
            placeholder="Car Type"
          />
          <input
            type="text"
            value={editedTrip.description || ""}
            onChange={(e) => setEditedTrip({ ...editedTrip, description: e.target.value })}
            className="w-full p-2 border rounded"
            placeholder="Description"
          />
          <input
            type="datetime-local"
            value={editedTrip.return_date ? editedTrip.return_date.slice(0, 16) : ""}
            onChange={(e) => setEditedTrip({ ...editedTrip, return_date: e.target.value })}
            className="w-full p-2 border rounded"
            placeholder="Return Date (optional)"
          />
          <select
            value={editedTrip.sexe || ""}
            onChange={(e) => setEditedTrip({ ...editedTrip, sexe: e.target.value })}
            className="w-full p-2 border rounded"
          >
            <option value="">Select Sexe</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
          <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded mt-2">
            Save
          </button>
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="w-full bg-gray-500 text-white p-2 rounded mt-2"
          >
            Cancel
          </button>
          {trip.available_seats === 0 && (
            <button
              type="button"
              onClick={viewFeedback}
              className="w-full bg-green-500 text-white p-2 rounded mt-2"
            >
              View Feedback
            </button>
          )}
        </form>
      </div>
    );
  }

  return (
    <div className="border p-4 mb-2 bg-white text-black text-xl font-bold">
      <p>From: {trip.departure_city} to {trip.destination}</p>
      <p>Date: {new Date(trip.date_time).toLocaleString()}</p>
      <p>Seats: {trip.available_seats} - Price: {trip.price}dt</p>
      {trip.available_seats > 0 ? (
        <>
          <button onClick={() => setIsEditing(true)} className="bg-blue-600 text-white p-2 rounded mr-2">
            Edit
          </button>
          <button onClick={handleDelete} className="bg-red-500 text-white p-2 rounded mr-2">
            Delete
          </button>
        </>
      ) : (
        <>
          <button onClick={handleDelete} className="bg-red-500 text-white p-2 rounded mr-2">
            Delete
          </button>
          <button onClick={viewFeedback} className="bg-green-500 text-white p-2 rounded">
            View Feedback
          </button>
        </>
      )}
    </div>
  );
}

export default TripCard;
