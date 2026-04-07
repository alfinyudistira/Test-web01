// ═══════════════════════════════════════════════════════════════════════════
// PULSE HIRING INTELLIGENCE — GLOBAL TYPES
// Single Source of Truth for all data shapes
// ═══════════════════════════════════════════════════════════════════════════

// ── Primitive Enums ──────────────────────────────────────────────────────
export type ScoreValue = 1 | 2 | 3 | 4 | 5;
export type HireDecision = 'STRONG_HIRE' | 'HIRE' | 'MAYBE' | 'NO_HIRE' | 'NO_HIRE_CRITICAL';
export type Currency = 'IDR' | 'USD' | 'EUR' | 'SGD' | 'MYR' | 'GBP';
export type Locale = 'id-ID' | 'en-US' | 'en-GB' | 'de-DE' | 'fr-FR' | 'ja-JP' | 'zh-CN' | 'ar-SA';
export type TabId =
  | 'calculator'
  | 'funnel'
  | 'salary'
  | 'scorecard'
  | 'di'
  | 'onboarding'
  | 'questions'
  | 'bi'
  | 'settings';

// ── Competency Config ─────────────────────────────────────────────────────
export interface Competency {
  id: string;
  label: string;
  short: string;
  weight: number;          // 0–1, all weights must sum to 1
  critical: boolean;       // Critical-hurdle flag: fail = automatic NO_HIRE
  color: string;           // Hex
  icon: string;
  category: 'hard' | 'soft';
  description?: string;
  redFlags?: string[];
  greenFlags?: string[];
}

// ── Candidate ─────────────────────────────────────────────────────────────
export interface CandidateScore {
  competencyId: string;
  score: ScoreValue;
  notes?: string;
}

export interface Candidate {
  id: string;
  name: string;
  email?: string;
  position?: string;
  university?: string;
  prevCompany?: string;
  yearsExp?: number;
  expectedSalary: number;
  currency: Currency;
  scores: CandidateScore[];
  softScores: CandidateScore[];
  decision?: HireDecision;
  weightedScore?: number;
  createdAt: string;       // ISO 8601
  updatedAt: string;
  tags?: string[];
  round?: string;
  referralSource?: string;
}

// ── Decision ──────────────────────────────────────────────────────────────
export interface DecisionResult {
  decision: HireDecision;
  label: string;
  color: string;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  score: number;
  salaryStatus: 'within_budget' | 'over_budget' | 'unknown';
  salaryNote: string;
  breakEvenMonths: number;
  retentionEstimate: number;
}

// ── Funnel ────────────────────────────────────────────────────────────────
export interface FunnelStage {
  id: string;
  name: string;
  currentDays: number;
  minDays: number;
  maxDays: number;
  optimizedDays: number;
}

// ── Salary Benchmark ──────────────────────────────────────────────────────
export interface SalaryRange {
  min: number;
  mid: number;
  max: number;
}

export interface SalaryBenchmarkEntry {
  level: 'entry' | 'mid' | 'senior';
  currency: Currency;
  range: SalaryRange;
}

// ── D&I Metric ────────────────────────────────────────────────────────────
export interface DIMetric {
  id: string;
  label: string;
  current: number;
  target: number;
  unit: '%' | 'count' | 'score';
  status: 'exceeded' | 'met' | 'progress' | 'needs-work';
  trend?: number;          // +/- change vs last period
}

// ── Onboarding ────────────────────────────────────────────────────────────
export interface OnboardingWeek {
  id: string;
  week: string;
  theme: string;
  color: string;
  items: OnboardingItem[];
}

export interface OnboardingItem {
  id: string;
  text: string;
  completed?: boolean;
  dueDay?: number;
}

// ── Question Bank ─────────────────────────────────────────────────────────
export interface InterviewQuestion {
  id: string;
  competencyId: string;
  text: string;
  followUp?: string;
  redFlagAnswers?: string[];
  greenFlagAnswers?: string[];
  difficulty: 'basic' | 'intermediate' | 'advanced';
  type: 'behavioral' | 'situational' | 'technical' | 'culture';
}

// ── Platform Config (SSOT) ────────────────────────────────────────────────
export interface PlatformConfig {
  companyName: string;
  companyLogo?: string;
  currency: Currency;
  locale: Locale;
  maxBudget: number;
  competencies: Competency[];
  diTargets: Record<string, number>;
  onboardingWeeks: OnboardingWeek[];
  decisionThresholds: {
    strongHire: number;   // e.g. 4.0
    hire: number;         // e.g. 3.5
    maybe: number;        // e.g. 3.0
  };
  features: {
    blindScreening: boolean;
    aiSummary: boolean;
    websocketLive: boolean;
    exportCsv: boolean;
    exportPdf: boolean;
    i18n: boolean;
  };
  branding: {
    primaryColor: string;
    accentColor: string;
    logoUrl?: string;
  };
}

// ── App Stats ─────────────────────────────────────────────────────────────
export interface AppStats {
  total: number;
  strongHires: number;
  hires: number;
  noHires: number;
  avgScore: number;
  scores: number[];
  lastUpdated: string;
}

// ── Toast / Notification ──────────────────────────────────────────────────
export interface ToastPayload {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  color?: string;
  duration?: number;
}

// ── WebSocket / SSE ───────────────────────────────────────────────────────
export interface LiveUpdate {
  type: 'NEW_CANDIDATE' | 'SCORE_UPDATE' | 'PIPELINE_CHANGE' | 'PING';
  payload: unknown;
  timestamp: string;
}

// ── Table Column Mapping (flexible) ──────────────────────────────────────
export interface ColumnMapping {
  sourceKey: string;   // CSV/JSON header
  targetField: keyof Candidate;
  transform?: (raw: string) => unknown;
  confidence?: number; // fuzzy match confidence 0–1
}

// ── i18n Format Context ───────────────────────────────────────────────────
export interface FormatContext {
  locale: Locale;
  currency: Currency;
}
