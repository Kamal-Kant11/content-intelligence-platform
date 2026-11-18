import { Link } from 'react-router-dom';
import logo from '../assets/logo.png';

export default function Logo({ to = '/' }) {
  return (
    <Link to={to} className="inline-flex items-center gap-2 font-semibold text-white">
      <img src={logo} alt="" className="h-8 w-8 object-contain" />
      <span className="text-base tracking-tight">
        Content<span className="text-gradient">IQ</span>
      </span>
    </Link>
  );
}
