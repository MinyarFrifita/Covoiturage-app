import React from 'react';
import { Link } from 'react-router-dom';

function Navbar({ token, onLogout }) {
  return (
    <nav className="bg-blue-600 p-4 text-white fixed bottom-0 w-full z-10">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex gap-x-20">
          <Link to="/driver-dashboard" className="text-white hover:underline text-2xl">My Profile </Link>
          <Link to="/driver-dashboard/create-trip" className="text-white hover:underline text-2xl">Create New Trip</Link>
          <Link to="/driver-dashboard/my-trips" className="text-white hover:underline text-2xl">My Trips</Link>
          <Link to="/driver-dashboard/trip-requests" className="text-white hover:underline text-2xl">Passenger Trip Requests</Link>
        </div>
        <button 
          onClick={onLogout}
          className="bg-white text-blue-600 px-4 py-1 rounded hover:bg-blue-50"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
