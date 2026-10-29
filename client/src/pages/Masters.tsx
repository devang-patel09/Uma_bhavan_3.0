import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  MapPin,
  Tag,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  Network,
  Printer,
} from 'lucide-react';
import { api } from '../services/api.js';

interface SubAreaItem {
  id: string;
  areaId: string;
  name: string;
  nameNormalized: string;
  firmsCount: number;
}

interface AreaItem {
  id: string;
  name: string;
  firmsCount: number;
  subAreasCount: number;
  subAreas: SubAreaItem[];
}

interface SurnameItem {
  id: string;
  name: string;
  familiesCount: number;
  individualMembersCount: number;
}

export const Masters: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'AREAS' | 'SURNAMES'>('AREAS');
  const [areas, setAreas] = useState<AreaItem[]>([]);
  const [surnames, setSurnames] = useState<SurnameItem[]>([]);
  const [newArea, setNewArea] = useState('');
  const [newSurname, setNewSurname] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sub-area state
  const [expandedAreaId, setExpandedAreaId] = useState<string | null>(null);
  const [newSubAreaName, setNewSubAreaName] = useState('');
  const [subAreaLoading, setSubAreaLoading] = useState<string | null>(null); // areaId being loaded

  const fetchMasters = async () => {
    try {
      setIsLoading(true);
      const [areasRes, surnamesRes] = await Promise.all([
        api.get('/v1/areas'),
        api.get('/v1/surnames'),
      ]);
      setAreas(areasRes.data.data);
      setSurnames(surnamesRes.data.data);
    } catch {
      if (areas.length === 0) {
        setAreas([]);
      }
      if (surnames.length === 0) {
        setSurnames([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMasters();
  }, []);

  const handleAddArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newArea.trim()) return;
    setError(null);
    try {
      const res = await api.post('/v1/areas', { name: newArea.trim() });
      const d = res.data.data;
      setAreas((prev) => [
        ...prev,
        { id: d.id, name: d.displayName, firmsCount: 0, subAreasCount: 0, subAreas: [] },
      ]);
      setNewArea('');
    } catch (err: any) {
      setError(err.message || 'Failed to add area.');
    }
  };

  const handleDeleteArea = async (id: string, name: string) => {
    if (!window.confirm(`Delete area "${name}"? This cannot be undone.`)) return;
    setError(null);
    try {
      await api.delete(`/v1/areas/${id}`);
      setAreas((prev) => prev.filter((a) => a.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete area.');
    }
  };

  const toggleAreaExpand = async (areaId: string) => {
    if (expandedAreaId === areaId) {
      setExpandedAreaId(null);
      return;
    }
    setExpandedAreaId(areaId);
    setNewSubAreaName('');
    // Fetch latest sub-areas for this area
    setSubAreaLoading(areaId);
    try {
      const res = await api.get(`/v1/areas/${areaId}/sub-areas`);
      setAreas((prev) =>
        prev.map((a) =>
          a.id === areaId
            ? { ...a, subAreas: res.data.data, subAreasCount: res.data.data.length }
            : a
        )
      );
    } catch {
      // silently keep existing sub-areas
    } finally {
      setSubAreaLoading(null);
    }
  };

  const handleAddSubArea = async (e: React.FormEvent, areaId: string) => {
    e.preventDefault();
    if (!newSubAreaName.trim()) return;
    setError(null);
    try {
      const res = await api.post(`/v1/areas/${areaId}/sub-areas`, { name: newSubAreaName.trim() });
      const d = res.data.data;
      setAreas((prev) =>
        prev.map((a) =>
          a.id === areaId
            ? {
                ...a,
                subAreasCount: a.subAreasCount + 1,
                subAreas: [
                  ...a.subAreas,
                  { id: d.id, areaId, name: d.name, nameNormalized: d.nameNormalized, firmsCount: 0 },
                ],
              }
            : a
        )
      );
      setNewSubAreaName('');
    } catch (err: any) {
      setError(err.message || 'Failed to add sub-area.');
    }
  };

  const handleDeleteSubArea = async (subAreaId: string, subAreaName: string, parentAreaId: string) => {
    if (!window.confirm(`Delete sub-area "${subAreaName}"?`)) return;
    setError(null);
    try {
      await api.delete(`/v1/areas/sub-areas/${subAreaId}`);
      setAreas((prev) =>
        prev.map((a) =>
          a.id === parentAreaId
            ? {
                ...a,
                subAreasCount: a.subAreasCount - 1,
                subAreas: a.subAreas.filter((s) => s.id !== subAreaId),
              }
            : a
        )
      );
    } catch (err: any) {
      setError(err.message || 'Failed to delete sub-area.');
    }
  };

  const handleAddSurname = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSurname.trim()) return;
    setError(null);
    try {
      const res = await api.post('/v1/surnames', { name: newSurname.trim() });
      setSurnames((prev) => [
        ...prev,
        { id: res.data.data.id, name: res.data.data.displayName, familiesCount: 0, individualMembersCount: 0 },
      ]);
      setNewSurname('');
    } catch (err: any) {
      setError(err.message || 'Surname already inserted.');
    }
  };

  const handleDeleteSurname = async (id: string, name: string) => {
    if (!window.confirm(`Delete surname "${name}"?`)) return;
    setError(null);
    try {
      await api.delete(`/v1/surnames/${id}`);
      setSurnames((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete surname.');
    }
  };

  const handlePrintSurnames = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="h-6 w-6 text-brand-terracotta" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Master Records
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Manage Area Master (with Sub-Areas) and Surname Master
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'SURNAMES' && (
            <button
              onClick={handlePrintSurnames}
              className="btn-secondary no-print flex items-center gap-1.5 text-xs"
              title="Print Surnames List"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print</span>
            </button>
          )}
          <div className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
            <button
              onClick={() => { setActiveTab('AREAS'); setError(null); }}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-xs font-semibold transition ${
                activeTab === 'AREAS'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <MapPin className="h-3.5 w-3.5" />
              <span>Area Master ({areas.length})</span>
            </button>
            <button
              onClick={() => { setActiveTab('SURNAMES'); setError(null); }}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-xs font-semibold transition ${
                activeTab === 'SURNAMES'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Tag className="h-3.5 w-3.5" />
              <span>Surname Master ({surnames.length})</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* ── AREAS TAB ── */}
      {activeTab === 'AREAS' ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Add Area Form */}
          <div className="card-premium h-fit space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Add New Main Area</h2>
              <p className="mt-0.5 text-xs text-slate-500">Press Enter to submit quickly</p>
            </div>
            <form onSubmit={handleAddArea} className="space-y-3">
              <input
                type="text"
                required
                value={newArea}
                onChange={(e) => setNewArea(e.target.value)}
                placeholder="e.g. Station Road, Anand"
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-brand-orange focus:outline-none focus:ring-1 focus:ring-brand-orange dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
              <button type="submit" className="btn-primary w-full">
                <Plus className="h-4 w-4" />
                <span>Save Area</span>
              </button>
            </form>

            <div className="border-t border-slate-200 pt-3 dark:border-slate-800">
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <Network className="h-3.5 w-3.5" />
                Click on a row to expand and manage its Sub-Areas
              </p>
            </div>
          </div>

          {/* Area List */}
          <div className="card-premium p-0 lg:col-span-2 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 w-8"></th>
                  <th className="px-4 py-3">Sl.</th>
                  <th className="px-4 py-3">Area Name</th>
                  <th className="px-4 py-3">Firms</th>
                  <th className="px-4 py-3">Sub-Areas</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoading && areas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                    </td>
                  </tr>
                ) : areas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      No areas found. Add your first area on the left.
                    </td>
                  </tr>
                ) : (
                  areas.map((a, index) => (
                    <React.Fragment key={a.id}>
                      {/* Area row */}
                      <tr
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 cursor-pointer"
                        onClick={() => toggleAreaExpand(a.id)}
                      >
                        <td className="px-3 py-3 text-slate-400">
                          {expandedAreaId === a.id ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-500">{index + 1}</td>
                        <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{a.name}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{a.firmsCount}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                            <Network className="h-3 w-3" />
                            {a.subAreasCount}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleDeleteArea(a.id, a.name)}
                            className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-slate-800 transition"
                            title="Delete Area"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>

                      {/* Sub-area expanded panel */}
                      {expandedAreaId === a.id && (
                        <tr>
                          <td colSpan={6} className="bg-slate-50/60 dark:bg-slate-900/40 px-0 py-0">
                            <div className="px-8 py-4 space-y-3 border-t border-slate-200 dark:border-slate-800">
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                                <Network className="h-3.5 w-3.5 text-indigo-500" />
                                Sub-Areas of {a.name}
                              </p>

                              {/* Loader */}
                              {subAreaLoading === a.id && (
                                <div className="flex items-center gap-2 text-xs text-slate-400 py-1">
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  Loading sub-areas…
                                </div>
                              )}

                              {/* Sub-area list */}
                              {subAreaLoading !== a.id && (
                                <>
                                  {a.subAreas.length === 0 ? (
                                    <p className="text-xs text-slate-400 italic">No sub-areas yet.</p>
                                  ) : (
                                    <div className="space-y-1.5">
                                      {a.subAreas.map((sa) => (
                                        <div
                                          key={sa.id}
                                          className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                                        >
                                          <div>
                                            <span className="text-xs font-semibold text-slate-800 dark:text-white">
                                              {sa.name}
                                            </span>
                                            <span className="ml-2 text-xs text-slate-400">
                                              {sa.firmsCount} firms
                                            </span>
                                          </div>
                                          <button
                                            onClick={() => handleDeleteSubArea(sa.id, sa.name, a.id)}
                                            className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-slate-700 transition"
                                            title="Delete Sub-Area"
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Add sub-area form */}
                                  <form
                                    onSubmit={(e) => handleAddSubArea(e, a.id)}
                                    className="flex items-center gap-2 pt-1"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <input
                                      type="text"
                                      required
                                      value={newSubAreaName}
                                      onChange={(e) => setNewSubAreaName(e.target.value)}
                                      placeholder="New sub-area name…"
                                      className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-brand-orange focus:outline-none focus:ring-1 focus:ring-brand-orange dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                                    />
                                    <button
                                      type="submit"
                                      className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition"
                                    >
                                      <Plus className="h-3.5 w-3.5" />
                                      Add
                                    </button>
                                  </form>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ── SURNAMES TAB ── */
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Add Surname Form */}
          <div className="card-premium h-fit">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Add New Surname</h2>
            <p className="mt-1 text-xs text-slate-500">Case-insensitive duplicate checking</p>
            <form onSubmit={handleAddSurname} className="mt-4 space-y-3">
              <input
                type="text"
                required
                value={newSurname}
                onChange={(e) => setNewSurname(e.target.value)}
                placeholder="e.g. Patel, Amin, Desai"
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-brand-orange focus:outline-none focus:ring-1 focus:ring-brand-orange dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
              <button type="submit" className="btn-primary w-full">
                <Plus className="h-4 w-4" />
                <span>Save Surname</span>
              </button>
            </form>
          </div>

          {/* Surnames List */}
          <div className="card-premium p-0 lg:col-span-2 overflow-hidden">
            {/* Print header – only shown when printing */}
            <div className="print-only p-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-black">Uma Bhavan – Surname Master</h2>
              <p className="text-xs text-gray-500">Printed on {new Date().toLocaleDateString('en-IN')}</p>
            </div>

            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Sl. No.</th>
                  <th className="px-4 py-3">Surname</th>
                  <th className="px-4 py-3">Families</th>
                  <th className="px-4 py-3">Members</th>
                  <th className="px-4 py-3 text-right no-print">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoading && surnames.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                    </td>
                  </tr>
                ) : surnames.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      No surnames found.
                    </td>
                  </tr>
                ) : (
                  surnames.map((s, index) => (
                    <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-semibold text-slate-500">{index + 1}</td>
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{s.name}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{s.familiesCount}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{s.individualMembersCount}</td>
                      <td className="px-4 py-3 text-right no-print">
                        <button
                          onClick={() => handleDeleteSurname(s.id, s.name)}
                          className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-slate-800 transition"
                          title="Delete Surname"
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
      )}
    </div>
  );
};
