import React, { useState, useEffect, useCallback } from 'react';
import {
  Receipt as ReceiptIcon,
  Plus,
  Search,
  Printer,
  Trash2,
  AlertCircle,
  Loader2,
  X,
  QrCode,
  Settings,
  ListChecks,
  ChevronRight,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Users,
  CalendarDays,
} from 'lucide-react';
import { api } from '../services/api.js';

interface ReceiptType {
  id: string;
  name: string;
  defaultAmount: number;
}

interface ReceiptItem {
  id: string;
  receiptNumber: string;
  receiptTypeId: string;
  receiptTypeName: string;
  individualMemberId: string;
  memberName: string;
  memberDob?: string;
  memberMobile?: string;
  memberCode: string;
  familyId: string;
  firmName: string;
  amount: number;
  amountInWords: string;
  periodType?: string;
  periodYear?: number;
  periodMonth?: number | null;
  generatedAt: string;
  status: string;
  verificationHash?: string;
}

interface MemberOption {
  id: string;
  name: string;
  gender: string;
  dob: string;
  age: number;
  mobile: string;
  memberCode: string;
  familyId: string;
  firmName: string;
  is18PlusMale: boolean;
  eligibleReceipts: string[];
}

interface ReceiptConfig {
  id?: string;
  samajMonthlyAmount: number;
  samajYearlyAmount: number;
  yuvakMonthlyAmount: number;
  yuvakYearlyAmount: number;
  yuvakMandalUpperAge: number;
}

interface BatchPreviewMember {
  individualMemberId: string;
  memberName: string;
  memberCode: string;
  familyId: string;
  firmName: string;
  amount: number;
}

interface BatchPreview {
  eligible: BatchPreviewMember[];
  ineligible: Array<{ memberName: string; reason: string }>;
  receiptType: string;
  periodType: string;
  periodYear: number;
  periodMonth?: number;
  amount: number;
}

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const inputCls = 'mt-1 w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-sm text-slate-800 focus:border-brand-orange focus:outline-none focus:ring-1 focus:ring-brand-orange dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

