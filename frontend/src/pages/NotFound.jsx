import { Link } from 'react-router-dom';
import Backdrop from '../components/Backdrop.jsx';

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <Backdrop />
      <div className="text-center">
        <p className="text-sm font-medium text-indigo-300">404</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Page not found</h1>
        <p className="mt-2 text-sm text-slate-400">The page you're looking for doesn't exist.</p>
        <Link to="/" className="btn-primary mt-6">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
