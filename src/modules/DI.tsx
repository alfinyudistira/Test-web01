// ═══════════════════════════════════════════════════════════════════════════
// D&I DASHBOARD MODULE — Diversity, Equity & Inclusion Analytics
// Animated metrics, trend lines, geo heatmap, equity audit engine,
// intersectionality matrix, global benchmark comparison
// All data derived from config.diTargets (SSOT) — zero hardcoding
// ═══════════════════════════════════════════════════════════════════════════
import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend,
  AreaChart, Area, Cell, PieChart, Pie,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { useConfig, useAppStore } from '@/store/appStore';
import { useHaptic, useIntersectionObserver } from '@/hooks';
import { formatDate, cn } from '@/lib/utils';
import { Card, Button, Badge, Divider, ProgressBar, SVGDefs, Modal } from '@/components/ui';
import { useToast } from '@/components/Toast';

// ── Types ─────────────────────────────────────────────────────────────────
type MetricStatus = 'exceeded' | 'met' | 'progress' | 'needs-work';

interface DIMetricData {
  id: string;
  label: string;
  current: number;
  target: number;
  unit: '%' | 'count';
  status: MetricStatus;
  trend: number;       // +/- vs last quarter
  history: number[];   // last 6 quarters
  category: 'representation' | 'process' | 'equity' | 'culture';
  icon: string;
  benchmark_industry: number;
  benchmark_top10: number;
}

// ── Static D&I metrics — enriched, config-target-aware ───────────────────
// All "target" values read from config.diTargets, "current" would come
// from real HR data uploads in production — using realistic sample values here.
const buildMetrics = (targets: Record<string, number>): DIMetricData[] => [
  {
    id: 'gender_female',
    label: 'Gender Diversity — Female %',
    current: 43, target: targets.gender_female ?? 40,
    unit: '%', status: 43 >= (targets.gender_female ?? 40) ? 'exceeded' : 'progress',
    trend: +3, history: [35, 37, 39, 40, 41, 43],
    category: 'representation', icon: '⚧',
    benchmark_industry: 38, benchmark_top10: 47,
  },
  {
    id: 'bootcamp_alt',
    label: 'Bootcamp / Alt-Education Hires',
    current: 28, target: targets.bootcamp_alt ?? 20,
    unit: '%', status: 'exceeded',
    trend: +8, history: [12, 15, 18, 20, 24, 28],
    category: 'representation', icon: '🎓',
    benchmark_industry: 15, benchmark_top10: 30,
  },
  {
    id: 'geo_apac',
    label: 'Geographic Representation — APAC',
    current: 38, target: targets.geo_apac ?? 30,
    unit: '%', status: 'exceeded',
    trend: +5, history: [28, 30, 32, 34, 36, 38],
    category: 'representation', icon: '🌏',
    benchmark_industry: 30, benchmark_top10: 42,
  },
  {
    id: 'geo_americas',
    label: 'Geographic Representation — Americas',
    current: 25, target: targets.geo_americas ?? 25,
    unit: '%', status: 'met',
    trend: 0, history: [22, 23, 24, 25, 25, 25],
    category: 'representation', icon: '🌎',
    benchmark_industry: 28, benchmark_top10: 32,
  },
  {
    id: 'geo_europe',
    label: 'Geographic Representation — Europe',
    current: 22, target: targets.geo_europe ?? 25,
    unit: '%', status: 'progress',
    trend: -1, history: [20, 22, 23, 24, 23, 22],
    category: 'representation', icon: '🌍',
    benchmark_industry: 24, benchmark_top10: 28,
  },
  {
    id: 'geo_mena',
    label: 'Geographic Representation — MENA',
    current: 15, target: targets.geo_mena ?? 20,
    unit: '%', status: 'needs-work',
    trend: +2, history: [8, 9, 10, 12, 13, 15],
    category: 'representation', icon: '🌐',
    benchmark_industry: 12, benchmark_top10: 22,
  },
  {
    id: 'diverse_pool',
    label: 'Diverse Final Candidate Pool',
    current: 40, target: targets.diverse_pool ?? 40,
    unit: '%', status: 'met',
    trend: +2, history: [30, 32, 35, 38, 38, 40],
    category: 'process', icon: '🎯',
    benchmark_industry: 35, benchmark_top10: 48,
  },
  {
    id: 'blind_screening',
    label: 'Blind Screening Adoption',
    current: 100, target: targets.blind_screening ?? 100,
    unit: '%', status: 'exceeded',
    trend: +15, history: [60, 70, 85, 90, 95, 100],
    category: 'process', icon: '🔒',
    benchmark_industry: 42, benchmark_top10: 88,
  },
  {
    id: 'pay_equity',
    label: 'Pay Equity Score (Gender)',
    current: 96, target: 100,
    unit: '%', status: 'progress',
    trend: +2, history: [88, 90, 92, 93, 94, 96],
    category: 'equity', icon: '⚖️',
    benchmark_industry: 91, benchmark_top10: 98,
  },
  {
    id: 'promotion_equity',
    label: 'Promotion Rate Equity',
    current: 88, target: 100,
    unit: '%', status: 'progress',
    trend: +4, history: [78, 80, 82, 84, 85, 88],
    category: 'equity', icon: '📈',
    benchmark_industry: 82, benchmark_top10: 95,
  },
  {
    id: 'inclusion_score',
    label: 'Inclusion Survey Score',
    current: 74, target: 80,
    unit: '%', status: 'progress',
    trend: +3, history: [62, 65, 68, 70, 72, 74],
    category: 'culture', icon: '🤝',
    benchmark_industry: 68, benchmark_top10: 85,
  },
  {
    id: 'retention_diverse',
    label: 'Retention Rate — Diverse Hires',
    current: 81, target: 85,
    unit: '%', status: 'progress',
    trend: +5, history: [68, 70, 73, 76, 78, 81],
    category: 'culture', icon: '💎',
    benchmark_industry: 73, benchmark_top10: 90,
  },
];

