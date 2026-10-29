import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Plus,
  Search,
  GitMerge,
  Eye,
  Trash2,
  AlertCircle,
  Loader2,
  X,
  UserPlus,
  ShieldAlert,
  Printer,
  Edit2,
  Building2,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { api } from '../services/api.js';

const BLOOD_GROUP_LABELS: Record<string, string> = {
  A_POSITIVE: 'A+', A_NEGATIVE: 'A-',
  B_POSITIVE: 'B+', B_NEGATIVE: 'B-',
  AB_POSITIVE: 'AB+', AB_NEGATIVE: 'AB-',
  O_POSITIVE: 'O+', O_NEGATIVE: 'O-',
  UNKNOWN: '—',
};

interface IndividualMember {
  id: string;
  name: string;
  dob: string;
  age: number;
  gender: 'MALE' | 'FEMALE';
  mobile: string;
  bloodGroup: string;
  maritalStatus: 'MARRIED' | 'UNMARRIED';
  parentalSurname?: string;
  parentalSurnameId?: string;
  is18PlusMale: boolean;
  eligibleReceipts: string[];
}

interface FamilyRecord {
  id: string;
  memberCode: string;
  memberType: 'PERMANENT' | 'NOMINAL';
  familyId: string;
  familyHeadName: string;
  surnameId: string;
  surname: string;
  firmId: string;
  firmCode: string;
  firmName: string;
  firmType?: 'PERMANENT' | 'NOMINAL';
  homeAddress: string;
  male18PlusCount: number;
  totalMembers: number;
  members: IndividualMember[];
}

interface FirmOption {
  id: string;
  firmCode: string;
  firmName: string;
  firmType: 'PERMANENT' | 'NOMINAL';
  familyHeadName?: string;
}

interface FamilyOption {
  id: string;
  memberCode: string;
  familyHeadName: string;
}

interface MasterOption { id: string; displayName?: string; name?: string; }

// Migration flow types
type MigrateFlow = 'EXISTING_FIRM' | 'NEW_FIRM' | null;

// Sub-area helper
interface SubAreaOption { id: string; name: string; }
interface AreaOption { id: string; name: string; subAreas: SubAreaOption[]; }

const inputCls = 'mt-1 w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-sm text-slate-800 focus:border-brand-orange focus:outline-none focus:ring-1 focus:ring-brand-orange dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';
const labelCls = 'block text-xs font-semibold text-slate-700 dark:text-slate-300';

