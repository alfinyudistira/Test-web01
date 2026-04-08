// ═══════════════════════════════════════════════════════════════════════════
// APP ROOT — Providers + Shell + Global overlays
// ═══════════════════════════════════════════════════════════════════════════
import { Suspense } from 'react';
import { AnimatePresence } from 'framer-motion';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider as ReduxProvider } from 'react-redux';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';

import '@/i18n';

import { reduxStore } from '@/store/reduxStore';
import { useAppStore } from '@/store/appStore';
import { Hero } from '@/components/Hero';
import { AppShell } from '@/components/AppShell';
import { ToastContainer } from '@/components/Toast';
import { Confetti } from '@/components/Confetti';
import { SVGDefs } from '@/components/ui';
import { ModuleErrorBoundary } from '@/components/ErrorBoundary';

// ── Query client with sensible defaults ───────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:   1000 * 60 * 5,   // 5 min
      gcTime:      1000 * 60 * 30,  // 30 min
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: 1 },
  },
});

// ── Root consumer (reads Zustand) ─────────────────────────────────────────
function AppContent() {
  const showApp = useAppStore((s) => s.showApp);

  return (
    <>
      <SVGDefs />

      <AnimatePresence mode="wait">
        {showApp ? (
          <AppShell key="app" />
        ) : (
          <Hero key="hero" />
        )}
      </AnimatePresence>

      {/* Global overlays */}
      <ToastContainer />
      <Confetti />

      {/* Analytics (Vercel) */}
      <Analytics />
      <SpeedInsights />
    </>
  );
}

// ── Root with all providers ───────────────────────────────────────────────
export default function App() {
  return (
    <ReduxProvider store={reduxStore}>
      <QueryClientProvider client={queryClient}>
        <ModuleErrorBoundary moduleName="root">
          <Suspense fallback={null}>
            <AppContent />
          </Suspense>
        </ModuleErrorBoundary>
      </QueryClientProvider>
    </ReduxProvider>
  );
}
