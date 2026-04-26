import { useRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  FolderKanban,
  Timer,
  Shield,
  ArrowRight,
  CheckCircle,
  ChevronRight,
  Users,
  BarChart3,
  Zap,
  Globe,
  Lock,
  RefreshCw,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   Tiny helpers
───────────────────────────────────────────── */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

/* ─────────────────────────────────────────────
   Data
───────────────────────────────────────────── */
const FEATURES = [
  {
    icon: Timer,
    title: 'Real-time Clock In/Out',
    desc: "One-tap punch-in with a live elapsed timer. Know exactly who's working and for how long.",
    accent: 'from-emerald-500/20 to-teal-500/5 border-emerald-500/20',
    iconColor: 'text-emerald-400',
  },
  {
    icon: FolderKanban,
    title: 'Project Management',
    desc: 'Organise work into projects with codes, departments, and custom statuses. Full lifecycle tracking.',
    accent: 'from-indigo-500/20 to-violet-500/5 border-indigo-500/20',
    iconColor: 'text-indigo-400',
  },
  {
    icon: BarChart3,
    title: 'Timecard Logs',
    desc: 'Submit daily work logs with hours and project annotation. Full history always available.',
    accent: 'from-sky-500/20 to-cyan-500/5 border-sky-500/20',
    iconColor: 'text-sky-400',
  },
  {
    icon: Users,
    title: 'Team Assignments',
    desc: 'Assign people to projects with roles. Approve, reject, or revoke access in a single click.',
    accent: 'from-violet-500/20 to-purple-500/5 border-violet-500/20',
    iconColor: 'text-violet-400',
  },
  {
    icon: Shield,
    title: 'Role-Based Access',
    desc: 'Granular RBAC out of the box. Admins see everything; members see only what they need.',
    accent: 'from-rose-500/20 to-pink-500/5 border-rose-500/20',
    iconColor: 'text-rose-400',
  },
  {
    icon: Zap,
    title: 'Instant API',
    desc: 'Every feature is backed by a production-ready FastAPI. Extend or integrate in minutes.',
    accent: 'from-amber-500/20 to-orange-500/5 border-amber-500/20',
    iconColor: 'text-amber-400',
  },
];

const STATS = [
  { value: '100%', label: 'Open Source' },
  { value: '<50ms', label: 'API Response' },
  { value: '6', label: 'Core Modules' },
  { value: '∞', label: 'Team Size' },
];

const HOW_IT_WORKS = [
  { step: '01', title: 'Create an account', desc: 'Register in seconds — no credit card, no setup fee.' },
  { step: '02', title: 'Set up projects', desc: 'Add your projects with codes and assign team members.' },
  { step: '03', title: 'Start tracking', desc: 'Clock in, log hours, and review timecards from one dashboard.' },
];

/* ─────────────────────────────────────────────
   Components
───────────────────────────────────────────── */
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-xl'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <Clock className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-bold text-slate-100 tracking-tight">WorkTracker</span>
        </div>

        <div className="hidden md:flex items-center gap-7">
          {['Features', 'How it works', 'About'].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
              className="text-sm text-slate-400 hover:text-slate-100 transition-colors"
            >
              {item}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="hidden sm:inline-flex px-4 py-1.5 text-sm text-slate-300 hover:text-white transition-colors"
          >
            Sign in
          </Link>
          <Link
            to="/register"
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white rounded-lg bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/20"
          >
            Get started <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </nav>
  );
}

