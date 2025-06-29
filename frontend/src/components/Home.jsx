import React from 'react';
import { Link } from 'react-router-dom';
import bg from '/home/Minyar/covoiturage-app/frontend/src/assets/Background.png'; 

function Home({ token, userRole, onLogout }) {
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
      <div className="flex-1 bg-black bg-opacity-50 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg shadow-lg text-center w-full max-w-md mx-4 mb-16">
          <h1 className="text-3xl font-bold text-blue-600 mb-4">Welcome To EcoTrips</h1>
          <p className="text-gray-700 mb-4">Create Or Book A Trip!</p>
          {token ? (
            <p className="text-green-500">Logged in as {userRole}</p>
          ) : (
            <p className="text-gray-500">Please log in to access features.</p>
          )}
        </div>
      </div>

      {/* Navigation fixe en bas */}
      <nav className="bg-blue-600 p-4 text-white fixed bottom-0 w-full">
        <ul className="flex flex-wrap justify-center gap-4">
          {!token ? (
            <>
              <li><Link to="/login" className="text-white hover:underline px-3 py-1">Login</Link></li>
              <li><Link to="/register" className="text-white hover:underline px-3 py-1">Register</Link></li>
            </>
          ) : (
            <>
              {userRole === 'driver' && (
                <li><Link to="/driver-dashboard" className="text-white hover:underline px-3 py-1">Driver Dashboard</Link></li>
              )}
              {userRole === 'passenger' && (
                <li><Link to="/passenger-dashboard" className="text-white hover:underline px-3 py-1">Passenger Dashboard</Link></li>
              )}
              {userRole === 'admin' && (
                <li><Link to="/admin-dashboard" className="text-white hover:underline px-3 py-1">Admin Dashboard</Link></li>
              )}
              <li>
                <button
                  onClick={onLogout}
                  className="text-blue-500 hover:underline px-3 py-1"
                >
                  Logout
                </button>
              </li>
            </>
          )}
        </ul>
      </nav>
    </div>
  );
}

export default Home;
