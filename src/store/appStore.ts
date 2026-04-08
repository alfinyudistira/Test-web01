/* ═══════════════════════════════════════════════════════════════════════════
   PULSE ENTERPRISE STORE — Zustand v5 + Immer + IDB + Devtools
   Scalable | Observable | Optimistic | Dual Persistence | Type-Safe
   ═══════════════════════════════════════════════════════════════════════════ */

import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { useShallow } from 'zustand/react/shallow'; // Upgrade ke Zustand v5 API
import type {
  PlatformConfig,
  AppStats,
  TabId,
  Candidate,
  ToastPayload,
  AppEvent,
  OrganizationId,
  CandidateId,
  CompetencyId,
  JSONValue,
} from '@/types';
import { DEFAULT_CONFIG, mergeConfig, validateConfig } from '@/lib/defaultconfig';
import { db } from '@/lib/idb';
import { computeWeightedScore, uid, safeParseJSON, isResultOk } from '@/lib/utils'; // Integrasi utilitas

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
  liveLog: AppEvent<JSONValue>[];
  confettiTrigger: number;
  onboardingChecked: Record<string, boolean>;
  showConfetti?: boolean;
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

  // Candidates
  upsertCandidate: (candidate: Candidate) => Promise<void>;
  deleteCandidate: (id: CandidateId) => Promise<void>;
  bulkUpdateCandidates: (candidates: Candidate[]) => Promise<void>;
  updateCandidateScore: (id: CandidateId, competencyId: CompetencyId, score: number) => Promise<void>;

  // Stats
  refreshStats: () => void;

  // Toast
  addToast: (toast: Omit<ToastPayload, 'id'>) => string;
  removeToast: (id: string) => void;

  // Live Events
  ingestLiveEvent: (event: AppEvent<JSONValue>) => void;
  clearLiveLog: () => void;

  // Confetti
  triggerConfetti: () => void;

  // Onboarding
  toggleOnboardingItem: (itemId: string) => void;
}

type AppStore = AppState & AppActions;

// ============================================================================
// 3. CREATE STORE
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
              let savedConfig = await db.config.get();
              if (!savedConfig) {
                const legacy = localStorage.getItem('pulse-config');
                if (legacy) {
                  const parsed = safeParseJSON<PlatformConfig>(legacy);
                  if (isResultOk(parsed)) savedConfig = parsed.value;
                }
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

              const savedCandidates = await db.candidates.getAll();
              if (savedCandidates.length) {
                set(state => { state.candidates = savedCandidates; });
              }

              const onboarding = localStorage.getItem('pulse-onboarding');
              if (onboarding) {
                const parsed = safeParseJSON<Record<string, boolean>>(onboarding);
                if (isResultOk(parsed)) {
                  set(state => { state.onboardingChecked = parsed.value; });
                }
              }

              get().refreshStats();
              set(state => { state.isAppReady = true; });
            } catch (err) {
              console.error('Bootstrap failed', err);
              set(state => { state.isAppReady = true; });
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
            }
            set(state => { state.config = merged; });
            await db.config.set(merged);
            get().refreshStats();
          },

          resetConfig: async () => {
            set(state => { state.config = DEFAULT_CONFIG; });
            await db.config.set(DEFAULT_CONFIG);
            get().refreshStats();
          },

          // ──────────────────────────────────────────────────────────────
          // CANDIDATES
          // ──────────────────────────────────────────────────────────────
          upsertCandidate: async (candidate) => {
            const current = get().candidates;
            const idx = current.findIndex(c => c.id === candidate.id);
            let newCandidates;
            if (idx >= 0) {
              newCandidates = [...current];
              newCandidates[idx] = { ...candidate, updatedAt: new Date().toISOString() as any };
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
              ? candidate.scores.map(s => s.competencyId === competencyId ? { ...s, score: score as any } : s)
              : [...candidate.scores, { competencyId, score: score as any, notes: '' }];
            const updatedCandidate: Candidate = {
              ...candidate,
              scores: newScores,
              weightedScore: computeWeightedScore(newScores, get().config.competencies),
            };
            await get().upsertCandidate(updatedCandidate);
          },

          // ──────────────────────────────────────────────────────────────
          // STATS
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
            const id = `toast-${uid()}`; // Menggunakan fungsi uid() enterprise kita
            set(state => {
              state.notifications.push({ ...toast, id });
              if (state.notifications.length > MAX_TOASTS) state.notifications.shift();
            });
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
            localStorage.setItem('pulse-onboarding', JSON.stringify(state.onboardingChecked));
          }),
        })),
        {
          name: STORE_NAME,
          version: 1,
          partialize: (state) => ({
            activeTab: state.activeTab,
            isSidebarOpen: state.isSidebarOpen,
            onboardingChecked: state.onboardingChecked,
            currentOrgId: state.currentOrgId,
          }),
          storage: createJSONStorage(() => localStorage),
          migrate: (persistedState: unknown, version) => {
            if (version === 0) {
              const state = persistedState as Partial<AppState>;
              return {
                ...state,
                onboardingChecked: state.onboardingChecked ?? {},
              };
            }
            return persistedState as Partial<AppState>;
          },
        }
      )
    ),
    { name: 'PulseAppStore', enabled: import.meta.env.DEV }
  )
);

// ============================================================================
// 4. OPTIMIZED SELECTORS (Zustand v5 Best Practice)
// ============================================================================
export const useConfig = () => useAppStore(useShallow((s) => s.config));
export const useCandidates = () => useAppStore(useShallow((s) => s.candidates));
export const useStats = () => useAppStore(useShallow((s) => s.stats));
export const useActiveTab = () => useAppStore((s) => s.activeTab);
export const useNotifications = () => useAppStore(useShallow((s) => s.notifications));
export const useLiveLog = () => useAppStore(useShallow((s) => s.liveLog));
export const useConfettiTrigger = () => useAppStore((s) => s.confettiTrigger);
export const useOnboardingChecked = () => useAppStore(useShallow((s) => s.onboardingChecked));
export const useIsAppReady = () => useAppStore((s) => s.isAppReady);

export const useCandidateById = (id: string) =>
  useAppStore(useShallow((s) => s.candidates.find((c) => c.id === id)));

export const useFormattedStats = () => {
  const stats = useStats();
  return {
    ...stats,
    strongHireRate: stats.total ? (stats.strongHires / stats.total) * 100 : 0,
    hireRate: stats.total ? (stats.hires / stats.total) * 100 : 0,
  };
};

// ============================================================================
// 5. STATIC ACTIONS (Mencegah Infinite Re-render di Komponen React)
// ============================================================================
/**
 * Best practice Zustand: Export action secara statis dari getState().
 * Memanggil useAppActions() tidak akan memicu re-render pada komponen,
 * sehingga sangat aman digunakan di dalam useEffect atau event handler.
 */
export const useAppActions = () => {
  return useAppStore.getState();
};

// ============================================================================
// 6. REACTIVE HOOKS (untuk side effects)
// ============================================================================
import { useEffect } from 'react';
import { liveService } from '@/lib/liveService';

export function useLiveEventSync() {
  useEffect(() => {
    // Action dipanggil via getState agar aman di dalam useEffect
    const { ingestLiveEvent } = useAppStore.getState();
    const unsub = liveService.subscribe('*', (event) => {
      ingestLiveEvent(event);
    });
    return unsub;
  }, []);
}

// ============================================================================
// 7. RE-EXPORT
// ============================================================================
export type { AppStore, AppState, AppActions };
