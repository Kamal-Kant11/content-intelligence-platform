import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import AuthLayout from './AuthLayout.jsx';
import { FormField } from '../components/FormField.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { getErrorMessage } from '../api/client.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validate(v) {
  const e = {};
  if (v.name.trim().length < 2) e.name = 'Full name must be at least 2 characters.';
  if (!EMAIL_RE.test(v.email.trim())) e.email = 'Enter a valid email address.';
  if (v.password.length < 8) e.password = 'Password must be at least 8 characters.';
  else if (!/[A-Za-z]/.test(v.password) || !/\d/.test(v.password))
    e.password = 'Password must include at least one letter and one number.';
  if (v.confirmPassword !== v.password) e.confirmPassword = 'Passwords do not match.';
  return e;
}

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState({ name: '', email: '', password: '', confirmPassword: '' });
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
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length) return;

    setLoading(true);
    try {
      await signup({ ...values, name: values.name.trim(), email: values.email.trim() });
      navigate('/onboarding', { replace: true });
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start preparing your content for quality assurance."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-indigo-300 hover:text-indigo-200">
            Login
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
        <FormField label="Full name" id="name" autoComplete="name" value={values.name} onChange={set('name')} error={errors.name} />
        <FormField label="Email" id="email" type="email" autoComplete="email" value={values.email} onChange={set('email')} error={errors.email} />
        <FormField label="Password" id="password" type="password" autoComplete="new-password" value={values.password} onChange={set('password')} error={errors.password} />
        <FormField label="Confirm password" id="confirmPassword" type="password" autoComplete="new-password" value={values.confirmPassword} onChange={set('confirmPassword')} error={errors.confirmPassword} />
        <p className="text-xs text-slate-500">At least 8 characters, including a letter and a number.</p>
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Creating account…
            </>
          ) : (
            'Create Account'
          )}
        </button>
      </form>
    </AuthLayout>
  );
}
