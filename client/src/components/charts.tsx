import React, { useEffect, useRef, useState } from 'react';

/**
 * Lightweight SVG charts (no chart library dependency).
 * Colours come from CSS tokens (--series-*, --chart-grid, --chart-surface)
 * defined in index.css for light and dark mode.
 */

// ── helpers ─────────────────────────────────────────────────────────────────

function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    ro.observe(el);
    setWidth(Math.floor(el.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

/** Rounds max up to a "nice" number and returns evenly spaced ticks from 0. */
function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0, 1];
  const raw = max / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  // Counts and rupee amounts are whole numbers, so never step below 1.
  const step = Math.max(1, [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw);
  const ticks: number[] = [];
  for (let v = 0; v <= max + step * 0.001; v += step) ticks.push(Math.round(v * 100) / 100);
  if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step);
  return ticks;
}

/** Indian compact currency: ₹950, ₹12.5K, ₹3.2L, ₹1.1Cr */
export function formatInrCompact(v: number): string {
  const abs = Math.abs(v);
  const fmt = (n: number) => (n >= 100 ? n.toFixed(0) : n.toFixed(1).replace(/\.0$/, ''));
  if (abs >= 1e7) return `₹${fmt(v / 1e7)}Cr`;
  if (abs >= 1e5) return `₹${fmt(v / 1e5)}L`;
  if (abs >= 1e3) return `₹${fmt(v / 1e3)}K`;
  return `₹${Math.round(v)}`;
}

