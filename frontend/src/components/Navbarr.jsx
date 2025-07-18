import React from 'react';
import { Link, useLocation } from 'react-router-dom';

function Navbarr({ token, onLogout }) {
  const location = useLocation();

  return (
    <nav className="bg-blue-600 p-4 text-white fixed bottom-0 w-full z-10">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex gap-x-20">
          <Link
            to="/passenger-dashboard"
            className={`text-white hover:underline text-2xl ${
              location.pathname === '/passenger-dashboard' ? 'underline font-bold' : ''
            }`}
          >
            My Profile
          </Link>
          <Link
            to="/passenger-dashboard/available-trips"
            className={`text-white hover:underline text-2xl ${
              location.pathname === '/passenger-dashboard/available-trips' ? 'underline font-bold' : ''
            }`}
          >
            Available Trips
          </Link>
          <Link
            to="/passenger-dashboard/my-trips"
            className={`text-white hover:underline text-2xl ${
              location.pathname === '/passenger-dashboard/my-trips' ? 'underline font-bold' : ''
            }`}
          >
            My Trips
          </Link>
          <Link
            to="/passenger-dashboard/request-a-trip"
            className={`text-white hover:underline text-2xl ${
              location.pathname === '/passenger-dashboard/request-a-trip' ? 'underline font-bold' : ''
            }`}
          >
            Request a Trip
          </Link>
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

export default Navbarr;
