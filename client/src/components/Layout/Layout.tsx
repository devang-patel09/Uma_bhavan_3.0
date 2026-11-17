import React, { useEffect, useRef, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Keyboard, X } from 'lucide-react';
import { Header } from './Header.js';
import { Navbar } from './Navbar.js';
import { isPopupOpen, isTypingTarget, useEscapeKey } from '../../hooks/useHotkeys.js';

/** "g" followed by one of these keys jumps to a page. */
const GO_TO: Record<string, { path: string; label: string }> = {
  d: { path: '/', label: 'Dashboard' },
  f: { path: '/firms', label: 'Firm Master' },
  m: { path: '/members', label: 'Member Master' },
  r: { path: '/receipts', label: 'Receipts' },
  n: { path: '/niyari', label: 'Niyari Report' },
  a: { path: '/masters', label: 'Area & Surname' },
  i: { path: '/data-ops', label: 'Import / Export' },
  b: { path: '/backup', label: 'Backup & Restore' },
  t: { path: '/admin', label: 'Audit Trail' },
};

const clickShortcut = (name: string): boolean => {
  const el = document.querySelector<HTMLElement>(`[data-shortcut="${name}"]`);
  if (!el || (el as HTMLButtonElement).disabled) return false;
  el.click();
  return true;
};

const Kbd: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <kbd className="inline-flex min-w-[1.75rem] items-center justify-center rounded-md border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-700 shadow-[0_1px_0_rgba(0,0,0,0.08)] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
    {children}
  </kbd>
);

const ShortcutsHelp: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  useEscapeKey(onClose);
  const general: Array<[React.ReactNode, string]> = [
    [<Kbd key="esc">Esc</Kbd>, 'Close the open popup'],
    [<Kbd key="slash">/</Kbd>, 'Focus the search box'],
    [<Kbd key="n">N</Kbd>, 'Add new record (firm / family)'],
    [<span key="arrows" className="flex gap-1"><Kbd>←</Kbd><Kbd>→</Kbd></span>, 'Previous / next page'],
    [<Kbd key="q">?</Kbd>, 'Show this help'],
  ];
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-brand-terracotta" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Keyboard Shortcuts</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">General</p>
            <ul className="space-y-2 text-sm">
              {general.map(([keys, label], i) => (
                <li key={i} className="flex items-center justify-between gap-3">
                  <span className="text-slate-600 dark:text-slate-300">{label}</span>
                  {keys}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">Go to page</p>
            <ul className="space-y-2 text-sm">
              {Object.entries(GO_TO).map(([k, v]) => (
                <li key={k} className="flex items-center justify-between gap-3">
                  <span className="text-slate-600 dark:text-slate-300">{v.label}</span>
                  <span className="flex gap-1"><Kbd>G</Kbd><Kbd>{k.toUpperCase()}</Kbd></span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export const Layout: React.FC = () => {
  const navigate = useNavigate();
  const [showShortcuts, setShowShortcuts] = useState(false);
  const pendingG = useRef<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTypingTarget(e.target) || isPopupOpen()) return;

      if (pendingG.current !== null) {
        window.clearTimeout(pendingG.current);
        pendingG.current = null;
        const dest = GO_TO[e.key.toLowerCase()];
        if (dest) {
          e.preventDefault();
          navigate(dest.path);
        }
        return;
      }

      switch (e.key) {
        case '?':
          e.preventDefault();
          setShowShortcuts(true);
          break;
        case '/': {
          const el = document.querySelector<HTMLElement>('[data-shortcut="search"]');
          if (el) {
            e.preventDefault();
            el.focus();
          }
          break;
        }
        case 'n':
        case 'N':
          if (clickShortcut('new')) e.preventDefault();
          break;
        case 'ArrowLeft':
          if (clickShortcut('prev-page')) e.preventDefault();
          break;
        case 'ArrowRight':
          if (clickShortcut('next-page')) e.preventDefault();
          break;
        case 'g':
        case 'G':
          pendingG.current = window.setTimeout(() => (pendingG.current = null), 1200);
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  return (
    <div className="relative flex min-h-screen flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Page-wide logo watermark (fixed, faint, behind all content) */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center overflow-hidden">
        <img
          src="/logo.png"
          alt=""
          className="w-[80vw] max-w-[900px] select-none opacity-[0.06] dark:opacity-[0.05] dark:[filter:brightness(0)_invert(1)]"
        />
      </div>
      <Header onShortcutsClick={() => setShowShortcuts(true)} />
      <Navbar />
      <main className="relative z-10 mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        <Outlet />
      </main>
      <footer className="relative z-10 border-t border-slate-200/80 bg-white/60 py-4 text-center text-xs text-slate-500 backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/60 dark:text-slate-400">
        Uma Bhavan Community Management System • Anand, Gujarat (388001) •{' '}
        <button onClick={() => setShowShortcuts(true)} className="font-semibold hover:text-brand-terracotta">
          Press <span className="font-mono">?</span> for shortcuts
        </button>
      </footer>
      {showShortcuts && <ShortcutsHelp onClose={() => setShowShortcuts(false)} />}
    </div>
  );
};
