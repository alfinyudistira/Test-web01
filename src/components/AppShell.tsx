/* ═══════════════════════════════════════════════════════════════════════════
   PULSE COMMAND CENTER — ENTERPRISE APP SHELL v2.0
   Lazy modules | Scroll memory | Preload on hover | Glass header | Key hints
   ═══════════════════════════════════════════════════════════════════════════ */

import { Suspense, lazy, useCallback, useMemo, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAppStore, useActiveTab, useConfig } from '@/store/appStore';
import { useHaptic, useKeyboardShortcuts, useOnline, useViewTransition } from '@/hooks';
import { NavBar } from '@/components/NavBar';
import { LiveIndicator } from '@/components/LiveIndicator';
import { ModuleErrorBoundary } from '@/components/ErrorBoundary';
import { cn } from '@/lib/utils';
import type { TabId } from '@/types';

// ============================================================================
// 1. LAZY LOADER WITH PRELOAD (dari Versi B, ditingkatkan)
// ============================================================================
type LazyComponent<T extends React.ComponentType<any>> = T & { preload?: () => void };

function lazyWithPreload<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
): LazyComponent<T> {
  const Component = lazy(factory) as LazyComponent<T>;
  Component.preload = factory;
  return Component;
}

// Modules
const Calculator = lazyWithPreload(() => import('@/modules/Calculator'));
const FunnelChart = lazyWithPreload(() => import('@/modules/Funnel'));
const SalaryBench = lazyWithPreload(() => import('@/modules/Salary'));
const Scorecard = lazyWithPreload(() => import('@/modules/Scorecard'));
const DIMetrics = lazyWithPreload(() => import('@/modules/DI'));
const Onboarding = lazyWithPreload(() => import('@/modules/Onboarding'));
const QuestionBank = lazyWithPreload(() => import('@/modules/Questions'));
const ExecutiveBI = lazyWithPreload(() => import('@/modules/ExecutiveBI'));
const Settings = lazyWithPreload(() => import('@/modules/Settings'));

const MODULE_MAP: Record<TabId, React.ComponentType> = {
  calculator: Calculator,
  funnel: FunnelChart,
  salary: SalaryBench,
  scorecard: Scorecard,
  di: DIMetrics,
  onboarding: Onboarding,
  questions: QuestionBank,
  bi: ExecutiveBI,
  settings: Settings,
};

// Preload semua modul (optional, bisa dipanggil setelah idle)
export function preloadAllModules() {
  Object.values(MODULE_MAP).forEach((mod: any) => mod.preload?.());
}

// ============================================================================
// 2. SKELETON LOADER (Mewah, dari Versi A)
// ============================================================================
function ModuleSkeleton() {
  return (
    <div className="max-w-[1440px] mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="space-y-3">
        <div className="h-4 w-32 bg-white/5 rounded-full animate-pulse" />
        <div className="h-10 w-64 bg-white/10 rounded-xl animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-white/[0.03] border border-white/5 rounded-3xl animate-pulse" />
        ))}
      </div>
      <div className="h-[400px] bg-white/[0.02] border border-white/5 rounded-[2rem] animate-pulse" />
    </div>
  );
}

