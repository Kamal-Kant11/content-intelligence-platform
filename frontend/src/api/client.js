import axios from 'axios';

export const api = axios.create({ baseURL: '/api', withCredentials: true });

export function getErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  if (err?.response?.data?.message) return err.response.data.message;
  if (err?.code === 'ERR_NETWORK') return 'Cannot reach the server. Is the backend running?';
  if (err?.code === 'ECONNABORTED') return 'The request took too long. Please try again.';
  return fallback;
}
