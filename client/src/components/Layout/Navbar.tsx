import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Users,
  Receipt,
  FileSpreadsheet,
  Database,
  Layers,
  FileText,
  Shield,
  HardDrive,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/firms', label: 'Firm Master', icon: Building2 },
    { to: '/members', label: 'Member Master', icon: Users },
    { to: '/receipts', label: 'Receipts', icon: Receipt },
    { to: '/niyari', label: 'Niyari Report', icon: FileSpreadsheet },
    { to: '/masters', label: 'Area & Surname', icon: Layers },
    { to: '/reports', label: 'Reports', icon: FileText },
    { to: '/data-ops', label: 'Import / Export', icon: Database },
    { to: '/backup', label: 'Backup & Restore', icon: HardDrive },
    { to: '/admin', label: 'Audit Trail', icon: Shield },
  ];

  return (
    <nav className="border-b border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex space-x-1 overflow-x-auto py-2 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-brand-terracotta to-brand-orange text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
