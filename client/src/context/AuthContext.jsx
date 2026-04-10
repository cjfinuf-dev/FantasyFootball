import { createContext, useState, useEffect, useCallback } from 'react';
import * as authApi from '../api/auth';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('ff-token');
    if (!token) { setLoading(false); return; }

    authApi.getMe()
      .then(data => setUser(data.user))
      .catch(() => { localStorage.removeItem('ff-token'); })
      .finally(() => setLoading(false));
  }, []);

  const handleSignup = useCallback(async ({ name, email, password }) => {
    const data = await authApi.signup({ name, email, password });
    localStorage.setItem('ff-token', data.token);
    setUser(data.user);
    return data;
  }, []);

  const handleSignin = useCallback(async ({ email, password }) => {
    const data = await authApi.signin({ email, password });
    localStorage.setItem('ff-token', data.token);
    setUser(data.user);
    return data;
  }, []);

  const handleSignout = useCallback(async () => {
    try { await authApi.signout(); } catch {}
    // NOTE: JWTs are stateless — there is no server-side revocation here.
    // A stolen token remains valid until it expires (7d). If revocation is needed,
    // implement a server-side token denylist or switch to short-lived access tokens
    // with refresh token rotation.
    localStorage.removeItem('ff-token');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signup: handleSignup, signin: handleSignin, signout: handleSignout }}>
      {children}
    </AuthContext.Provider>
  );
}
