import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Plus,
  Search,
  Printer,
  Edit2,
  Trash2,
  Eye,
  AlertCircle,
  Loader2,
  X,
  MapPin,
  User,
} from 'lucide-react';
import { api } from '../services/api.js';

interface SubAreaItem {
  id: string;
  name: string;
}

interface AreaItem {
  id: string;
  name: string;
  subAreas: SubAreaItem[];
}

interface FirmItem {
  id: string;
  firmCode: string;
  firmName: string;
  firmType: 'PERMANENT' | 'NOMINAL';
  familyHeadName: string | null;
  areaId: string;
  areaName: string;
  subAreaId: string | null;
  subAreaName: string | null;
  pincode: string;
  address: string;
  familiesCount: number;
}

const inputCls =
  'mt-1 w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-sm text-slate-800 focus:border-brand-orange focus:outline-none focus:ring-1 focus:ring-brand-orange dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

const labelCls = 'block text-xs font-semibold text-slate-700 dark:text-slate-300';

// ─────────────────────────────────────────────────────────────────────────────
// FirmFormFields is defined at MODULE LEVEL (outside Firms) so React always
// sees the same component type on re-render and never unmounts the inputs.
// Defining it inside Firms causes focus loss after every keystroke.
// ─────────────────────────────────────────────────────────────────────────────
interface FirmFormFieldsProps {
  firmType: 'PERMANENT' | 'NOMINAL';
  setFirmType: (v: 'PERMANENT' | 'NOMINAL') => void;
  firmName: string;
  setFirmName: (v: string) => void;
  familyHeadName: string;
  setFamilyHeadName: (v: string) => void;
  areaId: string;
  setAreaId: (v: string) => void;
  subAreaId: string;
  setSubAreaId: (v: string) => void;
  pincode: string;
  setPincode: (v: string) => void;
  address: string;
  setAddress: (v: string) => void;
  areas: AreaItem[];
  currentSubAreas: SubAreaItem[];
}

