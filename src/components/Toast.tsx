/* ═══════════════════════════════════════════════════════════════════════════
   PULSE NOTIFICATION ENGINE — ENTERPRISE TOAST v2.0
   Priority queue | Dedupe | Promise | Gesture | Haptic | Accessible
   ═══════════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { useAppStore } from '@/store/appStore';
import { cn, haptic } from '@/lib/utils';
import type { ToastPayload } from '@/types';

// ============================================================================
// 1. CONSTANTS & HELPERS
// ============================================================================
const MAX_TOASTS = 5;
const DEDUPE_WINDOW = 2000; // ms
const DEFAULT_DURATION = 4000;

// Priority untuk sorting (error paling atas)
const PRIORITY: Record<ToastPayload['type'], number> = {
  error: 4,
  warning: 3,
  success: 2,
  info: 1,
};

// Ikon SVG untuk setiap tipe (dari Versi A, lebih premium)
const TOAST_ICONS: Record<ToastPayload['type'], JSX.Element> = {
  success: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  warning: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  info: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

const TOAST_COLORS: Record<ToastPayload['type'], string> = {
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
};

// Dedupe cache: pesan → timestamp terakhir muncul
const dedupeCache = new Map<string, number>();

// ============================================================================
// 2. TOAST ITEM COMPONENT (dengan pause, action, swipe, progress)
// ============================================================================
interface ToastItemProps {
  toast: ToastPayload;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const duration = toast.duration ?? DEFAULT_DURATION;
  const color = toast.color ?? TOAST_COLORS[toast.type];

  // Haptic saat muncul
  useEffect(() => {
    if (toast.type === 'error') haptic('error');
    else if (toast.type === 'success') haptic('success');
    else haptic('light');
  }, [toast.type]);

  // Auto dismiss dengan pause
  useEffect(() => {
    if (paused) return;
    timerRef.current = setTimeout(() => {
      onDismiss(toast.id);
    }, duration);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [paused, duration, toast.id, onDismiss]);

  // Swipe to dismiss
  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 80) {
      onDismiss(toast.id);
      haptic('light');
    }
  };

  return (
    <motion.div
      layout
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      initial={{ opacity: 0, y: 50, scale: 0.9, filter: 'blur(8px)' }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, scale: 0.85, filter: 'blur(8px)', transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      role="status"
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
      className={cn(
        "relative group flex items-center gap-3 px-4 py-3 min-w-[280px] max-w-sm",
        "bg-black/70 backdrop-blur-xl border rounded-xl shadow-2xl",
        "cursor-grab active:cursor-grabbing select-none overflow-hidden",
        "hover:scale-[1.02] transition-transform duration-200"
      )}
      style={{
        borderColor: `${color}40`,
        borderLeftWidth: '4px',
        borderLeftColor: color,
        boxShadow: `0 8px 32px ${color}20`,
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      {/* Background glow on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none"
        style={{ background: `radial-gradient(circle at center, ${color}, transparent)` }}
      />

      {/* Icon */}
      <div
        className="relative flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
        style={{ backgroundColor: `${color}20`, color }}
      >
        {TOAST_ICONS[toast.type]}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-60" style={{ color }}>
          {toast.type}
        </p>
        <p className="text-sm font-medium text-white/90 leading-tight break-words">
          {toast.message}
        </p>
        {toast.action && (
          <button
            className="text-2xs font-mono mt-1 opacity-70 hover:opacity-100 transition"
            style={{ color }}
            onClick={(e) => {
              e.stopPropagation();
              toast.action?.onClick();
              onDismiss(toast.id);
            }}
          >
            {toast.action.label} →
          </button>
        )}
      </div>

      {/* Progress bar */}
      {!paused && (
        <motion.div
          className="absolute bottom-0 left-0 h-0.5 rounded-b-full"
          style={{ background: color }}
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: duration / 1000, ease: 'linear' }}
        />
      )}
    </motion.div>
  );
}

