// ═══════════════════════════════════════════════════════════════════════════
// LIVE INDICATOR — Real-time pipeline activity feed
// ═══════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/appStore';
import { liveService } from '@/lib/liveService';
import type { LiveUpdate } from '@/types';

const UPDATE_LABELS: Record<LiveUpdate['type'], string> = {
  NEW_CANDIDATE:    '🆕 New candidate',
  SCORE_UPDATE:     '📝 Score updated',
  PIPELINE_CHANGE:  '🔄 Pipeline move',
  PING:             '🟢 Connected',
};

export function LiveIndicator() {
  const addLiveUpdate = useAppStore((s) => s.addLiveUpdate);
  const liveUpdates   = useAppStore((s) => s.liveUpdates);
  const [visible, setVisible]   = useState(false);
  const [latest, setLatest]     = useState<LiveUpdate | null>(null);
  const [showTicker, setShowTicker] = useState(false);

  // Connect on mount
  useEffect(() => {
    liveService.connect(); // uses mock in dev
    const unsub = liveService.subscribe((update) => {
      addLiveUpdate(update);
      setLatest(update);
      setShowTicker(true);
      setTimeout(() => setShowTicker(false), 4000);
    });
    return () => unsub();
  }, [addLiveUpdate]);

  return (
    <div className="flex items-center gap-3">
      {/* Status dot */}
      <button
        onClick={() => setVisible((v) => !v)}
        className="flex items-center gap-1.5 group"
        aria-label="Live updates"
        title="Click to view live pipeline activity"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pulse-mint opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-pulse-mint" />
        </span>
        <span className="font-mono text-2xs text-pulse-text-faint group-hover:text-pulse-mint transition-colors hidden sm:block">
          LIVE
        </span>
      </button>

      {/* Ticker */}
      <AnimatePresence>
        {showTicker && latest && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="hidden md:flex items-center gap-2 bg-pulse-surface border border-pulse-border rounded px-2.5 py-1"
          >
            <span className="font-mono text-2xs text-pulse-text-muted">
              {UPDATE_LABELS[latest.type]}
              {latest.type === 'NEW_CANDIDATE' && latest.payload
                ? ` — ${(latest.payload as { name?: string }).name ?? ''}`
                : ''}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dropdown panel */}
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            className="absolute top-14 right-4 w-72 bg-pulse-elevated border border-pulse-border rounded-lg shadow-2xl z-50 overflow-hidden"
            aria-label="Live activity feed"
          >
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-pulse-border">
              <span className="font-mono text-2xs text-pulse-gold uppercase tracking-widest">Live Feed</span>
              <button
                onClick={() => setVisible(false)}
                className="text-pulse-text-faint hover:text-pulse-text-primary text-xs"
                aria-label="Close feed"
              >✕</button>
            </div>
            <div className="max-h-56 overflow-y-auto divide-y divide-pulse-border">
              {liveUpdates.length === 0 ? (
                <p className="px-4 py-6 text-center font-mono text-2xs text-pulse-text-faint">
                  Waiting for activity…
                </p>
              ) : (
                liveUpdates.slice(0, 10).map((u, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="px-4 py-2.5 flex items-start gap-2.5"
                  >
                    <span className="text-sm mt-0.5">{UPDATE_LABELS[u.type]?.split(' ')[0]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-2xs text-pulse-text-secondary truncate">
                        {UPDATE_LABELS[u.type]?.slice(3)}
                        {u.type === 'NEW_CANDIDATE' && u.payload
                          ? ` — ${(u.payload as { name?: string }).name ?? ''}`
                          : ''}
                      </p>
                      <p className="font-mono text-2xs text-pulse-text-faint mt-0.5">
                        {new Date(u.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
