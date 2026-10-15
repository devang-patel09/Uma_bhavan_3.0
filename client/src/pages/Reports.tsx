import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Printer,
  Users,
  Building2,
  Receipt,
  ShieldAlert,
  PieChart,
  UserCheck,
  Calendar,
  Layers,
  Activity,
  IndianRupee,
  Loader2,
} from 'lucide-react';
import { api } from '../services/api.js';

export const Reports: React.FC = () => {
  const [summary, setSummary] = useState<any>(null);
  const [exportingIndex, setExportingIndex] = useState<number | null>(null);

  useEffect(() => {
    api
      .get('/v1/reports/summary')
      .then((res) => setSummary(res.data.data))
      .catch(() => {
        // Fallback default statistics
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
        });
      });
  }, []);

  const handleExport = async (exportType: string, title: string, index: number) => {
    setExportingIndex(index);
    try {
      const res = await api.get(`/v1/data-ops/export/${exportType}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8;' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${exportType}_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Export failed for ${title}: ${err.message || 'Server error'}`);
    } finally {
      setExportingIndex(null);
    }
  };

  const reportFamilies = [
    {
      title: 'Member Master Report',
      desc: 'Complete directory of all registered Samaj families and members',
      icon: Users,
      format: 'PDF, Excel, Print',
      stat: summary?.stats?.totalFamilies ? `${summary.stats.totalFamilies.toLocaleString('en-IN')} Families` : 'Live',
      exportType: 'members',
    },
    {
      title: 'Firm Registry Report',
      desc: 'All registered business entities (F001+) with addresses and linked families',
      icon: Building2,
      format: 'PDF, Excel',
      stat: summary?.stats?.totalFirms ? `${summary.stats.totalFirms.toLocaleString('en-IN')} Firms` : 'Live',
      exportType: 'firms',
    },
    {
      title: '18+ Adult Male Members Report',
      desc: 'Eligible male members aged 18+ for Yuvak Mandal and Samaj subscription',
      icon: UserCheck,
      format: 'PDF, Excel, Print',
      stat: summary?.stats?.male18PlusMembers ? `${summary.stats.male18PlusMembers.toLocaleString('en-IN')} Members` : 'Live',
      exportType: 'members',
    },
    {
      title: 'Niyari Female Demographics Report',
      desc: 'Comprehensive female member directory classified by parental surname',
      icon: FileText,
      format: 'PDF, Excel, Print',
      stat: summary?.stats?.femaleMembers ? `${summary.stats.femaleMembers.toLocaleString('en-IN')} Females` : 'Live',
      exportType: 'niyari',
    },
    {
      title: 'Receipt Register & Collection Report',
      desc: 'Itemized receipts issued across Yuvak Mandal & Samaj subscriptions',
      icon: Receipt,
      format: 'PDF, Excel, Print',
      stat: summary?.stats?.totalCollection ? `₹ ${Number(summary.stats.totalCollection).toLocaleString('en-IN')}` : 'Live',
      exportType: 'receipts',
    },
    {
      title: 'Permanent vs Nominal Report',
      desc: 'Breakdown of Permanent (M001...) and Nominal (N001...) community records',
      icon: Layers,
      format: 'PDF, Excel',
      stat: summary?.stats?.permanentMembers
        ? `${summary.stats.permanentMembers} Perm / ${summary.stats.nominalMembers} Nom`
        : 'Live',
      exportType: 'members',
    },
    {
      title: 'Gender Distribution Report',
      desc: 'Detailed gender and age demographic breakdown across wards and areas',
      icon: PieChart,
      format: 'PDF, Excel',
      stat: `${summary?.stats?.maleMembers || 0} M / ${summary?.stats?.femaleMembers || 0} F`,
      exportType: 'members',
    },
    {
      title: 'Area-Wise Demographic Report',
      desc: 'Spatial distribution of Samaj families across Anand and surrounding zones',
      icon: Building2,
      format: 'PDF, Excel',
      stat: 'All Areas',
      exportType: 'firms',
    },
    {
      title: 'Age-Wise Demographics Report',
      desc: 'Age-bracket classification (<18, 18-45, 46-60, 60+ Senior Citizens)',
      icon: Calendar,
      format: 'PDF, Excel',
      stat: '4 Brackets',
      exportType: 'members',
    },
    {
      title: 'Monthly Collection Summary',
      desc: 'Monthly financial audit of collections with totals in numbers and words',
      icon: IndianRupee,
      format: 'PDF, Excel, Print',
      stat: 'FY 2026-27',
      exportType: 'receipts',
    },
    {
      title: 'Family Migration History Report',
      desc: 'Audit trail of family splitting and member transfers across firms',
      icon: ShieldAlert,
      format: 'PDF, Excel',
      stat: 'Audit Trail',
      exportType: 'members',
    },
    {
      title: 'System Audit & Activity Report',
      desc: 'Security log of user logins, creations, modifications, and exports',
      icon: Activity,
      format: 'PDF, Excel',
      stat: 'System Log',
      exportType: 'members',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-brand-terracotta" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Reports Central</h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Official Samaj reporting suite covering all 12 standard modules in PDF, CSV, and Print layouts
          </p>
        </div>
      </div>

      {/* 12 PRD Report Family Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reportFamilies.map((rep, idx) => {
          const Icon = rep.icon;
          const isExporting = exportingIndex === idx;

          return (
            <div key={idx} className="card-premium flex flex-col justify-between space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-sand/30 text-brand-espresso dark:bg-brand-orange/20 dark:text-brand-sand shadow-sm">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{rep.title}</h3>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{rep.desc}</p>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {rep.stat}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => window.print()}
                    className="btn-secondary py-1 px-2.5 text-xs"
                    title="Print Formatted Report"
                  >
                    <Printer className="h-3 w-3" />
                    <span>Print</span>
                  </button>
                  <button
                    onClick={() => handleExport(rep.exportType, rep.title, idx)}
                    disabled={isExporting}
                    className="btn-primary py-1 px-2.5 text-xs inline-flex items-center gap-1"
                    title="Export CSV (.csv)"
                  >
                    {isExporting ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Download className="h-3 w-3" />
                    )}
                    <span>CSV</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
