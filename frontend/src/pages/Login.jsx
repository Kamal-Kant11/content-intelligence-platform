import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import AuthLayout from './AuthLayout.jsx';
import { FormField } from '../components/FormField.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { getErrorMessage } from '../api/client.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => {
    setValues((v) => ({ ...v, [field]: e.target.value }));
    if (errors[field]) setErrors((er) => ({ ...er, [field]: undefined }));
  };

  async function onSubmit(e) {
    e.preventDefault();
    setFormError('');
    const found = {};
    if (!EMAIL_RE.test(values.email.trim())) found.email = 'Enter a valid email address.';
    if (!values.password) found.password = 'Password is required.';
    setErrors(found);
    if (Object.keys(found).length) return;

    setLoading(true);
    try {
      await login({ email: values.email.trim(), password: values.password });
      navigate(location.state?.from || '/dashboard', { replace: true });
    } catch (err) {
      setFormError(getErrorMessage(err, 'Login failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to manage your documents."
      footer={
        <>
          New here?{' '}
          <Link to="/signup" className="font-medium text-indigo-300 hover:text-indigo-200">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {formError && (
          <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            {formError}
          </div>
        )}
        <FormField label="Email" id="email" type="email" autoComplete="email" value={values.email} onChange={set('email')} error={errors.email} />
        <FormField label="Password" id="password" type="password" autoComplete="current-password" value={values.password} onChange={set('password')} error={errors.password} />
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Logging in…
            </>
          ) : (
            'Login'
          )}
        </button>
      </form>
    </AuthLayout>
  );
}
