import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Users,
  UserCheck,
  UserX,
  Receipt,
  IndianRupee,
  PlusCircle,
  FileSpreadsheet,
  ArrowUpRight,
  Clock,
  Sparkles,
  Activity,
  HardDrive,
} from 'lucide-react';
import { api } from '../services/api.js';

interface DashboardSummary {
  stats: {
    totalFirms: number;
    totalFamilies: number;
    totalMembers: number;
    permanentMembers: number;
    nominalMembers: number;
    maleMembers: number;
    femaleMembers: number;
    male18PlusMembers: number;
    totalReceipts: number;
    totalCollection: number;
  };
  recentActivities: Array<{
    id: string;
    action: string;
    module: string;
    description: string;
    occurredAt: string;
    user?: { username: string };
  }>;
  recentReceipts: Array<{
    id?: string;
    receiptNumber?: string;
    amount: number;
    generatedAt: string;
    receiptType: { name: string };
  }>;
}

export const Dashboard: React.FC = () => {
  const [healthStatus, setHealthStatus] = useState<'online' | 'connecting' | 'offline'>('connecting');
  const [uptime, setUptime] = useState<number>(0);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  useEffect(() => {
    // Health check
    api
      .get('/health')
      .then((res) => {
        if (res.data?.status === 'ok') {
          setHealthStatus('online');
          setUptime(res.data.uptimeSeconds || 0);
        }
      })
      .catch(() => {
        setHealthStatus('offline');
      });

    // Summary statistics
    api
      .get('/v1/reports/summary')
      .then((res) => {
        if (res.data?.data) {
          setSummary(res.data.data);
        }
      })
      .catch(() => {
        // Fallback default statistics if offline
        setSummary({
          stats: {
            totalFirms: 0,
            totalFamilies: 0,
            totalMembers: 0,
            permanentMembers: 0,
            nominalMembers: 0,
            maleMembers: 0,
            femaleMembers: 0,
            male18PlusMembers: 0,
            totalReceipts: 0,
            totalCollection: 0,
          },
          recentActivities: [],
          recentReceipts: [],
        });
      });
  }, []);

  const st = summary?.stats;

  const stats = [
    {
      label: 'Total Firms',
      value: st ? st.totalFirms.toLocaleString('en-IN') : '...',
      icon: Building2,
      color: 'from-amber-500 to-orange-500',
      link: '/firms',
    },
    {
      label: 'Total Families',
      value: st ? st.totalFamilies.toLocaleString('en-IN') : '...',
      icon: Users,
      color: 'from-orange-500 to-brand-terracotta',
      link: '/members',
    },
    {
      label: 'Total Members',
      value: st ? st.totalMembers.toLocaleString('en-IN') : '...',
      icon: Users,
      color: 'from-brand-terracotta to-brand-espresso',
      link: '/members',
    },
    {
      label: 'Permanent Members',
      value: st ? st.permanentMembers.toLocaleString('en-IN') : '...',
      icon: UserCheck,
      color: 'from-emerald-600 to-teal-600',
      link: '/members',
    },
    {
      label: 'Nominal Members',
      value: st ? st.nominalMembers.toLocaleString('en-IN') : '...',
      icon: UserX,
      color: 'from-blue-600 to-indigo-600',
      link: '/members',
    },
    {
      label: 'Male Members',
      value: st ? st.maleMembers.toLocaleString('en-IN') : '...',
      icon: Users,
      color: 'from-indigo-500 to-purple-600',
      link: '/members',
    },
    {
      label: 'Female Members',
      value: st ? st.femaleMembers.toLocaleString('en-IN') : '...',
      icon: Users,
      color: 'from-rose-500 to-pink-600',
      link: '/niyari',
    },
    {
      label: '18+ Male Members',
      value: st ? st.male18PlusMembers.toLocaleString('en-IN') : '...',
      icon: UserCheck,
      color: 'from-brand-terracotta to-red-600',
      link: '/reports',
    },
    {
      label: 'Total Collection',
      value: st ? `₹ ${Number(st.totalCollection).toLocaleString('en-IN')}` : '...',
      icon: IndianRupee,
      color: 'from-emerald-500 to-emerald-700',
      link: '/receipts',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner & System Status */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-espresso via-brand-terracotta to-brand-orange p-6 text-white shadow-glow sm:p-8">
        <div className="relative z-10 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-0.5 text-xs font-semibold backdrop-blur">
                <Sparkles className="h-3.5 w-3.5 text-brand-sand" />
                Community Portal
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium backdrop-blur ${
                  healthStatus === 'online'
                    ? 'bg-emerald-500/20 text-emerald-200'
                    : healthStatus === 'connecting'
                    ? 'bg-amber-500/20 text-amber-200'
                    : 'bg-red-500/20 text-red-200'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    healthStatus === 'online'
                      ? 'bg-emerald-400 animate-pulse'
                      : healthStatus === 'connecting'
                      ? 'bg-amber-400'
                      : 'bg-red-400'
                  }`}
                />
                Backend {healthStatus === 'online' ? `Online (${uptime}s)` : healthStatus}
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
              Uma Bhavan Community Management
            </h1>
            <p className="mt-1 text-sm text-amber-100/90 max-w-2xl">
              Anand, Gujarat (388001) • Firm registry, family records, Niyari reporting, receipts, and migration management.
            </p>
          </div>

          {/* Quick Action Shortcuts */}
          <div className="flex flex-wrap gap-2.5">
            <Link
              to="/members"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-brand-espresso shadow transition hover:bg-amber-50 active:scale-95"
            >
              <PlusCircle className="h-4 w-4 text-brand-terracotta" />
              <span>Manage Families</span>
            </Link>
            <Link
              to="/receipts"
              className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20 active:scale-95"
            >
              <Receipt className="h-4 w-4" />
              <span>Issue Receipt</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 9 Core PRD Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
        {stats.map((card, idx) => {
          const Icon = card.icon;
          return (
            <Link
              key={idx}
              to={card.link}
              className="group card-premium flex items-center justify-between transition-all hover:-translate-y-0.5"
            >
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{card.label}</p>
                <h3 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {card.value}
                </h3>
              </div>
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${card.color} text-white shadow-sm transition group-hover:scale-110`}
              >
                <Icon className="h-6 w-6" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Operational Sections: Recent Receipts & Activities */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Receipts */}
        <div className="card-premium">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-brand-terracotta" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Recent Receipts</h2>
            </div>
            <Link
              to="/receipts"
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-terracotta hover:text-brand-orange"
            >
              View All <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
            {summary?.recentReceipts && summary.recentReceipts.length > 0 ? (
              summary.recentReceipts.slice(0, 5).map((rc, i) => (
                <div key={i} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-brand-terracotta">
                        {rc.receiptNumber || `REC-${i + 1}`}
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {rc.receiptType?.name || 'Samaj'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {new Date(rc.generatedAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900 dark:text-white">
                      ₹ {Number(rc.amount).toLocaleString('en-IN')}
                    </p>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Completed</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-xs text-slate-500">
                No recent receipts issued yet.
              </div>
            )}
          </div>
        </div>

        {/* Recent Audit Activities */}
        <div className="card-premium">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-brand-orange" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Recent Activities</h2>
            </div>
            <Link
              to="/admin"
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-terracotta hover:text-brand-orange"
            >
              Audit Log <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-3 space-y-3">
            {summary?.recentActivities && summary.recentActivities.length > 0 ? (
              summary.recentActivities.slice(0, 5).map((act, i) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-sand/30 text-brand-espresso dark:bg-brand-orange/20 dark:text-brand-sand">
                    <Clock className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-800 dark:text-slate-200">
                      {act.action} ({act.module})
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{act.description}</p>
                  </div>
                  <span className="text-[11px] text-slate-400 shrink-0">
                    {new Date(act.occurredAt).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-xs text-slate-500">
                No audit activity logged yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Launchpad */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Link to="/niyari" className="card-premium flex flex-col items-center justify-center p-4 text-center hover:border-brand-orange">
          <FileSpreadsheet className="h-7 w-7 text-brand-terracotta" />
          <span className="mt-2 text-sm font-bold text-slate-800 dark:text-slate-200">Niyari Report</span>
          <span className="text-xs text-slate-500">Female Surname Lookup</span>
        </Link>
        <Link to="/firms" className="card-premium flex flex-col items-center justify-center p-4 text-center hover:border-brand-orange">
          <Building2 className="h-7 w-7 text-amber-500" />
          <span className="mt-2 text-sm font-bold text-slate-800 dark:text-slate-200">Firm Master</span>
          <span className="text-xs text-slate-500">F001 - F500 Registry</span>
        </Link>
        <Link to="/members" className="card-premium flex flex-col items-center justify-center p-4 text-center hover:border-brand-orange">
          <Users className="h-7 w-7 text-blue-500" />
          <span className="mt-2 text-sm font-bold text-slate-800 dark:text-slate-200">Member Master</span>
          <span className="text-xs text-slate-500">Permanent & Nominal</span>
        </Link>
        <Link to="/backup" className="card-premium flex flex-col items-center justify-center p-4 text-center hover:border-brand-orange">
          <HardDrive className="h-7 w-7 text-emerald-500" />
          <span className="mt-2 text-sm font-bold text-slate-800 dark:text-slate-200">Backup & Restore</span>
          <span className="text-xs text-slate-500">Encrypted DB Snapshots</span>
        </Link>
      </div>
    </div>
  );
};
