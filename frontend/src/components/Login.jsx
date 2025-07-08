import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import bg from '/home/Minyar/covoiturage-app/frontend/src/assets/Background.png';
import ReCAPTCHA from 'react-google-recaptcha';

function Login({ setToken, setUserRole }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

    if (!captchaVerified) {
      newErrors.push('Please verify the reCAPTCHA');
    }

    if (!email.includes('@')) {
      newErrors.push('Invalid email: must contain @');
    }

    if (password.length < 4) {
      newErrors.push('Password must be at least 4 characters long');
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      setIsLoading(false);
      return;
    }

    try {
      const response = await api.post('/auth/token', 
        new URLSearchParams({
          username: email,  // Ne pas encoder l'email, envoyer tel quel
          password: encodeURIComponent(password),  // Encoder uniquement le mot de passe
          recaptcha_token: captchaToken
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      console.log('API response:', response.data); // Débogage
      const accessToken = response.data.access_token;
      localStorage.setItem('token', accessToken);

      const userRole = await getUserRole(accessToken);
      localStorage.setItem('role', userRole);
      setToken(accessToken);
      setUserRole(userRole);

      if (userRole === 'admin') {
        navigate('/admin-dashboard');
      } else {
        navigate('/');
      }
    } catch (err) {
      console.error('Login error:', err.response?.data || err.message);
      const errorMessage = err.response?.data?.detail || err.message || 'Login failed. Please try again.';
      setErrors([errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const getUserRole = async (token) => {
    try {
      const response = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.role;
    } catch (err) {
      console.error('Error fetching user role:', err);
      return 'user';
    }
  };

  const onCaptchaChange = (value) => {
    setCaptchaVerified(!!value);
    setCaptchaToken(value);
    console.log('reCAPTCHA value:', value); // Débogage
  };

  return (
    <div
      className="h-screen w-screen bg-cover bg-center bg-no-repeat bg-fixed flex flex-col"
      style={{ backgroundImage: `url(${bg})` }}
      onError={(e) => { console.error('Background image failed to load:', e); e.target.style.backgroundImage = "url('https://via.placeholder.com/1920x1080')"; }}
    >
      <div className="flex-1 bg-black bg-opacity-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Login</h2>
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
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                autoComplete="current-password"
              />
            </div>
            <div className="mb-4">
              <ReCAPTCHA
                sitekey="6LdmmncrAAAAAA25r52V-YtCNO0WwGl4UrRMeaxj" 
                onChange={onCaptchaChange}
                theme="light"
                size="normal"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !captchaVerified}
              className={`w-full py-2 px-4 rounded-md text-white font-medium ${isLoading || !captchaVerified ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>
          <div className="mt-4 text-center text-sm text-gray-600">
            Don't have an account?{' '}
            <a href="/register" className="text-blue-600 hover:underline">Register here</a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
