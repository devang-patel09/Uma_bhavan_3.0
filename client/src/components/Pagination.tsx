import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  pageSizes?: number[];
  itemLabel?: string;
}

/** Page numbers to show, with null as an ellipsis: 1 … 4 5 6 … 12 */
function pageWindow(page: number, totalPages: number): Array<number | null> {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const out: Array<number | null> = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push(null);
    out.push(p);
  });
  return out;
}

const btn =
  'inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-xs font-semibold transition disabled:pointer-events-none disabled:opacity-40';

export const Pagination: React.FC<PaginationProps> = ({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  onLimitChange,
  pageSizes = [10, 25, 50, 100],
  itemLabel = 'records',
}) => {
  const pages = Math.max(totalPages, 1);
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400 sm:flex-row no-print">
      <div className="flex items-center gap-3">
        <span>
          Showing <strong className="text-slate-800 dark:text-slate-200">{from}–{to}</strong> of{' '}
          <strong className="text-slate-800 dark:text-slate-200">{total.toLocaleString('en-IN')}</strong> {itemLabel}
        </span>
        {onLimitChange && (
          <label className="flex items-center gap-1.5">
            <span className="hidden sm:inline">Rows</span>
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="rounded-md border border-slate-300 bg-white px-1.5 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              {pageSizes.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      <nav className="flex items-center gap-1" aria-label="Pagination">
        <button
          type="button"
          data-shortcut="prev-page"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className={`${btn} text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800`}
          title="Previous page (←)"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pageWindow(page, pages).map((p, i) =>
          p === null ? (
            <span key={`gap-${i}`} className="px-1">…</span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              aria-current={p === page ? 'page' : undefined}
              className={`${btn} ${
                p === page
                  ? 'bg-gradient-to-r from-brand-terracotta to-brand-orange text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          type="button"
          data-shortcut="next-page"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
          className={`${btn} text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800`}
          title="Next page (→)"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </nav>
    </div>
  );
};
