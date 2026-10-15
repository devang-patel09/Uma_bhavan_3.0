import React, { useState, useEffect } from 'react';
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
  generatedAt: string;
  status: string;
  verificationHash?: string;
  samajInfo?: {
    name: string;
    city: string;
    state: string;
    pincode: string;
    phone: string;
  };
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

export const Receipts: React.FC = () => {
  const [receipts, setReceipts] = useState<ReceiptItem[]>([]);
  const [receiptTypes, setReceiptTypes] = useState<ReceiptType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal States
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [voucherModalReceipt, setVoucherModalReceipt] = useState<ReceiptItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Issue Receipt Form State
  const [memberSearch, setMemberSearch] = useState('');
  const [searchedMembers, setSearchedMembers] = useState<MemberOption[]>([]);
  const [selectedMember, setSelectedMember] = useState<MemberOption | null>(null);
  const [selectedReceiptTypeId, setSelectedReceiptTypeId] = useState('');
  const [receiptAmount, setReceiptAmount] = useState<number>(500);
  const [eligibilityNotice, setEligibilityNotice] = useState<string | null>(null);

  const fetchReceipts = async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = {};
      if (searchTerm) params.search = searchTerm;
      if (selectedTypeId) params.receiptTypeId = selectedTypeId;

      const [recRes, typesRes] = await Promise.all([
        api.get('/v1/receipts', { params }),
        api.get('/v1/receipts/types'),
      ]);

      setReceipts(recRes.data.data.receipts);
      setReceiptTypes(typesRes.data.data);
    } catch {
      // Fallback sample data if local DB empty
      if (receipts.length === 0) {
        setReceipts([
          {
            id: '1',
            receiptNumber: 'R000124',
            receiptTypeId: 'rt_1',
            receiptTypeName: 'Yuvak Mandal',
            individualMemberId: 'm1',
            memberName: 'Patel Rajeshkumar Kiritbhai',
            memberCode: 'M001',
            familyId: 'FAM-1001',
            firmName: 'Shree Umiya Krushi Kendra',
            amount: 500,
            amountInWords: 'Rupees Five Hundred Only',
            generatedAt: new Date().toISOString(),
            status: 'ACTIVE',
            samajInfo: { name: 'UMA BHAVAN', city: 'Anand', state: 'Gujarat', pincode: '388001', phone: '+91 2692 250000' },
          },
          {
            id: '2',
            receiptNumber: 'R000123',
            receiptTypeId: 'rt_2',
            receiptTypeName: 'Samaj',
            individualMemberId: 'm2',
            memberName: 'Patel Kiritbhai Somabhai',
            memberCode: 'M001',
            familyId: 'FAM-1001',
            firmName: 'Shree Umiya Krushi Kendra',
            amount: 1000,
            amountInWords: 'Rupees One Thousand Only',
            generatedAt: new Date().toISOString(),
            status: 'ACTIVE',
            samajInfo: { name: 'UMA BHAVAN', city: 'Anand', state: 'Gujarat', pincode: '388001', phone: '+91 2692 250000' },
          },
        ]);
        setReceiptTypes([
          { id: 'rt_1', name: 'Yuvak Mandal', defaultAmount: 500 },
          { id: 'rt_2', name: 'Samaj', defaultAmount: 1000 },
        ]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, [searchTerm, selectedTypeId]);

  // Search members for issue modal
  useEffect(() => {
    if (!memberSearch.trim()) {
      setSearchedMembers([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await api.get('/v1/members', { params: { search: memberSearch } });
        const allIndividualMembers: MemberOption[] = [];
        for (const fam of res.data.data.records) {
          for (const m of fam.members || []) {
            allIndividualMembers.push({
              ...m,
              memberCode: fam.memberCode,
              familyId: fam.familyId,
              firmName: fam.firmName,
            });
          }
        }
        setSearchedMembers(allIndividualMembers);
      } catch {
        // Ignore
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [memberSearch]);

  const handleOpenIssue = () => {
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

    // Check age eligibility notice
    if (!mem.is18PlusMale) {
      setEligibilityNotice(`Notice: Member is ${mem.age} yrs (${mem.gender}). Subscription receipts are strictly for 18+ adult males.`);
    } else {
      setEligibilityNotice(null);
    }
  };

  const handleSelectReceiptType = (typeId: string) => {
    setSelectedReceiptTypeId(typeId);
    const rt = receiptTypes.find((t) => t.id === typeId);
    if (rt) {
      setReceiptAmount(Number(rt.defaultAmount));
    }
  };

  const handleGenerateReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) {
      setError('Please select an eligible member.');
      return;
    }

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
    if (!window.confirm(`Are you sure you want to delete receipt ${receipt.receiptNumber} (${receipt.memberName})?`)) return;

    try {
      await api.delete(`/v1/receipts/${receipt.id}`);
      fetchReceipts();
    } catch (err: any) {
      setError(err.message || 'Failed to delete receipt.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <ReceiptIcon className="h-6 w-6 text-brand-terracotta" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Receipt Management</h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Generate and manage A4 printed vouchers with QR verification (Yuvak Mandal & Samaj)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleOpenIssue} className="btn-primary">
            <Plus className="h-4 w-4" />
            <span>Issue New Receipt</span>
          </button>
        </div>
      </div>

      {/* Error Alert Display */}
      {error && (
        <div className="flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="card-premium flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Receipt # (e.g. R000001), Member Name, Code, Family ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:border-brand-orange focus:outline-none focus:ring-1 focus:ring-brand-orange dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedTypeId}
            onChange={(e) => setSelectedTypeId(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white py-2 px-3 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="">All Receipt Types</option>
            {receiptTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Receipts Table */}
      <div className="card-premium overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Receipt No.</th>
                <th className="px-4 py-3">Member Details</th>
                <th className="px-4 py-3">Family ID</th>
                <th className="px-4 py-3">Receipt Type</th>
                <th className="px-4 py-3 font-bold">Amount</th>
                <th className="px-4 py-3">Date & Time</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading && receipts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </td>
                </tr>
              ) : receipts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No receipts generated yet. Click "Issue New Receipt" above.
                  </td>
                </tr>
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
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                      ₹ {Number(r.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(r.generatedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right space-x-1">
                      <button
                        onClick={() => setVoucherModalReceipt(r)}
                        className="btn-secondary py-1 px-2.5 text-xs"
                        title="View / Print A4 Voucher"
                      >
                        <Printer className="h-3.5 w-3.5 text-brand-terracotta" />
                        <span>Print</span>
                      </button>
                      <button
                        onClick={() => handleDeleteReceipt(r)}
                        className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-slate-800 transition"
                        title="Delete Receipt"
                      >
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

      {/* Issue Receipt Modal */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ReceiptIcon className="h-5 w-5 text-brand-terracotta" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Issue Subscription Receipt</h2>
              </div>
              <button onClick={() => setShowIssueModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {eligibilityNotice && (
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                <span>{eligibilityNotice}</span>
              </div>
            )}

            <form onSubmit={handleGenerateReceipt} className="mt-4 space-y-4">
              {/* Member Auto-suggest input */}
              <div className="relative">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Search & Select Member (18+ Adult Male) *
                </label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Type name, member code (M001), mobile..."
                    value={memberSearch}
                    onChange={(e) => {
                      setMemberSearch(e.target.value);
                      setSelectedMember(null);
                    }}
                    className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-4 text-sm focus:border-brand-orange focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>

                {searchedMembers.length > 0 && (
                  <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-800 dark:bg-slate-900">
                    {searchedMembers.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => handleSelectMember(m)}
                        className="flex items-center justify-between p-2 rounded hover:bg-brand-sand/30 dark:hover:bg-slate-800 cursor-pointer text-xs"
                      >
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{m.name}</p>
                          <p className="text-[11px] text-slate-500">
                            {m.memberCode} • {m.gender} • {m.age} yrs • {m.firmName}
                          </p>
                        </div>
                        {m.is18PlusMale ? (
                          <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            Eligible
                          </span>
                        ) : (
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                            Ineligible
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedMember && (
                <div className="rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <p className="font-bold text-slate-900 dark:text-white">{selectedMember.name}</p>
                  <p className="mt-0.5 text-slate-500">
                    Family: <span className="font-mono">{selectedMember.memberCode}</span> ({selectedMember.familyId}) • Firm: {selectedMember.firmName}
                  </p>
                </div>
              )}

              {/* Receipt Type Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Receipt Type *
                </label>
                <select
                  required
                  value={selectedReceiptTypeId}
                  onChange={(e) => handleSelectReceiptType(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-sm focus:border-brand-orange focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                >
                  {receiptTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (Default ₹ {t.defaultAmount})
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount (Editable per PRD Section 10) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Receipt Amount (₹) *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={receiptAmount}
                  onChange={(e) => setReceiptAmount(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-sm font-bold focus:border-brand-orange focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting || !selectedMember} className="btn-primary text-xs">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Issue & Print Receipt</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* A4 Printable Receipt Voucher Modal */}
      {voucherModalReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 print:p-0">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-8 shadow-2xl text-slate-900 border border-slate-200 print:shadow-none print:border-none print:p-0 print:m-0">
            {/* Action Bar (hidden in print) */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-6 print:hidden">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">A4 Receipt Voucher Preview</span>
              <div className="flex items-center gap-2">
                <button onClick={() => window.print()} className="btn-primary text-xs py-1.5 px-3">
                  <Printer className="h-4 w-4" />
                  <span>Print Receipt</span>
                </button>
                <button onClick={() => setVoucherModalReceipt(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* A4 Voucher Content */}
            <div className="border-2 border-brand-espresso/40 p-6 rounded-xl relative space-y-6">
              {/* Samaj Header */}
              <div className="text-center border-b-2 border-brand-terracotta pb-4">
                <div className="flex items-center justify-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-brand-terracotta text-white flex items-center justify-center font-bold text-sm">
                    UB
                  </div>
                  <h1 className="text-2xl font-black tracking-tight text-brand-espresso">UMA BHAVAN</h1>
                </div>
                <p className="text-xs font-semibold text-slate-600 mt-1 uppercase tracking-wider">
                  Community Management Platform • Anand, Gujarat (388001)
                </p>
                <p className="text-[11px] text-slate-500">Phone: +91 2692 250000</p>
                <div className="mt-2 inline-block rounded-full bg-brand-orange/20 px-3 py-0.5 text-xs font-bold text-brand-espresso uppercase">
                  {voucherModalReceipt.receiptTypeName} Subscription Receipt
                </div>
              </div>

              {/* Receipt Meta Details */}
              <div className="grid grid-cols-2 text-xs gap-y-2">
                <div>
                  <span className="font-semibold text-slate-500">Receipt No:</span>{' '}
                  <span className="font-mono font-bold text-brand-terracotta text-sm">{voucherModalReceipt.receiptNumber}</span>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-slate-500">Date:</span>{' '}
                  <span className="font-semibold">{new Date(voucherModalReceipt.generatedAt).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500">Member Code:</span>{' '}
                  <span className="font-mono font-bold">{voucherModalReceipt.memberCode}</span>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-slate-500">Family ID:</span>{' '}
                  <span className="font-mono font-semibold">{voucherModalReceipt.familyId}</span>
                </div>
              </div>

              {/* Core Table */}
              <div className="border border-slate-300 rounded-lg overflow-hidden text-xs">
                <div className="grid grid-cols-3 bg-slate-100 p-2 font-bold text-slate-700">
                  <span className="col-span-2">Description</span>
                  <span className="text-right">Amount (₹)</span>
                </div>
                <div className="p-3 space-y-2">
                  <div className="flex justify-between font-semibold">
                    <span>
                      Received with thanks from <strong className="text-slate-900">{voucherModalReceipt.memberName}</strong> ({voucherModalReceipt.firmName})
                    </span>
                    <span className="font-mono font-bold text-sm">
                      ₹ {Number(voucherModalReceipt.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <p className="text-slate-500 text-[11px]">
                    Subscription contribution toward <strong>{voucherModalReceipt.receiptTypeName}</strong> activities and welfare.
                  </p>
                </div>
              </div>

              {/* Amount In Words */}
              <div className="rounded bg-brand-sand/20 p-2.5 text-xs font-semibold text-brand-espresso border border-brand-sand">
                Amount in words: <span className="italic">{voucherModalReceipt.amountInWords}</span>
              </div>

              {/* Signatures and QR Code */}
              <div className="grid grid-cols-3 items-end pt-6 text-xs">
                <div className="text-center space-y-1">
                  <div className="h-10 border-b border-dashed border-slate-400 mx-4" />
                  <p className="text-[10px] font-semibold text-slate-500">Authorized Signatory</p>
                </div>

                <div className="flex flex-col items-center justify-center text-center">
                  <div className="h-16 w-16 border border-slate-300 p-1 rounded bg-white shadow-sm flex items-center justify-center">
                    <QrCode className="h-14 w-14 text-slate-800" />
                  </div>
                  <span className="text-[9px] text-slate-400 mt-1 font-mono">Verify Online</span>
                </div>

                <div className="text-center space-y-1">
                  <div className="h-10 border-b border-dashed border-slate-400 mx-4" />
                  <p className="text-[10px] font-semibold text-slate-500">Samaj Seal & Stamp</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
