import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On page load, the session cookie (if any) tells us who is logged in.
  useEffect(() => {
    api
      .get('/auth/me')
      .then((res) => setUser(res.data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  // If the session expires while using the app, any 401 sends the user back to login.
  useEffect(() => {
    const id = api.interceptors.response.use(undefined, (err) => {
      if (err.response?.status === 401 && !err.config?.url?.startsWith('/auth/')) setUser(null);
      return Promise.reject(err);
    });
    return () => api.interceptors.response.eject(id);
  }, []);

  async function authenticate(path, payload) {
    const res = await api.post(path, payload);
    setUser(res.data.user);
  }

  const signup = (payload) => authenticate('/auth/register', payload);
  const login = (payload) => authenticate('/auth/login', payload);

  async function logout() {
    await api.post('/auth/logout').catch(() => {});
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, loading, signup, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
