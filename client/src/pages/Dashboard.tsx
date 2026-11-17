import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Users,
  UserCheck,
  Receipt,
  IndianRupee,
  ArrowUpRight,
  Clock,
  Activity,
  BarChart3,
  PieChart,
  MapPin,
  Droplet,
  Wallet,
  CalendarDays,
} from 'lucide-react';
import { api } from '../services/api.js';
import {
  ColumnChart,
  DonutChart,
  HBarChart,
  Legend,
  formatCount,
  formatInr,
  formatInrCompact,
} from '../components/charts.js';

interface DashboardSummary {
  stats: {
    totalFirms: number;
    totalFamilies: number;
    totalMembers: number;
    permanentMembers: number; // family records of PERMANENT type
    nominalMembers: number; // family records of NOMINAL type
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
    description?: string;
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
  charts?: {
    ageGender: Array<{ band: string; male: number; female: number }>;
    monthlyCollection: Array<{ month: string; label: string; amount: number; count: number }>;
    areas: Array<{ area: string; firms: number; families: number }>;
    bloodGroups: Array<{ bloodGroup: string; count: number }>;
    maritalStatus: Array<{ status: string; count: number }>;
    receiptTypes: Array<{ name: string; amount: number; count: number }>;
  };
}

const EMPTY_SUMMARY: DashboardSummary = {
  stats: {
    totalFirms: 0, totalFamilies: 0, totalMembers: 0, permanentMembers: 0, nominalMembers: 0,
    maleMembers: 0, femaleMembers: 0, male18PlusMembers: 0, totalReceipts: 0, totalCollection: 0,
  },
  recentActivities: [],
  recentReceipts: [],
};

const BLOOD_LABELS: Record<string, string> = {
  A_POSITIVE: 'A+', A_NEGATIVE: 'A-', B_POSITIVE: 'B+', B_NEGATIVE: 'B-',
  AB_POSITIVE: 'AB+', AB_NEGATIVE: 'AB-', O_POSITIVE: 'O+', O_NEGATIVE: 'O-', UNKNOWN: 'N/A',
};

/** ADD_INDIVIDUAL + MEMBER_MASTER → "Add individual" · "Member master" */
const humanize = (s: string) => {
  const t = (s || '').replace(/_/g, ' ').toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
};

const timeAgo = (iso: string) => {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

const ChartCard: React.FC<{
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}> = ({ title, subtitle, icon: Icon, action, className = '', children }) => (
  <section className={`card-premium hover:shadow-sm ${className}`}>
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-terracotta dark:bg-brand-950/50 dark:text-brand-300">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
    {children}
  </section>
);

const KpiTile: React.FC<{
  label: string;
  value: string;
  sub: React.ReactNode;
  icon: React.ElementType;
  gradient: string;
  to: string;
}> = ({ label, value, sub, icon: Icon, gradient, to }) => (
  <Link to={to} className="group card-premium relative overflow-hidden p-4 transition-all hover:-translate-y-0.5">
    <div className={`absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${gradient} opacity-10 transition group-hover:opacity-20`} />
    <div className="flex items-center justify-between">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${gradient} text-white shadow-sm`}>
        <Icon className="h-4 w-4" />
      </div>
    </div>
    <p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{value}</p>
    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{sub}</div>
  </Link>
);

export const Dashboard: React.FC = () => {
  const [healthStatus, setHealthStatus] = useState<'online' | 'connecting' | 'offline'>('connecting');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  useEffect(() => {
    api
      .get('/health')
      .then((res) => setHealthStatus(res.data?.status === 'ok' ? 'online' : 'offline'))
      .catch(() => setHealthStatus('offline'));

    api
      .get('/v1/reports/summary')
      .then((res) => setSummary(res.data?.data ?? EMPTY_SUMMARY))
      .catch(() => setSummary(EMPTY_SUMMARY));
  }, []);

  const st = summary?.stats;
  const charts = summary?.charts;
  const n = (v: number | undefined) => (st ? formatCount(v ?? 0) : '…');

  const monthly = charts?.monthlyCollection ?? [];
  const last12Total = monthly.reduce((s, m) => s + m.amount, 0);
  const last12Count = monthly.reduce((s, m) => s + m.count, 0);
  const marital = charts?.maritalStatus ?? [];
  const married = marital.find((m) => m.status === 'MARRIED')?.count ?? 0;
  const unmarried = marital.find((m) => m.status === 'UNMARRIED')?.count ?? 0;

  return (
    <div className="space-y-6">
      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-espresso via-brand-terracotta to-brand-orange p-6 text-white shadow-glow sm:p-7">
        <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-24 w-72 rounded-full bg-amber-300/20 blur-3xl" />
        <div className="relative z-10 flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-0.5 font-medium backdrop-blur">
                <CalendarDays className="h-3.5 w-3.5" />
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-medium backdrop-blur ${
                  healthStatus === 'online' ? 'bg-emerald-500/25 text-emerald-100' : healthStatus === 'connecting' ? 'bg-amber-500/25 text-amber-100' : 'bg-red-500/25 text-red-100'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${healthStatus === 'online' ? 'animate-pulse bg-emerald-300' : healthStatus === 'connecting' ? 'bg-amber-300' : 'bg-red-300'}`} />
                {healthStatus === 'online' ? 'System online' : healthStatus === 'connecting' ? 'Connecting…' : 'Server offline'}
              </span>
            </div>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">{greeting()} 🙏</h1>
            <p className="mt-1 max-w-2xl text-sm text-amber-50/90">
              Here’s what’s happening across Uma Bhavan, Anand — {n(st?.totalFamilies)} {st?.totalFamilies === 1 ? 'family' : 'families'},{' '}
              {n(st?.totalMembers)} {st?.totalMembers === 1 ? 'member' : 'members'} and{' '}
              {st ? formatInr(st.totalCollection) : '…'} collected so far.
            </p>
          </div>
          {/* Uma Bhavan logo (white card keeps the black lettering readable on the gradient) */}
          <div className="shrink-0 self-start rounded-2xl bg-white/95 px-5 py-3 shadow-lg ring-1 ring-white/40 md:self-center">
            <img src="/logo.png" alt="Uma Bhavan, Anand" className="h-16 w-auto sm:h-20" />
          </div>
        </div>
      </div>

      {/* ── KPI tiles ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiTile label="Firms" value={n(st?.totalFirms)} to="/firms" icon={Building2} gradient="from-amber-500 to-orange-500"
          sub="Registered business entities" />
        <KpiTile label="Families" value={n(st?.totalFamilies)} to="/members" icon={Users} gradient="from-orange-500 to-brand-terracotta"
          sub={<>{n(st?.permanentMembers)} permanent · {n(st?.nominalMembers)} nominal</>} />
        <KpiTile label="Members" value={n(st?.totalMembers)} to="/members" icon={Users} gradient="from-brand-terracotta to-brand-espresso"
          sub={<>{n(st?.maleMembers)} male · {n(st?.femaleMembers)} female</>} />
        <KpiTile label="18+ Males" value={n(st?.male18PlusMembers)} to="/members" icon={UserCheck} gradient="from-blue-500 to-indigo-600"
          sub="Eligible for subscriptions" />
        <KpiTile label="Collection" value={st ? formatInr(st.totalCollection) : '…'} to="/receipts" icon={IndianRupee} gradient="from-emerald-500 to-emerald-700"
          sub={<>{n(st?.totalReceipts)} active receipts</>} />
      </div>

      {/* ── Row 1: collection trend + family type ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ChartCard
          className="lg:col-span-2"
          title="Monthly Collection"
          subtitle="Active receipts, last 12 months"
          icon={BarChart3}
          action={
            <div className="text-right">
              <p className="text-lg font-extrabold text-slate-900 dark:text-white">{formatInr(last12Total)}</p>
              <p className="text-[11px] text-slate-500">{formatCount(last12Count)} receipts</p>
            </div>
          }
        >
          <ColumnChart
            data={monthly.map((m) => ({ label: m.label, value: m.amount, detail: `${m.count} receipt${m.count === 1 ? '' : 's'}` }))}
            formatValue={formatInr}
            formatAxis={formatInrCompact}
            emptyText="No receipts in the last 12 months"
            ariaLabel="Monthly collection over the last 12 months"
          />
        </ChartCard>

        <ChartCard title="Family Classification" subtitle="Permanent vs nominal records" icon={PieChart}>
          <DonutChart
            centerLabel="Families"
            ariaLabel="Permanent versus nominal families"
            segments={[
              { label: 'Permanent', value: st?.permanentMembers ?? 0, color: 'var(--series-3)' },
              { label: 'Nominal', value: st?.nominalMembers ?? 0, color: 'var(--series-1)' },
            ]}
          />
        </ChartCard>
      </div>

      {/* ── Row 2: demographics + areas ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard
          title="Age & Gender"
          subtitle="Members by age bracket"
          icon={Users}
          action={<Legend items={[{ label: 'Male', color: 'var(--series-1)' }, { label: 'Female', color: 'var(--series-2)' }]} />}
        >
          <HBarChart
            rows={(charts?.ageGender ?? []).map((r) => ({ label: `${r.band} yrs`, values: [r.male, r.female] }))}
            series={[{ name: 'Male', color: 'var(--series-1)' }, { name: 'Female', color: 'var(--series-2)' }]}
            emptyText="No members added yet"
            ariaLabel="Members by age bracket and gender"
          />
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
            <div>
              <p className="text-slate-500 dark:text-slate-400">Married</p>
              <p className="text-base font-bold text-slate-900 dark:text-white">{formatCount(married)}</p>
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400">Unmarried</p>
              <p className="text-base font-bold text-slate-900 dark:text-white">{formatCount(unmarried)}</p>
            </div>
          </div>
        </ChartCard>

        <ChartCard title="Families by Area" subtitle="Top areas by family count" icon={MapPin}
          action={<Link to="/masters" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-terracotta hover:text-brand-orange">Areas <ArrowUpRight className="h-3.5 w-3.5" /></Link>}
        >
          <HBarChart
            rows={(charts?.areas ?? []).map((a) => ({ label: a.area, values: [a.families] }))}
            series={[{ name: 'Families', color: 'var(--series-2)' }]}
            emptyText="No firms registered yet"
            ariaLabel="Families by area"
          />
          {(charts?.areas?.length ?? 0) > 0 && (
            <p className="mt-3 text-[11px] text-slate-400">
              {formatCount(charts!.areas.reduce((s, a) => s + a.firms, 0))} firms across {charts!.areas.length} area{charts!.areas.length === 1 ? '' : 's'}
            </p>
          )}
        </ChartCard>
      </div>

      {/* ── Row 3: blood groups + receipt types ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ChartCard className="lg:col-span-2" title="Blood Group Distribution" subtitle="Useful for community blood-donation drives" icon={Droplet}>
          <ColumnChart
            data={(charts?.bloodGroups ?? []).map((b) => ({ label: BLOOD_LABELS[b.bloodGroup] ?? b.bloodGroup, value: b.count, detail: 'members' }))}
            height={200}
            emptyText="No members added yet"
            ariaLabel="Members by blood group"
          />
        </ChartCard>

        <ChartCard title="Collection by Type" subtitle="All-time, active receipts" icon={Wallet}>
          {(charts?.receiptTypes?.length ?? 0) > 0 ? (
            <HBarChart
              rows={charts!.receiptTypes.map((r) => ({ label: r.name, values: [r.amount] }))}
              series={[{ name: 'Amount', color: 'var(--series-2)' }]}
              formatValue={formatInrCompact}
              barHeight={16}
              ariaLabel="Collection by receipt type"
            />
          ) : (
            <div className="flex h-32 items-center justify-center text-xs text-slate-500">No receipts issued yet.</div>
          )}
          {(charts?.receiptTypes ?? []).map((r) => (
            <div key={r.name} className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>{r.name}</span>
              <span>{formatCount(r.count)} receipts</span>
            </div>
          ))}
        </ChartCard>
      </div>

      {/* ── Row 4: recent receipts + activity ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Recent Receipts" icon={Receipt}
          action={<Link to="/receipts" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-terracotta hover:text-brand-orange">View all <ArrowUpRight className="h-3.5 w-3.5" /></Link>}
        >
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {summary?.recentReceipts?.length ? (
              summary.recentReceipts.slice(0, 5).map((rc, i) => (
                <div key={rc.id ?? i} className="flex items-center justify-between py-2.5 text-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                      <IndianRupee className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {rc.receiptType?.name || 'Receipt'}
                        {rc.receiptNumber && <span className="ml-2 font-mono text-xs text-brand-terracotta">{rc.receiptNumber}</span>}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{timeAgo(rc.generatedAt)}</p>
                    </div>
                  </div>
                  <p className="font-bold text-slate-900 dark:text-white">{formatInr(Number(rc.amount))}</p>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-500">No receipts issued yet.</div>
            )}
          </div>
        </ChartCard>

        <ChartCard title="Recent Activity" icon={Activity}
          action={<Link to="/admin" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-terracotta hover:text-brand-orange">Audit trail <ArrowUpRight className="h-3.5 w-3.5" /></Link>}
        >
          <ol className="relative space-y-3 border-l border-slate-200 pl-5 dark:border-slate-800">
            {summary?.recentActivities?.length ? (
              summary.recentActivities.slice(0, 6).map((act, i) => (
                <li key={act.id ?? i} className="relative text-sm">
                  <span className="absolute -left-[27px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-50 ring-4 ring-white dark:bg-brand-950 dark:ring-slate-900">
                    <Clock className="h-2.5 w-2.5 text-brand-terracotta" />
                  </span>
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium text-slate-800 dark:text-slate-200">
                      {humanize(act.action)}
                      <span className="ml-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        {humanize(act.module)}
                      </span>
                    </p>
                    <span className="shrink-0 text-[11px] text-slate-400">{timeAgo(act.occurredAt)}</span>
                  </div>
                </li>
              ))
            ) : (
              <li className="py-6 text-center text-xs text-slate-500">No activity logged yet.</li>
            )}
          </ol>
        </ChartCard>
      </div>
    </div>
  );
};
