import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '../../api/client.js';
import Brand from '../../components/layout/Brand.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import useAuth from './useAuth.js';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const registered = Boolean(location.state?.registrationComplete);
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [requestError, setRequestError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate() {
    const next = {};
    if (!values.email.trim()) next.email = 'Enter your email address.';
    else if (!emailPattern.test(values.email.trim())) next.email = 'Enter a valid email address.';
    if (!values.password) next.password = 'Enter your password.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setRequestError('');
    if (isSubmitting || !validate()) return;
    setIsSubmitting(true);
    try {
      await login({ email: values.email.trim(), password: values.password });
      const destination = location.state?.from;
      const destinationUrl = destination?.pathname?.startsWith('/')
        ? `${destination.pathname}${destination.search || ''}${destination.hash || ''}`
        : '/readings';
      navigate(destinationUrl, { replace: true });
    } catch (error) {
      setRequestError(error?.userMessage || error?.message || getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Brand />
        <div className="auth-intro"><span className="eyebrow">WELCOME BACK</span><h1>Your health, in view.</h1><p>Sign in to continue to your personal glucose tracker.</p></div>
        {registered && <div className="success-message" role="status">Account created. You can sign in now.</div>}
        <form className="form-stack" onSubmit={handleSubmit} noValidate>
          {requestError && <ErrorState message={requestError} />}
          <label className="field-label" htmlFor="login-email">Email address</label>
          <input id="login-email" className={`text-input${errors.email ? ' input-invalid' : ''}`} type="email" autoComplete="email" value={values.email} onChange={(event) => setValues({ ...values, email: event.target.value })} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'login-email-error' : undefined} />
          {errors.email && <span className="field-error" id="login-email-error">{errors.email}</span>}
          <label className="field-label" htmlFor="login-password">Password</label>
          <div className="password-wrap"><input id="login-password" className={`text-input${errors.password ? ' input-invalid' : ''}`} type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={values.password} onChange={(event) => setValues({ ...values, password: event.target.value })} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'login-password-error' : undefined} /><button className="password-toggle" type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? 'Hide' : 'Show'}</button></div>
          {errors.password && <span className="field-error" id="login-password-error">{errors.password}</span>}
          <button className="button button-primary form-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Signing in…' : 'Sign in'}</button>
        </form>
        <p className="auth-footnote">New to Sweety? <Link to="/register">Create an account</Link></p>
      </section>
      <aside className="auth-aside"><div className="aside-orbit orbit-one" /><div className="aside-orbit orbit-two" /><span className="eyebrow">A LITTLE MORE CLARITY</span><h2>Small check-ins.<br />A clearer picture.</h2><p>Keep your readings organized in one thoughtful space.</p><span className="aside-caption">Personal tracking, made simple.</span></aside>
    </main>
  );
}
