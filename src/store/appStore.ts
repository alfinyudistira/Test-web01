/* ═══════════════════════════════════════════════════════════════════════════
   PULSE ENTERPRISE STORE — Zustand + Immer + IDB + Devtools
   Scalable | Observable | Optimistic | Dual Persistence | Type-Safe
   ═══════════════════════════════════════════════════════════════════════════ */

import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import shallow from 'zustand/shallow';
import type {
  PlatformConfig,
  AppStats,
  TabId,
  Candidate,
  ToastPayload,
  AppEvent,
  OrganizationId,
  CandidateId,
} from '@/types';
import { DEFAULT_CONFIG, mergeConfig, validateConfig } from '@/lib/defaultConfig';
import { db } from '@/lib/idb';
import { computeWeightedScore } from '@/lib/utils';

// ============================================================================
// 1. CONSTANTS & HELPERS
// ============================================================================
const STORE_NAME = 'pulse-enterprise-store-v2';
const MAX_LIVE_EVENTS = 50;
const MAX_TOASTS = 5;

const INITIAL_STATS: AppStats = {
  total: 0,
  strongHires: 0,
  hires: 0,
  noHires: 0,
  avgScore: 0,
  scores: [],
  lastUpdated: new Date().toISOString(),
};

// Helper: hitung statistik dari candidates dan config
function computeStatsFromCandidates(candidates: Candidate[], config: PlatformConfig): AppStats {
  const scores = candidates
    .map(c => c.weightedScore ?? 0)
    .filter(s => s > 0);
  const total = scores.length;
  const strongThreshold = config.decisionThresholds.strongHire;
  const hireThreshold = config.decisionThresholds.hire;
  const strongHires = scores.filter(s => s >= strongThreshold).length;
  const hires = scores.filter(s => s >= hireThreshold && s < strongThreshold).length;
  const noHires = total - strongHires - hires;
  const avgScore = total === 0 ? 0 : scores.reduce((a, b) => a + b, 0) / total;
  return {
    total,
    strongHires,
    hires,
    noHires,
    avgScore,
    scores,
    lastUpdated: new Date().toISOString(),
  };
}

// ============================================================================
// 2. STORE INTERFACE
// ============================================================================
interface AppState {
  // Navigation & UI
  activeTab: TabId;
  isAppReady: boolean;
  isSidebarOpen: boolean;
  currentOrgId?: OrganizationId;

  // Core Data
  config: PlatformConfig;
  candidates: Candidate[];
  stats: AppStats;

  // UI Feedback
  notifications: ToastPayload[];
  liveLog: AppEvent[];
  confettiTrigger: number;       // increment to trigger confetti
  onboardingChecked: Record<string, boolean>;

  // Optional (untuk kompatibilitas)
  showConfetti?: boolean;        // bisa pakai trigger atau boolean
}

interface AppActions {
  // Lifecycle
  bootstrap: () => Promise<void>;
  setAppReady: (ready: boolean) => void;

  // Navigation
  setActiveTab: (tab: TabId) => void;
  toggleSidebar: () => void;

  // Config
  updateConfig: (patch: Partial<PlatformConfig>) => Promise<void>;
  resetConfig: () => Promise<void>;

  // Candidates (dengan sync ke IDB)
  upsertCandidate: (candidate: Candidate) => Promise<void>;
  deleteCandidate: (id: CandidateId) => Promise<void>;
  bulkUpdateCandidates: (candidates: Candidate[]) => Promise<void>;
  updateCandidateScore: (id: CandidateId, competencyId: string, score: number) => Promise<void>;

  // Stats (reactive)
  refreshStats: () => void;

  // Toast
  addToast: (toast: Omit<ToastPayload, 'id'>) => string;
  removeToast: (id: string) => void;

  // Live Events
  ingestLiveEvent: (event: AppEvent) => void;
  clearLiveLog: () => void;

  // Confetti
  triggerConfetti: () => void;

  // Onboarding
  toggleOnboardingItem: (itemId: string) => void;
}

type AppStore = AppState & AppActions;

