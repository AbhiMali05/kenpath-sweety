import { useCallback, useEffect, useRef, useState } from 'react';
import apiClient, { clearToken, readToken, storeToken, UNAUTHORIZED_EVENT } from '../../api/client.js';
import AuthContext from './authContext.js';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(() => readToken() ? 'loading' : 'unauthenticated');
  const generation = useRef(0);

  const logout = useCallback(() => {
    generation.current += 1;
    clearToken();
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  useEffect(() => {
    const requestGeneration = ++generation.current;
    const token = readToken();
    if (!token) {
      return () => { generation.current += 1; };
    }

    const controller = new AbortController();
    apiClient.get('/auth/me', { signal: controller.signal })
      .then(({ data }) => {
        if (generation.current !== requestGeneration) return;
        const profile = data?.data?.user;
        if (!data?.success || !profile?.id) throw new Error('Unexpected profile response.');
        setUser(profile);
        setStatus('authenticated');
      })
      .catch(() => {
        if (generation.current !== requestGeneration) return;
        clearToken();
        setUser(null);
        setStatus('unauthenticated');
      });

    return () => {
      controller.abort();
      if (generation.current === requestGeneration) generation.current += 1;
    };
  }, []);

  useEffect(() => {
    const onUnauthorized = () => logout();
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, [logout]);

  const login = useCallback(async (credentials) => {
    const { data } = await apiClient.post('/auth/login', credentials);
    const token = data?.data?.token;
    const profile = data?.data?.user;
    if (!data?.success || !profile?.id) throw new Error('The server returned an unexpected sign-in response.');
    storeToken(token);
    generation.current += 1;
    setUser(profile);
    setStatus('authenticated');
    return profile;
  }, []);

  const value = { user, status, isLoading: status === 'loading', isAuthenticated: status === 'authenticated', login, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

