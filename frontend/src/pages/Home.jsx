import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, CheckCircle2, ClipboardCheck, FileDown, FileUp, Globe, ScanSearch, SpellCheck, Type, Wand2 } from 'lucide-react';
import Backdrop from '../components/Backdrop.jsx';
import Logo from '../components/Logo.jsx';
import { ScoreRing } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const fade = {
  hidden: { opacity: 0, y: 16 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.5, delay: i * 0.08, ease: 'easeOut' } }),
};

const STEPS = [
  { icon: FileUp, title: 'Add content', text: 'Upload a PDF, DOCX or TXT file, enter a website URL, or paste text.' },
  { icon: ScanSearch, title: 'Analyze', text: 'Get a grammar score and a readability score, with every issue listed.' },
  { icon: Wand2, title: 'Optimize', text: 'Safe grammar fixes and plain-wording rules create a new draft.' },
  { icon: ClipboardCheck, title: 'Review', text: 'Compare side by side, then approve, edit or reject.' },
  { icon: FileDown, title: 'Download', text: 'Export the approved version as TXT or DOCX.' },
];

function ProductPreview() {
  return (
    <div className="relative">
      <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-indigo-500/20 via-violet-500/20 to-transparent blur-2xl" />
      <div className="card relative overflow-hidden shadow-xl shadow-black/40">
        <div className="border-b border-charcoal-800 px-5 py-3 text-xs text-slate-400">Product update.docx · before and after</div>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <div className="rounded-xl bg-charcoal-950/60 p-4 text-sm leading-7 text-slate-200">
            We <del className="rounded-sm bg-red-500/20 text-red-300">was</del>{' '}
            <ins className="rounded-sm bg-emerald-500/20 text-emerald-300 no-underline">were</ins> able to ship the release{' '}
            <del className="rounded-sm bg-red-500/20 text-red-300">in order to</del> <ins className="rounded-sm bg-emerald-500/20 text-emerald-300 no-underline">to</ins> help
            teams <del className="rounded-sm bg-red-500/20 text-red-300">utilize</del> <ins className="rounded-sm bg-emerald-500/20 text-emerald-300 no-underline">use</ins>{' '}
            their data.
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              ['Grammar', 64, 92],
              ['Readability', 48, 61],
            ].map(([label, before, after]) => (
              <div key={label} className="flex flex-col items-center rounded-xl border border-charcoal-800 p-3">
                <ScoreRing score={after} size={72} stroke={6} />
                <p className="mt-2 text-xs font-medium text-white">{label}</p>
                <p className="text-[11px] text-slate-400">was {before}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const primary = user ? '/dashboard' : '/signup';

  return (
    <div className="relative min-h-screen">
      <Backdrop />

      <header className="sticky top-0 z-20 border-b border-charcoal-800/60 bg-charcoal-950/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Logo />
          <nav className="flex items-center gap-2">
            <a href="#how" className="hidden px-3 py-2 text-sm text-slate-300 hover:text-white sm:inline">
              How it works
            </a>
            {user ? (
              <Link to="/dashboard" className="btn-primary">
                Open dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn-secondary">
                  Log in
                </Link>
                <Link to="/signup" className="btn-primary hidden sm:inline-flex">
                  Get started
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-14 lg:grid-cols-2 lg:pt-20">
          <div>
            <motion.h1 variants={fade} initial="hidden" animate="show" className="text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
              Clear, correct content <span className="text-gradient">before you publish</span>
            </motion.h1>
            <motion.p variants={fade} initial="hidden" animate="show" custom={1} className="mt-5 max-w-xl text-base text-slate-300 sm:text-lg">
              ContentIQ checks two things: grammar and readability. It suggests a cleaner draft, shows you exactly what changed, and lets you download the
              version you approve.
            </motion.p>
            <motion.div variants={fade} initial="hidden" animate="show" custom={2} className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to={primary} className="btn-primary px-6 py-3">
                {user ? 'Open dashboard' : 'Create a free account'} <ArrowRight size={16} />
              </Link>
              <a href="#how" className="btn-secondary px-6 py-3">
                See how it works
              </a>
            </motion.div>
            <motion.ul variants={fade} initial="hidden" animate="show" custom={3} className="mt-8 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
              {['PDF, DOCX, TXT, web pages or pasted text', 'Grammar checked with LanguageTool', 'Readability by Flesch Reading Ease', 'Your original is never overwritten'].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="shrink-0 text-emerald-400" /> {t}
                </li>
              ))}
            </motion.ul>
          </div>
          <motion.div variants={fade} initial="hidden" animate="show" custom={2}>
            <ProductPreview />
          </motion.div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-6 px-4 pb-16 md:grid-cols-2">
          <div className="card p-6">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300">
              <SpellCheck size={20} />
            </span>
            <h2 className="mt-4 text-lg font-semibold text-white">Grammar</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
              Every spelling, grammar and punctuation issue LanguageTool finds, with its position and suggested fixes, plus a score out of 100. Only
              unambiguous fixes are applied automatically; the rest are yours to choose.
            </p>
          </div>
          <div className="card p-6">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
              <BookOpen size={20} />
            </span>
            <h2 className="mt-4 text-lg font-semibold text-white">Readability</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
              Flesch Reading Ease, sentence length, word length and reading level. The optimizer replaces wordy phrases and splits overly long sentences, and
              leaves everything else as it is.
            </p>
          </div>
        </section>

        <section id="how" className="scroll-mt-20 border-y border-charcoal-700 bg-charcoal-950/60 py-16">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center text-2xl font-semibold text-white sm:text-3xl">From draft to approved file</h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-slate-300">
              <Globe size={14} className="mr-1 inline" /> Website, <FileUp size={14} className="mx-1 inline" /> file or <Type size={14} className="mx-1 inline" /> pasted
              text: every input goes through the same analysis.
            </p>
            <ol className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {STEPS.map(({ icon: Icon, title, text }, i) => (
                <motion.li key={title} variants={fade} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-40px' }} custom={i} className="card p-4">
                  <span className="text-[11px] font-medium text-slate-500">0{i + 1}</span>
                  <span className="mt-2 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white">
                    <Icon size={19} />
                  </span>
                  <h3 className="mt-3 text-sm font-semibold text-white">{title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-300">{text}</p>
                </motion.li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20 text-center">
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">Check your next document in a minute</h2>
          <Link to={primary} className="btn-primary mt-7 px-6 py-3">
            {user ? 'Open dashboard' : 'Create your account'} <ArrowRight size={16} />
          </Link>
        </section>
      </main>

      <footer className="border-t border-charcoal-700 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-xs text-slate-400 sm:flex-row">
          <Logo />
          <p>© {new Date().getFullYear()} ContentIQ · Grammar and readability checks</p>
        </div>
      </footer>
    </div>
  );
}
