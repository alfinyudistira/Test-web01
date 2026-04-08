import type {
  PlatformConfig,
  Competency,
  DeepPartial,
  TenantId,
  UserId,
  ISODate,
} from '@/types';
import { z } from 'zod';
import { deepMerge, createId } from '@/lib/utils';
import { idbGetConfig, idbSetConfig } from '@/lib/idb'; 

export const CURRENT_CONFIG_VERSION = 2;

export interface VersionedConfig {
  version: number;
  data: PlatformConfig;
}

const CompetencyLevelSchema = z.object({
  score: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  expectation: z.string(),
  behavioralIndicators: z.array(z.string()),
});

const CompetencySchema: z.ZodType<Competency> = z.object({
  id: z.string() as unknown as z.ZodType<Competency['id']>,
  label: z.string(),
  shortCode: z.string(),
  weight: z.number().min(0).max(1),
  isCritical: z.boolean().default(false),
  category: z.enum(['hard', 'soft', 'leadership', 'culture']),
  description: z.string().optional(),
  levels: z.array(CompetencyLevelSchema).optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  redFlags: z.array(z.string()).optional(),
  greenFlags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional() as any, 
  createdAt: z.string() as unknown as z.ZodType<ISODate>,
  updatedAt: z.string() as unknown as z.ZodType<ISODate>,
  deletedAt: z.string().nullable() as unknown as z.ZodType<ISODate | null>,
  createdBy: z.string() as unknown as z.ZodType<UserId>,
  updatedBy: z.string() as unknown as z.ZodType<UserId>,
});

const PlatformConfigSchema: z.ZodType<PlatformConfig> = z.object({
  companyName: z.string(),
  companyLogo: z.string().optional(),
  currency: z.enum(['IDR', 'USD', 'EUR', 'SGD', 'MYR', 'GBP', 'JPY', 'CNY']),
  locale: z.enum(['id-ID', 'en-US', 'en-GB', 'de-DE', 'fr-FR', 'ja-JP', 'zh-CN', 'ar-SA', 'hi-IN', 'pt-BR']),
  maxBudget: z.number().positive(),
  competencies: z.array(CompetencySchema),
  diTargets: z.record(z.number()),
  onboardingWeeks: z.array(z.any()), 
  decisionThresholds: z.object({
    strongHire: z.number(),
    hire: z.number(),
    maybe: z.number(),
  }),
  features: z.object({
    aiSummary: z.boolean(),
    blindScreening: z.boolean(),
    advancedAnalytics: z.boolean(),
    realtimeUpdates: z.boolean(),
    exportPdf: z.boolean(),
    multiLanguage: z.boolean(),
    webhooks: z.boolean(),
    auditLog: z.boolean(),
    multiTenant: z.boolean(),
  }),
  modules: z.array(z.object({
    id: z.string(),
    enabled: z.boolean(),
    config: z.record(z.unknown()) as any,
    permissionRequired: z.array(z.any()),
  })),
  branding: z.object({
    primaryColor: z.string(),
    accentColor: z.string(),
    logoUrl: z.string().optional(),
    faviconUrl: z.string().optional(),
    fontFamily: z.enum(['Inter', 'Plus Jakarta Sans', 'Geist', 'DM Sans']).optional(),
  }),
  workflow: z.object({
    stages: z.array(z.any()),
    autoRejectionEnabled: z.boolean(),
    requireMultiScore: z.boolean(),
  }).optional(),
  integrations: z.object({
    slackWebhook: z.string().optional(),
    greenhouseEnabled: z.boolean(),
    leverEnabled: z.boolean(),
  }).optional(),
  version: z.string(),
  createdAt: z.string() as unknown as z.ZodType<ISODate>,
  updatedAt: z.string() as unknown as z.ZodType<ISODate>,
  deletedAt: z.string().nullable() as unknown as z.ZodType<ISODate | null>,
});

