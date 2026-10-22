import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BadgeCheck,
  BrainCircuit,
  CheckCircle2,
  ClipboardCheck,
  FileDown,
  FileSearch,
  Layers,
  Lock,
  Palette,
  ScanSearch,
  ShieldCheck,
  Upload,
  Wand2,
} from 'lucide-react';
import Backdrop from '../components/Backdrop.jsx';
import Logo from '../components/Logo.jsx';
import { ScoreRing } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const fade = {
  hidden: { opacity: 0, y: 16 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.5, delay: i * 0.08, ease: 'easeOut' } }),
};

const PIPELINE = [
  { icon: Upload, title: 'Add', text: 'Write, paste, upload or import a URL' },
  { icon: Layers, title: 'Structure', text: 'Split into sections and blocks' },
  { icon: ScanSearch, title: 'Analyze', text: 'Score every section' },
  { icon: Wand2, title: 'Optimize', text: 'Proposed fixes per block' },
  { icon: ClipboardCheck, title: 'Review', text: 'Approve, reject or edit' },
  { icon: FileDown, title: 'Export', text: 'Download in the same format' },
];

const FEATURES = [
  { icon: FileSearch, title: 'Section-by-section analysis', text: 'Every heading gets its own score, so you know exactly which part needs work.' },
  { icon: CheckCircle2, title: 'Grammar & readability', text: 'Agreement, articles, punctuation, long sentences, difficult words, passive voice.' },
  { icon: Palette, title: 'Brand voice', text: 'Learns tone, vocabulary and style from your own guidelines and approved content.' },
  { icon: BadgeCheck, title: 'Claims vs. evidence', text: 'Flags “50% faster” when your approved case study says 37%.' },
  { icon: ClipboardCheck, title: 'Human review', text: 'Nothing changes until you approve it. Your original is never overwritten.' },
  { icon: BrainCircuit, title: 'Local models', text: 'Analysis runs on models trained on your data. No content goes to an external AI service.' },
];