// ============================================================================
// 3. CREATE STORE (dengan semua middleware)
// ============================================================================
export const useAppStore = create<AppStore>()(
  devtools(
    subscribeWithSelector(
      persist(
        immer((set, get) => ({
          // ──────────────────────────────────────────────────────────────
          // INITIAL STATE
          // ──────────────────────────────────────────────────────────────
          activeTab: 'calculator',
          isAppReady: false,
          isSidebarOpen: true,
          currentOrgId: undefined,
          config: DEFAULT_CONFIG,
          candidates: [],
          stats: INITIAL_STATS,
          notifications: [],
          liveLog: [],
          confettiTrigger: 0,
          onboardingChecked: {},

          // ──────────────────────────────────────────────────────────────
          // LIFECYCLE
          // ──────────────────────────────────────────────────────────────
          bootstrap: async () => {
            try {
              // 1. Load config dari IDB atau localStorage
              let savedConfig = await db.config.get();
              if (!savedConfig) {
                // coba dari localStorage legacy
                const legacy = localStorage.getItem('pulse-config');
                if (legacy) savedConfig = JSON.parse(legacy);
              }
              if (savedConfig) {
                const merged = mergeConfig(DEFAULT_CONFIG, savedConfig);
                const errors = validateConfig(merged);
                if (errors.length === 0) {
                  set(state => { state.config = merged; });
                } else {
                  console.warn('Invalid saved config, using default', errors);
                }
              }

              // 2. Load candidates dari IDB
              const savedCandidates = await db.candidates.getAll();
              if (savedCandidates.length) {
                set(state => { state.candidates = savedCandidates; });
              }

              // 3. Load onboarding state dari localStorage
              const onboarding = localStorage.getItem('pulse-onboarding');
              if (onboarding) {
                set(state => { state.onboardingChecked = JSON.parse(onboarding); });
              }

              // 4. Hitung ulang stats
              get().refreshStats();

              // 5. Tandai siap
              set(state => { state.isAppReady = true; });
            } catch (err) {
              console.error('Bootstrap failed', err);
              set(state => { state.isAppReady = true; }); // tetap lanjut dengan default
            }
          },

          setAppReady: (ready) => set(state => { state.isAppReady = ready; }),

          // ──────────────────────────────────────────────────────────────
          // NAVIGATION
          // ──────────────────────────────────────────────────────────────
          setActiveTab: (tab) => set(state => { state.activeTab = tab; }),
          toggleSidebar: () => set(state => { state.isSidebarOpen = !state.isSidebarOpen; }),

          // ──────────────────────────────────────────────────────────────
          // CONFIG
          // ──────────────────────────────────────────────────────────────
          updateConfig: async (patch) => {
            const current = get().config;
            const merged = mergeConfig(current, patch);
            const errors = validateConfig(merged);
            if (errors.length) {
              console.warn('Config validation errors', errors);
              // tetap simpan tapi warn
            }
            set(state => { state.config = merged; });
            await db.config.set(merged);
            get().refreshStats(); // karena threshold berubah
          },

          resetConfig: async () => {
            set(state => { state.config = DEFAULT_CONFIG; });
            await db.config.set(DEFAULT_CONFIG);
            get().refreshStats();
          },

          // ──────────────────────────────────────────────────────────────
          // CANDIDATES (dengan sync IDB)
          // ──────────────────────────────────────────────────────────────
          upsertCandidate: async (candidate) => {
            const current = get().candidates;
            const idx = current.findIndex(c => c.id === candidate.id);
            let newCandidates;
            if (idx >= 0) {
              newCandidates = [...current];
              newCandidates[idx] = { ...candidate, updatedAt: new Date().toISOString() };
            } else {
              newCandidates = [candidate, ...current];
            }
            set(state => { state.candidates = newCandidates; });
            await db.candidates.set(newCandidates);
            get().refreshStats();
          },

          deleteCandidate: async (id) => {
            const newCandidates = get().candidates.filter(c => c.id !== id);
            set(state => { state.candidates = newCandidates; });
            await db.candidates.set(newCandidates);
            get().refreshStats();
          },

          bulkUpdateCandidates: async (candidates) => {
            set(state => { state.candidates = candidates; });
            await db.candidates.set(candidates);
            get().refreshStats();
          },

          updateCandidateScore: async (id, competencyId, score) => {
            const candidate = get().candidates.find(c => c.id === id);
            if (!candidate) return;
            const existing = candidate.scores.find(s => s.competencyId === competencyId);
            const newScores = existing
              ? candidate.scores.map(s => s.competencyId === competencyId ? { ...s, score } : s)
              : [...candidate.scores, { competencyId, score, notes: '' }];
            const updatedCandidate = {
              ...candidate,
              scores: newScores,
              weightedScore: computeWeightedScore(newScores, get().config.competencies),
            };
            await get().upsertCandidate(updatedCandidate);
          },

          // ──────────────────────────────────────────────────────────────
          // STATS (reactive)
          // ──────────────────────────────────────────────────────────────
          refreshStats: () => {
            const { candidates, config } = get();
            const newStats = computeStatsFromCandidates(candidates, config);
            set(state => { state.stats = newStats; });
          },

          // ──────────────────────────────────────────────────────────────
          // TOAST
          // ──────────────────────────────────────────────────────────────
          addToast: (toast) => {
            const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
            set(state => {
              state.notifications.push({ ...toast, id });
              if (state.notifications.length > MAX_TOASTS) state.notifications.shift();
            });
            // auto dismiss setelah duration (default 4000)
            const duration = toast.duration ?? 4000;
            setTimeout(() => {
              get().removeToast(id);
            }, duration);
            return id;
          },

          removeToast: (id) => set(state => {
            state.notifications = state.notifications.filter(t => t.id !== id);
          }),

          // ──────────────────────────────────────────────────────────────
          // LIVE EVENTS
          // ──────────────────────────────────────────────────────────────
          ingestLiveEvent: (event) => set(state => {
            state.liveLog.unshift(event);
            if (state.liveLog.length > MAX_LIVE_EVENTS) state.liveLog.pop();
            // Auto-toast untuk event penting
            if (event.type === 'DECISION_FINALIZED' || event.type === 'CANDIDATE_CREATED') {
              const msg = event.type === 'DECISION_FINALIZED'
                ? `Decision made for candidate`
                : `New candidate added`;
              state.notifications.push({
                id: event.id,
                message: msg,
                type: 'info',
                duration: 3000,
              });
              if (state.notifications.length > MAX_TOASTS) state.notifications.shift();
            }
          }),

          clearLiveLog: () => set(state => { state.liveLog = []; }),

          // ──────────────────────────────────────────────────────────────
          // CONFETTI
          // ──────────────────────────────────────────────────────────────
          triggerConfetti: () => set(state => {
            state.confettiTrigger += 1;
            // juga set showConfetti jika diperlukan
            state.showConfetti = true;
            setTimeout(() => {
              set(s => { s.showConfetti = false; });
            }, 3000);
          }),

          // ──────────────────────────────────────────────────────────────
          // ONBOARDING
          // ──────────────────────────────────────────────────────────────
          toggleOnboardingItem: (itemId) => set(state => {
            state.onboardingChecked[itemId] = !state.onboardingChecked[itemId];
            // simpan ke localStorage
            localStorage.setItem('pulse-onboarding', JSON.stringify(state.onboardingChecked));
          }),
        })),
        {
          name: STORE_NAME,
          version: 1,
          // Hanya persist UI state (bukan candidates/config karena sudah di IDB)
          partialize: (state) => ({
            activeTab: state.activeTab,
            isSidebarOpen: state.isSidebarOpen,
            onboardingChecked: state.onboardingChecked,
            currentOrgId: state.currentOrgId,
          }),
          storage: createJSONStorage(() => localStorage),
          migrate: (persistedState: any, version) => {
            if (version === 0) {
              return {
                ...persistedState,
                onboardingChecked: {},
              };
            }
            return persistedState;
          },
        }
      )
    ),
    { name: 'PulseAppStore', enabled: import.meta.env.DEV }
  )
);

