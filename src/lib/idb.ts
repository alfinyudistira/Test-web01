import { get, set, del, keys, createStore, clear } from 'idb-keyval';
import type { 
  Candidate, 
  PlatformConfig, 
  OrganizationId, 
  UserId, 
  UserPreferences,
  DeepPartial,
  ISODate
} from '@/types';

const DB_NAME = 'pulse-enterprise-db';
const STORE_NAME = 'pulse-vault';
const SCHEMA_VERSION = 2;
const CURRENT_DB_VERSION = 2;

const pulseStore = createStore(DB_NAME, STORE_NAME);
const KEYS = {
  CANDIDATES: 'core::candidates',
  CONFIG: 'core::config',
  ONBOARDING: 'state::onboarding',
  STATS: 'cache::stats',
  SESSION: 'auth::session',
  META: 'sys::meta',
  PREFERENCES: 'user::preferences',
} as const;

type Key = typeof KEYS[keyof typeof KEYS];

interface StorageEnvelope<T> {
  version: number;
  timestamp: string;
  orgId?: OrganizationId;
  userId?: UserId;
  payload: T;
}

interface CacheWrapper<T> {
  value: T;
  expiry?: number;
}

interface MetaState {
  version: number;
  lastSync?: string;
  tenantId?: string;
  quotaWarning?: boolean;
}

export interface UserSession {
  userId: UserId;
  token: string;
  expiresAt: ISODate;
  role: string;
}

type DataChangeEvent = {
  key: Key;
  action: 'set' | 'delete' | 'clear';
  entityId?: string;
};

type DataChangeListener = (event: DataChangeEvent) => void;
const listeners = new Set<DataChangeListener>();

function emitChange(event: DataChangeEvent) {
  listeners.forEach((fn) => fn(event));
}

