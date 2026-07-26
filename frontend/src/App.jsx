import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Moon, Sun, ShieldCheck, Zap, PieChart } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import AdminDashboard from './pages/AdminDashboard';
import UserPortal from './pages/UserPortal';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import WelcomeModal from './components/WelcomeModal';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/* ─── Sidebar ─── */
function Sidebar({ isDark, toggleDark }) {
  const location = useLocation();

  const navItems = [
    { name: 'SOC Admin',      path: '/admin',     icon: LayoutDashboard, desc: 'Live alert stream' },
    { name: 'User Simulator', path: '/user',      icon: Users,           desc: 'Red team sandbox' },
    { name: 'Analytics',      path: '/analytics', icon: PieChart,        desc: 'Threat insights' },
  ];

  return (
    <aside
      className="w-60 flex flex-col h-full flex-shrink-0"
      style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border-default)' }}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-5 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-default)' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--accent-primary)', color: '#fff' }}
          >
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[13px] font-semibold leading-none" style={{ color: 'var(--text-primary)' }}>
              Cyber AI Fusion
            </div>
            <div className="text-[10px] mt-0.5 font-medium" style={{ color: 'var(--text-muted)' }}>
              Honeywell SOC
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <div className="section-label px-3 mb-3">Dashboards</div>
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium transition-colors duration-150 relative',
                isActive ? '' : ''
              )}
              style={{
                color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                background: isActive ? 'var(--accent-primary-muted)' : 'transparent',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--accent-primary-muted)'; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
            >
              {isActive && (
                <span
                  className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-r"
                  style={{ background: 'var(--accent-primary)' }}
                />
              )}
              <Icon className="w-4 h-4 flex-shrink-0" />
              <div>
                <div className="text-[13px] font-medium leading-none mb-0.5">{item.name}</div>
                <div className="text-[10px] font-normal" style={{ color: 'var(--text-muted)' }}>{item.desc}</div>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 pt-3 space-y-2" style={{ borderTop: '1px solid var(--border-default)' }}>
        {/* AI Model badge */}
        <div
          className="px-3 py-2.5 rounded-md flex items-center gap-2.5"
          style={{ background: 'var(--accent-primary-muted)' }}
        >
          <Zap className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--accent-primary)' }} />
          <div>
            <div className="text-[11px] font-semibold" style={{ color: 'var(--accent-primary)' }}>AI Ensemble Model</div>
            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>v2.1 · Isolation Forest</div>
          </div>
        </div>

        {/* Dark/Light mode toggle */}
        <button
          onClick={toggleDark}
          className="flex items-center justify-between w-full px-3 py-2 rounded-md text-[13px] font-medium transition-colors duration-150"
          style={{ color: 'var(--text-secondary)' }}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          <span className="flex items-center gap-2">
            {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            {isDark ? 'Dark Mode' : 'Light Mode'}
          </span>
          {/* Toggle pill */}
          <div
            className="w-8 h-[18px] rounded-full p-0.5 flex items-center transition-colors duration-150"
            style={{ background: isDark ? 'var(--accent-primary)' : 'var(--border-default)' }}
          >
            <div
              className="w-3.5 h-3.5 bg-white rounded-full transition-transform duration-150"
              style={{ transform: isDark ? 'translateX(14px)' : 'translateX(0)' }}
            />
          </div>
        </button>
      </div>
    </aside>
  );
}

/* ─── App Shell ─── */
function AppShell() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleDark = () => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.remove('dark');
      setIsDark(false);
    } else {
      root.classList.add('dark');
      setIsDark(true);
    }
  };

  return (
    <div className="h-screen w-full flex overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      <WelcomeModal />
      <Sidebar isDark={isDark} toggleDark={toggleDark} />
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Routes>
          <Route path="/"          element={<Navigate to="/admin" replace />} />
          <Route path="/admin"     element={<AdminDashboard />} />
          <Route path="/analytics" element={<AnalyticsDashboard />} />
          <Route path="/user"      element={<UserPortal />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppShell />
    </Router>
  );
}

export default App;
