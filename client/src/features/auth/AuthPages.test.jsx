import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginPage from './LoginPage.jsx';
import RegisterPage from './RegisterPage.jsx';
import useAuth from './useAuth.js';
import { registerAccount } from '../../api/authApi.js';

vi.mock('./useAuth.js', () => ({ default: vi.fn() }));
vi.mock('../../api/authApi.js', () => ({ registerAccount: vi.fn() }));

function renderRoute(path, element, routes = []) {
  return render(<MemoryRouter initialEntries={[path]}><Routes><Route path={path} element={element} />{routes.map(([route, page]) => <Route key={route} path={route} element={page} />)}</Routes></MemoryRouter>);
}

describe('authentication pages', () => {
  const login = vi.fn();

  beforeEach(() => {
    useAuth.mockReturnValue({ login });
    login.mockReset();
    registerAccount.mockReset();
  });

  it('renders labeled login fields and validates required and malformed email values', async () => {
    const user = userEvent.setup();
    renderRoute('/login', <LoginPage />);
    expect(screen.getByLabelText('Email address')).toHaveAttribute('autocomplete', 'email');
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'current-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Enter your email address.')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Email address'), 'not-an-email');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it('submits login, prevents duplicate submissions, and returns to the requested page', async () => {
    let finishLogin;
    login.mockImplementation(() => new Promise((resolve) => { finishLogin = resolve; }));
    const user = userEvent.setup();
    renderRoute('/login', <LoginPage />, [['/readings', <p>My readings</p>]]);
    await user.type(screen.getByLabelText('Email address'), ' person@example.com ');
    await user.type(screen.getByLabelText('Password'), 'secret123');
    const submit = screen.getByRole('button', { name: 'Sign in' });
    fireEvent.submit(submit.closest('form'));
    fireEvent.submit(submit.closest('form'));
    expect(login).toHaveBeenCalledTimes(1);
    expect(login).toHaveBeenCalledWith({ email: 'person@example.com', password: 'secret123' });
    expect(screen.getByRole('button', { name: 'Signing in…' })).toBeDisabled();
    finishLogin();
    expect(await screen.findByText('My readings')).toBeInTheDocument();
  });

  it('shows invalid credentials and provides a working password visibility control', async () => {
    const user = userEvent.setup();
    login.mockRejectedValue({ userMessage: 'Invalid email or password.' });
    renderRoute('/login', <LoginPage />);
    const password = screen.getByLabelText('Password');
    await user.type(screen.getByLabelText('Email address'), 'person@example.com');
    await user.type(password, 'wrongpass');
    await user.click(screen.getByRole('button', { name: 'Show password' }));
    expect(password).toHaveAttribute('type', 'text');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password.');
  });

  it('validates registration fields and password confirmation', async () => {
    const user = userEvent.setup();
    renderRoute('/register', <RegisterPage />);
    await user.type(screen.getByLabelText('Name'), 'A User');
    await user.type(screen.getByLabelText('Email address'), 'person@example.com');
    await user.type(screen.getByLabelText('Password'), 'secret123');
    await user.type(screen.getByLabelText('Confirm password'), 'different');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument();
    expect(registerAccount).not.toHaveBeenCalled();
  });

  it('registers successfully and navigates to login with confirmation', async () => {
    const user = userEvent.setup();
    registerAccount.mockResolvedValueOnce({});
    renderRoute('/register', <RegisterPage />, [['/login', <LoginPage />]]);
    await user.type(screen.getByLabelText('Name'), 'A User');
    await user.type(screen.getByLabelText('Email address'), 'person@example.com');
    await user.type(screen.getByLabelText('Password'), 'secret123');
    await user.type(screen.getByLabelText('Confirm password'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Account created. You can sign in now.');
    expect(registerAccount).toHaveBeenCalledWith({ name: 'A User', email: 'person@example.com', password: 'secret123' });
    expect(screen.queryByText('secret123')).not.toBeInTheDocument();
  });

  it('displays duplicate email errors without exposing the password', async () => {
    const user = userEvent.setup();
    registerAccount.mockRejectedValue({ userMessage: 'An account already uses this email.' });
    renderRoute('/register', <RegisterPage />);
    await user.type(screen.getByLabelText('Name'), 'A User');
    await user.type(screen.getByLabelText('Email address'), 'person@example.com');
    await user.type(screen.getByLabelText('Password'), 'secret123');
    await user.type(screen.getByLabelText('Confirm password'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('An account already uses this email.');
    expect(screen.queryByText('secret123')).not.toBeInTheDocument();
  });
});
