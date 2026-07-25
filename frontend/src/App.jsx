import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Moon, Sun, ShieldCheck, Activity, Zap } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import AdminDashboard from './pages/AdminDashboard';
import UserPortal from './pages/UserPortal';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

function Sidebar() {
  const location = useLocation();
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

  const navItems = [
    { name: 'SOC Admin',       path: '/admin', icon: LayoutDashboard, desc: 'Live alert stream' },
    { name: 'User Simulator',  path: '/user',  icon: Users,           desc: 'Red team sandbox' },
  ];

  return (
    <aside className="w-64 flex flex-col h-full bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-700/60 z-50 flex-shrink-0"
      style={{ boxShadow: '1px 0 0 0 rgba(0,0,0,0.04)' }}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-gray-100 dark:border-slate-700/60 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-brand flex items-center justify-center shadow-glow-primary flex-shrink-0">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-[13.5px] tracking-tight text-gray-900 dark:text-white leading-none">
              Cyber AI Fusion
            </div>
            <div className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5 font-medium tracking-wide">
              Honeywell SOC Platform
            </div>
          </div>
        </div>
      </div>



      {/* Nav */}
      <nav className="flex-1 px-4 py-3 space-y-1 overflow-y-auto">
        <div className="section-label px-2 mb-3">Dashboards</div>
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative',
                isActive
                  ? 'bg-blue-50 dark:bg-blue-900/25 text-primary dark:text-blue-400'
                  : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-slate-200'
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-2 bottom-2 w-[3px] bg-primary rounded-r-full" />
              )}
              <div className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
                isActive
                  ? 'bg-primary text-white shadow-glow-primary'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 group-hover:bg-gray-200 dark:group-hover:bg-slate-700'
              )}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <div className={cn('text-[13px] font-semibold leading-none mb-0.5', isActive ? 'text-primary dark:text-blue-400' : '')}>{item.name}</div>
                <div className="text-[10px] text-gray-400 dark:text-slate-500 font-normal">{item.desc}</div>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 pb-5 pt-3 border-t border-gray-100 dark:border-slate-700/60 space-y-2">
        {/* Platform badge */}
        <div className="px-3 py-2.5 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-800/30 flex items-center gap-2.5">
          <Zap className="w-4 h-4 text-primary flex-shrink-0" />
          <div>
            <div className="text-[11px] font-bold text-primary dark:text-blue-400">AI Ensemble Model</div>
            <div className="text-[10px] text-blue-400 dark:text-blue-500">v2.1 · Isolation Forest</div>
          </div>
        </div>

        {/* Dark mode toggle */}
        <button
          onClick={toggleDark}
          className="flex items-center justify-between w-full px-3 py-2.5 text-sm font-medium text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
        >
          <span className="flex items-center gap-2 text-[13px]">
            {isDark ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
            {isDark ? 'Dark Mode' : 'Light Mode'}
          </span>
          {/* Toggle pill */}
          <div className={cn('w-9 h-5 rounded-full p-0.5 transition-colors duration-300 flex items-center', isDark ? 'bg-primary' : 'bg-gray-200')}>
            <div className={cn('w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300', isDark ? 'translate-x-4' : 'translate-x-0')} />
          </div>
        </button>
      </div>
    </aside>
  );
}

function App() {
  return (
    <Router>
      <div className="h-screen w-full flex bg-gray-100 dark:bg-slate-950 overflow-hidden transition-colors duration-300">
        <Sidebar />
        <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          <Routes>
            <Route path="/"      element={<Navigate to="/admin" replace />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/user"  element={<UserPortal />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
