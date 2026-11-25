import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const api = axios.create({
  baseURL: API_URL,
});

// Request interceptor - attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle 401 & token expiry safely
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const currentPath = window.location.pathname;
      if (currentPath !== '/' && !currentPath.includes('/login') && !currentPath.includes('/onboard')) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userId');
        window.location.href = '/';
      }
    }
    return Promise.reject(err);
  }
);

export function resolveAssetUrl(url?: string | null): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
  const base = import.meta.env.VITE_API_URL || 'http://localhost:8080';
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
}

export { API_URL };
export default api;
