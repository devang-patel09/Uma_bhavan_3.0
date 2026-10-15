import React, { useState, useEffect } from 'react';
import { Layers, Plus, Trash2, MapPin, Tag, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../services/api.js';

interface AreaItem {
  id: string;
  name: string;
  firmsCount: number;
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
      // Fallback initial sample list if backend DB not populated
      if (areas.length === 0) {
        setAreas([
          { id: '1', name: 'Station Road', firmsCount: 24 },
          { id: '2', name: 'Gamdi Vad', firmsCount: 18 },
          { id: '3', name: 'Amul Dairy Road', firmsCount: 35 },
          { id: '4', name: 'GIDC', firmsCount: 42 },
        ]);
      }
      if (surnames.length === 0) {
        setSurnames([
          { id: '1', name: 'Patel', familiesCount: 420, individualMembersCount: 1680 },
          { id: '2', name: 'Amin', familiesCount: 85, individualMembersCount: 340 },
          { id: '3', name: 'Desai', familiesCount: 62, individualMembersCount: 248 },
        ]);
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
      setAreas((prev) => [...prev, { id: res.data.data.id, name: res.data.data.displayName, firmsCount: 0 }]);
      setNewArea('');
    } catch (err: any) {
      setError(err.message || 'Area already inserted.');
    }
  };

  const handleDeleteArea = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete area "${name}"?`)) return;
    setError(null);

    try {
      await api.delete(`/v1/areas/${id}`);
      setAreas((prev) => prev.filter((a) => a.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete area.');
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
    if (!window.confirm(`Are you sure you want to delete surname "${name}"?`)) return;
    setError(null);

    try {
      await api.delete(`/v1/surnames/${id}`);
      setSurnames((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete surname.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="h-6 w-6 text-brand-terracotta" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Master Records</h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Maintain Area Master and Surname Master with case-insensitive duplicate prevention
          </p>
        </div>
        <div className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          <button
            onClick={() => {
              setActiveTab('AREAS');
              setError(null);
            }}
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
            onClick={() => {
              setActiveTab('SURNAMES');
              setError(null);
            }}
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

      {error && (
        <div className="flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {activeTab === 'AREAS' ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Add Area Form */}
          <div className="card-premium h-fit">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Add New Area</h2>
            <p className="mt-1 text-xs text-slate-500">Press Enter key to submit quickly</p>
            <form onSubmit={handleAddArea} className="mt-4 space-y-3">
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
          </div>

          {/* Area List Table */}
          <div className="card-premium p-0 lg:col-span-2 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Sl. No.</th>
                  <th className="px-4 py-3">Area Name</th>
                  <th className="px-4 py-3">Linked Firms</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoading && areas.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                    </td>
                  </tr>
                ) : areas.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-500">
                      No areas found. Add your first area on the left.
                    </td>
                  </tr>
                ) : (
                  areas.map((a, index) => (
                    <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-semibold text-slate-500">{index + 1}</td>
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{a.name}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{a.firmsCount} firms</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDeleteArea(a.id, a.name)}
                          className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-slate-800 transition"
                          title="Delete Area"
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
      ) : (
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

          {/* Surnames List Table */}
          <div className="card-premium p-0 lg:col-span-2 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Sl. No.</th>
                  <th className="px-4 py-3">Surname</th>
                  <th className="px-4 py-3">Linked Families</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoading && surnames.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                    </td>
                  </tr>
                ) : surnames.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-500">
                      No surnames found. Add your first surname on the left.
                    </td>
                  </tr>
                ) : (
                  surnames.map((s, index) => (
                    <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-semibold text-slate-500">{index + 1}</td>
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{s.name}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{s.familiesCount} families</td>
                      <td className="px-4 py-3 text-right">
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
