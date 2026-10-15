import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header.js';
import { Navbar } from './Navbar.js';

export const Layout: React.FC = () => {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Header />
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200/80 bg-white/60 py-4 text-center text-xs text-slate-500 backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/60 dark:text-slate-400">
        Uma Bhavan Community Management System • Anand, Gujarat (388001)
      </footer>
    </div>
  );
};