function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-indigo-600/8 rounded-full blur-3xl" />
        <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-violet-600/6 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-sky-600/6 rounded-full blur-3xl" />
        {/* Grid */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `linear-gradient(rgba(148,163,184,0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(148,163,184,0.3) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <div className="relative max-w-6xl mx-auto px-6 py-24 flex flex-col items-center text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-indigo-500/25 bg-indigo-500/8 mb-8 text-xs font-medium text-indigo-300">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          Now in production — start tracking today
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-slate-100 leading-[1.06] tracking-tight max-w-4xl mb-6">
          Track time.{' '}
          <span className="relative">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-sky-400">
              Ship projects.
            </span>
          </span>{' '}
          <br className="hidden sm:block" />
          Stay in control.
        </h1>

        <p className="text-lg text-slate-400 max-w-xl leading-relaxed mb-10">
          WorkTracker brings attendance, project management, and team assignments into one clean
          interface — built for teams that value clarity over complexity.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Link
            to="/register"
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white rounded-xl bg-indigo-600 hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/25 hover:shadow-indigo-600/40 hover:-translate-y-0.5"
          >
            Start for free <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-slate-300 rounded-xl border border-slate-700 hover:border-slate-600 hover:text-white transition-all hover:bg-slate-800/60"
          >
            Sign in to your account
          </Link>
        </div>

        {/* Social proof strip */}
        <div className="flex flex-wrap justify-center items-center gap-6 mt-14 text-xs text-slate-600">
          {['No credit card', 'Self-hosted or cloud', 'Open source', 'MIT License'].map((t) => (
            <span key={t} className="flex items-center gap-1.5">
              <CheckCircle className="w-3 h-3 text-emerald-500" />
              {t}
            </span>
          ))}
        </div>

        {/* Dashboard preview mockup */}
        <div className="mt-16 w-full max-w-4xl relative">
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-b from-indigo-500/20 to-transparent blur-xl opacity-60" />
          <div className="relative rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur overflow-hidden shadow-2xl">
            {/* Window chrome */}
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-slate-800 bg-slate-950/60">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
              <div className="ml-4 flex-1 h-5 rounded-md bg-slate-800 max-w-xs" />
            </div>
            {/* Mock dashboard content */}
            <div className="p-5 grid grid-cols-4 gap-3 mb-3">
              {[
                { label: 'Active Projects', val: '8', color: 'text-indigo-400' },
                { label: 'This week', val: '34.5h', color: 'text-emerald-400' },
                { label: 'Total hours', val: '412h', color: 'text-sky-400' },
                { label: 'Timecards', val: '76', color: 'text-violet-400' },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-slate-800 bg-slate-800/50 p-4">
                  <p className="text-[10px] text-slate-600 mb-1 uppercase tracking-wide">{s.label}</p>
                  <p className={`text-xl font-bold ${s.color}`}>{s.val}</p>
                </div>
              ))}
            </div>
            <div className="px-5 pb-5 grid grid-cols-5 gap-3">
              <div className="col-span-3 rounded-xl border border-slate-800 bg-slate-800/30 h-36 p-4">
                <p className="text-[10px] text-slate-600 uppercase tracking-wide mb-3">Recent timecards</p>
                {['Q4 Engineering Sprint', 'Frontend redesign', 'API v2 docs'].map((n, i) => (
                  <div key={n} className="flex items-center justify-between py-1.5 border-b border-slate-800/60 last:border-0">
                    <span className="text-xs text-slate-400">{n}</span>
                    <span className="text-xs font-semibold text-slate-300">{[8, 6.5, 4][i]}h</span>
                  </div>
                ))}
              </div>
              <div className="col-span-2 rounded-xl border border-slate-800 bg-slate-800/30 h-36 p-4">
                <p className="text-[10px] text-slate-600 uppercase tracking-wide mb-3">Projects</p>
                {[
                  { name: 'Q4SPN', dot: 'bg-emerald-400' },
                  { name: 'FDSGN', dot: 'bg-indigo-400' },
                  { name: 'APIV2', dot: 'bg-amber-400' },
                ].map((p) => (
                  <div key={p.name} className="flex items-center gap-2 py-1.5 border-b border-slate-800/60 last:border-0">
                    <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />
                    <span className="text-xs text-slate-400 font-mono">{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatsSection() {
  const { ref, visible } = useInView();
  return (
    <section ref={ref} className="border-y border-slate-800 bg-slate-900/40">
      <div className="max-w-6xl mx-auto px-6 py-14 grid grid-cols-2 md:grid-cols-4 gap-8">
        {STATS.map((s, i) => (
          <div
            key={s.label}
            className={`flex flex-col items-center text-center transition-all duration-500`}
            style={{ transitionDelay: `${i * 80}ms`, opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(16px)' }}
          >
            <span className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400 mb-1">
              {s.value}
            </span>
            <span className="text-xs text-slate-500 uppercase tracking-widest">{s.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function FeaturesSection() {
  const { ref, visible } = useInView(0.1);
  return (
    <section id="features" className="py-28 max-w-6xl mx-auto px-6">
      <div className="text-center mb-16">
        <p className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-3">Everything you need</p>
        <h2 className="text-4xl font-extrabold text-slate-100 tracking-tight">Built for how teams actually work</h2>
        <p className="text-slate-400 mt-4 max-w-lg mx-auto text-sm leading-relaxed">
          A focused set of tools — time tracking, project management, and access control — that work together seamlessly.
        </p>
      </div>

      <div
        ref={ref}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
      >
        {FEATURES.map((f, i) => (
          <div
            key={f.title}
            className={`bg-gradient-to-br ${f.accent} border rounded-2xl p-6 transition-all duration-500 hover:scale-[1.02] hover:shadow-lg`}
            style={{ transitionDelay: `${i * 60}ms`, opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(20px)' }}
          >
            <div className={`w-10 h-10 rounded-xl bg-slate-900/80 flex items-center justify-center mb-4 ${f.iconColor}`}>
              <f.icon className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-100 mb-2">{f.title}</h3>
            <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const { ref, visible } = useInView();
  return (
    <section id="how-it-works" className="py-28 border-t border-slate-800">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-xs font-semibold text-violet-400 uppercase tracking-widest mb-3">Simple by design</p>
          <h2 className="text-4xl font-extrabold text-slate-100 tracking-tight">Up and running in minutes</h2>
        </div>

        <div ref={ref} className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connector line */}
          <div className="hidden md:block absolute top-8 left-[calc(16.67%)] right-[calc(16.67%)] h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />

          {HOW_IT_WORKS.map((item, i) => (
            <div
              key={item.step}
              className="flex flex-col items-center text-center transition-all duration-500"
              style={{ transitionDelay: `${i * 120}ms`, opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(24px)' }}
            >
              <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-5 relative z-10">
                <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-br from-indigo-400 to-violet-400">
                  {item.step}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-slate-100 mb-2">{item.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-[200px]">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TrustSection() {
  const items = [
    { icon: Lock, label: 'JWT Auth', desc: 'Secure token-based authentication with configurable expiry.' },
    { icon: RefreshCw, label: 'Auto-sync', desc: 'React Query keeps your UI fresh without manual refreshes.' },
    { icon: Globe, label: 'CORS-ready', desc: 'Configure allowed origins for any deployment setup.' },
    { icon: Shield, label: 'RBAC', desc: 'Role-based access control built directly into every endpoint.' },
  ];
  const { ref, visible } = useInView();

  return (
    <section className="py-24 border-t border-slate-800">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold text-sky-400 uppercase tracking-widest mb-3">Security first</p>
          <h2 className="text-3xl font-extrabold text-slate-100 tracking-tight">Built to be trusted</h2>
        </div>
        <div ref={ref} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {items.map((item, i) => (
            <div
              key={item.label}
              className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 hover:border-slate-700 transition-all duration-500 hover:-translate-y-1"
              style={{ transitionDelay: `${i * 70}ms`, opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(16px)' }}
            >
              <div className="w-9 h-9 rounded-xl bg-sky-400/10 flex items-center justify-center text-sky-400 mb-4">
                <item.icon className="w-4 h-4" />
              </div>
              <p className="text-sm font-semibold text-slate-200 mb-1">{item.label}</p>
              <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  const { ref, visible } = useInView();
  return (
    <section className="py-28 border-t border-slate-800">
      <div className="max-w-6xl mx-auto px-6">
        <div
          ref={ref}
          className="relative rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-600/10 via-violet-600/5 to-slate-950 overflow-hidden p-12 text-center transition-all duration-700"
          style={{ opacity: visible ? 1 : 0, transform: visible ? 'none' : 'scale(0.97)' }}
        >
          {/* Glow orbs */}
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-96 h-64 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 right-1/4 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

          <p className="relative text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-4">Get started today</p>
          <h2 className="relative text-4xl sm:text-5xl font-extrabold text-slate-100 tracking-tight mb-4 max-w-xl mx-auto">
            Your team's time is worth tracking right.
          </h2>
          <p className="relative text-slate-400 text-sm max-w-md mx-auto mb-10 leading-relaxed">
            Create an account and have your entire team logging time and managing projects within the hour.
          </p>
          <div className="relative flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-semibold text-white rounded-xl bg-indigo-600 hover:bg-indigo-500 transition-all shadow-2xl shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:-translate-y-0.5"
            >
              Create free account <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-medium text-slate-300 rounded-xl border border-slate-700 hover:border-slate-600 hover:bg-slate-800/60 hover:text-white transition-all"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950">
      <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <Clock className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-bold text-slate-400">WorkTracker</span>
        </div>
        <p className="text-xs text-slate-700">
          Built with FastAPI + React. MIT licensed.
        </p>
        <div className="flex items-center gap-5">
          <Link to="/login" className="text-xs text-slate-600 hover:text-slate-300 transition-colors">Sign in</Link>
          <Link to="/register" className="text-xs text-slate-600 hover:text-slate-300 transition-colors">Register</Link>
        </div>
      </div>
    </footer>
  );
}

/* ─────────────────────────────────────────────
   Page export
───────────────────────────────────────────── */
export function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased">
      <Navbar />
      <HeroSection />
      <StatsSection />
      <FeaturesSection />
      <HowItWorksSection />
      <TrustSection />
      <CTASection />
      <Footer />
    </div>
  );
}