// ============================================================================
// 3. TOAST CONTAINER (priority queue, dedupe, max items)
// ============================================================================
interface ToastContainerProps {
  position?:
    | 'bottom-center'
    | 'bottom-right'
    | 'bottom-left'
    | 'top-center'
    | 'top-right'
    | 'top-left';
  stackDirection?: 'column' | 'column-reverse';
}

export function ToastContainer({
  position = 'bottom-center',
  stackDirection = 'column-reverse',
}: ToastContainerProps) {
  const toasts = useAppStore((s) => s.notifications);
  const removeToast = useAppStore((s) => s.removeToast);

  // Sorting by priority, then by timestamp (older first)
  const sorted = [...toasts]
    .sort((a, b) => {
      const priorityDiff = PRIORITY[b.type] - PRIORITY[a.type];
      if (priorityDiff !== 0) return priorityDiff;
      return (a.createdAt as any)?.localeCompare?.(b.createdAt) || 0;
    })
    .slice(0, MAX_TOASTS);

  // Position styles
  const positionClasses = {
    'bottom-center': 'bottom-6 left-1/2 -translate-x-1/2',
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-center': 'top-6 left-1/2 -translate-x-1/2',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6',
  };

  return (
    <div
      className={cn(
        "fixed z-[9999] flex pointer-events-none",
        positionClasses[position],
        stackDirection === 'column' ? 'flex-col' : 'flex-col-reverse',
        "gap-2 items-center w-auto max-w-[90vw]"
      )}
      aria-label="Notifications"
    >
      <AnimatePresence mode="popLayout">
        {sorted.map((toast) => (
          <div key={toast.id} className="pointer-events-auto w-full">
            <ToastItem toast={toast} onDismiss={removeToast} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// 4. ENHANCED useToast HOOK (dengan promise, dedupe, custom options)
// ============================================================================
export function useToast() {
  const addToast = useAppStore((s) => s.addToast);

  const push = useCallback(
    (
      type: ToastPayload['type'],
      message: string,
      options?: {
        duration?: number;
        action?: { label: string; onClick: () => void };
        color?: string;
        dedupe?: boolean;
      }
    ): string => {
      // Dedupe: jika pesan sama dalam DEDUPE_WINDOW, skip
      if (options?.dedupe !== false) {
        const last = dedupeCache.get(message);
        if (last && Date.now() - last < DEDUPE_WINDOW) {
          return '';
        }
        dedupeCache.set(message, Date.now());
        setTimeout(() => dedupeCache.delete(message), DEDUPE_WINDOW);
      }

      return addToast({
        type,
        message,
        duration: options?.duration,
        color: options?.color,
        action: options?.action,
      });
    },
    [addToast]
  );

  // Promise toast: menampilkan loading, lalu success/error berdasarkan promise
  const promise = useCallback(
    async <T,>(
      promise: Promise<T>,
      messages: {
        loading: string;
        success: (data: T) => string;
        error: (err: unknown) => string;
      },
      options?: { duration?: number }
    ): Promise<T> => {
      const loadingId = push('info', messages.loading, { duration: 0 }); // duration 0 = tidak auto dismiss
      try {
        const result = await promise;
        push('success', messages.success(result), options);
        return result;
      } catch (err) {
        push('error', messages.error(err), options);
        throw err;
      } finally {
        // Hapus loading toast (opsional, bisa juga dibiarkan auto dismiss)
        // Karena duration 0, kita perlu hapus manual
        if (loadingId) {
          const removeToast = useAppStore.getState().removeToast;
          removeToast(loadingId);
        }
      }
    },
    [push]
  );

  return {
    success: (msg: string, opts?: Parameters<typeof push>[2]) => push('success', msg, opts),
    error: (msg: string, opts?: Parameters<typeof push>[2]) => push('error', msg, opts),
    warning: (msg: string, opts?: Parameters<typeof push>[2]) => push('warning', msg, opts),
    info: (msg: string, opts?: Parameters<typeof push>[2]) => push('info', msg, opts),
    promise,
    // Raw dispatch untuk kebutuhan khusus
    dispatch: push,
  };
}
