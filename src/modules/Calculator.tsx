/* ═══════════════════════════════════════════════════════════════════════════
   PULSE NEURAL FIT ENGINE — MODULE 01: CALCULATOR (ENTERPRISE)
   Candidate scoring | Real-time evaluation | Radar chart | Candidate table
   ═══════════════════════════════════════════════════════════════════════════ */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, ResponsiveContainer, Tooltip as RechartsTooltip
} from 'recharts';
import { useTranslation } from 'react-i18next';

// Store & Hooks
import { useAppStore, useConfig } from '@/store/appStore';
import { useHaptic, useKeyboardShortcuts, useToast } from '@/hooks';
import {
  evaluateCandidate,
  formatCurrency,
  formatNumber,
  uid,
  cn,
  exportCandidatesCSV,
} from '@/lib/utils';

// UI Components
import {
  Card, Button, Badge, ProgressBar, Divider,
  ScoreChip, Input, Modal, Tooltip, Kbd,
  Table, Avatar, Alert,
} from '@/components/ui';

// Types
import type { Candidate, CandidateScore, ScoreValue, CandidateId, HireDecision } from '@/types';

// ============================================================================
// 1. FORM VALIDATION SCHEMA
// ============================================================================
const candidateSchema = z.object({
  firstName: z.string().min(1, 'First name required'),
  lastName: z.string().min(1, 'Last name required'),
  email: z.string().email('Invalid email address'),
  position: z.string().min(1, 'Position required'),
  experienceYears: z.number().min(0).max(50).default(0),
  currentCompany: z.string().optional(),
  expectedSalary: z.object({
    amount: z.number().min(0),
    currency: z.string().default('USD'),
  }),
});

type CandidateFormData = z.infer<typeof candidateSchema>;

// ============================================================================
// 2. NEURAL SCORE SLIDER COMPONENT (dari Versi B)
// ============================================================================
interface NeuralScoreSliderProps {
  competency: any;
  value: ScoreValue;
  onChange: (val: ScoreValue) => void;
}

