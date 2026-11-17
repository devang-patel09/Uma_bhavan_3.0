import axios from 'axios';

/**
 * Normalises the configured API base URL.
 * Render injects the API service's bare host (e.g. "uma-bhavan-api.onrender.com"),
 * so add https:// and the /api prefix when they're missing.
 */
export function resolveApiBaseUrl(raw?: string): string {
  const value = (raw ?? '').trim().replace(/\/+$/, '');
  if (!value) return '/api';
  let url = /^https?:\/\//i.test(value) || value.startsWith('/') ? value : `https://${value}`;
  if (!/\/api$/.test(url)) url = `${url}/api`;
  return url;
}

export const api = axios.create({
  baseURL: resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const errorData = error.response?.data?.error;
    const message = errorData?.message || error.message || 'An unexpected error occurred';
    const customError = new Error(message);
    (customError as any).response = error.response;
    (customError as any).code = errorData?.code;
    return Promise.reject(customError);
  }
);
