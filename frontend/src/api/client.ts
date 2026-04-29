import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only logout on 401 (authentication failure - invalid/expired token)
    // Don't logout on 403 (authorization/permission failure) or other errors
    if (error.response?.status === 401) {
      // Clear token only if it's an actual auth failure, not a temporary issue
      const token = localStorage.getItem('access_token');
      if (token) {
        localStorage.removeItem('access_token');
        // Use a more graceful redirect that allows React to clean up
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