function buildDefaultCompetencies(): Competency[] {
  const now = new Date().toISOString() as ISODate;
  const sysUserId = createId<UserId>('system');

  return [
    {
      id: createId('analytics'),
      label: 'Hiring Intelligence & Data Analytics',
      shortCode: 'DATA',
      weight: 0.25,
      isCritical: true,
      category: 'hard',
      description: 'Advanced ability to interpret recruitment funnels and predictive attrition data.',
      levels: [
        { score: 1, expectation: 'No understanding of data metrics.', behavioralIndicators: ['Relies on gut feeling'] },
        { score: 3, expectation: 'Can read basic reports and identify trends.', behavioralIndicators: ['Uses dashboards', 'Asks data-driven questions'] },
        { score: 5, expectation: 'Architects data strategies and predictive models.', behavioralIndicators: ['Builds custom attribution models', 'Optimizes ROI'] }
      ],
      color: '#3B82F6', icon: 'BarChart3',
      createdAt: now, updatedAt: now, deletedAt: null, createdBy: sysUserId, updatedBy: sysUserId,
    },
    {
      id: createId('ai_prompting'),
      label: 'AI Collaboration & Efficiency',
      shortCode: 'AI',
      weight: 0.20,
      isCritical: false,
      category: 'hard',
      description: 'Mastery of LLM tools to accelerate workflow and automate repetitive tasks.',
      levels: [
        { score: 3, expectation: 'Uses AI for basic email drafting.', behavioralIndicators: ['Familiar with ChatGPT'] },
        { score: 5, expectation: 'Integrates AI into core business processes.', behavioralIndicators: ['Advanced prompting', 'Workflow automation'] }
      ],
      color: '#8B5CF6', icon: 'Bot',
      createdAt: now, updatedAt: now, deletedAt: null, createdBy: sysUserId, updatedBy: sysUserId,
    },
    {
      id: createId('paid_ads'),
      label: 'Paid Advertising',
      shortCode: 'ADS',
      weight: 0.15,
      isCritical: true,
      category: 'hard',
      description: 'Expertise in managing paid campaigns across platforms.',
      levels: [
        { score: 5, expectation: 'Manages >$100k monthly budget with positive ROAS.', behavioralIndicators: ['Advanced bidding strategies', 'Creative testing'] }
      ],
      color: '#10B981', icon: 'Megaphone',
      createdAt: now, updatedAt: now, deletedAt: null, createdBy: sysUserId, updatedBy: sysUserId,
    },
    {
      id: createId('seo'),
      label: 'SEO Strategy',
      shortCode: 'SEO',
      weight: 0.10,
      isCritical: false,
      category: 'hard',
      description: 'Ability to drive organic traffic and technical SEO.',
      color: '#F59E0B', icon: 'Search',
      createdAt: now, updatedAt: now, deletedAt: null, createdBy: sysUserId, updatedBy: sysUserId,
    },
    {
      id: createId('communication'),
      label: 'Communication',
      shortCode: 'COMM',
      weight: 0,
      isCritical: false,
      category: 'soft',
      description: 'Clear and effective written/verbal communication.',
      color: '#EC4899', icon: 'MessageSquare',
      createdAt: now, updatedAt: now, deletedAt: null, createdBy: sysUserId, updatedBy: sysUserId,
    },
    {
      id: createId('problem_solving'),
      label: 'Problem Solving',
      shortCode: 'PS',
      weight: 0,
      isCritical: false,
      category: 'soft',
      description: 'Analytical and creative problem-solving skills.',
      color: '#14B8A6', icon: 'Brain',
      createdAt: now, updatedAt: now, deletedAt: null, createdBy: sysUserId, updatedBy: sysUserId,
    },
    {
      id: createId('culture_fit'),
      label: 'Culture Fit',
      shortCode: 'CULT',
      weight: 0,
      isCritical: true,
      category: 'culture',
      description: 'Alignment with company values and team dynamics.',
      levels: [
        { score: 5, expectation: 'Acts as a multiplier for company culture.', behavioralIndicators: ['Mentors others', 'Embodies values'] }
      ],
      color: '#C8A97E', icon: 'Heart',
      createdAt: now, updatedAt: now, deletedAt: null, createdBy: sysUserId, updatedBy: sysUserId,
    },
    {
      id: createId('adaptability'),
      label: 'Adaptability',
      shortCode: 'ADAPT',
      weight: 0,
      isCritical: false,
      category: 'soft',
      description: 'Ability to pivot and learn quickly.',
      color: '#A855F7', icon: 'RefreshCw',
      createdAt: now, updatedAt: now, deletedAt: null, createdBy: sysUserId, updatedBy: sysUserId,
    },
  ];
}

const nowIso = new Date().toISOString() as ISODate;

export const DEFAULT_CONFIG: PlatformConfig = {
  companyName: 'Pulse Digital',
  companyLogo: '/brand/logo-gold.svg',
  currency: 'IDR',
  locale: 'id-ID',
  maxBudget: 25_000_000,
  competencies: buildDefaultCompetencies(),
  diTargets: { femaleRatio: 50, minorityRatio: 30 }, 
  onboardingWeeks: [], 
  features: {
    aiSummary: true,
    blindScreening: true,
    advancedAnalytics: true,
    realtimeUpdates: true,
    exportPdf: true,
    multiLanguage: true,
    webhooks: false,
    auditLog: true,
    multiTenant: false,
  },
  modules: [
    { id: 'hiring', enabled: true, config: {}, permissionRequired: ['ADMIN', 'RECRUITER'] },
    { id: 'analytics', enabled: true, config: {}, permissionRequired: ['ADMIN'] },
    { id: 'onboarding', enabled: true, config: {}, permissionRequired: ['ADMIN', 'HIRING_MANAGER'] },
    { id: 'settings', enabled: true, config: {}, permissionRequired: ['SUPER_ADMIN'] },
  ],
  branding: {
    primaryColor: '#C8A97E',
    accentColor: '#74C476',
    logoUrl: '/brand/logo-gold.svg',
    fontFamily: 'Plus Jakarta Sans',
  },
  decisionThresholds: {
    strongHire: 4.2,
    hire: 3.7,
    maybe: 3.2,
  },
  workflow: {
    stages: [
      { id: 's1', name: 'Sourcing', currentDays: 0, minDays: 1, maxDays: 5, optimizedDays: 3 },
      { id: 's2', name: 'Initial Screen', currentDays: 0, minDays: 2, maxDays: 4, optimizedDays: 2 },
      { id: 's3', name: 'Technical Assessment', currentDays: 0, minDays: 3, maxDays: 7, optimizedDays: 5 },
      { id: 's4', name: 'Panel Interview', currentDays: 0, minDays: 2, maxDays: 5, optimizedDays: 3 },
      { id: 's5', name: 'Cultural Fit', currentDays: 0, minDays: 1, maxDays: 3, optimizedDays: 2 },
      { id: 's6', name: 'Offer Management', currentDays: 0, minDays: 1, maxDays: 10, optimizedDays: 4 },
    ],
    autoRejectionEnabled: false,
    requireMultiScore: true,
  },
  integrations: {
    slackWebhook: undefined,
    greenhouseEnabled: false,
    leverEnabled: false,
  },
  version: '2.0.0',
  createdAt: nowIso,
  updatedAt: nowIso,
  deletedAt: null,
};

