import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

export default function Logo({ to = '/' }) {
  return (
    <Link to={to} className="inline-flex items-center gap-2 font-semibold text-white">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-400/30">
        <ShieldCheck className="h-4.5 w-4.5" size={18} />
      </span>
      <span className="text-sm tracking-tight sm:text-base">Content Assurance</span>
    </Link>
  );
}
