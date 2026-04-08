/* ═══════════════════════════════════════════════════════════════════════════
   PULSE PIPELINE SLICE — Redux Toolkit Enterprise v2.1 (STRICT MODE)
   AI-powered | Abortable | Memoized | Batch Selection | Cache-aware
   ═══════════════════════════════════════════════════════════════════════════ */

import {
  createSlice,
  createAsyncThunk,
  createSelector,
  type PayloadAction,
} from '@reduxjs/toolkit';
import type { Candidate, HireDecision, CandidateId } from '@/types';
import type { RootState } from './reduxStore'; // Import untuk mengetatkan Selector

// ============================================================================
// 1. TYPES & CONSTANTS
// ============================================================================
export type AsyncStatus = 'idle' | 'loading' | 'success' | 'failed' | 'aborting';

export type AIContextType = 'recruitment_summary' | 'risk_assessment' | 'culture_fit';

interface AISummaryPayload {
  candidateId: CandidateId;
  context: AIContextType;
  notes: string;
  round?: string;
}

interface AICacheEntry {
  content: string;
  timestamp: number;
  context: AIContextType;
}

interface PipelineState {
  // AI Module
  aiContext: {
    content: string;
    status: AsyncStatus;
    error: string | null;
    lastGeneratedFor: CandidateId | null;
  };
  aiCache: Record<string, AICacheEntry>;

  // View & Filter
  viewOptions: {
    searchQuery: string;
    filterByDecision: HireDecision | 'ALL';
    sortBy: keyof Candidate;
    sortOrder: 'asc' | 'desc';
    minScoreThreshold: number; // filter kandidat dengan weightedScore >= threshold
  };

  // Selection & Batch
  selection: {
    selectedIds: CandidateId[];
    isBatchMode: boolean;
    lastFocusedId: CandidateId | null;
    highlightId: CandidateId | null; // untuk animasi scroll/focus
  };
}

const CACHE_TTL = 5 * 60 * 1000; // 5 menit

// Helper: cache key (Diekspor agar bisa di-tes dan dipakai di selector)
export const buildCacheKey = (payload: Omit<AISummaryPayload, 'notes' | 'round'> & { notes?: string }): string =>
  `${payload.candidateId}-${payload.context}-${(payload.notes || '').slice(0, 100)}`;

// ============================================================================
// 2. ASYNC THUNK (dengan abort + cache)
// ============================================================================
export const fetchCandidateAIInsights = createAsyncThunk<
  { content: string; cacheKey: string },
  AISummaryPayload,
  { rejectValue: string; state: { pipeline: PipelineState } }
>(
  'pipeline/fetchAIInsights',
  async (payload, { getState, signal, rejectWithValue }) => {
    const state = getState().pipeline;
    const cacheKey = buildCacheKey(payload);
    const cached = state.aiCache[cacheKey];

    // ✅ Cache hit & belum expired
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return { content: cached.content, cacheKey };
    }

    try {
      const controller = new AbortController();
      signal.addEventListener('abort', () => controller.abort());

      const response = await fetch('/api/v1/intelligence/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId: payload.candidateId,
          context: payload.context,
          notes: payload.notes,
          round: payload.round,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `AI Service Error ${response.status}`);
      }

      const data = await response.json();
      const content = data.content || data.summary || 'No insight generated.';

      return { content, cacheKey };
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return rejectWithValue('Request cancelled by user');
      }
      return rejectWithValue(err instanceof Error ? err.message : 'AI Engine failed to respond');
    }
  }
);

// ============================================================================
// 3. INITIAL STATE
// ============================================================================
const initialState: PipelineState = {
  aiContext: {
    content: '',
    status: 'idle',
    error: null,
    lastGeneratedFor: null,
  },
  aiCache: {},
  viewOptions: {
    searchQuery: '',
    filterByDecision: 'ALL',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    minScoreThreshold: 0,
  },
  selection: {
    selectedIds: [],
    isBatchMode: false,
    lastFocusedId: null,
    highlightId: null,
  },
};

