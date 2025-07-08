import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000',
  timeout: 10000,
});

// Liste des endpoints publics (ne nécessitant pas de token)
const publicEndpoints = ['/auth/register', '/auth/token'];

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log(`Added Authorization header with token: ${token.substring(0, 10)}... for ${config.url}`);
    } else {
      console.log(`No token found in localStorage for ${config.url}`);
      if (!publicEndpoints.includes(config.url)) {
        console.warn(`Request to ${config.url} requires authentication but no token available`);
      }
    }
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error.message || error);
    return Promise.reject(error);
  }
);

export default api;
