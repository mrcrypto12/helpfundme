import axios from 'axios';

const configuredApiUrl = (
  import.meta.env.DEV
    ? (import.meta.env.VITE_API_URL || 'http://localhost:5000')
    : '/api'
).replace(/\/+$/, '');

// Accept either https://host or https://host/api in VITE_API_URL.
export const API_URL = configuredApiUrl === '/api' || /\/api$/i.test(configuredApiUrl)
  ? configuredApiUrl
  : `${configuredApiUrl}/api`;

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach access token
// Response interceptor — handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && 
        error.response?.data?.code === 'TOKEN_EXPIRED' && 
        !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        await axios.post(
          `${API_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        return api(originalRequest);
      } catch (refreshError) {
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
