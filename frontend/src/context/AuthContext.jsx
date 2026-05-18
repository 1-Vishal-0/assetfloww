import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('eis_user'));
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // On mount: if we have a token, verify it with /auth/me
  // If it fails, clear local storage silently
  useEffect(() => {
    const token = localStorage.getItem('eis_token');
    if (!token) {
      setLoading(false);
      return;
    }

    authAPI.getMe()
      .then((res) => {
        // res is already unwrapped by interceptor: { success, user }
        const userData = res.user || res.data?.user;
        if (userData) setUser(userData);
      })
      .catch(() => {
        // Token invalid/expired — clear everything
        localStorage.removeItem('eis_token');
        localStorage.removeItem('eis_user');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  /**
   * login(email, password) → saves token + user to localStorage, updates state
   * The backend returns: { success: true, token: '...', user: { id, email, role } }
   * The interceptor unwraps .data, so `res` = { success, token, user }
   */
  const login = useCallback(async (email, password) => {
    const res = await authAPI.login({ email, password });
    const token = res.token;
    const userData = res.user;

    if (!token) throw new Error('No token received from server');

    localStorage.setItem('eis_token', token);
    localStorage.setItem('eis_user', JSON.stringify(userData));
    setUser(userData);

    return res;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('eis_token');
    localStorage.removeItem('eis_user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
