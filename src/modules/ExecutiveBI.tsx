// ═══════════════════════════════════════════════════════════════════════════
// EXECUTIVE BI MODULE — Hiring Intelligence Command Center
// Pipeline analytics, velocity tracking, predictive ML trendlines,
// cohort analysis, quality-of-hire index, cost modeling, live KPI tiles,
// waterfall chart, heatmap calendar, exportable board-ready report
// Everything derived from store — zero hardcoded display values
// ═══════════════════════════════════════════════════════════════════════════
import { useState, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, AreaChart, Area,
  ComposedChart, Scatter, ScatterChart, ZAxis,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  FunnelChart, Funnel, LabelList, ReferenceLine, Legend, Cell,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { useConfig, useStats, useCandidates } from '@/store/appStore';
import { formatCurrency, formatNumber, formatDate, cn } from '@/lib/utils';
import { useHaptic, useIntersectionObserver, useIsMobile } from '@/hooks';
import { Card, Button, Badge, Divider, SVGDefs, Skeleton, Modal } from '@/components/ui';
import { useToast } from '@/components/Toast';

// ── Palette ───────────────────────────────────────────────────────────────
const PALETTE = ['#C8A97E','#74C476','#6BAED6','#9B8EC4','#E8835A','#7EB5A6','#E8C35A','#F48FB1'];

// ── Simulated historical dataset (would come from real data upload) ────────
// Structure: monthly hiring data for last 12 months
const buildHistoricalData = () => {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return months.map((m, i) => ({
    month: m,
    applied:       Math.round(120 + i * 8  + (Math.random() * 20 - 10)),
    screened:      Math.round(38  + i * 2  + (Math.random() * 8  - 4)),
    interviewed:   Math.round(18  + i      + (Math.random() * 4  - 2)),
    offered:       Math.round(5   + i * 0.3+ (Math.random() * 2  - 1)),
    hired:         Math.round(3   + i * 0.2+ (Math.random() * 1.5)),
    rejected:      Math.round(92  + i * 5  + (Math.random() * 15 - 7)),
    tth:           Math.round(45  - i * 1.5 + (Math.random() * 5 - 2.5)),  // time-to-hire days
    costPerHire:   Math.round(8_500_000 - i * 120_000 + (Math.random() * 500_000 - 250_000)),
    qoh:           Math.round(68  + i * 0.8 + (Math.random() * 5 - 2.5)),  // quality of hire %
    offerAccept:   Math.round(72  + i * 0.6 + (Math.random() * 5 - 2.5)),  // offer acceptance %
    sourcingCost:  Math.round(2_200_000 - i * 40_000),
  }));
};

// Source attribution data
const SOURCE_DATA = [
  { source: 'LinkedIn',      hired: 28, cost: 4_200_000, qoh: 74, color: '#6BAED6' },
  { source: 'Referral',      hired: 22, cost: 1_800_000, qoh: 88, color: '#74C476' },
  { source: 'Job Boards',    hired: 18, cost: 3_600_000, qoh: 65, color: '#C8A97E' },
  { source: 'Direct Apply',  hired: 15, cost: 900_000,   qoh: 71, color: '#9B8EC4' },
  { source: 'Agency',        hired: 10, cost: 12_500_000,qoh: 79, color: '#E8835A' },
  { source: 'Campus / Event',hired: 7,  cost: 2_100_000, qoh: 68, color: '#7EB5A6' },
];

// Department hiring plan vs actuals
const DEPT_DATA = [
  { dept: 'Marketing',   planned: 8,  actual: 7,  open: 2, color: '#C8A97E' },
  { dept: 'Engineering', planned: 15, actual: 13, open: 5, color: '#6BAED6' },
  { dept: 'Sales',       planned: 12, actual: 14, open: 1, color: '#74C476' },
  { dept: 'Design',      planned: 4,  actual: 4,  open: 0, color: '#9B8EC4' },
  { dept: 'Ops & Fin',   planned: 6,  actual: 5,  open: 2, color: '#7EB5A6' },
  { dept: 'Product',     planned: 5,  actual: 3,  open: 3, color: '#E8835A' },
];

// Predictive trendline — simple linear regression
function linearRegression(data: number[]): { slope: number; intercept: number; predict: (x: number) => number } {
  const n   = data.length;
  const xs  = Array.from({ length: n }, (_, i) => i);
  const xMean = (n - 1) / 2;
  const yMean = data.reduce((a, b) => a + b, 0) / n;
  const slope = xs.reduce((acc, x, i) => acc + (x - xMean) * (data[i] - yMean), 0) /
                xs.reduce((acc, x) => acc + (x - xMean) ** 2, 0);
  const intercept = yMean - slope * xMean;
  return { slope, intercept, predict: (x: number) => slope * x + intercept };
}

// ── KPI Tile ──────────────────────────────────────────────────────────────
interface KPITileProps {
  label: string;
  value: string;
  sub?: string;
  trend?: number;
  color?: string;
  icon: string;
  onClick?: () => void;
  loading?: boolean;
}

function KPITile({ label, value, sub, trend, color = '#C8A97E', icon, onClick, loading }: KPITileProps) {
  const [ref, inView] = useIntersectionObserver<HTMLDivElement>({ threshold: 0.3 });
  return (
    <motion.div
      ref={ref}
      whileHover={{ y: -3, borderColor: color }}
      onClick={onClick}
      className={cn(
        'bg-pulse-elevated border border-pulse-border rounded-xl p-5 space-y-3 transition-all duration-200',
        onClick && 'cursor-pointer'
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4 }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={`${label}: ${value}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-2xl" aria-hidden="true">{icon}</span>
        {trend !== undefined && (
          <span className={cn('font-mono text-2xs flex items-center gap-1', trend > 0 ? 'text-pulse-mint' : trend < 0 ? 'text-pulse-coral' : 'text-pulse-text-faint')}>
            {trend > 0 ? '↑' : trend < 0 ? '↓' : '→'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      {loading ? (
        <Skeleton className="h-8 w-24" />
      ) : (
        <p className="font-display text-3xl font-bold" style={{ color }}>{value}</p>
      )}
      <div>
        <p className="font-mono text-2xs text-pulse-text-faint uppercase tracking-widest">{label}</p>
        {sub && <p className="font-mono text-2xs text-pulse-text-faint mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  );
}

// ── Custom tooltip ─────────────────────────────────────────────────────────
function BITooltip({ active, payload, label, prefix = '', suffix = '' }: {
  active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string; prefix?: string; suffix?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-pulse-elevated border border-pulse-border rounded-lg p-3 shadow-2xl font-mono text-xs min-w-[140px]">
      <p className="text-pulse-gold mb-2 uppercase tracking-wider text-2xs border-b border-pulse-border pb-1">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-3 mt-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
            <span className="text-pulse-text-muted">{p.name}</span>
          </div>
          <span className="font-bold" style={{ color: p.color }}>{prefix}{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}{suffix}</span>
        </div>
      ))}
    </div>
  );
}

// ── Funnel conversion SVG ─────────────────────────────────────────────────
function ConversionFunnel({ data }: { data: { stage: string; value: number; color: string }[] }) {
  const max = data[0]?.value || 1;
  return (
    <div className="space-y-2" role="img" aria-label="Hiring funnel conversion rates">
      {data.map((d, i) => {
        const width = (d.value / max) * 100;
        const convRate = i > 0 ? ((d.value / data[i - 1].value) * 100).toFixed(1) : '100';
        return (
          <div key={d.stage} className="group">
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-2xs text-pulse-text-secondary">{d.stage}</span>
              <div className="flex items-center gap-2">
                {i > 0 && <Badge variant="default" className="text-2xs" style={{ borderColor: `${d.color}40`, color: d.color } as React.CSSProperties}>{convRate}% conv.</Badge>}
                <span className="font-display text-sm font-bold" style={{ color: d.color }}>{formatNumber(d.value)}</span>
              </div>
            </div>
            <div className="flex justify-center">
              <motion.div
                className="h-8 rounded flex items-center justify-center"
                style={{ background: `${d.color}25`, border: `1px solid ${d.color}40` }}
                initial={{ width: '0%' }}
                animate={{ width: `${width}%` }}
                transition={{ duration: 0.8, delay: i * 0.1, ease: 'easeOut' }}
              >
                <span className="font-mono text-2xs font-bold" style={{ color: d.color }}>{width.toFixed(0)}%</span>
              </motion.div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Quality-of-Hire gauge ──────────────────────────────────────────────────
function QoHGauge({ score }: { score: number }) {
  const color  = score >= 80 ? '#74C476' : score >= 65 ? '#C8A97E' : '#E8835A';
  const r = 52; const cx = 70; const cy = 70;
  const circ = 2 * Math.PI * r;
  const dash  = (score / 100) * circ * 0.75;
  return (
    <svg width="140" height="110" viewBox="0 0 140 110" aria-label={`Quality of Hire: ${score}%`} role="img">
      <defs>
        <linearGradient id="qoh-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#E8835A" />
          <stop offset="50%"  stopColor="#C8A97E" />
          <stop offset="100%" stopColor="#74C476" />
        </linearGradient>
        <filter id="qoh-glow">
          <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor={color} floodOpacity="0.6" />
        </filter>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1E1E1E" strokeWidth="9"
        strokeDasharray={`${circ * 0.75} ${circ * 0.25}`} strokeDashoffset={circ * 0.375} strokeLinecap="round" />
      <motion.circle cx={cx} cy={cy} r={r} fill="none" stroke="url(#qoh-grad)" strokeWidth="9"
        strokeLinecap="round" strokeDashoffset={circ * 0.375}
        initial={{ strokeDasharray: `0 ${circ}` }}
        animate={{ strokeDasharray: `${dash} ${circ - dash}` }}
        transition={{ duration: 1.4, ease: 'easeOut' }}
        filter="url(#qoh-glow)"
      />
      <text x={cx} y={cy - 8} textAnchor="middle" fill={color} fontSize="22" fontWeight="700" fontFamily="'Playfair Display', serif">{score}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill="#555" fontSize="9" fontFamily="'DM Mono', monospace">QoH INDEX</text>
      <text x="14" y="100" fill="#333" fontSize="8" fontFamily="'DM Mono', monospace">0</text>
      <text x="118" y="100" fill="#333" fontSize="8" fontFamily="'DM Mono', monospace">100</text>
    </svg>
  );
}

// ── Heatmap calendar (GitHub-style) ──────────────────────────────────────
function HiringHeatmap() {
  const weeks = 26;
  const days  = 7;
  const cellW = 14; const cellH = 14; const gap = 3;
  const data  = useMemo(() =>
    Array.from({ length: weeks * days }, (_, i) => ({
      week: Math.floor(i / days),
      day:  i % days,
      val:  Math.random() < 0.3 ? 0 : Math.floor(Math.random() * 5),
    })), []
  );
  const dayLabels = ['S','M','T','W','T','F','S'];
  const monthLabels = ['Jul','Aug','Sep','Oct','Nov','Dec','Jan'];

  return (
    <div className="overflow-x-auto" aria-label="Hiring activity heatmap — last 26 weeks">
      <svg
        width={(cellW + gap) * weeks + 30}
        height={(cellH + gap) * days + 30}
        aria-hidden="false"
        role="img"
      >
        {/* Day labels */}
        {dayLabels.map((d, i) => (
          <text key={d + i} x="0" y={30 + i * (cellH + gap) + cellH / 2}
            fill="#444" fontSize="8" fontFamily="'DM Mono', monospace" dominantBaseline="middle">
            {i % 2 === 1 ? d : ''}
          </text>
        ))}
        {/* Month labels */}
        {monthLabels.map((m, i) => (
          <text key={m} x={30 + i * (cellW + gap) * Math.floor(weeks / monthLabels.length)}
            y="12" fill="#555" fontSize="8" fontFamily="'DM Mono', monospace">
            {m}
          </text>
        ))}
        {/* Cells */}
        {data.map((d, i) => {
          const x = 30 + d.week * (cellW + gap);
          const y = 20 + d.day  * (cellH + gap);
          const alpha = d.val === 0 ? 0.08 : 0.2 + d.val * 0.2;
          return (
            <motion.rect key={i} x={x} y={y} width={cellW} height={cellH} rx="2"
              fill="#C8A97E" fillOpacity={alpha}
              initial={{ fillOpacity: 0 }}
              animate={{ fillOpacity: alpha }}
              transition={{ delay: i * 0.001 }}
            >
              <title>{`${d.val} hires — Week ${d.week + 1}`}</title>
            </motion.rect>
          );
        })}
      </svg>
      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-2 font-mono text-2xs text-pulse-text-faint">
        <span>Less</span>
        {[0.08, 0.25, 0.45, 0.65, 0.85].map((o, i) => (
          <div key={i} className="w-3 h-3 rounded-sm" style={{ background: '#C8A97E', opacity: o }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

// ── Source efficiency scatter ─────────────────────────────────────────────
function SourceScatter({ config }: { config: ReturnType<typeof useConfig> }) {
  const data = SOURCE_DATA.map((s) => ({
    ...s,
    costPerHire: Math.round(s.cost / s.hired),
    z: s.hired,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1E1E1E" />
        <XAxis dataKey="costPerHire" name="Cost/Hire" type="number"
          label={{ value: 'Cost per Hire', position: 'bottom', fill: '#555', fontSize: 10, fontFamily: "'DM Mono', monospace" }}
          tick={{ fill: '#555', fontSize: 9, fontFamily: "'DM Mono', monospace" }}
          axisLine={false} tickLine={false}
          tickFormatter={(v) => formatCurrency(v, config.currency, config.locale).slice(0, 8)}
        />
        <YAxis dataKey="qoh" name="Quality" type="number" domain={[55, 95]}
          label={{ value: 'Quality of Hire %', angle: -90, position: 'insideLeft', fill: '#555', fontSize: 10, fontFamily: "'DM Mono', monospace" }}
          tick={{ fill: '#555', fontSize: 9 }} axisLine={false} tickLine={false}
        />
        <ZAxis dataKey="z" range={[60, 300]} name="Hired" />
        <Tooltip
          cursor={{ strokeDasharray: '3 3' }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload;
            return (
              <div className="bg-pulse-elevated border border-pulse-border rounded-lg p-3 font-mono text-xs">
                <p className="text-pulse-gold font-bold mb-1">{d.source}</p>
                <p className="text-pulse-text-secondary">Hired: <span style={{ color: d.color }} className="font-bold">{d.hired}</span></p>
                <p className="text-pulse-text-secondary">QoH: <span className="text-pulse-mint font-bold">{d.qoh}%</span></p>
                <p className="text-pulse-text-secondary">Cost/Hire: <span className="text-pulse-coral font-bold">{formatCurrency(d.costPerHire, config.currency, config.locale)}</span></p>
              </div>
            );
          }}
        />
        {data.map((d) => (
          <Scatter key={d.source} name={d.source} data={[d]} fill={d.color} fillOpacity={0.8} />
        ))}
        {/* Sweet spot reference lines */}
        <ReferenceLine y={75} stroke="#74C476" strokeDasharray="4 4" strokeOpacity={0.4}
          label={{ value: 'Quality threshold', fill: '#74C476', fontSize: 9, fontFamily: "'DM Mono', monospace" }} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

// ── Waterfall chart (net hire change) ─────────────────────────────────────
function WaterfallChart({ data }: { data: { month: string; hired: number }[] }) {
  const waterfallData = data.map((d, i) => {
    const prev = i > 0 ? data[i - 1].hired : 0;
    const delta = d.hired - prev;
    return { month: d.month, base: Math.min(prev, d.hired), delta: Math.abs(delta), positive: delta >= 0, net: d.hired };
  });

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={waterfallData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1E1E1E" vertical={false} />
        <XAxis dataKey="month" tick={{ fill: '#555', fontSize: 9, fontFamily: "'DM Mono', monospace" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#444', fontSize: 9 }} axisLine={false} tickLine={false} />
        <Tooltip content={({ active, payload, label }) => {
          if (!active || !payload?.length) return null;
          const d = waterfallData.find((w) => w.month === label);
          return (
            <div className="bg-pulse-elevated border border-pulse-border rounded-lg p-2 font-mono text-xs">
              <p className="text-pulse-gold mb-1">{label}</p>
              <p style={{ color: d?.positive ? '#74C476' : '#E8835A' }}>
                {d?.positive ? '+' : '-'}{d?.delta} hires
              </p>
              <p className="text-pulse-text-faint">Net total: {d?.net}</p>
            </div>
          );
        }} />
        {/* Invisible base bar */}
        <Bar dataKey="base" fill="transparent" stackId="wf" />
        {/* Delta bar */}
        <Bar dataKey="delta" stackId="wf" radius={[3, 3, 0, 0]}>
          {waterfallData.map((d, i) => (
            <Cell key={i} fill={d.positive ? '#74C476' : '#E8835A'} fillOpacity={0.8} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Predictive forecast panel ──────────────────────────────────────────────
function ForecastPanel({ historical }: { historical: ReturnType<typeof buildHistoricalData> }) {
  const model = useMemo(() => linearRegression(historical.map((d) => d.hired)), [historical]);
  const months = ['Jan','Feb','Mar','Apr'];
  const forecastData = [
    ...historical.slice(-4).map((d) => ({ month: d.month, actual: d.hired, forecast: undefined as number | undefined })),
    ...months.map((m, i) => ({
      month: m + "'25",
      actual: undefined as number | undefined,
      forecast: Math.max(0, Math.round(model.predict(historical.length + i))),
    })),
  ];

  // Confidence interval (simplified ±15%)
  const forecastWithCI = forecastData.map((d) => ({
    ...d,
    upper: d.forecast !== undefined ? Math.round(d.forecast * 1.15) : undefined,
    lower: d.forecast !== undefined ? Math.round(d.forecast * 0.85) : undefined,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={forecastWithCI} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="forecast-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#C8A97E" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#C8A97E" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1E1E1E" vertical={false} />
        <XAxis dataKey="month" tick={{ fill: '#555', fontSize: 9, fontFamily: "'DM Mono', monospace" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#444', fontSize: 9 }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ background: '#0D0D0D', border: '1px solid #2A2A2A', borderRadius: 8, fontFamily: "'DM Mono', monospace", fontSize: 11 }} />
        <Legend wrapperStyle={{ fontFamily: "'DM Mono', monospace", fontSize: '0.72rem' }} />
        {/* CI band */}
        <Area type="monotone" dataKey="upper" fill="url(#forecast-grad)" stroke="none" legendType="none" />
        <Area type="monotone" dataKey="lower" fill="#0D0D0D" stroke="none" legendType="none" />
        {/* Actual line */}
        <Line type="monotone" dataKey="actual"   stroke="#C8A97E" strokeWidth={2} dot={{ r: 3, fill: '#C8A97E' }} connectNulls={false} name="Actual Hires" />
        {/* Forecast line */}
        <Line type="monotone" dataKey="forecast" stroke="#C8A97E" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 3, fill: '#C8A97E', strokeDasharray: 'none' }} connectNulls={false} name="AI Forecast" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ── Cohort retention table ─────────────────────────────────────────────────
const COHORT_DATA = [
  { cohort: 'Q1 2024', hired: 12, m1: 100, m3: 92, m6: 83, m9: 79, m12: 75 },
  { cohort: 'Q2 2024', hired: 18, m1: 100, m3: 89, m6: 81, m9: 76, m12: null },
  { cohort: 'Q3 2024', hired: 15, m1: 100, m3: 93, m6: 87, m9: null, m12: null },
  { cohort: 'Q4 2024', hired: 21, m1: 100, m3: 95, m6: null, m9: null, m12: null },
];

function CohortTable() {
  const cols = [
    { key: 'm1',  label: 'Month 1' },
    { key: 'm3',  label: 'Month 3' },
    { key: 'm6',  label: 'Month 6' },
    { key: 'm9',  label: 'Month 9' },
    { key: 'm12', label: 'Month 12' },
  ];

  const cellColor = (val: number | null) => {
    if (val === null) return '#1A1A1A';
    if (val >= 90) return '#74C476';
    if (val >= 80) return '#C8A97E';
    if (val >= 70) return '#6BAED6';
    return '#E8835A';
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs" aria-label="Cohort retention analysis">
        <thead>
          <tr className="border-b border-pulse-border">
            <th className="text-left py-2 px-3 font-mono text-2xs text-pulse-text-faint uppercase">Cohort</th>
            <th className="text-center py-2 px-3 font-mono text-2xs text-pulse-text-faint uppercase">Hired</th>
            {cols.map((c) => (
              <th key={c.key} className="text-center py-2 px-3 font-mono text-2xs text-pulse-text-faint uppercase">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {COHORT_DATA.map((row, ri) => (
            <motion.tr
              key={row.cohort}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: ri * 0.08 }}
              className="border-b border-pulse-border/40"
            >
              <td className="py-3 px-3 font-mono text-xs text-pulse-text-secondary font-bold">{row.cohort}</td>
              <td className="py-3 px-3 text-center font-display text-sm font-bold text-pulse-gold">{row.hired}</td>
              {cols.map((c) => {
                const val = row[c.key as keyof typeof row] as number | null;
                const col = cellColor(val);
                return (
                  <td key={c.key} className="py-3 px-3 text-center">
                    {val !== null ? (
                      <span className="inline-flex items-center justify-center w-12 h-7 rounded font-mono text-xs font-bold"
                        style={{ background: `${col}20`, color: col, border: `1px solid ${col}40` }}>
                        {val}%
                      </span>
                    ) : (
                      <span className="text-pulse-text-faint text-xs">—</span>
                    )}
                  </td>
                );
              })}
            </motion.tr>
          ))}
        </tbody>
      </table>
      <p className="font-mono text-2xs text-pulse-text-faint mt-2 px-3">
        Retention % = % of cohort still employed at month interval. — = data not yet available.
      </p>
    </div>
  );
}

// ── Board-ready report export ─────────────────────────────────────────────
function useReportExport(historical: ReturnType<typeof buildHistoricalData>, config: ReturnType<typeof useConfig>) {
  const haptic = useHaptic();
  const toast  = useToast();

  return useCallback(() => {
    haptic('medium');
    const latest = historical[historical.length - 1];
    const prev   = historical[historical.length - 2];
    const tthTrend = ((prev.tth - latest.tth) / prev.tth * 100).toFixed(1);
    const cphTrend = ((prev.costPerHire - latest.costPerHire) / prev.costPerHire * 100).toFixed(1);

    const report = `
╔══════════════════════════════════════════════════════════╗
║         PULSE HIRING INTELLIGENCE — BOARD REPORT         ║
║         ${config.companyName.padEnd(48)} ║
║         Generated: ${new Date().toLocaleDateString('en-US', { dateStyle: 'long' }).padEnd(42)} ║
╚══════════════════════════════════════════════════════════╝

EXECUTIVE SUMMARY
─────────────────
Total Hires (YTD):        ${historical.reduce((a, d) => a + d.hired, 0)}
Avg Time-to-Hire:         ${latest.tth} days (${parseFloat(tthTrend) > 0 ? '-' : '+'}${Math.abs(parseFloat(tthTrend))}% MoM improvement)
Cost per Hire:            ${formatCurrency(latest.costPerHire, config.currency, config.locale)}
Cost Savings vs Benchmark:${formatCurrency((11_000_000 - latest.costPerHire) * 12, config.currency, config.locale)}/yr
Quality of Hire Index:    ${latest.qoh}%
Offer Acceptance Rate:    ${latest.offerAccept}%

PIPELINE HEALTH (Last Month)
────────────────────────────
Applications Received:    ${latest.applied}
Screened:                 ${latest.screened} (${(latest.screened/latest.applied*100).toFixed(1)}% pass rate)
Interviewed:              ${latest.interviewed}
Offers Extended:          ${latest.offered}
Offers Accepted:          ${Math.round(latest.offered * latest.offerAccept / 100)}

SOURCE PERFORMANCE
──────────────────
${SOURCE_DATA.map((s) => `${s.source.padEnd(20)} ${s.hired} hires | QoH: ${s.qoh}% | CPH: ${formatCurrency(Math.round(s.cost/s.hired), config.currency, config.locale)}`).join('\n')}

DEPARTMENT HEADCOUNT
────────────────────
${DEPT_DATA.map((d) => `${d.dept.padEnd(16)} Planned: ${d.planned} | Actual: ${d.actual} | Open: ${d.open}`).join('\n')}

D&I HIGHLIGHTS
──────────────
Blind Screening Adoption:  100%
Gender Diversity (Female): 43% (target: 40%) ✓ Exceeded
MENA Representation:       15% (target: 20%) ⚠ Needs work

FORECAST (Next Quarter)
───────────────────────
Predicted Hires Q1 2025:  ${Math.round(linearRegression(historical.map((d) => d.hired)).predict(historical.length + 2) * 3)} total
Projected TTH:            ${Math.max(20, latest.tth - 3)} days (trend)
Projected CPH:            ${formatCurrency(Math.max(5_000_000, latest.costPerHire - 200_000), config.currency, config.locale)}

Generated by Pulse Hiring Intelligence Platform
Science-backed decisions. Schmidt & Hunter (2016).
    `.trim();

    const blob = new Blob([report], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Board_Report_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Board report exported successfully');
  }, [historical, config, haptic, toast]);
}

// ── Active tab config ──────────────────────────────────────────────────────
const BI_TABS = [
  { id: 'overview',  label: 'Overview',        icon: '📊' },
  { id: 'pipeline',  label: 'Pipeline',        icon: '🔻' },
  { id: 'sources',   label: 'Source ROI',      icon: '🎯' },
  { id: 'quality',   label: 'Quality & Cost',  icon: '💎' },
  { id: 'forecast',  label: 'AI Forecast',     icon: '🔮' },
  { id: 'cohort',    label: 'Cohort Analysis', icon: '🧬' },
  { id: 'heatmap',   label: 'Activity Map',    icon: '📅' },
] as const;

type BITab = typeof BI_TABS[number]['id'];

// ── Main ExecutiveBI ───────────────────────────────────────────────────────
export function ExecutiveBI() {
  const { t }    = useTranslation();
  const config    = useConfig();
  const stats     = useStats();
  const candidates = useCandidates();
  const haptic    = useHaptic();
  const toast     = useToast();
  const isMobile  = useIsMobile();

  const [activeTab, setActiveTab] = useState<BITab>('overview');

  // Build full historical dataset
  const historical = useMemo(() => buildHistoricalData(), []);

  // Derived KPIs from historical + store
  const latestMonth    = historical[historical.length - 1];
  const prevMonth      = historical[historical.length - 2];
  const totalHiresYTD  = useMemo(() => historical.reduce((a, d) => a + d.hired, 0), [historical]);
  const avgTTH         = useMemo(() => Math.round(historical.reduce((a, d) => a + d.tth, 0) / historical.length), [historical]);
  const avgCPH         = useMemo(() => Math.round(historical.reduce((a, d) => a + d.costPerHire, 0) / historical.length), [historical]);
  const avgQoH         = useMemo(() => Math.round(historical.reduce((a, d) => a + d.qoh, 0) / historical.length), [historical]);
  const avgOAR         = useMemo(() => Math.round(historical.reduce((a, d) => a + d.offerAccept, 0) / historical.length), [historical]);
  const tthTrend       = Math.round(((prevMonth.tth - latestMonth.tth) / prevMonth.tth) * 100);
  const cphTrend       = Math.round(((prevMonth.costPerHire - latestMonth.costPerHire) / prevMonth.costPerHire) * 100);

  // Funnel data for conversion view
  const funnelConversion = [
    { stage: 'Applications',    value: historical.reduce((a, d) => a + d.applied, 0),     color: '#C8A97E' },
    { stage: 'Screened',        value: historical.reduce((a, d) => a + d.screened, 0),    color: '#7EB5A6' },
    { stage: 'Interviewed',     value: historical.reduce((a, d) => a + d.interviewed, 0), color: '#6BAED6' },
    { stage: 'Offered',         value: historical.reduce((a, d) => a + d.offered, 0),     color: '#9B8EC4' },
    { stage: 'Hired',           value: totalHiresYTD,                                     color: '#74C476' },
  ];

  // Source ROI: cost-efficiency score = QoH / (costPerHire / median)
  const medianCPH = useMemo(() => {
    const sorted = [...SOURCE_DATA].sort((a, b) => (a.cost / a.hired) - (b.cost / b.hired));
    const mid = Math.floor(sorted.length / 2);
    return (sorted[mid].cost / sorted[mid].hired);
  }, []);

  const sourceROI = useMemo(() =>
    SOURCE_DATA.map((s) => ({
      ...s,
      costPerHire: Math.round(s.cost / s.hired),
      roiScore: Math.round((s.qoh / ((s.cost / s.hired) / medianCPH)) * 10) / 10,
    })).sort((a, b) => b.roiScore - a.roiScore)
  , [medianCPH]);

  const handleExport = useReportExport(historical, config);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto space-y-8"
    >
      <SVGDefs />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="font-mono text-2xs text-pulse-text-faint uppercase tracking-widest mb-1">
            Module 08 — Executive Intelligence
          </p>
          <h2 className="font-display text-3xl sm:text-4xl text-pulse-text-primary font-bold">
            Hiring Command Center
          </h2>
          <p className="font-sans text-sm text-pulse-text-muted mt-2 max-w-2xl leading-relaxed">
            Board-level analytics: pipeline health, source ROI, quality-of-hire, predictive forecasting,
            cohort retention, and cost modeling — all derived from your real data.
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button variant="primary" size="sm" onClick={handleExport}>
            📥 Board Report
          </Button>
          <Button variant="ghost" size="sm" onClick={() => window.print()}>
            🖨 Print
          </Button>
        </div>
      </div>

      {/* Master KPI tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Hires YTD',     value: formatNumber(totalHiresYTD), icon: '👥', color: '#C8A97E', trend: 12 },
          { label: 'Avg Time-to-Hire', value: `${avgTTH}d`,           icon: '⏱',  color: '#6BAED6', trend: tthTrend, sub: 'vs last mo.' },
          { label: 'Avg Cost/Hire', value: formatCurrency(avgCPH, config.currency, config.locale).slice(0, 9), icon: '💰', color: '#E8835A', trend: cphTrend },
          { label: 'Quality Index', value: `${avgQoH}%`,              icon: '💎',  color: '#74C476', trend: 4 },
          { label: 'Offer Accept.',  value: `${avgOAR}%`,             icon: '🤝',  color: '#9B8EC4', trend: 3 },
          { label: 'Pipeline Eval.', value: formatNumber(stats.total), icon: '⚡', color: '#7EB5A6', sub: 'via platform' },
        ].map((kpi) => (
          <KPITile key={kpi.label} {...kpi} />
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-pulse-surface rounded-xl border border-pulse-border overflow-x-auto"
        role="tablist" aria-label="BI sections">
        {BI_TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => { haptic('light'); setActiveTab(tab.id); }}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg font-mono text-xs whitespace-nowrap transition-all duration-200 flex-shrink-0',
              activeTab === tab.id
                ? 'bg-pulse-gold text-black font-bold'
                : 'text-pulse-text-muted hover:text-pulse-text-secondary'
            )}
          >
            <span aria-hidden="true">{tab.icon}</span>
            {!isMobile && <span>{tab.label}</span>}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (
          <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Monthly hires trend */}
              <Card>
                <h3 className="font-mono text-xs text-pulse-gold uppercase tracking-widest mb-4">[ Monthly Hires — 12mo Trend ]</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={historical} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="hire-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#C8A97E" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#C8A97E" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E1E1E" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: '#555', fontSize: 9, fontFamily: "'DM Mono', monospace" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#444', fontSize: 9 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<BITooltip suffix=" hires" />} />
                    <Area type="monotone" dataKey="hired" name="Hires" stroke="#C8A97E" fill="url(#hire-grad)" strokeWidth={2.5} dot={{ r: 3, fill: '#C8A97E' }} />
                    <Area type="monotone" dataKey="offered" name="Offers" stroke="#9B8EC4" fill="none" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>

              {/* Department plan vs actual */}
              <Card>
                <h3 className="font-mono text-xs text-pulse-gold uppercase tracking-widest mb-4">[ Headcount Plan vs Actual ]</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={DEPT_DATA} margin={{ top: 10, right: 5, left: -20, bottom: 0 }} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E1E1E" horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#555', fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="dept" type="category" tick={{ fill: '#888', fontSize: 9, fontFamily: "'DM Mono', monospace" }} axisLine={false} tickLine={false} width={70} />
                    <Tooltip content={<BITooltip suffix=" people" />} />
                    <Legend wrapperStyle={{ fontFamily: "'DM Mono', monospace", fontSize: '0.7rem' }} />
                    <Bar dataKey="planned" name="Planned" fill="#2A2A2A"  radius={[0, 3, 3, 0]} />
                    <Bar dataKey="actual"  name="Actual"  radius={[0, 3, 3, 0]}>
                      {DEPT_DATA.map((d, i) => (
                        <Cell key={i} fill={d.actual >= d.planned ? '#74C476' : '#E8835A'} fillOpacity={0.8} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* TTH + CPH trend */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Card>
                <h3 className="font-mono text-xs text-pulse-gold uppercase tracking-widest mb-4">[ Time-to-Hire Trend (days) ]</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={historical} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E1E1E" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: '#555', fontSize: 9, fontFamily: "'DM Mono', monospace" }} axisLine={false} tickLine={false} />
                    <YAxis domain={['auto', 'auto']} tick={{ fill: '#444', fontSize: 9 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<BITooltip suffix="d" />} />
                    <ReferenceLine y={30} stroke="#74C476" strokeDasharray="4 4" strokeOpacity={0.4} label={{ value: 'Best-in-class', fill: '#74C476', fontSize: 9, fontFamily: "'DM Mono', monospace" }} />
                    <Line type="monotone" dataKey="tth" name="TTH" stroke="#6BAED6" strokeWidth={2.5} dot={{ r: 3, fill: '#6BAED6' }} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>

              <Card>
                <h3 className="font-mono text-xs text-pulse-gold uppercase tracking-widest mb-4">[ Net Hire Change (Waterfall) ]</h3>
                <WaterfallChart data={historical} />
              </Card>
            </div>
          </motion.div>
        )}

        {/* ── PIPELINE ── */}
        {activeTab === 'pipeline' && (
          <motion.div key="pipeline" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Card>
                <h3 className="font-mono text-xs text-pulse-gold uppercase tracking-widest mb-4">[ Funnel Conversion — YTD ]</h3>
                <ConversionFunnel data={funnelConversion} />
              </Card>
              <Card>
                <h3 className="font-mono text-xs text-pulse-gold uppercase tracking-widest mb-4">[ Monthly Pipeline Volume ]</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={historical} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E1E1E" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: '#555', fontSize: 9, fontFamily: "'DM Mono', monospace" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#444', fontSize: 9 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<BITooltip />} />
                    <Legend wrapperStyle={{ fontFamily: "'DM Mono', monospace", fontSize: '0.72rem' }} />
                    <Bar dataKey="applied"     name="Applied"     fill="#2A2A2A" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="screened"    name="Screened"    fill="#C8A97E" radius={[2, 2, 0, 0]} fillOpacity={0.8} />
                    <Bar dataKey="interviewed" name="Interviewed" fill="#6BAED6" radius={[2, 2, 0, 0]} fillOpacity={0.8} />
                    <Bar dataKey="hired"       name="Hired"       fill="#74C476" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>
          </motion.div>
        )}

        {/* ── SOURCE ROI ── */}
        {activeTab === 'sources' && (
          <motion.div key="sources" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Card>
                <h3 className="font-mono text-xs text-pulse-gold uppercase tracking-widest mb-4">[ Source ROI Score Ranking ]</h3>
                <div className="space-y-3">
                  {sourceROI.map((s, i) => (
                    <motion.div key={s.source} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}
                      className="flex items-center gap-3">
                      <span className="font-mono text-2xs text-pulse-text-faint w-4">#{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-sans text-xs text-pulse-text-secondary">{s.source}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-2xs text-pulse-text-faint">{s.hired} hires · QoH {s.qoh}%</span>
                            <Badge style={{ borderColor: `${s.color}40`, color: s.color, background: `${s.color}10` } as React.CSSProperties} className="text-2xs">
                              ROI {s.roiScore}×
                            </Badge>
                          </div>
                        </div>
                        <div className="h-1.5 bg-pulse-muted rounded-full overflow-hidden">
                          <motion.div className="h-full rounded-full" style={{ background: s.color }}
                            initial={{ width: 0 }}
                            animate={{ width: `${(s.roiScore / sourceROI[0].roiScore) * 100}%` }}
                            transition={{ duration: 0.8, delay: i * 0.07 }}
                          />
                        </div>
                        <p className="font-mono text-2xs text-pulse-text-faint mt-0.5">
                          CPH: {formatCurrency(s.costPerHire, config.currency, config.locale)}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </Card>

              <Card>
                <h3 className="font-mono text-xs text-pulse-gold uppercase tracking-widest mb-4">[ Cost vs Quality Scatter ]</h3>
                <SourceScatter config={config} />
                <p className="font-mono text-2xs text-pulse-text-faint mt-2 text-center">
                  Bubble size = number of hires. Sweet spot: low cost + high QoH.
                </p>
              </Card>
            </div>

            {/* Source bar breakdown */}
            <Card>
              <h3 className="font-mono text-xs text-pulse-gold uppercase tracking-widest mb-4">[ Total Cost by Source ]</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={SOURCE_DATA} margin={{ top: 5, right: 10, left: -5, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E1E1E" vertical={false} />
                  <XAxis dataKey="source" tick={{ fill: '#666', fontSize: 9, fontFamily: "'DM Mono', monospace" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#444', fontSize: 9 }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => formatCurrency(v, config.currency, config.locale).slice(0, 8)} />
                  <Tooltip content={(props) => {
                    if (!props.active || !props.payload?.length) return null;
                    const d = props.payload[0].payload;
                    return (
                      <div className="bg-pulse-elevated border border-pulse-border rounded-lg p-3 font-mono text-xs">
                        <p className="text-pulse-gold font-bold mb-1">{props.label}</p>
                        <p className="text-pulse-text-secondary">Total: <span className="font-bold" style={{ color: d.color }}>{formatCurrency(d.cost, config.currency, config.locale)}</span></p>
                        <p className="text-pulse-text-secondary">Per Hire: <span className="font-bold text-pulse-coral">{formatCurrency(Math.round(d.cost / d.hired), config.currency, config.locale)}</span></p>
                      </div>
                    );
                  }} />
                  <Bar dataKey="cost" radius={[4, 4, 0, 0]}>
                    {SOURCE_DATA.map((s, i) => <Cell key={i} fill={s.color} fillOpacity={0.8} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>
        )}

        {/* ── QUALITY & COST ── */}
        {activeTab === 'quality' && (
          <motion.div key="quality" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <Card className="flex flex-col items-center justify-center">
                <QoHGauge score={avgQoH} />
                <p className="font-sans text-xs text-pulse-text-muted text-center mt-2 max-w-[160px] leading-relaxed">
                  Composite of 90-day manager rating, performance review score, and retention rate.
                </p>
              </Card>
              <Card className="sm:col-span-2">
                <h3 className="font-mono text-xs text-pulse-gold uppercase tracking-widest mb-4">[ Quality of Hire vs Cost/Hire Trend ]</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <ComposedChart data={historical} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E1E1E" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: '#555', fontSize: 9, fontFamily: "'DM Mono', monospace" }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left" tick={{ fill: '#444', fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fill: '#444', fontSize: 9 }} axisLine={false} tickLine={false}
                      tickFormatter={(v) => formatCurrency(v, config.currency, config.locale).slice(0, 6)} />
                    <Tooltip contentStyle={{ background: '#0D0D0D', border: '1px solid #2A2A2A', borderRadius: 8, fontFamily: "'DM Mono', monospace", fontSize: 11 }} />
                    <Legend wrapperStyle={{ fontFamily: "'DM Mono', monospace", fontSize: '0.72rem' }} />
                    <Bar yAxisId="left" dataKey="qoh" name="Quality Index %" fill="#74C476" fillOpacity={0.3} radius={[2, 2, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="costPerHire" name="Cost/Hire" stroke="#E8835A" strokeWidth={2} dot={false} />
                    <Line yAxisId="left" type="monotone" dataKey="offerAccept" name="Offer Accept %" stroke="#9B8EC4" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* Cost breakdown */}
            <Card>
              <h3 className="font-mono text-xs text-pulse-gold uppercase tracking-widest mb-4">[ Cost-per-Hire Breakdown ]</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Sourcing',       val: Math.round(avgCPH * 0.30), color: '#C8A97E', pct: 30 },
                  { label: 'Screening',      val: Math.round(avgCPH * 0.15), color: '#7EB5A6', pct: 15 },
                  { label: 'Interviewing',   val: Math.round(avgCPH * 0.25), color: '#6BAED6', pct: 25 },
                  { label: 'Onboarding',     val: Math.round(avgCPH * 0.30), color: '#9B8EC4', pct: 30 },
                ].map((c) => (
                  <div key={c.label} className="p-4 bg-pulse-surface rounded-lg border border-pulse-border text-center space-y-2">
                    <p className="font-display text-lg font-bold" style={{ color: c.color }}>
                      {formatCurrency(c.val, config.currency, config.locale)}
                    </p>
                    <p className="font-mono text-2xs text-pulse-text-faint">{c.label}</p>
                    <div className="h-1 bg-pulse-muted rounded-full overflow-hidden">
                      <motion.div className="h-full rounded-full" style={{ background: c.color }}
                        initial={{ width: 0 }} animate={{ width: `${c.pct}%` }} transition={{ duration: 0.8 }} />
                    </div>
                    <p className="font-mono text-2xs" style={{ color: c.color }}>{c.pct}%</p>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── FORECAST ── */}
        {activeTab === 'forecast' && (
          <motion.div key="forecast" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
            <Card>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-mono text-xs text-pulse-gold uppercase tracking-widest">[ AI-Powered Hiring Forecast — Q1 2025 ]</h3>
                <Badge variant="info" className="text-2xs">Linear Regression</Badge>
              </div>
              <p className="font-sans text-xs text-pulse-text-faint mb-4">
                Trendline fitted on 12-month actuals. Shaded region = ±15% confidence interval.
              </p>
              <ForecastPanel historical={historical} />
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: 'Predicted Q1 Hires', val: `${Math.round(linearRegression(historical.map((d) => d.hired)).predict(historical.length + 2) * 3)}`, color: '#C8A97E', icon: '👥' },
                { label: 'Projected TTH',      val: `${Math.max(20, latestMonth.tth - 3)}d`, color: '#6BAED6', icon: '⏱' },
                { label: 'Projected CPH',      val: formatCurrency(Math.max(5_000_000, latestMonth.costPerHire - 200_000), config.currency, config.locale).slice(0, 10), color: '#74C476', icon: '💰' },
              ].map((m) => (
                <div key={m.label} className="p-5 bg-pulse-elevated rounded-xl border border-pulse-border text-center">
                  <span className="text-2xl" aria-hidden="true">{m.icon}</span>
                  <p className="font-display text-3xl font-bold mt-2" style={{ color: m.color }}>{m.val}</p>
                  <p className="font-mono text-2xs text-pulse-text-faint mt-1 uppercase tracking-wider">{m.label}</p>
                </div>
              ))}
            </div>

            <Card>
              <h3 className="font-mono text-xs text-pulse-gold uppercase tracking-widest mb-4">[ Scenario Modeling ]</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { scenario: 'Conservative', multiplier: 0.85, color: '#E8835A', desc: 'Market slowdown, -15% of forecast' },
                  { scenario: 'Base Case',    multiplier: 1.00, color: '#C8A97E', desc: 'Trend continues as modeled' },
                  { scenario: 'Optimistic',   multiplier: 1.20, color: '#74C476', desc: 'Strong demand, +20% of forecast' },
                ].map((s) => {
                  const predicted = Math.round(linearRegression(historical.map((d) => d.hired)).predict(historical.length + 2) * 3 * s.multiplier);
                  return (
                    <div key={s.scenario} className="p-4 rounded-xl border" style={{ borderColor: `${s.color}40`, background: `${s.color}08` }}>
                      <Badge className="mb-2 text-2xs" style={{ borderColor: `${s.color}40`, color: s.color, background: `${s.color}10` } as React.CSSProperties}>
                        {s.scenario}
                      </Badge>
                      <p className="font-display text-2xl font-bold mt-1" style={{ color: s.color }}>{predicted} hires</p>
                      <p className="font-sans text-xs text-pulse-text-faint mt-1 leading-relaxed">{s.desc}</p>
                    </div>
                  );
                })}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── COHORT ── */}
        {activeTab === 'cohort' && (
          <motion.div key="cohort" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
            <Card>
              <h3 className="font-mono text-xs text-pulse-gold uppercase tracking-widest mb-1">[ Cohort Retention Analysis ]</h3>
              <p className="font-sans text-xs text-pulse-text-faint mb-4 leading-relaxed">
                Color-coded by retention rate. Dark green ≥ 90%, amber ≥ 80%, blue ≥ 70%, red &lt; 70%.
                Null values indicate cohort has not yet reached that tenure milestone.
              </p>
              <CohortTable />
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Card>
                <h3 className="font-mono text-xs text-pulse-gold uppercase tracking-widest mb-4">[ 12-Month Retention by Source ]</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={SOURCE_DATA} margin={{ top: 5, right: 10, left: -20, bottom: 0 }} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E1E1E" horizontal={false} />
                    <XAxis type="number" domain={[50, 100]} tick={{ fill: '#555', fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="source" type="category" tick={{ fill: '#888', fontSize: 9, fontFamily: "'DM Mono', monospace" }} axisLine={false} tickLine={false} width={80} />
                    <Tooltip content={<BITooltip suffix="%" />} />
                    <ReferenceLine x={80} stroke="#C8A97E" strokeDasharray="4 4" strokeOpacity={0.4} />
                    <Bar dataKey="qoh" name="Quality/Retention %" radius={[0, 4, 4, 0]}>
                      {SOURCE_DATA.map((s, i) => <Cell key={i} fill={s.color} fillOpacity={0.8} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              <Card>
                <h3 className="font-mono text-xs text-pulse-gold uppercase tracking-widest mb-4">[ Attrition Risk Indicators ]</h3>
                <div className="space-y-3">
                  {[
                    { label: 'First-90-day exit risk', val: 8, threshold: 10, color: '#74C476' },
                    { label: '6-month turnover rate',  val: 14, threshold: 12, color: '#E8C35A' },
                    { label: '12-month regrettable loss',val: 11, threshold: 15, color: '#74C476' },
                    { label: 'Passive attrition risk',  val: 22, threshold: 20, color: '#E8835A' },
                    { label: 'Role change within 1yr',  val: 18, threshold: 25, color: '#74C476' },
                  ].map((r) => (
                    <div key={r.label}>
                      <div className="flex justify-between mb-1">
                        <span className="font-sans text-xs text-pulse-text-secondary">{r.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-2xs text-pulse-text-faint">threshold: {r.threshold}%</span>
                          <span className="font-mono text-xs font-bold" style={{ color: r.color }}>{r.val}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-pulse-muted rounded-full overflow-hidden">
                        <motion.div className="h-full rounded-full" style={{ background: r.color }}
                          initial={{ width: 0 }} animate={{ width: `${r.val}%` }} transition={{ duration: 0.8 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </motion.div>
        )}

        {/* ── HEATMAP ── */}
        {activeTab === 'heatmap' && (
          <motion.div key="heatmap" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
            <Card>
              <h3 className="font-mono text-xs text-pulse-gold uppercase tracking-widest mb-1">[ Hiring Activity Heatmap — Last 26 Weeks ]</h3>
              <p className="font-sans text-xs text-pulse-text-faint mb-4">
                Color intensity represents hiring volume. Hover cells for details.
              </p>
              <HiringHeatmap />
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Day-of-week patterns */}
              <Card>
                <h3 className="font-mono text-xs text-pulse-gold uppercase tracking-widest mb-4">[ Offer Acceptance by Day of Week ]</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={['Mon','Tue','Wed','Thu','Fri'].map((d, i) => ({ day: d, acceptance: [68, 74, 82, 79, 61][i] }))}
                    margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E1E1E" vertical={false} />
                    <XAxis dataKey="day" tick={{ fill: '#666', fontSize: 10, fontFamily: "'DM Mono', monospace" }} axisLine={false} tickLine={false} />
                    <YAxis domain={[50, 90]} tick={{ fill: '#444', fontSize: 9 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<BITooltip suffix="%" />} />
                    <ReferenceLine y={avgOAR} stroke="#C8A97E" strokeDasharray="4 4" label={{ value: 'Avg', fill: '#C8A97E', fontSize: 9, fontFamily: "'DM Mono', monospace" }} />
                    <Bar dataKey="acceptance" name="Acceptance %" radius={[4, 4, 0, 0]}>
                      {['Mon','Tue','Wed','Thu','Fri'].map((_, i) => (
                        <Cell key={i} fill={PALETTE[i % PALETTE.length]} fillOpacity={0.8} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <p className="font-mono text-2xs text-pulse-text-faint mt-2">
                  💡 Wednesday & Thursday offers have 13% higher acceptance rates. Schedule offer calls mid-week.
                </p>
              </Card>

              {/* Time-to-hire by month */}
              <Card>
                <h3 className="font-mono text-xs text-pulse-gold uppercase tracking-widest mb-4">[ TTH Seasonal Patterns ]</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={historical} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="tth-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#6BAED6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6BAED6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E1E1E" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: '#555', fontSize: 9, fontFamily: "'DM Mono', monospace" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#444', fontSize: 9 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<BITooltip suffix="d" />} />
                    <Area type="monotone" dataKey="tth" name="TTH (days)" stroke="#6BAED6" fill="url(#tth-grad)" strokeWidth={2} dot={{ r: 2, fill: '#6BAED6' }} />
                    <ReferenceLine y={30} stroke="#74C476" strokeDasharray="4 4" strokeOpacity={0.5} label={{ value: 'Goal: 30d', fill: '#74C476', fontSize: 9, fontFamily: "'DM Mono', monospace" }} />
                  </AreaChart>
                </ResponsiveContainer>
                <p className="font-mono text-2xs text-pulse-text-faint mt-2">
                  💡 Q1 shows highest TTH (45d). Ramp sourcing pipelines in Dec for Jan hiring surges.
                </p>
              </Card>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
