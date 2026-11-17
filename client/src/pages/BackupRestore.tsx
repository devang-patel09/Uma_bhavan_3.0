import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Download,
  Upload,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Lock,
  FileCheck2,
  PackageCheck,
  GitCompareArrows,
  HardDrive,
  History,
  CloudDownload,
  RotateCcw,
  FileArchive,
  X,
  ArrowRight,
  RefreshCw,
  Server,
} from 'lucide-react';
import { api } from '../services/api.js';
import { useEscapeKey } from '../hooks/useHotkeys.js';

// ─── Types ────────────────────────────────────────────────────────────────────
interface BackupRecord {
  id: string;
  fileName: string;
  backupType: 'MANUAL' | 'PRE_RESTORE_SAFETY';
  schemaVersion: string;
  checksum: string;
  createdAt: string;
  createdBy?: { id: string; username: string };
  fileAvailable?: boolean;
}

interface ValidationResult {
  valid: boolean;
  schemaVersion: string;
  createdAt: string;
  checksum: string;
  checksumMatch: boolean;
  restorable?: boolean;
  schemaMatches?: boolean;
  currentSchemaVersion?: string;
  tableCount?: number;
  sizeBytes?: number;
}

type Status = 'idle' | 'loading' | 'success' | 'error';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });

const timeAgo = (iso: string) => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
  return `${Math.floor(s / 86400)} day${s >= 172800 ? 's' : ''} ago`;
};

const formatSize = (bytes?: number) =>
  bytes === undefined ? '—' : bytes > 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/** Saves a blob response as a file using the server-provided filename. */
function saveBlob(response: { data: unknown; headers: Record<string, unknown> }, fallback: string) {
  const disposition = String(response.headers['content-disposition'] ?? '');
  const fileName = disposition.match(/filename="(.+?)"/)?.[1] ?? fallback;
  const url = URL.createObjectURL(new Blob([response.data as BlobPart]));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
  return fileName;
}

/** Blob requests hide the server's JSON error; read it back out. */
async function errorMessage(err: unknown, fallback: string): Promise<string> {
  const data = (err as { response?: { data?: unknown } })?.response?.data;
  if (data instanceof Blob) {
    try {
      return JSON.parse(await data.text())?.error?.message ?? fallback;
    } catch {
      return fallback;
    }
  }
  return err instanceof Error ? err.message : fallback;
}

