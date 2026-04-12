/* ═══════════════════════════════════════════════════════════════════════════
   PULSE RESILIENCE ENGINE — ENTERPRISE ERROR BOUNDARY v2.0
   Fault isolation | Observability | Recovery suggestions | Accessible
   ═══════════════════════════════════════════════════════════════════════════ */

import React, { useEffect, useState } from 'react';
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { haptic } from '@/lib/utils';

// ============================================================================
// 1. TYPES & HELPERS
// ============================================================================
type ErrorType = 'network' | 'runtime' | 'unknown';

interface FallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
  variant?: 'full-page' | 'widget' | 'inline';
}

interface ModuleErrorBoundaryProps {
  children: React.ReactNode;
  moduleName?: string;
  variant?: 'full-page' | 'widget' | 'inline';
  resetKeys?: unknown[];
  onReset?: () => void;
  onError?: (error: Error, info: React.ErrorInfo) => void;
}

// Helper: klasifikasi error berdasarkan message atau stack
function classifyError(error: Error): ErrorType {
  const msg = error.message?.toLowerCase() || '';
  if (msg.includes('fetch') || msg.includes('network') || msg.includes('offline')) return 'network';
  if (msg.includes('chunk') || msg.includes('loading')) return 'network'; // failed to load chunk
  return 'runtime';
}

// Helper: pesan ramah user berdasarkan tipe error
function getFriendlyMessage(type: ErrorType, t: (key: string, fallback?: string) => string): string {
  switch (type) {
    case 'network':
      return t('error.network', 'Network issue detected. Please check your connection.');
    case 'runtime':
      return t('error.runtime', 'A system error occurred in this module. Our team has been notified.');
    default:
      return t('error.generic', 'An unexpected error occurred. Please try again.');
  }
}

// Helper: saran perbaikan berdasarkan tipe error
function getRecoverySuggestion(type: ErrorType): string {
  switch (type) {
    case 'network':
      return 'Check your internet connection and try again.';
    case 'runtime':
      return 'Clear browser cache or reload the page.';
    default:
      return 'Reload the page or contact support if the issue persists.';
  }
}

// Report error ke external service (Sentry, LogRocket, dll)
function reportErrorToService(error: Error, info: React.ErrorInfo, moduleName?: string): void {
  console.group(`🚨 [Pulse-Sentinel] Error in ${moduleName || 'unknown'}`);
  console.error('Error:', error);
  console.info('Component Stack:', info.componentStack);
  console.groupEnd();

  // Kirim ke Sentry jika tersedia
  if (typeof window !== 'undefined' && (window as any).Sentry) {
    (window as any).Sentry.captureException(error, {
      tags: { module: moduleName || 'unknown' },
      extra: { componentStack: info.componentStack },
    });
  }

  // Bisa juga kirim ke endpoint internal
  if (import.meta.env.PROD) {
    fetch('/api/log/error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        componentStack: info.componentStack,
        module: moduleName,
        url: window.location.href,
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => {});
  }
}

