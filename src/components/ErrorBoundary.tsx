// ═══════════════════════════════════════════════════════════════════════════
// ERROR BOUNDARY — Graceful error handling with recovery UI
// ═══════════════════════════════════════════════════════════════════════════
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui';

interface FallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center"
      role="alert"
      aria-live="assertive"
    >
      {/* SVG Error Icon */}
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none" className="mb-6 opacity-60" aria-hidden="true">
        <defs>
          <filter id="err-glow">
            <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#E8835A" floodOpacity="0.5" />
          </filter>
        </defs>
        <circle cx="32" cy="32" r="30" stroke="#E8835A" strokeWidth="1.5" opacity="0.4" />
        <circle cx="32" cy="32" r="22" stroke="#E8835A" strokeWidth="1" opacity="0.2" />
        <path d="M32 18v18M32 42v2" stroke="#E8835A" strokeWidth="2.5" strokeLinecap="round" filter="url(#err-glow)" />
      </svg>

      <p className="font-mono text-2xs text-pulse-text-faint tracking-widest uppercase mb-2">
        System Error
      </p>
      <h2 className="font-display text-2xl text-pulse-text-primary mb-3">
        Something went wrong
      </h2>
      <p className="font-mono text-xs text-pulse-text-muted mb-6 max-w-md leading-relaxed">
        {error.message || 'An unexpected error occurred in this module.'}
      </p>

      <div className="flex gap-3">
        <Button variant="danger" onClick={resetErrorBoundary}>
          ↺ Retry Module
        </Button>
        <Button variant="ghost" onClick={() => window.location.reload()}>
          ⟳ Reload App
        </Button>
      </div>

      <details className="mt-6 text-left w-full max-w-lg">
        <summary className="font-mono text-2xs text-pulse-text-faint cursor-pointer hover:text-pulse-text-muted transition-colors">
          Technical details
        </summary>
        <pre className="mt-2 p-3 bg-pulse-surface border border-pulse-border rounded text-2xs text-pulse-coral overflow-auto max-h-32 font-mono">
          {error.stack}
        </pre>
      </details>
    </motion.div>
  );
}

// Wrapper with onReset logging
interface ModuleErrorBoundaryProps {
  children: React.ReactNode;
  moduleName?: string;
}

export function ModuleErrorBoundary({ children, moduleName }: ModuleErrorBoundaryProps) {
  return (
    <ReactErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => console.info(`[ErrorBoundary] Reset: ${moduleName ?? 'unknown'}`)}
      onError={(error) => console.error(`[ErrorBoundary] ${moduleName}:`, error)}
    >
      {children}
    </ReactErrorBoundary>
  );
}
