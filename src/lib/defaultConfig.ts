// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT PLATFORM CONFIG — Single Source of Truth
// Users can override any value via Settings module
// ═══════════════════════════════════════════════════════════════════════════
import type { PlatformConfig } from '@/types';

export const DEFAULT_CONFIG: PlatformConfig = {
  companyName: 'Pulse Digital',
  currency: 'IDR',
  locale: 'id-ID',
  maxBudget: 10_000_000,

  competencies: [
    {
      id: 'analytics',
      label: 'Google Analytics 4 & Data',
      short: 'Data Analytics',
      weight: 0.20,
      critical: true,
      color: '#C8A97E',
      icon: '📊',
      category: 'hard',
      description: 'Ability to build custom reports, understand attribution, and extract actionable insights.',
      greenFlags: ['Multi-touch attribution', 'Custom dashboards', 'Cohort analysis'],
      redFlags: ['Only tracks pageviews', 'Cannot explain bounce rate'],
    },
    {
      id: 'paid',
      label: 'Paid Advertising (Meta / Google)',
      short: 'Paid Ads',
      weight: 0.20,
      critical: true,
      color: '#E8835A',
      icon: '💰',
      category: 'hard',
      description: 'Budget management, ROAS optimization, creative testing across paid channels.',
      greenFlags: ['ROAS > 3x consistently', 'CAC optimization', 'Audience segmentation'],
      redFlags: ['No budget controls', 'Relies on broad match only'],
    },
    {
      id: 'seo',
      label: 'SEO Strategy & Content',
      short: 'SEO',
      weight: 0.12,
      critical: false,
      color: '#7EB5A6',
      icon: '🔍',
      category: 'hard',
      description: 'Technical SEO, content architecture, backlink strategy.',
      greenFlags: ['Core Web Vitals', 'E-E-A-T', 'Programmatic SEO'],
      redFlags: ['Keyword stuffing', 'Ignores technical SEO'],
    },
    {
      id: 'copy',
      label: 'Strategic Copywriting',
      short: 'Copywriting',
      weight: 0.15,
      critical: false,
      color: '#9B8EC4',
      icon: '✍️',
      category: 'hard',
      description: 'Conversion-focused copy, brand voice adaptation, A/B tested messaging.',
      greenFlags: ['Conversion-focused', 'Brand voice mastery', 'Data-backed iterations'],
      redFlags: ['Generic AI text', 'No brand alignment'],
    },
    {
      id: 'abtesting',
      label: 'A/B Testing & CRO',
      short: 'A/B Testing',
      weight: 0.10,
      critical: false,
      color: '#6BAED6',
      icon: '🧪',
      category: 'hard',
      description: 'Hypothesis-driven experimentation, statistical significance, conversion optimization.',
      greenFlags: ['Statistical rigor', 'Clear hypothesis', 'Multivariate testing'],
      redFlags: ['No hypothesis', 'Ignores statistical significance'],
    },
    {
      id: 'email',
      label: 'Email Marketing Automation',
      short: 'Email Mktg',
      weight: 0.10,
      critical: false,
      color: '#74C476',
      icon: '📧',
      category: 'hard',
      description: 'Drip sequences, segmentation, deliverability, automation workflows.',
      greenFlags: ['Complex automations', 'High deliverability', 'Advanced segmentation'],
      redFlags: ['Spammy tactics', 'No list hygiene'],
    },
    {
      id: 'social',
      label: 'Social Media Strategy',
      short: 'Social Media',
      weight: 0.08,
      critical: false,
      color: '#F4A460',
      icon: '📱',
      category: 'hard',
      description: 'Community building, content calendar, platform-specific strategies.',
      greenFlags: ['Community-first mindset', 'Viral mechanics', 'Creator economy'],
      redFlags: ['Only posts updates', 'No engagement strategy'],
    },
    {
      id: 'pm',
      label: 'Marketing Project Management',
      short: 'Project Mgmt',
      weight: 0.05,
      critical: false,
      color: '#BC8F8F',
      icon: '📋',
      category: 'hard',
      description: 'Agile marketing, cross-functional collaboration, deadline management.',
      greenFlags: ['Agile/Scrum mastery', 'Cross-team alignment', 'OKR management'],
      redFlags: ['Misses deadlines', 'Poor communication'],
    },
    // Soft skills (category: 'soft')
    {
      id: 'comm',
      label: 'Communication',
      short: 'Communication',
      weight: 0,  // soft skills don't affect weighted score directly
      critical: false,
      color: '#B39DDB',
      icon: '🗣️',
      category: 'soft',
    },
    {
      id: 'prob',
      label: 'Problem Solving',
      short: 'Problem Solving',
      weight: 0,
      critical: false,
      color: '#80CBC4',
      icon: '🧠',
      category: 'soft',
    },
    {
      id: 'culture',
      label: 'Culture Fit',
      short: 'Culture Fit',
      weight: 0,
      critical: false,
      color: '#FFCC80',
      icon: '🤝',
      category: 'soft',
    },
    {
      id: 'adapt',
      label: 'Adaptability',
      short: 'Adaptability',
      weight: 0,
      critical: false,
      color: '#F48FB1',
      icon: '🔄',
      category: 'soft',
    },
  ],

  diTargets: {
    gender_female: 40,
    bootcamp_alt: 20,
    geo_apac: 30,
    geo_americas: 25,
    geo_europe: 25,
    geo_mena: 20,
    diverse_pool: 40,
    blind_screening: 100,
  },

  onboardingWeeks: [
    {
      id: 'w1', week: 'Week 1', theme: 'Getting Your Bearings', color: '#C8A97E',
      items: [
        { id: 'w1-1', text: 'Coffee with manager', dueDay: 1 },
        { id: 'w1-2', text: 'IT setup & accounts', dueDay: 1 },
        { id: 'w1-3', text: 'Meet team members', dueDay: 2 },
        { id: 'w1-4', text: 'Review brand guidelines', dueDay: 3 },
        { id: 'w1-5', text: 'Analytics deep dive', dueDay: 4 },
        { id: 'w1-6', text: 'First 3 social posts', dueDay: 5 },
      ]
    },
    {
      id: 'w2', week: 'Week 2', theme: 'Starting to Contribute', color: '#E8835A',
      items: [
        { id: 'w2-1', text: 'Take over daily social', dueDay: 8 },
        { id: 'w2-2', text: 'All-hands meeting', dueDay: 9 },
        { id: 'w2-3', text: 'Setup first ad campaign', dueDay: 10 },
        { id: 'w2-4', text: 'Meet product team', dueDay: 11 },
        { id: 'w2-5', text: 'Email campaign analysis presentation', dueDay: 14 },
      ]
    },
    {
      id: 'w3', week: 'Week 3', theme: 'Finding Your Rhythm', color: '#7EB5A6',
      items: [
        { id: 'w3-1', text: 'Run first marketing standup', dueDay: 15 },
        { id: 'w3-2', text: 'Launch first email campaign', dueDay: 17 },
        { id: 'w3-3', text: 'Propose one strategy improvement', dueDay: 18 },
        { id: 'w3-4', text: 'Attend client call', dueDay: 19 },
        { id: 'w3-5', text: 'Content planning participation', dueDay: 21 },
      ]
    },
    {
      id: 'w4', week: 'Week 4', theme: 'Full Speed Ahead', color: '#9B8EC4',
      items: [
        { id: 'w4-1', text: 'Own all social media', dueDay: 22 },
        { id: 'w4-2', text: 'Present campaign results', dueDay: 25 },
        { id: 'w4-3', text: 'Lead one full project', dueDay: 27 },
        { id: 'w4-4', text: '30-day check-in with manager & HR', dueDay: 30 },
      ]
    },
    {
      id: 'm23', week: 'Month 2–3', theme: 'Expanding Impact', color: '#6BAED6',
      items: [
        { id: 'm23-1', text: 'Major campaign end-to-end', dueDay: 45 },
        { id: 'm23-2', text: 'Budget planning participation', dueDay: 50 },
        { id: 'm23-3', text: 'Process improvement implementation', dueDay: 60 },
        { id: 'm23-4', text: 'Mentor new members', dueDay: 70 },
        { id: 'm23-5', text: '60-day review', dueDay: 60 },
        { id: 'm23-6', text: '90-day comprehensive review', dueDay: 90 },
      ]
    },
  ],

  decisionThresholds: {
    strongHire: 4.0,
    hire: 3.5,
    maybe: 3.0,
  },

  features: {
    blindScreening: true,
    aiSummary: true,
    websocketLive: true,
    exportCsv: true,
    exportPdf: true,
    i18n: true,
  },

  branding: {
    primaryColor: '#C8A97E',
    accentColor: '#74C476',
  },
};
