/* ═══════════════════════════════════════════════════════════════════════════
   PULSE COMPENSATION ENGINE — MODULE 03: MARKET CALIBRATION (ENTERPRISE)
   Global Benchmarking | PPP Adjustment | Total Rewards | Multi-currency
   ═══════════════════════════════════════════════════════════════════════════ */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Cell, ReferenceLine, RadarChart,
  Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend,
} from 'recharts';
import { useTranslation } from 'react-i18next';

// Internal Systems
import { useConfig, useAppStore } from '@/store/appStore';
import { formatters, cn, uid, haptic } from '@/lib/utils';
import { useHaptic, useLocalStorage, useKeyboardShortcuts, useToast } from '@/hooks';
import { Card, Button, Badge, Divider, ProgressBar, Tooltip, Kbd, Alert } from '@/components/ui';
import type { Currency } from '@/types';

// ============================================================================
// 1. MARKET INTELLIGENCE DATA (ENTERPRISE GRADE)
// ============================================================================

const MARKET_STANDARDS_USD = {
  entry:  { p25: 42000, p50: 55000, p75: 68000, p90: 82000 },
  mid:    { p25: 75000, p50: 92000, p75: 115000, p90: 138000 },
  senior: { p25: 120000, p50: 155000, p75: 195000, p90: 240000 },
};

const CO_LIVING_INDEX: Record<string, number> = {
  'New York': 1.0,
  'Singapore': 0.88,
  'London': 0.82,
  'Jakarta': 0.42,
  'Surabaya': 0.38,
  'Kuala Lumpur': 0.45,
  'Tokyo': 0.78,
  'Berlin': 0.72,
  'Bangalore': 0.35,
  'Sydney': 0.85,
};

// Exchange rate mock (dapat dihubungkan ke API nyata seperti exchangerate-api.com)
// Default: IDR/USD = 15600
const getExchangeRate = (targetCurrency: Currency): number => {
  const rates: Record<Currency, number> = {
    IDR: 15600,
    USD: 1,
    EUR: 0.92,
    SGD: 1.35,
    MYR: 4.7,
    GBP: 0.79,
    JPY: 150,
    CNY: 7.2,
  };
  return rates[targetCurrency] || 15600;
};

const BENEFITS_CATALOG = [
  { id: 'health', label: 'Premium Health', valueUSD: 8500, icon: '🏥', description: 'Comprehensive medical insurance' },
  { id: 'equity', label: 'Stock Options', valueUSD: 15000, icon: '📈', description: 'Annual equity grant' },
  { id: 'bonus', label: 'Performance Bonus', valueUSD: 10000, icon: '🎯', description: 'Up to 15% of base' },
  { id: 'remote', label: 'Remote Stipend', valueUSD: 2400, icon: '🏠', description: 'Home office & internet' },
  { id: 'learning', label: 'Learning Budget', valueUSD: 3000, icon: '📚', description: 'Courses & conferences' },
];

// ============================================================================
// 2. HELPER: PERCENTILE GAUGE (dari versi asli)
// ============================================================================
function PercentileGauge({ percentile, color }: { percentile: number; color: string }) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentile / 100) * (circumference / 2);

  return (
    <div className="relative flex flex-col items-center">
      <svg width="120" height="70" viewBox="0 0 120 70" className="transform -rotate-180">
        <circle
          cx="60" cy="10" r={radius}
          fill="none" stroke="#18181b" strokeWidth="8"
          strokeDasharray={`${circumference / 2} ${circumference}`}
          strokeLinecap="round"
        />
        <motion.circle
          cx="60" cy="10" r={radius}
          fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${circumference / 2} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference / 2 }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          style={{ filter: `drop-shadow(0 0 8px ${color}44)` }}
        />
      </svg>
      <div className="absolute top-8 text-center">
        <span className="text-2xl font-black text-white leading-none">P{percentile}</span>
        <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-tighter">Market Percentile</p>
      </div>
    </div>
  );
}

