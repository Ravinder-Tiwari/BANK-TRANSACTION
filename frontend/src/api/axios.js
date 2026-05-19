import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'https://bank-transaction-qbja.onrender.com/api';

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for API calls
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for API calls
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Don't redirect for /auth/me — a 401 there just means
    // the user isn't logged in yet. AuthContext handles this gracefully.
    const isAuthMeRequest = originalRequest?.url?.includes('/auth/me');

    // Don't redirect if already on a public auth page (prevents reload loop)
    const isOnAuthPage =
      window.location.pathname === '/login' ||
      window.location.pathname === '/register';

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthMeRequest &&
      !isOnAuthPage
    ) {
      originalRequest._retry = true;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
