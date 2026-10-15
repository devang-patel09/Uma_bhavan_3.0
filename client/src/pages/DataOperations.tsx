import React, { useState } from 'react';
import {
  Database,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { api } from '../services/api.js';

interface ValidationError {
  rowNumber: number;
  data: Record<string, unknown>;
  errors: string[];
}

interface ValidationResult {
  type: string;
  totalRows: number;
  validCount: number;
  errorCount: number;
  validRows: Record<string, any>[];
  errorRows: ValidationError[];
}

export const DataOperations: React.FC = () => {
  const [selectedEntity, setSelectedEntity] = useState<'areas' | 'surnames' | 'firms' | 'members'>('members');
  const [csvContent, setCsvContent] = useState<string>('');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const entities = [
    { id: 'members', name: 'Member / Family Master', desc: 'Member Type, Family ID, Head Name, Surname, Firm, DOB, Gender, Mobile, Parental Surname' },
    { id: 'firms', name: 'Firm Master', desc: 'Firm Name, Area Name, Pincode, Address' },
    { id: 'areas', name: 'Area Master', desc: 'Area Name' },
    { id: 'surnames', name: 'Surname Master', desc: 'Surname' },
  ];

  const exportDatasets = [
    { id: 'members', name: 'Full Member Master Directory', records: 'All families, members, ages, blood groups' },
    { id: 'firms', name: 'Firm Master Register', records: 'Firm codes F001+, areas, addresses' },
    { id: 'areas', name: 'Area Master List', records: 'Wards & localities with linked firm counts' },
    { id: 'surnames', name: 'Surname Master Directory', records: 'Surnames with linked family counts' },
    { id: 'receipts', name: 'Subscription Receipts Register', records: 'Itemized receipts with member codes & amounts' },
  ];

  const handleDownloadTemplate = async (type: string) => {
    try {
      const res = await api.get(`/v1/data-ops/templates/${type}`);
      const tpl = res.data.data;

      // Build CSV string
      const headers = tpl.headers.join(',');
      const sampleRows = tpl.sampleRows
        .map((r: any) =>
          tpl.headers.map((h: string) => `"${(r[h] || '').toString().replace(/"/g, '""')}"`).join(',')
        )
        .join('\n');

      const csvData = `${headers}\n${sampleRows}`;
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', tpl.filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      setStatusMessage({ type: 'error', text: 'Failed to download template.' });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      setCsvContent(text);
      setValidationResult(null);
      setStatusMessage(null);
    };
    reader.readAsText(file);
  };

  const parseCsvToObjects = (text: string) => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
    const rows: Record<string, any>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Basic CSV token parser
      const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
      const obj: Record<string, any> = {};
      headers.forEach((h, idx) => {
        obj[h] = values[idx] || '';
      });
      rows.push(obj);
    }

    return rows;
  };

  const handleValidate = async () => {
    if (!csvContent.trim()) {
      setStatusMessage({ type: 'error', text: 'Please upload or paste CSV content first.' });
      return;
    }

    setIsProcessing(true);
    setStatusMessage(null);

    try {
      const rows = parseCsvToObjects(csvContent);
      if (rows.length === 0) {
        setStatusMessage({ type: 'error', text: 'No data rows found in CSV.' });
        return;
      }

      const res = await api.post('/v1/data-ops/validate', {
        type: selectedEntity,
        rows,
      });

      setValidationResult(res.data.data);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Validation failed.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCommit = async () => {
    if (!validationResult || validationResult.validRows.length === 0) {
      setStatusMessage({ type: 'error', text: 'No valid rows available to commit.' });
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to transactionally commit ${validationResult.validRows.length} ${selectedEntity} record(s)?`
      )
    ) {
      return;
    }

    setIsProcessing(true);
    setStatusMessage(null);

    try {
      const res = await api.post('/v1/data-ops/commit', {
        type: selectedEntity,
        rows: validationResult.validRows,
      });

      setStatusMessage({ type: 'success', text: res.data.data.message });
      setValidationResult(null);
      setCsvContent('');
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Commit failed.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = async (type: string) => {
    try {
      const res = await api.get(`/v1/data-ops/export/${type}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Uma_Bhavan_${type}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      setStatusMessage({ type: 'error', text: 'Failed to export data.' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Database className="h-6 w-6 text-brand-terracotta" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Excel Import & Export</h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Batch data migration pipeline with schema validation, preview, transactional commit, and direct exports
          </p>
        </div>
      </div>

      {/* Status Notifications */}
      {statusMessage && (
        <div
          className={`flex items-start gap-2.5 rounded-lg border p-3 text-xs ${
            statusMessage.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
              : 'border-red-500/30 bg-red-500/10 text-red-800 dark:text-red-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Grid: Step-by-Step Import & Direct Exports */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Import Step-by-Step Card */}
        <div className="card-premium space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-brand-orange" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Batch Import Pipeline</h2>
            </div>
            <span className="rounded bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
              Transactional
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              1. Select Target Entity
            </label>
            <select
              value={selectedEntity}
              onChange={(e) => {
                setSelectedEntity(e.target.value as any);
                setValidationResult(null);
              }}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-sm focus:border-brand-orange focus:outline-none dark:border-slate-700 dark:bg-slate-800"
            >
              {entities.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Upload Area */}
          <div className="rounded-xl border-2 border-dashed border-slate-300 p-5 text-center dark:border-slate-700 hover:border-brand-orange transition">
            <FileSpreadsheet className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
              Upload formatted CSV file (.csv)
            </p>
            <p className="text-[11px] text-slate-400">Validated strictly against schema before database commit</p>

            <div className="mt-3 flex items-center justify-center gap-2">
              <label className="btn-secondary cursor-pointer py-1.5 px-3 text-xs">
                <Upload className="h-3.5 w-3.5" />
                <span>Choose File</span>
                <input type="file" accept=".csv,.txt" onChange={handleFileUpload} className="hidden" />
              </label>
              <button
                type="button"
                onClick={() => handleDownloadTemplate(selectedEntity)}
                className="btn-secondary py-1.5 px-3 text-xs text-brand-terracotta"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download Template</span>
              </button>
            </div>
          </div>

          {/* CSV Paste / Review Area */}
          {csvContent && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                2. CSV File Content ({csvContent.trim().split('\n').length - 1} data rows)
              </label>
              <textarea
                rows={4}
                value={csvContent}
                onChange={(e) => {
                  setCsvContent(e.target.value);
                  setValidationResult(null);
                }}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 p-2 font-mono text-xs focus:border-brand-orange focus:outline-none dark:border-slate-700 dark:bg-slate-950"
              />
            </div>
          )}

          {/* Validation & Commit Buttons */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
            <button
              onClick={handleValidate}
              disabled={isProcessing || !csvContent.trim()}
              className="btn-primary text-xs py-2 px-4"
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Validate & Preview</span>}
            </button>

            {validationResult && (
              <button
                onClick={handleCommit}
                disabled={isProcessing || validationResult.validCount === 0}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow transition hover:bg-emerald-700 disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Commit {validationResult.validCount} Rows</span>
              </button>
            )}
          </div>

          {/* Validation Summary Card */}
          {validationResult && (
            <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white">Validation Results:</span>
                <div className="flex gap-2 text-xs">
                  <span className="rounded bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    {validationResult.validCount} Valid
                  </span>
                  {validationResult.errorCount > 0 && (
                    <span className="rounded bg-red-100 px-2 py-0.5 font-bold text-red-800 dark:bg-red-950 dark:text-red-300">
                      {validationResult.errorCount} Errors
                    </span>
                  )}
                </div>
              </div>

              {validationResult.errorRows.length > 0 && (
                <div className="max-h-40 overflow-y-auto space-y-1.5">
                  {validationResult.errorRows.map((err, i) => (
                    <div key={i} className="flex items-start gap-2 rounded bg-red-50 p-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Row {err.rowNumber}:</span> {err.errors.join(' • ')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Direct Data Exports */}
        <div className="card-premium space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
            <Download className="h-5 w-5 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Direct Excel / CSV Exports</h2>
          </div>

          <p className="text-xs text-slate-500">
            Export official community databases to spreadsheet files with complete relations.
          </p>

          <div className="space-y-3">
            {exportDatasets.map((ds) => (
              <div
                key={ds.id}
                className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900/90"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">{ds.name}</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{ds.records}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleExport(ds.id)}
                  className="btn-secondary py-1.5 px-3 text-xs"
                >
                  <Download className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Export</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
