import React, { useState, useEffect } from 'react';
import {
  User, Terminal, ShieldAlert, Cpu, Activity, Clock,
  MapPin, Database, Server, ChevronDown, RefreshCw, Zap
} from 'lucide-react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) { return twMerge(clsx(inputs)); }

const ATTACK_DESCRIPTIONS = {
  brute_force:              'Rapid repeated failed-auth attempts in a short window',
  credential_stuffing:      'Many entities, few source IPs, high failure rate',
  impossible_travel:        'Login from a distant location within an implausible time gap',
  device_spoofing:          'Device ID reappearing with a mismatched fingerprint',
  lateral_movement:         'Compromised entity accessing unusual breadth of new resources',
  low_and_slow_exfiltration:'Gradual, off-hours resource access building up',
  insider_drift:            'Entity slowly expanding privilege footprint (often benign drift)',
};

/* ── Profile Item card ── */
function ProfileItem({ icon, label, value, fullWidth = false }) {
  return (
    <div className={cn(
      'flex gap-3 p-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 shadow-card hover:shadow-card-hover transition-shadow',
      fullWidth ? 'col-span-2' : 'col-span-1'
    )}>
      <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-slate-700 flex items-center justify-center text-primary flex-shrink-0">
        {React.cloneElement(icon, { className: 'w-4.5 h-4.5' })}
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">{label}</div>
        <div className="text-[13px] font-semibold text-gray-800 dark:text-slate-200 truncate">{value || 'N/A'}</div>
      </div>
    </div>
  );
}

