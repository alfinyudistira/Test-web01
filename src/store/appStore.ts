// ═══════════════════════════════════════════════════════════════════════════
// ZUSTAND GLOBAL STORE — App-wide reactive state
// ═══════════════════════════════════════════════════════════════════════════
import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { PlatformConfig, AppStats, TabId, Candidate, ToastPayload, LiveUpdate } from '@/types';
import { DEFAULT_CONFIG } from '@/lib/defaultConfig';

interface AppStore {
  // ── Navigation ────────────────────────────────────────────────────────
  activeTab: TabId;
  showApp: boolean;
  setActiveTab: (tab: TabId) => void;
  setShowApp: (v: boolean) => void;

  // ── Platform Config (SSOT) ────────────────────────────────────────────
  config: PlatformConfig;
  updateConfig: (patch: Partial<PlatformConfig>) => void;
  resetConfig: () => void;

  // ── Candidates ────────────────────────────────────────────────────────
  candidates: Candidate[];
  addCandidate: (c: Candidate) => void;
  updateCandidate: (id: string, patch: Partial<Candidate>) => void;
  removeCandidate: (id: string) => void;
  clearCandidates: () => void;

  // ── Stats (derived + persisted) ───────────────────────────────────────
  stats: AppStats;
  recordEval: (score: number, decision: string) => void;
  resetStats: () => void;

  // ── UI ────────────────────────────────────────────────────────────────
  toasts: ToastPayload[];
  addToast: (t: Omit<ToastPayload, 'id'>) => void;
  removeToast: (id: string) => void;
  showConfetti: boolean;
  fireConfetti: () => void;

  // ── Onboarding completion map ─────────────────────────────────────────
  onboardingChecked: Record<string, boolean>;
  toggleOnboardingItem: (itemId: string) => void;

  // ── Live (WebSocket) ──────────────────────────────────────────────────
  liveUpdates: LiveUpdate[];
  addLiveUpdate: (u: LiveUpdate) => void;
  clearLiveUpdates: () => void;
}

const INITIAL_STATS: AppStats = {
  total: 0,
  strongHires: 0,
  hires: 0,
  noHires: 0,
  avgScore: 0,
  scores: [],
  lastUpdated: new Date().toISOString(),
};

export const useAppStore = create<AppStore>()(
  subscribeWithSelector(
    persist(
      immer((set) => ({
        // ── Navigation
        activeTab: 'calculator',
        showApp: false,
        setActiveTab: (tab) => set((s) => { s.activeTab = tab; }),
        setShowApp: (v) => set((s) => { s.showApp = v; }),

        // ── Config
        config: DEFAULT_CONFIG,
        updateConfig: (patch) => set((s) => { Object.assign(s.config, patch); }),
        resetConfig: () => set((s) => { s.config = DEFAULT_CONFIG; }),

        // ── Candidates
        candidates: [],
        addCandidate: (c) => set((s) => { s.candidates.push(c); }),
        updateCandidate: (id, patch) => set((s) => {
          const idx = s.candidates.findIndex((c) => c.id === id);
          if (idx !== -1) Object.assign(s.candidates[idx], patch);
        }),
        removeCandidate: (id) => set((s) => {
          s.candidates = s.candidates.filter((c) => c.id !== id);
        }),
        clearCandidates: () => set((s) => { s.candidates = []; }),

        // ── Stats
        stats: INITIAL_STATS,
        recordEval: (score, decision) => set((s) => {
          const newScores = [...s.stats.scores, score];
          s.stats.total += 1;
          if (score >= s.config.decisionThresholds.strongHire) s.stats.strongHires += 1;
          else if (score >= s.config.decisionThresholds.hire) s.stats.hires += 1;
          else s.stats.noHires += 1;
          s.stats.avgScore = newScores.reduce((a, b) => a + b, 0) / newScores.length;
          s.stats.scores = newScores;
          s.stats.lastUpdated = new Date().toISOString();
          void decision;
        }),
        resetStats: () => set((s) => { s.stats = { ...INITIAL_STATS, lastUpdated: new Date().toISOString() }; }),

        // ── UI
        toasts: [],
        addToast: (t) => set((s) => {
          const id = `toast-${Date.now()}-${Math.random()}`;
          s.toasts.push({ ...t, id });
        }),
        removeToast: (id) => set((s) => {
          s.toasts = s.toasts.filter((t) => t.id !== id);
        }),
        showConfetti: false,
        fireConfetti: () => {
          set((s) => { s.showConfetti = true; });
          setTimeout(() => set((s) => { s.showConfetti = false; }), 3200);
        },

        // ── Onboarding
        onboardingChecked: {},
        toggleOnboardingItem: (itemId) => set((s) => {
          s.onboardingChecked[itemId] = !s.onboardingChecked[itemId];
        }),

        // ── Live updates
        liveUpdates: [],
        addLiveUpdate: (u) => set((s) => {
          s.liveUpdates.unshift(u);
          if (s.liveUpdates.length > 50) s.liveUpdates.pop();
        }),
        clearLiveUpdates: () => set((s) => { s.liveUpdates = []; }),
      })),
      {
        name: 'pulse-app-store-v2',
        partialize: (s) => ({
          activeTab: s.activeTab,
          config: s.config,
          candidates: s.candidates,
          stats: s.stats,
          onboardingChecked: s.onboardingChecked,
        }),
      }
    )
  )
);

// ── Selector hooks (memoized slices) ─────────────────────────────────────
export const useConfig = () => useAppStore((s) => s.config);
export const useCandidates = () => useAppStore((s) => s.candidates);
export const useStats = () => useAppStore((s) => s.stats);
export const useActiveTab = () => useAppStore((s) => s.activeTab);