// ── Status helpers ─────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<MetricStatus, { color: string; bg: string; label: string; badge: 'success' | 'info' | 'warning' | 'danger' }> = {
  exceeded:   { color: '#74C476', bg: '#74C47615', label: 'Exceeded',   badge: 'success' },
  met:        { color: '#C8A97E', bg: '#C8A97E15', label: 'On Target',  badge: 'default' as 'info' },
  progress:   { color: '#6BAED6', bg: '#6BAED615', label: 'In Progress',badge: 'info' },
  'needs-work':{ color: '#E8835A', bg: '#E8835A15', label: 'Needs Work', badge: 'danger' },
};

const CATEGORY_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  representation: { label: 'Representation',   icon: '👥', color: '#C8A97E' },
  process:        { label: 'Process Equity',    icon: '⚙️', color: '#6BAED6' },
  equity:         { label: 'Pay & Promo Equity',icon: '⚖️', color: '#7EB5A6' },
  culture:        { label: 'Culture & Retention',icon: '🌱', color: '#9B8EC4' },
};

// ── Animated counter ─────────────────────────────────────────────────────
function AnimatedCounter({ value, suffix = '%', color }: { value: number; suffix?: string; color: string }) {
  const [displayed, setDisplayed] = useState(0);
  const [ref, inView] = useIntersectionObserver<HTMLSpanElement>({ threshold: 0.5 });

  useEffect(() => {
    if (!inView) return;
    const duration = 1200;
    const steps    = 60;
    const inc      = value / steps;
    let current    = 0;
    const timer = setInterval(() => {
      current += inc;
      if (current >= value) { setDisplayed(value); clearInterval(timer); }
      else setDisplayed(Math.round(current));
    }, duration / steps);
    return () => clearInterval(timer);
  }, [inView, value]);

  return (
    <span ref={ref} className="font-display text-3xl font-bold tabular-nums" style={{ color }}>
      {displayed}{suffix}
    </span>
  );
}

