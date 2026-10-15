import React, { useState, useCallback, useRef } from 'react';
import {
  Download,
  Upload,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Clock,
  Hash,
  RefreshCw,
  Database,
  Info,
  X,
} from 'lucide-react';
import { api } from '../services/api.js';

// ─── Types ────────────────────────────────────────────────────────────────────
interface BackupRecord {
  id: string;
  fileName: string;
  backupType: 'MANUAL' | 'PRE_RESTORE_SAFETY';
  schemaVersion: string;
  checksum: string;
  createdAt: string;
  createdBy: { id: string; username: string };
}

interface ValidationResult {
  valid: boolean;
  schemaVersion: string;
  createdAt: string;
  checksum: string;
  checksumMatch: boolean;
}

type ActionStatus = 'idle' | 'loading' | 'success' | 'error';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function truncateHash(hash: string) {
  return `${hash.substring(0, 8)}…${hash.substring(hash.length - 8)}`;
}

// ─── ConfirmModal ─────────────────────────────────────────────────────────────
interface ConfirmModalProps {
  fileName: string;
  validation: ValidationResult;
  onConfirm: () => void;
  onCancel: () => void;
  isRestoring: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ fileName, validation, onConfirm, onCancel, isRestoring }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
    <div className="relative w-full max-w-md rounded-2xl border border-red-500/30 bg-slate-900 p-6 shadow-2xl">
      <button
        onClick={onCancel}
        className="absolute top-4 right-4 text-slate-500 hover:text-white transition"
        aria-label="Cancel"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-red-400">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-white">Confirm Database Restore</h2>
          <p className="mt-1 text-xs text-slate-400">
            This will <span className="font-semibold text-red-400">overwrite all current data</span>. A safety backup
            will be created automatically before proceeding.
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-slate-700 bg-slate-800 p-4 space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-slate-400">File</span>
          <span className="text-slate-200 font-medium truncate max-w-[220px]">{fileName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Backup Date</span>
          <span className="text-slate-200">{formatDate(validation.createdAt)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Schema</span>
          <span className="text-slate-200 font-mono">{validation.schemaVersion}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Integrity</span>
          {validation.checksumMatch ? (
            <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" /> Verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-red-400 font-medium">
              <ShieldAlert className="h-3.5 w-3.5" /> Checksum Mismatch
            </span>
          )}
        </div>
      </div>

      {!validation.checksumMatch && (
        <div className="mt-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-xs text-yellow-300 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-yellow-400" />
          <span>
            The backup file integrity check failed. Proceeding may restore corrupt data. Consider using a different
            backup file.
          </span>
        </div>
      )}

      <div className="mt-5 flex gap-3">
        <button
          onClick={onCancel}
          disabled={isRestoring}
          className="flex-1 rounded-lg border border-slate-600 py-2.5 text-sm font-semibold text-slate-300 hover:border-slate-400 hover:text-white transition disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={isRestoring}
          className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-bold text-white shadow-lg hover:bg-red-500 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isRestoring ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Restoring…
            </>
          ) : (
            'Restore Database'
          )}
        </button>
      </div>
    </div>
  </div>
);