export function onDataChange(listener: DataChangeListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function getMeta(): Promise<MetaState> {
  const meta = await get<MetaState>(KEYS.META, pulseStore);
  return meta ?? { version: CURRENT_DB_VERSION };
}

async function setMeta(meta: MetaState): Promise<void> {
  await set(KEYS.META, meta, pulseStore);
}

async function saveWithEnvelope<T>(
  key: Key,
  data: T,
  options?: { orgId?: OrganizationId; userId?: UserId }
): Promise<void> {
  const envelope: StorageEnvelope<T> = {
    version: SCHEMA_VERSION,
    timestamp: new Date().toISOString(),
    orgId: options?.orgId,
    userId: options?.userId,
    payload: data,
  };
  try {
    await set(key, envelope, pulseStore);
    emitChange({ key, action: 'set' });
  } catch (error) {
    console.error(`[IDB] Failed to save ${key}:`, error);
    const { quota, usage } = await getStorageEstimate();
    if (quota && usage && usage / quota > 0.95) {
      console.warn('[IDB] Storage nearly full, triggering cleanup');
      await autoCleanup();
    }
    throw error;
  }
}

async function loadFromEnvelope<T>(key: Key): Promise<T | null> {
  const envelope = await get<StorageEnvelope<T>>(key, pulseStore);
  if (!envelope) return null;
  if (envelope.version !== SCHEMA_VERSION) {
    console.warn(`[IDB] Version mismatch for ${key}: expected ${SCHEMA_VERSION}, got ${envelope.version}`);
  }
  return envelope.payload;
}

async function safeGet<T>(key: Key, fallback: T): Promise<T> {
  try {
    const data = await loadFromEnvelope<T>(key);
    return data !== null ? data : fallback;
  } catch {
    return fallback;
  }
}

async function safeSet<T>(key: Key, value: T, options?: { orgId?: OrganizationId; userId?: UserId }): Promise<void> {
  await saveWithEnvelope(key, value, options);
}

async function setWithTTL<T>(key: Key, value: T, ttlMs?: number): Promise<void> {
  const wrapper: CacheWrapper<T> = {
    value,
    expiry: ttlMs ? Date.now() + ttlMs : undefined,
  };
  await set(key, wrapper, pulseStore);
}

async function getWithTTL<T>(key: Key, fallback: T): Promise<T> {
  const wrapper = await get<CacheWrapper<T>>(key, pulseStore);
  if (!wrapper) return fallback;
  if (wrapper.expiry && Date.now() > wrapper.expiry) {
    await del(key, pulseStore);
    return fallback;
  }
  return wrapper.value;
}

async function getStorageEstimate() {
  if ('storage' in navigator && navigator.storage) {
    return await navigator.storage.estimate();
  }
  return { usage: undefined, quota: undefined };
}

async function autoCleanup(): Promise<void> {
  const allKeys = await keys(pulseStore);
  for (const k of allKeys) {
    if (typeof k === 'string' && k.startsWith('cache::')) {
      const wrapper = await get<CacheWrapper<unknown>>(k, pulseStore);
      if (wrapper?.expiry && Date.now() > wrapper.expiry) {
        await del(k, pulseStore);
      }
    }
  }
}

export async function idbGetCandidates(): Promise<Candidate[]> {
  return safeGet<Candidate[]>(KEYS.CANDIDATES, []);
}

export async function idbSetCandidates(candidates: Candidate[], orgId?: OrganizationId): Promise<void> {
  await safeSet(KEYS.CANDIDATES, candidates, { orgId });
}

export async function idbUpsertCandidate(candidate: Candidate, orgId?: OrganizationId): Promise<void> {
  const list = await idbGetCandidates();
  const idx = list.findIndex((c) => c.id === candidate.id);
  if (idx >= 0) list[idx] = candidate;
  else list.push(candidate);
  await idbSetCandidates(list, orgId);
}

export async function idbBatchUpsertCandidates(candidates: Candidate[], orgId?: OrganizationId): Promise<void> {
  const existing = await idbGetCandidates();
  const map = new Map(existing.map(c => [c.id, c]));
  for (const candidate of candidates) {
    map.set(candidate.id, candidate);
  }
  await idbSetCandidates(Array.from(map.values()), orgId);
}

export async function idbDeleteCandidate(id: string): Promise<void> {
  const list = await idbGetCandidates();
  const filtered = list.filter((c) => c.id !== id);
  await idbSetCandidates(filtered);
  emitChange({ key: KEYS.CANDIDATES, action: 'delete', entityId: id });
}

export async function idbClearCandidates(): Promise<void> {
  await del(KEYS.CANDIDATES, pulseStore);
  emitChange({ key: KEYS.CANDIDATES, action: 'clear' });
}

export async function idbUpdateCandidate(
  id: string,
  updater: (candidate: Candidate) => Candidate
): Promise<void> {
  const list = await idbGetCandidates();
  const index = list.findIndex(c => c.id === id);
  if (index === -1) throw new Error(`Candidate ${id} not found`);
  list[index] = updater(list[index] as Candidate);
  await idbSetCandidates(list);
  emitChange({ key: KEYS.CANDIDATES, action: 'set', entityId: id });
}

export async function idbQueryCandidates(
  filter?: (c: Candidate) => boolean,
  sort?: (a: Candidate, b: Candidate) => number,
  limit?: number
): Promise<Candidate[]> {
  let result = await idbGetCandidates();
  if (filter) result = result.filter(filter);
  if (sort) result = result.sort(sort);
  if (limit) result = result.slice(0, limit);
  return result;
}

export async function idbGetConfig(): Promise<PlatformConfig | null> {
  return loadFromEnvelope<PlatformConfig>(KEYS.CONFIG);
}

export async function idbSetConfig(config: PlatformConfig, userId?: UserId): Promise<void> {
  await safeSet(KEYS.CONFIG, config, { userId });
}

export async function idbUpdateConfig(updater: (config: PlatformConfig) => PlatformConfig): Promise<void> {
  const current = await idbGetConfig();
  if (!current) throw new Error('Config not found');
  const updated = updater(current);
  await idbSetConfig(updated);
}

export async function idbGetOnboarding(): Promise<Record<string, boolean>> {
  return safeGet<Record<string, boolean>>(KEYS.ONBOARDING, {});
}

export async function idbSetOnboarding(state: Record<string, boolean>): Promise<void> {
  await safeSet(KEYS.ONBOARDING, state);
}

export async function idbSetOnboardingStep(step: string, completed: boolean): Promise<void> {
  const current = await idbGetOnboarding();
  current[step] = completed;
  await idbSetOnboarding(current);
}

export async function idbSetStatsCache<T>(data: T, ttlMs: number = 5 * 60 * 1000): Promise<void> {
  await setWithTTL(KEYS.STATS, data, ttlMs);
}

export async function idbGetStatsCache<T>(): Promise<T | null> {
  return getWithTTL<T | null>(KEYS.STATS, null);
}

export async function idbSetSession(session: UserSession): Promise<void> {
  await safeSet(KEYS.SESSION, session);
}

export async function idbGetSession(): Promise<UserSession | null> {
  return loadFromEnvelope<UserSession>(KEYS.SESSION);
}

export async function idbClearSession(): Promise<void> {
  await del(KEYS.SESSION, pulseStore);
}

export async function idbSetPreferences(prefs: DeepPartial<UserPreferences>): Promise<void> {
  const existing = await idbGetPreferences();
  const merged = { ...existing, ...prefs } as UserPreferences;
  await safeSet(KEYS.PREFERENCES, merged);
}

export async function idbGetPreferences(): Promise<Partial<UserPreferences>> {
  return safeGet<Partial<UserPreferences>>(KEYS.PREFERENCES, {});
}

async function runMigrations(): Promise<void> {
  const meta = await getMeta();
  let currentVersion = meta.version;

  if (currentVersion < 1) {
    console.log('[IDB] Running migration to v1');
    currentVersion = 1;
  }
  if (currentVersion < 2) {
    console.log('[IDB] Running migration to v2');
    currentVersion = 2;
  }

  if (currentVersion !== meta.version) {
    await setMeta({ ...meta, version: currentVersion, lastSync: new Date().toISOString() });
  }
}

export async function idbResetAll(): Promise<void> {
  const allKeys = await keys(pulseStore);
  await Promise.all(allKeys.map((k) => del(k, pulseStore)));
  await setMeta({ version: CURRENT_DB_VERSION });
  emitChange({ key: KEYS.CANDIDATES, action: 'clear' });
  emitChange({ key: KEYS.CONFIG, action: 'clear' });
}

export async function idbPurgeAllData(): Promise<void> {
  await clear(pulseStore);
  await setMeta({ version: CURRENT_DB_VERSION });
  console.warn('[IDB] All data purged (GDPR compliance)');
}

export async function idbGetDiagnostics() {
  const allKeys = await keys(pulseStore);
  const { usage, quota } = await getStorageEstimate();
  const persisted = await navigator.storage?.persisted();
  return {
    keys: allKeys,
    keyCount: allKeys.length,
    usage,
    quota,
    persisted,
    dbName: DB_NAME,
    schemaVersion: SCHEMA_VERSION,
  };
}

export async function idbDump(): Promise<Record<string, unknown>> {
  const allKeys = await keys(pulseStore);
  const entries = await Promise.all(
    allKeys.map(async (k) => [k, await get(k, pulseStore)])
  );
  return Object.fromEntries(entries);
}

let initialized = false;
export async function initIDB(): Promise<void> {
  if (initialized) return;
  await runMigrations();
  const { quota, usage } = await getStorageEstimate();
  if (quota && usage && usage / quota > 0.8) {
    console.warn('[IDB] Storage usage above 80%, consider cleanup');
  }
  initialized = true;
}

export function createReactiveQuery<T>(
  fetcher: () => Promise<T>,
  deps: Key[] = []
): {
  get: () => Promise<T>;
  subscribe: (callback: (value: T) => void) => () => void;
  invalidate: () => Promise<void>;
} {
  let currentValue: T | null = null;
  const subscribers = new Set<(value: T) => void>();

  const fetchAndNotify = async () => {
    const newValue = await fetcher();
    currentValue = newValue;
    subscribers.forEach(cb => cb(newValue));
  };

  const handleChange = (event: DataChangeEvent) => {
    if (deps.includes(event.key)) {
      fetchAndNotify();
    }
  };

  onDataChange(handleChange);

  return {
    get: async () => {
      if (currentValue === null) {
        await fetchAndNotify();
      }
      return currentValue as T;
    },
    subscribe: (callback) => {
      subscribers.add(callback);
      if (currentValue !== null) callback(currentValue);
      return () => subscribers.delete(callback);
    },
    invalidate: async () => {
      await fetchAndNotify();
    },
  };
}

export const db = {
  candidates: {
    getAll: idbGetCandidates,
    set: idbSetCandidates,
    upsert: idbUpsertCandidate,
    batchUpsert: idbBatchUpsertCandidates,
    delete: idbDeleteCandidate,
    update: idbUpdateCandidate,
    clear: idbClearCandidates,
    query: idbQueryCandidates,
  },
  config: {
    get: idbGetConfig,
    set: idbSetConfig,
    update: idbUpdateConfig,
  },
  onboarding: {
    get: idbGetOnboarding,
    set: idbSetOnboarding,
    setStep: idbSetOnboardingStep,
  },
  stats: {
    set: idbSetStatsCache,
    get: idbGetStatsCache,
  },
  session: {
    get: idbGetSession,
    set: idbSetSession,
    clear: idbClearSession,
  },
  preferences: {
    get: idbGetPreferences,
    set: idbSetPreferences,
  },
  reset: idbResetAll,
  purge: idbPurgeAllData,
  diagnostics: idbGetDiagnostics,
  dump: idbDump,
  init: initIDB,
  onDataChange,
  createReactiveQuery,
};
