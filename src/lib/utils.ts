/* ═══════════════════════════════════════════════════════════════════════════
   PULSE UTILITY ENGINE — ENTERPRISE CORE v2.0
   Pure functions | Type-safe | Tree-shakable | Universal
   ═══════════════════════════════════════════════════════════════════════════ */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Fuse from 'fuse.js';
import type {
  Candidate,
  Competency,
  DecisionResult,
  Currency,
  Locale,
  HireDecision,
  CandidateScore,
  PlatformConfig,
  ScoreValue,
} from '@/types';

// ============================================================================
// 1. UI & STYLING UTILITIES (dari Versi B + upgrade)
// ============================================================================
/**
 * Menggabungkan class Tailwind secara dinamis tanpa konflik.
 * Standar industri untuk component library.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Conditional class helper (lebih ringan dari clsx untuk kasus sederhana)
 */
export function cx(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

// ============================================================================
// 2. SAFE FORMATTERS (dari Versi A)
// ============================================================================
export function safeFormat<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

// ============================================================================
// 3. INTERNATIONALIZATION (i18n) — gabungan A + B + upgrade
// ============================================================================
export function formatCurrency(
  value: number,
  currency: Currency = 'USD',
  locale: Locale = 'en-US'
): string {
  return safeFormat(() => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'IDR' || currency === 'JPY' ? 0 : 2,
      notation: value >= 1_000_000 ? 'compact' : 'standard',
    }).format(value);
  }, `${currency} ${value}`);
}

export function formatNumber(value: number, locale: Locale = 'en-US'): string {
  return safeFormat(() => new Intl.NumberFormat(locale).format(value), String(value));
}

export function formatDate(
  iso: string,
  locale: Locale = 'en-US',
  options?: Intl.DateTimeFormatOptions
): string {
  return safeFormat(() => {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
      ...options,
    }).format(new Date(iso));
  }, iso);
}

export function formatRelativeTime(date: Date | string, locale: Locale = 'en-US'): string {
  const now = new Date();
  const target = typeof date === 'string' ? new Date(date) : date;
  const diffMs = now.getTime() - target.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (diffDays > 30) return formatDate(iso, locale);
  if (diffDays >= 7) return rtf.format(-Math.floor(diffDays / 7), 'week');
  if (diffDays >= 1) return rtf.format(-diffDays, 'day');
  if (diffHours >= 1) return rtf.format(-diffHours, 'hour');
  if (diffMins >= 1) return rtf.format(-diffMins, 'minute');
  return rtf.format(-diffSecs, 'second');
}

export function formatPercent(value: number, locale: Locale = 'en-US'): string {
  return safeFormat(() => {
    return new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 }).format(value / 100);
  }, `${value}%`);
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}

// ============================================================================
// 4. DECISION ENGINE & SCORING (gabungan A + B + optimasi)
// ============================================================================
export function computeWeightedScore(
  scores: CandidateScore[],
  competencies: Competency[]
): number {
  if (!scores.length || !competencies.length) return 0;
  // Normalisasi bobot jika tidak sum ke 1
  const totalWeight = competencies.reduce((sum, c) => sum + (c.weight ?? 0), 0);
  const normalizedWeight = totalWeight === 0 ? 1 : totalWeight;

  return competencies.reduce((acc, comp) => {
    const scoreEntry = scores.find((s) => s.competencyId === comp.id);
    const scoreValue = scoreEntry?.score ?? 0;
    const weight = (comp.weight ?? 0) / normalizedWeight;
    return acc + scoreValue * weight;
  }, 0);
}

export interface EvaluateCandidateOptions {
  maxBudget?: number;
  strongHireThreshold?: number;
  hireThreshold?: number;
  maybeThreshold?: number;
}

