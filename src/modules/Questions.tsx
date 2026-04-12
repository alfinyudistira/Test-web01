// ═══════════════════════════════════════════════════════════════════════════
// QUESTION BANK MODULE — Structured Interview Question Repository
// Filterable by competency/type/difficulty, AI generator via Claude API,
// fuzzy search, copy-to-clipboard, custom question editor, export pack
// ═══════════════════════════════════════════════════════════════════════════
import { useState, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useDebouncedValue } from 'use-debounce';
import { useQuery } from '@tanstack/react-query';
import { useConfig } from '@/store/appStore';
import { useHaptic, useCopyToClipboard } from '@/hooks';
import { cn, uid } from '@/lib/utils';
import { Card, Button, Badge, Divider, Skeleton, SVGDefs, Modal } from '@/components/ui';
import { useToast } from '@/components/Toast';
import type { InterviewQuestion } from '@/types';

// ── Question type + difficulty config ─────────────────────────────────────
const QUESTION_TYPES = [
  { id: 'behavioral',   label: 'Behavioral',   icon: '🗣️', color: '#C8A97E', desc: 'Past experience (STAR method)' },
  { id: 'situational',  label: 'Situational',  icon: '🎯', color: '#7EB5A6', desc: 'Hypothetical scenarios' },
  { id: 'technical',    label: 'Technical',    icon: '🔧', color: '#6BAED6', desc: 'Hard skill demonstration' },
  { id: 'culture',      label: 'Culture Fit',  icon: '🤝', color: '#9B8EC4', desc: 'Values & team dynamics' },
] as const;

const DIFFICULTIES = [
  { id: 'basic',        label: 'Basic',        color: '#74C476' },
  { id: 'intermediate', label: 'Intermediate', color: '#C8A97E' },
  { id: 'advanced',     label: 'Advanced',     color: '#E8835A' },
] as const;

type QType = typeof QUESTION_TYPES[number]['id'];
type QDiff = typeof DIFFICULTIES[number]['id'];

