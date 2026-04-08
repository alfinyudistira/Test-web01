/* ═══════════════════════════════════════════════════════════════════════════
   PULSE REDUX CORE — ENTERPRISE ORCHESTRATOR v3.1 (STRICT MODE)
   Dynamic reducers | Offline queue | Performance monitor | Persistence
   Fully typed | Production-optimized | Extensible
   ═══════════════════════════════════════════════════════════════════════════ */

import {
  configureStore,
  combineReducers,
  type Middleware,
  type Reducer,
  type UnknownAction, // Menggantikan AnyAction (RTK v2 Best Practice)
  isRejectedWithValue,
} from '@reduxjs/toolkit';
import {
  useDispatch,
  useSelector,
  type TypedUseSelectorHook,
} from 'react-redux';
import pipelineReducer from './pipelineSlice';
import { haptic } from '@/lib/utils';
import { db } from '@/lib/idb';

// ============================================================================
// 1. ENVIRONMENT & CONSTANTS
// ============================================================================
const isDev = import.meta.env.DEV;
const PERSIST_KEY = 'pulse-redux-state-v1';
const OFFLINE_QUEUE_KEY = 'pulse-offline-queue';
const DEBOUNCE_TIME = 500; // ms untuk deduplication

// ============================================================================
// 2. DYNAMIC REDUCER REGISTRY (untuk lazy loading modules)
// ============================================================================
const staticReducers = {
  pipeline: pipelineReducer,
  // tambah reducer statis lain di sini
};

const asyncReducers: Record<string, Reducer> = {};

function createRootReducer() {
  return combineReducers({
    ...staticReducers,
    ...asyncReducers,
  });
}

export function injectReducer(key: string, reducer: Reducer): void {
  if (asyncReducers[key]) return;
  asyncReducers[key] = reducer;
  reduxStore.replaceReducer(createRootReducer());
}

export function removeReducer(key: string): void {
  if (!asyncReducers[key]) return;
  delete asyncReducers[key];
  reduxStore.replaceReducer(createRootReducer());
}

// ============================================================================
// 3. MIDDLEWARES ENTERPRISE
// ============================================================================

// ── 3.1 Error Logger + Haptic Feedback
const errorMiddleware: Middleware = () => (next) => (action) => {
  try {
    if (isRejectedWithValue(action)) {
      const payload = (action as { payload?: unknown }).payload;
      const errorMsg = (action as { error?: { message?: string } }).error?.message;
      const errorPayload = typeof payload === 'string' ? payload : errorMsg || 'Unknown Redux Error';
      
      console.error('🚨 [Redux] Async Error:', errorPayload);
      haptic('error');
      
      if (typeof window !== 'undefined' && window._sentry) {
        window._sentry.captureException(errorPayload);
      }
    }
    return next(action);
  } catch (err) {
    console.error('[Redux] Sync Error:', err, action);
    haptic('error');
    throw err;
  }
};

// ── 3.2 Performance Monitor
const perfMiddleware: Middleware = () => (next) => (action) => {
  const isPipelineFetch = (a: unknown): a is { type: string } => {
    return typeof a === 'object' && a !== null && 'type' in a && typeof (a as { type: string }).type === 'string';
  };

  if (!isDev && isPipelineFetch(action) && action.type.startsWith('pipeline/fetch')) {
    const start = performance.now();
    const result = next(action);
    const duration = performance.now() - start;
    if (duration > 100) {
      console.warn(`⚠️ Slow action ${action.type}: ${duration.toFixed(2)}ms`);
    }
    return result;
  }
  return next(action);
};

// ── 3.3 Action Deduplication
const dedupeMiddleware: Middleware = () => {
  const lastDispatched = new Map<string, number>();
  return (next) => (action) => {
    const act = action as UnknownAction;
    if (typeof act.type !== 'string') return next(action);

    const now = Date.now();
    const key = `${act.type}-${JSON.stringify(act.payload)}`;
    const last = lastDispatched.get(key);
    
    if (last && now - last < DEBOUNCE_TIME) {
      return action; // skip deduplication
    }
    lastDispatched.set(key, now);
    return next(action);
  };
};

// ── 3.4 Offline Queue (Type-Safe)
interface QueuedAction {
  action: UnknownAction;
  timestamp: number;
  retries: number;
}
let offlineQueue: QueuedAction[] = [];

async function loadOfflineQueue() {
  try {
    const stored = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (stored) {
      offlineQueue = JSON.parse(stored) as QueuedAction[];
    }
  } catch {}
}

function saveOfflineQueue() {
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(offlineQueue.slice(0, 50)));
}

const offlineMiddleware: Middleware = () => (next) => (action) => {
  const act = action as UnknownAction;
  if (typeof act.type !== 'string') return next(action);

  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
  const needsNetwork = act.type.endsWith('/pending') || act.type.includes('fetch');
  
  const meta = act.meta as { skipOfflineQueue?: boolean } | undefined;

  if (isOffline && needsNetwork && !meta?.skipOfflineQueue) {
    offlineQueue.push({ action: act, timestamp: Date.now(), retries: 0 });
    saveOfflineQueue();
    console.log(`📴 Offline: queued action ${act.type}`);
    return action;
  }
  return next(action);
};