export function evaluateCandidate(
  candidate: Pick<Candidate, 'scores' | 'softScores' | 'expectedSalary' | 'currency'>,
  competencies: Competency[],
  options: EvaluateCandidateOptions = {}
): DecisionResult {
  const {
    maxBudget = Infinity,
    strongHireThreshold = 4.2,
    hireThreshold = 3.5,
    maybeThreshold = 2.8,
  } = options;

  const hardCompetencies = competencies.filter((c) => c.category === 'hard');
  const criticalCompetencies = hardCompetencies.filter((c) => c.critical);

  const hasFailedCritical = criticalCompetencies.some((c) => {
    const score = candidate.scores.find((s) => s.competencyId === c.id)?.score ?? 0;
    return score < 3;
  });

  const weightedScore = computeWeightedScore(candidate.scores, hardCompetencies);

  // Culture bonus dari soft scores
  const cultureScore = candidate.softScores?.find((s) => String(s.competencyId) === 'culture')?.score ?? 3;
  const cultureBonus = (cultureScore / 5) * 15; // max 15 points

  let finalScore = weightedScore;
  if (!hasFailedCritical) {
    finalScore = Math.min(5, weightedScore + cultureBonus / 10);
  }

  const isOverBudget = typeof candidate.expectedSalary === 'number'
    ? candidate.expectedSalary > maxBudget
    : candidate.expectedSalary.amount > maxBudget;

  const retentionEstimate = clamp(
    Math.round((finalScore / 5) * 75 + cultureBonus),
    0,
    100
  );

  const breakEvenMonths = finalScore >= strongHireThreshold ? 3 : finalScore >= hireThreshold ? 6 : 12;

  let decision: HireDecision;
  let label: string;
  let color: string;
  let grade: DecisionResult['grade'];

  if (hasFailedCritical) {
    decision = 'NO_HIRE_CRITICAL';
    label = 'NO HIRE — Critical Gap';
    color = '#E8835A';
    grade = 'F';
  } else if (finalScore >= strongHireThreshold) {
    decision = 'STRONG_HIRE';
    label = isOverBudget ? 'STRONG HIRE (Negotiate)' : 'STRONG HIRE ✦';
    color = isOverBudget ? '#F4A460' : '#74C476';
    grade = 'A+';
  } else if (finalScore >= hireThreshold) {
    decision = 'HIRE';
    label = 'HIRE';
    color = '#C8A97E';
    grade = 'A';
  } else if (finalScore >= maybeThreshold) {
    decision = 'MAYBE';
    label = 'MAYBE';
    color = '#6BAED6';
    grade = 'C';
  } else {
    decision = 'NO_HIRE';
    label = 'NO HIRE';
    color = '#E8835A';
    grade = 'D';
  }

  return {
    decision,
    label,
    color,
    grade,
    score: finalScore,
    salaryStatus: isOverBudget ? 'over_budget' : 'within_budget',
    salaryNote: isOverBudget ? '⚠️ Exceeds budget. Negotiation required.' : '✅ Within budget.',
    breakEvenMonths,
    retentionEstimate,
  };
}

// ============================================================================
// 5. CSV EXPORT & DOWNLOAD (dari Versi A)
// ============================================================================
export function exportCandidatesCSV(candidates: Candidate[], currency: Currency = 'USD'): void {
  if (!candidates.length) return;

  const headers = ['Rank', 'Name', 'Score', 'Salary', 'Currency', 'Decision', 'Date'];
  const rows = candidates
    .sort((a, b) => (b.weightedScore ?? 0) - (a.weightedScore ?? 0))
    .map((c, i) => [
      i + 1,
      `"${c.name.replace(/"/g, '""')}"`,
      (c.weightedScore ?? 0).toFixed(2),
      typeof c.expectedSalary === 'number' ? c.expectedSalary : c.expectedSalary.amount,
      c.currency || currency,
      `"${c.decision ?? ''}"`,
      `"${formatDate(c.createdAt)}"`,
    ].join(','));

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' }); // BOM for UTF-8
  downloadBlob(blob, `candidates-${Date.now()}.csv`);
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadJson<T>(data: T, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  downloadBlob(blob, filename);
}

// ============================================================================
// 6. FUZZY MATCHING & TYPO CORRECTION (gabungan A + B)
// ============================================================================
const KNOWN_FIELD_ALIASES: Record<string, string> = {
  'full name': 'name',
  'nama': 'name',
  'email': 'email',
  'expected salary': 'expectedSalary',
  'gaji': 'expectedSalary',
  'exp': 'yearsExp',
  'pengalaman': 'yearsExp',
};

let fuseInstance: Fuse<string> | null = null;

function getFuse() {
  if (!fuseInstance) {
    fuseInstance = new Fuse(Object.keys(KNOWN_FIELD_ALIASES), {
      threshold: 0.4,
      includeScore: true,
    });
  }
  return fuseInstance;
}

export function fuzzyMatchHeader(raw: string): { field: string; confidence: number } {
  const normalized = raw.toLowerCase().trim();
  if (KNOWN_FIELD_ALIASES[normalized]) {
    return { field: KNOWN_FIELD_ALIASES[normalized], confidence: 1 };
  }
  const result = getFuse().search(normalized)[0];
  if (result) {
    return {
      field: KNOWN_FIELD_ALIASES[result.item],
      confidence: 1 - (result.score ?? 1),
    };
  }
  return { field: raw, confidence: 0 };
}

export function smartMatchField(input: string): string {
  const normalized = input.toLowerCase().replace(/\s+/g, '');
  if (KNOWN_FIELD_ALIASES[normalized]) return KNOWN_FIELD_ALIASES[normalized];
  const result = getFuse().search(normalized)[0];
  return result ? KNOWN_FIELD_ALIASES[result.item] : input;
}

const TYPO_MAP: Record<string, string> = {
  analitics: 'analytics',
  emial: 'email',
  recrutier: 'recruiter',
  canidate: 'candidate',
};

export function correctTypo(input: string): string {
  return TYPO_MAP[input.toLowerCase()] ?? input;
}

// ============================================================================
// 7. ASYNC & PERFORMANCE UTILITIES (dari A + B + upgrade)
// ============================================================================
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): { (...args: Parameters<T>): void; cancel: () => void } {
  let timeoutId: ReturnType<typeof setTimeout>;
  const debounced = (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
  debounced.cancel = () => clearTimeout(timeoutId);
  return debounced;
}

export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function retry<T>(
  fn: () => Promise<T>,
  options: { retries?: number; delay?: number; backoff?: number } = {}
): Promise<T> {
  const { retries = 3, delay = 300, backoff = 2 } = options;
  let lastError: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i === retries) break;
      await sleep(delay * Math.pow(backoff, i));
    }
  }
  throw lastError;
}

