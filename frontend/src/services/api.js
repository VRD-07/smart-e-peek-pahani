import axios from 'axios';

// Required environment variable during local development:
// VITE_API_URL=http://localhost:5000/api
if (!import.meta.env.VITE_API_URL) {
  console.warn('VITE_API_URL is missing. Please create a .env file.');
}

const getBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const trimmed = envUrl.trim().replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
};

const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 10000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('smart_e_peek_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // We can handle global API errors here (e.g. 401 Unauthorized, 500 Server Error)
    if (error.response) {
      if (error.response.status === 401) {
        console.warn('401 Unauthorized: Authentication required.');
        // Do not redirect if the request was to the bridge token verification endpoint
        if (!error.config.url.includes('/bridge/verify')) {
          localStorage.removeItem('smart_e_peek_token');

          // Officers sign in through a separate route from farmers
          const loginPath = window.location.pathname.startsWith('/officer')
            ? '/officer/login'
            : '/login';

          if (window.location.pathname !== loginPath) {
            window.location.href = loginPath;
          }
        }
      }
    } else if (error.request) {
      console.error('Network Error: Backend is unreachable.');
    }
    return Promise.reject(error);
  }
);

export default api;
