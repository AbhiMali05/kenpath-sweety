import axios from 'axios';

export const TOKEN_STORAGE_KEY = 'sweety.accessToken';
export const UNAUTHORIZED_EVENT = 'sweety:unauthorized';

export function isUsableToken(token) {
  return typeof token === 'string' && token.trim() === token && token.split('.').length === 3 && token.split('.').every(Boolean);
}

export function readToken() {
  try {
    const token = window.sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) return null;
    if (isUsableToken(token)) return token;
    window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    return null;
  } catch {
    return null;
  }
}

export function storeToken(token) {
  if (!isUsableToken(token)) throw new Error('The server returned an invalid authentication token.');
  window.sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearToken() {
  try { window.sessionStorage.removeItem(TOKEN_STORAGE_KEY); } catch { /* Storage may be restricted. */ }
}

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  timeout: 10000,
  headers: { Accept: 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = readToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  else delete config.headers.Authorization;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url ?? '';
    const credentialRequest = /\/auth\/(login|register)\/?$/.test(url);
    if (error.response?.status === 401 && readToken() && !credentialRequest) {
      clearToken();
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    if (!error.response) error.userMessage = 'The server could not be reached. Check your connection and try again.';
    else if (error.response.status >= 500) error.userMessage = 'The service is temporarily unavailable. Please try again later.';
    else if (error.response.status === 401 && credentialRequest) error.userMessage = error.response.data?.message || 'Email or password was not accepted.';
    else if (error.response.status === 401) error.userMessage = 'Your session has expired. Please sign in again.';
    else error.userMessage = error.response.data?.message || 'Please check the information and try again.';
    return Promise.reject(error);
  },
);

export function getApiErrorMessage(error) {
  return error?.userMessage || 'Something went wrong. Please try again.';
}

export default apiClient;