// ─── Small pieces ─────────────────────────────────────────────────────────────
const Alert: React.FC<{ tone: 'success' | 'error' | 'warning'; children: React.ReactNode }> = ({ tone, children }) => {
  const styles = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200',
    error: 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200',
    warning: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200',
  }[tone];
  const Icon = tone === 'success' ? CheckCircle2 : tone === 'error' ? XCircle : AlertTriangle;
  return (
    <div className={`flex items-start gap-2.5 rounded-xl border p-3 text-sm ${styles}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
};

const Check: React.FC<{ ok: boolean | undefined; warn?: boolean; icon: React.ElementType; label: string; detail: string }> = ({
  ok, warn, icon: Icon, label, detail,
}) => {
  const tone = ok ? 'text-emerald-600 dark:text-emerald-400' : warn ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400';
  const Mark = ok ? CheckCircle2 : warn ? AlertTriangle : XCircle;
  return (
    <li className="flex items-center gap-3 rounded-lg px-2 py-1.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{label}</p>
        <p className="truncate text-xs text-slate-500 dark:text-slate-400">{detail}</p>
      </div>
      <Mark className={`h-5 w-5 shrink-0 ${tone}`} />
    </li>
  );
};

// ─── Confirm restore popup ────────────────────────────────────────────────────
const ConfirmRestore: React.FC<{
  fileName: string;
  validation: ValidationResult;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ fileName, validation, busy, onConfirm, onCancel }) => {
  const steps = [
    { icon: ShieldCheck, text: 'A safety copy of today’s data is saved first' },
    { icon: RotateCcw, text: 'All current data is replaced with the backup' },
    { icon: CheckCircle2, text: 'You can download the safety copy any time' },
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={busy ? undefined : onCancel}>
      <div
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400">
            <RotateCcw className="h-6 w-6" />
          </div>
          <button onClick={onCancel} disabled={busy} className="text-slate-400 hover:text-slate-600 disabled:opacity-40" aria-label="Cancel">
            <X className="h-5 w-5" />
          </button>
        </div>
        <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">Restore this backup?</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Data will go back to how it was on <strong className="text-slate-800 dark:text-slate-200">{formatDate(validation.createdAt)}</strong>.
        </p>

        <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800/60">
          <FileArchive className="h-4 w-4 shrink-0 text-brand-terracotta" />
          <span className="truncate font-medium text-slate-700 dark:text-slate-200">{fileName}</span>
        </div>

        <ol className="mt-4 space-y-2.5">
          {steps.map(({ icon: Icon, text }, i) => (
            <li key={i} className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-terracotta dark:bg-brand-950/60 dark:text-brand-300">
                <Icon className="h-3.5 w-3.5" />
              </span>
              {text}
            </li>
          ))}
        </ol>

        <div className="mt-6 flex gap-3">
          <button onClick={onCancel} disabled={busy} className="btn-secondary flex-1">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-red-500 disabled:opacity-60"
          >
            {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Restoring…</> : <><RotateCcw className="h-4 w-4" /> Yes, restore</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export const BackupRestore: React.FC = () => {
  // Backup
  const [backupStatus, setBackupStatus] = useState<Status>('idle');
  const [backupMsg, setBackupMsg] = useState('');

  // Restore
  const [file, setFile] = useState<File | null>(null);
  const [checkStatus, setCheckStatus] = useState<Status>('idle');
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [checkError, setCheckError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState<Status>('idle');
  const [restoreMsg, setRestoreMsg] = useState('');
  const [safetyFile, setSafetyFile] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  useEscapeKey(() => setShowConfirm(false), showConfirm && restoreStatus !== 'loading');

  // History
  const [records, setRecords] = useState<BackupRecord[]>([]);
  const [historyStatus, setHistoryStatus] = useState<Status>('idle');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setHistoryStatus('loading');
    try {
      const res = await api.get<{ data: BackupRecord[] }>('/v1/backups');
      setRecords(res.data.data);
      setHistoryStatus('success');
    } catch {
      setHistoryStatus('error');
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleBackup = async () => {
    setBackupStatus('loading');
    setBackupMsg('');
    try {
      const res = await api.post('/v1/backups', {}, { responseType: 'blob' });
      const name = saveBlob(res as never, `uma-bhavan-backup-${Date.now()}.ubak`);
      setBackupStatus('success');
      setBackupMsg(name);
      loadHistory();
    } catch (err) {
      setBackupStatus('error');
      setBackupMsg(await errorMessage(err, 'Backup failed.'));
    }
  };

  const resetRestore = () => {
    setFile(null);
    setValidation(null);
    setCheckStatus('idle');
    setCheckError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const checkFile = async (f: File) => {
    setFile(f);
    setValidation(null);
    setCheckError('');
    setRestoreStatus('idle');
    setRestoreMsg('');
    if (!f.name.toLowerCase().endsWith('.ubak')) {
      setCheckStatus('error');
      setCheckError('Please choose a Uma Bhavan backup file (ending in .ubak).');
      return;
    }
    setCheckStatus('loading');
    try {
      const res = await api.post<{ data: ValidationResult }>('/v1/backups/validate', await f.arrayBuffer(), {
        headers: { 'Content-Type': 'application/octet-stream' },
      });
      setValidation(res.data.data);
      setCheckStatus('success');
    } catch (err) {
      setCheckStatus('error');
      setCheckError(await errorMessage(err, 'This file could not be read.'));
    }
  };

  const handleRestore = async () => {
    if (!file) return;
    setRestoreStatus('loading');
    try {
      const res = await api.post<{ data: { safetyBackupFileName: string } }>('/v1/backups/restore', await file.arrayBuffer(), {
        headers: { 'Content-Type': 'application/octet-stream' },
      });
      setRestoreStatus('success');
      setSafetyFile(res.data.data.safetyBackupFileName);
      setShowConfirm(false);
      resetRestore();
      loadHistory();
    } catch (err) {
      setRestoreStatus('error');
      setRestoreMsg(await errorMessage(err, 'Restore failed. Your data was not changed after the safety copy.'));
      setShowConfirm(false);
    }
  };

  const downloadRecord = async (r: BackupRecord) => {
    setDownloadingId(r.id);
    try {
      const res = await api.get(`/v1/backups/${r.id}/download`, { responseType: 'blob' });
      saveBlob(res as never, r.fileName);
    } catch (err) {
      alert(await errorMessage(err, 'Download failed.'));
    } finally {
      setDownloadingId(null);
    }
  };

  const lastBackup = records.find((r) => r.backupType === 'MANUAL') ?? records[0];
  const storedCount = records.filter((r) => r.fileAvailable).length;
  const canRestore = !!validation && validation.valid && validation.restorable !== false;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <HardDrive className="h-6 w-6 text-brand-terracotta" />
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Backup &amp; Restore</h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">Keep a safe copy of all community data, and bring it back when needed.</p>
      </div>

      {/* Status strip */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          {
            icon: History,
            label: 'Last backup',
            value: lastBackup ? timeAgo(lastBackup.createdAt) : historyStatus === 'loading' ? '…' : 'Never',
            tone: lastBackup ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400' : 'text-amber-600 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-400',
          },
          { icon: Server, label: 'Copies on server', value: String(storedCount), tone: 'text-blue-600 bg-blue-50 dark:bg-blue-950/50 dark:text-blue-400' },
          { icon: Lock, label: 'Protection', value: 'AES-256 encrypted', tone: 'text-brand-terracotta bg-brand-50 dark:bg-brand-950/50 dark:text-brand-300' },
        ].map(({ icon: Icon, label, value, tone }) => (
          <div key={label} className="card-premium flex items-center gap-3 p-4 hover:shadow-sm">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white">{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ── Backup card ── */}
        <section className="card-premium flex flex-col p-6 hover:shadow-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-sm">
            <CloudDownload className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">Backup now</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Download a locked copy of every firm, family, member and receipt.</p>

          <ul className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
            {[
              [Lock, 'Encrypted, only this system can open it'],
              [Server, 'A copy is also kept on the server'],
              [ShieldCheck, 'Checked for completeness before saving'],
            ].map(([Icon, text], i) => {
              const I = Icon as React.ElementType;
              return (
                <li key={i} className="flex items-center gap-2.5">
                  <I className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  {text as string}
                </li>
              );
            })}
          </ul>

          <div className="mt-auto pt-6">
            <button
              onClick={handleBackup}
              disabled={backupStatus === 'loading'}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:brightness-105 active:scale-[0.99] disabled:opacity-60"
            >
              {backupStatus === 'loading' ? <><Loader2 className="h-5 w-5 animate-spin" /> Creating backup…</> : <><Download className="h-5 w-5" /> Download backup</>}
            </button>
            {backupStatus === 'success' && (
              <div className="mt-3">
                <Alert tone="success">
                  <p className="font-semibold">Backup saved</p>
                  <p className="truncate text-xs opacity-80">{backupMsg}</p>
                </Alert>
              </div>
            )}
            {backupStatus === 'error' && (
              <div className="mt-3">
                <Alert tone="error">{backupMsg}</Alert>
              </div>
            )}
          </div>
        </section>

        {/* ── Restore card ── */}
        <section className="card-premium flex flex-col p-6 hover:shadow-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-brand-terracotta text-white shadow-sm">
            <RotateCcw className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">Restore</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Bring data back from a backup file. A safety copy is made first.</p>

          {/* Drop zone */}
          {!file && (
            <label
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files?.[0];
                if (f) checkFile(f);
              }}
              className={`mt-4 flex flex-1 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition ${
                dragOver
                  ? 'border-brand-orange bg-brand-50 dark:bg-brand-950/40'
                  : 'border-slate-300 hover:border-brand-orange hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50'
              }`}
            >
              <Upload className="h-8 w-8 text-slate-400" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Drop a .ubak file here</span>
              <span className="text-xs text-slate-500">or click to choose</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".ubak"
                className="sr-only"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) checkFile(f); }}
              />
            </label>
          )}

          {/* File checks */}
          {file && (
            <div className="mt-4 flex flex-1 flex-col">
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                <FileArchive className="h-5 w-5 shrink-0 text-brand-terracotta" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{file.name}</p>
                  <p className="text-xs text-slate-500">
                    {formatSize(file.size)}
                    {validation && ` · made ${formatDate(validation.createdAt)}`}
                  </p>
                </div>
                <button onClick={resetRestore} className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-700" title="Choose another file">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {checkStatus === 'loading' && (
                <div className="flex flex-1 items-center justify-center gap-2 py-6 text-sm text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin" /> Checking file…
                </div>
              )}
              {checkStatus === 'error' && <div className="mt-3"><Alert tone="error">{checkError}</Alert></div>}
              {validation && (
                <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
                  <Check ok icon={Lock} label="Unlocked" detail="Encrypted with this system’s key" />
                  <Check ok={validation.checksumMatch} icon={FileCheck2} label="Not damaged" detail={validation.checksumMatch ? 'Fingerprint matches' : 'File content has changed'} />
                  <Check
                    ok={validation.restorable !== false}
                    icon={PackageCheck}
                    label="Complete"
                    detail={validation.restorable !== false ? `${validation.tableCount ?? '?'} tables inside` : 'Missing table data, can’t restore'}
                  />
                  <Check
                    ok={validation.schemaMatches !== false}
                    warn
                    icon={GitCompareArrows}
                    label="Same app version"
                    detail={validation.schemaMatches !== false ? 'Matches the current database' : 'Made with a different app version'}
                  />
                </ul>
              )}

              <div className="mt-auto pt-4">
                <button
                  onClick={() => setShowConfirm(true)}
                  disabled={!canRestore}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-terracotta to-brand-orange px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <RotateCcw className="h-5 w-5" /> Restore this backup <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {restoreStatus === 'success' && (
            <div className="mt-3">
              <Alert tone="success">
                <p className="font-semibold">Data restored</p>
                <p className="text-xs opacity-80">Safety copy saved as {safetyFile}. It’s in the history below.</p>
                <button onClick={() => window.location.reload()} className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold underline">
                  <RefreshCw className="h-3.5 w-3.5" /> Reload app to see restored data
                </button>
              </Alert>
            </div>
          )}
          {restoreStatus === 'error' && <div className="mt-3"><Alert tone="error">{restoreMsg}</Alert></div>}
        </section>
      </div>

      {/* ── History ── */}
      <section className="card-premium p-0 hover:shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-brand-terracotta" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">History</h2>
          </div>
          <button onClick={loadHistory} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800" title="Refresh">
            <RefreshCw className={`h-4 w-4 ${historyStatus === 'loading' ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {historyStatus === 'error' && <div className="p-6"><Alert tone="error">Could not load history.</Alert></div>}
        {historyStatus !== 'error' && records.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center text-sm text-slate-500">
            <HardDrive className="h-8 w-8 text-slate-300 dark:text-slate-600" />
            {historyStatus === 'loading' ? 'Loading…' : 'No backups yet. Make your first one above.'}
          </div>
        )}
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {records.map((r) => {
            const safety = r.backupType === 'PRE_RESTORE_SAFETY';
            return (
              <li key={r.id} className="flex items-center gap-4 px-6 py-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    safety ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'
                  }`}
                >
                  {safety ? <ShieldCheck className="h-5 w-5" /> : <CloudDownload className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{safety ? 'Safety copy (before restore)' : 'Backup'}</p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {formatDate(r.createdAt)} · {timeAgo(r.createdAt)}
                    {r.createdBy?.username && ` · by ${r.createdBy.username}`}
                  </p>
                </div>
                {r.fileAvailable ? (
                  <button
                    onClick={() => downloadRecord(r)}
                    disabled={downloadingId === r.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-brand-orange hover:text-brand-terracotta disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
                    title="Download this backup"
                  >
                    {downloadingId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                    <span className="hidden sm:inline">Download</span>
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-400" title="The file is not stored on the server">Not on server</span>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {showConfirm && validation && file && (
        <ConfirmRestore fileName={file.name} validation={validation} busy={restoreStatus === 'loading'} onConfirm={handleRestore} onCancel={() => setShowConfirm(false)} />
      )}
    </div>
  );
};
