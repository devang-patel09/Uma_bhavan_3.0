import React, { useState, useEffect } from 'react';
import {
  Sun,
  Moon,
  Search,
  Building2,
  ShieldCheck,
  User as UserIcon,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

interface HeaderProps {
  onSearchClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onSearchClick }) => {
  const { user, logout } = useAuth();

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return (
      localStorage.getItem('theme') === 'dark' ||
      (!localStorage.getItem('theme') &&
        window.matchMedia('(prefers-color-scheme: dark)').matches)
    );
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/90 sm:px-6">
      {/* Brand Identity */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-terracotta to-brand-orange text-white shadow-glow">
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
              UMA BHAVAN
            </h1>
            <span className="rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
              388001
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Community Management System • Anand
          </p>
        </div>
      </div>

      {/* Center / Global Search Trigger */}
      <div className="hidden max-w-md flex-1 px-8 md:block">
        <button
          type="button"
          onClick={onSearchClick}
          className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50/80 px-3.5 py-2 text-sm text-slate-500 shadow-inner transition hover:border-slate-300 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400 dark:hover:bg-slate-900"
        >
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-brand-terracotta" />
            <span>Search member, firm, code, family ID...</span>
          </div>
          <kbd className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[11px] font-mono text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Dark/Light Toggle */}
        <button
          type="button"
          onClick={() => setDarkMode(!darkMode)}
          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {darkMode ? <Sun className="h-5 w-5 text-brand-light" /> : <Moon className="h-5 w-5" />}
        </button>

        {/* User Status Pill & Logout */}
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-terracotta/15 text-brand-terracotta dark:bg-brand-orange/20 dark:text-brand-300">
            <UserIcon className="h-4 w-4" />
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-xs font-semibold leading-tight text-slate-900 dark:text-white">
              {user?.username || 'Super Admin'}
            </p>
            <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-3 w-3" />
              <span>{user?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Operator'}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => logout()}
            className="ml-1 rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-red-600 dark:hover:bg-slate-800 transition"
            title="Sign Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