export const Receipts: React.FC = () => {
  const [receipts, setReceipts] = useState<ReceiptItem[]>([]);
  const [receiptTypes, setReceiptTypes] = useState<ReceiptType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [voucherModalReceipt, setVoucherModalReceipt] = useState<ReceiptItem | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchPreviewData, setBatchPreviewData] = useState<BatchPreview | null>(null);
  const [batchPrintReceipts, setBatchPrintReceipts] = useState<ReceiptItem[]>([]);
  const [showBatchPrint, setShowBatchPrint] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Issue Receipt form
  const [memberSearch, setMemberSearch] = useState('');
  const [searchedMembers, setSearchedMembers] = useState<MemberOption[]>([]);
  const [selectedMember, setSelectedMember] = useState<MemberOption | null>(null);
  const [selectedReceiptTypeId, setSelectedReceiptTypeId] = useState('');
  const [receiptAmount, setReceiptAmount] = useState<number>(500);
  const [eligibilityNotice, setEligibilityNotice] = useState<string | null>(null);

  // Batch Workflow state
  const [batchReceiptType, setBatchReceiptType] = useState<'Samaj' | 'Yuvak Mandal'>('Samaj');
  const [batchPeriodType, setBatchPeriodType] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [batchYear, setBatchYear] = useState<number>(new Date().getFullYear());
  const [batchMonth, setBatchMonth] = useState<number>(new Date().getMonth() + 1);
  const [batchStep, setBatchStep] = useState<1 | 2 | 3>(1);
  const [batchLoading, setBatchLoading] = useState(false);

  // Settings / Pricing
  const [config, setConfig] = useState<ReceiptConfig>({
    samajMonthlyAmount: 100,
    samajYearlyAmount: 1000,
    yuvakMonthlyAmount: 50,
    yuvakYearlyAmount: 500,
    yuvakMandalUpperAge: 45,
  });
  const [configLoading, setConfigLoading] = useState(false);

  const fetchReceipts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = {};
      if (searchTerm) params.search = searchTerm;
      if (selectedTypeId) params.receiptTypeId = selectedTypeId;

      const [recRes, typesRes] = await Promise.all([
        api.get('/v1/receipts', { params }),
        api.get('/v1/receipts/types'),
      ]);

      setReceipts(recRes.data.data.receipts ?? []);
      setReceiptTypes(typesRes.data.data ?? []);
    } catch {
      // retain existing
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, selectedTypeId]);

  useEffect(() => { fetchReceipts(); }, [fetchReceipts]);

  // Load config when settings modal opens
  const loadConfig = async () => {
    setConfigLoading(true);
    try {
      const res = await api.get('/v1/receipts/config');
      if (res.data.data) {
        setConfig({
          samajMonthlyAmount: Number(res.data.data.samajMonthlyAmount) || 100,
          samajYearlyAmount: Number(res.data.data.samajYearlyAmount) || 1000,
          yuvakMonthlyAmount: Number(res.data.data.yuvakMonthlyAmount) || 50,
          yuvakYearlyAmount: Number(res.data.data.yuvakYearlyAmount) || 500,
          yuvakMandalUpperAge: Number(res.data.data.yuvakMandalUpperAge) || 45,
        });
      }
    } catch {
      // use defaults
    } finally {
      setConfigLoading(false);
    }
  };

  // Member search debounce
  useEffect(() => {
    if (!memberSearch.trim()) { setSearchedMembers([]); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await api.get('/v1/members', { params: { search: memberSearch } });
        const all: MemberOption[] = [];
        for (const fam of res.data.data.records ?? []) {
          for (const m of fam.members ?? []) {
            all.push({ ...m, memberCode: fam.memberCode, familyId: fam.familyId, firmName: fam.firmName });
          }
        }
        setSearchedMembers(all);
      } catch { /* ignore */ }
    }, 300);
    return () => clearTimeout(timer);
  }, [memberSearch]);

  const openIssue = () => {
    setSelectedMember(null);
    setMemberSearch('');
    setSelectedReceiptTypeId(receiptTypes[0]?.id || '');
    setReceiptAmount(receiptTypes[0]?.defaultAmount || 500);
    setEligibilityNotice(null);
    setError(null);
    setShowIssueModal(true);
  };

  const handleSelectMember = (mem: MemberOption) => {
    setSelectedMember(mem);
    setMemberSearch(mem.name);
    setSearchedMembers([]);
    if (!mem.is18PlusMale) {
      setEligibilityNotice(`Notice: ${mem.name} is ${mem.age} yrs (${mem.gender}). Receipts are for 18+ adult males.`);
    } else {
      setEligibilityNotice(null);
    }
  };

  const handleSelectReceiptType = (typeId: string) => {
    setSelectedReceiptTypeId(typeId);
    const rt = receiptTypes.find((t) => t.id === typeId);
    if (rt) setReceiptAmount(Number(rt.defaultAmount));
  };

  const handleGenerateReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) { setError('Select a member.'); return; }
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await api.post('/v1/receipts', {
        individualMemberId: selectedMember.id,
        receiptTypeId: selectedReceiptTypeId,
        amount: Number(receiptAmount),
      });
      setShowIssueModal(false);
      fetchReceipts();
      setVoucherModalReceipt(res.data.data);
    } catch (err: any) {
      setError(err.message || 'Failed to generate receipt.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReceipt = async (receipt: ReceiptItem) => {
    if (!window.confirm(`Delete receipt ${receipt.receiptNumber}?`)) return;
    try {
      await api.delete(`/v1/receipts/${receipt.id}`);
      fetchReceipts();
    } catch (err: any) {
      setError(err.message || 'Failed to delete receipt.');
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfigLoading(true);
    try {
      await api.patch('/v1/receipts/config', config);
      setShowSettingsModal(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save config.');
    } finally {
      setConfigLoading(false);
    }
  };

  // Batch workflow
  const openBatch = () => {
    setBatchStep(1);
    setBatchReceiptType('Samaj');
    setBatchPeriodType('MONTHLY');
    setBatchYear(new Date().getFullYear());
    setBatchMonth(new Date().getMonth() + 1);
    setBatchPreviewData(null);
    setError(null);
    setShowBatchModal(true);
  };

  const handleBatchPreview = async () => {
    setBatchLoading(true);
    setError(null);
    try {
      const res = await api.post('/v1/receipts/batch/preview', {
        receiptTypeName: batchReceiptType,
        periodType: batchPeriodType,
        periodYear: batchYear,
        periodMonth: batchPeriodType === 'MONTHLY' ? batchMonth : undefined,
      });
      // Server returns eligibleMembers / ineligibleMembers / configuredAmount
      const d = res.data.data;
      setBatchPreviewData({
        eligible: (d.eligibleMembers ?? []).map((m: any) => ({
          individualMemberId: m.id,
          memberName: m.name,
          memberCode: m.memberCode,
          familyId: m.familyId,
          firmName: m.firmName,
          amount: m.amount,
        })),
        ineligible: (d.ineligibleMembers ?? []).map((m: any) => ({ memberName: m.name, reason: m.reason })),
        receiptType: batchReceiptType,
        periodType: batchPeriodType,
        periodYear: batchYear,
        periodMonth: batchPeriodType === 'MONTHLY' ? batchMonth : undefined,
        amount: d.configuredAmount ?? 0,
      });
      setBatchStep(2);
    } catch (err: any) {
      setError(err.message || 'Failed to load preview.');
    } finally {
      setBatchLoading(false);
    }
  };

  const handleBatchGenerate = async () => {
    if (!batchPreviewData) return;
    setBatchLoading(true);
    setError(null);
    try {
      const res = await api.post('/v1/receipts/batch/generate', {
        receiptTypeName: batchReceiptType,
        periodType: batchPeriodType,
        periodYear: batchYear,
        periodMonth: batchPeriodType === 'MONTHLY' ? batchMonth : undefined,
      });
      const generated: ReceiptItem[] = res.data.data.receipts ?? [];
      setBatchPrintReceipts(generated);
      setBatchStep(3);
      fetchReceipts();
    } catch (err: any) {
      setError(err.message || 'Failed to generate batch.');
    } finally {
      setBatchLoading(false);
    }
  };

  const handleBatchPrint = () => {
    setShowBatchModal(false);
    setShowBatchPrint(true);
    setTimeout(() => window.print(), 400);
  };

  const periodLabel = () => {
    if (batchPeriodType === 'MONTHLY') return `${MONTHS[batchMonth - 1]} ${batchYear}`;
    return `Year ${batchYear}`;
  };

  const amountForBatch = () => {
    if (batchReceiptType === 'Samaj') {
      return batchPeriodType === 'MONTHLY' ? config.samajMonthlyAmount : config.samajYearlyAmount;
    }
    return batchPeriodType === 'MONTHLY' ? config.yuvakMonthlyAmount : config.yuvakYearlyAmount;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center no-print">
        <div>
          <div className="flex items-center gap-2">
            <ReceiptIcon className="h-6 w-6 text-brand-terracotta" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Receipt Management</h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Generate individual receipts or bulk batches — Yuvak Mandal &amp; Samaj subscriptions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { loadConfig(); setShowSettingsModal(true); }}
            className="btn-secondary text-xs"
            title="Receipt Settings / Pricing"
          >
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </button>
          <button onClick={openBatch} className="btn-secondary">
            <ListChecks className="h-4 w-4" />
            <span>Bulk Batch</span>
          </button>
          <button onClick={openIssue} className="btn-primary">
            <Plus className="h-4 w-4" />
            <span>Issue Receipt</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-200 no-print">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Filters */}
      <div className="card-premium flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between no-print">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Receipt #, Member Name, Code, Family ID…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-4 text-sm placeholder-slate-400 focus:border-brand-orange focus:outline-none focus:ring-1 focus:ring-brand-orange dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
        <select value={selectedTypeId} onChange={(e) => setSelectedTypeId(e.target.value)} className="rounded-lg border border-slate-300 bg-white py-2 px-3 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <option value="">All Receipt Types</option>
          {receiptTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      {/* Receipts Table */}
      <div className="card-premium overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Receipt No.</th>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Family ID</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3 font-bold">Amount</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right no-print">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading && receipts.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-slate-400"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
              ) : receipts.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-slate-500">No receipts yet. Issue a receipt or run a bulk batch.</td></tr>
              ) : (
                receipts.map((r) => (
                  <tr key={r.id} className="transition hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-mono font-bold text-brand-terracotta">{r.receiptNumber}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900 dark:text-white">{r.memberName}</p>
                      <span className="font-mono text-xs text-slate-500">{r.memberCode}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{r.familyId}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/50">
                        {r.receiptTypeName}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {r.periodType === 'MONTHLY' && r.periodMonth
                        ? `${MONTHS[(r.periodMonth ?? 1) - 1]} ${r.periodYear}`
                        : r.periodYear ? `${r.periodType} ${r.periodYear}` : '—'}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                      ₹ {Number(r.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{new Date(r.generatedAt).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-3 text-right space-x-1 no-print">
                      <button onClick={() => setVoucherModalReceipt(r)} className="btn-secondary py-1 px-2.5 text-xs" title="Print Voucher">
                        <Printer className="h-3.5 w-3.5 text-brand-terracotta" />
                        <span>Print</span>
                      </button>
                      <button onClick={() => handleDeleteReceipt(r)} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-slate-800 transition" title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Issue Receipt Modal ── */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <ReceiptIcon className="h-5 w-5 text-brand-terracotta" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Issue Subscription Receipt</h2>
              </div>
              <button onClick={() => setShowIssueModal(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>

            {error && <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-700"><AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /><span>{error}</span></div>}

            {eligibilityNotice && (
              <div className="mb-3 flex items-start gap-2 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                <span>{eligibilityNotice}</span>
              </div>
            )}

            <form onSubmit={handleGenerateReceipt} className="space-y-4">
              <div className="relative">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Search &amp; Select Member *</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Name, member code (M001), mobile…"
                    value={memberSearch}
                    onChange={(e) => { setMemberSearch(e.target.value); setSelectedMember(null); }}
                    className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-4 text-sm focus:border-brand-orange focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                {searchedMembers.length > 0 && (
                  <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-800 dark:bg-slate-900">
                    {searchedMembers.map((m) => (
                      <div key={m.id} onClick={() => handleSelectMember(m)} className="flex items-center justify-between p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-xs">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{m.name}</p>
                          <p className="text-slate-500">{m.memberCode} · {m.gender} · {m.age} yrs · {m.firmName}</p>
                        </div>
                        {m.is18PlusMale
                          ? <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Eligible</span>
                          : <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">Ineligible</span>
                        }
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedMember && (
                <div className="rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <p className="font-bold text-slate-900 dark:text-white">{selectedMember.name}</p>
                  <p className="mt-0.5 text-slate-500">Code: <span className="font-mono">{selectedMember.memberCode}</span> · {selectedMember.familyId} · {selectedMember.firmName}</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Receipt Type *</label>
                <select required value={selectedReceiptTypeId} onChange={(e) => handleSelectReceiptType(e.target.value)} className={inputCls}>
                  {receiptTypes.map((t) => <option key={t.id} value={t.id}>{t.name} (Default ₹ {t.defaultAmount})</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Amount (₹) *</label>
                <input type="number" required min={1} value={receiptAmount} onChange={(e) => setReceiptAmount(Number(e.target.value))} className={inputCls + ' font-bold'} />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowIssueModal(false)} className="btn-secondary text-xs">Cancel</button>
                <button type="submit" disabled={isSubmitting || !selectedMember} className="btn-primary text-xs">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Issue &amp; Print Receipt</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Settings / Pricing Modal ── */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-brand-terracotta" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Receipt Settings &amp; Pricing</h2>
              </div>
              <button onClick={() => setShowSettingsModal(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>

            {configLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
            ) : (
              <form onSubmit={handleSaveConfig} className="space-y-4">
                <div className="rounded-lg border border-slate-200 p-3 space-y-3 dark:border-slate-700">
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">Samaj Amounts</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-600">Monthly (₹)</label>
                      <input type="number" min={1} value={config.samajMonthlyAmount} onChange={(e) => setConfig({ ...config, samajMonthlyAmount: Number(e.target.value) })} className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600">Yearly (₹)</label>
                      <input type="number" min={1} value={config.samajYearlyAmount} onChange={(e) => setConfig({ ...config, samajYearlyAmount: Number(e.target.value) })} className={inputCls} />
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 p-3 space-y-3 dark:border-slate-700">
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">Yuvak Mandal Amounts</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-600">Monthly (₹)</label>
                      <input type="number" min={1} value={config.yuvakMonthlyAmount} onChange={(e) => setConfig({ ...config, yuvakMonthlyAmount: Number(e.target.value) })} className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600">Yearly (₹)</label>
                      <input type="number" min={1} value={config.yuvakYearlyAmount} onChange={(e) => setConfig({ ...config, yuvakYearlyAmount: Number(e.target.value) })} className={inputCls} />
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-indigo-200 bg-indigo-50/40 p-3 dark:border-indigo-800 dark:bg-indigo-950/20">
                  <label className="block text-xs font-bold text-indigo-700 dark:text-indigo-300">Yuvak Mandal Upper Age Limit</label>
                  <p className="text-[11px] text-slate-500 mb-1">Members above this age are ineligible for Yuvak Mandal receipts</p>
                  <input type="number" min={18} max={100} value={config.yuvakMandalUpperAge ?? 45} onChange={(e) => setConfig({ ...config, yuvakMandalUpperAge: Number(e.target.value) })} className={inputCls} />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowSettingsModal(false)} className="btn-secondary text-xs">Cancel</button>
                  <button type="submit" disabled={configLoading} className="btn-primary text-xs">
                    {configLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Save Settings</span>}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── Bulk Batch Modal ── */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            {/* Stepper */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-1 text-xs">
                {[
                  { step: 1, label: 'Configure' },
                  { step: 2, label: 'Preview' },
                  { step: 3, label: 'Generate' },
                ].map((s, i) => (
                  <React.Fragment key={s.step}>
                    {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-400 mx-1" />}
                    <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${batchStep >= s.step ? 'bg-brand-terracotta/10 text-brand-terracotta' : 'text-slate-400'}`}>
                      {batchStep > s.step ? <CheckCircle2 className="h-3 w-3" /> : <span>{s.step}.</span>}
                      {s.label}
                    </span>
                  </React.Fragment>
                ))}
              </div>
              <button onClick={() => setShowBatchModal(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>

            {error && <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-700"><AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /><span>{error}</span></div>}

            {/* Step 1: Configure */}
            {batchStep === 1 && (
              <div className="space-y-4">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ListChecks className="h-5 w-5 text-brand-terracotta" />
                  Configure Bulk Batch
                </h2>

                {/* Receipt Type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Receipt Category *</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['Samaj', 'Yuvak Mandal'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setBatchReceiptType(t)}
                        className={`flex items-center gap-2 rounded-xl border-2 p-3 text-left text-xs font-semibold transition ${batchReceiptType === t ? 'border-brand-terracotta bg-brand-terracotta/5 text-brand-terracotta' : 'border-slate-200 text-slate-600 dark:border-slate-700'}`}
                      >
                        <Users className="h-4 w-4" />
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Period Type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Period Type *</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['MONTHLY', 'YEARLY'] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setBatchPeriodType(p)}
                        className={`flex items-center gap-2 rounded-xl border-2 p-3 text-left text-xs font-semibold transition ${batchPeriodType === p ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300' : 'border-slate-200 text-slate-600 dark:border-slate-700'}`}
                      >
                        <CalendarDays className="h-4 w-4" />
                        {p === 'MONTHLY' ? 'Monthly' : 'Yearly'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {batchPeriodType === 'MONTHLY' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Month *</label>
                      <select value={batchMonth} onChange={(e) => setBatchMonth(Number(e.target.value))} className={inputCls}>
                        {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Year *</label>
                    <input type="number" value={batchYear} onChange={(e) => setBatchYear(Number(e.target.value))} min={2020} max={2100} className={inputCls} />
                  </div>
                </div>

                <div className="rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
                  <p className="font-semibold text-slate-600 dark:text-slate-300">Configured Amount for this batch:</p>
                  <p className="text-xl font-bold text-brand-terracotta mt-1">₹ {amountForBatch().toLocaleString('en-IN')}</p>
                  <p className="text-slate-400 mt-0.5">per eligible member · {periodLabel()}</p>
                </div>

                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowBatchModal(false)} className="btn-secondary text-xs">Cancel</button>
                  <button type="button" onClick={handleBatchPreview} disabled={batchLoading} className="btn-primary text-xs">
                    {batchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><span>Preview Batch</span><ArrowRight className="h-3.5 w-3.5" /></>}
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Preview */}
            {batchStep === 2 && batchPreviewData && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Batch Preview — {periodLabel()}</h2>
                  <button type="button" onClick={() => setBatchStep(1)} className="text-xs text-slate-400 hover:text-slate-700">← Back</button>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 dark:bg-emerald-950/40">
                    <p className="text-2xl font-bold text-emerald-700">{batchPreviewData.eligible.length}</p>
                    <p className="text-xs text-emerald-600">Eligible Members</p>
                  </div>
                  <div className="rounded-xl bg-red-50 border border-red-200 p-3 dark:bg-red-950/40">
                    <p className="text-2xl font-bold text-red-700">{batchPreviewData.ineligible.length}</p>
                    <p className="text-xs text-red-600">Skipped / Ineligible</p>
                  </div>
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 dark:bg-amber-950/40">
                    <p className="text-2xl font-bold text-amber-700">₹ {(batchPreviewData.eligible.length * amountForBatch()).toLocaleString('en-IN')}</p>
                    <p className="text-xs text-amber-600">Total Collection</p>
                  </div>
                </div>

                {/* Eligible list */}
                {batchPreviewData.eligible.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-emerald-700 mb-1.5">✓ Eligible Members</p>
                    <div className="max-h-48 overflow-y-auto rounded-lg border border-emerald-200 divide-y divide-emerald-100 dark:border-emerald-800">
                      {batchPreviewData.eligible.map((m) => (
                        <div key={m.individualMemberId} className="flex items-center justify-between px-3 py-1.5 text-xs">
                          <div>
                            <span className="font-semibold text-slate-800 dark:text-white">{m.memberName}</span>
                            <span className="ml-2 font-mono text-slate-400">{m.memberCode}</span>
                          </div>
                          <span className="font-bold text-emerald-700">₹ {m.amount.toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ineligible list */}
                {batchPreviewData.ineligible.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-red-600 mb-1.5">✗ Skipped Members</p>
                    <div className="max-h-36 overflow-y-auto rounded-lg border border-red-200 divide-y divide-red-100 dark:border-red-800">
                      {batchPreviewData.ineligible.map((m, i) => (
                        <div key={i} className="flex items-center justify-between px-3 py-1.5 text-xs">
                          <span className="text-slate-700 dark:text-slate-300">{m.memberName}</span>
                          <span className="text-red-500">{m.reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowBatchModal(false)} className="btn-secondary text-xs">Cancel</button>
                  <button type="button" onClick={handleBatchGenerate} disabled={batchLoading || batchPreviewData.eligible.length === 0} className="btn-primary text-xs">
                    {batchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle2 className="h-3.5 w-3.5" /><span>Generate {batchPreviewData.eligible.length} Receipts</span></>}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Done */}
            {batchStep === 3 && (
              <div className="space-y-4 text-center py-6">
                <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500" />
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Batch Generated!</h2>
                <p className="text-sm text-slate-500">{batchPrintReceipts.length} receipt(s) created for {periodLabel()}</p>
                <div className="flex justify-center gap-3 pt-2">
                  <button type="button" onClick={() => setShowBatchModal(false)} className="btn-secondary">Close</button>
                  <button type="button" onClick={handleBatchPrint} className="btn-primary">
                    <Printer className="h-4 w-4" />
                    <span>Print All Receipts (A4)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── A4 Single Receipt Voucher Modal ── */}
      {voucherModalReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-8 shadow-2xl text-slate-900 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-6 no-print">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">A4 Receipt Voucher Preview</span>
              <div className="flex items-center gap-2">
                <button onClick={() => window.print()} className="btn-primary text-xs py-1.5 px-3">
                  <Printer className="h-4 w-4" /><span>Print Receipt</span>
                </button>
                <button onClick={() => setVoucherModalReceipt(null)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
              </div>
            </div>

            <div className="border-2 border-brand-espresso/40 p-6 rounded-xl space-y-6 page-break-avoid">
              <div className="text-center border-b-2 border-brand-terracotta pb-4">
                <div className="flex items-center justify-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-brand-terracotta text-white flex items-center justify-center font-bold text-sm">UB</div>
                  <h1 className="text-2xl font-black tracking-tight text-brand-espresso">UMA BHAVAN</h1>
                </div>
                <p className="text-xs font-semibold text-slate-600 mt-1 uppercase tracking-wider">Community Management Platform • Anand, Gujarat (388001)</p>
                <div className="mt-2 inline-block rounded-full bg-brand-orange/20 px-3 py-0.5 text-xs font-bold text-brand-espresso uppercase">
                  {voucherModalReceipt.receiptTypeName} Subscription Receipt
                </div>
              </div>

              <div className="grid grid-cols-2 text-xs gap-y-2">
                <div><span className="font-semibold text-slate-500">Receipt No: </span><span className="font-mono font-bold text-brand-terracotta text-sm">{voucherModalReceipt.receiptNumber}</span></div>
                <div className="text-right"><span className="font-semibold text-slate-500">Date: </span><span className="font-semibold">{new Date(voucherModalReceipt.generatedAt).toLocaleDateString('en-IN')}</span></div>
                <div><span className="font-semibold text-slate-500">Member Code: </span><span className="font-mono font-bold">{voucherModalReceipt.memberCode}</span></div>
                <div className="text-right"><span className="font-semibold text-slate-500">Family ID: </span><span className="font-mono">{voucherModalReceipt.familyId}</span></div>
                {voucherModalReceipt.periodYear && (
                  <div className="col-span-2">
                    <span className="font-semibold text-slate-500">Period: </span>
                    <span className="font-semibold">
                      {voucherModalReceipt.periodType === 'MONTHLY' && voucherModalReceipt.periodMonth
                        ? `${MONTHS[(voucherModalReceipt.periodMonth ?? 1) - 1]} ${voucherModalReceipt.periodYear}`
                        : `${voucherModalReceipt.periodType} ${voucherModalReceipt.periodYear}`}
                    </span>
                  </div>
                )}
              </div>

              <div className="border border-slate-300 rounded-lg overflow-hidden text-xs">
                <div className="grid grid-cols-3 bg-slate-100 p-2 font-bold text-slate-700">
                  <span className="col-span-2">Description</span>
                  <span className="text-right">Amount (₹)</span>
                </div>
                <div className="p-3 space-y-2">
                  <div className="flex justify-between font-semibold">
                    <span>Received from <strong>{voucherModalReceipt.memberName}</strong> ({voucherModalReceipt.firmName})</span>
                    <span className="font-mono font-bold text-sm">₹ {Number(voucherModalReceipt.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <p className="text-slate-500 text-[11px]">Subscription for <strong>{voucherModalReceipt.receiptTypeName}</strong> activities.</p>
                </div>
              </div>

              <div className="rounded bg-brand-sand/20 p-2.5 text-xs font-semibold text-brand-espresso border border-brand-sand">
                Amount in words: <span className="italic">{voucherModalReceipt.amountInWords}</span>
              </div>

              <div className="grid grid-cols-3 items-end pt-6 text-xs">
                <div className="text-center"><div className="h-10 border-b border-dashed border-slate-400 mx-4" /><p className="text-[10px] font-semibold text-slate-500">Authorized Signatory</p></div>
                <div className="flex flex-col items-center">
                  <div className="h-16 w-16 border border-slate-300 p-1 rounded bg-white shadow-sm flex items-center justify-center">
                    <QrCode className="h-14 w-14 text-slate-800" />
                  </div>
                  <span className="text-[9px] text-slate-400 mt-1 font-mono">Verify Online</span>
                </div>
                <div className="text-center"><div className="h-10 border-b border-dashed border-slate-400 mx-4" /><p className="text-[10px] font-semibold text-slate-500">Samaj Seal &amp; Stamp</p></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Batch A4 Print View (print-only) ── */}
      {showBatchPrint && (
        <div className="print-only">
          <div className="p-4 border-b border-slate-200 mb-4">
            <h2 className="text-lg font-bold">Uma Bhavan — Batch Receipts</h2>
            <p className="text-xs text-gray-500">Printed on {new Date().toLocaleDateString('en-IN')}</p>
          </div>
          {batchPrintReceipts.map((r) => (
            <div key={r.id} className="page-break-avoid border-2 border-gray-300 p-6 m-4 rounded-lg">
              <div className="text-center border-b border-gray-300 pb-3 mb-4">
                <h1 className="text-xl font-black">UMA BHAVAN</h1>
                <p className="text-xs text-gray-500">Community Management Platform • Anand, Gujarat (388001)</p>
                <div className="mt-1 inline-block rounded-full border border-gray-400 px-3 py-0.5 text-xs font-bold uppercase">
                  {r.receiptTypeName} Subscription Receipt
                </div>
              </div>
              <div className="grid grid-cols-2 text-xs gap-1 mb-3">
                <div><span className="font-semibold">Receipt No: </span><span className="font-mono font-bold">{r.receiptNumber}</span></div>
                <div className="text-right"><span className="font-semibold">Date: </span>{new Date(r.generatedAt).toLocaleDateString('en-IN')}</div>
                <div><span className="font-semibold">Member: </span>{r.memberName} ({r.memberCode})</div>
                <div className="text-right"><span className="font-semibold">Family ID: </span>{r.familyId}</div>
              </div>
              <div className="border border-gray-300 rounded p-3 text-xs mb-3">
                <div className="flex justify-between font-semibold">
                  <span>Received from {r.memberName} ({r.firmName})</span>
                  <span>₹ {Number(r.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
              <div className="border border-gray-300 rounded p-2 text-xs mb-4">{r.amountInWords}</div>
              <div className="grid grid-cols-3 text-center text-xs pt-2">
                <div><div className="h-8 border-b border-dashed border-gray-400 mx-4 mb-1" /><span>Authorized Signatory</span></div>
                <div><div className="h-8 border border-gray-400 w-8 mx-auto mb-1 flex items-center justify-center"><QrCode className="h-6 w-6" /></div><span>Verify Online</span></div>
                <div><div className="h-8 border-b border-dashed border-gray-400 mx-4 mb-1" /><span>Samaj Seal &amp; Stamp</span></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Close batch print screen button (no-print) */}
      {showBatchPrint && (
        <div className="no-print fixed bottom-4 right-4">
          <button onClick={() => setShowBatchPrint(false)} className="btn-secondary text-xs flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            Close Print View
          </button>
        </div>
      )}
    </div>
  );
};
