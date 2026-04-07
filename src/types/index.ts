/* ═══════════════════════════════════════════════════════════════════════════
   PULSE HIRING INTELLIGENCE — ENTERPRISE TYPE SYSTEM v3.0
   Universal | Extensible | Multi-Tenant | Event-Driven | Type-Safe
   ═══════════════════════════════════════════════════════════════════════════ */

// ============================================================================
// 1. BRANDED TYPES (Nominal Typing)
// ============================================================================
export type Brand<K, T extends string> = K & { readonly __brand: T };
export type CandidateId = Brand<string, 'Candidate'>;
export type CompetencyId = Brand<string, 'Competency'>;
export type OrganizationId = Brand<string, 'Organization'>;
export type UserId = Brand<string, 'User'>;
export type TenantId = Brand<string, 'Tenant'>;
export type WebhookId = Brand<string, 'Webhook'>;
export type JobId = Brand<string, 'Job'>;
export type ISODate = string & { readonly __iso: true };

// ============================================================================
// 2. UTILITY TYPES (Supercharged & Zod Ready)
// ============================================================================
export type Primitive = string | number | boolean | null | undefined;
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type DeepPartial<T> = { [P in keyof T]?: DeepPartial<T[P]> };
export type DeepReadonly<T> = { readonly [P in keyof T]: DeepReadonly<T[P]> };
export type DeepRequired<T> = { [P in keyof T]-?: DeepRequired<T[P]> };
export type Mutable<T> = { -readonly [P in keyof T]: T[P] };
export type ValueOf<T> = T[keyof T];
export type PickByType<T, V> = { [K in keyof T as T[K] extends V ? K : never]: T[K] };
export type AsyncReturnType<T extends (...args: any) => any> = Awaited<ReturnType<T>>;

// Result type (Rust-like error handling)
export type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };
export const Ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const Err = <E>(error: E): Result<never, E> => ({ ok: false, error });

// Async state (React Query & Zustand friendly)
export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';
export interface AsyncState<T, E = string> {
  status: AsyncStatus;
  data?: T;
  error?: E;
}

// ============================================================================
// 3. DOMAIN ENUMS & PRIMITIVES
// ============================================================================
export type ScoreValue = 1 | 2 | 3 | 4 | 5;
export type HireDecision = 'STRONG_HIRE' | 'HIRE' | 'MAYBE' | 'NO_HIRE' | 'NO_HIRE_CRITICAL';
export type Currency = 'IDR' | 'USD' | 'EUR' | 'SGD' | 'MYR' | 'GBP' | 'JPY' | 'CNY';
export type Locale = 'id-ID' | 'en-US' | 'en-GB' | 'de-DE' | 'fr-FR' | 'ja-JP' | 'zh-CN' | 'ar-SA' | 'hi-IN' | 'pt-BR';
export type TabId = 'calculator' | 'funnel' | 'salary' | 'scorecard' | 'di' | 'onboarding' | 'questions' | 'bi' | 'settings' | 'audit' | 'webhooks' | 'tenants';
export type CandidateStatus = 'SOURCING' | 'SCREENING' | 'INTERVIEWING' | 'OFFER' | 'HIRED' | 'REJECTED' | 'WITHDRAWN' | 'ACTIVE' | 'ARCHIVED' | 'BLACKLISTED';

// ============================================================================
// 4. COMPETENCY & SCORING
// ============================================================================
export interface CompetencyLevel {
  score: ScoreValue;
  expectation: string;
  behavioralIndicators: string[];
}
export interface Competency extends Timestamped, Audited {
  id: CompetencyId;
  label: string;
  shortCode: string;
  weight: number; 
  isCritical: boolean;
  category: 'hard' | 'soft' | 'leadership' | 'culture';
  description?: string;
  levels?: CompetencyLevel[];
  color?: string;
  icon?: string;
  redFlags?: string[];
  greenFlags?: string[];
  metadata?: Record<string, unknown>;
}

export interface CandidateScore {
  competencyId: CompetencyId;
  score: ScoreValue;
  notes?: string;
  evaluatorId?: UserId;
  evaluatedAt?: ISODate;
}

// ============================================================================
// 5. CANDIDATE & DECISION
// ============================================================================
export interface Candidate extends Timestamped, Audited {
  id: CandidateId;
  orgId: OrganizationId;
  firstName: string;
  lastName: string;
  name?: string; 
  email: string;
  phone?: string;
  position?: string;
  headline?: string;
  experienceYears: number;
  currentCompany?: string;
  university?: string;
  prevCompany?: string;
  expectedSalary: { amount: number; currency: Currency } | number;
  currency?: Currency;
  socialLinks?: { linkedin?: string; github?: string; portfolio?: string };
  scores: CandidateScore[];
  softScores?: CandidateScore[];
  decision?: HireDecision;
  weightedScore?: number;
  status: CandidateStatus;
  tags?: string[];
  round?: string;
  referralSource?: string;
  avatarUrl?: string;
  noticePeriodDays?: number;
  documents?: CandidateDocument[];
  aiInsights?: AIInsights;
}

export interface CandidateDocument {
  id: string;
  type: 'resume' | 'portfolio' | 'assignment' | 'other';
  url: string;
  name: string;
}

