import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Internal Systems
import { useAppDispatch, useAppSelector } from '@/store/reduxStore';
import { generateAISummary } from '@/store/pipelineSlice';
import { useConfig } from '@/store/appStore';
import { useHaptic, useCopyToClipboard, useKeyboardShortcuts, useLocalStorage, useToast } from '@/hooks';
import { cn, exportCsv } from '@/lib/utils';
import { 
  Card, Button, Badge, 
  Input, ProgressBar, Tooltip, Kbd, Alert
} from '@/components/ui';

// FIX 1: Buat interface khusus agar tidak pakai tipe "any"
export interface CompetencyData {
  id: string;
  label: string;
  icon?: string;
  description?: string;
  isCritical?: boolean;
  category?: string;
  greenFlags?: string[];
  redFlags?: string[];
}

// ── Configuration ─────────────────────────────────────────────────────────
const INTERVIEW_ROUNDS = [
  { id: 'r1', label: 'Screening', icon: '🔍', blindMode: true },
  { id: 'r2', label: 'Technical', icon: '🧪', blindMode: false },
  { id: 'r3', label: 'Culture Fit', icon: '🤝', blindMode: false },
];

const STORAGE_KEY = 'pulse_scorecard_drafts';

// ── UI Component: Intelligent Note Field (Enhanced) ──────────────────────
interface IntelligentNoteFieldProps {
  competency: CompetencyData; // FIX 2: Terapkan interface di sini
  score: number;
  note: string;
  onScoreChange: (score: number) => void;
  onNoteChange: (note: string) => void;
  isBlind: boolean;
}

