// ═══════════════════════════════════════════════════════════════════════════
// TOAST SYSTEM — Animated notification stack
// ═══════════════════════════════════════════════════════════════════════════
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/appStore';
import { cn } from '@/lib/utils';
import type { ToastPayload } from '@/types';

const TOAST_COLORS: Record<ToastPayload['type'], string> = {
  success: '#74C476',
  error:   '#E8835A',
  warning: '#E8C35A',
  info:    '#6BAED6',
};

const TOAST_ICONS: Record<ToastPayload['type'], string> = {
  success: '✓',
  error:   '✕',
  warning: '⚠',
  info:    'ℹ',
};

function ToastItem({ toast }: { toast: ToastPayload }) {
  const removeToast = useAppStore((s) => s.removeToast);
  const color = toast.color ?? TOAST_COLORS[toast.type];

  useEffect(() => {
    const t = setTimeout(() => removeToast(toast.id), toast.duration ?? 3000);
    return () => clearTimeout(t);
  }, [toast.id, toast.duration, removeToast]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 40, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      role="alert"
      aria-live="polite"
      className="flex items-center gap-3 px-4 py-3 rounded-lg border shadow-2xl cursor-pointer select-none max-w-xs sm:max-w-sm"
      style={{
        background: '#0D0D0D',
        borderColor: `${color}40`,
        boxShadow: `0 0 24px ${color}22`,
      }}
      onClick={() => removeToast(toast.id)}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Icon */}
      <span
        className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono"
        style={{ color, background: `${color}20`, border: `1px solid ${color}40` }}
        aria-hidden="true"
      >
        {TOAST_ICONS[toast.type]}
      </span>

      {/* Message */}
      <span className="font-mono text-xs leading-snug" style={{ color }}>
        {toast.message}
      </span>

      {/* Progress bar */}
      <motion.div
        className="absolute bottom-0 left-0 h-0.5 rounded-b-lg"
        style={{ background: color }}
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: (toast.duration ?? 3000) / 1000, ease: 'linear' }}
      />
    </motion.div>
  );
}

export function ToastContainer() {
  const toasts = useAppStore((s) => s.toasts);

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col-reverse gap-2 items-center pointer-events-none"
      aria-label="Notifications"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ── Hook for easy toast dispatch ──────────────────────────────────────────
export function useToast() {
  const addToast = useAppStore((s) => s.addToast);
  return {
    success: (message: string, duration?: number) =>
      addToast({ message, type: 'success', duration }),
    error: (message: string, duration?: number) =>
      addToast({ message, type: 'error', duration }),
    warning: (message: string, duration?: number) =>
      addToast({ message, type: 'warning', duration }),
    info: (message: string, duration?: number) =>
      addToast({ message, type: 'info', duration }),
  };
}
