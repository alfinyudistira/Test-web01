// ═══════════════════════════════════════════════════════════════════════════
// APP SHELL — Main layout wrapper after Hero
// ═══════════════════════════════════════════════════════════════════════════
import { Suspense, lazy, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAppStore, useActiveTab, useConfig } from '@/store/appStore';
import { useHaptic, useKeyboardShortcuts, useOnline, useViewTransition } from '@/hooks';
import { withViewTransition } from '@/lib/utils';
import { NavBar } from '@/components/NavBar';
import { LiveIndicator } from '@/components/LiveIndicator';
import { Skeleton } from '@/components/ui';
import { ModuleErrorBoundary } from '@/components/ErrorBoundary';
import type { TabId } from '@/types';

// ── Code-split module imports ─────────────────────────────────────────────
const Calculator  = lazy(() => import('@/modules/Calculator').then((m) => ({ default: m.Calculator })));
const FunnelChart = lazy(() => import('@/modules/Funnel').then((m) => ({ default: m.FunnelChart })));
const SalaryBench = lazy(() => import('@/modules/Salary').then((m) => ({ default: m.SalaryBench })));
const Scorecard   = lazy(() => import('@/modules/Scorecard').then((m) => ({ default: m.Scorecard })));
const DIMetrics   = lazy(() => import('@/modules/DI').then((m) => ({ default: m.DIMetrics })));
const Onboarding  = lazy(() => import('@/modules/Onboarding').then((m) => ({ default: m.Onboarding })));
const QuestionBank = lazy(() => import('@/modules/Questions').then((m) => ({ default: m.QuestionBank })));
const ExecutiveBI = lazy(() => import('@/modules/ExecutiveBI').then((m) => ({ default: m.ExecutiveBI })));
const Settings    = lazy(() => import('@/modules/Settings').then((m) => ({ default: m.Settings })));

const MODULE_MAP: Record<TabId, React.ComponentType> = {
  calculator:  Calculator,
  funnel:      FunnelChart,
  salary:      SalaryBench,
  scorecard:   Scorecard,
  di:          DIMetrics,
  onboarding:  Onboarding,
  questions:   QuestionBank,
  bi:          ExecutiveBI,
  settings:    Settings,
};

// ── Module Skeleton ───────────────────────────────────────────────────────
function ModuleSkeleton() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 p-2" aria-label="Loading module…">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 w-full rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-lg" />
      <Skeleton className="h-40 w-full rounded-lg" />
    </div>
  );
}

// ── Header ────────────────────────────────────────────────────────────────
function AppHeader() {
  const { t } = useTranslation();
  const config     = useConfig();
  const setShowApp = useAppStore((s) => s.setShowApp);
  const haptic     = useHaptic();
  const online     = useOnline();

  return (
    <header className="relative bg-pulse-bg border-b border-pulse-border/50 px-4 sm:px-6 py-3 flex items-center justify-between flex-shrink-0 z-20">
      {/* Left: Logo + branding */}
      <div className="flex items-center gap-3 min-w-0">
        {/* SVG Logo mark */}
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
          <defs>
            <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#C8A97E" />
              <stop offset="100%" stopColor="#E2C9A0" />
            </linearGradient>
          </defs>
          <rect width="28" height="28" rx="6" fill="url(#logo-grad)" opacity="0.15" />
          <path d="M8 20V10l6-3 6 3v10M14 7v13M8 13h12" stroke="url(#logo-grad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>

        <div className="min-w-0">
          <p className="font-mono text-2xs text-pulse-gold tracking-[0.2em] uppercase truncate">
            {config.companyName}
          </p>
          <p className="font-display text-sm font-bold text-pulse-text-primary leading-tight hidden sm:block truncate">
            {t('app.name')}
          </p>
        </div>

        {/* Offline badge */}
        {!online && (
          <span className="ml-2 flex items-center gap-1 font-mono text-2xs text-pulse-amber border border-pulse-amber/30 bg-pulse-amber/10 rounded px-2 py-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-pulse-amber" />
            Offline
          </span>
        )}
      </div>

      {/* Right: Live indicator + back button */}
      <div className="flex items-center gap-3">
        <LiveIndicator />
        <button
          onClick={() => { haptic('light'); withViewTransition(() => setShowApp(false)); }}
          className="flex items-center gap-1.5 font-mono text-2xs text-pulse-text-faint hover:text-pulse-text-secondary border border-pulse-border hover:border-pulse-muted rounded px-3 py-1.5 transition-all"
          aria-label={t('app.back')}
        >
          <span aria-hidden="true">←</span>
          <span className="hidden sm:inline">{t('app.home')}</span>
        </button>
      </div>
    </header>
  );
}

// ── Keyboard hint bar ─────────────────────────────────────────────────────
function KeyHints() {
  const HINTS = [
    { key: '1–9', desc: 'Switch tabs' },
    { key: 'ESC', desc: 'Home' },
  ];
  return (
    <div className="hidden lg:flex bg-pulse-bg border-t border-pulse-border/30 px-6 py-1.5 gap-5 flex-shrink-0" aria-label="Keyboard shortcuts">
      {HINTS.map((h) => (
        <span key={h.key} className="flex items-center gap-1.5 font-mono text-2xs text-pulse-text-faint">
          <kbd className="bg-pulse-surface border border-pulse-muted rounded px-1.5 py-0.5 text-pulse-text-muted">
            {h.key}
          </kbd>
          {h.desc}
        </span>
      ))}
    </div>
  );
}

// ── App Shell ─────────────────────────────────────────────────────────────
export function AppShell() {
  const activeTab   = useActiveTab();
  const setShowApp  = useAppStore((s) => s.setShowApp);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const haptic      = useHaptic();
  const vt          = useViewTransition();

  const ActiveModule = MODULE_MAP[activeTab];

  // Global shortcuts
  useKeyboardShortcuts({
    ESCAPE: useCallback(() => { haptic('light'); vt(() => setShowApp(false)); }, [haptic, vt, setShowApp]),
  });

  return (
    <div className="min-h-screen bg-pulse-bg flex flex-col" style={{ viewTransitionName: 'app-shell' }}>
      <AppHeader />
      <NavBar />

      <main
        id={`panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
        className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 sm:py-8"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            style={{ viewTransitionName: `module-${activeTab}` }}
          >
            <ModuleErrorBoundary moduleName={activeTab}>
              <Suspense fallback={<ModuleSkeleton />}>
                <ActiveModule />
              </Suspense>
            </ModuleErrorBoundary>
          </motion.div>
        </AnimatePresence>
      </main>

      <KeyHints />
    </div>
  );
}