export function raceWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

// ============================================================================
// 8. VIEW TRANSITIONS & HAPTICS (dari A + B)
// ============================================================================
export async function withViewTransition(fn: () => void | Promise<void>): Promise<void> {
  if (!document.startViewTransition) {
    await fn();
    return;
  }
  return new Promise((resolve) => {
    document.startViewTransition(async () => {
      await fn();
      resolve();
    });
  });
}

export function haptic(
  type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light'
): void {
  if (!navigator.vibrate) return;
  const patterns = {
    light: 10,
    medium: 20,
    heavy: 40,
    success: [10, 30, 10],
    warning: [50, 100],
    error: [100, 50, 100],
  };
  navigator.vibrate(patterns[type]);
}

// ============================================================================
// 9. GENERIC HELPERS (dari A + upgrade)
// ============================================================================
export function uid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const output = { ...target };
  for (const key in source) {
    const targetVal = output[key];
    const sourceVal = source[key];
    if (sourceVal && typeof sourceVal === 'object' && !Array.isArray(sourceVal) && targetVal && typeof targetVal === 'object') {
      output[key] = deepMerge(targetVal as Record<string, unknown>, sourceVal as Record<string, unknown>) as T[Extract<keyof T, string>];
    } else if (sourceVal !== undefined) {
      output[key] = sourceVal as T[Extract<keyof T, string>];
    }
  }
  return output;
}

export function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
  return arr.reduce(
    (acc, item) => {
      const groupKey = String(item[key]);
      if (!acc[groupKey]) acc[groupKey] = [];
      acc[groupKey].push(item);
      return acc;
    },
    {} as Record<string, T[]>
  );
}

export function sortBy<T>(arr: T[], key: keyof T, direction: 'asc' | 'desc' = 'asc'): T[] {
  return [...arr].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    if (aVal === bVal) return 0;
    const cmp = aVal < bVal ? -1 : 1;
    return direction === 'asc' ? cmp : -cmp;
  });
}

export function truncate(str: string, length: number, ellipsis: string = '…'): string {
  if (str.length <= length) return str;
  return str.slice(0, length - ellipsis.length) + ellipsis;
}

export function getInitials(name: string, maxInitials: number = 2): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, maxInitials)
    .join('')
    .toUpperCase();
}

// ============================================================================
// 10. CLIPBOARD & DEVICE DETECTION
// ============================================================================
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  }
}

export function isMobile(): boolean {
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function isTouchDevice(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

// ============================================================================
// 11. RE-EXPORT (untuk kemudahan)
// ============================================================================
export type { ScoreValue, HireDecision, DecisionResult };
