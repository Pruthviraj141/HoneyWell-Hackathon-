import React, { useState, useEffect } from 'react';
import {
  ShieldAlert, Activity, ChevronRight, ShieldCheck,
  Database, RefreshCw, User, MapPin, Clock, Search,
  Cpu, AlertTriangle, Server
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { API_BASE } from '../config';
import { cn } from '../utils';

/* ── Fields that indicate attack anomaly — highlighted red ── */
const ATTACK_FIELDS = new Set([
  'failed_attempts_10m', 'is_new_device', 'is_new_country',
  'geo_distance_km', 'command_sequence', 'is_night_hour',
  'geo_location', 'source_ip',
]);

/* ── Thresholds that flag a value as suspicious ── */
function isSuspiciousValue(key, val) {
  if (key === 'failed_attempts_10m' && val > 5) return true;
  if (key === 'is_new_device' && val === 1) return true;
  if (key === 'is_new_country' && val === 1) return true;
  if (key === 'geo_distance_km' && val > 500) return true;
  if (key === 'is_night_hour' && val === 1) return true;
  if (key === 'command_sequence' && Array.isArray(val) && val.filter(v => v === 'fail').length >= 3) return true;
  return false;
}

/* ── Colorful syntax-highlighted JSON viewer ── */
function ColorfulJSON({ data }) {
  const raw = data || {};

  const renderValue = (key, val, depth = 0) => {
    const isAnom = ATTACK_FIELDS.has(key) && isSuspiciousValue(key, val);
    
    const anomalyBadge = isAnom && (
      <span className="ml-2 text-[10px] bg-[rgba(217,0,0,0.1)] text-[var(--status-critical)] border border-[var(--status-critical)] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider">
        anomaly
      </span>
    );

    if (Array.isArray(val)) {
      return (
        <span>
          <span className="text-[var(--text-muted)]">[</span>
          {val.map((item, i) => (
            <span key={i}>
              <span className="text-[var(--text-muted)]">"</span>
              <span className={cn(isAnom ? 'text-[var(--status-critical)] font-bold' : 'text-[#F59E0B]')}>{item}</span>
              <span className="text-[var(--text-muted)]">"</span>
              {i < val.length - 1 && <span className="text-[var(--text-muted)]">,</span>}
            </span>
          ))}
          <span className="text-[var(--text-muted)]">]</span>
          {anomalyBadge}
        </span>
      );
    }

    if (typeof val === 'number') {
      return (
        <span>
          <span className={cn(isAnom ? 'text-[var(--status-critical)] font-bold' : 'text-[#38BDF8]')}>{val}</span>
          {anomalyBadge}
        </span>
      );
    }

    if (typeof val === 'string') {
      return (
        <span>
          <span className="text-[var(--text-muted)]">"</span>
          <span className={cn(isAnom ? 'text-[var(--status-critical)] font-bold' : 'text-[#22C55E]')}>{val}</span>
          <span className="text-[var(--text-muted)]">"</span>
          {anomalyBadge}
        </span>
      );
    }

    return <span className="text-[var(--text-secondary)]">{String(val)}</span>;
  };

  return (
    <div className="font-mono text-[11.5px] leading-[1.85] space-y-0.5">
      <div className="text-[var(--text-muted)]">{`{`}</div>
      {Object.entries(raw).map(([key, val]) => (
        <div key={key} className="flex items-start gap-1 px-2 py-0.5 hover:bg-white/[0.03] transition-colors rounded">
          <span className="shrink-0 text-[#C084FC]">
            "{key}":
          </span>
          <span className="break-all">{renderValue(key, val)}</span>
        </div>
      ))}
      <div className="text-[var(--text-muted)]">{`}`}</div>
    </div>
  );
}

/* ── helpers ── */
function riskColor(score) {
  if (score > 0.8) return 'high';
  if (score > 0.5) return 'medium';
  return 'low';
}

function RiskPill({ level, score }) {
  const cls = {
    high:   'risk-high',
    medium: 'risk-medium',
    low:    'risk-low',
  }[riskColor(score)];
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider', cls)}>
      {score > 0.8 && <AlertTriangle className="w-2.5 h-2.5" />}
      {level}
    </span>
  );
}

function ScoreRing({ label, score }) {
  const cls =
    score > 0.8 ? 'score-card-danger' :
    score > 0.5 ? 'score-card-warning' :
                  'score-card-success';
  return (
    <div className={cn('p-4 rounded-md flex flex-col items-center justify-center text-center gap-1', cls)}>
      <div className="text-[11px] font-semibold uppercase tracking-wider opacity-80">{label}</div>
      <div className="text-xl font-bold tabular-nums">{score.toFixed(2)}</div>
    </div>
  );
}