// ── Base question bank — data-driven, derived from competency config ───────
const BASE_QUESTIONS: Omit<InterviewQuestion, 'competencyId'>[] & { competencyId: string }[] = [
  // Analytics
  { id: 'q-a1', competencyId: 'analytics', type: 'technical',   difficulty: 'basic',
    text: 'Walk me through how you set up a conversion goal in Google Analytics 4.',
    followUp: 'How would you verify it\'s tracking correctly?',
    greenFlagAnswers: ['GA4 events', 'Measurement Protocol', 'Debug mode', 'data layer'],
    redFlagAnswers: ['I just use the default metrics', 'I\'m not familiar with GA4'] },
  { id: 'q-a2', competencyId: 'analytics', type: 'technical',   difficulty: 'intermediate',
    text: 'Explain multi-touch attribution and when you\'d use linear vs data-driven attribution models.',
    followUp: 'How does your choice impact budget allocation decisions?',
    greenFlagAnswers: ['data-driven', 'first-touch vs last-touch', 'attribution window', 'incrementality testing'],
    redFlagAnswers: ['last-click is always best', 'I don\'t change the model'] },
  { id: 'q-a3', competencyId: 'analytics', type: 'behavioral',  difficulty: 'advanced',
    text: 'Tell me about a time when your data analysis directly changed a major strategic decision.',
    followUp: 'What would have happened if you hadn\'t surfaced that insight?',
    greenFlagAnswers: ['specific business impact', 'quantified result', 'stakeholder alignment'],
    redFlagAnswers: ['vague answer', 'no specific decision mentioned'] },
  { id: 'q-a4', competencyId: 'analytics', type: 'situational', difficulty: 'advanced',
    text: 'A board member insists your best campaign had a 10× ROAS but your data shows 2.4×. How do you handle this?',
    followUp: 'How do you maintain data credibility in this situation?',
    greenFlagAnswers: ['attribution discrepancy', 'channel conflict', 'data validation', 'diplomatic communication'],
    redFlagAnswers: ['I would just agree', 'argue without evidence'] },

  // Paid Ads
  { id: 'q-p1', competencyId: 'paid', type: 'technical',   difficulty: 'basic',
    text: 'What\'s the difference between CPC, CPM, and CPR bidding strategies? When would you use each?',
    followUp: 'How does your choice change for brand awareness vs direct-response campaigns?',
    greenFlagAnswers: ['campaign objective', 'funnel stage', 'ROAS target', 'LTV consideration'],
    redFlagAnswers: ['always use the lowest CPC', 'not sure'] },
  { id: 'q-p2', competencyId: 'paid', type: 'technical',   difficulty: 'intermediate',
    text: 'You\'re managing a $50K/month Meta Ads budget with a 2.5× ROAS target. ROAS has dropped to 1.8×. Walk me through your diagnostic process.',
    followUp: 'At what point do you pause a campaign vs optimize it?',
    greenFlagAnswers: ['audience fatigue', 'creative refresh', 'budget pacing', 'landing page', 'iOS 14 impact'],
    redFlagAnswers: ['increase budget', 'I would just change the audience'] },
  { id: 'q-p3', competencyId: 'paid', type: 'behavioral',  difficulty: 'advanced',
    text: 'Describe the most complex paid media campaign you\'ve managed. What was your strategy and what were the results?',
    followUp: 'What would you do differently now?',
    greenFlagAnswers: ['multi-channel', 'audience segmentation', 'creative testing', 'measurable ROI'],
    redFlagAnswers: ['very simple example', 'no metrics mentioned'] },
  { id: 'q-p4', competencyId: 'paid', type: 'situational', difficulty: 'advanced',
    text: 'Your brand\'s CPL has doubled in 90 days. You need to present a recovery plan to the CEO next week. What does that plan look like?',
    followUp: 'How would you communicate uncertainty in your projections?',
    greenFlagAnswers: ['root cause analysis', 'competitive intel', 'bid strategy', 'creative audit', 'timeline'],
    redFlagAnswers: ['no structured plan', 'just cut budget'] },

  // SEO
  { id: 'q-s1', competencyId: 'seo', type: 'technical',    difficulty: 'basic',
    text: 'What are the three most important on-page SEO factors you optimize for every piece of content?',
    followUp: 'How do you prioritize them when time is limited?',
    greenFlagAnswers: ['search intent', 'E-E-A-T', 'Core Web Vitals', 'title tag', 'semantic structure'],
    redFlagAnswers: ['keyword density', 'meta keywords tag'] },
  { id: 'q-s2', competencyId: 'seo', type: 'technical',    difficulty: 'intermediate',
    text: 'Walk me through a technical SEO audit you\'d do for a newly acquired site.',
    followUp: 'How do you prioritize issues when you have 200 flagged items?',
    greenFlagAnswers: ['crawl budget', 'canonicalization', 'Core Web Vitals', 'schema markup', 'Screaming Frog'],
    redFlagAnswers: ['I only check keywords', 'no systematic approach'] },
  { id: 'q-s3', competencyId: 'seo', type: 'behavioral',   difficulty: 'advanced',
    text: 'Tell me about a time you recovered organic traffic after a major algorithm update.',
    followUp: 'How did you communicate the impact to stakeholders during the drop?',
    greenFlagAnswers: ['named update', 'content audit', 'specific pages fixed', 'recovery timeline'],
    redFlagAnswers: ['waited it out', 'no specific action taken'] },

  // Copywriting
  { id: 'q-c1', competencyId: 'copy', type: 'technical',   difficulty: 'basic',
    text: 'How do you adapt your writing style when switching from B2B long-form content to Instagram ad copy?',
    followUp: 'Give me a quick example rewrite of a generic headline.',
    greenFlagAnswers: ['audience persona', 'platform context', 'AIDA framework', 'voice consistency'],
    redFlagAnswers: ['just make it shorter', 'add more emojis'] },
  { id: 'q-c2', competencyId: 'copy', type: 'technical',   difficulty: 'intermediate',
    text: 'Write two subject line variants for a re-engagement email campaign for inactive SaaS users. Explain your logic.',
    followUp: 'How would you A/B test these and what would you measure?',
    greenFlagAnswers: ['curiosity gap', 'personalization token', 'urgency without clickbait', 'open rate + CTR'],
    redFlagAnswers: ['generic subject lines', 'no testing plan'] },
  { id: 'q-c3', competencyId: 'copy', type: 'behavioral',  difficulty: 'advanced',
    text: 'Tell me about copy you wrote that significantly improved conversion rates. What was the insight behind it?',
    followUp: 'How do you document and share learnings from copy tests with the team?',
    greenFlagAnswers: ['specific % uplift', 'user research informed', 'clear hypothesis', 'documented outcome'],
    redFlagAnswers: ['no metrics', 'just felt like it was better'] },

  // A/B Testing
  { id: 'q-ab1', competencyId: 'abtesting', type: 'technical',   difficulty: 'intermediate',
    text: 'What sample size would you need for an A/B test with a 5% baseline conversion rate, detecting a 20% relative lift with 80% power?',
    followUp: 'What happens if you call the test early?',
    greenFlagAnswers: ['~3800 per variant', 'statistical significance', 'peeking problem', 'type I/II error'],
    redFlagAnswers: ['until it looks good', 'I don\'t calculate this'] },
  { id: 'q-ab2', competencyId: 'abtesting', type: 'behavioral',  difficulty: 'advanced',
    text: 'Describe an A/B test that failed — and what you learned from it.',
    followUp: 'How do you build a culture of experimentation in a team resistant to change?',
    greenFlagAnswers: ['specific test described', 'hypothesis formed', 'learnings documented', 'team shared'],
    redFlagAnswers: ['can\'t recall a failure', 'no learning extracted'] },

  // Email
  { id: 'q-e1', competencyId: 'email', type: 'technical',   difficulty: 'intermediate',
    text: 'What are the key indicators that your email list has poor hygiene, and how do you fix it?',
    followUp: 'How does list quality affect your deliverability?',
    greenFlagAnswers: ['bounce rate', 'spam complaints', 'open rate trend', 'sunset policy', 'double opt-in'],
    redFlagAnswers: ['just send to everyone', 'never cleaned a list'] },
  { id: 'q-e2', competencyId: 'email', type: 'situational', difficulty: 'advanced',
    text: 'You have 50K subscribers but a 12% open rate (industry avg: 24%). Design your 6-week turnaround plan.',
    followUp: 'At what open rate would you declare success and why?',
    greenFlagAnswers: ['segmentation', 're-engagement sequence', 'send time optimization', 'subject testing', 'cleaning'],
    redFlagAnswers: ['just send more emails', 'change the template'] },

  // Social Media
  { id: 'q-sm1', competencyId: 'social', type: 'behavioral',  difficulty: 'intermediate',
    text: 'Tell me about a social media campaign that generated genuine community engagement, not just likes.',
    followUp: 'How did you measure "community health" vs vanity metrics?',
    greenFlagAnswers: ['UGC', 'comment quality', 'share rate', 'community sentiment', 'creator partnerships'],
    redFlagAnswers: ['follower count', 'only impressions'] },

  // Project Mgmt
  { id: 'q-pm1', competencyId: 'pm', type: 'behavioral',    difficulty: 'intermediate',
    text: 'You\'re running a product launch with 3 agencies, an internal design team, and a PR firm. One agency misses a deadline. What do you do?',
    followUp: 'How do you prevent this in future engagements?',
    greenFlagAnswers: ['impact assessment', 'escalation process', 'dependency mapping', 'SLA', 'post-mortem'],
    redFlagAnswers: ['fire them immediately', 'absorb the delay silently'] },

  // Culture/soft
  { id: 'q-cf1', competencyId: 'culture', type: 'culture',  difficulty: 'basic',
    text: 'What does a healthy feedback culture look like to you, and what\'s an example of giving difficult feedback well?',
    followUp: 'How do you receive feedback you disagree with?',
    greenFlagAnswers: ['specific example', 'radical candor', 'growth mindset', 'psychological safety'],
    redFlagAnswers: ['vague platitudes', 'no real example'] },
  { id: 'q-cf2', competencyId: 'culture', type: 'culture',  difficulty: 'basic',
    text: 'How do you manage your work when you have three urgent priorities and limited time?',
    followUp: 'Can you give a recent example?',
    greenFlagAnswers: ['explicit prioritization method', 'stakeholder communication', 'tradeoff articulation'],
    redFlagAnswers: ['I just work harder', 'no method mentioned'] },
  { id: 'q-cf3', competencyId: 'comm',    type: 'behavioral',difficulty: 'intermediate',
    text: 'Tell me about a time you had to communicate bad news to a senior stakeholder. What was your approach?',
    followUp: 'How did the relationship evolve afterward?',
    greenFlagAnswers: ['proactive', 'data-backed', 'solution-oriented', 'relationship preserved'],
    redFlagAnswers: ['delayed the message', 'blamed someone else'] },
];

