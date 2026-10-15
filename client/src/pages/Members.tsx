import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { api } from '../services/api.js';

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
  homeAddress: string;
  male18PlusCount: number;
  totalMembers: number;
  members: IndividualMember[];
}

interface MasterOption {
  id: string;
  displayName?: string;
  name?: string;
  firmCode?: string;
  firmName?: string;
}

export const Members: React.FC = () => {
  const [families, setFamilies] = useState<FamilyRecord[]>([]);
  const [surnames, setSurnames] = useState<MasterOption[]>([]);
  const [firms, setFirms] = useState<MasterOption[]>([]);

  const [filterType, setFilterType] = useState<'ALL' | 'PERMANENT' | 'NOMINAL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal States
  const [showAddFamilyModal, setShowAddFamilyModal] = useState(false);
  const [viewingFamily, setViewingFamily] = useState<FamilyRecord | null>(null);
  const [migratingFamily, setMigratingFamily] = useState<FamilyRecord | null>(null);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State for Add Family
  const [memberType, setMemberType] = useState<'PERMANENT' | 'NOMINAL'>('PERMANENT');
  const [familyId, setFamilyId] = useState('');
  const [familyHeadName, setFamilyHeadName] = useState('');
  const [surnameId, setSurnameId] = useState('');
  const [firmId, setFirmId] = useState('');
  const [homeAddress, setHomeAddress] = useState('');

  // Form State for Adding Member
  const [newMemName, setNewMemName] = useState('');
  const [newMemDob, setNewMemDob] = useState('2000-01-01');
  const [newMemGender, setNewMemGender] = useState<'MALE' | 'FEMALE'>('MALE');
  const [newMemMobile, setNewMemMobile] = useState('');
  const [newMemBloodGroup, setNewMemBloodGroup] = useState('UNKNOWN');
  const [newMemMaritalStatus, setNewMemMaritalStatus] = useState<'MARRIED' | 'UNMARRIED'>('UNMARRIED');

  // Form State for Migration
  const [destFirmId, setDestFirmId] = useState('');
  const [destFamilyId, setDestFamilyId] = useState('');
  const [destHeadName, setDestHeadName] = useState('');
  const [destAddress, setDestAddress] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  const fetchFamilies = async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterType !== 'ALL') params.memberType = filterType;
      if (searchTerm) params.search = searchTerm;

      const [famRes, surRes, firmsRes] = await Promise.all([
        api.get('/v1/members', { params }),
        api.get('/v1/surnames'),
        api.get('/v1/firms'),
      ]);

      setFamilies(famRes.data.data.records);
      setSurnames(surRes.data.data);
      setFirms(firmsRes.data.data.firms);
    } catch {
      // Fallback sample data if local DB empty
      if (families.length === 0) {
        setFamilies([
          {
            id: '1',
            memberCode: 'M001',
            memberType: 'PERMANENT',
            familyId: 'FAM-1001',
            familyHeadName: 'Patel Kiritbhai Somabhai',
            surnameId: 'sur_1',
            surname: 'Patel',
            firmId: 'f_1',
            firmCode: 'F001',
            firmName: 'Shree Umiya Krushi Kendra',
            homeAddress: '12 Sardar Patel Society, Anand',
            male18PlusCount: 2,
            totalMembers: 4,
            members: [
              { id: 'm1', name: 'Patel Kiritbhai Somabhai', dob: '1972-04-12', age: 54, gender: 'MALE', mobile: '98250 12345', bloodGroup: 'B_POSITIVE', maritalStatus: 'MARRIED', is18PlusMale: true, eligibleReceipts: ['Samaj'] },
              { id: 'm2', name: 'Patel Gitaben Kiritbhai', dob: '1976-08-20', age: 50, gender: 'FEMALE', mobile: '98250 12345', bloodGroup: 'B_POSITIVE', maritalStatus: 'MARRIED', is18PlusMale: false, eligibleReceipts: [] },
              { id: 'm3', name: 'Patel Rajeshkumar Kiritbhai', dob: '2001-11-05', age: 24, gender: 'MALE', mobile: '98251 67890', bloodGroup: 'O_POSITIVE', maritalStatus: 'UNMARRIED', is18PlusMale: true, eligibleReceipts: ['Yuvak Mandal', 'Samaj'] },
            ],
          },
        ]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFamilies();
  }, [filterType, searchTerm]);

  const handleOpenAddFamily = () => {
    setMemberType('PERMANENT');
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
        memberType,
        familyId,
        familyHeadName,
        surnameId,
        firmId,
        homeAddress,
        members: [],
      });

      setShowAddFamilyModal(false);
      fetchFamilies();
    } catch (err: any) {
      setError(err.message || 'Failed to create family.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenAddMember = () => {
    setNewMemName('');
    setNewMemDob('2000-01-01');
    setNewMemGender('MALE');
    setNewMemMobile('');
    setNewMemBloodGroup('UNKNOWN');
    setNewMemMaritalStatus('UNMARRIED');
    setError(null);
    setShowAddMemberModal(true);
  };

  const handleAddIndividualMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingFamily) return;
    setError(null);
    setIsSubmitting(true);

    try {
      await api.post(`/v1/members/${viewingFamily.id}/individuals`, {
        name: newMemName,
        dob: newMemDob,
        gender: newMemGender,
        mobile: newMemMobile,
        bloodGroup: newMemBloodGroup,
        maritalStatus: newMemMaritalStatus,
        allowDuplicate: false,
      });

      setShowAddMemberModal(false);
      // Refresh family details
      const res = await api.get(`/v1/members/${viewingFamily.id}`);
      setViewingFamily(res.data.data);
      fetchFamilies();
    } catch (err: any) {
      if (err.message && err.message.includes('Duplicate detected')) {
        if (window.confirm(`${err.message}\n\nDo you want to add this member anyway?`)) {
          await api.post(`/v1/members/${viewingFamily.id}/individuals`, {
            name: newMemName,
            dob: newMemDob,
            gender: newMemGender,
            mobile: newMemMobile,
            bloodGroup: newMemBloodGroup,
            maritalStatus: newMemMaritalStatus,
            allowDuplicate: true,
          });
          setShowAddMemberModal(false);
          const res = await api.get(`/v1/members/${viewingFamily.id}`);
          setViewingFamily(res.data.data);
          fetchFamilies();
        }
      } else {
        setError(err.message || 'Failed to add member.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteIndividual = async (individualId: string, name: string) => {
    if (!viewingFamily) return;
    if (!window.confirm(`Delete individual member "${name}" from this family?`)) return;

    try {
      await api.delete(`/v1/members/${viewingFamily.id}/individuals/${individualId}`);
      const res = await api.get(`/v1/members/${viewingFamily.id}`);
      setViewingFamily(res.data.data);
      fetchFamilies();
    } catch (err: any) {
      setError(err.message || 'Failed to delete individual member.');
    }
  };

  const handleOpenMigration = (fam: FamilyRecord) => {
    setMigratingFamily(fam);
    setDestFirmId(firms[0]?.id || '');
    setDestFamilyId(`FAM-${Math.floor(1000 + Math.random() * 9000)}`);
    setDestHeadName(fam.familyHeadName);
    setDestAddress(fam.homeAddress);
    setSelectedMemberIds([]);
    setError(null);
  };

  const handleExecuteMigration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!migratingFamily) return;
    if (selectedMemberIds.length === 0) {
      setError('Please select at least one member to migrate.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await api.post(`/v1/members/${migratingFamily.id}/migrate`, {
        destinationFirmId: destFirmId,
        destinationFamilyId: destFamilyId,
        destinationFamilyHeadName: destHeadName,
        destinationHomeAddress: destAddress,
        migratingMemberIds: selectedMemberIds,
      });

      alert('Family migration completed successfully!');
      setMigratingFamily(null);
      fetchFamilies();
    } catch (err: any) {
      setError(err.message || 'Migration failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteFamily = async (fam: FamilyRecord) => {
    if (!window.confirm(`Delete entire family record ${fam.memberCode} (${fam.familyHeadName})?`)) return;

    try {
      await api.delete(`/v1/members/${fam.id}`);
      fetchFamilies();
    } catch (err: any) {
      setError(err.message || 'Failed to delete family.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-brand-orange" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Member Master</h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Permanent (M001...) & Nominal (N001...) family records, individual members, and splitting workflows
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleOpenAddFamily} className="btn-primary">
            <Plus className="h-4 w-4" />
            <span>Add Family</span>
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
      <div className="card-premium flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
            {(['ALL', 'PERMANENT', 'NOMINAL'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  filterType === t
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {t === 'ALL' ? 'All Families' : t === 'PERMANENT' ? 'Permanent (M...)' : 'Nominal (N...)'}
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Member Code (M001), Family Head Name, Family ID, Address, or Mobile..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:border-brand-orange focus:outline-none focus:ring-1 focus:ring-brand-orange dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
      </div>

      {/* Families List Table */}
      <div className="card-premium overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Member Code</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Family ID</th>
                <th className="px-4 py-3">Family Head</th>
                <th className="px-4 py-3">Firm</th>
                <th className="px-4 py-3 text-center">Members</th>
                <th className="px-4 py-3 text-center">18+ Males</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading && families.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </td>
                </tr>
              ) : families.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    No family records found. Click "Add Family" to create one.
                  </td>
                </tr>
              ) : (
                families.map((fam) => (
                  <tr key={fam.id} className="transition hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-mono font-bold text-brand-terracotta">{fam.memberCode}</td>
                    <td className="px-4 py-3">
                      <span className={fam.memberType === 'PERMANENT' ? 'badge-permanent' : 'badge-nominal'}>
                        {fam.memberType}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {fam.familyId}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                      {fam.familyHeadName}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 max-w-[200px] truncate">
                      {fam.firmName} ({fam.firmCode})
                    </td>
                    <td className="px-4 py-3 text-center font-semibold">{fam.totalMembers || fam.members?.length || 0}</td>
                    <td className="px-4 py-3 text-center font-bold text-brand-terracotta">{fam.male18PlusCount}</td>
                    <td className="px-4 py-3 text-right space-x-1">
                      <button
                        onClick={() => setViewingFamily(fam)}
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 transition"
                        title="Manage Family Members"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleOpenMigration(fam)}
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-brand-terracotta dark:hover:bg-slate-800 transition"
                        title="Migrate / Split Family"
                      >
                        <GitMerge className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteFamily(fam)}
                        className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-slate-800 transition"
                        title="Delete Family"
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

      {/* Add Family Modal */}
      {showAddFamilyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Add New Family Record</h2>
              <button onClick={() => setShowAddFamilyModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateFamily} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Member Type *
                </label>
                <div className="mt-1 flex gap-4">
                  <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                    <input
                      type="radio"
                      name="memberType"
                      checked={memberType === 'PERMANENT'}
                      onChange={() => setMemberType('PERMANENT')}
                      className="text-brand-terracotta"
                    />
                    <span>Permanent (M001...)</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                    <input
                      type="radio"
                      name="memberType"
                      checked={memberType === 'NOMINAL'}
                      onChange={() => setMemberType('NOMINAL')}
                      className="text-brand-terracotta"
                    />
                    <span>Nominal (N001...)</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Family ID (Unique) *
                  </label>
                  <input
                    type="text"
                    required
                    value={familyId}
                    onChange={(e) => setFamilyId(e.target.value)}
                    placeholder="e.g. FAM-1001"
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-sm focus:border-brand-orange focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Family Head Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={familyHeadName}
                    onChange={(e) => setFamilyHeadName(e.target.value)}
                    placeholder="e.g. Patel Ramanlal"
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-sm focus:border-brand-orange focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Surname *
                  </label>
                  <select
                    required
                    value={surnameId}
                    onChange={(e) => setSurnameId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-sm focus:border-brand-orange focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="">Select Surname</option>
                    {surnames.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.displayName || s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Associated Firm *
                  </label>
                  <select
                    required
                    value={firmId}
                    onChange={(e) => setFirmId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-sm focus:border-brand-orange focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="">Select Firm</option>
                    {firms.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.firmCode} - {f.firmName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Home Address *
                </label>
                <textarea
                  required
                  rows={2}
                  value={homeAddress}
                  onChange={(e) => setHomeAddress(e.target.value)}
                  placeholder="Residential address..."
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-sm focus:border-brand-orange focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddFamilyModal(false)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="btn-primary text-xs">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Create Family</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View & Manage Family Modal */}
      {viewingFamily && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-bold text-brand-terracotta">{viewingFamily.memberCode}</span>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">{viewingFamily.familyHeadName}</h2>
                  <p className="text-xs text-slate-500">
                    {viewingFamily.familyId} • {viewingFamily.memberType} • {viewingFamily.firmName}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleOpenAddMember} className="btn-primary text-xs py-1.5 px-3">
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>Add Member</span>
                </button>
                <button onClick={() => setViewingFamily(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Individual Members Table */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-950">
                  <tr>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">DOB / Age</th>
                    <th className="px-3 py-2">Gender</th>
                    <th className="px-3 py-2">Mobile</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">18+ Adult Male</th>
                    <th className="px-3 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {viewingFamily.members?.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="px-3 py-2.5 font-semibold text-slate-900 dark:text-white">{m.name}</td>
                      <td className="px-3 py-2.5">
                        <span className="text-slate-500">{m.dob.split('T')[0]}</span>
                        <span className="ml-1.5 font-bold text-brand-terracotta">({m.age} yrs)</span>
                      </td>
                      <td className="px-3 py-2.5">{m.gender}</td>
                      <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{m.mobile}</td>
                      <td className="px-3 py-2.5">{m.maritalStatus}</td>
                      <td className="px-3 py-2.5">
                        {m.is18PlusMale ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                            Yes (Eligible)
                          </span>
                        ) : (
                          <span className="text-slate-400">No</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <button
                          onClick={() => handleDeleteIndividual(m.id, m.name)}
                          className="text-red-500 hover:text-red-700 p-1"
                          title="Remove Member"
                        >
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

      {/* Add Individual Member Sub-Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Add Individual Member</h2>
              <button onClick={() => setShowAddMemberModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddIndividualMember} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newMemName}
                  onChange={(e) => setNewMemName(e.target.value)}
                  placeholder="e.g. Patel Rajeshkumar"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-sm focus:border-brand-orange focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">Date of Birth *</label>
                  <input
                    type="date"
                    required
                    value={newMemDob}
                    onChange={(e) => setNewMemDob(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-sm focus:border-brand-orange focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">Gender *</label>
                  <select
                    value={newMemGender}
                    onChange={(e) => setNewMemGender(e.target.value as 'MALE' | 'FEMALE')}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-sm focus:border-brand-orange focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    value={newMemMobile}
                    onChange={(e) => setNewMemMobile(e.target.value)}
                    placeholder="10 digits"
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-sm focus:border-brand-orange focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">Blood Group</label>
                  <select
                    value={newMemBloodGroup}
                    onChange={(e) => setNewMemBloodGroup(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-sm focus:border-brand-orange focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="UNKNOWN">Unknown</option>
                    <option value="A_POSITIVE">A+</option>
                    <option value="A_NEGATIVE">A-</option>
                    <option value="B_POSITIVE">B+</option>
                    <option value="B_NEGATIVE">B-</option>
                    <option value="AB_POSITIVE">AB+</option>
                    <option value="AB_NEGATIVE">AB-</option>
                    <option value="O_POSITIVE">O+</option>
                    <option value="O_NEGATIVE">O-</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">Marital Status</label>
                <select
                  value={newMemMaritalStatus}
                  onChange={(e) => setNewMemMaritalStatus(e.target.value as 'MARRIED' | 'UNMARRIED')}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-sm focus:border-brand-orange focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="UNMARRIED">Unmarried</option>
                  <option value="MARRIED">Married</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="btn-primary text-xs">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Add to Family</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Family Migration / Splitting Modal */}
      {migratingFamily && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <GitMerge className="h-5 w-5 text-brand-terracotta" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Family Migration ({migratingFamily.memberCode})
                </h2>
              </div>
              <button onClick={() => setMigratingFamily(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-3 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 flex items-start gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Migration is transactional. Members from {migratingFamily.memberType} family will be assigned to a new {migratingFamily.memberType} Member Code.
              </span>
            </div>

            <form onSubmit={handleExecuteMigration} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Destination Firm *
                </label>
                <select
                  required
                  value={destFirmId}
                  onChange={(e) => setDestFirmId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-sm focus:border-brand-orange focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="">Select Destination Firm</option>
                  {firms.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.firmCode} - {f.firmName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    New Family ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={destFamilyId}
                    onChange={(e) => setDestFamilyId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-sm focus:border-brand-orange focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    New Family Head *
                  </label>
                  <input
                    type="text"
                    required
                    value={destHeadName}
                    onChange={(e) => setDestHeadName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-sm focus:border-brand-orange focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              </div>

              {/* Members Selection List */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select Members to Migrate into New Family ({selectedMemberIds.length} selected) *
                </label>
                <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 p-2 space-y-1 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                  {migratingFamily.members?.map((m) => {
                    const isSelected = selectedMemberIds.includes(m.id);
                    return (
                      <label
                        key={m.id}
                        className="flex items-center justify-between p-1.5 rounded hover:bg-white dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedMemberIds([...selectedMemberIds, m.id]);
                              } else {
                                setSelectedMemberIds(selectedMemberIds.filter((id) => id !== m.id));
                              }
                            }}
                            className="text-brand-terracotta"
                          />
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{m.name}</span>
                        </div>
                        <span className="text-slate-400">({m.gender}, {m.age} yrs)</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setMigratingFamily(null)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="btn-primary text-xs">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Execute Migration</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