// ============================================================================
// 4. SLICE (dengan reducers lengkap)
// ============================================================================
const pipelineSlice = createSlice({
  name: 'pipeline',
  initialState,
  reducers: {
    // ── Filter & Sort ──────────────────────────────────────────────
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.viewOptions.searchQuery = action.payload;
    },
    setDecisionFilter: (state, action: PayloadAction<HireDecision | 'ALL'>) => {
      state.viewOptions.filterByDecision = action.payload;
    },
    setSortConfiguration: (
      state,
      action: PayloadAction<{ field: keyof Candidate; order: 'asc' | 'desc' }>
    ) => {
      state.viewOptions.sortBy = action.payload.field;
      state.viewOptions.sortOrder = action.payload.order;
    },
    setMinScoreThreshold: (state, action: PayloadAction<number>) => {
      state.viewOptions.minScoreThreshold = Math.min(5, Math.max(0, action.payload));
    },

    // ── Selection (Batch Mode) ─────────────────────────────────────
    toggleCandidateSelection: (state, action: PayloadAction<CandidateId>) => {
      const id = action.payload;
      const index = state.selection.selectedIds.indexOf(id);
      if (index === -1) {
        state.selection.selectedIds.push(id);
      } else {
        state.selection.selectedIds.splice(index, 1);
      }
      state.selection.isBatchMode = state.selection.selectedIds.length > 0;
    },
    selectMultiple: (state, action: PayloadAction<CandidateId[]>) => {
      const newIds = action.payload.filter(id => !state.selection.selectedIds.includes(id));
      state.selection.selectedIds.push(...newIds);
      state.selection.isBatchMode = state.selection.selectedIds.length > 0;
    },
    clearSelection: (state) => {
      state.selection.selectedIds = [];
      state.selection.isBatchMode = false;
    },
    selectAllOnPage: (state, action: PayloadAction<CandidateId[]>) => {
      state.selection.selectedIds = action.payload;
      state.selection.isBatchMode = action.payload.length > 0;
    },
    setFocusedCandidate: (state, action: PayloadAction<CandidateId | null>) => {
      state.selection.lastFocusedId = action.payload;
    },
    setHighlightId: (state, action: PayloadAction<CandidateId | null>) => {
      state.selection.highlightId = action.payload;
    },

    // ── AI Module ──────────────────────────────────────────────────
    resetAIModule: (state) => {
      state.aiContext = initialState.aiContext;
    },
    clearAICache: (state) => {
      state.aiCache = {};
    },
    clearSpecificCache: (state, action: PayloadAction<string>) => {
      delete state.aiCache[action.payload];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCandidateAIInsights.pending, (state, action) => {
        state.aiContext.status = 'loading';
        state.aiContext.error = null;
        state.aiContext.lastGeneratedFor = action.meta.arg.candidateId;
      })
      .addCase(fetchCandidateAIInsights.fulfilled, (state, action) => {
        state.aiContext.status = 'success';
        state.aiContext.content = action.payload.content;
        state.aiCache[action.payload.cacheKey] = {
          content: action.payload.content,
          timestamp: Date.now(),
          context: action.meta.arg.context,
        };
      })
      .addCase(fetchCandidateAIInsights.rejected, (state, action) => {
        state.aiContext.status = 'failed';
        state.aiContext.error = action.payload ?? action.error?.message ?? 'Unknown error';
      });
  },
});

// ============================================================================
// 5. MEMOIZED SELECTORS (PERFORMANCE CRITICAL)
// ============================================================================
const selectPipelineState = (state: RootState) => state.pipeline;

// Base selectors
export const selectViewOptions = createSelector(
  [selectPipelineState],
  (pipeline) => pipeline.viewOptions
);
export const selectSelection = createSelector(
  [selectPipelineState],
  (pipeline) => pipeline.selection
);
export const selectAIContext = createSelector(
  [selectPipelineState],
  (pipeline) => pipeline.aiContext
);
export const selectAICache = createSelector(
  [selectPipelineState],
  (pipeline) => pipeline.aiCache
);

// Core: Filtered + Sorted + Threshold Candidates
export const selectProcessedCandidates = createSelector(
  [
    selectPipelineState,
    (_state: RootState, candidates: Candidate[]) => candidates,
  ],
  (pipeline, candidates) => {
    let result = [...candidates];

    // 1. Filter by decision
    if (pipeline.viewOptions.filterByDecision !== 'ALL') {
      result = result.filter(c => c.decision === pipeline.viewOptions.filterByDecision);
    }

    // 2. Filter by search query (name) - Safe Fallback
    const query = pipeline.viewOptions.searchQuery.trim().toLowerCase();
    if (query) {
      result = result.filter(c => (c.name || c.firstName || '').toLowerCase().includes(query));
    }

    // 3. Filter by min score threshold
    if (pipeline.viewOptions.minScoreThreshold > 0) {
      result = result.filter(c => (c.weightedScore ?? 0) >= pipeline.viewOptions.minScoreThreshold);
    }

    // 4. Sorting
    const { sortBy, sortOrder } = pipeline.viewOptions;
    const multiplier = sortOrder === 'asc' ? 1 : -1;
    result.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      if (aVal === undefined && bVal === undefined) return 0;
      if (aVal === undefined) return 1 * multiplier;
      if (bVal === undefined) return -1 * multiplier;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return (aVal - bVal) * multiplier;
      }
      return String(aVal).localeCompare(String(bVal)) * multiplier;
    });

    return result;
  }
);

// Selected candidates (full objects)
export const selectSelectedCandidates = createSelector(
  [selectPipelineState, (_state: RootState, candidates: Candidate[]) => candidates],
  (pipeline, candidates) => {
    const ids = pipeline.selection.selectedIds;
    return candidates.filter(c => ids.includes(c.id));
  }
);

// Apakah semua kandidat di halaman terpilih?
export const selectIsPageFullySelected = createSelector(
  [selectPipelineState, (_state: RootState, pageCandidateIds: CandidateId[]) => pageCandidateIds],
  (pipeline, pageIds) => {
    if (pageIds.length === 0) return false;
    return pageIds.every(id => pipeline.selection.selectedIds.includes(id));
  }
);

// AI summary untuk candidate tertentu (dari cache) - Diperbaiki agar lebih aman
export const selectCachedAIForCandidate = (candidateId: CandidateId, context: AIContextType) =>
  createSelector(
    [selectAICache],
    (cache) => {
      // Cari key yang berawalan kombinasi Id dan Context
      const cacheKeyPrefix = `${candidateId}-${context}`;
      const matchingKey = Object.keys(cache).find(key => key.startsWith(cacheKeyPrefix));
      
      return matchingKey ? cache[matchingKey]?.content ?? null : null;
    }
  );

// ============================================================================
// 6. EXPORT ACTIONS & REDUCER
// ============================================================================
export const {
  setSearchQuery,
  setDecisionFilter,
  setSortConfiguration,
  setMinScoreThreshold,
  toggleCandidateSelection,
  selectMultiple,
  clearSelection,
  selectAllOnPage,
  setFocusedCandidate,
  setHighlightId,
  resetAIModule,
  clearAICache,
  clearSpecificCache,
} = pipelineSlice.actions;

export default pipelineSlice.reducer;