function NeuralScoreSlider({ competency, value, onChange }: NeuralScoreSliderProps) {
  const triggerHaptic = useHaptic();
  const currentLevel = competency.levels?.find((l: any) => l.score === value);

  return (
    <div className="group relative p-5 bg-white/[0.02] border border-white/5 rounded-3xl hover:bg-white/[0.04] transition-all">
      <div className="flex justify-between items-start mb-4">
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center text-lg border border-white/5">
            {competency.icon || (competency.category === 'hard' ? '⚙️' : '🧠')}
          </div>
          <div>
            <h4 className="text-sm font-bold text-white leading-tight">{competency.label}</h4>
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mt-1">
              Weight: {((competency.weight || 0) * 100).toFixed(0)}% | {competency.category}
            </p>
          </div>
        </div>
        <ScoreChip score={value} size="md" />
      </div>

      <input
        type="range"
        min={1}
        max={5}
        step={1}
        value={value}
        onChange={(e) => {
          triggerHaptic('light');
          onChange(Number(e.target.value) as ScoreValue);
        }}
        className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-[var(--primary)]"
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={value}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          className="mt-4 p-3 bg-black/40 rounded-xl border border-white/5"
        >
          <p className="text-[11px] text-zinc-400 leading-relaxed italic">
            {currentLevel?.expectation || `Level ${value} - Standard proficiency`}
          </p>
          {competency.isCritical && value < 3 && (
            <p className="text-[9px] text-red-500 font-bold uppercase tracking-tighter mt-2 flex items-center gap-1">
              ⚠️ Critical gap detected
            </p>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// 3. CANDIDATE TABLE (dari Versi A + upgrade)
// ============================================================================
interface CandidateTableProps {
  candidates: Candidate[];
  onPin: (id: string) => void;
  pinnedId: string | null;
  onClone: (candidate: Candidate) => void;
  onDelete: (id: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  filterDecision: HireDecision | 'ALL';
  onFilterChange: (filter: HireDecision | 'ALL') => void;
}

function CandidateTable({
  candidates,
  onPin,
  pinnedId,
  onClone,
  onDelete,
  searchQuery,
  onSearchChange,
  filterDecision,
  onFilterChange,
}: CandidateTableProps) {
  const { t } = useTranslation();
  const config = useConfig();

  const filtered = useMemo(() => {
    let result = candidates.filter(c =>
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (filterDecision !== 'ALL') {
      result = result.filter(c => c.decision === filterDecision);
    }
    // Sort by score descending
    return result.sort((a, b) => (b.weightedScore || 0) - (a.weightedScore || 0));
  }, [candidates, searchQuery, filterDecision]);

  return (
    <Card className="p-0 overflow-hidden">
      <div className="p-4 border-b border-white/5 flex flex-wrap gap-3 justify-between items-center">
        <div className="flex gap-2 flex-wrap">
          <Input
            placeholder="Search candidate..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-64"
            leftIcon={<span className="text-zinc-500">🔍</span>}
          />
          <select
            value={filterDecision}
            onChange={(e) => onFilterChange(e.target.value as any)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono"
          >
            <option value="ALL">All decisions</option>
            <option value="STRONG_HIRE">Strong hire</option>
            <option value="HIRE">Hire</option>
            <option value="MAYBE">Maybe</option>
            <option value="NO_HIRE">No hire</option>
            <option value="NO_HIRE_CRITICAL">Critical fail</option>
          </select>
        </div>
        <Button
          size="sm"
          variant="glass"
          onClick={() => exportCandidatesCSV(candidates, config.currency)}
          disabled={candidates.length === 0}
        >
          📥 Export CSV
        </Button>
      </div>

      <div className="overflow-x-auto">
        <Table className="min-w-full">
          <thead className="border-b border-white/5 bg-white/[0.02]">
            <tr>
              <th className="px-4 py-3 text-left text-2xs font-mono font-bold text-zinc-400 uppercase tracking-wider">Candidate</th>
              <th className="px-4 py-3 text-left text-2xs font-mono font-bold text-zinc-400 uppercase tracking-wider">Position</th>
              <th className="px-4 py-3 text-left text-2xs font-mono font-bold text-zinc-400 uppercase tracking-wider">Score</th>
              <th className="px-4 py-3 text-left text-2xs font-mono font-bold text-zinc-400 uppercase tracking-wider">Decision</th>
              <th className="px-4 py-3 text-right text-2xs font-mono font-bold text-zinc-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-zinc-500">
                  No candidates found
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id} className={cn('border-b border-white/5 hover:bg-white/[0.02]', pinnedId === c.id && 'bg-yellow-500/5')}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={`${c.firstName} ${c.lastName}`} size="sm" />
                      <div>
                        <div className="font-medium text-white">{c.firstName} {c.lastName}</div>
                        <div className="text-2xs text-zinc-500">{c.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-300">{c.position || '-'}</td>
                  <td className="px-4 py-3">
                    <ScoreChip score={c.weightedScore || 0} size="sm" />
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        c.decision === 'STRONG_HIRE' ? 'success' :
                        c.decision === 'HIRE' ? 'info' :
                        c.decision === 'MAYBE' ? 'warning' : 'danger'
                      }
                    >
                      {c.decision?.replace('_', ' ') || 'Pending'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-2 justify-end">
                      <Tooltip content="Pin to top">
                        <button onClick={() => onPin(c.id)} className="text-zinc-500 hover:text-yellow-500">
                          📌
                        </button>
                      </Tooltip>
                      <Tooltip content="Clone candidate">
                        <button onClick={() => onClone(c)} className="text-zinc-500 hover:text-blue-500">
                          📋
                        </button>
                      </Tooltip>
                      <Tooltip content="Delete">
                        <button onClick={() => onDelete(c.id)} className="text-zinc-500 hover:text-red-500">
                          🗑️
                        </button>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>
    </Card>
  );
}

// ============================================================================
// 4. MAIN CALCULATOR MODULE
// ============================================================================
export function Calculator() {
  const { t } = useTranslation();
  const config = useConfig();
  const triggerHaptic = useHaptic();
  const toast = useToast();

  // Store actions & data
  const upsertCandidate = useAppStore((s) => s.upsertCandidate);
  const candidates = useAppStore((s) => s.candidates);
  const triggerCelebration = useAppStore((s) => s.triggerConfetti);
  const deleteCandidate = useAppStore((s) => s.deleteCandidate);

  // Local state
  const [candidateScores, setCandidateScores] = useState<Record<string, ScoreValue>>({});
  const [isSimulating, setIsSimulating] = useState(false);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDecision, setFilterDecision] = useState<HireDecision | 'ALL'>('ALL');

  // React Hook Form
  const { control, register, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm<CandidateFormData>({
    resolver: zodResolver(candidateSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      position: '',
      experienceYears: 2,
      currentCompany: '',
      expectedSalary: { amount: config.maxBudget * 0.7, currency: config.currency },
    },
  });

  const formValues = watch();

  // Real-time evaluation
  const analysis = useMemo(() => {
    // Build scores array for evaluation
    const scoresArray = Object.entries(candidateScores).map(([id, score]) => ({
      competencyId: id,
      score,
    }));
    const evaluation = evaluateCandidate(
      {
        scores: scoresArray,
        expectedSalary: formValues.expectedSalary.amount,
        currency: config.currency,
      } as any,
      config.competencies,
      { maxBudget: config.maxBudget, strongHireThreshold: 4.2, hireThreshold: 3.7, maybeThreshold: 3.0 }
    );
    return evaluation;
  }, [candidateScores, formValues.expectedSalary.amount, config]);

  // Data for radar chart
  const radarData = useMemo(() => {
    return config.competencies.map((comp) => ({
      subject: comp.shortCode || comp.label.slice(0, 4),
      candidate: candidateScores[comp.id] || 1,
      benchmark: 4, // standard benchmark
      fullMark: 5,
    }));
  }, [config.competencies, candidateScores]);

  // AI Auto-fill simulation
  const simulateAI = useCallback(() => {
    setIsSimulating(true);
    triggerHaptic('medium');
    setTimeout(() => {
      setValue('firstName', 'Alex');
      setValue('lastName', 'Riviera');
      setValue('email', 'alex.riviera@example.com');
      setValue('position', 'Principal AI Engineer');
      setValue('experienceYears', 12);
      setValue('currentCompany', 'OpenAI');
      setValue('expectedSalary.amount', config.maxBudget * 1.1);

      const newScores: Record<string, ScoreValue> = {};
      config.competencies.forEach((comp) => {
        // Simulate high performer
        newScores[comp.id] = (Math.floor(Math.random() * 2) + 4) as ScoreValue;
      });
      setCandidateScores(newScores);
      setIsSimulating(false);
      toast.info('AI Analysis: Resume parsed and scores pre-filled.');
    }, 1500);
  }, [setValue, config, triggerHaptic, toast]);

  // Save candidate
  const onSave = useCallback((data: CandidateFormData) => {
    if (Object.keys(candidateScores).length === 0) {
      toast.warning('Please score at least one competency before saving.');
      return;
    }

    triggerHaptic('success');

    const scoresArray = Object.entries(candidateScores).map(([competencyId, score]) => ({
      competencyId,
      score,
      notes: '',
      evaluatorId: 'current-user',
      evaluatedAt: new Date().toISOString(),
    }));

    const newCandidate: Candidate = {
      id: uid() as CandidateId,
      firstName: data.firstName,
      lastName: data.lastName,
      name: `${data.firstName} ${data.lastName}`,
      email: data.email,
      position: data.position,
      experienceYears: data.experienceYears,
      currentCompany: data.currentCompany,
      expectedSalary: data.expectedSalary.amount,
      currency: data.expectedSalary.currency as any,
      scores: scoresArray,
      softScores: [],
      weightedScore: analysis.score,
      decision: analysis.decision,
      status: 'SCREENING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'current-user' as any,
      updatedBy: 'current-user' as any,
    };

    upsertCandidate(newCandidate);

    if (analysis.decision === 'STRONG_HIRE') {
      triggerCelebration();
      toast.success('🏆 STRONG HIRE! Candidate added to shortlist.');
    } else if (analysis.decision === 'HIRE') {
      toast.success('✓ Candidate saved to comparison pool.');
    } else if (analysis.decision === 'MAYBE') {
      toast.warning('⚠️ Candidate saved — review recommended.');
    } else {
      toast.info('Candidate saved for reference.');
    }

    // Reset form & scores
    reset();
    setCandidateScores({});
  }, [candidateScores, analysis, upsertCandidate, triggerCelebration, toast, triggerHaptic, reset]);

  // Clone candidate
  const handleClone = useCallback((candidate: Candidate) => {
    const newId = uid() as CandidateId;
    const cloned: Candidate = {
      ...candidate,
      id: newId,
      name: `${candidate.firstName} ${candidate.lastName} (clone)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    upsertCandidate(cloned);
    toast.success('Candidate cloned successfully.');
  }, [upsertCandidate, toast]);

  // Delete candidate
  const handleDelete = useCallback((id: string) => {
    deleteCandidate(id as CandidateId);
    if (pinnedId === id) setPinnedId(null);
    toast.info('Candidate removed.');
  }, [deleteCandidate, pinnedId, toast]);

  // Pin candidate
  const handlePin = useCallback((id: string) => {
    setPinnedId(pinnedId === id ? null : id);
    triggerHaptic('light');
  }, [pinnedId, triggerHaptic]);

  // Keyboard shortcuts: Ctrl+S save, Ctrl+R reset
  useKeyboardShortcuts({
    s: () => handleSubmit(onSave)(),
    r: () => { reset(); setCandidateScores({}); toast.info('Form reset.'); },
  }, { ctrl: true });

  // Sort pinned candidate to top of table
  const sortedCandidates = useMemo(() => {
    if (!pinnedId) return candidates;
    const pinned = candidates.find(c => c.id === pinnedId);
    if (!pinned) return candidates;
    return [pinned, ...candidates.filter(c => c.id !== pinnedId)];
  }, [candidates, pinnedId]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
      {/* LEFT COLUMN: FORM & SCORING (7/12) */}
      <div className="xl:col-span-7 space-y-8">
        {/* Candidate Form */}
        <Card className="p-6 sm:p-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-display text-xl font-bold text-white tracking-tight">Candidate Intelligence</h3>
              <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest mt-1">Input & Neural Scoring</p>
            </div>
            <Button variant="glass" size="sm" onClick={simulateAI} isLoading={isSimulating}>
              ✨ AI Auto-Fill
            </Button>
          </div>

          <form className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="First Name" {...register('firstName')} error={errors.firstName?.message} />
            <Input label="Last Name" {...register('lastName')} error={errors.lastName?.message} />
            <div className="md:col-span-2">
              <Input label="Email" type="email" {...register('email')} error={errors.email?.message} />
            </div>
            <Input label="Position" {...register('position')} error={errors.position?.message} />
            <Input label="Years of Experience" type="number" {...register('experienceYears', { valueAsNumber: true })} />
            <Input label="Current Company" {...register('currentCompany')} />

            {/* Salary slider */}
            <div className="md:col-span-2 space-y-4 p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
              <div className="flex justify-between items-end">
                <div>
                  <label className="font-mono text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Expected Salary</label>
                  <p className="text-2xl font-black text-white mt-1">
                    {formatCurrency(formValues.expectedSalary.amount, config.currency, config.locale)}
                  </p>
                </div>
                <Badge variant={analysis.salaryStatus === 'over_budget' ? 'danger' : 'success'}>
                  {analysis.salaryNote}
                </Badge>
              </div>
              <input
                type="range"
                min={0}
                max={config.maxBudget * 2}
                step={500}
                value={formValues.expectedSalary.amount}
                onChange={(e) => setValue('expectedSalary.amount', Number(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-[var(--primary)]"
              />
              <div className="flex justify-between text-2xs text-zinc-600">
                <span>0</span>
                <span>{formatCurrency(config.maxBudget, config.currency, config.locale)}</span>
                <span>{formatCurrency(config.maxBudget * 2, config.currency, config.locale)}</span>
              </div>
            </div>
          </form>
        </Card>

        {/* Competency Scoring Grid */}
        <div className="space-y-4">
          <div className="flex items-center gap-4 px-2">
            <h3 className="font-display text-xl font-bold text-white">Neural Calibration</h3>
            <div className="h-px flex-1 bg-white/5" />
            <span className="font-mono text-[10px] text-zinc-500 uppercase">Skill Matrix</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {config.competencies.map((comp) => (
              <NeuralScoreSlider
                key={comp.id}
                competency={comp}
                value={candidateScores[comp.id] || 1}
                onChange={(val) => setCandidateScores(prev => ({ ...prev, [comp.id]: val }))}
              />
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button variant="primary" size="xl" className="flex-1" onClick={handleSubmit(onSave)}>
            Finalize Evaluation & Save
            <Kbd className="ml-2 text-[8px]">⌘S</Kbd>
          </Button>
          <Button variant="secondary" size="xl" onClick={() => { reset(); setCandidateScores({}); }}>
            Reset Form
            <Kbd className="ml-2 text-[8px]">⌘R</Kbd>
          </Button>
        </div>

        {/* Candidate List */}
        <CandidateTable
          candidates={sortedCandidates}
          onPin={handlePin}
          pinnedId={pinnedId}
          onClone={handleClone}
          onDelete={handleDelete}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filterDecision={filterDecision}
          onFilterChange={setFilterDecision}
        />
      </div>

      {/* RIGHT COLUMN: REAL-TIME ANALYTICS (5/12) */}
      <div className="xl:col-span-5 space-y-8 sticky top-24 h-fit">
        {/* Recommendation Banner */}
        <motion.div
          key={analysis.decision}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            "p-6 rounded-3xl border-2 text-center relative overflow-hidden",
            analysis.decision === 'STRONG_HIRE' ? "border-emerald-500/30 bg-emerald-500/5" :
            analysis.decision === 'HIRE' ? "border-blue-500/30 bg-blue-500/5" :
            analysis.decision === 'MAYBE' ? "border-amber-500/30 bg-amber-500/5" :
            "border-red-500/30 bg-red-500/5"
          )}
        >
          <div className="relative z-10">
            <div className="mb-4 inline-flex items-center justify-center w-20 h-20 rounded-full bg-black/40 border border-white/10 text-4xl font-black" style={{ color: analysis.color }}>
              {analysis.grade}
            </div>
            <h4 className="font-mono text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em] mb-2">Decision Engine</h4>
            <h2 className="font-display text-3xl font-black text-white leading-none mb-6">{analysis.label}</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                <p className="text-[10px] font-mono text-zinc-500 uppercase mb-1">Fitness Score</p>
                <p className="text-xl font-bold text-white">{analysis.score.toFixed(2)}</p>
              </div>
              <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                <p className="text-[10px] font-mono text-zinc-500 uppercase mb-1">Retention Est.</p>
                <p className="text-xl font-bold text-white">{analysis.retentionEstimate}%</p>
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 blur-[80px] rounded-full opacity-20" style={{ backgroundColor: analysis.color }} />
        </motion.div>

        {/* Radar Chart */}
        <Card className="p-6">
          <h4 className="font-mono text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-6 text-center">
            Multi-Dimensional Alignment
          </h4>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="#27272a" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#a1a1aa', fontSize: 10, fontWeight: 'bold' }} />
                <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fill: '#52525b', fontSize: 8 }} />
                <Radar name="Candidate" dataKey="candidate" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.3} />
                <Radar name="Benchmark" dataKey="benchmark" stroke="#ffffff" fill="#ffffff" fillOpacity={0.05} strokeDasharray="4 4" />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px' }}
                  labelStyle={{ color: '#e4e4e7' }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: config.branding.primaryColor }} />
              <span className="text-[10px] font-mono text-zinc-400">Candidate</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full border border-dashed border-white" />
              <span className="text-[10px] font-mono text-zinc-400">Benchmark</span>
            </div>
          </div>
        </Card>

        {/* Confidence & Insights */}
        <Card className="p-6">
          <h4 className="font-mono text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Evaluation Confidence</h4>
          <ProgressBar
            value={Object.keys(candidateScores).length}
            max={config.competencies.length}
            showLabel
            className="mb-6"
          />
          <Divider />
          <Alert variant={analysis.salaryStatus === 'over_budget' ? 'warning' : 'info'}>
            {analysis.salaryNote}
          </Alert>
          {analysis.decision === 'STRONG_HIRE' && (
            <Alert variant="success" className="mt-3">
              💡 This candidate exceeds benchmarks. Priority interview recommended.
            </Alert>
          )}
          {analysis.decision === 'NO_HIRE_CRITICAL' && (
            <Alert variant="error" className="mt-3">
              ⚠️ Critical competency gaps. Consider other candidates.
            </Alert>
          )}
        </Card>
      </div>
    </div>
  );
}
                  </p>
                </div>
              </Card>
            )}
          </AnimatePresence>

          {/* Radar chart */}
          <Card>
            <h3 className="font-mono text-2xs text-pulse-gold uppercase tracking-widest mb-4">
              [ Competency Radar ]
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                <PolarGrid stroke="#2A2A2A" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: '#666', fontSize: 10, fontFamily: "'DM Mono', monospace" }}
                />
                <PolarRadiusAxis domain={[0, 5]} tick={false} axisLine={false} />
                <Radar name="Ideal" dataKey="Ideal" stroke="#333" fill="#333" fillOpacity={0.15} />
                <Radar name="Candidate" dataKey="Candidate" stroke="#C8A97E" fill="#C8A97E" fillOpacity={0.25} />
                <Tooltip
                  contentStyle={{ background: '#0D0D0D', border: '1px solid #2A2A2A', borderRadius: 8, fontFamily: "'DM Mono', monospace", fontSize: 11 }}
                  labelStyle={{ color: '#888' }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </Card>

          {/* Science reference */}
          <Card>
            <h3 className="font-mono text-2xs text-pulse-gold uppercase tracking-widest mb-3">
              [ Science Reference ]
            </h3>
            <div className="space-y-2">
              {[
                { method: 'Work Sample Tests',    coef: 0.54, color: '#74C476' },
                { method: 'Structured Interview', coef: 0.51, color: '#C8A97E' },
                { method: 'Cognitive Ability',    coef: 0.51, color: '#9B8EC4' },
                { method: 'Resume Screening',     coef: 0.18, color: '#E8C35A' },
                { method: 'Yrs of Experience',    coef: 0.16, color: '#E8835A' },
              ].map((d) => (
                <div key={d.method}>
                  <div className="flex justify-between font-mono text-2xs mb-1">
                    <span className="text-pulse-text-secondary">{d.method}</span>
                    <span style={{ color: d.color }}>{d.coef}</span>
                  </div>
                  <ProgressBar value={d.coef} max={1} color={d.color} />
                </div>
              ))}
              <p className="font-mono text-2xs text-pulse-text-faint mt-2 leading-relaxed">
                Schmidt &amp; Hunter (2016) — validity coefficients
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* Shortlist table */}
      <AnimatePresence>
        {candidates.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <Divider label="Shortlist" />
            <CandidateTable
              candidates={candidates}
              onExport={() => {
                exportCandidatesCSV(candidates, config.currency);
                toast.success(t('toast.exported'));
                haptic('success');
              }}
              onClear={() => {
                useAppStore.getState().clearCandidates();
                toast.info('Shortlist cleared');
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
