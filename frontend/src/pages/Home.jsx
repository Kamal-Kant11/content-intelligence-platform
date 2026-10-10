import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Upload, ScanSearch, Wand2, ClipboardCheck, ArrowRight } from 'lucide-react';
import Backdrop from '../components/Backdrop.jsx';
import Logo from '../components/Logo.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const steps = [
  { icon: Upload, title: 'Upload', text: 'Add your PDF, DOCX or TXT documents securely to your private workspace.' },
  { icon: ScanSearch, title: 'Analyze', text: 'Content analysis will review your documents against quality standards.' },
  { icon: Wand2, title: 'Improve', text: 'Act on clear, actionable suggestions to strengthen your content.' },
  { icon: ClipboardCheck, title: 'Review', text: 'Do a final review so everything is ready before you publish.' },
];

const fade = {
  hidden: { opacity: 0, y: 14 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.5, delay: i * 0.08, ease: 'easeOut' } }),
};

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="relative min-h-screen">
      <Backdrop />

      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo />
        <nav className="flex items-center gap-2">
          {user ? (
            <Link to="/dashboard" className="btn-primary">
              Dashboard
            </Link>
          ) : (
            <Link to="/login" className="btn-secondary">
              Login
            </Link>
          )}
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-4xl px-5 pb-20 pt-16 text-center sm:pt-24">
          <motion.h1
            variants={fade}
            initial="hidden"
            animate="show"
            custom={0}
            className="text-4xl font-semibold tracking-tight text-white sm:text-5xl md:text-6xl"
          >
            Make Your Content Ready Before You Publish
          </motion.h1>
          <motion.p
            variants={fade}
            initial="hidden"
            animate="show"
            custom={1}
            className="mx-auto mt-5 max-w-xl text-base text-slate-400 sm:text-lg"
          >
            Upload your documents and prepare your content for quality assurance.
          </motion.p>
          <motion.div
            variants={fade}
            initial="hidden"
            animate="show"
            custom={2}
            className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Link to={user ? '/dashboard' : '/signup'} className="btn-primary w-full px-6 py-3 sm:w-auto">
              Get Started <ArrowRight size={16} />
            </Link>
            {!user && (
              <Link to="/login" className="btn-secondary w-full px-6 py-3 sm:w-auto">
                Login
              </Link>
            )}
          </motion.div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-24" aria-labelledby="how-it-works">
          <motion.h2
            id="how-it-works"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center text-2xl font-semibold text-white"
          >
            How It Works
          </motion.h2>
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(({ icon: Icon, title, text }, i) => (
              <motion.li
                key={title}
                variants={fade}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: '-40px' }}
                custom={i}
                className="card p-5"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-300">
                    <Icon size={20} />
                  </span>
                  <span className="text-xs font-medium text-slate-500">0{i + 1}</span>
                </div>
                <h3 className="mt-4 font-medium text-white">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{text}</p>
              </motion.li>
            ))}
          </ol>
          <p className="mt-6 text-center text-xs text-slate-500">
            Currently available: Upload. Analysis, improvement and review arrive in later phases.
          </p>
        </section>
      </main>

      <footer className="border-t border-charcoal-800 py-6 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} AI Content Assurance Platform
      </footer>
    </div>
  );
}
