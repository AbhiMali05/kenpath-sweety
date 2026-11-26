import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '../../api/client.js';
import { registerAccount } from '../../api/authApi.js';
import Brand from '../../components/layout/Brand.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterPage() {
  const navigate = useNavigate();
  const [values, setValues] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [requestError, setRequestError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate() {
    const next = {};
    if (!values.name.trim()) next.name = 'Enter your name.';
    if (!values.email.trim()) next.email = 'Enter your email address.';
    else if (!emailPattern.test(values.email.trim())) next.email = 'Enter a valid email address.';
    if (!values.password) next.password = 'Create a password.';
    else if (values.password.length < 8) next.password = 'Password must be at least 8 characters long.';
    if (!values.confirmPassword) next.confirmPassword = 'Confirm your password.';
    else if (values.password !== values.confirmPassword) next.confirmPassword = 'Passwords do not match.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setRequestError('');
    if (isSubmitting || !validate()) return;
    setIsSubmitting(true);
    try {
      await registerAccount({ name: values.name.trim(), email: values.email.trim(), password: values.password });
      navigate('/login', { replace: true, state: { registrationComplete: true } });
    } catch (error) {
      setRequestError(error?.userMessage || getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card register-card">
        <Brand />
        <div className="auth-intro"><span className="eyebrow">GET STARTED</span><h1>Make space for your health.</h1><p>Create an account to keep your personal readings together.</p></div>
        <form className="form-stack" onSubmit={handleSubmit} noValidate>
          {requestError && <ErrorState message={requestError} />}
          <label className="field-label" htmlFor="register-name">Name</label>
          <input id="register-name" className={`text-input${errors.name ? ' input-invalid' : ''}`} autoComplete="name" value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'register-name-error' : undefined} />
          {errors.name && <span className="field-error" id="register-name-error">{errors.name}</span>}
          <label className="field-label" htmlFor="register-email">Email address</label>
          <input id="register-email" className={`text-input${errors.email ? ' input-invalid' : ''}`} type="email" autoComplete="email" value={values.email} onChange={(event) => setValues({ ...values, email: event.target.value })} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'register-email-error' : undefined} />
          {errors.email && <span className="field-error" id="register-email-error">{errors.email}</span>}
          <label className="field-label" htmlFor="register-password">Password</label>
          <div className="password-wrap"><input id="register-password" className={`text-input${errors.password ? ' input-invalid' : ''}`} type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={values.password} onChange={(event) => setValues({ ...values, password: event.target.value })} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'register-password-error' : 'password-hint'} /><button className="password-toggle" type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? 'Hide' : 'Show'}</button></div>
          {errors.password ? <span className="field-error" id="register-password-error">{errors.password}</span> : <span className="field-hint" id="password-hint">Use at least 8 characters.</span>}
          <label className="field-label" htmlFor="register-confirm-password">Confirm password</label>
          <input id="register-confirm-password" className={`text-input${errors.confirmPassword ? ' input-invalid' : ''}`} type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={values.confirmPassword} onChange={(event) => setValues({ ...values, confirmPassword: event.target.value })} aria-invalid={Boolean(errors.confirmPassword)} aria-describedby={errors.confirmPassword ? 'register-confirm-error' : undefined} />
          {errors.confirmPassword && <span className="field-error" id="register-confirm-error">{errors.confirmPassword}</span>}
          <button className="button button-primary form-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating account…' : 'Create account'}</button>
        </form>
        <p className="auth-footnote">Already have an account? <Link to="/login">Sign in</Link></p>
      </section>
      <aside className="auth-aside"><div className="aside-orbit orbit-one" /><div className="aside-orbit orbit-two" /><span className="eyebrow">MADE FOR EVERYDAY USE</span><h2>Your numbers,<br />in their place.</h2><p>Simple tools to help you keep your personal record organized.</p><span className="aside-caption">Private by design.</span></aside>
    </main>
  );
}
