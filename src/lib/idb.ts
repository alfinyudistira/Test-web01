// ═══════════════════════════════════════════════════════════════════════════
// IDB PERSISTENCE — IndexedDB via idb-keyval for offline-first storage
// ═══════════════════════════════════════════════════════════════════════════
import { get, set, del, keys, createStore } from 'idb-keyval';
import type { Candidate, PlatformConfig } from '@/types';

// Custom IDB store (isolated namespace)
const pulseStore = createStore('pulse-hiring-db', 'pulse-store');

// ── Keys ──────────────────────────────────────────────────────────────────
const KEYS = {
  CANDIDATES: 'candidates',
  CONFIG:     'platform-config',
  STATS:      'app-stats',
  ONBOARDING: 'onboarding-state',
} as const;

// ── Candidates ────────────────────────────────────────────────────────────
export async function idbGetCandidates(): Promise<Candidate[]> {
  return (await get<Candidate[]>(KEYS.CANDIDATES, pulseStore)) ?? [];
}
export async function idbSetCandidates(data: Candidate[]): Promise<void> {
  await set(KEYS.CANDIDATES, data, pulseStore);
}
export async function idbClearCandidates(): Promise<void> {
  await del(KEYS.CANDIDATES, pulseStore);
}

// ── Config ────────────────────────────────────────────────────────────────
export async function idbGetConfig(): Promise<Partial<PlatformConfig> | undefined> {
  return get<Partial<PlatformConfig>>(KEYS.CONFIG, pulseStore);
}
export async function idbSetConfig(config: Partial<PlatformConfig>): Promise<void> {
  await set(KEYS.CONFIG, config, pulseStore);
}

// ── Onboarding state ──────────────────────────────────────────────────────
export async function idbGetOnboarding(): Promise<Record<string, boolean>> {
  return (await get<Record<string, boolean>>(KEYS.ONBOARDING, pulseStore)) ?? {};
}
export async function idbSetOnboarding(state: Record<string, boolean>): Promise<void> {
  await set(KEYS.ONBOARDING, state, pulseStore);
}

// ── Debug: list all keys ─────────────────────────────────────────────────
export async function idbListKeys(): Promise<IDBValidKey[]> {
  return keys(pulseStore);
}
