/* ═══════════════════════════════════════════════════════════════════════════
   PULSE KERNEL — ENTERPRISE BOOTSTRAP v4.0
   Orchestration: Redux + Zustand + i18n + IDB + PWA + Global Sentinel
   Production-grade | Resilient | Performant | Accessible
   ═══════════════════════════════════════════════════════════════════════════ */

import React, { Suspense, lazy, useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { Provider as ReduxProvider } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';

// ── Core Assets & Configuration ──────────────────────────────────────────
import './index.css';
import { initI18n, SUPPORTED_LANGUAGES, type LanguageCode } from '@/lib/i18n';
import { reduxStore } from '@/store/reduxStore';
import { useAppStore } from '@/store/appStore';
import { initIDB } from '@/lib/idb';
import { liveService } from '@/lib/liveService';
import { preloadAllModules } from '@/components/AppShell';
import { haptic } from '@/lib/utils';

// ── Global UI Components ─────────────────────────────────────────────────
import { AppErrorBoundary } from '@/components/ErrorBoundary';
import { ToastContainer } from '@/components/Toast';
import { Confetti } from '@/components/Confetti';
import { SVGDefs } from '@/components/ui';

// ── Lazy load main shell for smaller initial bundle ─────────────────────
const AppShell = lazy(() => import('@/components/AppShell').then(m => ({ default: m.AppShell })));

// ============================================================================
// 1. SAFE STORAGE (Safari private mode & quota safe)
// ============================================================================
const safeStorage = {
  get: (key: string): string | null => {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set: (key: string, value: string): void => {
    try { localStorage.setItem(key, value); } catch { /* silent */ }
  },
};

// ============================================================================
// 2. RTL & LANGUAGE DETECTION (sync, before paint)
// ============================================================================
const applyDirectionAndLang = (lang: string): void => {
  const rtlSet = new Set(['ar', 'he', 'fa', 'ur']);
  const isRTL = rtlSet.has(lang);
  const html = document.documentElement;
  html.setAttribute('lang', lang);
  html.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
  html.classList.toggle('rtl', isRTL);
};

const detectInitialLanguage = (): LanguageCode => {
  const stored = safeStorage.get('i18nextLng') || safeStorage.get('pulse_lang');
  const navLang = navigator.language?.split('-')[0] || 'en';
  const raw = (stored ?? navLang).toLowerCase();
  // Validate against supported languages
  return SUPPORTED_LANGUAGES.some(l => l.code === raw) ? (raw as LanguageCode) : 'en';
};

const initialLang = detectInitialLanguage();
applyDirectionAndLang(initialLang);

// ============================================================================
// 3. GLOBAL ERROR HANDLERS (uncaught errors & promise rejections)
// ============================================================================
window.onerror = (message, source, lineno, colno, error) => {
  console.error('[Global Error]', { message, source, lineno, colno, error });
  // In production, you would send to Sentry / LogRocket
};

window.onunhandledrejection = (event) => {
  console.error('[Unhandled Rejection]', event.reason);
};

// ============================================================================
// 4. PERFORMANCE MONITORING (Long Tasks & Web Vitals)
// ============================================================================
if ('PerformanceObserver' in window) {
  try {
    const longTaskObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'longtask') {
          console.warn(`[Perf] Long task: ${entry.duration.toFixed(2)}ms`);
        }
      }
    });
    longTaskObserver.observe({ entryTypes: ['longtask'] });
  } catch {}
}

// Web Vitals reporting (lightweight)
const reportWebVitals = () => {
  if (import.meta.env.DEV) return;
  try {
    import('web-vitals').then(({ getCLS, getFID, getLCP, getTTFB }) => {
      getCLS(console.debug);
      getFID(console.debug);
      getLCP(console.debug);
      getTTFB(console.debug);
    });
  } catch {}
};
reportWebVitals();

// ============================================================================
// 5. FEATURE FLAGS (SaaS ready)
// ============================================================================
export const featureFlags = {
  enableAI: true,
  enableAdvancedAnalytics: true,
  enableDebugPanel: import.meta.env.DEV,
};
(window as any).__PULSE_FEATURES__ = featureFlags;

// ============================================================================
// 6. SIMPLE EVENT BUS (for SW updates, etc.)
// ============================================================================
type EventHandler = (payload?: any) => void;
const eventBus = new Map<string, Set<EventHandler>>();
export const emit = (event: string, payload?: any) => {
  eventBus.get(event)?.forEach(fn => fn(payload));
};
export const on = (event: string, handler: EventHandler) => {
  if (!eventBus.has(event)) eventBus.set(event, new Set());
  eventBus.get(event)!.add(handler);
};