if (typeof window !== 'undefined') {
  window.addEventListener('online', async () => {
    if (offlineQueue.length === 0) return;
    console.log(`🔄 Online: replaying ${offlineQueue.length} actions`);
    const toReplay = [...offlineQueue];
    offlineQueue = [];
    saveOfflineQueue();
    for (const item of toReplay) {
      try {
        await reduxStore.dispatch(item.action);
      } catch (err) {
        console.error('Failed to replay offline action', err);
      }
    }
  });
}

// ── 3.5 Persistence Middleware
const persistenceMiddleware: Middleware = (store) => (next) => (action) => {
  const result = next(action);
  const state = store.getState() as { pipeline?: { viewOptions?: unknown; selection?: unknown } };
  
  if (state.pipeline) {
    const toPersist = {
      pipeline: {
        viewOptions: state.pipeline.viewOptions,
        selection: state.pipeline.selection,
      },
    };
    try {
      localStorage.setItem(PERSIST_KEY, JSON.stringify(toPersist));
    } catch {}
  }
  return result;
};

// ── 3.6 Analytics/Telemetry
const analyticsMiddleware: Middleware = () => (next) => (action) => {
  const act = action as UnknownAction;
  if (typeof act.type !== 'string') return next(action);

  const tracked = ['pipeline/fetchAIInsights/fulfilled', 'pipeline/setDecisionFilter', 'pipeline/setSearchQuery'];
  if (tracked.includes(act.type)) {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', act.type, { payload: act.payload });
    }
  }
  return next(action);
};

// ── 3.7 Logger (Dev Only)
const loggerMiddleware: Middleware = (store) => (next) => (action) => {
  if (!isDev) return next(action);
  const act = action as UnknownAction;
  
  const start = performance.now();
  const result = next(action);
  const end = performance.now();
  
  console.log(
    `%c[Redux] ${act.type || 'UNKNOWN'}`,
    'color:#C8A97E;font-weight:bold;',
    {
      payload: act.payload,
      duration: `${(end - start).toFixed(2)}ms`,
      state: store.getState(),
    }
  );
  return result;
};

// ============================================================================
// 4. CREATE STORE WITH ALL MIDDLEWARES
// ============================================================================
export const reduxStore = configureStore({
  reducer: createRootReducer(),
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActionPaths: ['payload.createdAt', 'payload.updatedAt', 'meta.arg.signal'],
        ignoredPaths: ['pipeline.aiContext.lastGeneratedFor', 'pipeline.aiCache'],
      },
      thunk: {
        extraArgument: { db, haptic },
      },
    }).concat(
      errorMiddleware,
      perfMiddleware,
      dedupeMiddleware,
      offlineMiddleware,
      persistenceMiddleware,
      analyticsMiddleware,
      loggerMiddleware
    ),
  devTools: isDev
    ? {
        name: 'Pulse Enterprise Redux',
        trace: true,
        traceLimit: 25,
      }
    : false,
  // RTK v2 Best Practice untuk enhancers
  enhancers: (getDefaultEnhancers) => getDefaultEnhancers(),
});

// ============================================================================
// 5. LOAD PERSISTED STATE
// ============================================================================
async function loadPersistedState() {
  try {
    const saved = localStorage.getItem(PERSIST_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as { pipeline?: { viewOptions?: unknown; selection?: unknown } };
      if (parsed.pipeline?.viewOptions) {
        reduxStore.dispatch({ type: 'pipeline/restoreViewOptions', payload: parsed.pipeline.viewOptions });
      }
      if (parsed.pipeline?.selection) {
        reduxStore.dispatch({ type: 'pipeline/restoreSelection', payload: parsed.pipeline.selection });
      }
    }
  } catch {}
}

loadOfflineQueue();
loadPersistedState();

// ============================================================================
// 6. TYPES & HOOKS
// ============================================================================
export type RootState = ReturnType<typeof reduxStore.getState>;
export type AppDispatch = typeof reduxStore.dispatch;

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export function createSelectorHook<T>(selector: (state: RootState) => T): () => T {
  return () => useAppSelector(selector);
}

// ============================================================================
// 7. EXPOSE STORE GLOBALLY
// ============================================================================
declare global {
  interface Window {
    __REDUX_STORE__?: typeof reduxStore;
    _sentry?: { captureException: (err: unknown) => void };
    gtag?: (command: string, action: string, params: unknown) => void;
  }
}

if (isDev && typeof window !== 'undefined') {
  window.__REDUX_STORE__ = reduxStore;
}

// ============================================================================
// 8. INTEGRATION WITH ZUSTAND STORE
// ============================================================================
import { useAppStore as useZustandAppStore } from './appStore';

export function syncZustandToRedux() {
  const unsubscribe = useZustandAppStore.subscribe((state) => {
    reduxStore.dispatch({
      type: 'pipeline/syncConfig',
      payload: { config: state.config },
    });
  });
  return unsubscribe;
}

// ============================================================================
// 9. DEFAULT EXPORT
// ============================================================================
export default reduxStore;