// ============================================================================
// 4. OPTIMIZED SELECTORS (dengan shallow & memoization)
// ============================================================================
export const useConfig = () => useAppStore((s) => s.config, shallow);
export const useCandidates = () => useAppStore((s) => s.candidates, shallow);
export const useStats = () => useAppStore((s) => s.stats, shallow);
export const useActiveTab = () => useAppStore((s) => s.activeTab);
export const useNotifications = () => useAppStore((s) => s.notifications, shallow);
export const useLiveLog = () => useAppStore((s) => s.liveLog, shallow);
export const useConfettiTrigger = () => useAppStore((s) => s.confettiTrigger);
export const useOnboardingChecked = () => useAppStore((s) => s.onboardingChecked, shallow);
export const useIsAppReady = () => useAppStore((s) => s.isAppReady);

// Granular selector untuk satu candidate
export const useCandidateById = (id: string) =>
  useAppStore((s) => s.candidates.find((c) => c.id === id), shallow);

// Selector untuk stats yang sudah diformat
export const useFormattedStats = () => {
  const stats = useStats();
  return {
    ...stats,
    strongHireRate: stats.total ? (stats.strongHires / stats.total) * 100 : 0,
    hireRate: stats.total ? (stats.hires / stats.total) * 100 : 0,
  };
};

// Action selector (agar komponen tidak re-render saat state lain berubah)
export const useAppActions = () => {
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const upsertCandidate = useAppStore((s) => s.upsertCandidate);
  const deleteCandidate = useAppStore((s) => s.deleteCandidate);
  const updateConfig = useAppStore((s) => s.updateConfig);
  const resetConfig = useAppStore((s) => s.resetConfig);
  const addToast = useAppStore((s) => s.addToast);
  const triggerConfetti = useAppStore((s) => s.triggerConfetti);
  const ingestLiveEvent = useAppStore((s) => s.ingestLiveEvent);
  const toggleOnboardingItem = useAppStore((s) => s.toggleOnboardingItem);
  const refreshStats = useAppStore((s) => s.refreshStats);
  const bulkUpdateCandidates = useAppStore((s) => s.bulkUpdateCandidates);
  const updateCandidateScore = useAppStore((s) => s.updateCandidateScore);
  return {
    setActiveTab,
    toggleSidebar,
    upsertCandidate,
    deleteCandidate,
    updateConfig,
    resetConfig,
    addToast,
    triggerConfetti,
    ingestLiveEvent,
    toggleOnboardingItem,
    refreshStats,
    bulkUpdateCandidates,
    updateCandidateScore,
  };
};

// ============================================================================
// 5. REACTIVE HOOKS (untuk side effects)
// ============================================================================
import { useEffect } from 'react';
import { liveService } from '@/lib/liveService';

export function useLiveEventSync() {
  const ingestLiveEvent = useAppStore((s) => s.ingestLiveEvent);
  useEffect(() => {
    const unsub = liveService.subscribe('*', (event) => {
      ingestLiveEvent(event);
    });
    return unsub;
  }, [ingestLiveEvent]);
}

// ============================================================================
// 6. RE-EXPORT
// ============================================================================
export type { AppStore, AppState, AppActions };