const FirmFormFields: React.FC<FirmFormFieldsProps> = ({
  firmType, setFirmType,
  firmName, setFirmName,
  familyHeadName, setFamilyHeadName,
  areaId, setAreaId,
  subAreaId, setSubAreaId,
  pincode, setPincode,
  address, setAddress,
  areas, currentSubAreas,
}) => (
  <>
    {/* Firm Type */}
    <div>
      <label className={labelCls}>Firm Type *</label>
      <div className="mt-1.5 flex gap-3">
        {(['PERMANENT', 'NOMINAL'] as const).map((t) => (
          <label
            key={t}
            className={`flex flex-1 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
              firmType === t
                ? t === 'PERMANENT'
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'border-blue-400 bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
                : 'border-slate-200 text-slate-500 dark:border-slate-700'
            }`}
          >
            <input
              type="radio"
              name="firmType"
              value={t}
              checked={firmType === t}
              onChange={() => setFirmType(t)}
              className="sr-only"
            />
            {t === 'PERMANENT' ? '🏠 Permanent' : '📋 Nominal'}
          </label>
        ))}
      </div>
    </div>

    {/* Firm Name */}
    <div>
      <label className={labelCls}>Firm Name *</label>
      <input
        type="text"
        required
        value={firmName}
        onChange={(e) => setFirmName(e.target.value)}
        placeholder="e.g. Shree Umiya Traders"
        className={inputCls}
      />
    </div>

    {/* Family Head Name */}
    <div>
      <label className={labelCls}>Family Head Name</label>
      <input
        type="text"
        value={familyHeadName}
        onChange={(e) => setFamilyHeadName(e.target.value)}
        placeholder="e.g. Ramesh Patel"
        className={inputCls}
      />
    </div>

    {/* Area */}
    <div>
      <label className={labelCls}>Main Area *</label>
      <select
        required
        value={areaId}
        onChange={(e) => setAreaId(e.target.value)}
        className={inputCls}
      >
        <option value="">Select Main Area</option>
        {areas.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>
    </div>

    {/* Sub Area */}
    {currentSubAreas.length > 0 && (
      <div>
        <label className={labelCls}>Sub-Area</label>
        <select
          value={subAreaId}
          onChange={(e) => setSubAreaId(e.target.value)}
          className={inputCls}
        >
          <option value="">None / Not Applicable</option>
          {currentSubAreas.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
    )}

    {/* Pincode */}
    <div>
      <label className={labelCls}>Pincode *</label>
      <input
        type="text"
        required
        value={pincode}
        onChange={(e) => setPincode(e.target.value)}
        className={inputCls}
      />
    </div>

    {/* Address */}
    <div>
      <label className={labelCls}>Firm Address *</label>
      <textarea
        required
        rows={3}
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="Detailed business address…"
        className={inputCls}
      />
    </div>
  </>
);

export const Firms: React.FC = () => {
  const [firms, setFirms] = useState<FirmItem[]>([]);
  const [areas, setAreas] = useState<AreaItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAreaId, setSelectedAreaId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingFirm, setEditingFirm] = useState<FirmItem | null>(null);
  const [viewingFirm, setViewingFirm] = useState<FirmItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [firmName, setFirmName] = useState('');
  const [firmType, setFirmType] = useState<'PERMANENT' | 'NOMINAL'>('PERMANENT');
  const [familyHeadName, setFamilyHeadName] = useState('');
  const [areaId, setAreaId] = useState('');
  const [subAreaId, setSubAreaId] = useState('');
  const [pincode, setPincode] = useState('388001');
  const [address, setAddress] = useState('');

  // Derive sub-areas from selected main area
  const currentSubAreas = areas.find((a) => a.id === areaId)?.subAreas ?? [];

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = {};
      if (searchTerm) params.search = searchTerm;
      if (selectedAreaId) params.areaId = selectedAreaId;

      const [firmsRes, areasRes] = await Promise.all([
        api.get('/v1/firms', { params }),
        api.get('/v1/areas'),
      ]);

      setFirms(firmsRes.data.data.firms ?? firmsRes.data.data ?? []);
      setAreas(
        (areasRes.data.data ?? []).map((a: any) => ({
          id: a.id,
          name: a.name ?? a.displayName,
          subAreas: (a.subAreas ?? []).map((s: any) => ({ id: s.id, name: s.name ?? s.displayName })),
        }))
      );
    } catch {
      // keep existing data on error
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, selectedAreaId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset sub-area when main area changes
  useEffect(() => {
    setSubAreaId('');
  }, [areaId]);

  const openCreate = () => {
    setFirmName('');
    setFirmType('PERMANENT');
    setFamilyHeadName('');
    setAreaId(areas[0]?.id || '');
    setSubAreaId('');
    setPincode('388001');
    setAddress('');
    setError(null);
    setShowAddModal(true);
  };

  const openEdit = (firm: FirmItem) => {
    setEditingFirm(firm);
    setFirmName(firm.firmName);
    setFirmType(firm.firmType);
    setFamilyHeadName(firm.familyHeadName || '');
    setAreaId(firm.areaId);
    setSubAreaId(firm.subAreaId || '');
    setPincode(firm.pincode);
    setAddress(firm.address);
    setError(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post('/v1/firms', {
        firmName,
        firmType,
        familyHeadName: familyHeadName.trim() || null,
        areaId,
        subAreaId: subAreaId || null,
        pincode,
        address,
      });
      setShowAddModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to create firm.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFirm) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await api.patch(`/v1/firms/${editingFirm.id}`, {
        firmName,
        firmType,
        familyHeadName: familyHeadName.trim() || null,
        areaId,
        subAreaId: subAreaId || null,
        pincode,
        address,
      });
      setEditingFirm(null);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to update firm.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (firm: FirmItem) => {
    if (!window.confirm(`Delete Firm ${firm.firmCode} (${firm.firmName})?`)) return;
    setError(null);
    try {
      await api.delete(`/v1/firms/${firm.id}`);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete firm.');
    }
  };

  const handlePrint = (firm: FirmItem) => {
    setViewingFirm(firm);
    setTimeout(() => window.print(), 300);
  };

  // Shared props for the top-level FirmFormFields component
  const formFieldProps: FirmFormFieldsProps = {
    firmType, setFirmType,
    firmName, setFirmName,
    familyHeadName, setFamilyHeadName,
    areaId, setAreaId,
    subAreaId, setSubAreaId,
    pincode, setPincode,
    address, setAddress,
    areas, currentSubAreas,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center no-print">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-brand-terracotta" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Firm Master</h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Manage business entities — Permanent &amp; Nominal
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => window.print()} className="btn-secondary">
            <Printer className="h-4 w-4" />
            <span>Print List</span>
          </button>
          <button onClick={openCreate} className="btn-primary">
            <Plus className="h-4 w-4" />
            <span>Add New Firm</span>
          </button>
        </div>
      </div>

      {/* Print-only header */}
      <div className="print-only">
        <h2 className="text-xl font-bold text-black">Uma Bhavan – Firm Master</h2>
        <p className="text-xs text-gray-500">Printed on {new Date().toLocaleDateString('en-IN')}</p>
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
            placeholder="Search by Code, Name, Address…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-4 text-sm placeholder-slate-400 focus:border-brand-orange focus:outline-none focus:ring-1 focus:ring-brand-orange dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
        <select
          value={selectedAreaId}
          onChange={(e) => setSelectedAreaId(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white py-2 px-3 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          <option value="">All Areas</option>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="card-premium overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Firm Name</th>
                <th className="px-4 py-3">Head</th>
                <th className="px-4 py-3">Area / Sub-Area</th>
                <th className="px-4 py-3">Address</th>
                <th className="px-4 py-3 text-center">Families</th>
                <th className="px-4 py-3 text-right no-print">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading && firms.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </td>
                </tr>
              ) : firms.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    No firms match your criteria.
                  </td>
                </tr>
              ) : (
                firms.map((f) => (
                  <tr key={f.id} className="transition hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-mono font-bold text-brand-terracotta">{f.firmCode}</td>
                    <td className="px-4 py-3">
                      <span className={f.firmType === 'PERMANENT' ? 'badge-permanent' : 'badge-nominal'}>
                        {f.firmType === 'PERMANENT' ? 'Permanent' : 'Nominal'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{f.firmName}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 text-xs">
                      {f.familyHeadName || <span className="text-slate-400 italic">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 text-xs">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-slate-400" />
                        <span>{f.areaName}</span>
                      </div>
                      {f.subAreaName && (
                        <div className="ml-4 text-slate-400">{f.subAreaName}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate text-xs">{f.address}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {f.familiesCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-1 no-print">
                      <button
                        onClick={() => setViewingFirm(f)}
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 transition"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openEdit(f)}
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-brand-terracotta dark:hover:bg-slate-800 transition"
                        title="Edit Firm"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handlePrint(f)}
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-800 transition"
                        title="Print Firm Details"
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(f)}
                        className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-slate-800 transition"
                        title="Delete Firm"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Firm Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800 mb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Add New Firm</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-700 dark:text-red-200">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <FirmFormFields {...formFieldProps} />
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary text-xs">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="btn-primary text-xs">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Create Firm</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Firm Modal */}
      {editingFirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-brand-terracotta">{editingFirm.firmCode}</span>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Edit Firm</h2>
              </div>
              <button onClick={() => setEditingFirm(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-700 dark:text-red-200">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleUpdate} className="space-y-4">
              <FirmFormFields {...formFieldProps} />
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditingFirm(null)} className="btn-secondary text-xs">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="btn-primary text-xs">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Save Changes</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Firm Details Modal */}
      {viewingFirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 no-print">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            {/* Print-only header */}
            <div className="print-only border-b border-slate-200 pb-3 mb-4">
              <p className="text-xs text-gray-400">Uma Bhavan Community Management System</p>
              <h2 className="text-lg font-bold text-black">Firm Details — {viewingFirm.firmCode}</h2>
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800 no-print">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-brand-terracotta">{viewingFirm.firmCode}</span>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">{viewingFirm.firmName}</h2>
              </div>
              <button onClick={() => setViewingFirm(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase">Firm Type</span>
                <p className="mt-0.5">
                  <span className={viewingFirm.firmType === 'PERMANENT' ? 'badge-permanent' : 'badge-nominal'}>
                    {viewingFirm.firmType}
                  </span>
                </p>
              </div>

              {viewingFirm.familyHeadName && (
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase">Family Head</span>
                  <p className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    {viewingFirm.familyHeadName}
                  </p>
                </div>
              )}

              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase">Area</span>
                <p className="font-medium text-slate-800 dark:text-slate-200">{viewingFirm.areaName}</p>
              </div>

              {viewingFirm.subAreaName && (
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase">Sub-Area</span>
                  <p className="font-medium text-slate-800 dark:text-slate-200">{viewingFirm.subAreaName}</p>
                </div>
              )}

              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase">Pincode</span>
                <p className="font-medium text-slate-800 dark:text-slate-200">{viewingFirm.pincode}</p>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase">Address</span>
                <p className="font-medium text-slate-800 dark:text-slate-200">{viewingFirm.address}</p>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase">Associated Families</span>
                <p className="font-medium text-slate-800 dark:text-slate-200">{viewingFirm.familiesCount} record(s)</p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 no-print">
              <button onClick={() => window.print()} className="btn-secondary text-xs">
                <Printer className="h-3.5 w-3.5" />
                Print
              </button>
              <button onClick={() => setViewingFirm(null)} className="btn-secondary text-xs">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