// ============================================================================
// 2. FALLBACK UI COMPONENT (dengan variant & haptic)
// ============================================================================
const ErrorFallback: React.FC<FallbackProps> = ({ error, resetErrorBoundary, variant = 'full-page' }) => {
  const { t } = useTranslation();
  const [isRetrying, setIsRetrying] = useState(false);
  const type = classifyError(error);
  const friendlyMessage = getFriendlyMessage(type, t);
  const suggestion = getRecoverySuggestion(type);
  const isWidget = variant === 'widget';
  const isInline = variant === 'inline';

  // Haptic feedback saat error muncul
  useEffect(() => {
    haptic('error');
  }, []);

  // Retry dengan exponential backoff untuk network error
  const handleRetry = async () => {
    if (type === 'network') {
      setIsRetrying(true);
      let delay = 500;
      let attempt = 0;
      const maxAttempts = 3;
      while (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        if (navigator.onLine) {
          resetErrorBoundary();
          break;
        }
        delay *= 2;
        attempt++;
      }
      setIsRetrying(false);
      if (!navigator.onLine) {
        haptic('error');
      }
    } else {
      resetErrorBoundary();
    }
  };

  // Tampilan inline (untuk widget kecil)
  if (isInline) {
    return (
      <div className="p-3 text-xs text-red-400 bg-red-950/30 rounded border border-red-500/30" role="alert">
        <span className="font-mono uppercase tracking-wider">⚠️ {error.message || 'Error'}</span>
        <button onClick={handleRetry} className="ml-2 underline text-pulse-gold">
          Retry
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={`
        relative flex flex-col items-center justify-center overflow-hidden
        ${isWidget ? 'p-6 min-h-[200px] border border-red-500/20 rounded-2xl bg-red-500/5' : 'min-h-[60vh] p-8 text-center'}
      `}
      role="alert"
      aria-live="assertive"
    >
      {/* Decorative blur background (full-page only) */}
      {!isWidget && (
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-red-500/10 blur-[120px] rounded-full" />
        </div>
      )}

      {/* Animated error icon with pulse */}
      <motion.div
        animate={{ scale: [0.95, 1.05, 0.95] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="mb-5"
      >
        <svg width={isWidget ? 48 : 80} height={isWidget ? 48 : 80} viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-red-500/70">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </motion.div>

      <div className="space-y-2 max-w-md">
        <h2 className={`font-display font-bold tracking-tight text-white ${isWidget ? 'text-xl' : 'text-3xl'}`}>
          {type === 'network' ? t('error.network_title', 'Connection Lost') : t('error.runtime_title', 'System Error')}
        </h2>
        <p className="font-mono text-xs text-pulse-text-faint uppercase tracking-widest">
          {error.name || 'RuntimeError'} • {type.toUpperCase()}
        </p>
        <p className="text-pulse-text-secondary text-sm leading-relaxed max-w-md">
          {friendlyMessage}
        </p>
        {!isWidget && (
          <p className="text-pulse-text-muted text-xs mt-2">
            💡 {suggestion}
          </p>
        )}
      </div>

      <div className={`flex gap-3 mt-8 ${isWidget ? 'flex-col' : 'flex-row'}`}>
        <button
          onClick={handleRetry}
          disabled={isRetrying}
          className="px-5 py-2 bg-pulse-gold text-black font-semibold rounded-full hover:bg-pulse-gold-light transition-all active:scale-95 text-sm disabled:opacity-50"
        >
          {isRetrying ? t('common.loading', 'Retrying...') : t('common.retry', 'Retry Module')}
        </button>
        <button
          onClick={() => window.location.reload()}
          className="px-5 py-2 bg-pulse-surface border border-pulse-border text-pulse-text-secondary rounded-full hover:bg-pulse-elevated transition-all text-sm"
        >
          ⟳ {t('app.reload', 'Hard Reload')}
        </button>
      </div>

      {/* Stack trace (full-page only, dev mode or with details) */}
      {!isWidget && (import.meta.env.DEV || type === 'runtime') && error.stack && (
        <details className="mt-10 group w-full max-w-2xl text-left border border-pulse-border rounded-2xl overflow-hidden">
          <summary className="px-4 py-3 bg-pulse-surface cursor-pointer list-none flex justify-between items-center hover:bg-pulse-elevated transition-colors">
            <span className="font-mono text-[10px] text-pulse-text-faint uppercase tracking-widest">Technical Details</span>
            <span className="text-pulse-text-muted text-xs">▼</span>
          </summary>
          <div className="p-4 bg-black/40 backdrop-blur-sm">
            <pre className="font-mono text-[10px] text-red-400/80 overflow-x-auto selection:bg-red-500/30 leading-normal whitespace-pre-wrap">
              {error.stack}
            </pre>
          </div>
        </details>
      )}
    </motion.div>
  );
};

// ============================================================================
// 3. MAIN ERROR BOUNDARY COMPONENT (dengan resetKeys, onReset, variant)
// ============================================================================
export function ModuleErrorBoundary({
  children,
  moduleName = 'SystemModule',
  variant = 'full-page',
  resetKeys,
  onReset,
  onError,
}: ModuleErrorBoundaryProps): JSX.Element {
  const handleError = (error: Error, info: React.ErrorInfo) => {
    reportErrorToService(error, info, moduleName);
    onError?.(error, info);
  };

  const handleReset = () => {
    console.info(`[ErrorBoundary] Reset triggered for ${moduleName}`);
    // Optional: clear module-specific cache from IDB or localStorage
    try {
      localStorage.removeItem(`pulse-module-${moduleName}-cache`);
    } catch {}
    onReset?.();
  };

  return (
    <ReactErrorBoundary
      FallbackComponent={(props) => <ErrorFallback {...props} variant={variant} />}
      onReset={handleReset}
      resetKeys={resetKeys}
      onError={handleError}
    >
      <AnimatePresence mode="wait">
        {children}
      </AnimatePresence>
    </ReactErrorBoundary>
  );
}

// ============================================================================
// 4. SHORTCUT: FULL PAGE ERROR BOUNDARY (untuk root app)
// ============================================================================
export function AppErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ModuleErrorBoundary moduleName="AppRoot" variant="full-page">
      {children}
    </ModuleErrorBoundary>
  );
}

// ============================================================================
// 5. HOOK: useErrorHandler (untuk menangkap error di event handler)
// ============================================================================
export function useErrorHandler(moduleName?: string) {
  const [error, setError] = useState<Error | null>(null);
  const reset = () => setError(null);

  if (error) {
    throw error;
  }

  return {
    handleError: (err: Error) => {
      reportErrorToService(err, { componentStack: '' }, moduleName);
      setError(err);
    },
    reset,
  };
}
