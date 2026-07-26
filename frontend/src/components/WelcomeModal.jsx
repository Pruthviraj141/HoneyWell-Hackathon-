import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert, Crosshair, Zap, ArrowRight, X,
  Users, Brain, BarChart3, Network, Clock, Shield,
  ChevronRight
} from 'lucide-react';

/* ── animation presets ── */
const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.35 } },
  exit:    { opacity: 0, transition: { duration: 0.25 } },
};

const cardVariants = {
  hidden:  { opacity: 0, scale: 0.92, y: 30 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 22, delay: 0.1 } },
  exit:    { opacity: 0, scale: 0.92, y: 30, transition: { duration: 0.2 } },
};

const stagger = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.25 } },
};

const fadeUp = {
  hidden:  { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

const shimmer = {
  hidden:  { x: '-100%' },
  visible: { x: '200%', transition: { repeat: Infinity, duration: 2.5, ease: 'linear', delay: 1 } },
};

/* ── data ── */
const STEPS = [
  {
    num: '01',
    icon: Users,
    color: 'blue',
    title: 'Choose a Target Entity',
    desc: 'Browse 100 employees across 5 departments (HR, Finance, Engineering, Sales, IT) — each with unique access roles, devices, and behavioral patterns.',
  },
  {
    num: '02',
    icon: Crosshair,
    color: 'rose',
    title: 'Deploy an Attack Payload',
    desc: 'Pick from 7 real-world threat vectors — Brute Force, Credential Stuffing, Impossible Travel, Device Spoofing, Lateral Movement, Exfiltration, or Insider Drift.',
  },
  {
    num: '03',
    icon: Brain,
    color: 'amber',
    title: 'AI Scores the Threat',
    desc: 'Our proprietary multi-signal AI engine analyzes the event against behavioral baselines and produces a fused risk score in real-time.',
  },
  {
    num: '04',
    icon: Zap,
    color: 'emerald',
    title: 'Investigate the Alert',
    desc: 'Switch to the SOC Admin dashboard to see the alert appear live — with a full Suspicious Activity Report, signal breakdown, and raw telemetry.',
  },
];

const FEATURES = [
  { icon: Network,   label: 'Multi-Signal AI Engine',    sub: 'Behavioral fusion' },
  { icon: Shield,    label: '7 Attack Vectors',          sub: 'Real-world threats' },
  { icon: BarChart3, label: 'Explainable Alerts',        sub: 'Human-readable SARs' },
  { icon: Clock,     label: 'Real-Time Detection',       sub: 'Sub-second scoring' },
];

const colorMap = {
  blue:    { bg: 'bg-blue-500/10',    text: 'text-blue-500',    border: 'hover:border-blue-500/30',    glow: 'group-hover:shadow-blue-500/10' },
  rose:    { bg: 'bg-rose-500/10',    text: 'text-rose-500',    border: 'hover:border-rose-500/30',    glow: 'group-hover:shadow-rose-500/10' },
  amber:   { bg: 'bg-amber-500/10',   text: 'text-amber-500',   border: 'hover:border-amber-500/30',   glow: 'group-hover:shadow-amber-500/10' },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'hover:border-emerald-500/30', glow: 'group-hover:shadow-emerald-500/10' },
};

/* ── component ── */
export default function WelcomeModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setIsOpen(true), 500);
    return () => clearTimeout(t);
  }, []);

  const close = () => setIsOpen(false);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* ── backdrop ── */}
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={close}
            className="absolute inset-0 bg-black/50 backdrop-blur-md"
          />

          {/* ── card ── */}
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-[680px] max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl bg-white dark:bg-[#0c1425] border border-gray-200/80 dark:border-gray-700/50"
          >
            {/* ── top gradient bar with shimmer ── */}
            <div className="relative h-1.5 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 overflow-hidden">
              <motion.div
                variants={shimmer}
                initial="hidden"
                animate="visible"
                className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent"
              />
            </div>

            <div className="p-8 sm:p-10">
              {/* ── close ── */}
              <button
                onClick={close}
                className="absolute top-5 right-5 p-2.5 rounded-full text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              >
                <X className="w-5 h-5" />
              </button>

              {/* ── header ── */}
              <motion.div
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
                className="flex items-center gap-4 mb-2"
              >
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25 text-white flex-shrink-0">
                  <ShieldAlert className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                    Cyber AI Fusion
                  </h2>
                  <p className="text-sm font-medium text-indigo-500 dark:text-indigo-400">
                    Honeywell SOC — Live Threat Simulator
                  </p>
                </div>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mt-4 mb-8 max-w-lg"
              >
                This platform simulates real-world cyberattacks against a network of <strong className="text-gray-700 dark:text-gray-200">100 unique entities</strong> — users, service accounts, and edge devices — and lets you watch our AI engine detect and explain the threat in real-time.
              </motion.p>

              {/* ── feature badges ── */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10"
              >
                {FEATURES.map((f, i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800"
                  >
                    <f.icon className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                    <span className="text-[11px] font-semibold text-gray-800 dark:text-gray-200 text-center leading-tight">{f.label}</span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 text-center">{f.sub}</span>
                  </div>
                ))}
              </motion.div>

              {/* ── steps ── */}
              <motion.div
                variants={stagger}
                initial="hidden"
                animate="visible"
                className="space-y-3 mb-10"
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 dark:text-gray-500 mb-3">
                  How it works
                </p>
                {STEPS.map((step) => {
                  const c = colorMap[step.color];
                  return (
                    <motion.div
                      key={step.num}
                      variants={fadeUp}
                      className={`group flex gap-4 items-start p-4 rounded-2xl border border-gray-100 dark:border-gray-800 transition-all duration-200 ${c.border} hover:shadow-lg ${c.glow} bg-white dark:bg-gray-800/30`}
                    >
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${c.bg} ${c.text}`}>
                        <step.icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-bold ${c.text} opacity-60`}>{step.num}</span>
                          <h4 className="font-semibold text-sm text-gray-900 dark:text-white">{step.title}</h4>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{step.desc}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 mt-1 flex-shrink-0 text-gray-300 dark:text-gray-600 group-hover:text-gray-400 dark:group-hover:text-gray-500 transition-colors" />
                    </motion.div>
                  );
                })}
              </motion.div>

              {/* ── CTA ── */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="flex flex-col sm:flex-row items-center gap-3"
              >
                <button
                  onClick={close}
                  className="group relative w-full sm:flex-1 flex items-center justify-center gap-2.5 py-3.5 rounded-2xl text-white font-semibold text-sm bg-gradient-to-r from-indigo-600 to-purple-600 shadow-xl shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] overflow-hidden"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    Start Simulation
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </span>
                  {/* shimmer on hover */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[200%] duration-700" />
                </button>
                <button
                  onClick={close}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                >
                  Skip Intro
                </button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