export interface AIInsights {
  summary: string;
  sentimentScore: number; 
  riskLevel: 'low' | 'medium' | 'high';
  fitProbability: number;
}

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
  recommendationReason?: string;
  redFlagsDetected?: string[];
  greenFlagsDetected?: string[];
}

export interface HiringPredictiveModel {
  successProbability: number;
  estimatedRampUpTime: number; 
  attritionRisk: number;
  benchmarkPercentile: number;
}

export interface DecisionAnalytics extends DecisionResult {
  prediction: HiringPredictiveModel;
  roiEstimate: number;
}

// ============================================================================
// 6. TIMESTAMP & AUDIT
// ============================================================================
export interface Timestamped {
  createdAt: ISODate;
  updatedAt: ISODate;
  deletedAt?: ISODate | null;
}
export interface Audited {
  createdBy: UserId;
  updatedBy: UserId;
}
export interface SoftDeletable {
  deletedAt?: ISODate | null;
}

// ============================================================================
// 7. FUNNEL, SALARY, D&I, ONBOARDING
// ============================================================================
export interface FunnelStage {
  id: string;
  name: string;
  currentDays: number;
  minDays: number;
  maxDays: number;
  optimizedDays: number;
  candidateCount?: number;
  conversionRate?: number;
}

export interface PipelineEvent extends Timestamped {
  id: string;
  candidateId: CandidateId;
  fromStage: string;
  toStage: string;
  userId?: UserId;
  note?: string;
}

export interface SalaryBenchmarkEntry {
  level: 'entry' | 'mid' | 'senior' | 'lead' | 'principal';
  currency: Currency;
  range: { min: number; mid: number; max: number };
  percentiles?: { p10: number; p25: number; p50: number; p75: number; p90: number };
  source?: string;
}

export interface DIMetric {
  id: string;
  label: string;
  current: number;
  target: number;
  unit: '%' | 'count' | 'score';
  status: 'exceeded' | 'met' | 'progress' | 'needs-work';
  trend?: number;
  breakdown?: Record<string, number>;
}

export interface OnboardingWeek {
  id: string;
  week: string;
  theme: string;
  color: string;
  items: Array<{
    id: string;
    text: string;
    completed?: boolean;
    dueDay?: number;
    assignedTo?: 'hr' | 'manager' | 'it' | 'candidate';
    links?: string[];
  }>;
}

// ============================================================================
// 8. RBAC, TENANT & CONFIGURATION
// ============================================================================
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'RECRUITER' | 'HIRING_MANAGER' | 'INTERVIEWER' | 'VIEWER';
export interface User extends Timestamped {
  id: UserId;
  email: string;
  name: string;
  role: UserRole;
  permissions: Array<{ resource: string; actions: ('read' | 'write' | 'delete' | 'export')[] }>;
  tenantId: TenantId;
  avatar?: string;
  lastLogin?: ISODate;
  isActive: boolean;
  mfaEnabled: boolean;
  preferences?: { theme: 'light' | 'dark' | 'system'; notifications: boolean; sidebarCollapsed: boolean; defaultLocale: Locale; };
}

export interface Tenant extends Timestamped {
  id: TenantId;
  name: string;
  slug: string;
  domain?: string;
  plan: 'free' | 'pro' | 'enterprise';
  subscriptionEnds?: ISODate;
  maxUsers: number;
  maxCandidatesPerMonth: number;
  config: PlatformConfig;
}

export interface PlatformConfig extends Timestamped {
  companyName: string;
  companyLogo?: string;
  currency: Currency;
  locale: Locale;
  maxBudget: number;
  competencies: Competency[];
  diTargets: Record<string, number>;
  onboardingWeeks: OnboardingWeek[];
  decisionThresholds: { strongHire: number; hire: number; maybe: number; };
  features: Record<string, boolean>;
  branding: { primaryColor: string; accentColor: string; logoUrl?: string; fontFamily?: string; };
  workflow?: { stages: FunnelStage[]; autoRejectionEnabled: boolean; requireMultiScore: boolean; };
  version: string;
}

// ============================================================================
// 9. API, EVENTS, & MONITORING
// ============================================================================
export type EventType = 'CANDIDATE_CREATED' | 'CANDIDATE_UPDATED' | 'SCORE_SUBMITTED' | 'DECISION_FINALIZED' | 'CONFIG_CHANGED';
export interface AppEvent<T = unknown> {
  id: string;
  type: EventType;
  payload: T;
  timestamp: ISODate;
  actor: { id: UserId; name: string };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export type ApiResponse<T> = 
  | { success: true; data: T; meta?: Record<string, unknown> }
  | { success: false; error: { code: string; message: string; details?: unknown } };

// ============================================================================
// 10. TYPE GUARDS & SAFE FACTORIES (FIXED FOR RUNTIME SAFETY)
// ============================================================================

/** Safe factory untuk membuat Branded Types (karena __brand hilang di runtime) */
export function createId<T extends string>(id: string): Brand<string, T> {
  return id as Brand<string, T>;
}

/** Validasi string adalah format ISO Date yang valid */
export function isISODate(value: unknown): value is ISODate {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(value);
}

/** Cek status Result Pattern dengan aman */
export function isResultOk<T, E>(result: Result<T, E>): result is { ok: true; value: T } {
  return result.ok === true;
}

// ============================================================================
// 11. RE-EXPORT FOR CONVENIENCE
// ============================================================================
export type { ScoreValue as Score, HireDecision as Decision };
