import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import bg from '../assets/Background.png';
import defaultProfile from '../assets/default-profile.png';

const API_BASE_URL = 'http://localhost:8000'; 

function Profile({ token, onLogout }) {
  const { passengerId } = useParams();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('Fetching profile for passengerId:', passengerId);
    const fetchProfile = async () => {
      try {
        if (!passengerId) {
          setError('No passenger ID provided');
          return;
        }
        const response = await api.get(`/users/${passengerId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log('Profile data received:', response.data);
        setProfile(response.data);
      } catch (err) {
        setError('Failed to fetch profile: ' + (err.response?.data?.detail || err.message));
        console.error('Profile fetch error:', err);
      }
    };
    fetchProfile();
  }, [passengerId, token]);

  if (error) return <div className="text-red-500 text-center">{error}</div>;
  if (!profile) return <div className="text-white text-center">Loading...</div>;

  return (
    <div
      className="h-screen w-screen bg-cover bg-center bg-no-repeat bg-fixed flex flex-col"
      style={{ backgroundImage: `url(${bg})` }}
      onError={(e) => {
        console.error('Background image failed to load:', e);
        e.target.style.backgroundImage = "url('https://via.placeholder.com/1920x1080')";
      }}
    >
      <div className="flex-1 bg-black bg-opacity-50 flex items-center justify-center p-4 overflow-auto">
        <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-2xl">
          <h2 className="text-white font-bold mb-6 text-3xl">Profile</h2>
          <div className="text-center">
            <img
              src={profile.photo_path ? `${API_BASE_URL}/users/${passengerId}/photo` : defaultProfile}
              alt="Profile"
              className="w-32 h-32 rounded-full mx-auto mb-4 object-cover"
              onError={(e) => { e.target.src = defaultProfile; console.error('Image load failed:', e); }}
            />
            <h3 className="text-xl font-semibold">{profile.email || 'Unknown User'}</h3>
            {profile.role && <p>Role: {profile.role}</p>}
            {profile.sexe && <p>Gender: {profile.sexe}</p>}
          </div>
        </div>
      </div>
      <nav className="bg-blue-600 p-4 text-white fixed bottom-0 w-full">
        <div className="container mx-auto flex justify-end">
          <Link to="/driver-dashboard" className="hover:underline">Back to Dashboard</Link>
        </div>
      </nav>
    </div>
  );
}

export default Profile;
