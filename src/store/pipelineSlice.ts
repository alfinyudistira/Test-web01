// ═══════════════════════════════════════════════════════════════════════════
// REDUX TOOLKIT SLICE — Hiring Pipeline (async ops, complex state machines)
// Used alongside Zustand for heavy async/middleware requirements
// ═══════════════════════════════════════════════════════════════════════════
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { Candidate, HireDecision } from '@/types';

// ── Async Thunks ──────────────────────────────────────────────────────────
export const generateAISummary = createAsyncThunk(
  'pipeline/generateAISummary',
  async (payload: { candidate: string; round: string; notes: string }, { rejectWithValue }) => {
    try {
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: `You are a senior HR professional. Write a concise 3-paragraph candidate summary for a hiring committee. Be professional, specific, and evidence-based. Candidate: ${payload.candidate}. Interview round: ${payload.round}.\n\nInterview notes:\n${payload.notes}\n\nFormat: Professional email summary, max 180 words, English only.`
          }]
        }),
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      return data.content?.[0]?.text ?? 'No summary generated.';
    } catch (err) {
      return rejectWithValue((err as Error).message);
    }
  }
);

// ── State Shape ───────────────────────────────────────────────────────────
interface PipelineState {
  aiSummary: string;
  aiSummaryStatus: 'idle' | 'loading' | 'success' | 'error';
  aiSummaryError: string | null;
  pipelineFilter: HireDecision | 'ALL';
  sortField: keyof Candidate;
  sortDir: 'asc' | 'desc';
  searchQuery: string;
  selectedIds: string[];
  highlightId: string | null;
}

const initialState: PipelineState = {
  aiSummary: '',
  aiSummaryStatus: 'idle',
  aiSummaryError: null,
  pipelineFilter: 'ALL',
  sortField: 'createdAt',
  sortDir: 'desc',
  searchQuery: '',
  selectedIds: [],
  highlightId: null,
};

// ── Slice ─────────────────────────────────────────────────────────────────
const pipelineSlice = createSlice({
  name: 'pipeline',
  initialState,
  reducers: {
    setFilter: (s, a: PayloadAction<HireDecision | 'ALL'>) => { s.pipelineFilter = a.payload; },
    setSort: (s, a: PayloadAction<{ field: keyof Candidate; dir: 'asc' | 'desc' }>) => {
      s.sortField = a.payload.field;
      s.sortDir = a.payload.dir;
    },
    setSearch: (s, a: PayloadAction<string>) => { s.searchQuery = a.payload; },
    toggleSelect: (s, a: PayloadAction<string>) => {
      const idx = s.selectedIds.indexOf(a.payload);
      if (idx === -1) s.selectedIds.push(a.payload);
      else s.selectedIds.splice(idx, 1);
    },
    clearSelection: (s) => { s.selectedIds = []; },
    setHighlight: (s, a: PayloadAction<string | null>) => { s.highlightId = a.payload; },
    clearAISummary: (s) => { s.aiSummary = ''; s.aiSummaryStatus = 'idle'; s.aiSummaryError = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(generateAISummary.pending, (s) => {
        s.aiSummaryStatus = 'loading';
        s.aiSummaryError = null;
      })
      .addCase(generateAISummary.fulfilled, (s, a) => {
        s.aiSummaryStatus = 'success';
        s.aiSummary = a.payload;
      })
      .addCase(generateAISummary.rejected, (s, a) => {
        s.aiSummaryStatus = 'error';
        s.aiSummaryError = a.payload as string;
      });
  },
});

export const {
  setFilter, setSort, setSearch,
  toggleSelect, clearSelection,
  setHighlight, clearAISummary,
} = pipelineSlice.actions;

export default pipelineSlice.reducer;