export const formatInr = (v: number) => `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
export const formatCount = (v: number) => v.toLocaleString('en-IN');

/** Vertical bar with a 4px rounded data-end, flat on the baseline. */
function vBarPath(x: number, y: number, w: number, h: number): string {
  if (h <= 0) return '';
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

/** Horizontal bar with a 4px rounded data-end, flat on the baseline. */
function hBarPath(x: number, y: number, w: number, h: number): string {
  if (w <= 0) return '';
  const r = Math.min(4, h / 2, w);
  return `M${x},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h - r}Q${x + w},${y + h} ${x + w - r},${y + h}H${x}Z`;
}

const Tooltip: React.FC<{ x: number; y: number; containerWidth: number; children: React.ReactNode }> = ({
  x, y, containerWidth, children,
}) => {
  const flip = x > containerWidth - 160;
  return (
    <div
      className="pointer-events-none absolute z-10 min-w-[120px] rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95"
      style={{ left: flip ? undefined : x + 12, right: flip ? containerWidth - x + 12 : undefined, top: Math.max(0, y - 12) }}
    >
      {children}
    </div>
  );
};

const Swatch: React.FC<{ color: string }> = ({ color }) => (
  <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: color }} />
);

export const Legend: React.FC<{ items: Array<{ label: string; color: string; value?: string }> }> = ({ items }) => (
  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
    {items.map((it) => (
      <span key={it.label} className="inline-flex items-center gap-1.5">
        <Swatch color={it.color} />
        {it.label}
        {it.value && <strong className="text-slate-900 dark:text-white">{it.value}</strong>}
      </span>
    ))}
  </div>
);

const EmptyOverlay: React.FC<{ text: string }> = ({ text }) => (
  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
    <span className="rounded-full bg-slate-100/90 px-3 py-1 text-xs font-medium text-slate-500 dark:bg-slate-800/90 dark:text-slate-400">
      {text}
    </span>
  </div>
);

// ── Column chart (single series, vertical bars) ─────────────────────────────

export interface ColumnDatum {
  label: string;
  value: number;
  detail?: string;
}

export const ColumnChart: React.FC<{
  data: ColumnDatum[];
  color?: string;
  height?: number;
  formatValue?: (v: number) => string;
  formatAxis?: (v: number) => string;
  emptyText?: string;
  ariaLabel: string;
}> = ({ data, color = 'var(--series-2)', height = 220, formatValue = formatCount, formatAxis, emptyText = 'No data yet', ariaLabel }) => {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const axisFmt = formatAxis ?? formatValue;
  const max = Math.max(0, ...data.map((d) => d.value));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1] || 1;
  const pad = { l: 44, r: 8, t: 10, b: 26 };
  const innerW = Math.max(0, width - pad.l - pad.r);
  const innerH = height - pad.t - pad.b;
  const band = data.length ? innerW / data.length : 0;
  const barW = Math.max(2, Math.min(36, band * 0.62));
  const y = (v: number) => pad.t + innerH - (v / top) * innerH;
  const labelEvery = band < 34 ? Math.ceil(34 / Math.max(band, 1)) : 1;

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={ariaLabel}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={width - pad.r} y1={y(t)} y2={y(t)} stroke="var(--chart-grid)" strokeWidth={1} />
              <text x={pad.l - 6} y={y(t)} dy="0.32em" textAnchor="end" className="fill-slate-400 text-[10px]">
                {axisFmt(t)}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const cx = pad.l + band * i + band / 2;
            const h = innerH - (y(d.value) - pad.t);
            const active = hover === i;
            return (
              <g key={d.label}>
                {active && max > 0 && <rect x={pad.l + band * i} y={pad.t} width={band} height={innerH} className="fill-slate-100 dark:fill-slate-800/60" />}
                <path
                  d={vBarPath(cx - barW / 2, y(d.value), barW, h)}
                  fill={color}
                  opacity={hover === null || active ? 1 : 0.55}
                />
                {i % labelEvery === 0 && (
                  <text x={cx} y={height - 8} textAnchor="middle" className="fill-slate-500 text-[10px] dark:fill-slate-400">
                    {d.label}
                  </text>
                )}
                <rect
                  x={pad.l + band * i}
                  y={pad.t}
                  width={band}
                  height={innerH + pad.b}
                  fill="transparent"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                />
              </g>
            );
          })}
        </svg>
      )}
      {max === 0 && <EmptyOverlay text={emptyText} />}
      {hover !== null && max > 0 && data[hover] && (
        <Tooltip x={pad.l + band * hover + band / 2} y={y(data[hover].value)} containerWidth={width}>
          <p className="font-semibold text-slate-900 dark:text-white">{data[hover].label}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <Swatch color={color} /> {formatValue(data[hover].value)}
          </p>
          {data[hover].detail && <p className="text-slate-400">{data[hover].detail}</p>}
        </Tooltip>
      )}
    </div>
  );
};

// ── Horizontal bar chart (1+ series, grouped) ───────────────────────────────

export interface HBarRow {
  label: string;
  values: number[];
}

export const HBarChart: React.FC<{
  rows: HBarRow[];
  series: Array<{ name: string; color: string }>;
  formatValue?: (v: number) => string;
  barHeight?: number;
  emptyText?: string;
  ariaLabel: string;
}> = ({ rows, series, formatValue = formatCount, barHeight = 12, emptyText = 'No data yet', ariaLabel }) => {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(0, ...rows.flatMap((r) => r.values));
  const labelW = Math.min(120, Math.max(64, width * 0.28));
  const valueW = 56;
  const maxChars = Math.max(6, Math.floor((labelW - 10) / 6)); // ~6px per char at 11px
  const gap = 2; // surface gap between grouped bars
  const groupH = series.length * barHeight + (series.length - 1) * gap;
  const rowH = groupH + 14;
  const height = Math.max(rowH * rows.length, 40);
  const innerW = Math.max(0, width - labelW - valueW);
  const x = (v: number) => (max > 0 ? (v / max) * innerW : 0);

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={ariaLabel}>
          <line x1={labelW} x2={labelW} y1={0} y2={height} stroke="var(--chart-grid)" />
          {rows.map((row, ri) => {
            const y0 = ri * rowH + (rowH - groupH) / 2;
            const active = hover === ri;
            return (
              <g key={row.label}>
                {active && <rect x={0} y={ri * rowH} width={width} height={rowH} rx={6} className="fill-slate-100 dark:fill-slate-800/60" />}
                <text x={labelW - 8} y={y0 + groupH / 2} dy="0.32em" textAnchor="end" className="fill-slate-600 text-[11px] font-medium dark:fill-slate-300">
                  {row.label.length > maxChars ? `${row.label.slice(0, maxChars - 1)}…` : row.label}
                </text>
                {row.values.map((v, si) => {
                  const by = y0 + si * (barHeight + gap);
                  return (
                    <g key={si}>
                      <path d={hBarPath(labelW, by, x(v), barHeight)} fill={series[si].color} opacity={hover === null || active ? 1 : 0.55} />
                      {v > 0 && (
                        <text x={labelW + x(v) + 6} y={by + barHeight / 2} dy="0.32em" className="fill-slate-700 text-[10.5px] font-semibold dark:fill-slate-200">
                          {formatValue(v)}
                        </text>
                      )}
                    </g>
                  );
                })}
                <rect
                  x={0}
                  y={ri * rowH}
                  width={width}
                  height={rowH}
                  fill="transparent"
                  onMouseEnter={() => setHover(ri)}
                  onMouseLeave={() => setHover(null)}
                />
              </g>
            );
          })}
        </svg>
      )}
      {max === 0 && <EmptyOverlay text={emptyText} />}
      {hover !== null && max > 0 && rows[hover] && series.length > 1 && (
        <Tooltip x={labelW + x(Math.max(...rows[hover].values))} y={hover * rowH} containerWidth={width}>
          <p className="font-semibold text-slate-900 dark:text-white">{rows[hover].label}</p>
          {series.map((s, si) => (
            <p key={s.name} className="mt-0.5 flex items-center justify-between gap-3 text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1.5"><Swatch color={s.color} />{s.name}</span>
              <strong className="text-slate-900 dark:text-white">{formatValue(rows[hover].values[si])}</strong>
            </p>
          ))}
        </Tooltip>
      )}
    </div>
  );
};

// ── Donut (part-to-whole, few segments) ─────────────────────────────────────

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

export const DonutChart: React.FC<{
  segments: DonutSegment[];
  centerLabel: string;
  size?: number;
  formatValue?: (v: number) => string;
  ariaLabel: string;
}> = ({ segments, centerLabel, size = 168, formatValue = formatCount, ariaLabel }) => {
  const [hover, setHover] = useState<number | null>(null);
  const total = segments.reduce((s, x) => s + x.value, 0);
  const stroke = 22;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const visible = segments.filter((s) => s.value > 0).length;
  const gapLen = visible > 1 ? 3 : 0;
  let offset = 0;
  const shown = hover !== null ? segments[hover] : null;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} role="img" aria-label={ariaLabel} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--chart-grid)" strokeWidth={stroke} />
          {total > 0 &&
            segments.map((s, i) => {
              const len = (s.value / total) * c;
              const dash = Math.max(0, len - gapLen);
              const el = (
                <circle
                  key={s.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={hover === i ? stroke + 4 : stroke}
                  strokeDasharray={`${dash} ${c - dash}`}
                  strokeDashoffset={-offset}
                  opacity={hover === null || hover === i ? 1 : 0.5}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  className="cursor-pointer transition-all"
                />
              );
              offset += len;
              return s.value > 0 ? el : null;
            })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {formatValue(shown ? shown.value : total)}
          </span>
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {shown ? shown.label : centerLabel}
          </span>
        </div>
      </div>
      <ul className="w-full max-w-[200px] space-y-2 text-sm">
        {segments.map((s, i) => (
          <li
            key={s.label}
            className="flex items-center justify-between gap-3 rounded-md px-2 py-1 transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <Swatch color={s.color} />
              {s.label}
            </span>
            <span className="text-right">
              <strong className="text-slate-900 dark:text-white">{formatValue(s.value)}</strong>
              <span className="ml-1.5 text-xs text-slate-400">{total ? Math.round((s.value / total) * 100) : 0}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};
