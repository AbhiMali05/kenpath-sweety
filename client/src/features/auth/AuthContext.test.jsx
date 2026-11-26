import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from './AuthContext.jsx';
import useAuth from './useAuth.js';
import ProtectedRoute from '../../routes/ProtectedRoute.jsx';
import apiClient from '../../api/client.js';

const authState = vi.hoisted(() => ({ token: null }));
vi.mock('../../api/client.js', () => ({
  default: { get: vi.fn(), post: vi.fn() },
  readToken: () => authState.token,
  clearToken: () => { authState.token = null; },
  storeToken: (token) => { authState.token = token; },
  UNAUTHORIZED_EVENT: 'sweety:unauthorized',
}));

function PrivatePage() {
  const { user, logout } = useAuth();
  return <><p>Private for {user.name}</p><button type="button" onClick={logout}>Sign out</button></>;
}

function renderRoutes() {
  return render(<MemoryRouter initialEntries={['/private']}><AuthProvider><Routes>
    <Route path="/private" element={<ProtectedRoute />}><Route index element={<PrivatePage />} /></Route>
    <Route path="/login" element={<p>Sign in</p>} />
  </Routes></AuthProvider></MemoryRouter>);
}

describe('session restoration and protected routes', () => {
  beforeEach(() => {
    authState.token = null;
    apiClient.get.mockReset();
  });

  it('redirects an unauthenticated visitor away from a protected route', async () => {
    renderRoutes();
    expect(await screen.findByText('Sign in')).toBeInTheDocument();
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it('shows restoration loading and admits the user after profile verification', async () => {
    authState.token = 'header.payload.signature';
    let resolveProfile;
    apiClient.get.mockImplementation(() => new Promise((resolve) => { resolveProfile = resolve; }));
    renderRoutes();
    expect(screen.getByText('Restoring your secure session…')).toBeInTheDocument();
    resolveProfile({ data: { success: true, data: { user: { id: 7, name: 'A User' } } } });
    expect(await screen.findByText('Private for A User')).toBeInTheDocument();
  });

  it('clears an expired session and redirects to login', async () => {
    authState.token = 'header.payload.signature';
    apiClient.get.mockRejectedValue(new Error('expired'));
    renderRoutes();
    expect(await screen.findByText('Sign in')).toBeInTheDocument();
    expect(authState.token).toBeNull();
  });

  it('clears the session on logout', async () => {
    authState.token = 'header.payload.signature';
    apiClient.get.mockResolvedValue({ data: { success: true, data: { user: { id: 7, name: 'A User' } } } });
    renderRoutes();
    expect(await screen.findByText('Private for A User')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(await screen.findByText('Sign in')).toBeInTheDocument();
    expect(authState.token).toBeNull();
  });

  it('stores a successful login token and reacts to an unauthorized API response', async () => {
    apiClient.post.mockResolvedValue({ data: { success: true, data: { token: 'new.header.signature', user: { id: 8, name: 'New User' } } } });
    function LoginHarness() {
      const { login } = useAuth();
      return <button type="button" onClick={() => login({ email: 'new@example.com', password: 'secret123' })}>Log in</button>;
    }
    render(<MemoryRouter><AuthProvider><LoginHarness /></AuthProvider></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByRole('button', { name: 'Log in' })).toBeInTheDocument();
    await vi.waitFor(() => expect(authState.token).toBe('new.header.signature'));
    window.dispatchEvent(new Event('sweety:unauthorized'));
    await vi.waitFor(() => expect(authState.token).toBeNull());
  });
});