function ProductPreview() {
  return (
    <div className="relative">
      <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-indigo-500/20 via-violet-500/10 to-transparent blur-2xl" />
      <div className="card relative overflow-hidden shadow-2xl shadow-black/40">
        <div className="flex items-center gap-1.5 border-b border-charcoal-700 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
          <span className="ml-3 text-xs text-slate-500">Spring launch.docx</span>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_9rem]">
          <div className="space-y-3 text-sm">
            <div className="rounded-lg border border-charcoal-700 p-3">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">Section 1 · Introduction</p>
              <p className="mt-1 text-slate-300">
                Our <span className="rounded bg-red-500/15 px-0.5 text-red-300 line-through">revolutionary</span> platform helps teams{' '}
                <span className="rounded bg-red-500/15 px-0.5 text-red-300 line-through">utilize</span>{' '}
                <span className="rounded bg-emerald-500/15 px-0.5 text-emerald-300">use</span> data.
              </p>
            </div>
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.04] p-3">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">Section 2 · Results</p>
              <p className="mt-1 text-slate-300">Customers save 50% of their time.</p>
              <p className="mt-2 text-xs text-amber-300">Claim says 50%, but “Case study” says 37%.</p>
            </div>
            <div className="rounded-lg border border-charcoal-700 p-3">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">Section 3 · Next steps</p>
              <p className="mt-1 text-slate-300">
                We <span className="rounded bg-red-500/15 px-0.5 text-red-300 line-through">was</span>{' '}
                <span className="rounded bg-emerald-500/15 px-0.5 text-emerald-300">were</span> ready for launch.
              </p>
            </div>
          </div>
          <div className="flex flex-col items-center gap-3 rounded-xl bg-charcoal-950/60 p-3">
            <ScoreRing score={86} size={96} stroke={8} />
            <div className="w-full space-y-1.5 text-[11px]">
              {[
                ['Grammar', 96],
                ['Readability', 92],
                ['Vocabulary', 90],
                ['Claims', 95],
              ].map(([k, v]) => (
                <div key={k}>
                  <div className="flex justify-between text-slate-400">
                    <span>{k}</span>
                    <span>{v}</span>
                  </div>
                  <div className="mt-0.5 h-1 rounded-full bg-charcoal-700">
                    <div className="h-full rounded-full bg-indigo-400" style={{ width: `${v}%` }} />
                  </div>
                </div>
              ))}
            </div>
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
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Logo />
          <nav className="flex items-center gap-2">
            <a href="#features" className="hidden px-3 py-2 text-sm text-slate-400 hover:text-white sm:inline">
              Features
            </a>
            <a href="#how" className="hidden px-3 py-2 text-sm text-slate-400 hover:text-white sm:inline">
              How it works
            </a>
            {user ? (
              <Link to="/dashboard" className="btn-primary">
                Open portal
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
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-14 lg:grid-cols-2 lg:pt-20">
          <div>
            <motion.p variants={fade} initial="hidden" animate="show" className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1 text-xs text-indigo-200">
              <Lock size={12} /> Runs on local models: your content stays with you
            </motion.p>
            <motion.h1 variants={fade} initial="hidden" animate="show" custom={1} className="mt-5 text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
              Publish content that is{' '}
              <span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-emerald-300 bg-clip-text text-transparent">well-written and on-brand</span>
            </motion.h1>
            <motion.p variants={fade} initial="hidden" animate="show" custom={2} className="mt-5 max-w-xl text-base text-slate-400 sm:text-lg">
              Analyze every section for grammar, readability, structure, brand voice and unsupported claims. Review the proposed fixes block by block, then
              download the updated document in the same format you uploaded.
            </motion.p>
            <motion.div variants={fade} initial="hidden" animate="show" custom={3} className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to={primary} className="btn-primary px-6 py-3">
                {user ? 'Open portal' : 'Start for free'} <ArrowRight size={16} />
              </Link>
              <a href="#how" className="btn-secondary px-6 py-3">
                See how it works
              </a>
            </motion.div>
            <motion.ul variants={fade} initial="hidden" animate="show" custom={4} className="mt-8 grid gap-2 text-sm text-slate-400 sm:grid-cols-2">
              {['PDF, DOCX, TXT and web pages', 'Score per section, out of 100', 'Original never overwritten', 'Export to DOCX, PDF, TXT, Markdown'].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-400" /> {t}
                </li>
              ))}
            </motion.ul>
          </div>
          <motion.div variants={fade} initial="hidden" animate="show" custom={2}>
            <ProductPreview />
          </motion.div>
        </section>

        <section id="how" className="scroll-mt-20 border-y border-charcoal-800 bg-charcoal-950/60 py-16">
          <div className="mx-auto max-w-6xl px-5">
            <h2 className="text-center text-2xl font-semibold text-white sm:text-3xl">One workflow, from draft to approved file</h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-slate-400">Every input goes through the same pipeline, so a pasted email and a 40-page PDF are handled the same way.</p>
            <ol className="mt-10 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {PIPELINE.map(({ icon: Icon, title, text }, i) => (
                <motion.li
                  key={title}
                  variants={fade}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, margin: '-40px' }}
                  custom={i}
                  className="card relative p-4"
                >
                  <span className="text-[11px] font-medium text-slate-600">0{i + 1}</span>
                  <span className="mt-2 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300">
                    <Icon size={19} />
                  </span>
                  <h3 className="mt-3 text-sm font-medium text-white">{title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">{text}</p>
                </motion.li>
              ))}
            </ol>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20">
          <h2 className="text-center text-2xl font-semibold text-white sm:text-3xl">Built for teams that publish a lot</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }, i) => (
              <motion.div key={title} variants={fade} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-40px' }} custom={i % 3} className="card p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/25 to-violet-500/15 text-indigo-200 ring-1 ring-indigo-400/20">
                  <Icon size={20} />
                </span>
                <h3 className="mt-4 font-medium text-white">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{text}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-6 px-5 pb-20 lg:grid-cols-2">
          <div className="card p-6">
            <p className="text-xs uppercase tracking-wide text-indigo-300">Content Quality</p>
            <h3 className="mt-2 text-xl font-semibold text-white">Is it well-written?</h3>
            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              {['Grammar: agreement, tense, articles, punctuation', 'Readability: long sentences, difficult words, grade level', 'Structure: long paragraphs, missing headings', 'Vocabulary: forbidden and preferred terms'].map((t) => (
                <li key={t} className="flex gap-2">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-400" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="card p-6">
            <p className="text-xs uppercase tracking-wide text-violet-300">Brand Intelligence</p>
            <h3 className="mt-2 text-xl font-semibold text-white">Is it right for your company?</h3>
            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              {['Learns voice and tone from your own material', 'Suggests rules; you approve, edit or reject them', 'Checks claims against approved sources', 'Every observation keeps its evidence'].map((t) => (
                <li key={t} className="flex gap-2">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-violet-300" /> {t}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-24">
          <div className="relative overflow-hidden rounded-3xl border border-indigo-400/20 bg-gradient-to-br from-indigo-500/20 via-charcoal-900 to-charcoal-900 p-8 text-center sm:p-12">
            <ShieldCheck className="mx-auto text-indigo-300" size={32} />
            <h2 className="mt-4 text-2xl font-semibold text-white sm:text-3xl">Check your next document in under a minute</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-slate-300">Upload a file, see the score for every section, apply the fixes you agree with and download the result.</p>
            <Link to={primary} className="btn-primary mt-7 px-6 py-3">
              {user ? 'Open portal' : 'Create your account'} <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-charcoal-800 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 text-xs text-slate-500 sm:flex-row">
          <Logo />
          <p>© {new Date().getFullYear()} AI Content Assurance Platform · All analysis runs locally</p>
        </div>
      </footer>
    </div>
  );
}
