import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, UserPlus, AlertCircle, Layers } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../services/auth';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});

    // Client-side validation matching backend schemas
    const errors: Record<string, string> = {};
    if (!name.trim()) {
      errors.name = 'Full name is required';
    } else if (name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }

    if (!email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);

    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
      });

      // Redirect to /login with success message (no automatic login)
      navigate('/login', {
        replace: true,
        state: {
          message: 'Account created successfully! Please sign in with your credentials.',
        },
      });
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
        if (err.fieldErrors) {
          setFieldErrors(err.fieldErrors);
        }
      } else {
        setErrorMessage('Unable to connect to the server. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-header">
        <div className="brand-badge">
          <Layers size={14} />
          <span>Enterprise Platform</span>
        </div>
        <h1 className="brand-title">Content Intelligence</h1>
        <p className="brand-subtitle">AI-powered knowledge discovery & content operations</p>
      </div>

      <div className="auth-card">
        <h2 className="card-title">Create Account</h2>
        <p className="card-desc">Register your workspace profile</p>

        {errorMessage && (
          <div className="alert alert-error" role="alert" id="register-error-banner">
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="register-name" className="form-label">
              Full Name
            </label>
            <div className="input-container">
              <input
                id="register-name"
                type="text"
                className={`form-input ${fieldErrors.name ? 'is-invalid' : ''}`}
                placeholder="Alex Morgan"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                autoFocus
                disabled={isSubmitting}
                aria-required="true"
                aria-invalid={!!fieldErrors.name}
                aria-describedby={fieldErrors.name ? 'register-name-error' : undefined}
              />
            </div>
            {fieldErrors.name && (
              <span id="register-name-error" className="field-error">
                {fieldErrors.name}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="register-email" className="form-label">
              Email Address
            </label>
            <div className="input-container">
              <input
                id="register-email"
                type="email"
                className={`form-input ${fieldErrors.email ? 'is-invalid' : ''}`}
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={isSubmitting}
                aria-required="true"
                aria-invalid={!!fieldErrors.email}
                aria-describedby={fieldErrors.email ? 'register-email-error' : undefined}
              />
            </div>
            {fieldErrors.email && (
              <span id="register-email-error" className="field-error">
                {fieldErrors.email}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="register-password" className="form-label">
              Password
            </label>
            <div className="input-container">
              <input
                id="register-password"
                type={showPassword ? 'text' : 'password'}
                className={`form-input has-icon-right ${fieldErrors.password ? 'is-invalid' : ''}`}
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                disabled={isSubmitting}
                aria-required="true"
                aria-invalid={!!fieldErrors.password}
                aria-describedby={fieldErrors.password ? 'register-password-error' : 'password-hint'}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={0}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {fieldErrors.password ? (
              <span id="register-password-error" className="field-error">
                {fieldErrors.password}
              </span>
            ) : (
              <p id="password-hint" className="field-hint">
                Must be at least 8 characters long
              </p>
            )}
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={isSubmitting}
            id="register-submit-btn"
          >
            {isSubmitting ? (
              <>
                <span className="spinner" />
                <span>Creating account...</span>
              </>
            ) : (
              <>
                <UserPlus size={16} />
                <span>Create Account</span>
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <span>Already have an account?</span>
          <Link to="/login" id="link-to-login">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};