function IntelligentNoteField({ 
  competency, 
  score, 
  note, 
  onScoreChange, 
  onNoteChange,
  isBlind 
}: IntelligentNoteFieldProps) {
  const triggerHaptic = useHaptic();

  const getRubricHint = () => {
    if (!score) return "Select a score to see behavioral indicators.";
    if (score >= 4) return `🟢 Success Signal: ${competency.greenFlags?.[0] || 'Exceeds expectations.'}`;
    if (score <= 2) return `🔴 Risk Factor: ${competency.redFlags?.[0] || 'Significant gaps detected.'}`;
    return "🟡 Baseline: Meets minimum requirements for this role.";
  };

  return (
    <div className="p-6 bg-white/[0.02] border border-white/5 rounded-[2rem] space-y-4 hover:bg-white/[0.04] transition-all">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="text-xl">{competency.icon || '📊'}</span>
          <Tooltip content={competency.description || 'Core competency for this role'}>
            <span className="font-display font-bold text-white text-sm">{competency.label}</span>
          </Tooltip>
          {competency.isCritical && <Badge variant="danger" className="text-[8px]">Critical</Badge>}
        </div>
        
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              onClick={() => { triggerHaptic('light'); onScoreChange(s); }}
              className={cn(
                "w-8 h-8 rounded-lg font-mono text-xs font-bold transition-all border",
                score === s 
                  ? "bg-[var(--primary)] border-[var(--primary)] text-black" 
                  : "bg-zinc-900 border-white/5 text-zinc-500 hover:border-white/20"
              )}
              aria-label={`Score ${s}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.p 
          key={score}
          initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
          className="text-[10px] font-mono text-zinc-500 uppercase tracking-tight"
        >
          {getRubricHint()}
        </motion.p>
      </AnimatePresence>

      <textarea
        value={note}
        onChange={(e) => onNoteChange(e.target.value)}
        placeholder={isBlind ? "Focus on behavioral evidence only (PII Masked)..." : "Enter detailed interview observations..."}
        className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-xs text-zinc-300 focus:outline-none focus:border-[var(--primary)] transition-all min-h-[80px] resize-y"
        rows={3}
      />
    </div>
  );
}

// ── Main Module ───────────────────────────────────────────────────────────
export function Scorecard() {
  const config = useConfig();
  const dispatch = useAppDispatch();
  const triggerHaptic = useHaptic();
  const toast = useToast();
  const [copied, copy] = useCopyToClipboard();

  const { aiSummary, aiSummaryStatus } = useAppSelector(s => s.pipeline);

  const [activeRound, setActiveRound] = useState('r1');
  const [isBlindActive, setIsBlindActive] = useState(true);
  
  const [evaluations, setEvaluations] = useLocalStorage<Record<string, Record<string, { score: number; note: string }>>>(
    STORAGE_KEY,
    { r1: {}, r2: {}, r3: {} }
  );

  const currentEvaluations = evaluations[activeRound] || {};
  const setCurrentEvaluations = useCallback((updater: (prev: Record<string, { score: number; note: string }>) => Record<string, { score: number; note: string }>) => {
    setEvaluations(prev => ({
      ...prev,
      [activeRound]: updater(prev[activeRound] || {})
    }));
  }, [activeRound, setEvaluations]);

  const handleScoreUpdate = useCallback((id: string, score: number) => {
    triggerHaptic('light');
    setCurrentEvaluations(prev => ({
      ...prev,
      [id]: { ...prev[id], score }
    }));
  }, [setCurrentEvaluations, triggerHaptic]);

  const handleNoteUpdate = useCallback((id: string, note: string) => {
    setCurrentEvaluations(prev => ({
      ...prev,
      [id]: { ...prev[id], note }
    }));
  }, [setCurrentEvaluations]);

  const resetCurrentRound = useCallback(() => {
    triggerHaptic('medium');
    setCurrentEvaluations(() => ({}));
    toast.info(`Reset evaluation for ${INTERVIEW_ROUNDS.find(r => r.id === activeRound)?.label} round`);
  }, [activeRound, setCurrentEvaluations, triggerHaptic, toast]);

  const completionStats = useMemo(() => {
    const total = config.competencies?.length || 0;
    const filled = Object.values(currentEvaluations).filter(e => e.score > 0).length;
    const avgNoteLength = Object.values(currentEvaluations).reduce((acc, e) => acc + (e.note?.length || 0), 0) / (filled || 1);
    const biasRisk = avgNoteLength < 50 ? 'HIGH' : avgNoteLength < 150 ? 'MEDIUM' : 'LOW';
    return { 
      pct: total ? (filled / total) * 100 : 0, 
      isReady: total > 0 && filled === total,
      biasRisk,
      filledCount: filled,
      totalCount: total
    };
  }, [currentEvaluations, config.competencies]);

  const generateBlindMask = useCallback((val: string) => {
    if (!isBlindActive || !val) return val;
    return `[RESTRICTED_DATA_${val.length}]`;
  }, [isBlindActive]);

  const triggerAISynthesis = useCallback(() => {
    if (!completionStats.isReady) {
      toast.warning(`Please score all ${completionStats.totalCount} competencies before generating AI summary.`);
      triggerHaptic('error');
      return;
    }
    triggerHaptic('medium');
    const candidateName = "Alex Riviera";
    const notesSummary = Object.entries(currentEvaluations)
      .map(([id, data]) => {
        const compLabel = config.competencies?.find((c: CompetencyData) => c.id === id)?.label || id;
        return `${compLabel}: Score ${data.score} - ${data.note?.slice(0, 100) || ''}`;
      })
      .join('\n');
      
    dispatch(generateAISummary({
      candidate: candidateName,
      round: activeRound,
      notes: notesSummary
    }));
  }, [completionStats.isReady, completionStats.totalCount, currentEvaluations, config.competencies, activeRound, dispatch, toast, triggerHaptic]);

  const exportToCSV = useCallback(() => {
    if (!config.competencies) return;
    const rows = config.competencies.map((comp: CompetencyData) => ({
      Competency: comp.label,
      Score: currentEvaluations[comp.id]?.score || 0,
      Notes: currentEvaluations[comp.id]?.note || '',
      Critical: comp.isCritical ? 'Yes' : 'No',
      Category: comp.category || '',
    }));
    const csvContent = exportCsv(rows, `scorecard_${activeRound}_${Date.now()}.csv`);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scorecard_${activeRound}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Scorecard exported to CSV');
    triggerHaptic('success');
  }, [config.competencies, currentEvaluations, activeRound, toast, triggerHaptic]);

  useKeyboardShortcuts({
    s: () => toast.info('Draft auto-saved (localStorage)'),
    Enter: () => { if (completionStats.isReady) triggerAISynthesis(); },
  }, { ctrl: true });

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 pb-32">
      <div className="xl:col-span-7 space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div className="space-y-1">
            <Badge variant="gold">Interview Module</Badge>
            <h2 className="font-display text-3xl font-black text-white tracking-tight">Objectivity Suite</h2>
            <p className="text-xs text-zinc-500">Structured scoring with bias mitigation & AI synthesis</p>
          </div>
          
          <div className="flex items-center gap-2 bg-white/5 p-1 rounded-2xl border border-white/5">
            {INTERVIEW_ROUNDS.map(round => (
              <button
                key={round.id}
                onClick={() => { triggerHaptic('light'); setActiveRound(round.id); }}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                  activeRound === round.id ? "bg-[var(--primary)] text-black shadow-lg" : "text-zinc-500 hover:text-white"
                )}
              >
                {round.icon} {round.label}
              </button>
            ))}
          </div>
        </div>

        <Card className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4">
            <button 
              onClick={() => { setIsBlindActive(!isBlindActive); triggerHaptic('light'); }}
              className={cn(
                "flex items-center gap-2 px-3 py-1 rounded-full border text-[9px] font-bold uppercase tracking-tighter transition-all",
                isBlindActive ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500" : "bg-white/5 border-white/10 text-zinc-500"
              )}
            >
              {isBlindActive ? '🔒 Blind Mode Active' : '🔓 Identity Exposed'}
            </button>
          </div>

          <div className="space-y-4">
            <Input label="Target Talent" value={generateBlindMask("Alex Riviera")} readOnly className="opacity-80" />
            <Input label="Previous Tenure" value={generateBlindMask("Senior AI Architect @ Meta")} readOnly className="opacity-80" />
          </div>
          <div className="space-y-4">
            <Input label="Educational Pedigree" value={generateBlindMask("Stanford University")} readOnly className="opacity-80" />
            <div className="p-4 bg-zinc-900 rounded-2xl border border-white/5">
              <p className="text-[9px] font-mono text-zinc-500 uppercase mb-2">Bias Protection</p>
              <p className="text-[11px] text-zinc-400 italic leading-relaxed">
                PII Masking is enforced to prevent halo effects from prestigious institutions or previous employers.
              </p>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          {config.competencies?.map((comp: CompetencyData) => (
            <IntelligentNoteField
              key={comp.id}
              competency={comp}
              score={currentEvaluations[comp.id]?.score || 0}
              note={currentEvaluations[comp.id]?.note || ""}
              onScoreChange={(s) => handleScoreUpdate(comp.id, s)}
              onNoteChange={(n) => handleNoteUpdate(comp.id, n)}
              isBlind={isBlindActive}
            />
          ))}
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" onClick={resetCurrentRound} className="flex-1">
            ↺ Reset {INTERVIEW_ROUNDS.find(r => r.id === activeRound)?.label} Round
          </Button>
          <Tooltip content="Export current round to CSV">
            <Button variant="glass" onClick={exportToCSV}>
              📥 Export CSV
            </Button>
          </Tooltip>
        </div>
      </div>

      <div className="xl:col-span-5 space-y-8 sticky top-24 h-fit">
        <Card className="p-8 space-y-6">
          <h3 className="font-mono text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-center">Evaluation Health Monitor</h3>
          
          <div className="space-y-4">
            <div className="flex justify-between text-[11px] font-bold uppercase">
              <span className="text-zinc-400">Score Completion</span>
              <span className="text-white">{completionStats.pct.toFixed(0)}%</span>
            </div>
            <ProgressBar value={completionStats.pct} color={config.branding?.primaryColor} />
            
            <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
              <div className="space-y-1">
                <p className="text-[9px] font-mono text-zinc-500 uppercase">Bias Risk Index</p>
                <p className={cn(
                  "text-sm font-black",
                  completionStats.biasRisk === 'LOW' ? "text-emerald-500" : completionStats.biasRisk === 'MEDIUM' ? "text-amber-500" : "text-red-500"
                )}>
                  {completionStats.biasRisk} RISK
                </p>
              </div>
              <div className="w-10 h-10 rounded-full border-2 border-zinc-800 flex items-center justify-center">
                <span className="text-lg">⚖️</span>
              </div>
            </div>
            {completionStats.biasRisk !== 'LOW' && (
              <Alert variant="warning" className="text-2xs">
                Add more detailed notes to reduce bias risk. Aim for at least 50 characters per competency.
              </Alert>
            )}
          </div>

          <p className="text-[11px] text-zinc-500 leading-relaxed text-center italic">
            &quot;Shorter notes indicate higher probability of intuitive bias. Objective evaluation requires evidence-backed observations.&quot;
          </p>
        </Card>

        <Card className="p-8 space-y-6 border-[var(--primary)]/20 bg-[var(--primary)]/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--primary)] to-transparent opacity-30" />
          
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-display text-lg font-bold text-white tracking-tight">AI Executive Synthesis</h3>
              <p className="text-[10px] font-mono text-zinc-500 uppercase mt-1">Hiring Committee Briefing</p>
            </div>
            <Badge variant={aiSummaryStatus === 'success' ? 'success' : aiSummaryStatus === 'loading' ? 'gold' : 'default'}>
              {aiSummaryStatus === 'loading' ? 'Processing...' : aiSummaryStatus === 'success' ? 'Ready' : 'Idle'}
            </Badge>
          </div>

          <div className="min-h-[220px] p-6 bg-black/40 border border-white/5 rounded-3xl relative">
            <AnimatePresence mode="wait">
              {aiSummaryStatus === 'loading' ? (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-full space-y-4 py-8">
                  <div className="w-10 h-10 border-2 border-dashed border-white/20 rounded-full animate-spin" />
                  <p className="text-[10px] font-mono text-zinc-500 uppercase">Analyzing responses...</p>
                </motion.div>
              ) : aiSummaryStatus === 'success' ? (
                <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <p className="text-xs text-zinc-300 leading-relaxed font-serif italic">
                    {aiSummary || "Candidate shows strong alignment in technical areas but requires calibration on leadership competencies."}
                  </p>
                  <div className="flex gap-2">
                    {/* FIX 3: Pastikan aiSummary tidak melempar null ke clipboard */}
                    <Button variant="ghost" size="sm" onClick={() => copy(aiSummary || '')}>
                      {copied ? '✓ Copied!' : '📋 Copy for Email'}
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-full text-center space-y-4 py-12">
                  <div className="w-12 h-12 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center">
                    <span className="text-xl">✨</span>
                  </div>
                  <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
                    Complete all scores & generate brief
                  </p>
                  <Kbd className="text-[8px]">Ctrl+Enter</Kbd>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Button 
            variant="primary" 
            className="w-full" 
            disabled={!completionStats.isReady || aiSummaryStatus === 'loading'}
            onClick={triggerAISynthesis}
          >
            {aiSummaryStatus === 'loading' ? 'Generating...' : '✦ Generate Synthesis Brief'}
            {!completionStats.isReady && completionStats.totalCount > 0 && (
              <span className="ml-2 text-2xs opacity-70">({completionStats.filledCount}/{completionStats.totalCount})</span>
            )}
          </Button>
        </Card>

        <div className="flex gap-4">
          <Button variant="secondary" className="flex-1" onClick={() => window.print()}>
            🖨 Print Scorecard
          </Button>
          <Button variant="secondary" className="flex-1" onClick={exportToCSV}>
            📄 Export to CSV
          </Button>
        </div>

        <div className="text-center text-2xs text-zinc-600">
          Auto-saved to browser storage
        </div>
      </div>
    </div>
  );
}