// ============================================================================
// 3. MAIN MODULE
// ============================================================================
export function SalaryBench() {
  const { t } = useTranslation();
  const config = useConfig();
  const triggerHaptic = useHaptic();
  const toast = useToast();
  const { addToast } = useAppStore(); // optional: gunakan store untuk notifikasi global

  // ── Persistent State (localStorage) ────────────────────────────────────
  const [level, setLevel] = useLocalStorage<'entry' | 'mid' | 'senior'>('salary_level', 'mid');
  const [targetCity, setTargetCity] = useLocalStorage('salary_city', 'Jakarta');
  const [proposedBase, setProposedBase] = useLocalStorage('salary_base', 750_000_000);
  const [activeBenefits, setActiveBenefits] = useLocalStorage<string[]>('salary_benefits', ['health', 'bonus']);

  // ── Derived: Exchange rate & currency ──────────────────────────────────
  const currency = config.currency || 'IDR';
  const fxRate = getExchangeRate(currency);
  const colFactor = CO_LIVING_INDEX[targetCity] || 0.5;

  // ── Market Calibration Engine ──────────────────────────────────────────
  const calibration = useMemo(() => {
    // Konversi benchmark USD ke target currency dengan PPP adjustment
    const marketInTarget = {
      p25: Math.round(MARKET_STANDARDS_USD[level].p25 * colFactor * fxRate),
      p50: Math.round(MARKET_STANDARDS_USD[level].p50 * colFactor * fxRate),
      p75: Math.round(MARKET_STANDARDS_USD[level].p75 * colFactor * fxRate),
      p90: Math.round(MARKET_STANDARDS_USD[level].p90 * colFactor * fxRate),
    };

    // Hitung percentile berdasarkan proposedBase
    let percentile = 0;
    if (proposedBase < marketInTarget.p25) percentile = 15;
    else if (proposedBase < marketInTarget.p50) percentile = 40;
    else if (proposedBase < marketInTarget.p75) percentile = 65;
    else if (proposedBase < marketInTarget.p90) percentile = 80;
    else percentile = 90;

    // Hitung total benefits dalam target currency
    const benefitsValue = activeBenefits.reduce((acc, id) => {
      const benefit = BENEFITS_CATALOG.find(b => b.id === id);
      if (!benefit) return acc;
      // Benefit value diadjust dengan PPP dan exchange rate
      return acc + Math.round(benefit.valueUSD * colFactor * fxRate);
    }, 0);

    const totalComp = proposedBase + benefitsValue;
    const competitiveness: 'HIGH' | 'OPTIMAL' | 'LOW' = 
      percentile > 75 ? 'HIGH' : percentile > 45 ? 'OPTIMAL' : 'LOW';

    // Data untuk radar chart perbandingan global
    const radarData = ['Singapore', 'London', 'Berlin', 'Tokyo', 'Jakarta'].map(city => ({
      city,
      // Benchmark P50 dalam USD ekuivalen (skala 0-200)
      benchmark: Math.min(200, Math.round(MARKET_STANDARDS_USD[level].p50 * CO_LIVING_INDEX[city] / 1000)),
      // Offer dalam USD ekuivalen
      offer: Math.min(200, Math.round(proposedBase / fxRate / 1000)),
    }));

    return {
      marketInTarget,
      percentile,
      benefitsValue,
      totalComp,
      colFactor,
      competitiveness,
      radarData,
      // Tambahan untuk export
      levelLabel: level === 'entry' ? 'Entry (0-3 yrs)' : level === 'mid' ? 'Mid-Senior (3-7 yrs)' : 'Expert (7+ yrs)',
    };
  }, [level, targetCity, proposedBase, activeBenefits, colFactor, fxRate, currency]);

  // ── Handlers ───────────────────────────────────────────────────────────
  const toggleBenefit = useCallback((id: string) => {
    triggerHaptic('light');
    setActiveBenefits(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }, [triggerHaptic, setActiveBenefits]);

  const handleBaseChange = useCallback((val: number) => {
    triggerHaptic('light');
    setProposedBase(val);
  }, [triggerHaptic, setProposedBase]);

  const resetToDefault = useCallback(() => {
    triggerHaptic('medium');
    setLevel('mid');
    setTargetCity('Jakarta');
    setProposedBase(750_000_000);
    setActiveBenefits(['health', 'bonus']);
    toast.success('Reset to default values');
  }, [triggerHaptic, setLevel, setTargetCity, setProposedBase, setActiveBenefits, toast]);

  // ── Export Snapshot (JSON) ────────────────────────────────────────────
  const exportSnapshot = useCallback(() => {
    const snapshot = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      level,
      targetCity,
      proposedBase,
      activeBenefits,
      calibration: {
        marketPercentiles: calibration.marketInTarget,
        percentile: calibration.percentile,
        totalComp: calibration.totalComp,
        benefitsValue: calibration.benefitsValue,
        competitiveness: calibration.competitiveness,
      },
      exchangeRate: fxRate,
      colFactor: calibration.colFactor,
    };
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `salary-benchmark-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Snapshot exported');
  }, [level, targetCity, proposedBase, activeBenefits, calibration, fxRate, toast]);

  // ── Copy Executive Summary ────────────────────────────────────────────
  const copySummary = useCallback(() => {
    const summary = `Pulse Compensation Report
Segment: ${calibration.levelLabel}
Location: ${targetCity} (PPP factor: ${calibration.colFactor.toFixed(2)})
Proposed Base: ${formatters.currency(proposedBase, currency)}
Market Position: P${calibration.percentile} (${calibration.competitiveness})
Total Rewards: ${formatters.currency(calibration.totalComp, currency)}
Benefits Value: ${formatters.currency(calibration.benefitsValue, currency)}
Negotiation Strategy: ${calibration.percentile > 75 ? 'Elite offer, focus on equity' : calibration.percentile > 45 ? 'Fair market rate, highlight culture' : 'Below median, consider sign-on bonus'}`;
    navigator.clipboard.writeText(summary);
    toast.success('Executive summary copied');
    triggerHaptic('success');
  }, [calibration, targetCity, proposedBase, currency, toast, triggerHaptic]);

  // ── Keyboard Shortcuts ────────────────────────────────────────────────
  useKeyboardShortcuts({
    s: () => exportSnapshot(),
    r: () => resetToDefault(),
  }, { ctrl: true });

  // ── Validasi batas slider ─────────────────────────────────────────────
  const minBase = 50_000_000;
  const maxBase = 5_000_000_000;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 pb-20">
      
      {/* LEFT COLUMN: CONFIGURATION & TOTAL REWARDS (5/12) */}
      <div className="xl:col-span-5 space-y-6">
        <div className="space-y-1 mb-6">
          <Badge variant="gold">Compensation Intelligence</Badge>
          <h2 className="font-display text-3xl font-black text-white tracking-tight">Market Calibration</h2>
          <p className="text-sm text-zinc-500">Benchmark global compensation with Purchasing Power Parity (PPP).</p>
          <div className="flex gap-2 mt-3">
            <Tooltip content="Export snapshot (Ctrl+S)">
              <Button size="xs" variant="glass" onClick={exportSnapshot}>💾 Export JSON</Button>
            </Tooltip>
            <Tooltip content="Copy summary to clipboard">
              <Button size="xs" variant="glass" onClick={copySummary}>📋 Copy Summary</Button>
            </Tooltip>
            <Tooltip content="Reset to default (Ctrl+R)">
              <Button size="xs" variant="ghost" onClick={resetToDefault}>↺ Reset</Button>
            </Tooltip>
          </div>
        </div>

        <Card className="p-8 space-y-8">
          {/* Level & City Selectors */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="font-mono text-[9px] text-zinc-500 uppercase tracking-widest ml-1">
                Market Segment
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as any)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[var(--primary)]"
                aria-label="Market segment level"
              >
                <option value="entry">Entry (0-3 Years)</option>
                <option value="mid">Mid-Senior (3-7 Years)</option>
                <option value="senior">Expert/Exec (7+ Years)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="font-mono text-[9px] text-zinc-500 uppercase tracking-widest ml-1">
                Geographic Hub
              </label>
              <select
                value={targetCity}
                onChange={(e) => setTargetCity(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[var(--primary)]"
                aria-label="Target city for cost of living adjustment"
              >
                {Object.keys(CO_LIVING_INDEX).map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Base Salary Slider */}
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <div>
                <label className="font-mono text-[9px] text-zinc-500 uppercase tracking-widest ml-1">
                  Annual Base Salary ({currency})
                </label>
                <p className="text-2xl font-black text-white mt-1">
                  {formatters.currency(proposedBase, currency)}
                </p>
              </div>
              <PercentileGauge
                percentile={calibration.percentile}
                color={calibration.competitiveness === 'HIGH' ? '#10B981' : '#C8A97E'}
              />
            </div>
            <input
              type="range"
              min={minBase}
              max={maxBase}
              step={10_000_000}
              value={proposedBase}
              onChange={(e) => handleBaseChange(Number(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-[var(--primary)]"
              aria-label="Proposed base salary"
            />
            <div className="flex justify-between text-2xs text-zinc-600">
              <span>{formatters.currency(minBase, currency)}</span>
              <span>P50: {formatters.currency(calibration.marketInTarget.p50, currency)}</span>
              <span>{formatters.currency(maxBase, currency)}</span>
            </div>
          </div>

          <Divider label="Total Rewards Catalog" />

          {/* Benefits Selection Grid */}
          <div className="grid grid-cols-2 gap-3">
            {BENEFITS_CATALOG.map(benefit => (
              <Tooltip key={benefit.id} content={benefit.description}>
                <button
                  onClick={() => toggleBenefit(benefit.id)}
                  className={cn(
                    "p-4 rounded-2xl border text-left transition-all duration-200",
                    activeBenefits.includes(benefit.id)
                      ? "bg-[var(--primary)]/10 border-[var(--primary)]/30 shadow-[0_0_20px_rgba(var(--primary-rgb),0.1)]"
                      : "bg-white/[0.02] border-white/5 hover:bg-white/[0.05]"
                  )}
                  aria-pressed={activeBenefits.includes(benefit.id)}
                >
                  <span className="text-xl mb-2 block">{benefit.icon}</span>
                  <p className="text-[10px] font-bold text-white uppercase tracking-tight">{benefit.label}</p>
                  <p className="text-[9px] font-mono text-zinc-500 mt-1">
                    +{formatters.currency(Math.round(benefit.valueUSD * calibration.colFactor * fxRate), currency).split(',')[0]}
                  </p>
                </button>
              </Tooltip>
            ))}
          </div>

          {/* Total Rewards Summary */}
          <div className="pt-4 border-t border-white/5 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Total Package</span>
              <span className="font-bold text-white">{formatters.currency(calibration.totalComp, currency)}</span>
            </div>
            <div className="flex justify-between text-2xs text-zinc-500">
              <span>Base: {((proposedBase / calibration.totalComp) * 100).toFixed(0)}%</span>
              <span>Benefits: {((calibration.benefitsValue / calibration.totalComp) * 100).toFixed(0)}%</span>
            </div>
            <ProgressBar value={proposedBase} max={calibration.totalComp} color="#C8A97E" className="h-1" />
          </div>
        </Card>
      </div>

      {/* RIGHT COLUMN: MARKET ANALYSIS & VISUALS (7/12) */}
      <div className="xl:col-span-7 space-y-8 sticky top-24 h-fit">
        
        {/* Market Distribution Bar Chart */}
        <Card className="p-8">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-display text-xl font-bold text-white tracking-tight">Market Positioning</h3>
            <Badge
              variant={calibration.competitiveness === 'HIGH' ? 'success' : calibration.competitiveness === 'OPTIMAL' ? 'gold' : 'danger'}
            >
              {calibration.competitiveness} COMPETITIVENESS
            </Badge>
          </div>

          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { name: 'P25', value: calibration.marketInTarget.p25 },
                  { name: 'P50', value: calibration.marketInTarget.p50 },
                  { name: 'P75', value: calibration.marketInTarget.p75 },
                  { name: 'P90', value: calibration.marketInTarget.p90 },
                  { name: 'Your Offer', value: proposedBase, isOffer: true },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} />
                <YAxis tickFormatter={(val) => formatters.currency(val, currency, 'id-ID').split(',')[0]} tick={{ fill: '#71717a', fontSize: 9 }} width={70} />
                <RechartsTooltip
                  cursor={{ fill: 'transparent' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-zinc-950 border border-white/10 p-3 rounded-xl shadow-2xl">
                          <p className="text-[10px] font-mono text-zinc-500 uppercase">{payload[0].payload.name}</p>
                          <p className="text-sm font-bold text-white">{formatters.currency(payload[0].value as number, currency)}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="value" radius={[12, 12, 0, 0]}>
                  {[0, 1, 2, 3, 4].map((idx) => (
                    <Cell
                      key={`cell-${idx}`}
                      fill={idx === 4 ? '#C8A97E' : '#27272a'}
                      fillOpacity={idx === 4 ? 1 : 0.6}
                    />
                  ))}
                </Bar>
                <ReferenceLine y={calibration.marketInTarget.p50} stroke="#71717a" strokeDasharray="3 3" label={{ value: 'Median', fill: '#71717a', fontSize: 9 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Global Hub Radar & Total Rewards Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h4 className="font-mono text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-4 text-center">
              Global Hub Comparison (USD equivalent)
            </h4>
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={calibration.radarData}>
                  <PolarGrid stroke="#27272a" />
                  <PolarAngleAxis dataKey="city" tick={{ fill: '#71717a', fontSize: 8 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 200]} tick={{ fill: '#52525b', fontSize: 8 }} />
                  <Radar name="Benchmark (P50)" dataKey="benchmark" stroke="#ffffff" fill="#ffffff" fillOpacity={0.05} strokeDasharray="4 4" />
                  <Radar name="Your Offer" dataKey="offer" stroke="#C8A97E" fill="#C8A97E" fillOpacity={0.4} />
                  <Legend wrapperStyle={{ fontSize: '8px', fontFamily: 'monospace' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-6 flex flex-col items-center justify-center space-y-5">
            <div className="text-center">
              <p className="font-mono text-[9px] text-zinc-500 uppercase tracking-widest mb-1">Total Rewards Package</p>
              <h4 className="text-2xl font-black text-white">{formatters.currency(calibration.totalComp, currency).split(',')[0]}</h4>
              <p className="text-2xs text-zinc-500 mt-1">({currency} / year)</p>
            </div>
            <div className="w-full space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-zinc-500">BASE SALARY</span>
                  <span className="text-white">{((proposedBase / calibration.totalComp) * 100).toFixed(0)}%</span>
                </div>
                <ProgressBar value={proposedBase} max={calibration.totalComp} color="#C8A97E" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-zinc-500">BENEFITS & PERKS</span>
                  <span className="text-white">{((calibration.benefitsValue / calibration.totalComp) * 100).toFixed(0)}%</span>
                </div>
                <ProgressBar value={calibration.benefitsValue} max={calibration.totalComp} color="#3B82F6" />
              </div>
            </div>
          </Card>
        </div>

        {/* Negotiation Playbook (Adaptive) */}
        <Alert
          variant={calibration.percentile > 75 ? 'success' : calibration.percentile > 45 ? 'info' : 'warning'}
          className="border-l-4"
        >
          <div className="flex gap-3">
            <span className="text-xl">💡</span>
            <div>
              <h4 className="font-display font-bold text-white mb-1">Negotiation Playbook</h4>
              <p className="text-sm text-zinc-300 leading-relaxed">
                {calibration.percentile > 75
                  ? "Strategy: Focus on the 'Elite' nature of this offer. You are in the top 25% of the market. Highlight the stock options and long-term wealth creation rather than cash base."
                  : calibration.percentile > 45
                  ? "Strategy: This is a fair market-rate offer. Focus on the cultural fit, learning opportunities, and remote flexibility to close the gap with candidates interviewing at Big Tech."
                  : "Warning: Your offer is currently below market median. You risk high attrition or rejection. Consider adding a 'Sign-on Bonus' or increasing Equity to compensate for the lower cash base."}
              </p>
            </div>
          </div>
        </Alert>

        {/* Additional Note: Exchange Rate Info */}
        <div className="text-center text-2xs text-zinc-600">
          Exchange rate used: 1 USD = {fxRate.toFixed(2)} {currency} | PPP adjustment based on {targetCity} (factor {calibration.colFactor.toFixed(2)})
        </div>
      </div>
    </div>
  );
}0.5">
                          {formatCurrency(p.val, currency, config.locale)}
                        </p>
                        <p className="font-mono text-2xs text-pulse-text-faint">{p.note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          </motion.div>
        )}

        {activeTab === 'comp' && (
          <motion.div key="comp" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card>
              <h3 className="font-mono text-xs text-pulse-gold uppercase tracking-widest mb-4">
                [ Total Compensation Builder ]
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {BENEFITS.map((b) => {
                  const selected = selectedBenefits.includes(b.id);
                  const localVal = Math.round(b.usdValue * fxRate);
                  return (
                    <motion.button
                      key={b.id}
                      onClick={() => toggleBenefit(b.id)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        'p-4 rounded-lg border text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pulse-gold',
                        selected
                          ? 'border-pulse-gold/50 bg-pulse-gold/10'
                          : 'border-pulse-border bg-pulse-elevated hover:border-pulse-muted'
                      )}
                      aria-pressed={selected}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-xl" aria-hidden="true">{b.icon}</span>
                        {selected && <span className="text-pulse-gold text-xs">✓</span>}
                      </div>
                      <p className="font-sans text-xs font-medium text-pulse-text-primary mb-1">{b.label}</p>
                      <p className="font-mono text-xs text-pulse-gold">
                        +{formatCurrency(localVal, currency, config.locale)}/yr
                      </p>
                    </motion.button>
                  );
                })}
              </div>

              <div className="mt-6 pt-4 border-t border-pulse-border grid grid-cols-3 gap-4 text-center">
                {[
                  { label: 'Base Salary',  val: effectiveOffering,              color: '#C8A97E' },
                  { label: 'Benefits',     val: benefitsTotal,                   color: '#9B8EC4' },
                  { label: 'Total Comp',   val: effectiveOffering + benefitsTotal, color: '#74C476' },
                ].map((m) => (
                  <div key={m.label} className="p-4 bg-pulse-surface rounded-lg border border-pulse-border">
                    <p className="font-display text-xl font-bold" style={{ color: m.color }}>
                      {formatCurrency(m.val, currency, config.locale)}
                    </p>
                    <p className="font-mono text-2xs text-pulse-text-faint mt-1">{m.label}</p>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {activeTab === 'radar' && (
          <motion.div key="radar" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card>
              <h3 className="font-mono text-xs text-pulse-gold uppercase tracking-widest mb-4">
                [ Global Market Positioning — CoL Adjusted ]
              </h3>
              <ResponsiveContainer width="100%" height={360}>
                <RadarChart data={radarData} margin={{ top: 20, right: 40, bottom: 20, left: 40 }}>
                  <PolarGrid stroke="#2A2A2A" />
                  <PolarAngleAxis dataKey="city" tick={{ fill: '#888', fontSize: 11, fontFamily: "'DM Mono', monospace" }} />
                  <PolarRadiusAxis tick={false} axisLine={false} />
                  <Radar name="Market Median" dataKey="Market Median" stroke="#555"    fill="#555"    fillOpacity={0.15} />
                  <Radar name="Your Offer"    dataKey="Your Offer"    stroke="#C8A97E" fill="#C8A97E" fillOpacity={0.25} />
                  <Tooltip contentStyle={{ background: '#0D0D0D', border: '1px solid #2A2A2A', borderRadius: 8, fontFamily: "'DM Mono', monospace", fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontFamily: "'DM Mono', monospace", fontSize: '0.72rem' }} />
                </RadarChart>
              </ResponsiveContainer>
              <p className="font-mono text-2xs text-pulse-text-faint text-center mt-2">
                All values adjusted for local cost of living. Source: Levels.fyi, Glassdoor, LinkedIn Salary (2024).
              </p>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Negotiation guide */}
      <Card>
        <h3 className="font-mono text-xs text-pulse-gold uppercase tracking-widest mb-4">
          [ Negotiation Playbook — {competitiveness.label} Position ]
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {percentile >= 75
            ? [
                { step: '01', title: 'Lead with confidence',      desc: 'Your offer is in the top quartile. Highlight total comp, not just base. Candidates at this level expect stability, not just salary.' },
                { step: '02', title: 'Emphasize equity & growth', desc: 'Top-percentile candidates weigh ESOP and career trajectory heavily. Make these concrete and time-bound.' },
                { step: '03', title: 'Speed is your advantage',   desc: 'Competitive offers generate urgency. Use your strong offer position to compress the offer stage to <3 days.' },
              ]
            : percentile >= 50
            ? [
                { step: '01', title: 'Benchmark transparency',   desc: 'Share that your offer is at or above market median. Candidates respond to honesty over haggling.' },
                { step: '02', title: 'Strengthen benefits mix',  desc: `Add high-perceived-value benefits (remote flexibility, L&D, equity). ${formatCurrency(benefitsTotal, currency, config.locale)}/yr in benefits is compelling.` },
                { step: '03', title: 'Negotiate on total comp',  desc: 'Frame the conversation around ${formatCurrency(effectiveOffering + benefitsTotal, currency, config.locale)} total comp, not just base.' },
              ]
            : [
                { step: '01', title: 'Close the gap strategically', desc: `You're ${formatCurrency(Math.max(0, marketData.p50 - effectiveOffering), currency, config.locale)} below median. Prioritize budget reallocation before negotiation.` },
                { step: '02', title: 'Identify non-cash levers',    desc: 'Remote work, flexible hours, accelerated review cycles, and equity can compensate a below-market base by perceived value.' },
                { step: '03', title: 'Target correctly',            desc: 'A below-median offer can work for candidates prioritizing career growth, brand name, or learning over compensation.' },
              ]
          }
        </div>
      </Card>
    </motion.div>
  );
}