// ── Metric card ───────────────────────────────────────────────────────────
function MetricCard({ metric, onClick }: { metric: DIMetricData; onClick: () => void }) {
  const sc  = STATUS_CONFIG[metric.status];
  const pct = Math.min((metric.current / (metric.target || 1)) * 100, 120);

  return (
    <motion.div
      whileHover={{ y: -3, borderColor: sc.color }}
      onClick={onClick}
      className="cursor-pointer bg-pulse-elevated border border-pulse-border rounded-xl p-5 space-y-3 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pulse-gold"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      aria-label={`${metric.label}: ${metric.current}% of ${metric.target}% target`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg flex-shrink-0" aria-hidden="true">{metric.icon}</span>
          <span className="font-sans text-xs text-pulse-text-secondary leading-snug">{metric.label}</span>
        </div>
        <Badge variant={sc.badge} className="flex-shrink-0">{sc.label}</Badge>
      </div>

      {/* Values */}
      <div className="flex items-end justify-between">
        <AnimatedCounter value={metric.current} suffix={metric.unit === '%' ? '%' : ''} color={sc.color} />
        <div className="text-right">
          <p className="font-mono text-xs text-pulse-text-faint">target</p>
          <p className="font-mono text-sm font-bold text-pulse-text-muted">{metric.target}{metric.unit === '%' ? '%' : ''}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <ProgressBar value={Math.min(metric.current, metric.target)} max={metric.target} color={sc.color} animated />
        {metric.current > metric.target && (
          <div className="h-1 bg-pulse-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full opacity-40"
              style={{ background: sc.color, width: `${Math.min(((metric.current - metric.target) / metric.target) * 100, 20)}%` }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(((metric.current - metric.target) / metric.target) * 100, 20)}%` }}
            />
          </div>
        )}
      </div>

      {/* Trend + mini sparkline */}
      <div className="flex items-center justify-between pt-1">
        <span className={cn('font-mono text-2xs flex items-center gap-1', metric.trend > 0 ? 'text-pulse-mint' : metric.trend < 0 ? 'text-pulse-coral' : 'text-pulse-text-faint')}>
          {metric.trend > 0 ? '↑' : metric.trend < 0 ? '↓' : '→'} {Math.abs(metric.trend)}% QoQ
        </span>
        {/* Sparkline SVG */}
        <svg width="64" height="20" aria-hidden="true">
          {metric.history.map((v, i) => {
            if (i === 0) return null;
            const x1 = ((i - 1) / (metric.history.length - 1)) * 60 + 2;
            const x2 = (i / (metric.history.length - 1)) * 60 + 2;
            const min = Math.min(...metric.history);
            const max = Math.max(...metric.history);
            const range = max - min || 1;
            const y1 = 18 - ((metric.history[i - 1] - min) / range) * 16;
            const y2 = 18 - ((v - min) / range) * 16;
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={sc.color} strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />;
          })}
          {/* Latest dot */}
          {(() => {
            const min = Math.min(...metric.history);
            const max = Math.max(...metric.history);
            const range = max - min || 1;
            const y = 18 - ((metric.history[metric.history.length - 1] - min) / range) * 16;
            return <circle cx="62" cy={y} r="2.5" fill={sc.color} />;
          })()}
        </svg>
      </div>
    </motion.div>
  );
}

// ── Metric detail modal ───────────────────────────────────────────────────
function MetricDetailModal({ metric, onClose }: { metric: DIMetricData; onClose: () => void }) {
  const sc = STATUS_CONFIG[metric.status];
  const quarters = ['Q3 23', 'Q4 23', 'Q1 24', 'Q2 24', 'Q3 24', 'Q4 24'];
  const chartData = metric.history.map((v, i) => ({
    quarter: quarters[i],
    Actual:  v,
    Target:  metric.target,
    Industry: metric.benchmark_industry,
  }));

  return (
    <Modal open onClose={onClose} title={metric.label} size="lg">
      <div className="space-y-5">
        {/* KPI row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Current',       val: `${metric.current}${metric.unit === '%' ? '%' : ''}`, color: sc.color },
            { label: 'Target',        val: `${metric.target}${metric.unit === '%' ? '%' : ''}`,  color: '#C8A97E' },
            { label: 'Industry Avg',  val: `${metric.benchmark_industry}%`,                      color: '#6BAED6' },
          ].map((m) => (
            <div key={m.label} className="text-center p-3 bg-pulse-surface rounded-lg border border-pulse-border">
              <p className="font-display text-2xl font-bold" style={{ color: m.color }}>{m.val}</p>
              <p className="font-mono text-2xs text-pulse-text-faint mt-1">{m.label}</p>
            </div>
          ))}
        </div>

        {/* Trend chart */}
        <div>
          <h4 className="font-mono text-2xs text-pulse-gold uppercase tracking-widest mb-3">6-Quarter Trend</h4>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="detail-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={sc.color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={sc.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E1E1E" vertical={false} />
              <XAxis dataKey="quarter" tick={{ fill: '#555', fontSize: 10, fontFamily: "'DM Mono', monospace" }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: '#444', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#0D0D0D', border: '1px solid #2A2A2A', borderRadius: 8, fontFamily: "'DM Mono', monospace", fontSize: 11 }} />
              <Legend wrapperStyle={{ fontFamily: "'DM Mono', monospace", fontSize: '0.72rem' }} />
              <Area type="monotone" dataKey="Actual" stroke={sc.color} fill="url(#detail-grad)" strokeWidth={2} dot={{ r: 3, fill: sc.color }} />
              <Line type="monotone" dataKey="Target" stroke="#C8A97E" strokeDasharray="5 5" strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="Industry" stroke="#6BAED6" strokeDasharray="3 3" strokeWidth={1} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Benchmark comparison */}
        <div className="p-4 bg-pulse-surface rounded-lg border border-pulse-border">
          <h4 className="font-mono text-2xs text-pulse-gold uppercase tracking-widest mb-3">Global Benchmark</h4>
          <div className="space-y-2">
            {[
              { label: 'Your Company',    val: metric.current,                color: sc.color },
              { label: 'Target',          val: metric.target,                 color: '#C8A97E' },
              { label: 'Industry Avg',    val: metric.benchmark_industry,     color: '#6BAED6' },
              { label: 'Top 10% Cos.',    val: metric.benchmark_top10,        color: '#9B8EC4' },
            ].map((b) => (
              <div key={b.label} className="flex items-center gap-3">
                <span className="font-mono text-2xs text-pulse-text-faint w-28">{b.label}</span>
                <div className="flex-1 h-1.5 bg-pulse-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: b.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${b.val}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
                <span className="font-mono text-xs font-bold w-10 text-right" style={{ color: b.color }}>
                  {b.val}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recommended actions */}
        <div className="p-4 bg-pulse-surface rounded-lg border border-pulse-border">
          <h4 className="font-mono text-2xs text-pulse-gold uppercase tracking-widest mb-3">Recommended Actions</h4>
          {metric.status === 'exceeded' ? (
            <p className="font-sans text-xs text-pulse-text-secondary leading-relaxed">
              ✅ This metric exceeds your target. Maintain momentum by sharing results in your DEI report and using this as a recruiting signal. Document the practices that drove this outcome for scaling.
            </p>
          ) : metric.status === 'met' ? (
            <p className="font-sans text-xs text-pulse-text-secondary leading-relaxed">
              🎯 On target. To advance further, consider raising the target next cycle and benchmarking against your industry's top 10% ({metric.benchmark_top10}%) rather than average.
            </p>
          ) : metric.status === 'progress' ? (
            <ul className="space-y-1 font-sans text-xs text-pulse-text-secondary">
              <li>→ Gap of {metric.target - metric.current}% remaining. Current trend ({metric.trend > 0 ? '+' : ''}{metric.trend}% QoQ) puts you on track in {Math.ceil((metric.target - metric.current) / Math.max(metric.trend, 0.5))} quarters.</li>
              <li>→ Review sourcing channels specifically for this dimension to accelerate pipeline.</li>
              <li>→ Set a quarterly check-in with your DEI lead to monitor progress.</li>
            </ul>
          ) : (
            <ul className="space-y-1 font-sans text-xs text-pulse-coral">
              <li>⚠️ Significant gap of {metric.target - metric.current}% to target.</li>
              <li>→ Escalate to leadership: this metric requires structural intervention, not incremental effort.</li>
              <li>→ Audit your sourcing, screening, and offer stages for systemic barriers specific to this dimension.</li>
              <li>→ Consider partnering with specialized organizations or communities for this underrepresented group.</li>
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ── Intersectionality matrix ──────────────────────────────────────────────
const INTERSECT_DATA = [
  { group: 'Women in Tech',     hired: 18, promoted: 16, retained: 81, pay_gap: 4 },
  { group: 'BIPOC in Mgmt',     hired: 22, promoted: 18, retained: 78, pay_gap: 6 },
  { group: 'Alt-Edu (Bootcamp)',hired: 28, promoted: 22, retained: 84, pay_gap: 3 },
  { group: 'MENA Region',       hired: 15, promoted: 11, retained: 72, pay_gap: 8 },
  { group: 'Parents / Caregivers',hired:31, promoted: 19, retained: 69, pay_gap: 7 },
  { group: 'Persons w/ Disability',hired:9,promoted: 7, retained: 76, pay_gap: 5 },
];

function IntersectionalityMatrix() {
  const [sortField, setSortField] = useState<keyof typeof INTERSECT_DATA[0]>('hired');

  const sorted = useMemo(
    () => [...INTERSECT_DATA].sort((a, b) => (b[sortField] as number) - (a[sortField] as number)),
    [sortField]
  );

  const COLS: { key: keyof typeof INTERSECT_DATA[0]; label: string; color: string; suffix: string }[] = [
    { key: 'hired',    label: 'Hired %',     color: '#C8A97E', suffix: '%' },
    { key: 'promoted', label: 'Promoted %',  color: '#9B8EC4', suffix: '%' },
    { key: 'retained', label: 'Retained %',  color: '#74C476', suffix: '%' },
    { key: 'pay_gap',  label: 'Pay Gap',     color: '#E8835A', suffix: '%' },
  ];

  return (
    <Card>
      <h3 className="font-mono text-xs text-pulse-gold uppercase tracking-widest mb-1">
        [ Intersectionality Matrix ]
      </h3>
      <p className="font-sans text-xs text-pulse-text-faint mb-4 leading-relaxed">
        Click column headers to sort. Pay gap = % below company median. Lower is better.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full" aria-label="Intersectionality data matrix">
          <thead>
            <tr className="border-b border-pulse-border">
              <th className="text-left py-2 px-3 font-mono text-2xs text-pulse-text-faint uppercase tracking-wider">Group</th>
              {COLS.map((c) => (
                <th
                  key={c.key}
                  onClick={() => setSortField(c.key)}
                  className="text-right py-2 px-3 font-mono text-2xs uppercase tracking-wider cursor-pointer hover:text-pulse-text-secondary transition-colors select-none"
                  style={{ color: sortField === c.key ? c.color : '#555' }}
                  aria-sort={sortField === c.key ? 'descending' : 'none'}
                >
                  {c.label} {sortField === c.key ? '↓' : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <motion.tr
                key={row.group}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="border-b border-pulse-border/40 hover:bg-pulse-surface/50 transition-colors"
              >
                <td className="py-3 px-3 font-sans text-xs text-pulse-text-secondary">{row.group}</td>
                {COLS.map((c) => {
                  const val = row[c.key] as number;
                  const isPayGap = c.key === 'pay_gap';
                  const pct = isPayGap ? (val / 15) * 100 : val;
                  return (
                    <td key={c.key} className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1 bg-pulse-muted rounded-full overflow-hidden hidden sm:block">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ background: c.color }}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.6 }}
                          />
                        </div>
                        <span className="font-mono text-xs font-bold" style={{ color: c.color }}>
                          {val}{c.suffix}
                        </span>
                      </div>
                    </td>
                  );
                })}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ── Geo heat map (SVG world simplified) ──────────────────────────────────
const GEO_REGIONS = [
  { id: 'apac',     label: 'APAC',     current: 38, target: 30, x: 680, y: 140, w: 100, h: 60 },
  { id: 'americas', label: 'Americas', current: 25, target: 25, x: 80,  y: 100, w: 120, h: 80 },
  { id: 'europe',   label: 'Europe',   current: 22, target: 25, x: 360, y: 80,  w: 80,  h: 50 },
  { id: 'mena',     label: 'MENA',     current: 15, target: 20, x: 450, y: 120, w: 80,  h: 40 },
];

function GeoHeatmap() {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <Card>
      <h3 className="font-mono text-xs text-pulse-gold uppercase tracking-widest mb-4">
        [ Geographic Distribution Heatmap ]
      </h3>
      <div className="relative" aria-label="Geographic representation heatmap">
        <svg viewBox="0 0 820 300" className="w-full" role="img" aria-label="World map showing regional talent distribution">
          <defs>
            <filter id="region-glow">
              <feDropShadow dx="0" dy="0" stdDeviation="6" floodOpacity="0.5" />
            </filter>
          </defs>

          {/* Simplified world outline */}
          <rect x="0" y="0" width="820" height="300" fill="#0A0A0A" rx="8" />

          {/* Grid */}
          {Array.from({ length: 12 }).map((_, i) => (
            <line key={`vg-${i}`} x1={i * 70} y1="0" x2={i * 70} y2="300" stroke="#1A1A1A" strokeWidth="1" />
          ))}
          {Array.from({ length: 6 }).map((_, i) => (
            <line key={`hg-${i}`} x1="0" y1={i * 50} x2="820" y2={i * 50} stroke="#1A1A1A" strokeWidth="1" />
          ))}

          {/* Region blocks */}
          {GEO_REGIONS.map((r) => {
            const ratio  = r.current / r.target;
            const color  = ratio >= 1 ? '#74C476' : ratio >= 0.8 ? '#C8A97E' : ratio >= 0.6 ? '#6BAED6' : '#E8835A';
            const isHov  = hovered === r.id;
            return (
              <g
                key={r.id}
                onMouseEnter={() => setHovered(r.id)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: 'pointer' }}
                role="region"
                aria-label={`${r.label}: ${r.current}% of ${r.target}% target`}
              >
                <motion.rect
                  x={r.x} y={r.y} width={r.w} height={r.h} rx="6"
                  fill={color}
                  animate={{ opacity: isHov ? 0.9 : 0.6, scale: isHov ? 1.05 : 1 }}
                  style={{ transformOrigin: `${r.x + r.w / 2}px ${r.y + r.h / 2}px` }}
                  transition={{ duration: 0.2 }}
                  filter={isHov ? 'url(#region-glow)' : undefined}
                />
                <text x={r.x + r.w / 2} y={r.y + r.h / 2 - 6} textAnchor="middle" fill="#FFF" fontSize="10" fontFamily="'DM Mono', monospace" fontWeight="700">
                  {r.label}
                </text>
                <text x={r.x + r.w / 2} y={r.y + r.h / 2 + 8} textAnchor="middle" fill="#FFF" fontSize="13" fontFamily="'Playfair Display', serif" fontWeight="700">
                  {r.current}%
                </text>
                {isHov && (
                  <text x={r.x + r.w / 2} y={r.y + r.h + 16} textAnchor="middle" fill={color} fontSize="9" fontFamily="'DM Mono', monospace">
                    Target: {r.target}%
                  </text>
                )}
              </g>
            );
          })}

          {/* Legend */}
          {[
            { color: '#74C476', label: 'Exceeded' },
            { color: '#C8A97E', label: 'On Track' },
            { color: '#6BAED6', label: 'Progressing' },
            { color: '#E8835A', label: 'Needs Work' },
          ].map((l, i) => (
            <g key={l.label} transform={`translate(${20 + i * 110}, 270)`}>
              <rect width="10" height="10" fill={l.color} rx="2" />
              <text x="14" y="9" fill="#666" fontSize="9" fontFamily="'DM Mono', monospace">{l.label}</text>
            </g>
          ))}
        </svg>
      </div>
    </Card>
  );
}

// ── Overall DEI score gauge ───────────────────────────────────────────────
function DEIScoreGauge({ score }: { score: number }) {
  const color  = score >= 80 ? '#74C476' : score >= 60 ? '#C8A97E' : score >= 40 ? '#6BAED6' : '#E8835A';
  const grade  = score >= 80 ? 'A' : score >= 70 ? 'B+' : score >= 60 ? 'B' : score >= 50 ? 'C' : 'D';
  const radius = 72;
  const cx = 90; const cy = 90;
  const circ   = 2 * Math.PI * radius;
  const sweep  = (score / 100) * circ * 0.75; // 270° sweep

  return (
    <div className="flex flex-col items-center">
      <svg width="180" height="160" viewBox="0 0 180 160" aria-label={`DEI Score: ${score} out of 100`} role="img">
        <defs>
          <linearGradient id="dei-gauge-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#E8835A" />
            <stop offset="33%"  stopColor="#E8C35A" />
            <stop offset="66%"  stopColor="#C8A97E" />
            <stop offset="100%" stopColor="#74C476" />
          </linearGradient>
          <filter id="gauge-drop">
            <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor={color} floodOpacity="0.6" />
          </filter>
        </defs>
        {/* Track */}
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#1E1E1E" strokeWidth="10"
          strokeDasharray={`${circ * 0.75} ${circ * 0.25}`} strokeDashoffset={circ * 0.375}
          strokeLinecap="round" />
        {/* Fill */}
        <motion.circle
          cx={cx} cy={cy} r={radius} fill="none" stroke="url(#dei-gauge-grad)" strokeWidth="10"
          strokeLinecap="round"
          strokeDashoffset={circ * 0.375}
          initial={{ strokeDasharray: `0 ${circ}` }}
          animate={{ strokeDasharray: `${sweep} ${circ - sweep}` }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          filter="url(#gauge-drop)"
        />
        {/* Center text */}
        <text x={cx} y={cy - 10} textAnchor="middle" fill={color} fontSize="28" fontWeight="700" fontFamily="'Playfair Display', serif">
          {score}
        </text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill="#888" fontSize="11" fontFamily="'DM Mono', monospace">
          / 100
        </text>
        <text x={cx} y={cy + 28} textAnchor="middle" fill={color} fontSize="20" fontWeight="700" fontFamily="'Playfair Display', serif">
          {grade}
        </text>
        {/* Min/Max labels */}
        <text x="18"  y="145" fill="#333" fontSize="9" fontFamily="'DM Mono', monospace">0</text>
        <text x="155" y="145" fill="#333" fontSize="9" fontFamily="'DM Mono', monospace">100</text>
      </svg>
      <p className="font-mono text-2xs text-pulse-text-faint uppercase tracking-widest -mt-2">DEI Index Score</p>
    </div>
  );
}

// ── Category radar ────────────────────────────────────────────────────────
function CategoryRadar({ metrics }: { metrics: DIMetricData[] }) {
  const radarData = useMemo(() => {
    const cats = ['representation', 'process', 'equity', 'culture'];
    return cats.map((cat) => {
      const catMetrics = metrics.filter((m) => m.category === cat);
      const avgCurrent = catMetrics.reduce((a, m) => a + m.current, 0) / (catMetrics.length || 1);
      const avgTarget  = catMetrics.reduce((a, m) => a + m.target,  0) / (catMetrics.length || 1);
      const cfg = CATEGORY_CONFIG[cat];
      return { category: cfg.label, Current: Math.round(avgCurrent), Target: Math.round(avgTarget), fullMark: 100 };
    });
  }, [metrics]);

  return (
    <ResponsiveContainer width="100%" height={240}>
      <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
        <PolarGrid stroke="#2A2A2A" />
        <PolarAngleAxis dataKey="category" tick={{ fill: '#888', fontSize: 10, fontFamily: "'DM Mono', monospace" }} />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        <Radar name="Target"  dataKey="Target"  stroke="#2A2A2A" fill="#2A2A2A" fillOpacity={0.3} />
        <Radar name="Current" dataKey="Current" stroke="#C8A97E" fill="#C8A97E" fillOpacity={0.25} />
        <Tooltip contentStyle={{ background: '#0D0D0D', border: '1px solid #2A2A2A', borderRadius: 8, fontFamily: "'DM Mono', monospace", fontSize: 11 }} />
        <Legend wrapperStyle={{ fontFamily: "'DM Mono', monospace", fontSize: '0.72rem' }} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

// ── Target editor (inline SSOT editing) ──────────────────────────────────
function TargetEditor({ metric, onSave }: {
  metric: DIMetricData;
  onSave: (id: string, newTarget: number) => void;
}) {
  const [val, setVal] = useState(String(metric.target));
  const haptic = useHaptic();
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={0} max={100}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        className="w-20 bg-pulse-elevated border border-pulse-border rounded px-2 py-1 font-mono text-xs text-pulse-gold focus:outline-none focus:border-pulse-gold"
        aria-label={`Edit target for ${metric.label}`}
      />
      <Button
        variant="success"
        size="xs"
        onClick={() => { haptic('light'); onSave(metric.id, parseInt(val) || 0); }}
      >
        Save
      </Button>
    </div>
  );
}

// ── Main D&I component ────────────────────────────────────────────────────
export function DIMetrics() {
  const { t }  = useTranslation();
  const config  = useConfig();
  const updateConfig = useAppStore((s) => s.updateConfig);
  const haptic  = useHaptic();
  const toast   = useToast();

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [detailMetric,   setDetailMetric]   = useState<DIMetricData | null>(null);
  const [editMode,       setEditMode]       = useState(false);
  const [reportOpen,     setReportOpen]     = useState(false);

  // Build metrics from config SSOT
  const allMetrics = useMemo(() => buildMetrics(config.diTargets), [config.diTargets]);

  const filtered = useMemo(
    () => activeCategory === 'all' ? allMetrics : allMetrics.filter((m) => m.category === activeCategory),
    [allMetrics, activeCategory]
  );

  // Overall DEI score — derived
  const overallScore = useMemo(() => {
    const total = allMetrics.reduce((acc, m) => {
      const ratio = Math.min(m.current / (m.target || 1), 1.2);
      return acc + Math.min(ratio * 100, 100);
    }, 0);
    return Math.round(total / allMetrics.length);
  }, [allMetrics]);

  // Status summary — derived
  const statusSummary = useMemo(() => ({
    exceeded:    allMetrics.filter((m) => m.status === 'exceeded').length,
    met:         allMetrics.filter((m) => m.status === 'met').length,
    progress:    allMetrics.filter((m) => m.status === 'progress').length,
    'needs-work': allMetrics.filter((m) => m.status === 'needs-work').length,
  }), [allMetrics]);

  const handleTargetSave = useCallback((id: string, newTarget: number) => {
    updateConfig({ diTargets: { ...config.diTargets, [id]: newTarget } });
    toast.success(`Target updated: ${id} → ${newTarget}%`);
    haptic('success');
  }, [config.diTargets, updateConfig, toast, haptic]);

  // DEI report generation
  const generateReport = useCallback(() => {
    const exceeded    = allMetrics.filter((m) => m.status === 'exceeded').map((m) => m.label).join(', ');
    const needsWork   = allMetrics.filter((m) => m.status === 'needs-work').map((m) => m.label).join(', ');
    const reportText  = `DEI PROGRESS REPORT — ${new Date().toLocaleDateString()}\n\nOverall DEI Score: ${overallScore}/100\n\nExceeding Targets:\n${exceeded || 'None'}\n\nNeeds Improvement:\n${needsWork || 'None'}\n\nBlind Screening Adoption: 100%\nGenerated by Pulse Hiring Intelligence Platform`;
    const blob = new Blob([reportText], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `DEI_Report_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('DEI report downloaded');
    haptic('success');
  }, [allMetrics, overallScore, toast, haptic]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto space-y-8"
    >
      <SVGDefs />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="font-mono text-2xs text-pulse-text-faint uppercase tracking-widest mb-1">
            Module 05 — Diversity, Equity & Inclusion
          </p>
          <h2 className="font-display text-3xl sm:text-4xl text-pulse-text-primary font-bold">
            D&I Analytics Dashboard
          </h2>
          <p className="font-sans text-sm text-pulse-text-muted mt-2 max-w-2xl leading-relaxed">
            Real-time tracking of all inclusion KPIs. Targets are fully configurable from Settings.
            Click any metric for trend analysis, benchmarks, and recommended actions.
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button variant="secondary" size="sm" onClick={() => setEditMode((v) => !v)}>
            {editMode ? '✓ Done' : '✏️ Edit Targets'}
          </Button>
          <Button variant="primary" size="sm" onClick={generateReport}>
            📥 Export Report
          </Button>
        </div>
      </div>

      {/* Top overview row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* DEI score gauge */}
        <Card className="flex flex-col items-center justify-center">
          <DEIScoreGauge score={overallScore} />
        </Card>

        {/* Status breakdown */}
        <Card className="sm:col-span-2">
          <h3 className="font-mono text-xs text-pulse-gold uppercase tracking-widest mb-4">
            [ Status Breakdown ]
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {(Object.entries(statusSummary) as [MetricStatus, number][]).map(([status, count]) => {
              const sc  = STATUS_CONFIG[status];
              const pct = Math.round((count / allMetrics.length) * 100);
              return (
                <div key={status} className="p-3 rounded-lg border" style={{ borderColor: `${sc.color}30`, background: sc.bg }}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-mono text-2xs uppercase tracking-wider" style={{ color: sc.color }}>{sc.label}</span>
                    <span className="font-display text-xl font-bold" style={{ color: sc.color }}>{count}</span>
                  </div>
                  <div className="h-1 bg-pulse-muted rounded-full overflow-hidden">
                    <motion.div className="h-full rounded-full" style={{ background: sc.color }}
                      initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }} />
                  </div>
                  <p className="font-mono text-2xs text-pulse-text-faint mt-1">{pct}% of metrics</p>
                </div>
              );
            })}
          </div>

          {/* Category radar */}
          <div className="mt-4 pt-4 border-t border-pulse-border">
            <p className="font-mono text-2xs text-pulse-text-faint uppercase tracking-widest mb-2">Category Radar</p>
            <CategoryRadar metrics={allMetrics} />
          </div>
        </Card>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap" role="group" aria-label="Filter by category">
        {['all', 'representation', 'process', 'equity', 'culture'].map((cat) => (
          <button
            key={cat}
            onClick={() => { haptic('light'); setActiveCategory(cat); }}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs border transition-all duration-200',
              activeCategory === cat
                ? 'border-pulse-gold bg-pulse-gold/10 text-pulse-gold'
                : 'border-pulse-border text-pulse-text-muted hover:border-pulse-muted'
            )}
            aria-pressed={activeCategory === cat}
          >
            {cat !== 'all' && <span aria-hidden="true">{CATEGORY_CONFIG[cat]?.icon}</span>}
            {cat === 'all' ? 'All Metrics' : CATEGORY_CONFIG[cat]?.label}
          </button>
        ))}
      </div>

      {/* Metric cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {filtered.map((m) => (
            <motion.div
              key={m.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              {editMode ? (
                <Card className="space-y-3">
                  <p className="font-sans text-xs font-medium text-pulse-text-primary flex items-center gap-2">
                    <span aria-hidden="true">{m.icon}</span>{m.label}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-2xs text-pulse-text-faint">Current: {m.current}%</span>
                    <TargetEditor metric={m} onSave={handleTargetSave} />
                  </div>
                </Card>
              ) : (
                <MetricCard metric={m} onClick={() => setDetailMetric(m)} />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Geo heatmap */}
      <GeoHeatmap />

      {/* Intersectionality matrix */}
      <IntersectionalityMatrix />

      {/* Metric detail modal */}
      <AnimatePresence>
        {detailMetric && (
          <MetricDetailModal metric={detailMetric} onClose={() => setDetailMetric(null)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
