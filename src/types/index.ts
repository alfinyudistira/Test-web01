/* ═══════════════════════════════════════════════════════════════════════════
   PULSE HIRING INTELLIGENCE — ENTERPRISE TYPE SYSTEM v3.0
   Universal | Extensible | Multi-Tenant | Event-Driven | Type-Safe
   ═══════════════════════════════════════════════════════════════════════════ */

// ============================================================================
// 1. BRANDED TYPES (Nominal Typing) — dari Versi B & C
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
// 2. UTILITY TYPES (Supercharged) — dari Versi A + tambahan
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

// Async state (React Query friendly)
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
export type HireDecision =
  | 'STRONG_HIRE'
  | 'HIRE'
  | 'MAYBE'
  | 'NO_HIRE'
  | 'NO_HIRE_CRITICAL';
export type Currency = 'IDR' | 'USD' | 'EUR' | 'SGD' | 'MYR' | 'GBP' | 'JPY' | 'CNY';
export type Locale =
  | 'id-ID' | 'en-US' | 'en-GB' | 'de-DE' | 'fr-FR'
  | 'ja-JP' | 'zh-CN' | 'ar-SA' | 'hi-IN' | 'pt-BR';
export type TabId =
  | 'calculator' | 'funnel' | 'salary' | 'scorecard' | 'di'
  | 'onboarding' | 'questions' | 'bi' | 'settings' | 'audit'
  | 'webhooks' | 'tenants';
export type CandidateStatus =
  | 'SOURCING' | 'SCREENING' | 'INTERVIEWING' | 'OFFER'
  | 'HIRED' | 'REJECTED' | 'WITHDRAWN' | 'ACTIVE' | 'ARCHIVED' | 'BLACKLISTED';

// ============================================================================
// 4. COMPETENCY & SCORING (dari Versi C)
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
  weight: number; // 0-1, sum to 1 per config
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
// 5. CANDIDATE & DECISION (gabungan A, B, C)
// ============================================================================
export interface Candidate extends Timestamped, Audited {
  id: CandidateId;
  orgId: OrganizationId;
  firstName: string;
  lastName: string;
  name?: string; // fallback
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
  sentimentScore: number; // 0-1
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
  estimatedRampUpTime: number; // weeks
  attritionRisk: number;
  benchmarkPercentile: number;
}

export interface DecisionAnalytics extends DecisionResult {
  prediction: HiringPredictiveModel;
  roiEstimate: number;
}

// ============================================================================
// 6. TIMESTAMP & AUDIT (dari C + A)
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
// 7. FUNNEL & PIPELINE
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

// ============================================================================
// 8. SALARY BENCHMARK
// ============================================================================
export interface SalaryRange {
  min: number;
  mid: number;
  max: number;
}
export interface SalaryBenchmarkEntry {
  level: 'entry' | 'mid' | 'senior' | 'lead' | 'principal';
  currency: Currency;
  range: SalaryRange;
  percentiles?: { p10: number; p25: number; p50: number; p75: number; p90: number };
  source?: string;
}

// ============================================================================
// 9. DIVERSITY & INCLUSION
// ============================================================================
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

// ============================================================================
// 10. ONBOARDING & QUESTION BANK
// ============================================================================
export interface OnboardingItem {
  id: string;
  text: string;
  completed?: boolean;
  dueDay?: number;
  assignedTo?: 'hr' | 'manager' | 'it' | 'candidate';
  links?: string[];
}
export interface OnboardingWeek {
  id: string;
  week: string;
  theme: string;
  color: string;
  items: OnboardingItem[];
}
export interface InterviewQuestion {
  id: string;
  competencyId: CompetencyId;
  text: string;
  followUp?: string;
  redFlagAnswers?: string[];
  greenFlagAnswers?: string[];
  difficulty: 'basic' | 'intermediate' | 'advanced';
  type: 'behavioral' | 'situational' | 'technical' | 'culture';
  tags?: string[];
  timeEstimateMinutes?: number;
}

