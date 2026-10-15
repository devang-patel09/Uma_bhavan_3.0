import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { api } from '../services/api.js';

interface Area {
  id: string;
  name: string;
}

interface Firm {
  id: string;
  firmCode: string;
  firmName: string;
  areaId: string;
  areaName: string;
  pincode: string;
  address: string;
  familiesCount: number;
}

export const Firms: React.FC = () => {
  const [firms, setFirms] = useState<Firm[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAreaId, setSelectedAreaId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingFirm, setEditingFirm] = useState<Firm | null>(null);
  const [viewingFirm, setViewingFirm] = useState<Firm | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form input state
  const [firmName, setFirmName] = useState('');
  const [areaId, setAreaId] = useState('');
  const [pincode, setPincode] = useState('388001');
  const [address, setAddress] = useState('');

  const fetchFirms = async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = {};
      if (searchTerm) params.search = searchTerm;
      if (selectedAreaId) params.areaId = selectedAreaId;

      const [firmsRes, areasRes] = await Promise.all([
        api.get('/v1/firms', { params }),
        api.get('/v1/areas'),
      ]);

      setFirms(firmsRes.data.data.firms);
      setAreas(areasRes.data.data);
    } catch {
      // Fallback sample data if local DB not seeded
      if (firms.length === 0) {
        setFirms([
          { id: '1', firmCode: 'F001', firmName: 'Shree Umiya Krushi Kendra', areaId: '1', areaName: 'Station Road', pincode: '388001', address: 'Shop 12, APMC Market, Anand', familiesCount: 1 },
          { id: '2', firmCode: 'F002', firmName: 'Sardar Patel Hardware Stores', areaId: '2', areaName: 'Gamdi Vad', pincode: '388001', address: 'Opp. Tower, Gamdi Vad, Anand', familiesCount: 2 },
          { id: '3', firmCode: 'F003', firmName: 'Uma Bhavan Electricals', areaId: '3', areaName: 'Amul Dairy Road', pincode: '388001', address: '45 Amul Road, Anand', familiesCount: 0 },
        ]);
        setAreas([
          { id: '1', name: 'Station Road' },
          { id: '2', name: 'Gamdi Vad' },
          { id: '3', name: 'Amul Dairy Road' },
        ]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFirms();
  }, [searchTerm, selectedAreaId]);

  const handleOpenCreate = () => {
    setFirmName('');
    setAreaId(areas[0]?.id || '');
    setPincode('388001');
    setAddress('');
    setError(null);
    setShowAddModal(true);
  };

  const handleOpenEdit = (firm: Firm) => {
    setEditingFirm(firm);
    setFirmName(firm.firmName);
    setAreaId(firm.areaId);
    setPincode(firm.pincode);
    setAddress(firm.address);
    setError(null);
  };

  const handleCreateFirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await api.post('/v1/firms', {
        firmName,
        areaId,
        pincode,
        address,
      });

      setShowAddModal(false);
      fetchFirms();
    } catch (err: any) {
      setError(err.message || 'Failed to create firm.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateFirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFirm) return;
    setError(null);
    setIsSubmitting(true);

    try {
      await api.patch(`/v1/firms/${editingFirm.id}`, {
        firmName,
        areaId,
        pincode,
        address,
      });

      setEditingFirm(null);
      fetchFirms();
    } catch (err: any) {
      setError(err.message || 'Failed to update firm.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteFirm = async (firm: Firm) => {
    if (!window.confirm(`Are you sure you want to delete Firm ${firm.firmCode} (${firm.firmName})?`)) {
      return;
    }
    setError(null);

    try {
      await api.delete(`/v1/firms/${firm.id}`);
      fetchFirms();
    } catch (err: any) {
      setError(err.message || 'Failed to delete firm.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-brand-terracotta" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Firm Master</h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Manage business entities and firm registrations (F001 - F500)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => window.print()} className="btn-secondary">
            <Printer className="h-4 w-4" />
            <span>Print List</span>
          </button>
          <button onClick={handleOpenCreate} className="btn-primary">
            <Plus className="h-4 w-4" />
            <span>Add New Firm</span>
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
            placeholder="Search by Firm Code (e.g. F001), Name, Address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:border-brand-orange focus:outline-none focus:ring-1 focus:ring-brand-orange dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
        <div className="flex items-center gap-2">
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
      </div>

      {/* Firms Table */}
      <div className="card-premium overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Firm Code</th>
                <th className="px-4 py-3">Firm Name</th>
                <th className="px-4 py-3">Area</th>
                <th className="px-4 py-3">Pincode</th>
                <th className="px-4 py-3">Address</th>
                <th className="px-4 py-3 text-center">Families</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading && firms.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </td>
                </tr>
              ) : firms.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No firms match your search criteria.
                  </td>
                </tr>
              ) : (
                firms.map((f) => (
                  <tr key={f.id} className="transition hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-mono font-bold text-brand-terracotta">{f.firmCode}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{f.firmName}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{f.areaName}</td>
                    <td className="px-4 py-3 text-slate-500">{f.pincode}</td>
                    <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{f.address}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {f.familiesCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-1">
                      <button
                        onClick={() => setViewingFirm(f)}
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 transition"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(f)}
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-brand-terracotta dark:hover:bg-slate-800 transition"
                        title="Edit Firm"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteFirm(f)}
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
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Add New Firm</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateFirm} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Firm Code
                </label>
                <input
                  type="text"
                  disabled
                  value="Auto-generated (e.g. F001...)"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-100 py-2 px-3 text-xs font-mono text-slate-500 dark:border-slate-800 dark:bg-slate-950"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Firm Name *
                </label>
                <input
                  type="text"
                  required
                  value={firmName}
                  onChange={(e) => setFirmName(e.target.value)}
                  placeholder="e.g. Shree Umiya Traders"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-sm focus:border-brand-orange focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Area *
                </label>
                <select
                  required
                  value={areaId}
                  onChange={(e) => setAreaId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-sm focus:border-brand-orange focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="">Select Area</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Pincode *
                </label>
                <input
                  type="text"
                  required
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-sm focus:border-brand-orange focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Firm Address *
                </label>
                <textarea
                  required
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Detailed business address..."
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-sm focus:border-brand-orange focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary text-xs"
                >
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
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Edit Firm ({editingFirm.firmCode})
              </h2>
              <button onClick={() => setEditingFirm(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateFirm} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Firm Code (Non-editable)
                </label>
                <input
                  type="text"
                  disabled
                  value={editingFirm.firmCode}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-100 py-2 px-3 text-xs font-mono font-bold text-brand-terracotta dark:border-slate-800 dark:bg-slate-950"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Firm Name *
                </label>
                <input
                  type="text"
                  required
                  value={firmName}
                  onChange={(e) => setFirmName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-sm focus:border-brand-orange focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Area *
                </label>
                <select
                  required
                  value={areaId}
                  onChange={(e) => setAreaId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-sm focus:border-brand-orange focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                >
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Pincode *
                </label>
                <input
                  type="text"
                  required
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-sm focus:border-brand-orange focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Firm Address *
                </label>
                <textarea
                  required
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-sm focus:border-brand-orange focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingFirm(null)}
                  className="btn-secondary text-xs"
                >
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
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
                <span className="text-xs font-semibold text-slate-400">Area</span>
                <p className="font-medium text-slate-800 dark:text-slate-200">{viewingFirm.areaName}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400">Pincode</span>
                <p className="font-medium text-slate-800 dark:text-slate-200">{viewingFirm.pincode}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400">Business Address</span>
                <p className="font-medium text-slate-800 dark:text-slate-200">{viewingFirm.address}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400">Associated Families</span>
                <p className="font-medium text-slate-800 dark:text-slate-200">{viewingFirm.familiesCount} family record(s)</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
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