export const Members: React.FC = () => {
  const [families, setFamilies] = useState<FamilyRecord[]>([]);
  const [surnames, setSurnames] = useState<MasterOption[]>([]);
  const [firms, setFirms] = useState<FirmOption[]>([]);
  const [areas, setAreas] = useState<AreaOption[]>([]);

  const [filterType, setFilterType] = useState<'ALL' | 'PERMANENT' | 'NOMINAL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showAddFamilyModal, setShowAddFamilyModal] = useState(false);
  const [viewingFamily, setViewingFamily] = useState<FamilyRecord | null>(null);
  const [migratingFamily, setMigratingFamily] = useState<FamilyRecord | null>(null);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [editingMember, setEditingMember] = useState<IndividualMember | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add Family form
  const [familyId, setFamilyId] = useState('');
  const [familyHeadName, setFamilyHeadName] = useState('');
  const [surnameId, setSurnameId] = useState('');
  const [firmId, setFirmId] = useState('');
  const [homeAddress, setHomeAddress] = useState('');

  // Derived memberType from selected firm
  const selectedFirmType = firms.find((f) => f.id === firmId)?.firmType ?? 'PERMANENT';

  // Individual member add form
  const [newMemName, setNewMemName] = useState('');
  const [newMemDob, setNewMemDob] = useState('2000-01-01');
  const [newMemGender, setNewMemGender] = useState<'MALE' | 'FEMALE'>('MALE');
  const [newMemMobile, setNewMemMobile] = useState('');
  const [newMemBloodGroup, setNewMemBloodGroup] = useState('UNKNOWN');
  const [newMemMaritalStatus, setNewMemMaritalStatus] = useState<'MARRIED' | 'UNMARRIED'>('UNMARRIED');
  const [newMemParentalSurnameId, setNewMemParentalSurnameId] = useState('');

  // Individual member edit form
  const [editMemBloodGroup, setEditMemBloodGroup] = useState('UNKNOWN');
  const [editMemMobile, setEditMemMobile] = useState('');
  const [editMemMaritalStatus, setEditMemMaritalStatus] = useState<'MARRIED' | 'UNMARRIED'>('UNMARRIED');
  const [editMemParentalSurnameId, setEditMemParentalSurnameId] = useState('');

  // Migration state
  const [migrateFlow, setMigrateFlow] = useState<MigrateFlow>(null);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  // Flow 1: Migrate to Existing Firm
  const [destFirmId, setDestFirmId] = useState('');
  const [destFamilies, setDestFamilies] = useState<FamilyOption[]>([]);
  const [destFamilyId, setDestFamilyId] = useState('');
  // Flow 2: Create New Firm
  const [newFirmName, setNewFirmName] = useState('');
  const [newFirmType, setNewFirmType] = useState<'PERMANENT' | 'NOMINAL'>('PERMANENT');
  const [newFirmAreaId, setNewFirmAreaId] = useState('');
  const [newFirmSubAreaId, setNewFirmSubAreaId] = useState('');
  const [newFirmPincode, setNewFirmPincode] = useState('388001');
  const [newFirmAddress, setNewFirmAddress] = useState('');
  const [newFirmHeadMemberId, setNewFirmHeadMemberId] = useState('');
  const [newFamilyId, setNewFamilyId] = useState('');
  const [newFamilyHeadName, setNewFamilyHeadName] = useState('');
  const [newHomeAddress, setNewHomeAddress] = useState('');

  const currentNewFirmSubAreas = areas.find((a) => a.id === newFirmAreaId)?.subAreas ?? [];

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterType !== 'ALL') params.memberType = filterType;
      if (searchTerm) params.search = searchTerm;

      const [famRes, surRes, firmsRes, areasRes] = await Promise.all([
        api.get('/v1/members', { params }),
        api.get('/v1/surnames'),
        api.get('/v1/firms'),
        api.get('/v1/areas'),
      ]);

      setFamilies(famRes.data.data.records ?? []);
      setSurnames(surRes.data.data ?? []);
      const rawFirms = firmsRes.data.data.firms ?? firmsRes.data.data ?? [];
      setFirms(rawFirms.map((f: any) => ({
        id: f.id,
        firmCode: f.firmCode,
        firmName: f.firmName,
        firmType: f.firmType ?? 'PERMANENT',
        familyHeadName: f.familyHeadName,
      })));
      setAreas((areasRes.data.data ?? []).map((a: any) => ({
        id: a.id,
        name: a.name ?? a.displayName,
        subAreas: (a.subAreas ?? []).map((s: any) => ({ id: s.id, name: s.name ?? s.displayName })),
      })));
    } catch {
      // retain existing
    } finally {
      setIsLoading(false);
    }
  }, [filterType, searchTerm]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openAddFamily = () => {
    setFamilyId(`FAM-${Math.floor(1000 + Math.random() * 9000)}`);
    setFamilyHeadName('');
    setSurnameId(surnames[0]?.id || '');
    setFirmId(firms[0]?.id || '');
    setHomeAddress('');
    setError(null);
    setShowAddFamilyModal(true);
  };

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post('/v1/members', {
        memberType: selectedFirmType,
        familyId,
        familyHeadName,
        surnameId,
        firmId,
        homeAddress,
        members: [],
      });
      setShowAddFamilyModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to create family.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAddMember = () => {
    setNewMemName('');
    setNewMemDob('2000-01-01');
    setNewMemGender('MALE');
    setNewMemMobile('');
    setNewMemBloodGroup('UNKNOWN');
    setNewMemMaritalStatus('UNMARRIED');
    setNewMemParentalSurnameId('');
    setError(null);
    setShowAddMemberModal(true);
  };

  const handleAddIndividualMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingFamily) return;
    setError(null);
    setIsSubmitting(true);

    const payload = {
      name: newMemName,
      dob: newMemDob,
      gender: newMemGender,
      mobile: newMemMobile,
      bloodGroup: newMemBloodGroup,
      maritalStatus: newMemMaritalStatus,
      parentalSurnameId: newMemParentalSurnameId || null,
      allowDuplicate: false,
    };

    try {
      await api.post(`/v1/members/${viewingFamily.id}/individuals`, payload);
      setShowAddMemberModal(false);
      const res = await api.get(`/v1/members/${viewingFamily.id}`);
      setViewingFamily(res.data.data);
      fetchData();
    } catch (err: any) {
      if (err.message?.includes('Duplicate detected')) {
        if (window.confirm(`${err.message}\n\nAdd anyway?`)) {
          await api.post(`/v1/members/${viewingFamily.id}/individuals`, { ...payload, allowDuplicate: true });
          setShowAddMemberModal(false);
          const res = await api.get(`/v1/members/${viewingFamily.id}`);
          setViewingFamily(res.data.data);
          fetchData();
        }
      } else {
        setError(err.message || 'Failed to add member.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditMember = (m: IndividualMember) => {
    setEditingMember(m);
    setEditMemBloodGroup(m.bloodGroup);
    setEditMemMobile(m.mobile);
    setEditMemMaritalStatus(m.maritalStatus);
    setEditMemParentalSurnameId(m.parentalSurnameId || '');
    setError(null);
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingFamily || !editingMember) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await api.patch(`/v1/members/${viewingFamily.id}/individuals/${editingMember.id}`, {
        bloodGroup: editMemBloodGroup,
        mobile: editMemMobile,
        maritalStatus: editMemMaritalStatus,
        parentalSurnameId: editMemParentalSurnameId || null,
      });
      setEditingMember(null);
      const res = await api.get(`/v1/members/${viewingFamily.id}`);
      setViewingFamily(res.data.data);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to update member.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteIndividual = async (id: string, name: string) => {
    if (!viewingFamily) return;
    if (!window.confirm(`Remove "${name}" from this family?`)) return;
    try {
      await api.delete(`/v1/members/${viewingFamily.id}/individuals/${id}`);
      const res = await api.get(`/v1/members/${viewingFamily.id}`);
      setViewingFamily(res.data.data);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to remove member.');
    }
  };

  // Load families for selected dest firm
  const loadDestFamilies = async (fId: string) => {
    if (!fId) { setDestFamilies([]); setDestFamilyId(''); return; }
    try {
      const res = await api.get('/v1/members', { params: { firmId: fId } });
      const recs: FamilyOption[] = (res.data.data.records ?? []).map((r: any) => ({
        id: r.id,
        memberCode: r.memberCode,
        familyHeadName: r.familyHeadName,
      }));
      setDestFamilies(recs);
      setDestFamilyId(recs[0]?.id || '');
    } catch {
      setDestFamilies([]);
    }
  };

  const openMigration = (fam: FamilyRecord) => {
    setMigratingFamily(fam);
    setMigrateFlow(null);
    setSelectedMemberIds([]);
    setDestFirmId('');
    setDestFamilies([]);
    setDestFamilyId('');
    setNewFirmName('');
    setNewFirmType(fam.firmType ?? 'PERMANENT');
    setNewFirmAreaId(areas[0]?.id || '');
    setNewFirmSubAreaId('');
    setNewFirmPincode('388001');
    setNewFirmAddress('');
    setNewFirmHeadMemberId('');
    setNewFamilyId(`FAM-${Math.floor(1000 + Math.random() * 9000)}`);
    setNewFamilyHeadName(fam.familyHeadName);
    setNewHomeAddress(fam.homeAddress);
    setError(null);
  };

  const handleMigrateToExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!migratingFamily) return;
    if (selectedMemberIds.length === 0) { setError('Select at least one member.'); return; }
    if (!destFamilyId) { setError('Select a destination family.'); return; }
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post(`/v1/members/${migratingFamily.id}/migrate`, {
        migrationType: 'EXISTING_FIRM',
        targetFamilyRecordId: destFamilyId,
        migratingMemberIds: selectedMemberIds,
      });
      alert('Migration completed successfully!');
      setMigratingFamily(null);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Migration failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMigrateToNewFirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!migratingFamily) return;
    if (selectedMemberIds.length === 0) { setError('Select at least one member.'); return; }
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post(`/v1/members/${migratingFamily.id}/migrate`, {
        migrationType: 'NEW_FIRM',
        migratingMemberIds: selectedMemberIds,
        // top-level destination family fields (flat, per server schema)
        destinationFamilyId: newFamilyId,
        destinationFamilyHeadName: newFamilyHeadName,
        destinationHomeAddress: newHomeAddress,
        newFirm: {
          firmName: newFirmName,
          firmType: newFirmType,
          familyHeadName: newFamilyHeadName,
          areaId: newFirmAreaId,
          subAreaId: newFirmSubAreaId || null,
          pincode: newFirmPincode,
          address: newFirmAddress,
        },
      });
      alert('Migration with new firm completed successfully!');
      setMigratingFamily(null);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Migration failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteFamily = async (fam: FamilyRecord) => {
    if (!window.confirm(`Delete family ${fam.memberCode} (${fam.familyHeadName})?`)) return;
    try {
      await api.delete(`/v1/members/${fam.id}`);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete family.');
    }
  };

  const handlePrintFamily = () => window.print();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center no-print">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-brand-orange" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Member Master</h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Permanent (M001…) &amp; Nominal (N001…) family records with Blood Group, Parental Surname, and Migration
          </p>
        </div>
        <button onClick={openAddFamily} className="btn-primary">
          <Plus className="h-4 w-4" />
          <span>Add Family</span>
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-200 no-print">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Filters */}
      <div className="card-premium flex flex-col gap-4 no-print">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
            {(['ALL', 'PERMANENT', 'NOMINAL'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  filterType === t
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                }`}
              >
                {t === 'ALL' ? 'All Families' : t === 'PERMANENT' ? 'Permanent (M…)' : 'Nominal (N…)'}
              </button>
            ))}
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Member Code, Head Name, Family ID, Mobile…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-4 text-sm placeholder-slate-400 focus:border-brand-orange focus:outline-none focus:ring-1 focus:ring-brand-orange dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
      </div>

      {/* Table */}
      <div className="card-premium overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Family ID</th>
                <th className="px-4 py-3">Family Head</th>
                <th className="px-4 py-3">Firm</th>
                <th className="px-4 py-3 text-center">Members</th>
                <th className="px-4 py-3 text-center">18+ Males</th>
                <th className="px-4 py-3 text-right no-print">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading && families.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-slate-400"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
              ) : families.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-slate-500">No family records found.</td></tr>
              ) : (
                families.map((fam) => (
                  <tr key={fam.id} className="transition hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-mono font-bold text-brand-terracotta">{fam.memberCode}</td>
                    <td className="px-4 py-3">
                      <span className={fam.memberType === 'PERMANENT' ? 'badge-permanent' : 'badge-nominal'}>
                        {fam.memberType}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">{fam.familyId}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{fam.familyHeadName}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 max-w-[180px] truncate">{fam.firmName} ({fam.firmCode})</td>
                    <td className="px-4 py-3 text-center font-semibold">{fam.totalMembers || fam.members?.length || 0}</td>
                    <td className="px-4 py-3 text-center font-bold text-brand-terracotta">{fam.male18PlusCount}</td>
                    <td className="px-4 py-3 text-right space-x-1 no-print">
                      <button onClick={() => setViewingFamily(fam)} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition" title="Manage Family">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button onClick={() => openMigration(fam)} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-brand-terracotta transition" title="Migrate Family">
                        <GitMerge className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDeleteFamily(fam)} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition" title="Delete Family">
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

      {/* ── Add Family Modal ── */}
      {showAddFamilyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800 mb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Add New Family Record</h2>
              <button onClick={() => setShowAddFamilyModal(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>

            {error && <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-700"><AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /><span>{error}</span></div>}

            <form onSubmit={handleCreateFamily} className="space-y-4">
              {/* Firm – drives memberType */}
              <div>
                <label className={labelCls}>Associated Firm * <span className="font-normal text-slate-400">(Classification is inherited from Firm Type)</span></label>
                <select required value={firmId} onChange={(e) => setFirmId(e.target.value)} className={inputCls}>
                  <option value="">Select Firm</option>
                  {firms.map((f) => (
                    <option key={f.id} value={f.id}>{f.firmCode} – {f.firmName} ({f.firmType})</option>
                  ))}
                </select>
                {firmId && (
                  <p className="mt-1 text-xs text-slate-500">
                    Family will be classified as{' '}
                    <span className={selectedFirmType === 'PERMANENT' ? 'text-emerald-600 font-bold' : 'text-blue-600 font-bold'}>
                      {selectedFirmType}
                    </span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Family ID (Unique) *</label>
                  <input type="text" required value={familyId} onChange={(e) => setFamilyId(e.target.value)} className={inputCls} placeholder="e.g. FAM-1001" />
                </div>
                <div>
                  <label className={labelCls}>Family Head Name *</label>
                  <input type="text" required value={familyHeadName} onChange={(e) => setFamilyHeadName(e.target.value)} className={inputCls} placeholder="e.g. Patel Ramanlal" />
                </div>
              </div>

              <div>
                <label className={labelCls}>Surname *</label>
                <select required value={surnameId} onChange={(e) => setSurnameId(e.target.value)} className={inputCls}>
                  <option value="">Select Surname</option>
                  {surnames.map((s) => <option key={s.id} value={s.id}>{s.displayName || s.name}</option>)}
                </select>
              </div>

              <div>
                <label className={labelCls}>Home Address *</label>
                <textarea required rows={2} value={homeAddress} onChange={(e) => setHomeAddress(e.target.value)} className={inputCls} placeholder="Residential address…" />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddFamilyModal(false)} className="btn-secondary text-xs">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="btn-primary text-xs">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Create Family</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── View & Manage Family Modal ── */}
      {viewingFamily && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            {/* Print header */}
            <div className="print-only mb-4">
              <p className="text-xs text-gray-400">Uma Bhavan Community Management System</p>
              <h2 className="text-lg font-bold text-black">{viewingFamily.memberCode} — {viewingFamily.familyHeadName}</h2>
              <p className="text-xs">{viewingFamily.firmName} · {viewingFamily.memberType} · Printed {new Date().toLocaleDateString('en-IN')}</p>
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800 no-print">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-bold text-brand-terracotta">{viewingFamily.memberCode}</span>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">{viewingFamily.familyHeadName}</h2>
                  <p className="text-xs text-slate-500">{viewingFamily.familyId} · {viewingFamily.memberType} · {viewingFamily.firmName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handlePrintFamily} className="btn-secondary text-xs py-1.5 px-3">
                  <Printer className="h-3.5 w-3.5" /><span>Print</span>
                </button>
                <button onClick={openAddMember} className="btn-primary text-xs py-1.5 px-3">
                  <UserPlus className="h-3.5 w-3.5" /><span>Add Member</span>
                </button>
                <button onClick={() => setViewingFamily(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {error && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-700 no-print">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /><span>{error}</span>
              </div>
            )}

            {/* Individual members table */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-950">
                  <tr>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">DOB / Age</th>
                    <th className="px-3 py-2">Gender</th>
                    <th className="px-3 py-2">Blood Group</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Parental Surname</th>
                    <th className="px-3 py-2">Mobile</th>
                    <th className="px-3 py-2 text-right no-print">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(viewingFamily.members ?? []).map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="px-3 py-2.5 font-semibold text-slate-900 dark:text-white">{m.name}</td>
                      <td className="px-3 py-2.5">
                        <span className="text-slate-500">{m.dob?.split('T')[0]}</span>
                        <span className="ml-1.5 font-bold text-brand-terracotta">({m.age} yrs)</span>
                      </td>
                      <td className="px-3 py-2.5">{m.gender}</td>
                      <td className="px-3 py-2.5 font-semibold">
                        {BLOOD_GROUP_LABELS[m.bloodGroup] ?? m.bloodGroup}
                      </td>
                      <td className="px-3 py-2.5">{m.maritalStatus}</td>
                      <td className="px-3 py-2.5 text-slate-500">{m.parentalSurname || '—'}</td>
                      <td className="px-3 py-2.5 text-slate-600">{m.mobile}</td>
                      <td className="px-3 py-2.5 text-right space-x-1 no-print">
                        <button onClick={() => openEditMember(m)} className="text-slate-400 hover:text-brand-terracotta p-1" title="Edit Member">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleDeleteIndividual(m.id, m.name)} className="text-slate-400 hover:text-red-600 p-1" title="Remove Member">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Individual Member Modal ── */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800 mb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Add Individual Member</h2>
              <button onClick={() => setShowAddMemberModal(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>

            {error && <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-700"><AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /><span>{error}</span></div>}

            <form onSubmit={handleAddIndividualMember} className="space-y-3 text-xs">
              <div>
                <label className={labelCls}>Full Name *</label>
                <input type="text" required value={newMemName} onChange={(e) => setNewMemName(e.target.value)} className={inputCls} placeholder="e.g. Patel Rajesh" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Date of Birth *</label>
                  <input type="date" required value={newMemDob} onChange={(e) => setNewMemDob(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Gender *</label>
                  <select value={newMemGender} onChange={(e) => setNewMemGender(e.target.value as 'MALE' | 'FEMALE')} className={inputCls}>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Mobile *</label>
                  <input type="tel" required value={newMemMobile} onChange={(e) => setNewMemMobile(e.target.value)} className={inputCls} placeholder="10 digits" />
                </div>
                <div>
                  <label className={labelCls}>Blood Group</label>
                  <select value={newMemBloodGroup} onChange={(e) => setNewMemBloodGroup(e.target.value)} className={inputCls}>
                    {Object.entries(BLOOD_GROUP_LABELS).map(([k, v]) => <option key={k} value={k}>{v === '—' ? 'Unknown' : v}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Marital Status</label>
                  <select value={newMemMaritalStatus} onChange={(e) => setNewMemMaritalStatus(e.target.value as any)} className={inputCls}>
                    <option value="UNMARRIED">Unmarried</option>
                    <option value="MARRIED">Married</option>
                  </select>
                </div>
                {newMemGender === 'FEMALE' && (
                  <div>
                    <label className={labelCls}>Parental Surname</label>
                    <select value={newMemParentalSurnameId} onChange={(e) => setNewMemParentalSurnameId(e.target.value)} className={inputCls}>
                      <option value="">None</option>
                      {surnames.map((s) => <option key={s.id} value={s.id}>{s.displayName || s.name}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddMemberModal(false)} className="btn-secondary text-xs">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="btn-primary text-xs">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Add to Family</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Individual Member Modal ── */}
      {editingMember && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800 mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Edit Member</h2>
                <p className="text-xs text-slate-500">{editingMember.name}</p>
              </div>
              <button onClick={() => setEditingMember(null)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>

            {error && <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-700"><AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /><span>{error}</span></div>}

            <form onSubmit={handleUpdateMember} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Blood Group</label>
                  <select value={editMemBloodGroup} onChange={(e) => setEditMemBloodGroup(e.target.value)} className={inputCls}>
                    {Object.entries(BLOOD_GROUP_LABELS).map(([k, v]) => <option key={k} value={k}>{v === '—' ? 'Unknown' : v}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Mobile</label>
                  <input type="tel" value={editMemMobile} onChange={(e) => setEditMemMobile(e.target.value)} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Marital Status</label>
                  <select value={editMemMaritalStatus} onChange={(e) => setEditMemMaritalStatus(e.target.value as any)} className={inputCls}>
                    <option value="UNMARRIED">Unmarried</option>
                    <option value="MARRIED">Married</option>
                  </select>
                </div>
                {editingMember.gender === 'FEMALE' && (
                  <div>
                    <label className={labelCls}>Parental Surname</label>
                    <select value={editMemParentalSurnameId} onChange={(e) => setEditMemParentalSurnameId(e.target.value)} className={inputCls}>
                      <option value="">None</option>
                      {surnames.map((s) => <option key={s.id} value={s.id}>{s.displayName || s.name}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditingMember(null)} className="btn-secondary text-xs">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="btn-primary text-xs">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Save Changes</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Migration Modal ── */}
      {migratingFamily && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <GitMerge className="h-5 w-5 text-brand-terracotta" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Family Migration — {migratingFamily.memberCode}</h2>
              </div>
              <button onClick={() => setMigratingFamily(null)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>

            <div className="rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 flex items-start gap-2 mb-4">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Migration is transactional. Members will retain their classification ({migratingFamily.memberType}) unless moved to a firm of a different type.</span>
            </div>

            {error && <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-700"><AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /><span>{error}</span></div>}

            {/* Step 1 — choose members */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Step 1: Select Members to Migrate ({selectedMemberIds.length} selected)
              </label>
              <div className="max-h-36 overflow-y-auto rounded-lg border border-slate-200 p-2 space-y-1 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                {(migratingFamily.members ?? []).map((m) => {
                  const isSelected = selectedMemberIds.includes(m.id);
                  return (
                    <label key={m.id} className="flex items-center justify-between p-1.5 rounded hover:bg-white dark:hover:bg-slate-800 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedMemberIds([...selectedMemberIds, m.id]);
                            else setSelectedMemberIds(selectedMemberIds.filter((id) => id !== m.id));
                          }}
                          className="text-brand-terracotta"
                        />
                        <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">{m.name}</span>
                      </div>
                      <span className="text-xs text-slate-400">({m.gender}, {m.age} yrs)</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Step 2 — choose flow */}
            {migrateFlow === null && (
              <div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Step 2: Select Migration Type</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setMigrateFlow('EXISTING_FIRM')}
                    className="flex flex-col items-start gap-1 rounded-xl border-2 border-slate-200 bg-white p-4 text-left hover:border-brand-orange hover:bg-orange-50 transition dark:border-slate-700 dark:bg-slate-800"
                  >
                    <ArrowRight className="h-5 w-5 text-brand-terracotta" />
                    <span className="font-bold text-sm text-slate-900 dark:text-white">Migrate to Existing Firm</span>
                    <span className="text-xs text-slate-500">Move selected members to a family in an existing firm</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMigrateFlow('NEW_FIRM')}
                    className="flex flex-col items-start gap-1 rounded-xl border-2 border-slate-200 bg-white p-4 text-left hover:border-brand-orange hover:bg-orange-50 transition dark:border-slate-700 dark:bg-slate-800"
                  >
                    <Building2 className="h-5 w-5 text-indigo-600" />
                    <span className="font-bold text-sm text-slate-900 dark:text-white">Create New Firm</span>
                    <span className="text-xs text-slate-500">Register a brand new firm and create a family within it</span>
                  </button>
                </div>
              </div>
            )}

            {/* Flow 1: Existing Firm */}
            {migrateFlow === 'EXISTING_FIRM' && (
              <form onSubmit={handleMigrateToExisting} className="space-y-3 text-xs">
                <div className="flex items-center gap-2 mb-2">
                  <button type="button" onClick={() => setMigrateFlow(null)} className="text-xs text-slate-400 hover:text-slate-700">← Back</button>
                  <span className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-1.5">
                    <ArrowRight className="h-4 w-4 text-brand-terracotta" /> Migrate to Existing Firm
                  </span>
                </div>
                <div>
                  <label className={labelCls}>Destination Firm *</label>
                  <select required value={destFirmId} onChange={(e) => { setDestFirmId(e.target.value); loadDestFamilies(e.target.value); }} className={inputCls}>
                    <option value="">Select Firm</option>
                    {firms.filter((f) => f.id !== migratingFamily.firmId).map((f) => (
                      <option key={f.id} value={f.id}>{f.firmCode} – {f.firmName} ({f.firmType})</option>
                    ))}
                  </select>
                </div>
                {destFamilies.length > 0 && (
                  <div>
                    <label className={labelCls}>Destination Family *</label>
                    <select required value={destFamilyId} onChange={(e) => setDestFamilyId(e.target.value)} className={inputCls}>
                      <option value="">Select Family</option>
                      {destFamilies.map((fam) => (
                        <option key={fam.id} value={fam.id}>{fam.memberCode} – {fam.familyHeadName}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setMigratingFamily(null)} className="btn-secondary text-xs">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="btn-primary text-xs">
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <span><CheckCircle2 className="inline h-3.5 w-3.5 mr-1" />Execute Migration</span>}
                  </button>
                </div>
              </form>
            )}

            {/* Flow 2: New Firm */}
            {migrateFlow === 'NEW_FIRM' && (
              <form onSubmit={handleMigrateToNewFirm} className="space-y-3 text-xs">
                <div className="flex items-center gap-2 mb-2">
                  <button type="button" onClick={() => setMigrateFlow(null)} className="text-xs text-slate-400 hover:text-slate-700">← Back</button>
                  <span className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-indigo-600" /> Create New Firm &amp; Family
                  </span>
                </div>

                {/* Firm Type */}
                <div>
                  <label className={labelCls}>New Firm Type *</label>
                  <div className="mt-1 flex gap-3">
                    {(['PERMANENT', 'NOMINAL'] as const).map((t) => (
                      <label key={t} className={`flex flex-1 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition ${newFirmType === t ? (t === 'PERMANENT' ? 'border-emerald-400 bg-emerald-50 text-emerald-800' : 'border-blue-400 bg-blue-50 text-blue-800') : 'border-slate-200 text-slate-500'}`}>
                        <input type="radio" name="newFirmType" value={t} checked={newFirmType === t} onChange={() => setNewFirmType(t)} className="sr-only" />
                        {t === 'PERMANENT' ? '🏠 Permanent' : '📋 Nominal'}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={labelCls}>New Firm Name *</label>
                  <input type="text" required value={newFirmName} onChange={(e) => setNewFirmName(e.target.value)} className={inputCls} placeholder="e.g. Shree Umiya Enterprise" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Main Area *</label>
                    <select required value={newFirmAreaId} onChange={(e) => { setNewFirmAreaId(e.target.value); setNewFirmSubAreaId(''); }} className={inputCls}>
                      <option value="">Select Area</option>
                      {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                  {currentNewFirmSubAreas.length > 0 && (
                    <div>
                      <label className={labelCls}>Sub-Area</label>
                      <select value={newFirmSubAreaId} onChange={(e) => setNewFirmSubAreaId(e.target.value)} className={inputCls}>
                        <option value="">None</option>
                        {currentNewFirmSubAreas.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Pincode *</label>
                    <input type="text" required value={newFirmPincode} onChange={(e) => setNewFirmPincode(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Family Head from migrated members</label>
                    <select value={newFirmHeadMemberId} onChange={(e) => {
                      setNewFirmHeadMemberId(e.target.value);
                      const m = migratingFamily.members?.find((m) => m.id === e.target.value);
                      if (m) setNewFamilyHeadName(m.name);
                    }} className={inputCls}>
                      <option value="">— Auto / specify below —</option>
                      {selectedMemberIds.map((id) => {
                        const m = migratingFamily.members?.find((mem) => mem.id === id);
                        return m ? <option key={id} value={id}>{m.name}</option> : null;
                      })}
                    </select>
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Firm Address *</label>
                  <textarea required rows={2} value={newFirmAddress} onChange={(e) => setNewFirmAddress(e.target.value)} className={inputCls} placeholder="Firm address…" />
                </div>

                <div className="border-t border-slate-200 dark:border-slate-700 pt-3 mt-2">
                  <p className="text-xs font-semibold text-slate-600 mb-2 dark:text-slate-300">New Family Details</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Family ID *</label>
                      <input type="text" required value={newFamilyId} onChange={(e) => setNewFamilyId(e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Family Head Name *</label>
                      <input type="text" required value={newFamilyHeadName} onChange={(e) => setNewFamilyHeadName(e.target.value)} className={inputCls} />
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className={labelCls}>Home Address *</label>
                    <textarea required rows={2} value={newHomeAddress} onChange={(e) => setNewHomeAddress(e.target.value)} className={inputCls} />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setMigratingFamily(null)} className="btn-secondary text-xs">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="btn-primary text-xs">
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <span><CheckCircle2 className="inline h-3.5 w-3.5 mr-1" />Create Firm &amp; Migrate</span>}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