// ============================================================================
// 11. RBAC & MULTI-TENANT (dari B + C)
// ============================================================================
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'RECRUITER' | 'HIRING_MANAGER' | 'INTERVIEWER' | 'VIEWER';
export interface Permission {
  resource: string;
  actions: ('read' | 'write' | 'delete' | 'export')[];
}
export interface User extends Timestamped {
  id: UserId;
  email: string;
  name: string;
  role: UserRole;
  permissions: Permission[];
  tenantId: TenantId;
  avatar?: string;
  lastLogin?: ISODate;
  isActive: boolean;
  mfaEnabled: boolean;
  preferences?: UserPreferences;
}
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  sidebarCollapsed: boolean;
  defaultLocale: Locale;
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

// ============================================================================
// 12. PLATFORM CONFIGURATION (SSOT) — gabungan A, B, C
// ============================================================================
export interface FeatureFlags {
  aiSummary: boolean;
  blindScreening: boolean;
  advancedAnalytics: boolean;
  realtimeUpdates: boolean;
  exportPdf: boolean;
  multiLanguage: boolean;
  webhooks: boolean;
  auditLog: boolean;
  multiTenant: boolean;
}
export interface ModuleFeature {
  id: string;
  enabled: boolean;
  config: Record<string, unknown>;
  permissionRequired: UserRole[];
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
  decisionThresholds: {
    strongHire: number;
    hire: number;
    maybe: number;
  };
  features: FeatureFlags;
  modules: ModuleFeature[];
  branding: {
    primaryColor: string;
    accentColor: string;
    logoUrl?: string;
    faviconUrl?: string;
    fontFamily?: 'Inter' | 'Plus Jakarta Sans' | 'Geist';
  };
  workflow?: {
    stages: FunnelStage[];
    autoRejectionEnabled: boolean;
    requireMultiScore: boolean;
  };
  integrations?: {
    slackWebhook?: string;
    greenhouseEnabled: boolean;
    leverEnabled: boolean;
  };
  version: string;
}

// ============================================================================
// 13. WEBHOOKS & JOB QUEUE (dari A)
// ============================================================================
export type WebhookEventType = 'candidate.created' | 'candidate.updated' | 'candidate.deleted' | 'decision.made';
export interface WebhookSubscription extends Timestamped {
  id: WebhookId;
  tenantId: TenantId;
  url: string;
  events: WebhookEventType[];
  secret: string;
  active: boolean;
}
export interface WebhookEvent extends Timestamped {
  id: string;
  eventType: WebhookEventType;
  payload: unknown;
  attempts: number;
  success: boolean;
  responseStatus?: number;
}
export interface Job<T = unknown> extends Timestamped {
  id: JobId;
  type: 'email' | 'export_csv' | 'export_pdf' | 'webhook_delivery' | 'sync';
  payload: T;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  maxAttempts: number;
  error?: string;
}

// ============================================================================
// 14. AUDIT LOG (ENTERPRISE)
// ============================================================================
export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW' | 'EXPORT' | 'LOGIN' | 'LOGOUT';
export type AuditEntity = 'candidate' | 'config' | 'user' | 'report' | 'webhook';
export interface AuditLogEntry extends Timestamped {
  id: string;
  userId: UserId;
  action: AuditAction;
  entityType: AuditEntity;
  entityId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string;
  userAgent?: string;
  tenantId?: TenantId;
}

// ============================================================================
// 15. ANALYTICS & STATS
// ============================================================================
export interface AppStats {
  total: number;
  strongHires: number;
  hires: number;
  noHires: number;
  avgScore: number;
  scores: number[];
  lastUpdated: ISODate;
  funnelConversionRates?: Record<string, number>;
  diversityScore?: number;
}
export interface KPI {
  id: string;
  label: string;
  value: number;
  change?: number;
  trend?: 'up' | 'down' | 'stable';
}
export interface ChartDataPoint {
  label: string;
  value: number;
}

