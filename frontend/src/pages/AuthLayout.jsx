import { motion } from 'framer-motion';
import Backdrop from '../components/Backdrop.jsx';
import Logo from '../components/Logo.jsx';

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <Backdrop />
      <div className="px-5 py-5">
        <div className="mx-auto max-w-6xl">
          <Logo />
        </div>
      </div>
      <main className="flex flex-1 items-center justify-center px-5 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="card w-full max-w-md p-6 sm:p-8"
        >
          <h1 className="text-2xl font-semibold text-white">{title}</h1>
          <p className="mt-1.5 text-sm text-slate-400">{subtitle}</p>
          <div className="mt-6">{children}</div>
          <div className="mt-6 text-center text-sm text-slate-400">{footer}</div>
        </motion.div>
      </main>
    </div>
  );
}
