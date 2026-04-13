import { createContext, useState, useEffect, useCallback } from 'react';
import * as authApi from '../api/auth';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check auth state via cookie-authenticated /me endpoint
    authApi.getMe()
      .then(data => setUser(data.user))
      .catch(() => { /* no valid session */ })
      .finally(() => setLoading(false));
  }, []);

  const handleSignup = useCallback(async ({ name, email, password }) => {
    const data = await authApi.signup({ name, email, password });
    setUser(data.user);
    return data;
  }, []);

  const handleSignin = useCallback(async ({ email, password }) => {
    const data = await authApi.signin({ email, password });
    setUser(data.user);
    return data;
  }, []);

  const handleSignout = useCallback(async () => {
    try { await authApi.signout(); } catch {}
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signup: handleSignup, signin: handleSignin, signout: handleSignout }}>
      {children}
    </AuthContext.Provider>
  );
}