// ============================================================================
// 16. UI & NOTIFICATIONS (dari A + B)
// ============================================================================
export interface UIState {
  sidebarOpen: boolean;
  theme: 'dark' | 'light';
  activeTab: TabId;
}
export interface ToastPayload {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  action?: { label: string; onClick: () => void };
}
export interface Notification extends Timestamped {
  id: string;
  userId: UserId;
  title: string;
  body: string;
  read: boolean;
  link?: string;
  priority: 'low' | 'medium' | 'high';
}

// ============================================================================
// 17. REAL-TIME EVENT SYSTEM (dari C + tambahan)
// ============================================================================
export type EventType =
  | 'CANDIDATE_CREATED'
  | 'CANDIDATE_UPDATED'
  | 'SCORE_SUBMITTED'
  | 'DECISION_FINALIZED'
  | 'CONFIG_CHANGED'
  | 'SYSTEM_MAINTENANCE';
export interface AppEvent<T = unknown> {
  id: string;
  type: EventType;
  payload: T;
  timestamp: ISODate;
  actor: { id: UserId; name: string };
}
export type EventHandler<T = unknown> = (event: AppEvent<T>) => void;
export interface EventBus {
  emit<T>(event: AppEvent<T>): void;
  on<T>(type: EventType, handler: EventHandler<T>): () => void;
  off<T>(type: EventType, handler: EventHandler<T>): void;
}

// ============================================================================
// 18. API & PAGINATION (gabungan A, B, C)
// ============================================================================
export interface PaginationParams {
  page: number;
  limit: number;
  cursor?: string; // untuk cursor-based pagination
}
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  nextCursor?: string;
}
export interface FilterCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in' | 'between';
  value: unknown;
}
export interface SortOption {
  field: string;
  direction: 'asc' | 'desc';
}
export interface QueryOptions {
  filters?: FilterCondition[];
  sort?: SortOption[];
  pagination?: PaginationParams;
  search?: string;
}
export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: { page?: number; limit?: number; total?: number; requestId?: string };
}
export interface ApiError {
  success: false;
  error: { code: string; message: string; details?: unknown; requestId?: string };
}
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ============================================================================
// 19. STORAGE, CACHE, MONITORING
// ============================================================================
export interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  staleAt: number;
}
export interface StorageAdapter {
  getItem<T>(key: string): Promise<T | null>;
  setItem<T>(key: string, value: T, ttl?: number): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}
export interface PerformanceMetric {
  name: string;
  value: number;
  tags?: Record<string, string>;
  timestamp: number;
}
export interface ErrorReport {
  id: string;
  message: string;
  stack?: string;
  componentStack?: string;
  userId?: UserId;
  url: string;
  timestamp: ISODate;
  severity: 'low' | 'medium' | 'high' | 'critical';
}
export interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: ISODate;
  context?: Record<string, unknown>;
}

// ============================================================================
// 20. TYPE GUARDS, VALIDATION & SAFE FACTORIES (UPGRADED)
// ============================================================================

/** * Safe factory untuk membuat Branded Types. 
 * Menggantikan `isBranded` lama yang menyebabkan error runtime karena properti __brand hilang setelah kompilasi. 
 */
export function createId<T extends string>(id: string): Brand<string, T> {
  return id as Brand<string, T>;
}

/** Validasi string adalah format ISO Date yang valid */
export function isISODate(value: unknown): value is ISODate {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(value);
}

/** Cek status Result Pattern dengan aman (Rust-style) */
export function isResultOk<T, E>(result: Result<T, E>): result is { ok: true; value: T } {
  return result.ok === true;
}

// ============================================================================
// 21. RE-EXPORT FOR CONVENIENCE
// ============================================================================
export type { ScoreValue as Score, HireDecision as Decision };