function MetricBadge({ title, value, variant = 'primary' }) {
  const map = {
    primary: 'badge-primary',
    warning: 'badge-warning',
    danger:  'badge-danger',
  };
  return (
    <div className={cn('flex items-center gap-3 px-3 py-2 rounded-md border', map[variant])} style={{ borderColor: 'var(--border-default)' }}>
      <span className="text-[11px] font-semibold uppercase tracking-wider opacity-80">{title}</span>
      <span className="text-lg font-bold tabular-nums">{value}</span>
    </div>
  );
}

function ProfileMetric({ title, value, icon }) {
  return (
    <div className="p-4 rounded-md flex items-center gap-3 transition-colors duration-150" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-surface)' }}>
      <div className="w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent-primary-muted)', color: 'var(--accent-primary)' }}>
        {React.cloneElement(icon, { className: 'w-4 h-4' })}
      </div>
      <div>
        <div className="section-label mb-0.5">{title}</div>
        <div className="text-[14px] font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>{value}</div>
      </div>
    </div>
  );
}

const ATTACK_DESCRIPTIONS = {
  brute_force:              'Rapid repeated failed-auth attempts in a short window.',
  credential_stuffing:      'Many entities, few source IPs, high failure rate.',
  impossible_travel:        'Login from a distant location within an implausible time gap.',
  device_spoofing:          'Device ID reappearing with a mismatched fingerprint.',
  lateral_movement:         'Compromised entity accessing unusual breadth of new resources.',
  low_and_slow_exfiltration:'Gradual, off-hours resource access building up.',
  insider_drift:            'Entity slowly expanding privilege footprint.',
  normal:                   'Normal, expected activity based on historical baseline.',
};

