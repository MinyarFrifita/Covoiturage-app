import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import bg from '../assets/Background.png';
import ReCAPTCHA from 'react-google-recaptcha';

function Register({ setToken, setUserRole }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('passenger');
  const [sexe, setSexe] = useState('');
  const [photo, setPhoto] = useState(null);
  const [errors, setErrors] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors([]);
    setIsLoading(true);

    const newErrors = [];
    if (!captchaVerified) newErrors.push('Please verify the reCAPTCHA');
    if (!email.includes('@')) newErrors.push('Invalid email: must contain @');
    if (password.length < 4) newErrors.push('Password must be at least 4 characters long');

    if (newErrors.length > 0) {
      setErrors(newErrors);
      setIsLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('email', email);
      formData.append('password', password);
      formData.append('role', role);
      formData.append('sexe', sexe);
      formData.append('recaptcha_token', captchaToken);
      if (photo) formData.append('photo', photo);

      console.log('Sending request to /auth/register with data:', Object.fromEntries(formData));
      const response = await api.post('/auth/register', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const { access_token } = response.data;
      if (!access_token) throw new Error('No access token returned from registration');
      
      localStorage.setItem('token', access_token);
      localStorage.setItem('role', role);
      setToken(access_token);
      setUserRole(role);
      navigate('/');
    } catch (err) {
      console.error('Registration error:', err.response?.data || err.message);
      const errorMessage = err.response?.data?.detail || err.message || 'Registration failed. Please try again.';
      setErrors([errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const onCaptchaChange = (value) => {
    setCaptchaVerified(!!value);
    setCaptchaToken(value);
  };

  const handlePhotoChange = (e) => {
    if (e.target.files && e.target.files[0]) setPhoto(e.target.files[0]);
  };

  return (
    <div
      className="h-screen w-screen bg-cover bg-center bg-no-repeat bg-fixed flex flex-col"
      style={{ backgroundImage: `url(${bg})` }}
      onError={(e) => { console.error('Background image failed to load:', e); e.target.style.backgroundImage = "url('https://via.placeholder.com/1920x1080')"; }}
    >
      <div className="flex-1 bg-black bg-opacity-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Register</h2>
          {errors.length > 0 && (
            <div className="mb-4">
              {errors.map((error, index) => (
                <div key={index} className="mb-2 p-3 bg-red-100 text-red-700 rounded">{error}</div>
              ))}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-gray-700 text-sm font-medium mb-1">Email</label>
              <input
                id="email"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                autoComplete="username"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-gray-700 text-sm font-medium mb-1">Password</label>
              <input
                id="register-password"
                name="registerPassword"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                autoComplete="new-password"
                data-lpignore="true"
              />
            </div>
            <div>
              <label htmlFor="role" className="block text-gray-700 text-sm font-medium mb-1">Role</label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="passenger">Passenger</option>
                <option value="driver">Driver</option>
              </select>
            </div>
            <div>
              <label htmlFor="sexe" className="block text-gray-700 text-sm font-medium mb-1">Gender</label>
              <select
                id="sexe"
                value={sexe}
                onChange={(e) => setSexe(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div>
              <label htmlFor="photo" className="block text-gray-700 text-sm font-medium mb-1">Profile Photo (Optional)</label>
              <input
                id="photo"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {photo && <div className="mt-2 text-sm text-green-600">Selected: {photo.name}</div>}
            </div>
            <div className="mb-4">
              <ReCAPTCHA sitekey="6LdmmncrAAAAAA25r52V-YtCNO0WwGl4UrRMeaxj" onChange={onCaptchaChange} />
            </div>
            <button
              type="submit"
              disabled={isLoading || !captchaVerified}
              className={`w-full py-2 px-4 rounded-md text-white font-medium ${
                isLoading || !captchaVerified ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isLoading ? 'Registering...' : 'Register'}
            </button>
          </form>
          <div className="mt-4 text-center text-sm text-gray-600">
            Already have an account? <a href="/login" className="text-blue-600 hover:underline">Login here</a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
