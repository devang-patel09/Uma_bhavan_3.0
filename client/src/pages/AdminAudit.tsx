import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Download, RefreshCw, HardDrive, Lock, ArrowRight, Loader2, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';

interface AuditLogEntry {
  id: string;
  userId?: string | null;
  module: string;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: string | null;
  occurredAt: string;
  user?: {
    id: string;
    username: string;
    role: string;
  } | null;
}

export const AdminAudit: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, any> = { page, limit: 25 };
      if (selectedModule) params.module = selectedModule;

      const res = await api.get('/v1/audit', { params });
      if (res.data?.data) {
        setLogs(res.data.data.logs || []);
        setTotalPages(res.data.data.totalPages || 1);
        setTotal(res.data.data.total || 0);
      }
    } catch {
      // Fallback
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  }, [page, selectedModule]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const modules = [
    'AUTH',
    'FIRM_MASTER',
    'MEMBER_MASTER',
    'RECEIPT',
    'MIGRATION',
    'DATA_IMPORT',
    'EXCEL_EXPORT',
    'BACKUP',
    'RESTORE',
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-brand-terracotta" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Audit Trail & System Activity</h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Activity logs and direct access to encrypted database backup management
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/backup" className="btn-primary flex items-center gap-2">
            <HardDrive className="h-4 w-4" />
            <span>Open Backup & Restore Console</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Backup and Restore Banner */}
      <div className="card-premium grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-brand-terracotta">
            <Lock className="h-5 w-5" />
            <h3 className="text-sm font-bold">Encrypted Operator Backup</h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Download an encrypted application backup package containing complete database records, checksums, and version metadata.
          </p>
          <Link to="/backup" className="btn-secondary text-xs inline-flex items-center gap-1.5">
            <Download className="h-3.5 w-3.5" />
            <span>Manage & Download Backups</span>
          </Link>
        </div>

        <div className="space-y-2 border-t border-slate-200 pt-3 sm:border-t-0 sm:border-l sm:pl-6 dark:border-slate-800">
          <div className="flex items-center gap-2 text-amber-600">
            <RefreshCw className="h-5 w-5" />
            <h3 className="text-sm font-bold">Safe Database Restore</h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Automatically takes a safety backup prior to restoring data. Requires explicit confirmation and checksum verification.
          </p>
          <Link to="/backup" className="btn-secondary text-xs text-amber-700 dark:text-amber-400 inline-flex items-center gap-1.5">
            <span>Go to Restore Wizard</span>
          </Link>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="card-premium overflow-hidden p-0">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center dark:border-slate-800">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Audit Log History ({total} Total)</h2>
            <p className="text-xs text-slate-500">Sensitive fields, old/new diffs, IP, and device data are excluded for privacy</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Filter className="h-3.5 w-3.5" />
              <select
                value={selectedModule}
                onChange={(e) => {
                  setSelectedModule(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="">All Modules</option>
                {modules.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => fetchLogs()}
              disabled={isLoading}
              className="btn-secondary p-1.5 text-xs"
              title="Refresh Logs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin text-brand-terracotta mr-2" />
              <span className="text-xs">Loading audit trail...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No audit logs recorded yet for this selection.
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Module</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Entity Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {logs.map((log) => (
                  <tr key={log.id} className="transition hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">
                      {new Date(log.occurredAt).toLocaleString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                      {log.user?.username || 'System / Anonymous'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-brand-terracotta">{log.module}</td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {log.entityType ? `${log.entityType} ${log.entityId ? `(#${log.entityId})` : ''}` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500 dark:border-slate-800">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="btn-secondary py-1 px-2.5 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="btn-secondary py-1 px-2.5 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