/* ═══════════════════════════════════════════════════════════ */
export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('stream');

  // Tab 1
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filterLevel, setFilterLevel] = useState('All');

  // Tab 2
  const [entities, setEntities] = useState([]);
  const [selectedEntityId, setSelectedEntityId] = useState('');
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);

  const fetchQueue = async () => {
    try {
      const res  = await fetch(`${API_BASE}/api/queue`);
      const data = await res.json();
      setEvents(data);
      setSelectedEvent(prev => {
        if (!prev && data.length > 0) return data[0];
        if (prev) {
          // If we have a previously selected event, try to find its updated version in the new data
          const updated = data.find(e => e.entity_id === prev.entity_id && e.timestamp === prev.timestamp);
          return updated || prev;
        }
        return prev;
      });
    } catch (err) { console.error('Failed to fetch queue', err); }
  };

  useEffect(() => {
    fetchQueue();
    const iv = setInterval(fetchQueue, 2000);
    return () => clearInterval(iv);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchQueue();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  useEffect(() => {
    fetch(`${API_BASE}/api/entities`)
      .then(r => r.json())
      .then(data => { setEntities(data); if (data.length > 0) setSelectedEntityId(data[0].id); })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedEntityId && activeTab === 'investigator') {
      fetch(`${API_BASE}/api/entity/${selectedEntityId}`)
        .then(r => r.json()).then(setProfile).catch(console.error);
      fetch(`${API_BASE}/api/history/${selectedEntityId}`)
        .then(r => r.json()).then(setHistory).catch(console.error);
    }
  }, [selectedEntityId, activeTab]);

  const flaggedCount      = events.filter(e => e.is_anomaly).length;
  const entitiesFlagged   = new Set(events.filter(e => e.is_anomaly).map(e => e.entity_id)).size;

  return (
    <div className="flex-1 p-6 flex flex-col h-full overflow-hidden transition-colors duration-150" style={{ background: 'var(--bg-base)' }}>

      {/* ── Top bar ── */}
      <div className="flex justify-between items-center mb-5">
        {/* Tab switcher */}
        <div className="tab-bar" style={{ borderBottom: 'none' }}>
          {[['stream', 'Live Event Stream'], ['investigator', 'Entity Investigator']].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn('tab-item', activeTab === id ? 'tab-item-active' : 'tab-item-inactive')}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'stream' && (
          <div className="flex gap-3 animate-fade-in">
            <MetricBadge title="Live Queue"      value={events.length}   variant="primary" />
            <MetricBadge title="Anomalies"       value={flaggedCount}    variant="warning" />
            <MetricBadge title="Entities Flagged" value={entitiesFlagged} variant="danger"  />
          </div>
        )}
      </div>

      {/* ── Main panel ── */}
      <div className="flex-1 min-h-0 glass-panel flex">

        {/* ════ TAB 1: LIVE STREAM ════ */}
        {activeTab === 'stream' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-1 w-full h-full">

            {/* Alert Queue — left column */}
            <div className="w-[320px] flex-shrink-0 flex flex-col" style={{ borderRight: '1px solid var(--border-default)', background: 'var(--bg-surface)' }}>
              <div className="px-4 py-3 flex justify-between items-center" style={{ borderBottom: '1px solid var(--border-default)', background: 'var(--bg-surface)' }}>
                <h2 className="font-semibold text-[14px] flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <ShieldAlert className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
                  SOC Alert Queue
                </h2>
                <button
                  onClick={handleRefresh}
                  className={cn('p-1.5 rounded-md transition-colors duration-150', isRefreshing && 'animate-spin')}
                  style={{ color: isRefreshing ? 'var(--accent-primary)' : 'var(--text-muted)' }}
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {/* Filter Bar */}
              <div className="px-3 py-2 flex gap-1 overflow-x-auto" style={{ borderBottom: '1px solid var(--border-default)' }}>
                {['All', 'Critical', 'High', 'Elevated', 'Normal'].map(f => (
                  <button
                    key={f}
                    onClick={() => setFilterLevel(f)}
                    className="px-2.5 py-1 rounded text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap transition-colors duration-150"
                    style={{
                      background: filterLevel === f ? 'var(--accent-primary)' : 'transparent',
                      color: filterLevel === f ? '#fff' : 'var(--text-muted)',
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>

              <div className="overflow-y-auto flex-1 p-3 space-y-2">
                {events.length === 0 && (
                  <div className="mt-6 p-5 text-center text-gray-400 dark:text-slate-500 text-sm border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl">
                    <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    Waiting for live events…
                  </div>
                )}
                <AnimatePresence>
                  {events
                    .filter(ev => filterLevel === 'All' || ev.risk_level.includes(filterLevel))
                    .map((ev, idx) => {
                    const rc = riskColor(ev.risk_score);
                    const isSelected = selectedEvent && selectedEvent.timestamp === ev.timestamp && selectedEvent.entity_id === ev.entity_id;
                    return (
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={ev.timestamp + ev.entity_id + idx}
                        onClick={() => setSelectedEvent(ev)}
                        className={cn(
                          'p-3 rounded-md cursor-pointer transition-colors duration-150'
                        )}
                        style={{
                          background: isSelected ? 'var(--accent-primary-muted)' : 'transparent',
                          borderLeft: isSelected ? '2px solid var(--accent-primary)' : '2px solid transparent',
                        }}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <RiskPill level={ev.risk_level} score={ev.risk_score} />
                          <span className="text-[10px] text-gray-400 dark:text-slate-500 font-mono">{ev.timestamp?.split(' ')[1]}</span>
                        </div>
                        <div className="text-[13px] font-medium leading-snug line-clamp-2" style={{ color: 'var(--text-primary)' }}>{ev.headline}</div>
                        <div className="mt-1.5 flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                          <User className="w-3 h-3" /> {ev.entity_id}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>

            {/* SAR Drill-down — right */}
            <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--bg-surface)' }}>
              {selectedEvent ? (
                <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col h-full">
                  {/* SAR header */}
                  <div className="px-6 py-4" style={{
                    borderBottom: '1px solid var(--border-default)',
                    background: selectedEvent.risk_score > 0.8 ? 'rgba(220,38,38,0.06)' :
                                selectedEvent.risk_score > 0.5 ? 'rgba(245,158,11,0.06)' :
                                                                  'var(--bg-surface)'
                  }}>
                    <div className="flex items-center gap-3 mb-1.5">
                      <Activity className={cn('w-5 h-5',
                        selectedEvent.risk_score > 0.8 ? 'text-rose-600' :
                        selectedEvent.risk_score > 0.5 ? 'text-amber-600' : 'text-primary'
                      )} />
                      <h2 className="text-section font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                        Suspicious Activity Report
                      </h2>
                    </div>
                    <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                      Target:{' '}
                      <span className="font-mono font-medium px-1.5 py-0.5 rounded" style={{ background: 'var(--accent-primary-muted)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}>
                        {selectedEvent.entity_id}
                      </span>
                    </p>
                  </div>

                  {/* SAR body */}
                  <div className="flex-1 overflow-y-auto p-6 flex gap-6">
                    {/* Left column */}
                    <div className="w-1/2 space-y-6">
                      {/* Attack Vector */}
                      <div>
                        <div className="section-label mb-2 flex items-center gap-1.5"><ShieldCheck className="w-3 h-3 text-primary" /> Attack Vector</div>
                        <div className="bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 p-4 rounded-xl">
                          <p className="text-[13px] text-gray-700 dark:text-slate-300 leading-relaxed">
                            <strong className="text-gray-900 dark:text-white block mb-1 font-semibold">
                              `{selectedEvent.attack_type}`
                            </strong>
                            {ATTACK_DESCRIPTIONS[selectedEvent.attack_type] || 'Unknown threat pattern.'}
                          </p>
                        </div>
                      </div>

                      {/* Incident Analysis */}
                      <div>
                        <div className="section-label mb-2 flex items-center gap-1.5"><Activity className="w-3 h-3 text-amber-500" /> Incident Analysis</div>
                        <ul className="space-y-2">
                          {(selectedEvent.reasons || []).map((r, i) => (
                            <li key={i} className="flex gap-2.5 p-3.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-xl text-[13px] text-gray-700 dark:text-slate-300">
                              <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                              {r}
                            </li>
                          ))}
                          {(!selectedEvent.reasons || selectedEvent.reasons.length === 0) && (
                            <li className="text-sm text-gray-400 italic p-4 text-center border border-dashed border-gray-200 dark:border-slate-700 rounded-xl">
                              No deviation reasons identified.
                            </li>
                          )}
                        </ul>
                      </div>

                      {/* AI Conclusion */}
                      <div>
                        <div className="section-label mb-2 flex items-center gap-1.5"><Database className="w-3 h-3 text-indigo-500" /> AI Conclusion</div>
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/40 p-4 rounded-xl text-[13px] text-indigo-800 dark:text-indigo-200 leading-relaxed font-medium">
                          {selectedEvent.signal_summary || 'Event analyzed successfully.'}
                        </div>
                      </div>
                    </div>

                    {/* Right column */}
                    <div className="w-1/2 space-y-6 flex flex-col">
                      {/* Signal Breakdown — Classifier + Sequence only */}
                      <div>
                        <div className="section-label mb-3 flex items-center gap-1.5">
                          <ShieldCheck className="w-3 h-3 text-primary" /> Signal Breakdown
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <ScoreRing label="Classifier" score={selectedEvent.signal_breakdown?.classifier_risk || 0} />
                          <ScoreRing label="Sequence"   score={selectedEvent.signal_breakdown?.sequence_risk   || 0} />
                        </div>
                        {/* Combined risk bar */}
                        <div className="mt-3 bg-gray-50 dark:bg-slate-800/40 border border-gray-200 dark:border-slate-700 rounded-xl p-3">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Combined Risk Score</span>
                            <span className={cn(
                              'text-sm font-black tabular-nums',
                              selectedEvent.risk_score > 0.8 ? 'text-rose-600' :
                              selectedEvent.risk_score > 0.5 ? 'text-amber-600' : 'text-emerald-600'
                            )}>{(selectedEvent.risk_score * 100).toFixed(0)}%</span>
                          </div>
                          <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${selectedEvent.risk_score * 100}%` }}
                              transition={{ duration: 0.8, ease: 'easeOut' }}
                              className={cn(
                                'h-full rounded-full',
                                selectedEvent.risk_score > 0.8 ? 'bg-rose-500' :
                                selectedEvent.risk_score > 0.5 ? 'bg-amber-500' : 'bg-emerald-500'
                              )}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Colorful telemetry */}
                      <div className="flex-1 flex flex-col min-h-[200px]">
                        <div className="section-label mb-2 flex items-center gap-1.5">
                          <Database className="w-3 h-3 text-purple-400" /> Triggering Telemetry
                          {selectedEvent.risk_score > 0.5 && (
                            <span className="ml-auto text-[10px] px-2 py-0.5 rounded font-semibold" style={{ background: 'rgba(217, 0, 0, 0.08)', color: 'var(--status-critical)', border: '1px solid var(--status-critical)' }}><AlertTriangle className="w-2.5 h-2.5 inline mr-0.5" /> Red fields = anomaly indicators</span>
                          )}
                        </div>
                        <div
                          className="flex-1 overflow-auto rounded-xl p-4 border"
                          style={{ background: 'var(--bg-deep)', borderColor: 'var(--border-default)' }}
                        >
                          <ColorfulJSON data={selectedEvent._raw_event || selectedEvent} />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="flex-1 flex items-center justify-center flex-col gap-4 text-gray-300 dark:text-slate-600">
                  <Search className="w-14 h-14" />
                  <p className="text-sm font-medium text-gray-400 dark:text-slate-500">Select an alert to investigate</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ════ TAB 2: ENTITY INVESTIGATOR ════ */}
        {activeTab === 'investigator' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col w-full h-full">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 flex items-center gap-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Entity Profiler</h2>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Analyze baseline behaviors and historical access logs.</p>
              </div>
              <div className="ml-auto w-64">
                <select
                  value={selectedEntityId}
                  onChange={e => setSelectedEntityId(e.target.value)}
                  className="select-field dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"
                >
                  {entities.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
                </select>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-8 bg-gray-50 dark:bg-slate-950/50">
              {profile && !profile.error ? (
                <div className="max-w-5xl mx-auto space-y-8 animate-slide-up">
                  {/* Title row */}
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      Behavioral Profile <span className="text-gray-300 dark:text-slate-600 mx-2">/</span>
                      <span className="text-primary">{selectedEntityId}</span>
                    </h3>
                    <span className="badge badge-success">Baseline Found</span>
                  </div>

                  {/* Metric cards */}
                  <div className="grid grid-cols-3 gap-4">
                    <ProfileMetric title="Typical Login Window" value={`${profile.hour_mean?.toFixed(1)||0} ± ${profile.hour_std?.toFixed(1)||0}h`}   icon={<Clock />} />
                    <ProfileMetric title="Typical Session"      value={`${profile.session_duration_mean?.toFixed(1)||0}m ± ${profile.session_duration_std?.toFixed(1)||0}m`} icon={<Activity />} />
                    <ProfileMetric title="Failure Rate"         value={`${profile.failed_attempts_10m_mean?.toFixed(2)||0} / 10m`}                      icon={<ShieldAlert />} />
                  </div>

                  {/* Safe regions */}
                  <div className="bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-2xl p-6 shadow-card">
                    <div className="section-label mb-5 flex items-center gap-1.5"><ShieldCheck className="w-3 h-3" /> Known Safe Regions & Resources</div>
                    <div className="grid grid-cols-3 gap-8">
                      {[
                        { icon: <MapPin />, label: 'Geolocations', items: profile.typical_geo_locations || [] },
                        { icon: <Database />, label: 'Resources',   items: profile.typical_resources    || [] },
                        { icon: <Cpu />, label: 'Devices',          items: [...(profile.typical_device_os||[]), ...(profile.typical_browser||[])] },
                      ].map(({ icon, label, items }) => (
                        <div key={label}>
                          <div className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-3 flex items-center gap-1.5">
                            {React.cloneElement(icon, { className: 'w-3 h-3' })} {label}
                          </div>
                          <ul className="space-y-1.5">
                            {items.map((v, i) => (
                              <li key={i} className="flex items-center gap-2 text-[13px] text-gray-700 dark:text-slate-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-300 dark:bg-slate-500 flex-shrink-0" />{v}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Historical log table */}
                  <div>
                    <h3 className="text-base font-bold text-gray-800 dark:text-white mb-3">Complete Historical Log</h3>
                    <div className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-card bg-white dark:bg-slate-800/50">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-gray-50 dark:bg-slate-900/60 border-b border-gray-200 dark:border-slate-700">
                          <tr>
                            {['Timestamp','Resource','Location','IP Address','Label'].map(h => (
                              <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                          {history.map((row, i) => (
                            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="px-4 py-3 font-mono text-[11px] text-gray-400">{row.timestamp}</td>
                              <td className="px-4 py-3 font-medium text-gray-800 dark:text-slate-200">{row.resource_accessed}</td>
                              <td className="px-4 py-3 text-gray-500 dark:text-slate-400">{row.geo_location}</td>
                              <td className="px-4 py-3 font-mono text-[11px] text-gray-400">{row.source_ip}</td>
                              <td className="px-4 py-3">
                                <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
                                  row.label === 'normal' ? 'badge-success' : 'badge-danger'
                                )}>
                                  {row.label}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="max-w-md mx-auto mt-24 text-center p-10 bg-white dark:bg-slate-800/50 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-2xl animate-fade-in">
                  <Search className="w-12 h-12 mx-auto mb-4 text-gray-200 dark:text-slate-600" />
                  <p className="text-sm font-medium text-gray-400 dark:text-slate-500">Select an entity to view their behavioral profile.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