export function mergeConfig(
  base: PlatformConfig,
  override?: DeepPartial<PlatformConfig>
): PlatformConfig {
  if (!override) return base;
  return deepMerge(base, override);
}

type Migration = (oldConfig: unknown) => PlatformConfig;

const migrations: Record<number, Migration> = {
  1: (old: unknown): PlatformConfig => {
    const oldSafe = old as DeepPartial<PlatformConfig>;
    const migrated = deepMerge(DEFAULT_CONFIG, oldSafe);
    return migrated;
  },
};

export function migrateConfig(versioned: VersionedConfig): PlatformConfig {
  let config = versioned.data;
  const currentVersion = versioned.version;

  for (let v = currentVersion; v < CURRENT_CONFIG_VERSION; v++) {
    const migrator = migrations[v];
    if (migrator) {
      config = migrator(config);
    }
  }
  return config;
}

export function validateConfig(config: PlatformConfig): string[] {
  const errors: string[] = [];

  const result = PlatformConfigSchema.safeParse(config);
  if (!result.success) {
    errors.push(...result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`));
  }

  const totalWeight = config.competencies
    .filter(c => c.category === 'hard')
    .reduce((sum, c) => sum + (c.weight ?? 0), 0);
  
  if (Math.abs(totalWeight - 1) > 0.01 && config.competencies.length > 0) {
    console.warn(`[Config] Competency weights sum to ${totalWeight}, expected 1.0`);
  }

  return errors;
}

export async function saveConfig(config: PlatformConfig): Promise<void> {
  try {
    const errors = validateConfig(config);
    if (errors.length > 0) {
      console.warn('Attempting to save invalid config:', errors);
    }
    
    config.updatedAt = new Date().toISOString() as ISODate;
    await idbSetConfig(config); 
    
    configChangeListeners.forEach(fn => fn(config));
  } catch (err) {
    console.error('Failed to save config to IDB', err);
  }
}

export async function loadConfig(options?: {
  remoteUrl?: string;
  tenantId?: TenantId;
}): Promise<PlatformConfig> {
  const { remoteUrl, tenantId } = options || {};

  if (remoteUrl) {
    try {
      const response = await fetch(remoteUrl, {
        headers: tenantId ? { 'X-Tenant-ID': tenantId } : {},
      });
      if (response.ok) {
        const remoteConfig = await response.json();
        const merged = mergeConfig(DEFAULT_CONFIG, remoteConfig);
        const errors = validateConfig(merged);
        if (errors.length === 0) {
          await saveConfig(merged);
          return merged;
        }
      }
    } catch (err) {
      console.warn('Failed to fetch remote config', err);
    }
  }

  try {
    const localConfig = await idbGetConfig();
    if (localConfig) {
      const errors = validateConfig(localConfig);
      if (errors.length === 0) {
        return localConfig;
      }
    }
  } catch (err) {
    console.warn('Failed to load config from IDB', err);
  }

  await saveConfig(DEFAULT_CONFIG);
  return DEFAULT_CONFIG;
}

type ConfigChangeListener = (config: PlatformConfig) => void;
const configChangeListeners = new Set<ConfigChangeListener>();

export function onConfigChange(listener: ConfigChangeListener): () => void {
  configChangeListeners.add(listener);
  return () => configChangeListeners.delete(listener);
}

export async function resolveTenantConfig(domain?: string, tenantId?: TenantId): Promise<PlatformConfig> {
  if (tenantId) {
    return loadConfig({ remoteUrl: `/api/tenants/${tenantId}/config`, tenantId });
  }
  if (domain) {
    return loadConfig({ remoteUrl: `/api/tenants/domain/${domain}/config` });
  }
  return loadConfig();
}

export function freezeConfig(config: PlatformConfig): Readonly<PlatformConfig> {
  if (process.env.NODE_ENV === 'production') {
    return Object.freeze(config) as Readonly<PlatformConfig>;
  }
  return config;
}