// ── Question card ─────────────────────────────────────────────────────────
interface QuestionCardProps {
  question: InterviewQuestion;
  compLabel: string;
  compColor: string;
  onCopy: (q: InterviewQuestion) => void;
  onFavorite: (id: string) => void;
  isFavorited: boolean;
  isExpanded: boolean;
  onExpand: (id: string) => void;
}

function QuestionCard({ question, compLabel, compColor, onCopy, onFavorite, isFavorited, isExpanded, onExpand }: QuestionCardProps) {
  const typeConfig = QUESTION_TYPES.find((t) => t.id === question.type);
  const diffConfig = DIFFICULTIES.find((d) => d.id === question.difficulty);
  const haptic = useHaptic();

  return (
    <motion.div
      layout
      whileHover={{ y: -1 }}
      className="bg-pulse-elevated rounded-xl border border-pulse-border overflow-hidden transition-colors duration-200 hover:border-pulse-muted"
    >
      {/* Card header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex flex-wrap gap-1.5">
            {/* Competency badge */}
            <Badge
              className="text-2xs"
              style={{ borderColor: `${compColor}40`, color: compColor, background: `${compColor}10` } as React.CSSProperties}
            >
              {compLabel}
            </Badge>
            {/* Type badge */}
            {typeConfig && (
              <Badge
                className="text-2xs"
                style={{ borderColor: `${typeConfig.color}40`, color: typeConfig.color, background: `${typeConfig.color}10` } as React.CSSProperties}
              >
                {typeConfig.icon} {typeConfig.label}
              </Badge>
            )}
            {/* Difficulty badge */}
            {diffConfig && (
              <Badge
                className="text-2xs"
                style={{ borderColor: `${diffConfig.color}40`, color: diffConfig.color, background: `${diffConfig.color}10` } as React.CSSProperties}
              >
                {diffConfig.label}
              </Badge>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-1.5 flex-shrink-0">
            <button
              onClick={() => { haptic('light'); onFavorite(question.id); }}
              className={cn(
                'w-7 h-7 rounded border flex items-center justify-center text-sm transition-all',
                isFavorited ? 'border-pulse-amber bg-pulse-amber/20 text-pulse-amber' : 'border-pulse-border text-pulse-text-faint hover:border-pulse-muted'
              )}
              aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
              aria-pressed={isFavorited}
            >
              {isFavorited ? '★' : '☆'}
            </button>
            <button
              onClick={() => { haptic('light'); onCopy(question); }}
              className="w-7 h-7 rounded border border-pulse-border flex items-center justify-center text-xs text-pulse-text-faint hover:border-pulse-muted hover:text-pulse-text-secondary transition-all"
              aria-label="Copy question"
            >
              📋
            </button>
          </div>
        </div>

        {/* Question text */}
        <p className="font-sans text-sm text-pulse-text-primary leading-relaxed">
          {question.text}
        </p>

        {/* Expand toggle */}
        <button
          onClick={() => onExpand(question.id)}
          className="flex items-center gap-1.5 mt-3 font-mono text-2xs text-pulse-text-faint hover:text-pulse-gold transition-colors"
          aria-expanded={isExpanded}
        >
          <motion.span animate={{ rotate: isExpanded ? 90 : 0 }} className="text-xs">▶</motion.span>
          {isExpanded ? 'Less' : 'Follow-up & Rubric'}
        </button>
      </div>

      {/* Expanded content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="border-t border-pulse-border overflow-hidden"
          >
            <div className="p-4 space-y-3 bg-pulse-surface">
              {/* Follow-up */}
              {question.followUp && (
                <div>
                  <p className="font-mono text-2xs text-pulse-gold uppercase tracking-widest mb-1">Follow-up Probe</p>
                  <p className="font-sans text-xs text-pulse-text-secondary leading-relaxed italic">
                    "{question.followUp}"
                  </p>
                </div>
              )}

              {/* Green flags */}
              {question.greenFlagAnswers?.length && (
                <div>
                  <p className="font-mono text-2xs text-pulse-mint uppercase tracking-widest mb-1">✅ Green-Flag Signals</p>
                  <div className="flex flex-wrap gap-1.5">
                    {question.greenFlagAnswers.map((g) => (
                      <span key={g} className="bg-pulse-mint/10 border border-pulse-mint/30 text-pulse-mint font-mono text-2xs px-2 py-0.5 rounded">
                        {g}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Red flags */}
              {question.redFlagAnswers?.length && (
                <div>
                  <p className="font-mono text-2xs text-pulse-coral uppercase tracking-widest mb-1">⚠️ Red-Flag Signals</p>
                  <div className="flex flex-wrap gap-1.5">
                    {question.redFlagAnswers.map((r) => (
                      <span key={r} className="bg-pulse-coral/10 border border-pulse-coral/30 text-pulse-coral font-mono text-2xs px-2 py-0.5 rounded">
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── AI Question Generator (TanStack Query) ────────────────────────────────
interface GeneratePayload { competencyId: string; difficulty: QDiff; type: QType; context: string }

async function fetchAIQuestions(payload: GeneratePayload): Promise<InterviewQuestion[]> {
  const comp = payload.competencyId;
  const response = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `Generate 3 unique ${payload.difficulty}-level ${payload.type} interview questions for the "${comp}" competency in a Digital Marketing role.

Context: ${payload.context || 'Global digital-first company, mid-market SaaS product.'}

Return ONLY a valid JSON array (no markdown, no preamble) in this exact shape:
[
  {
    "text": "question text",
    "followUp": "follow-up probe",
    "greenFlagAnswers": ["keyword1", "keyword2"],
    "redFlagAnswers": ["keyword1", "keyword2"]
  }
]`
      }]
    }),
  });
  if (!response.ok) throw new Error(`API ${response.status}`);
  const data = await response.json();
  const raw  = data.content?.[0]?.text ?? '[]';
  const clean = raw.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(clean) as { text: string; followUp?: string; greenFlagAnswers?: string[]; redFlagAnswers?: string[] }[];
  return parsed.map((q, i) => ({
    id:              `ai-${Date.now()}-${i}`,
    competencyId:    payload.competencyId,
    type:            payload.type,
    difficulty:      payload.difficulty,
    text:            q.text,
    followUp:        q.followUp,
    greenFlagAnswers:q.greenFlagAnswers,
    redFlagAnswers:  q.redFlagAnswers,
  }));
}

function AIGenerator({ onAdd }: { onAdd: (questions: InterviewQuestion[]) => void }) {
  const config   = useConfig();
  const haptic   = useHaptic();
  const toast    = useToast();

  const [compId,   setCompId]   = useState(config.competencies[0]?.id ?? '');
  const [diff,     setDiff]     = useState<QDiff>('intermediate');
  const [type,     setType]     = useState<QType>('behavioral');
  const [context,  setContext]  = useState('');
  const [enabled,  setEnabled]  = useState(false);

  const { data, isFetching, error, refetch } = useQuery<InterviewQuestion[], Error>({
    queryKey: ['ai-questions', compId, diff, type, context],
    queryFn:  () => fetchAIQuestions({ competencyId: compId, difficulty: diff, type, context }),
    enabled,
    staleTime: Infinity,
    retry: 1,
  });

  const handleGenerate = useCallback(() => {
    haptic('medium');
    setEnabled(true);
    setTimeout(() => refetch(), 0);
  }, [haptic, refetch]);

  const handleAdd = useCallback(() => {
    if (!data) return;
    onAdd(data);
    toast.success(`${data.length} AI questions added to your bank`);
    haptic('success');
    setEnabled(false);
  }, [data, onAdd, toast, haptic]);

  const hardComps = config.competencies.filter((c) => c.category === 'hard' || c.category === 'soft');

  return (
    <Card className="border-pulse-gold/20">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg" aria-hidden="true">✦</span>
        <h3 className="font-mono text-xs text-pulse-gold uppercase tracking-widest">AI Question Generator</h3>
        <Badge variant="info" className="text-2xs">Claude API</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {/* Competency */}
        <div>
          <label className="block font-mono text-2xs text-pulse-text-faint uppercase tracking-widest mb-1.5">Competency</label>
          <select value={compId} onChange={(e) => setCompId(e.target.value)}
            className="w-full bg-pulse-elevated border border-pulse-border rounded px-3 py-2 font-mono text-xs text-pulse-text-primary focus:outline-none focus:border-pulse-gold">
            {hardComps.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>

        {/* Type */}
        <div>
          <label className="block font-mono text-2xs text-pulse-text-faint uppercase tracking-widest mb-1.5">Question Type</label>
          <select value={type} onChange={(e) => setType(e.target.value as QType)}
            className="w-full bg-pulse-elevated border border-pulse-border rounded px-3 py-2 font-mono text-xs text-pulse-text-primary focus:outline-none focus:border-pulse-gold">
            {QUESTION_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>

        {/* Difficulty */}
        <div>
          <label className="block font-mono text-2xs text-pulse-text-faint uppercase tracking-widest mb-1.5">Difficulty</label>
          <div className="flex gap-1">
            {DIFFICULTIES.map((d) => (
              <button key={d.id} onClick={() => setDiff(d.id)}
                className={cn('flex-1 py-2 rounded font-mono text-2xs border transition-all',
                  diff === d.id ? 'font-bold' : 'border-pulse-border text-pulse-text-faint hover:border-pulse-muted'
                )}
                style={diff === d.id ? { borderColor: d.color, color: d.color, background: `${d.color}15` } : {}}
                aria-pressed={diff === d.id}
              >{d.label}</button>
            ))}
          </div>
        </div>

        {/* Context */}
        <div>
          <label className="block font-mono text-2xs text-pulse-text-faint uppercase tracking-widest mb-1.5">Context (optional)</label>
          <input value={context} onChange={(e) => setContext(e.target.value)}
            placeholder="e.g. E-commerce, B2B SaaS…"
            className="w-full bg-pulse-elevated border border-pulse-border rounded px-3 py-2 font-mono text-xs text-pulse-text-primary focus:outline-none focus:border-pulse-gold"
          />
        </div>
      </div>

      <Button variant="primary" size="sm" onClick={handleGenerate} loading={isFetching} disabled={isFetching}>
        {isFetching ? 'Generating…' : '✦ Generate 3 Questions'}
      </Button>

      {/* Error */}
      {error && (
        <p className="font-mono text-2xs text-pulse-coral mt-3" role="alert">
          {error.message} — check API connection in Settings
        </p>
      )}

      {/* Preview */}
      <AnimatePresence>
        {data && !isFetching && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 space-y-2">
            <Divider label="Preview — 3 generated questions" />
            {data.map((q) => (
              <div key={q.id} className="p-3 bg-pulse-surface rounded-lg border border-pulse-border">
                <p className="font-sans text-xs text-pulse-text-secondary leading-relaxed">{q.text}</p>
                {q.followUp && (
                  <p className="font-mono text-2xs text-pulse-text-faint mt-1 italic">→ {q.followUp}</p>
                )}
              </div>
            ))}
            <Button variant="success" size="sm" className="w-full" onClick={handleAdd}>
              + Add All to Question Bank
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

// ── Main Question Bank ────────────────────────────────────────────────────
export function QuestionBank() {
  const { t }    = useTranslation();
  const config    = useConfig();
  const haptic    = useHaptic();
  const toast     = useToast();
  const [, copyToClipboard] = useCopyToClipboard();

  // Local state
  const [customQuestions, setCustomQuestions] = useState<InterviewQuestion[]>([]);
  const [favorites,   setFavorites]   = useState<Set<string>>(new Set());
  const [expanded,    setExpanded]    = useState<Set<string>>(new Set());
  const [search,      setSearch]      = useState('');
  const [filterComp,  setFilterComp]  = useState('all');
  const [filterType,  setFilterType]  = useState<QType | 'all'>('all');
  const [filterDiff,  setFilterDiff]  = useState<QDiff | 'all'>('all');
  const [showFavOnly, setShowFavOnly] = useState(false);
  const [showAI,      setShowAI]      = useState(false);

  const [debouncedSearch] = useDebouncedValue(search, 280);

  // All questions — merged base + custom + AI-generated
  const allQuestions = useMemo(
    () => [...BASE_QUESTIONS, ...customQuestions],
    [customQuestions]
  );

  // Competency lookup map — derived from config SSOT
  const compMap = useMemo(
    () => Object.fromEntries(config.competencies.map((c) => [c.id, c])),
    [config.competencies]
  );

  // Filtered questions — derived
  const filtered = useMemo(() => {
    let q = allQuestions;
    if (showFavOnly) q = q.filter((item) => favorites.has(item.id));
    if (filterComp !== 'all') q = q.filter((item) => item.competencyId === filterComp);
    if (filterType !== 'all') q = q.filter((item) => item.type === filterType);
    if (filterDiff !== 'all') q = q.filter((item) => item.difficulty === filterDiff);
    if (debouncedSearch.trim()) {
      const s = debouncedSearch.toLowerCase();
      q = q.filter((item) =>
        item.text.toLowerCase().includes(s) ||
        item.followUp?.toLowerCase().includes(s) ||
        item.greenFlagAnswers?.some((g) => g.toLowerCase().includes(s)) ||
        compMap[item.competencyId]?.label.toLowerCase().includes(s)
      );
    }
    return q;
  }, [allQuestions, showFavOnly, filterComp, filterType, filterDiff, debouncedSearch, favorites, compMap]);

  // Stats — derived
  const stats = useMemo(() => ({
    total:    allQuestions.length,
    filtered: filtered.length,
    favs:     favorites.size,
    byComp:   Object.fromEntries(
      config.competencies.map((c) => [c.id, allQuestions.filter((q) => q.competencyId === c.id).length])
    ),
  }), [allQuestions, filtered, favorites, config.competencies]);

  const handleCopy = useCallback((q: InterviewQuestion) => {
    const text = q.followUp ? `${q.text}\n\n↳ ${q.followUp}` : q.text;
    copyToClipboard(text);
    haptic('light');
    toast.success(t('toast.copied'));
  }, [copyToClipboard, haptic, toast, t]);

  const handleFavorite = useCallback((id: string) => {
    haptic('light');
    setFavorites((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, [haptic]);

  const handleExpand = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleAddAI = useCallback((questions: InterviewQuestion[]) => {
    setCustomQuestions((prev) => [...prev, ...questions]);
  }, []);

  // Export selected / favorited questions as text
  const handleExport = useCallback(() => {
    const toExport = filtered.filter((q) => favorites.has(q.id));
    if (!toExport.length) { toast.warning('Star questions to export them'); return; }
    const text = toExport.map((q, i) =>
      `[${i + 1}] ${compMap[q.competencyId]?.label ?? q.competencyId} — ${q.difficulty.toUpperCase()}\n${q.text}${q.followUp ? `\n↳ ${q.followUp}` : ''}\n`
    ).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Interview_Questions_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`${toExport.length} questions exported`);
    haptic('success');
  }, [filtered, favorites, compMap, toast, haptic]);

  const uniqueComps = useMemo(
    () => [...new Set(allQuestions.map((q) => q.competencyId))],
    [allQuestions]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto space-y-8"
    >
      <SVGDefs />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="font-mono text-2xs text-pulse-text-faint uppercase tracking-widest mb-1">
            Module 07 — Interview Intelligence
          </p>
          <h2 className="font-display text-3xl sm:text-4xl text-pulse-text-primary font-bold">
            Question Bank
          </h2>
          <p className="font-sans text-sm text-pulse-text-muted mt-2 max-w-2xl leading-relaxed">
            {stats.total} structured questions with rubric criteria, follow-up probes,
            and green/red flag signals. Generate custom questions with AI or add your own.
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button variant="secondary" size="sm" onClick={() => setShowAI((v) => !v)}>
            {showAI ? '▲ Hide AI' : '✦ AI Generator'}
          </Button>
          <Button variant="secondary" size="sm" onClick={handleExport}>
            📥 Export Starred
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Questions', val: stats.total,    color: '#C8A97E' },
          { label: 'Showing',         val: stats.filtered, color: '#6BAED6' },
          { label: 'Starred',         val: stats.favs,     color: '#E8C35A' },
          { label: 'AI Added',        val: customQuestions.length, color: '#9B8EC4' },
        ].map((s) => (
          <div key={s.label} className="text-center p-3 bg-pulse-elevated rounded-lg border border-pulse-border">
            <p className="font-display text-2xl font-bold" style={{ color: s.color }}>{s.val}</p>
            <p className="font-mono text-2xs text-pulse-text-faint mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* AI Generator */}
      <AnimatePresence>
        {showAI && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <AIGenerator onAdd={handleAddAI} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search + Filters */}
      <Card>
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-pulse-text-faint text-sm" aria-hidden="true">🔍</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search questions, keywords, competencies…"
              className="w-full bg-pulse-elevated border border-pulse-border rounded-lg pl-9 pr-4 py-3 font-sans text-sm text-pulse-text-primary placeholder:text-pulse-text-faint focus:outline-none focus:border-pulse-gold transition-colors"
              aria-label="Search questions"
            />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-pulse-text-faint hover:text-pulse-text-secondary text-xs"
                aria-label="Clear search">✕</button>
            )}
          </div>

          {/* Filter row */}
          <div className="flex flex-wrap gap-2">
            {/* Favorites toggle */}
            <button
              onClick={() => { haptic('light'); setShowFavOnly((v) => !v); }}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono text-xs transition-all',
                showFavOnly ? 'border-pulse-amber bg-pulse-amber/10 text-pulse-amber' : 'border-pulse-border text-pulse-text-muted hover:border-pulse-muted'
              )}
              aria-pressed={showFavOnly}
            >
              ★ Starred
            </button>

            {/* Competency filters */}
            {uniqueComps.map((cid) => {
              const comp = compMap[cid];
              if (!comp) return null;
              return (
                <button
                  key={cid}
                  onClick={() => { haptic('light'); setFilterComp(filterComp === cid ? 'all' : cid); }}
                  className={cn('flex items-center gap-1 px-3 py-1.5 rounded-lg border font-mono text-xs transition-all',
                    filterComp === cid ? 'font-bold' : 'border-pulse-border text-pulse-text-muted hover:border-pulse-muted'
                  )}
                  style={filterComp === cid ? { borderColor: `${comp.color}50`, color: comp.color, background: `${comp.color}10` } : {}}
                  aria-pressed={filterComp === cid}
                >
                  <span aria-hidden="true">{comp.icon}</span> {comp.short}
                  <span className="font-display text-2xs ml-0.5 opacity-60">{stats.byComp[cid] ?? 0}</span>
                </button>
              );
            })}
          </div>

          {/* Type + Difficulty filters */}
          <div className="flex flex-wrap gap-2">
            {QUESTION_TYPES.map((qt) => (
              <button key={qt.id} onClick={() => { haptic('light'); setFilterType(filterType === qt.id ? 'all' : qt.id); }}
                className={cn('px-3 py-1.5 rounded-lg border font-mono text-xs transition-all',
                  filterType === qt.id ? 'font-bold' : 'border-pulse-border text-pulse-text-muted hover:border-pulse-muted'
                )}
                style={filterType === qt.id ? { borderColor: `${qt.color}50`, color: qt.color, background: `${qt.color}10` } : {}}
                aria-pressed={filterType === qt.id}
              >
                {qt.icon} {qt.label}
              </button>
            ))}
            {DIFFICULTIES.map((d) => (
              <button key={d.id} onClick={() => { haptic('light'); setFilterDiff(filterDiff === d.id ? 'all' : d.id); }}
                className={cn('px-3 py-1.5 rounded-lg border font-mono text-xs transition-all',
                  filterDiff === d.id ? 'font-bold' : 'border-pulse-border text-pulse-text-muted hover:border-pulse-muted'
                )}
                style={filterDiff === d.id ? { borderColor: `${d.color}50`, color: d.color, background: `${d.color}10` } : {}}
                aria-pressed={filterDiff === d.id}
              >
                {d.label}
              </button>
            ))}

            {/* Clear filters */}
            {(filterComp !== 'all' || filterType !== 'all' || filterDiff !== 'all' || showFavOnly || search) && (
              <button
                onClick={() => { setFilterComp('all'); setFilterType('all'); setFilterDiff('all'); setShowFavOnly(false); setSearch(''); }}
                className="px-3 py-1.5 rounded-lg border border-pulse-coral/40 text-pulse-coral font-mono text-xs hover:bg-pulse-coral/10 transition-all"
              >
                ✕ Clear All
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs text-pulse-text-faint">
          Showing <span className="text-pulse-gold font-bold">{filtered.length}</span> of {stats.total} questions
          {debouncedSearch && ` matching "${debouncedSearch}"`}
        </p>
        {filtered.length > 0 && (
          <Button variant="ghost" size="xs"
            onClick={() => setExpanded(filtered.length === expanded.size ? new Set() : new Set(filtered.map((q) => q.id)))}>
            {expanded.size > 0 ? 'Collapse All' : 'Expand All'}
          </Button>
        )}
      </div>

      {/* Question list */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-3 opacity-20">💬</p>
          <p className="font-mono text-sm text-pulse-text-faint">No questions match your filters.</p>
          <Button variant="ghost" size="sm" className="mt-3"
            onClick={() => { setFilterComp('all'); setFilterType('all'); setFilterDiff('all'); setShowFavOnly(false); setSearch(''); }}>
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((q) => {
              const comp = compMap[q.competencyId];
              return (
                <motion.div key={q.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <QuestionCard
                    question={q}
                    compLabel={comp?.short ?? q.competencyId}
                    compColor={comp?.color ?? '#C8A97E'}
                    onCopy={handleCopy}
                    onFavorite={handleFavorite}
                    isFavorited={favorites.has(q.id)}
                    isExpanded={expanded.has(q.id)}
                    onExpand={handleExpand}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