// ─── Main Page ─────────────────────────────────────────────────────────────────
export const BackupRestore: React.FC = () => {
  // Backup creation
  const [backupStatus, setBackupStatus] = useState<ActionStatus>('idle');
  const [backupError, setBackupError] = useState('');

  // Restore flow
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [validateStatus, setValidateStatus] = useState<ActionStatus>('idle');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [validateError, setValidateError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState<ActionStatus>('idle');
  const [restoreMessage, setRestoreMessage] = useState('');
  const [restoreError, setRestoreError] = useState('');

  // History
  const [records, setRecords] = useState<BackupRecord[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Backup creation ──────────────────────────────────────────────────────────
  const handleCreateBackup = useCallback(async () => {
    setBackupStatus('loading');
    setBackupError('');
    try {
      const response = await api.post('/v1/backups', {}, { responseType: 'blob' });
      const disposition = response.headers['content-disposition'] as string;
      const fileNameMatch = disposition?.match(/filename="(.+?)"/);
      const fileName = fileNameMatch?.[1] ?? `uma-bhavan-backup-${Date.now()}.ubak`;

      const url = URL.createObjectURL(new Blob([response.data as BlobPart]));
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);

      setBackupStatus('success');
      // Refresh history
      loadHistory();
      setTimeout(() => setBackupStatus('idle'), 4000);
    } catch (err: unknown) {
      setBackupStatus('error');
      setBackupError(err instanceof Error ? err.message : 'Backup creation failed.');
    }
  }, []);

  // ── Validate file ────────────────────────────────────────────────────────────
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreFile(file);
    setValidationResult(null);
    setValidateError('');
    setValidateStatus('loading');
    setRestoreStatus('idle');
    setRestoreError('');
    setRestoreMessage('');

    try {
      const buffer = await file.arrayBuffer();
      const response = await api.post<{ data: ValidationResult }>('/v1/backups/validate', buffer, {
        headers: { 'Content-Type': 'application/octet-stream' },
      });
      setValidationResult(response.data.data);
      setValidateStatus('success');
    } catch (err: unknown) {
      setValidateStatus('error');
      setValidateError(err instanceof Error ? err.message : 'Failed to validate backup file.');
    }
  }, []);

  // ── Restore ──────────────────────────────────────────────────────────────────
  const handleRestoreConfirm = useCallback(async () => {
    if (!restoreFile) return;
    setRestoreStatus('loading');
    setRestoreError('');
    setRestoreMessage('');

    try {
      const buffer = await restoreFile.arrayBuffer();
      const response = await api.post<{ message: string; data: { safetyBackupFileName: string } }>(
        '/v1/backups/restore',
        buffer,
        { headers: { 'Content-Type': 'application/octet-stream' } },
      );
      setRestoreStatus('success');
      setRestoreMessage(
        `${response.data.message} Safety backup: ${response.data.data.safetyBackupFileName}`,
      );
      setShowConfirm(false);
      setValidationResult(null);
      setRestoreFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadHistory();
    } catch (err: unknown) {
      setRestoreStatus('error');
      setRestoreError(err instanceof Error ? err.message : 'Restore failed. The safety backup was preserved.');
      setShowConfirm(false);
    }
  }, [restoreFile]);

  // ── History ──────────────────────────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const res = await api.get<{ data: BackupRecord[] }>('/v1/backups');
      setRecords(res.data.data);
      setHistoryLoaded(true);
    } catch (err: unknown) {
      setHistoryError(err instanceof Error ? err.message : 'Failed to load backup history.');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-2">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Database className="h-7 w-7 text-brand-orange" />
          Backup &amp; Restore
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Download an encrypted backup of the database, or restore from a previous backup file.
        </p>
      </div>

      {/* ── Create Backup ─────────────────────────────────────────────── */}
      <section className="card-glass rounded-2xl border border-slate-700/60 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Download className="h-4 w-4 text-brand-orange" />
              Create Backup
            </h2>
            <p className="mt-1 text-xs text-slate-400 max-w-lg">
              Downloads an AES-256 encrypted backup package (.ubak) to your computer. Keep this file safe — it contains
              all community data.
            </p>
          </div>
          <button
            id="btn-create-backup"
            onClick={handleCreateBackup}
            disabled={backupStatus === 'loading'}
            className="shrink-0 btn-primary flex items-center gap-2 px-5 py-2.5 text-sm font-bold disabled:opacity-60"
          >
            {backupStatus === 'loading' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Creating…
              </>
            ) : (
              <>
                <Download className="h-4 w-4" /> Download Backup
              </>
            )}
          </button>
        </div>

        {backupStatus === 'success' && (
          <div className="mt-4 flex items-center gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            Backup created and downloaded successfully.
          </div>
        )}
        {backupStatus === 'error' && (
          <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
            <ShieldAlert className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
            {backupError}
          </div>
        )}
      </section>

      {/* ── Restore ───────────────────────────────────────────────────── */}
      <section className="card-glass rounded-2xl border border-slate-700/60 p-6 space-y-5">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Upload className="h-4 w-4 text-brand-orange" />
            Restore from Backup
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Upload a .ubak file. The system will validate it, automatically create a safety backup of the current data,
            then restore.
          </p>
        </div>

        <div className="flex items-center gap-2.5 rounded-lg border border-yellow-500/25 bg-yellow-500/8 p-3 text-xs text-yellow-300">
          <AlertTriangle className="h-4 w-4 shrink-0 text-yellow-400" />
          <span>
            <strong>Warning:</strong> Restore is a destructive operation. All current data will be replaced by the
            backup. A safety backup will be created automatically before proceeding.
          </span>
        </div>

        {/* File picker */}
        <div>
          <label
            htmlFor="restore-file-input"
            className="block text-xs font-semibold text-slate-300 mb-2"
          >
            Select Backup File (.ubak)
          </label>
          <input
            id="restore-file-input"
            ref={fileInputRef}
            type="file"
            accept=".ubak"
            onChange={handleFileChange}
            className="block w-full text-sm text-slate-300 file:mr-4 file:rounded-lg file:border file:border-brand-orange/40 file:bg-brand-orange/10 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-brand-orange hover:file:bg-brand-orange/20 file:cursor-pointer cursor-pointer transition"
          />
        </div>

        {/* Validation in progress */}
        {validateStatus === 'loading' && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin text-brand-orange" />
            Validating backup file…
          </div>
        )}

        {/* Validation error */}
        {validateStatus === 'error' && (
          <div className="flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
            <ShieldAlert className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
            {validateError}
          </div>
        )}

        {/* Validation success card */}
        {validationResult && validateStatus === 'success' && (
          <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                {validationResult.valid ? (
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                ) : (
                  <ShieldAlert className="h-4 w-4 text-red-400" />
                )}
                Validation Result
              </h3>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  validationResult.valid
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-red-500/20 text-red-300'
                }`}
              >
                {validationResult.valid ? 'VALID' : 'INTEGRITY FAIL'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-slate-500 mb-0.5">Backup Date</p>
                <p className="text-slate-200 font-medium">{formatDate(validationResult.createdAt)}</p>
              </div>
              <div>
                <p className="text-slate-500 mb-0.5">Schema Version</p>
                <p className="text-slate-200 font-mono">{validationResult.schemaVersion}</p>
              </div>
              <div className="col-span-2">
                <p className="text-slate-500 mb-0.5 flex items-center gap-1">
                  <Hash className="h-3 w-3" /> Checksum
                </p>
                <p className="text-slate-300 font-mono text-xs">{truncateHash(validationResult.checksum)}</p>
              </div>
            </div>

            <button
              id="btn-restore-confirm"
              onClick={() => setShowConfirm(true)}
              className="w-full rounded-lg bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-500 transition flex items-center justify-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Restore This Backup
            </button>
          </div>
        )}

        {/* Restore success */}
        {restoreStatus === 'success' && (
          <div className="flex items-start gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
            <span>{restoreMessage}</span>
          </div>
        )}

        {/* Restore error */}
        {restoreStatus === 'error' && (
          <div className="flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
            <ShieldAlert className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
            {restoreError}
          </div>
        )}
      </section>

      {/* ── Backup History ────────────────────────────────────────────── */}
      <section className="card-glass rounded-2xl border border-slate-700/60 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Clock className="h-4 w-4 text-brand-orange" />
            Backup History
          </h2>
          <button
            id="btn-refresh-history"
            onClick={loadHistory}
            disabled={historyLoading}
            className="flex items-center gap-1.5 text-xs font-semibold text-brand-orange hover:text-brand-sand transition disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${historyLoading ? 'animate-spin' : ''}`} />
            {historyLoaded ? 'Refresh' : 'Load History'}
          </button>
        </div>

        {historyError && (
          <div className="text-xs text-red-400 py-4">{historyError}</div>
        )}

        {!historyLoaded && !historyLoading && !historyError && (
          <div className="flex items-center gap-2 text-xs text-slate-500 py-4">
            <Info className="h-4 w-4" />
            Click &ldquo;Load History&rdquo; to see backup records.
          </div>
        )}

        {historyLoading && (
          <div className="flex items-center gap-2 text-xs text-slate-400 py-4">
            <Loader2 className="h-4 w-4 animate-spin text-brand-orange" />
            Loading backup history…
          </div>
        )}

        {historyLoaded && records.length === 0 && (
          <p className="text-xs text-slate-500 py-4">No backup records found.</p>
        )}

        {records.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400">
                  <th className="text-left py-2 pr-4 font-medium">File Name</th>
                  <th className="text-left py-2 pr-4 font-medium">Type</th>
                  <th className="text-left py-2 pr-4 font-medium">Date</th>
                  <th className="text-left py-2 pr-4 font-medium">Schema</th>
                  <th className="text-left py-2 font-medium">Created By</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition">
                    <td className="py-2.5 pr-4 font-mono text-slate-300 max-w-[220px] truncate" title={r.fileName}>
                      {r.fileName}
                    </td>
                    <td className="py-2.5 pr-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          r.backupType === 'MANUAL'
                            ? 'bg-brand-orange/20 text-brand-orange'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {r.backupType === 'MANUAL' ? 'Manual' : 'Safety'}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-slate-300">{formatDate(r.createdAt)}</td>
                    <td className="py-2.5 pr-4 font-mono text-slate-400 text-xs">{r.schemaVersion}</td>
                    <td className="py-2.5 text-slate-400">{r.createdBy.username}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Confirm Restore Modal */}
      {showConfirm && validationResult && restoreFile && (
        <ConfirmModal
          fileName={restoreFile.name}
          validation={validationResult}
          onConfirm={handleRestoreConfirm}
          onCancel={() => setShowConfirm(false)}
          isRestoring={restoreStatus === 'loading'}
        />
      )}
    </div>
  );
};
