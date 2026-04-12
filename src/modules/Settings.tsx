// ═══════════════════════════════════════════════════════════════════════════
// SETTINGS MODULE — Universal Platform Configuration
// SSOT editor: competencies, weights, thresholds, currency, locale,
// branding, feature flags, API config, danger zone, import/export config
// All changes propagate instantly across every module via Zustand
// ═══════════════════════════════════════════════════════════════════════════
import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation, Trans } from 'react-i18next';
import i18n from '@/i18n';
import { SUPPORTED_LANGUAGES } from '@/i18n';
import { useConfig, useAppStore } from '@/store/appStore';
import { DEFAULT_CONFIG } from '@/lib/defaultConfig';
import { useHaptic } from '@/hooks';
import { idbSetConfig } from '@/lib/idb';
import { cn, formatCurrency } from '@/lib/utils';
import { Card, Button, Badge, Divider, SVGDefs, Modal } from '@/components/ui';
import { useToast } from '@/components/Toast';
import type { Currency, Competency, PlatformConfig } from '@/types';

// ── Settings section IDs ──────────────────────────────────────────────────
const SECTIONS = [
  { id: 'company',      label: 'Company',         icon: '🏢' },
  { id: 'competencies', label: 'Competencies',    icon: '📊' },
  { id: 'thresholds',   label: 'Decision Rules',  icon: '⚖️' },
  { id: 'localization', label: 'Localization',    icon: '🌐' },
  { id: 'features',     label: 'Features',        icon: '🔧' },
  { id: 'branding',     label: 'Branding',        icon: '🎨' },
  { id: 'api',          label: 'API & Data',      icon: '🔌' },
  { id: 'import_export',label: 'Import / Export', icon: '📦' },
  { id: 'danger',       label: 'Danger Zone',     icon: '⚠️' },
] as const;

type SectionId = typeof SECTIONS[number]['id'];

// ── Zod schema for company form ───────────────────────────────────────────
const companySchema = z.object({
  companyName: z.string().min(1).max(60),
  maxBudget:   z.number().min(0),
});

