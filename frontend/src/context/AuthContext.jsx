import { createContext, useContext, useEffect, useState } from 'react';
import { api, getToken, saveToken, removeToken } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On page load, use the saved token (if any) to restore the logged-in user.
  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    api
      .get('/auth/me')
      .then((res) => setUser(res.data.user))
      .catch(() => removeToken())
      .finally(() => setLoading(false));
  }, []);

  async function authenticate(path, payload) {
    const res = await api.post(path, payload);
    saveToken(res.data.token);
    setUser(res.data.user);
  }

  const signup = (payload) => authenticate('/auth/signup', payload);
  const login = (payload) => authenticate('/auth/login', payload);

  function logout() {
    removeToken();
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, loading, signup, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