// ============================================================================
// 3. APP HEADER (dari Versi A + B, ditingkatkan)
// ============================================================================
function AppHeader() {
  const { t } = useTranslation();
  const config = useConfig();
  const isOnline = useOnline();
  const triggerHaptic = useHaptic();
  const startTransition = useViewTransition();
  const setShowApp = useAppStore((s) => s.setShowApp);

  const handleBack = () => {
    triggerHaptic('medium');
    startTransition(() => setShowApp(false));
  };

  return (
    <header className="relative z-50 flex items-center justify-between px-4 sm:px-6 h-16 bg-black/40 backdrop-blur-xl border-b border-white/5">
      {/* Branding area */}
      <div className="flex items-center gap-4">
        {/* Logo mark */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/10 overflow-hidden"
          style={{ backgroundColor: `${config.branding.primaryColor}10` }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 4L4 8L12 12L20 8L12 4Z"
              stroke={config.branding.primaryColor}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M4 12L12 16L20 12"
              stroke={config.branding.primaryColor}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M4 16L12 20L20 16"
              stroke={config.branding.primaryColor}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Company name */}
        <div className="hidden sm:block">
          <p className="font-mono text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: config.branding.primaryColor }}>
            {config.companyName}
          </p>
          <h2 className="font-display text-sm font-bold text-white tracking-tight leading-none mt-1">
            {t('app.name')}
          </h2>
        </div>

        {/* Offline badge */}
        {!isOnline && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="font-mono text-[9px] font-bold text-amber-500 uppercase tracking-widest">
              Local Mode
            </span>
          </motion.div>
        )}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-6">
        <LiveIndicator />
        <button
          onClick={handleBack}
          className="group flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all active:scale-95"
          aria-label="Back to home"
        >
          <span className="font-mono text-[10px] font-bold text-zinc-500 group-hover:text-white uppercase tracking-widest transition-colors">
            {t('app.back')}
          </span>
          <div className="w-6 h-6 rounded-lg bg-zinc-900 flex items-center justify-center text-zinc-400 group-hover:text-white transition-colors">
            ESC
          </div>
        </button>
      </div>
    </header>
  );
}

// ============================================================================
// 4. FLOATING KEY HINTS (dari Versi A)
// ============================================================================
function KeyHints() {
  const hints = [
    { key: '1-9', label: 'SWITCH MODULE' },
    { key: 'ESC', label: 'EXIT' },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 hidden xl:flex flex-col gap-2">
      {hints.map((h) => (
        <div
          key={h.key}
          className="flex items-center gap-3 px-3 py-1.5 bg-black/60 backdrop-blur-md border border-white/5 rounded-lg shadow-2xl"
        >
          <kbd className="min-w-[24px] px-1 h-5 flex items-center justify-center bg-zinc-900 border border-white/10 rounded text-[9px] font-mono font-bold text-pulse-gold">
            {h.key}
          </kbd>
          <span className="font-mono text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
            {h.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// 5. MAIN APP SHELL
// ============================================================================
export function AppShell() {
  const activeTab = useActiveTab();
  const setShowApp = useAppStore((s) => s.setShowApp);
  const triggerHaptic = useHaptic();
  const startTransition = useViewTransition();

  // Scroll memory per tab
  const scrollPositions = useRef<Record<string, number>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  // Restore scroll position saat tab berubah
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = scrollPositions.current[activeTab] ?? 0;
    return () => {
      scrollPositions.current[activeTab] = el.scrollTop;
    };
  }, [activeTab]);

  // Preload semua modul saat idle (boost UX)
  useEffect(() => {
    const idleCallback = window.requestIdleCallback || ((cb) => setTimeout(cb, 100));
    idleCallback(() => preloadAllModules());
  }, []);

  // Keyboard shortcut: ESC untuk back
  const shortcuts = useMemo(
    () => ({
      Escape: () => {
        triggerHaptic('light');
        startTransition(() => setShowApp(false));
      },
    }),
    [triggerHaptic, startTransition, setShowApp]
  );
  useKeyboardShortcuts(shortcuts);

  const ActiveModule = MODULE_MAP[activeTab];

  return (
    <div
      className="min-h-screen bg-[#050505] flex flex-col selection:bg-pulse-gold/30"
      style={{ '--primary': useConfig().branding.primaryColor } as React.CSSProperties}
    >
      <AppHeader />
      <NavBar />

      <main
        ref={containerRef}
        className="flex-1 relative overflow-y-auto custom-scrollbar px-4 sm:px-6 py-6"
        role="tabpanel"
        id={`panel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -10, filter: 'blur(8px)' }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          >
            <ModuleErrorBoundary moduleName={activeTab} variant="full-page">
              <Suspense fallback={<ModuleSkeleton />}>
                <div className="max-w-[1440px] mx-auto">
                  <ActiveModule />
                </div>
              </Suspense>
            </ModuleErrorBoundary>
          </motion.div>
        </AnimatePresence>
      </main>

      <KeyHints />
    </div>
  );
}
