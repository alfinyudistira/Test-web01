/* ═══════════════════════════════════════════════════════════════════════════
   APP ROOT — ENTERPRISE ORCHESTRATOR v4.0
   Providers | State Sync | Motion | Observability | Offline-ready
   ═══════════════════════════════════════════════════════════════════════════ */

import { Suspense, useEffect, useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { QueryClient, QueryClientProvider, focusManager, onlineManager } from '@tanstack/react-query';
import { Provider as ReduxProvider } from 'react-redux';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';

// ── Core imports ─────────────────────────────────────────────────────────
import '@/lib/i18n';  // Initialize internationalization
import { reduxStore } from '@/store/reduxStore';
import { useAppStore, useConfig } from '@/store/appStore';
import { useDynamicTheme } from '@/hooks';

// ── Components ───────────────────────────────────────────────────────────
import { Hero } from '@/components/Hero';
import { AppShell } from '@/components/AppShell';
import { ToastContainer } from '@/components/Toast';
import { Confetti } from '@/components/Confetti';
import { SVGDefs } from '@/components/ui';
import { ModuleErrorBoundary } from '@/components/ErrorBoundary';

// ── Devtools (lazy loaded only in development) ──────────────────────────
const ReactQueryDevtools = import.meta.env.DEV
  ? () => import('@tanstack/react-query-devtools').then(m => m.ReactQueryDevtools)
  : null;

// ============================================================================
// 1. QUERY CLIENT CONFIGURATION (enterprise-grade)
// ============================================================================
const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,           // 5 minutes
      gcTime: 1000 * 60 * 30,             // 30 minutes garbage collection
      retry: (failureCount, error: any) => {
        if (error?.status === 404) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,        // controlled by focusManager separately
      refetchOnReconnect: true,
      networkMode: 'always',              // offline-first support
    },
    mutations: {
      retry: 1,
      networkMode: 'always',
    },
  },
});

// Singleton instance
const queryClient = createQueryClient();

// ============================================================================
// 2. NETWORK & FOCUS MANAGERS (React Query integration)
// ============================================================================
onlineManager.setEventListener((setOnline) => {
  const onOnline = () => setOnline(true);
  const onOffline = () => setOnline(false);
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
});

focusManager.setEventListener((handleFocus) => {
  const onFocus = () => handleFocus(true);
  window.addEventListener('visibilitychange', onFocus, false);
  return () => window.removeEventListener('visibilitychange', onFocus);
});

// ============================================================================
// 3. GLOBAL LOADER COMPONENT (premium)
// ============================================================================
function GlobalLoader() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4"
      >
        <div className="w-12 h-12 border-2 border-pulse-gold/20 border-t-pulse-gold rounded-full animate-spin" />
        <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-[0.3em]">
          Initializing Pulse Engine...
        </p>
      </motion.div>
    </div>
  );
}

// ============================================================================
// 4. APP CONTENT (dynamic between Hero and AppShell)
// ============================================================================
function AppContent() {
  const showApp = useAppStore((s) => s.showApp);
  const isAppReady = useAppStore((s) => s.isAppReady);
  const config = useConfig();

  // Inject dynamic theme (primary color) into CSS variables
  useDynamicTheme(config.branding.primaryColor);

  // Hydration guard: avoid flash of incorrect content on SSR (not used, but safe)
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Show loading while Zustand is bootstrapping
  if (!isAppReady || !mounted) {
    return <GlobalLoader />;
  }

  return (
    <>
      <SVGDefs />

      <AnimatePresence mode="wait" initial={false}>
        {showApp ? (
          <motion.div
            key="app-shell"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, filter: 'blur(10px)' }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="min-h-screen"
          >
            <ModuleErrorBoundary moduleName="AppShell" variant="full-page">
              <AppShell />
            </ModuleErrorBoundary>
          </motion.div>
        ) : (
          <motion.div
            key="hero-landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <ModuleErrorBoundary moduleName="Hero" variant="full-page">
              <Hero />
            </ModuleErrorBoundary>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global overlays (always present) */}
      <ToastContainer position="bottom-center" stackDirection="column-reverse" />
      <Confetti type="full" duration={4000} />

      {/* Production telemetry */}
      {import.meta.env.PROD && (
        <>
          <Analytics />
          <SpeedInsights />
        </>
      )}
    </>
  );
}

// ============================================================================
// 5. PROVIDERS COMPOSITION (clean architecture)
// ============================================================================
function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ReduxProvider store={reduxStore}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </ReduxProvider>
  );
}

// ============================================================================
// 6. ROOT APP (with error boundary and suspense)
// ============================================================================
export default function App() {
  // Memoized devtools component (lazy)
  const Devtools = useMemo(() => {
    if (import.meta.env.DEV && ReactQueryDevtools) {
      const DevtoolsComponent = React.lazy(() =>
        import('@tanstack/react-query-devtools').then(m => ({ default: m.ReactQueryDevtools }))
      );
      return () => (
        <Suspense fallback={null}>
          <DevtoolsComponent initialIsOpen={false} buttonPosition="bottom-left" />
        </Suspense>
      );
    }
    return () => null;
  }, []);

  return (
    <AppProviders>
      <ModuleErrorBoundary moduleName="Root" variant="full-page">
        <Suspense fallback={<GlobalLoader />}>
          <AppContent />
        </Suspense>
      </ModuleErrorBoundary>
      <Devtools />
    </AppProviders>
  );
}