// ── Section wrapper ────────────────────────────────────────────────────────
function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-lg font-bold text-pulse-text-primary">{title}</h3>
        {desc && <p className="font-sans text-xs text-pulse-text-muted mt-1 leading-relaxed max-w-xl">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

// ── Toggle switch ─────────────────────────────────────────────────────────
function Toggle({ enabled, onChange, label, desc }: {
  enabled: boolean; onChange: (v: boolean) => void;
  label: string; desc?: string;
}) {
  const haptic = useHaptic();
  return (
    <div className="flex items-center justify-between gap-4 p-4 bg-pulse-elevated rounded-lg border border-pulse-border">
      <div className="min-w-0">
        <p className="font-sans text-sm text-pulse-text-primary font-medium">{label}</p>
        {desc && <p className="font-mono text-2xs text-pulse-text-faint mt-0.5 leading-relaxed">{desc}</p>}
      </div>
      <button
        role="switch"
        aria-checked={enabled}
        aria-label={label}
        onClick={() => { haptic('light'); onChange(!enabled); }}
        className={cn(
          'relative flex-shrink-0 w-11 h-6 rounded-full border-2 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pulse-gold',
          enabled ? 'bg-pulse-gold border-pulse-gold' : 'bg-pulse-muted border-pulse-border'
        )}
      >
        <motion.span
          className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm"
          animate={{ x: enabled ? 20 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        />
      </button>
    </div>
  );
}

// ── Competency weight editor ──────────────────────────────────────────────
function CompetencyEditor({ competencies, onChange }: {
  competencies: Competency[];
  onChange: (updated: Competency[]) => void;
}) {
  const haptic = useHaptic();
  const toast  = useToast();

  const hardComps   = useMemo(() => competencies.filter((c) => c.category === 'hard'), [competencies]);
  const softComps   = useMemo(() => competencies.filter((c) => c.category === 'soft'), [competencies]);
  const totalWeight = useMemo(() => hardComps.reduce((a, c) => a + c.weight, 0), [hardComps]);
  const weightOk    = Math.abs(totalWeight - 1) < 0.001;

  const updateComp = useCallback((id: string, patch: Partial<Competency>) => {
    onChange(competencies.map((c) => c.id === id ? { ...c, ...patch } : c));
  }, [competencies, onChange]);

  const autoBalance = useCallback(() => {
    const n   = hardComps.length;
    const base = 1 / n;
    onChange(competencies.map((c) => c.category === 'hard' ? { ...c, weight: Math.round(base * 100) / 100 } : c));
    toast.success('Weights auto-balanced to equal distribution');
    haptic('success');
  }, [hardComps, competencies, onChange, toast, haptic]);

  return (
    <div className="space-y-4">
      {/* Weight summary */}
      <div className="flex items-center justify-between p-3 rounded-lg border" style={{ borderColor: weightOk ? '#74C47640' : '#E8835A40', background: weightOk ? '#74C47610' : '#E8835A10' }}>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs" style={{ color: weightOk ? '#74C476' : '#E8835A' }}>
            {weightOk ? '✓ Weights sum to 100%' : `⚠ Weights sum to ${(totalWeight * 100).toFixed(0)}% — must equal 100%`}
          </span>
        </div>
        <Button variant="ghost" size="xs" onClick={autoBalance}>Auto-Balance</Button>
      </div>

      {/* Hard skill competencies */}
      <div className="space-y-2">
        <p className="font-mono text-2xs text-pulse-gold uppercase tracking-widest">Core Competencies (affect hiring decision)</p>
        {hardComps.map((c) => (
          <motion.div
            key={c.id}
            layout
            className="p-4 bg-pulse-elevated rounded-lg border border-pulse-border space-y-3"
          >
            {/* Row 1: Icon + Label + Critical + Color */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-lg" aria-hidden="true">{c.icon}</span>
              <input
                value={c.label}
                onChange={(e) => updateComp(c.id, { label: e.target.value })}
                className="flex-1 min-w-[140px] bg-pulse-surface border border-pulse-border rounded px-2 py-1.5 font-sans text-sm text-pulse-text-primary focus:outline-none focus:border-pulse-gold"
                aria-label={`Label for ${c.id}`}
              />
              <input
                value={c.short}
                onChange={(e) => updateComp(c.id, { short: e.target.value })}
                className="w-28 bg-pulse-surface border border-pulse-border rounded px-2 py-1.5 font-mono text-xs text-pulse-text-secondary focus:outline-none focus:border-pulse-gold"
                placeholder="Short label"
                aria-label={`Short label for ${c.id}`}
              />
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={c.color}
                  onChange={(e) => updateComp(c.id, { color: e.target.value })}
                  className="w-8 h-8 rounded cursor-pointer border border-pulse-border bg-transparent"
                  aria-label={`Color for ${c.id}`}
                />
                <button
                  onClick={() => { haptic('light'); updateComp(c.id, { critical: !c.critical }); }}
                  className={cn('px-2 py-1 rounded font-mono text-2xs border transition-all',
                    c.critical ? 'border-pulse-coral/50 bg-pulse-coral/10 text-pulse-coral' : 'border-pulse-border text-pulse-text-faint hover:border-pulse-muted'
                  )}
                  aria-pressed={c.critical}
                  title="Toggle critical-hurdle status"
                >
                  {c.critical ? '🚫 Critical' : '○ Normal'}
                </button>
              </div>
            </div>

            {/* Row 2: Weight slider */}
            <div className="flex items-center gap-3">
              <span className="font-mono text-2xs text-pulse-text-faint w-14">Weight</span>
              <input
                type="range"
                min={0.01} max={0.50} step={0.01}
                value={c.weight}
                onChange={(e) => { haptic('light'); updateComp(c.id, { weight: parseFloat(e.target.value) }); }}
                className="flex-1"
                style={{ accentColor: c.color }}
                aria-label={`Weight for ${c.label}`}
                aria-valuenow={c.weight}
                aria-valuetext={`${(c.weight * 100).toFixed(0)}%`}
              />
              <span className="font-mono text-xs font-bold w-12 text-right" style={{ color: c.color }}>
                {(c.weight * 100).toFixed(0)}%
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Soft skills */}
      <div className="space-y-2">
        <p className="font-mono text-2xs text-pulse-gold uppercase tracking-widest">Soft Skills / Culture (informational only)</p>
        {softComps.map((c) => (
          <div key={c.id} className="flex items-center gap-3 p-3 bg-pulse-elevated rounded-lg border border-pulse-border">
            <span aria-hidden="true">{c.icon}</span>
            <input
              value={c.label}
              onChange={(e) => updateComp(c.id, { label: e.target.value })}
              className="flex-1 bg-pulse-surface border border-pulse-border rounded px-2 py-1.5 font-sans text-sm text-pulse-text-primary focus:outline-none focus:border-pulse-gold"
            />
            <input
              type="color"
              value={c.color}
              onChange={(e) => updateComp(c.id, { color: e.target.value })}
              className="w-7 h-7 rounded cursor-pointer border border-pulse-border bg-transparent"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Threshold editor ──────────────────────────────────────────────────────
function ThresholdEditor({ thresholds, onChange }: {
  thresholds: PlatformConfig['decisionThresholds'];
  onChange: (t: PlatformConfig['decisionThresholds']) => void;
}) {
  const haptic = useHaptic();
  const tiers = [
    { key: 'strongHire' as const, label: 'Strong Hire', color: '#74C476', desc: 'Minimum weighted score for STRONG HIRE recommendation' },
    { key: 'hire' as const,       label: 'Hire',         color: '#C8A97E', desc: 'Minimum score for HIRE recommendation' },
    { key: 'maybe' as const,      label: 'Maybe',        color: '#6BAED6', desc: 'Minimum score for MAYBE / team discussion' },
  ];

  return (
    <div className="space-y-3">
      {tiers.map((tier) => (
        <div key={tier.key} className="p-4 bg-pulse-elevated rounded-lg border border-pulse-border">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: tier.color }} />
                <p className="font-mono text-xs font-bold" style={{ color: tier.color }}>{tier.label}</p>
              </div>
              <p className="font-mono text-2xs text-pulse-text-faint mt-0.5">{tier.desc}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => { haptic('light'); onChange({ ...thresholds, [tier.key]: Math.max(1.0, parseFloat((thresholds[tier.key] - 0.1).toFixed(1))) }); }}
                className="w-7 h-7 rounded border border-pulse-border text-pulse-text-faint hover:border-pulse-muted hover:text-pulse-text-primary transition-all font-mono text-sm">−</button>
              <span className="font-display text-xl font-bold w-12 text-center" style={{ color: tier.color }}>
                {thresholds[tier.key].toFixed(1)}
              </span>
              <button onClick={() => { haptic('light'); onChange({ ...thresholds, [tier.key]: Math.min(5.0, parseFloat((thresholds[tier.key] + 0.1).toFixed(1))) }); }}
                className="w-7 h-7 rounded border border-pulse-border text-pulse-text-faint hover:border-pulse-muted hover:text-pulse-text-primary transition-all font-mono text-sm">+</button>
            </div>
          </div>
          <input
            type="range" min={1.0} max={5.0} step={0.1}
            value={thresholds[tier.key]}
            onChange={(e) => { haptic('light'); onChange({ ...thresholds, [tier.key]: parseFloat(e.target.value) }); }}
            className="w-full" style={{ accentColor: tier.color }}
            aria-label={`${tier.label} threshold`}
          />
          <div className="flex justify-between font-mono text-2xs text-pulse-text-faint mt-1">
            <span>1.0 (lowest)</span><span>5.0 (highest)</span>
          </div>
        </div>
      ))}

      {/* Validation */}
      {thresholds.maybe >= thresholds.hire && (
        <p className="font-mono text-2xs text-pulse-coral p-2 border border-pulse-coral/30 rounded bg-pulse-coral/5" role="alert">
          ⚠ "Maybe" threshold must be lower than "Hire" threshold.
        </p>
      )}
      {thresholds.hire >= thresholds.strongHire && (
        <p className="font-mono text-2xs text-pulse-coral p-2 border border-pulse-coral/30 rounded bg-pulse-coral/5" role="alert">
          ⚠ "Hire" threshold must be lower than "Strong Hire" threshold.
        </p>
      )}
    </div>
  );
}

// ── Branding editor ───────────────────────────────────────────────────────
function BrandingEditor({ branding, onChange }: {
  branding: PlatformConfig['branding'];
  onChange: (b: PlatformConfig['branding']) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {[
        { key: 'primaryColor' as const, label: 'Primary Accent', desc: 'Used for CTAs, active states, gold elements' },
        { key: 'accentColor'  as const, label: 'Success Accent',  desc: 'Used for positive decisions, success states' },
      ].map((field) => (
        <div key={field.key} className="p-4 bg-pulse-elevated rounded-lg border border-pulse-border space-y-2">
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={branding[field.key]}
              onChange={(e) => onChange({ ...branding, [field.key]: e.target.value })}
              className="w-12 h-12 rounded-lg cursor-pointer border border-pulse-border"
              aria-label={field.label}
            />
            <div>
              <p className="font-sans text-sm text-pulse-text-primary font-medium">{field.label}</p>
              <p className="font-mono text-2xs text-pulse-text-faint">{field.desc}</p>
            </div>
          </div>
          <input
            value={branding[field.key]}
            onChange={(e) => onChange({ ...branding, [field.key]: e.target.value })}
            placeholder="#C8A97E"
            className="w-full bg-pulse-surface border border-pulse-border rounded px-3 py-2 font-mono text-xs text-pulse-text-primary focus:outline-none focus:border-pulse-gold"
            aria-label={`${field.label} hex value`}
          />
          {/* Preview swatch */}
          <div className="flex gap-2">
            {['bg-pulse-elevated', 'bg-pulse-surface'].map((bg) => (
              <div key={bg} className={cn('flex-1 h-8 rounded flex items-center justify-center font-mono text-2xs font-bold', bg)}
                style={{ color: branding[field.key], border: `1px solid ${branding[field.key]}40` }}>
                Preview
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Currency selector ─────────────────────────────────────────────────────
const CURRENCIES: { code: Currency; name: string; flag: string; example: number }[] = [
  { code: 'IDR', name: 'Indonesian Rupiah',  flag: '🇮🇩', example: 15_000_000 },
  { code: 'USD', name: 'US Dollar',          flag: '🇺🇸', example: 85_000 },
  { code: 'EUR', name: 'Euro',               flag: '🇪🇺', example: 78_000 },
  { code: 'GBP', name: 'British Pound',      flag: '🇬🇧', example: 72_000 },
  { code: 'SGD', name: 'Singapore Dollar',   flag: '🇸🇬', example: 110_000 },
  { code: 'MYR', name: 'Malaysian Ringgit',  flag: '🇲🇾', example: 120_000 },
];

// ── Config import/export ──────────────────────────────────────────────────
function useConfigIO(config: PlatformConfig) {
  const updateConfig = useAppStore((s) => s.updateConfig);
  const toast = useToast();
  const haptic = useHaptic();

  const exportConfig = useCallback(() => {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href  = url;
    link.download = `pulse-config-${config.companyName.replace(/\s+/g, '_')}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Configuration exported');
    haptic('success');
  }, [config, toast, haptic]);

  const importConfig = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string) as Partial<PlatformConfig>;
        updateConfig(parsed);
        idbSetConfig(parsed);
        toast.success('Configuration imported & applied');
        haptic('success');
      } catch {
        toast.error('Invalid configuration file. Please use a file exported from Pulse.');
      }
    };
    reader.readAsText(file);
  }, [updateConfig, toast, haptic]);

  return { exportConfig, importConfig };
}

// ── API endpoint tester ────────────────────────────────────────────────────
function APITester() {
  const [status, setStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');
  const [latency, setLatency] = useState<number | null>(null);
  const toast = useToast();
  const haptic = useHaptic();

  const testAPI = useCallback(async () => {
    haptic('light');
    setStatus('testing');
    const start = Date.now();
    try {
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'ping' }],
        }),
      });
      if (res.ok) {
        setStatus('ok');
        setLatency(Date.now() - start);
        toast.success(`API connected — ${Date.now() - start}ms`);
      } else {
        setStatus('fail');
        toast.error(`API error: ${res.status} ${res.statusText}`);
      }
    } catch (e) {
      setStatus('fail');
      toast.error('Cannot reach /api/claude — check your Vercel proxy config');
    }
  }, [haptic, toast]);

  return (
    <div className="p-4 bg-pulse-elevated rounded-lg border border-pulse-border space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-sans text-sm text-pulse-text-primary font-medium">Claude API Connection</p>
          <p className="font-mono text-2xs text-pulse-text-faint mt-0.5">Endpoint: /api/claude (Vercel proxy)</p>
        </div>
        <div className="flex items-center gap-2">
          {status === 'ok' && <Badge variant="success">Connected {latency}ms</Badge>}
          {status === 'fail' && <Badge variant="danger">Failed</Badge>}
          {status === 'testing' && <Badge variant="info">Testing…</Badge>}
          <Button variant="secondary" size="sm" onClick={testAPI} loading={status === 'testing'}>
            Test
          </Button>
        </div>
      </div>
      {status === 'fail' && (
        <div className="p-3 bg-pulse-coral/5 border border-pulse-coral/30 rounded text-xs font-mono text-pulse-coral space-y-1">
          <p>Setup required:</p>
          <p>1. Add ANTHROPIC_API_KEY to Vercel environment variables</p>
          <p>2. Create /api/claude.ts route that proxies to Anthropic API</p>
          <p>3. Redeploy your Vercel project</p>
        </div>
      )}
    </div>
  );
}

// ── Danger zone ────────────────────────────────────────────────────────────
function DangerZone() {
  const resetConfig    = useAppStore((s) => s.resetConfig);
  const resetStats     = useAppStore((s) => s.resetStats);
  const clearCandidates = useAppStore((s) => s.clearCandidates);
  const haptic = useHaptic();
  const toast  = useToast();
  const [confirmModal, setConfirmModal] = useState<{ action: string; fn: () => void } | null>(null);

  const actions = [
    {
      id: 'clear-candidates',
      label: 'Clear All Candidates',
      desc: 'Permanently delete all saved candidates from the shortlist. This cannot be undone.',
      color: '#E8C35A',
      action: () => { clearCandidates(); toast.success('All candidates cleared'); haptic('medium'); },
    },
    {
      id: 'reset-stats',
      label: 'Reset Statistics',
      desc: 'Reset all evaluation counters (total, strong hires, avg score) to zero.',
      color: '#E8835A',
      action: () => { resetStats(); toast.success('Statistics reset'); haptic('medium'); },
    },
    {
      id: 'reset-config',
      label: 'Reset to Default Configuration',
      desc: 'Restore ALL settings to factory defaults. All customizations will be lost.',
      color: '#E8835A',
      action: () => { resetConfig(); idbSetConfig(DEFAULT_CONFIG); toast.success('Configuration restored to defaults'); haptic('heavy'); },
    },
  ];

  return (
    <div className="space-y-3">
      {actions.map((a) => (
        <div key={a.id} className="flex items-start justify-between gap-4 p-4 rounded-lg border"
          style={{ borderColor: `${a.color}30`, background: `${a.color}05` }}>
          <div className="min-w-0">
            <p className="font-sans text-sm font-bold" style={{ color: a.color }}>{a.label}</p>
            <p className="font-mono text-2xs text-pulse-text-faint mt-0.5 leading-relaxed">{a.desc}</p>
          </div>
          <Button
            variant="danger"
            size="sm"
            className="flex-shrink-0"
            style={{ borderColor: `${a.color}60`, color: a.color } as React.CSSProperties}
            onClick={() => setConfirmModal({ action: a.label, fn: a.action })}
          >
            Execute
          </Button>
        </div>
      ))}

      {/* Confirm modal */}
      {confirmModal && (
        <Modal open onClose={() => setConfirmModal(null)} title="Confirm Action" size="sm">
          <div className="space-y-4">
            <p className="font-sans text-sm text-pulse-text-secondary leading-relaxed">
              Are you sure you want to <strong className="text-pulse-coral">{confirmModal.action}</strong>?
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button variant="danger" size="md" className="flex-1"
                onClick={() => { confirmModal.fn(); setConfirmModal(null); }}>
                Yes, Proceed
              </Button>
              <Button variant="ghost" size="md" className="flex-1"
                onClick={() => setConfirmModal(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Live preview panel ─────────────────────────────────────────────────────
function LivePreview({ config }: { config: PlatformConfig }) {
  const hardComps = config.competencies.filter((c) => c.category === 'hard');
  return (
    <div className="sticky top-6 space-y-4" aria-label="Live configuration preview">
      <p className="font-mono text-2xs text-pulse-gold uppercase tracking-widest">[ Live Preview ]</p>

      {/* Decision thresholds visual */}
      <Card className="!p-4">
        <p className="font-mono text-2xs text-pulse-text-faint uppercase tracking-widest mb-3">Decision Scale</p>
        <div className="relative h-4 bg-pulse-muted rounded-full overflow-hidden mb-2">
          <motion.div className="absolute h-full rounded-l-full" style={{ background: '#E8835A', width: `${(config.decisionThresholds.maybe / 5) * 100}%` }} />
          <motion.div className="absolute h-full" style={{ background: '#6BAED6', left: `${(config.decisionThresholds.maybe / 5) * 100}%`, width: `${((config.decisionThresholds.hire - config.decisionThresholds.maybe) / 5) * 100}%` }} />
          <motion.div className="absolute h-full" style={{ background: '#C8A97E', left: `${(config.decisionThresholds.hire / 5) * 100}%`, width: `${((config.decisionThresholds.strongHire - config.decisionThresholds.hire) / 5) * 100}%` }} />
          <motion.div className="absolute h-full rounded-r-full" style={{ background: '#74C476', left: `${(config.decisionThresholds.strongHire / 5) * 100}%`, right: 0 }} />
        </div>
        <div className="flex justify-between font-mono text-2xs">
          {[
            { label: 'No Hire',     val: `<${config.decisionThresholds.maybe}`, color: '#E8835A' },
            { label: 'Maybe',       val: `${config.decisionThresholds.maybe}`, color: '#6BAED6' },
            { label: 'Hire',        val: `${config.decisionThresholds.hire}`,  color: '#C8A97E' },
            { label: 'Strong Hire', val: `${config.decisionThresholds.strongHire}+`, color: '#74C476' },
          ].map((t) => (
            <div key={t.label} className="text-center">
              <p style={{ color: t.color }} className="font-bold">{t.val}</p>
              <p className="text-pulse-text-faint text-2xs">{t.label}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Budget preview */}
      <Card className="!p-4">
        <p className="font-mono text-2xs text-pulse-text-faint uppercase tracking-widest mb-2">Budget Ceiling</p>
        <p className="font-display text-xl font-bold text-pulse-gold">
          {formatCurrency(config.maxBudget, config.currency, config.locale)}
        </p>
        <p className="font-mono text-2xs text-pulse-text-faint">{config.currency} · {config.companyName}</p>
      </Card>

      {/* Competency weight donut (SVG) */}
      <Card className="!p-4">
        <p className="font-mono text-2xs text-pulse-text-faint uppercase tracking-widest mb-3">Weight Distribution</p>
        <svg viewBox="0 0 100 100" className="w-full max-w-[140px] mx-auto" aria-label="Competency weight distribution" role="img">
          {(() => {
            let angle = -90;
            return hardComps.map((c) => {
              const deg   = c.weight * 360;
              const r     = 40;
              const x1    = 50 + r * Math.cos((angle * Math.PI) / 180);
              const y1    = 50 + r * Math.sin((angle * Math.PI) / 180);
              angle += deg;
              const x2    = 50 + r * Math.cos((angle * Math.PI) / 180);
              const y2    = 50 + r * Math.sin((angle * Math.PI) / 180);
              const large = deg > 180 ? 1 : 0;
              return (
                <path key={c.id}
                  d={`M 50 50 L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`}
                  fill={c.color} fillOpacity={0.8} stroke="#0D0D0D" strokeWidth="1"
                >
                  <title>{c.short}: {(c.weight * 100).toFixed(0)}%</title>
                </path>
              );
            });
          })()}
          <circle cx="50" cy="50" r="22" fill="#0D0D0D" />
          <text x="50" y="55" textAnchor="middle" fill="#888" fontSize="9" fontFamily="'DM Mono', monospace">WEIGHTS</text>
        </svg>
        <div className="grid grid-cols-2 gap-1 mt-2">
          {hardComps.map((c) => (
            <div key={c.id} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.color }} />
              <span className="font-mono text-2xs text-pulse-text-faint truncate">{c.short} {(c.weight * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── Main Settings ─────────────────────────────────────────────────────────
export function Settings() {
  const { t }    = useTranslation();
  const config    = useConfig();
  const updateConfig = useAppStore((s) => s.updateConfig);
  const haptic    = useHaptic();
  const toast     = useToast();
  const { exportConfig, importConfig } = useConfigIO(config);

  const [activeSection, setActiveSection] = useState<SectionId>('company');
  const [unsaved,       setUnsaved]       = useState(false);
  const [localCompetencies, setLocalCompetencies] = useState(config.competencies);

  const companyForm = useForm({
    resolver: zodResolver(companySchema),
    defaultValues: { companyName: config.companyName, maxBudget: config.maxBudget },
  });

  const apply = useCallback((patch: Partial<PlatformConfig>) => {
    updateConfig(patch);
    idbSetConfig(patch);
    setUnsaved(false);
    toast.success('Settings saved — changes applied across all modules');
    haptic('success');
  }, [updateConfig, toast, haptic]);

  const applyCompany = companyForm.handleSubmit((data) => {
    apply({ companyName: data.companyName, maxBudget: data.maxBudary ?? data.maxBudget });
  });

  const saveCompetencies = useCallback(() => {
    const totalWeight = localCompetencies.filter((c) => c.category === 'hard').reduce((a, c) => a + c.weight, 0);
    if (Math.abs(totalWeight - 1) > 0.01) {
      toast.error('Weights must sum to 100% before saving');
      return;
    }
    apply({ competencies: localCompetencies });
  }, [localCompetencies, apply, toast]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto space-y-8"
    >
      <SVGDefs />

      {/* Header */}
      <div>
        <p className="font-mono text-2xs text-pulse-text-faint uppercase tracking-widest mb-1">
          Module 09 — Platform Configuration
        </p>
        <h2 className="font-display text-3xl sm:text-4xl text-pulse-text-primary font-bold">
          Settings
        </h2>
        <p className="font-sans text-sm text-pulse-text-muted mt-2 max-w-2xl leading-relaxed">
          Every setting here is the Single Source of Truth. Changes propagate instantly to
          Calculator, Scorecard, Salary Bench, D&I, and all other modules — no reload needed.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* ── Sidebar ── */}
        <div className="lg:col-span-1 space-y-1" role="navigation" aria-label="Settings sections">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left font-mono text-xs transition-all duration-200',
                activeSection === s.id
                  ? 'bg-pulse-gold/10 border border-pulse-gold/30 text-pulse-gold'
                  : 'text-pulse-text-muted hover:bg-pulse-surface hover:text-pulse-text-secondary border border-transparent'
              )}
              aria-current={activeSection === s.id ? 'page' : undefined}
            >
              <span aria-hidden="true">{s.icon}</span>
              {s.label}
            </button>
          ))}
        </div>

        {/* ── Main + Preview ── */}
        <div className="lg:col-span-2 space-y-6">
          <AnimatePresence mode="wait">
            {/* ── Company ── */}
            {activeSection === 'company' && (
              <motion.div key="company" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                <Section title="Company Profile" desc="Basic information that appears across all modules and reports.">
                  <Card>
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="s-company" className="block font-mono text-2xs text-pulse-text-faint uppercase tracking-widest mb-1.5">Company Name</label>
                        <input id="s-company" {...companyForm.register('companyName')}
                          className="w-full bg-pulse-elevated border border-pulse-border rounded px-3 py-2.5 font-sans text-sm text-pulse-text-primary focus:outline-none focus:border-pulse-gold"
                          placeholder="e.g. Acme Corp" />
                        {companyForm.formState.errors.companyName && (
                          <p className="font-mono text-2xs text-pulse-coral mt-1" role="alert">{companyForm.formState.errors.companyName.message}</p>
                        )}
                      </div>
                      <div>
                        <label htmlFor="s-budget" className="block font-mono text-2xs text-pulse-text-faint uppercase tracking-widest mb-1.5">
                          Max Hiring Budget ({config.currency})
                        </label>
                        <input
                          id="s-budget"
                          type="number"
                          {...companyForm.register('maxBudget', { valueAsNumber: true })}
                          className="w-full bg-pulse-elevated border border-pulse-border rounded px-3 py-2.5 font-mono text-sm text-pulse-gold focus:outline-none focus:border-pulse-gold"
                        />
                        <p className="font-mono text-2xs text-pulse-text-faint mt-1">
                          Offers above this amount trigger the NEGOTIATE flag in Calculator
                        </p>
                      </div>
                      <Button variant="primary" size="md" onClick={applyCompany} className="w-full">
                        Save Company Settings
                      </Button>
                    </div>
                  </Card>
                </Section>
              </motion.div>
            )}

            {/* ── Competencies ── */}
            {activeSection === 'competencies' && (
              <motion.div key="competencies" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                <Section title="Competency Configuration"
                  desc="Define which skills matter for your roles. Weights determine their impact on the hiring decision score. All weights must sum to 100%.">
                  <CompetencyEditor
                    competencies={localCompetencies}
                    onChange={(updated) => { setLocalCompetencies(updated); setUnsaved(true); }}
                  />
                  <Button variant="primary" size="md" className="w-full mt-4" onClick={saveCompetencies}>
                    Save Competencies
                  </Button>
                </Section>
              </motion.div>
            )}

            {/* ── Thresholds ── */}
            {activeSection === 'thresholds' && (
              <motion.div key="thresholds" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                <Section title="Decision Thresholds"
                  desc="Set the minimum weighted scores that determine hire recommendations. Lower thresholds = more lenient; higher = stricter. Changes apply immediately to Calculator and Scorecard.">
                  <ThresholdEditor
                    thresholds={config.decisionThresholds}
                    onChange={(t) => apply({ decisionThresholds: t })}
                  />
                </Section>
              </motion.div>
            )}

            {/* ── Localization ── */}
            {activeSection === 'localization' && (
              <motion.div key="localization" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                <Section title="Localization & Currency" desc="All salary figures, date formats, and number formatting adapt automatically.">
                  <Card>
                    <h4 className="font-mono text-2xs text-pulse-gold uppercase tracking-widest mb-3">Currency</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {CURRENCIES.map((c) => (
                        <button key={c.code}
                          onClick={() => { haptic('light'); apply({ currency: c.code }); }}
                          className={cn('p-3 rounded-lg border text-left transition-all space-y-1',
                            config.currency === c.code ? 'border-pulse-gold bg-pulse-gold/10' : 'border-pulse-border hover:border-pulse-muted'
                          )}
                          aria-pressed={config.currency === c.code}
                        >
                          <div className="flex items-center gap-2">
                            <span>{c.flag}</span>
                            <span className="font-mono text-xs font-bold" style={{ color: config.currency === c.code ? '#C8A97E' : '#888' }}>{c.code}</span>
                          </div>
                          <p className="font-sans text-2xs text-pulse-text-faint">{c.name}</p>
                          <p className="font-mono text-2xs text-pulse-text-faint">{formatCurrency(c.example, c.code, config.locale)}</p>
                        </button>
                      ))}
                    </div>

                    <Divider label="Interface Language" className="my-4" />

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <button key={lang.code}
                          onClick={() => {
                            haptic('light');
                            i18n.changeLanguage(lang.code);
                            document.documentElement.setAttribute('dir', lang.dir);
                            apply({ locale: lang.locale as PlatformConfig['locale'] });
                          }}
                          className={cn('p-3 rounded-lg border text-left transition-all',
                            i18n.language === lang.code ? 'border-pulse-gold bg-pulse-gold/10' : 'border-pulse-border hover:border-pulse-muted'
                          )}
                          aria-pressed={i18n.language === lang.code}
                        >
                          <div className="flex items-center gap-2 mb-0.5">
                            <span>{lang.flag}</span>
                            <span className="font-mono text-xs font-bold" style={{ color: i18n.language === lang.code ? '#C8A97E' : '#888' }}>{lang.label}</span>
                          </div>
                          <p className="font-mono text-2xs text-pulse-text-faint">{lang.dir.toUpperCase()} · {lang.locale}</p>
                        </button>
                      ))}
                    </div>
                  </Card>
                </Section>
              </motion.div>
            )}

            {/* ── Features ── */}
            {activeSection === 'features' && (
              <motion.div key="features" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                <Section title="Feature Flags" desc="Enable or disable platform capabilities. Disabled features are hidden from all modules instantly.">
                  <div className="space-y-2">
                    {(Object.entries(config.features) as [keyof PlatformConfig['features'], boolean][]).map(([key, val]) => {
                      const labels: Record<string, { label: string; desc: string }> = {
                        blindScreening: { label: 'Blind Screening Mode',      desc: 'Mask candidate identity in Round 1 scoring' },
                        aiSummary:      { label: 'AI-Generated Summaries',    desc: 'Claude API auto-writes committee emails from notes' },
                        websocketLive:  { label: 'Live Pipeline Feed',        desc: 'WebSocket/SSE real-time activity ticker in header' },
                        exportCsv:      { label: 'CSV Data Export',           desc: 'Download candidate shortlists as spreadsheets' },
                        exportPdf:      { label: 'PDF Report Export',         desc: 'Print-ready scorecards and board reports' },
                        i18n:           { label: 'Multi-Language Support',    desc: '8 languages with auto-detection and RTL layout' },
                      };
                      const info = labels[key] ?? { label: key, desc: '' };
                      return (
                        <Toggle key={key} enabled={val} label={info.label} desc={info.desc}
                          onChange={(v) => apply({ features: { ...config.features, [key]: v } })}
                        />
                      );
                    })}
                  </div>
                </Section>
              </motion.div>
            )}

            {/* ── Branding ── */}
            {activeSection === 'branding' && (
              <motion.div key="branding" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                <Section title="Brand Colors" desc="Customize accent colors to match your company brand. Changes apply to charts, buttons, and decision badges.">
                  <BrandingEditor branding={config.branding} onChange={(b) => apply({ branding: b })} />
                </Section>
              </motion.div>
            )}

            {/* ── API ── */}
            {activeSection === 'api' && (
              <motion.div key="api" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                <Section title="API & Integrations" desc="Configure external service connections. The Claude API powers AI summaries and question generation.">
                  <APITester />
                  <Card className="mt-4">
                    <h4 className="font-mono text-xs text-pulse-gold uppercase tracking-widest mb-3">Integration Setup Guide</h4>
                    <div className="space-y-3 font-mono text-xs text-pulse-text-secondary">
                      {[
                        { step: '01', text: 'Create a Vercel project and deploy this codebase' },
                        { step: '02', text: 'Add ANTHROPIC_API_KEY to Vercel Environment Variables' },
                        { step: '03', text: 'Create /api/claude.ts as an Edge Function proxy' },
                        { step: '04', text: 'Enable websocket endpoint for live pipeline feed (optional)' },
                        { step: '05', text: 'Connect your HRIS / ATS via CSV upload (Settings → Import)' },
                      ].map((s) => (
                        <div key={s.step} className="flex gap-3">
                          <span className="text-pulse-gold font-bold flex-shrink-0">{s.step}</span>
                          <span>{s.text}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                </Section>
              </motion.div>
            )}

            {/* ── Import / Export ── */}
            {activeSection === 'import_export' && (
              <motion.div key="import_export" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                <Section title="Import & Export Configuration" desc="Backup your settings as a portable JSON file, or restore from a previous backup. Works across teams.">
                  <div className="space-y-4">
                    <Card>
                      <h4 className="font-mono text-xs text-pulse-gold uppercase tracking-widest mb-3">Export Configuration</h4>
                      <p className="font-sans text-xs text-pulse-text-muted mb-4 leading-relaxed">
                        Download all settings (competencies, thresholds, branding, feature flags) as a JSON file.
                        Share with teammates or use for backup.
                      </p>
                      <Button variant="primary" size="md" onClick={exportConfig} className="w-full">
                        📥 Export Config JSON
                      </Button>
                    </Card>

                    <Card>
                      <h4 className="font-mono text-xs text-pulse-gold uppercase tracking-widest mb-3">Import Configuration</h4>
                      <p className="font-sans text-xs text-pulse-text-muted mb-4 leading-relaxed">
                        Import a config file exported from Pulse. This will overwrite your current settings.
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json"
                        className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) importConfig(f); }}
                        aria-label="Import configuration file"
                      />
                      <Button variant="secondary" size="md" onClick={() => fileInputRef.current?.click()} className="w-full">
                        📂 Import Config JSON
                      </Button>
                    </Card>
                  </div>
                </Section>
              </motion.div>
            )}

            {/* ── Danger Zone ── */}
            {activeSection === 'danger' && (
              <motion.div key="danger" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                <Section title="Danger Zone"
                  desc="Irreversible actions. Each requires explicit confirmation. All data is deleted immediately and cannot be recovered.">
                  <DangerZone />
                </Section>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Right: Live preview ── */}
        <div className="lg:col-span-1 hidden lg:block">
          <LivePreview config={config} />
        </div>
      </div>
    </motion.div>
  );
}