// ============================================================================
// 7. LOADING SPLASH SCREEN (premium)
// ============================================================================
function LoadingSplash() {
  return (
    <div className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-black">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center space-y-6"
      >
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" className="mx-auto text-pulse-gold">
          <path d="M12 4L4 8L12 12L20 8L12 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 12L12 16L20 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 16L12 20L20 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <motion.circle
            cx="12" cy="12" r="3" fill="currentColor"
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1, 0.5, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          />
        </svg>
        <div className="space-y-2">
          <h1 className="font-display text-2xl font-black text-white tracking-tight">Pulse Intelligence</h1>
          <div className="flex justify-center gap-1">
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-pulse-gold"
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.2 }}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ============================================================================
// 8. ROOT APP COMPONENT (with full providers & error boundary)
// ============================================================================
function RootApp() {
  const [isReady, setIsReady] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        // 1. Initialize i18n (asynchronous, but RTL already set)
        await initI18n({ fallbackLng: 'en', debug: import.meta.env.DEV });

        // 2. IndexedDB (offline-first)
        await initIDB();

        // 3. Zustand store bootstrap (load config & candidates)
        await useAppStore.getState().bootstrap();

        // 4. Real-time engine connection (WebSocket / SSE / mock)
        liveService.connect({
          baseUrl: import.meta.env.VITE_WS_URL || 'wss://api.pulse.app/live',
          enableMock: import.meta.env.DEV,
          debug: import.meta.env.DEV,
        });

        // 5. Preload all modules after idle (performance boost)
        requestIdleCallback(() => preloadAllModules(), { timeout: 2000 });

        if (mounted) setIsReady(true);
      } catch (err) {
        console.error('Bootstrap failed:', err);
        if (mounted) setBootstrapError(err as Error);
      }
    }

    bootstrap();
    return () => { mounted = false; };
  }, []);

  // Render error fallback
  if (bootstrapError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black p-6 text-center">
        <div className="text-red-500 text-6xl mb-4">⚠️</div>
        <h1 className="font-display text-2xl text-white mb-2">System Initialization Failed</h1>
        <p className="text-zinc-400 text-sm mb-6">{bootstrapError.message}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-pulse-gold text-black rounded-full font-bold"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!isReady) {
    return <LoadingSplash />;
  }

  return (
    <ReduxProvider store={reduxStore}>
      <AppErrorBoundary>
        <Suspense fallback={<LoadingSplash />}>
          <AppShell />
        </Suspense>
      </AppErrorBoundary>
      {/* Global overlay components */}
      <ToastContainer position="bottom-center" stackDirection="column-reverse" />
      <Confetti type="full" duration={4000} />
      <SVGDefs />
    </ReduxProvider>
  );
}

// ============================================================================
// 9. PWA & SERVICE WORKER REGISTRATION (production only)
// ============================================================================
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.info('[SW] Registered scope:', registration.scope);
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New version available -> notify user (via event bus)
                emit('sw:update-available');
                haptic('success');
                console.info('[SW] Update ready, please refresh.');
              }
            };
          }
        };
      })
      .catch(err => console.warn('[SW] Registration failed:', err));
  });
}

// ============================================================================
// 10. RENDER APPLICATION
// ============================================================================
const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found');

// Apply primary theme color CSS variable early (avoid FOUC)
const config = useAppStore.getState().config;
if (config?.branding?.primaryColor) {
  document.documentElement.style.setProperty('--primary', config.branding.primaryColor);
  // Also compute rgb version for shadows
  const hex = config.branding.primaryColor.replace('#', '');
  const r = parseInt(hex.slice(0,2), 16);
  const g = parseInt(hex.slice(2,4), 16);
  const b = parseInt(hex.slice(4,6), 16);
  document.documentElement.style.setProperty('--primary-rgb', `${r} ${g} ${b}`);
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <RootApp />
  </React.StrictMode>
);h (err) {
      // silent fail
    }
  }, 3000);
}

// ── HMR Support (Vite) ───────────────────────────────────────────────────
if (import.meta.hot) {
  import.meta.hot.accept('./App', (newModule) => {
    if (newModule) {
      // Re-render root untuk hot update
      const root = ReactDOM.createRoot(document.getElementById('root')!);
      root.render(
        <React.StrictMode>
          <RootApp />
        </React.StrictMode>
      );
    }
  });
}

// ── Render aplikasi ──────────────────────────────────────────────────────
const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <RootApp />
  </React.StrictMode>
);

// ── Export event bus untuk konsumsi global (opsional) ────────────────────
export { eventBus, featureFlags, networkState };
