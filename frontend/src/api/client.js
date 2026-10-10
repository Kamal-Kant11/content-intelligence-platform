import axios from 'axios';

const TOKEN_KEY = 'token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const saveToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const removeToken = () => localStorage.removeItem(TOKEN_KEY);

export const api = axios.create({ baseURL: '/api' });

// Send the JWT with every request
api.interceptors.request.use((request) => {
  const token = getToken();
  if (token) request.headers.Authorization = `Bearer ${token}`;
  return request;
});

export function getErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  if (err?.response?.data?.message) return err.response.data.message;
  if (err?.code === 'ERR_NETWORK') return 'Cannot reach the server. Is the backend running?';
  return fallback;
}
