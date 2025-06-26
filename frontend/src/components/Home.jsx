import React from 'react';
import { Link } from 'react-router-dom';

function Home({ token, userRole, onLogout }) {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow-lg text-center">
        <h1 className="text-3xl font-bold text-blue-600 mb-4">Welcome To Covoiturage-app</h1>
        <p className="text-gray-700 mb-4">Create Or Book A Trip !</p>
        {token && userRole ? (
          <p className="text-green-500">Logged in as {userRole}</p>
        ) : (
          <p className="text-gray-500">Please log in to access features.</p>
        )}
      </div>
      <nav className="bg-blue-600 p-4 text-white fixed bottom-0 w-full">
        <ul className="flex space-x-4 justify-center">
          {!token ? (
            <>
              <li><Link to="/login" className="hover:underline">Login</Link></li>
              <li><Link to="/register" className="hover:underline">Register</Link></li>
            </>
          ) : (
            <>
              {userRole === 'driver' && <li><Link to="/driver-dashboard" className="hover:underline">My Dashboard</Link></li>}
              {userRole === 'passenger' && <li><Link to="/passenger-dashboard" className="hover:underline">My Dashboard</Link></li>}
              {userRole === 'admin' && <li><Link to="/admin-dashboard" className="hover:underline">Admin Dashboard</Link></li>}
              <li><button onClick={onLogout} className="hover:underline">Logout</button></li>
            </>
          )}
        </ul>
      </nav>
    </div>
  );
}

export default Home;