/* ── Custom scatter tooltip ── */
function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-3 rounded-xl shadow-card-lg text-xs">
      <p className="font-bold text-gray-700 dark:text-slate-200 mb-1">{payload[0].payload.timeLabel}</p>
      <p className="text-primary font-medium flex items-center gap-1.5">
        <Database className="w-3 h-3" /> {payload[0].payload.y}
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
export default function UserPortal() {
  const [entities, setEntities]               = useState([]);
  const [selectedEntityId, setSelectedEntityId] = useState('');
  const [profile, setProfile]                 = useState(null);
  const [history, setHistory]                 = useState([]);
  const [loading, setLoading]                 = useState(false);
  const [lastAction, setLastAction]           = useState(null);
  const [selectedAttack, setSelectedAttack]   = useState('brute_force');

  useEffect(() => {
    fetch('http://localhost:8000/api/entities')
      .then(r => r.json())
      .then(data => { setEntities(data); if (data.length > 0) setSelectedEntityId(data[0].id); })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedEntityId) return;
    fetch(`http://localhost:8000/api/entity/${selectedEntityId}`)
      .then(r => r.json()).then(setProfile).catch(console.error);
    fetch(`http://localhost:8000/api/history/${selectedEntityId}`)
      .then(r => r.json())
      .then(data => setHistory(data.map(d => ({
        x: new Date(d.timestamp).getTime(),
        y: d.resource_accessed,
        timeLabel: d.timestamp.split('.')[0],
      }))))
      .catch(console.error);
  }, [selectedEntityId]);

  const injectAttack = async (type) => {
    setLoading(true);
    try {
      const res  = await fetch('http://localhost:8000/api/inject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attack_type: type, entity_id: selectedEntityId }),
      });
      const data = await res.json();
      setLastAction({ status: 'success', msg: `Payload injected: ${type}`, detail: data.scored_event });
    } catch (err) {
      setLastAction({ status: 'error', msg: `Connection failed: ${err.message}` });
    }
    setLoading(false);
    setTimeout(() => setLastAction(null), 5000);
  };

  return (
    <div className="flex-1 p-6 flex flex-col h-full overflow-hidden bg-gray-100 dark:bg-slate-950 transition-colors duration-300">

      {/* ── Page header banner ── */}
      <div className="glass-panel p-5 flex flex-col md:flex-row gap-4 md:items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight mb-1">
            Threat Simulator / Sandbox
          </h1>
          <p className="text-[13px] text-gray-400 dark:text-slate-500 max-w-lg leading-relaxed">
            Select an entity to view their behavioral baseline, then use the Red Team Simulator to inject synthetic attacks.
          </p>
        </div>
        <div className="w-full md:w-72 flex-shrink-0">
          <label className="section-label block mb-1.5">Target Entity Sandbox</label>
          <div className="relative">
            <select
              value={selectedEntityId}
              onChange={e => setSelectedEntityId(e.target.value)}
              className="select-field dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"
            >
              {entities.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ── Two-column body ── */}
      <div className="flex flex-1 min-h-0 gap-5">

        {/* Left: Profile panel */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="flex-1 glass-panel flex flex-col overflow-hidden"
        >
          {/* Panel header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            <h2 className="font-bold text-[14px] text-gray-900 dark:text-white">
              Profile Overview:{' '}
              <span className="font-mono text-primary ml-1">{selectedEntityId}</span>
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {profile && !profile.error ? (
              <div className="space-y-6 animate-slide-up">
                {/* Stat grid */}
                <div className="grid grid-cols-2 gap-3">
                  <ProfileItem icon={<Activity />}  label="Department"          value={profile.department} />
                  <ProfileItem icon={<Clock />}     label="Typical Login Window" value={`${profile.hour_mean?.toFixed(1)||0} ± ${profile.hour_std?.toFixed(1)||0}h`} />
                  <ProfileItem icon={<Cpu />}       label="Primary Devices"      value={(profile.typical_device_os||[]).join(', ')} />
                  <ProfileItem icon={<Database />}  label="Standard Resources"   value={(profile.typical_resources||[]).join(', ')} />
                  <ProfileItem icon={<MapPin />}    label="Locations"            value={(profile.typical_geo_locations||[]).join(', ')} fullWidth />
                </div>

                {/* Baseline generator */}
                <div className="bg-gray-50 dark:bg-slate-800/40 border border-gray-200 dark:border-slate-700 rounded-xl p-5">
                  <div className="section-label mb-3 flex items-center gap-1.5">
                    <Server className="w-3 h-3" /> System Health & Baseline Generation
                  </div>
                  <button
                    onClick={() => injectAttack('normal')}
                    disabled={loading}
                    className={cn(
                      'w-full flex justify-center items-center gap-2 py-3 rounded-xl border text-[13px] font-semibold transition-all',
                      'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700',
                      'hover:border-primary/50 hover:text-primary dark:hover:text-primary',
                      'text-gray-600 dark:text-slate-300 shadow-sm'
                    )}
                  >
                    {loading
                      ? <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      : <><RefreshCw className="w-4 h-4" /> Generate Live Normal Event</>
                    }
                  </button>
                  <AnimatePresence>
                    {lastAction?.msg.includes('normal') && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/30 rounded-xl text-emerald-700 dark:text-emerald-400 text-[12px] text-center font-semibold"
                      >
                        ✅ Normal baseline event generated and pushed to Live Queue!
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Activity timeline */}
                <div>
                  <div className="section-label mb-3">Historical Activity Timeline</div>
                  <div className="h-64 bg-white dark:bg-slate-800/40 border border-gray-200 dark:border-slate-700 rounded-xl p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 8, right: 16, bottom: 16, left: 16 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" opacity={0.6} />
                        <XAxis
                          dataKey="x" type="number" domain={['auto','auto']}
                          tickFormatter={t => new Date(t).toLocaleDateString()}
                          stroke="#9CA3AF" fontSize={10} tickLine={false} axisLine={false}
                        />
                        <YAxis
                          dataKey="y" type="category" allowDuplicatedCategory={false}
                          stroke="#9CA3AF" fontSize={10} width={80} tickLine={false} axisLine={false}
                        />
                        <RechartsTooltip
                          cursor={{ strokeDasharray: '3 3', stroke: '#3B82F6', opacity: 0.5 }}
                          content={<ChartTooltip />}
                        />
                        <Scatter name="Activity" data={history} fill="#3B82F6" opacity={0.85} />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-10 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-2xl mt-4 animate-fade-in">
                <User className="w-12 h-12 text-gray-200 dark:text-slate-700 mb-3" />
                <p className="text-sm font-medium text-gray-400 dark:text-slate-500">Select an entity to view their profile.</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Right: Red Team Simulator — keeps dark terminal aesthetic as intentional contrast */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
          className="w-[380px] flex-shrink-0 flex flex-col rounded-2xl overflow-hidden relative"
          style={{ background: 'linear-gradient(160deg, #0D1117 0%, #0B1120 100%)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          {/* Ambient glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/10 rounded-full blur-[60px] pointer-events-none -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-500/8 rounded-full blur-[50px] pointer-events-none translate-y-1/2 -translate-x-1/2" />

          {/* Panel header */}
          <div className="relative z-10 px-6 py-5 border-b border-white/[0.06] flex-shrink-0">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shadow-glow-danger">
                <Terminal className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight">Red Team Sandbox</h2>
            </div>
            <p className="text-[12px] text-slate-500 leading-relaxed">
              Select a threat vector and deploy directly into the live data stream.
            </p>
          </div>

          {/* Panel body */}
          <div className="relative z-10 flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {/* Attack config card */}
            <div className="bg-white/[0.04] border border-white/[0.07] rounded-xl p-5 backdrop-blur-sm">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Target Payload</div>

              {/* Attack selector */}
              <div className="relative mb-5">
                <select
                  value={selectedAttack}
                  onChange={e => setSelectedAttack(e.target.value)}
                  className="w-full appearance-none bg-black/40 border border-white/10 rounded-xl py-3 px-4 pr-10 text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500/30 transition-all"
                >
                  {Object.entries(ATTACK_DESCRIPTIONS).map(([key, desc]) => (
                    <option key={key} value={key}>{key} — {desc}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              </div>

              {/* Selected attack description pill */}
              <div className="mb-5 px-3 py-2.5 rounded-lg bg-rose-500/10 border border-rose-500/15 text-[11px] text-rose-300 leading-relaxed">
                <span className="font-bold text-rose-400 mr-1">Vector:</span>
                {ATTACK_DESCRIPTIONS[selectedAttack]}
              </div>

              {/* Deploy button */}
              <button
                onClick={() => injectAttack(selectedAttack)}
                disabled={loading}
                className="w-full relative group overflow-hidden bg-rose-600 hover:bg-rose-500 text-white font-bold py-3.5 rounded-xl transition-all flex justify-center items-center gap-2 text-[13px]"
                style={{ boxShadow: '0 0 20px rgba(239,68,68,0.3)' }}
              >
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                <span className="relative z-10 flex items-center gap-2">
                  {loading
                    ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <><Zap className="w-4 h-4" /> Deploy Attack Payload</>
                  }
                </span>
              </button>
            </div>


          </div>
        </motion.div>
      </div>
    </div>
  );
}
