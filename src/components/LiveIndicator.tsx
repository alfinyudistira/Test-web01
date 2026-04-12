/* ═══════════════════════════════════════════════════════════════════════════
   PULSE LIVE INTELLIGENCE INDICATOR — ENTERPRISE v2.0
   Real-time feed | Adaptive ticker | Glass panel | Haptic | Auto-reconnect
   ═══════════════════════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/appStore';
import { useLiveEvent, useHaptic } from '@/hooks';
import { liveService } from '@/lib/liveService';
import { cn, formatDate, haptic } from '@/lib/utils';
import type { AppEvent, EventType } from '@/types';

// ============================================================================
// 1. CONSTANTS & HELPERS
// ============================================================================

const MAX_VISIBLE_EVENTS = 30;
const TICKER_DURATION = 4000; // ms
const CONNECTION_STATUS_POLL_INTERVAL = 2000;

// Konfigurasi tampilan berdasarkan status koneksi
const STATUS_CONFIG = {
  connected: {
    color: 'bg-emerald-500',
    glow: 'shadow-emerald-500/50',
    label: 'Live',
    description: 'Real-time connection active',
    pulse: true,
  },
  connecting: {
    color: 'bg-amber-500',
    glow: 'shadow-amber-500/50',
    label: 'Connecting',
    description: 'Establishing secure link...',
    pulse: false,
  },
  reconnecting: {
    color: 'bg-amber-500',
    glow: 'shadow-amber-500/50',
    label: 'Reconnecting',
    description: 'Restoring connection',
    pulse: true,
  },
  disconnected: {
    color: 'bg-zinc-500',
    glow: 'shadow-zinc-500/50',
    label: 'Offline',
    description: 'No connection. Using cache.',
    pulse: false,
  },
  fallback: {
    color: 'bg-blue-500',
    glow: 'shadow-blue-500/50',
    label: 'Fallback',
    description: 'SSE fallback mode active',
    pulse: true,
  },
  idle: {
    color: 'bg-zinc-600',
    glow: 'shadow-zinc-600/50',
    label: 'Idle',
    description: 'Awaiting connection',
    pulse: false,
  },
  error: {
    color: 'bg-red-500',
    glow: 'shadow-red-500/50',
    label: 'Error',
    description: 'Connection failed',
    pulse: false,
  },
};

// Helper: pesan ramah untuk ticker
function getTickerMessage(event: AppEvent): string {
  switch (event.type) {
    case 'CANDIDATE_CREATED':
      const name = (event.payload as any)?.name || (event.payload as any)?.firstName;
      return name ? `New candidate: ${name}` : 'New candidate added';
    case 'SCORE_SUBMITTED':
      return `Score updated for candidate`;
    case 'DECISION_FINALIZED':
      return `Decision finalized for candidate`;
    case 'CONFIG_CHANGED':
      return `Platform configuration updated`;
    default:
      return event.type.replace(/_/g, ' ').toLowerCase();
  }
}

// ============================================================================
// 2. MAIN COMPONENT
// ============================================================================
export function LiveIndicator() {
  const { t } = useTranslation();
  const triggerHaptic = useHaptic();

  // Store state & actions
  const liveLog = useAppStore((s) => s.liveLog);
  const ingestEvent = useAppStore((s) => s.ingestLiveEvent);
  const clearLiveLog = useAppStore((s) => s.clearLiveLog);

  // Local UI state
  const [isOpen, setIsOpen] = useState(false);
  const [latestEvent, setLatestEvent] = useState<AppEvent | null>(null);
  const [showTicker, setShowTicker] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(liveService.getStatus().status);
  const [mode, setMode] = useState(liveService.getStatus().mode);

  // Refs
  const tickerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const statusInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Live event subscription (via custom hook) ──────────────────────────
  useLiveEvent('*', useCallback((event: AppEvent) => {
    ingestEvent(event);
    setLatestEvent(event);

    // Trigger haptic untuk event penting (non-PING)
    if (event.type !== 'PING' && event.type !== 'SYSTEM_MAINTENANCE') {
      triggerHaptic('light');
    }

    // Tampilkan ticker
    setShowTicker(true);
    if (tickerTimer.current) clearTimeout(tickerTimer.current);
    tickerTimer.current = setTimeout(() => setShowTicker(false), TICKER_DURATION);
  }, [ingestEvent, triggerHaptic]));

  // ── Polling status dari liveService ────────────────────────────────────
  useEffect(() => {
    const updateStatus = () => {
      const { status, mode: m } = liveService.getStatus();
      setConnectionStatus(status);
      setMode(m);
    };
    updateStatus();
    statusInterval.current = setInterval(updateStatus, CONNECTION_STATUS_POLL_INTERVAL);
    return () => {
      if (statusInterval.current) clearInterval(statusInterval.current);
    };
  }, []);

  // ── Click outside panel ────────────────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // ── ESC to close ───────────────────────────────────────────────────────
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  // ── Cleanup timer on unmount ───────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (tickerTimer.current) clearTimeout(tickerTimer.current);
    };
  }, []);

  // Data untuk panel (hanya MAX_VISIBLE_EVENTS terbaru)
  const recentEvents = useMemo(() => liveLog.slice(0, MAX_VISIBLE_EVENTS), [liveLog]);
  const eventCount = liveLog.length;
  const statusConfig = STATUS_CONFIG[connectionStatus as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.disconnected;

  // Manual reconnect
  const handleReconnect = useCallback(() => {
    haptic('medium');
    liveService.connect({ baseUrl: import.meta.env.VITE_WS_URL, enableMock: true });
  }, []);

  // Clear all events
  const handleClearEvents = useCallback(() => {
    clearLiveLog();
    haptic('light');
  }, [clearLiveLog]);

  return (
    <div className="relative flex items-center gap-3">
      {/* ── Live Ticker (slide-in message) ── */}
      <AnimatePresence mode="wait">
        {showTicker && latestEvent && (
          <motion.div
            key={latestEvent.id}
            initial={{ opacity: 0, x: 30, filter: 'blur(6px)' }}
            animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, x: -30, filter: 'blur(6px)' }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full shadow-lg"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-pulse-gold animate-pulse" />
            <p className="font-mono text-[10px] text-zinc-300 uppercase tracking-tight">
              {getTickerMessage(latestEvent)}
            </p>
            <span className="font-mono text-[9px] text-zinc-500">
              {formatDate(latestEvent.timestamp, 'en-US', { timeStyle: 'short' })}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Connection Status Button ── */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group relative flex items-center gap-3 px-3 py-1.5 rounded-full hover:bg-white/5 transition-all duration-200"
        aria-label="Live connection status and activity feed"
        aria-expanded={isOpen}
      >
        {/* Status dot with pulse animation */}
        <div className="relative flex h-2.5 w-2.5">
          {statusConfig.pulse && connectionStatus === 'connected' && (
            <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", statusConfig.color)} />
          )}
          <span className={cn("relative inline-flex rounded-full h-2.5 w-2.5 transition-all duration-500 shadow-lg", statusConfig.color, statusConfig.glow)} />
        </div>

        {/* Text label */}
        <div className="flex flex-col items-start leading-none">
          <span className="font-mono text-[9px] font-black tracking-[0.2em] text-zinc-500 uppercase">
            {t('live.signal', 'Signal')}
          </span>
          <span className="font-display text-[10px] font-bold text-zinc-300 group-hover:text-white transition-colors">
            {statusConfig.label}
          </span>
        </div>

        {/* Badge counter (jika ada event baru) */}
        {eventCount > 0 && !isOpen && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-pulse-gold text-black text-[9px] font-bold flex items-center justify-center">
            {eventCount > 9 ? '9+' : eventCount}
          </span>
        )}
      </button>

      {/* ── Dropdown Panel (Glassmorphic) ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: 12, scale: 0.96, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: 8, scale: 0.96, filter: 'blur(8px)' }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            className="absolute top-full right-0 mt-3 w-[360px] sm:w-96 z-[9999] bg-black/80 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            role="dialog"
            aria-label="Live activity feed"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-pulse-gold animate-pulse" />
                <h3 className="font-display text-sm font-bold text-white tracking-tight">
                  Intelligence Feed
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-white/10 font-mono text-[9px] text-zinc-400">
                  {eventCount} EVENTS
                </span>
                <button
                  onClick={handleClearEvents}
                  className="text-zinc-500 hover:text-zinc-300 transition-colors text-xs"
                  aria-label="Clear all events"
                >
                  🗑️
                </button>
              </div>
            </div>

            {/* Connection status detail */}
            <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={cn("w-2 h-2 rounded-full", statusConfig.color)} />
                <span className="font-mono text-2xs text-zinc-400">
                  {statusConfig.description}
                </span>
                {mode && (
                  <span className="font-mono text-2xs text-zinc-600 uppercase">
                    ({mode})
                  </span>
                )}
              </div>
              <button
                onClick={handleReconnect}
                className="text-2xs font-mono text-pulse-gold hover:text-pulse-gold-light transition-colors"
              >
                ⟳ Reconnect
              </button>
            </div>

            {/* Event list */}
            <div className="max-h-[380px] overflow-y-auto custom-scrollbar">
              {recentEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                    className="w-10 h-10 border-2 border-dashed border-zinc-700 rounded-full mb-3"
                  />
                  <p className="font-mono text-2xs text-zinc-500 uppercase tracking-wider">
                    No live events yet
                  </p>
                  <p className="font-mono text-2xs text-zinc-600 mt-1">
                    Waiting for system activity...
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {recentEvents.map((event, idx) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className="px-5 py-3 hover:bg-white/[0.03] transition-colors group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1 w-1.5 h-1.5 rounded-full bg-pulse-gold shrink-0 group-hover:scale-150 transition-transform" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-mono text-[10px] text-pulse-gold uppercase tracking-wider">
                              {event.type.replace(/_/g, ' ')}
                            </p>
                            <p className="font-mono text-[9px] text-zinc-600 shrink-0">
                              {formatDate(event.timestamp, 'en-US', { timeStyle: 'short' })}
                            </p>
                          </div>
                          <p className="text-xs text-zinc-300 font-medium leading-relaxed mt-0.5">
                            {getTickerMessage(event)}
                          </p>
                          <p className="font-mono text-[9px] text-zinc-600 mt-1 truncate">
                            Actor: {event.actor?.name || 'system'}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-white/5 border-t border-white/10 text-center">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 font-mono text-2xs text-zinc-400 uppercase tracking-widest transition-all"
              >
                Close Monitor
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
