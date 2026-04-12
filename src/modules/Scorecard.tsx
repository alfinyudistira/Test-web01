/* ═══════════════════════════════════════════════════════════════════════════
   PULSE OBJECTIVITY SUITE — MODULE 04: STRUCTURED SCORECARD (ENTERPRISE)
   Bias Mitigation | Blind Screening | AI Synthesis | Persistent Drafts
   ═══════════════════════════════════════════════════════════════════════════ */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

// Internal Systems
import { useAppDispatch, useAppSelector } from '@/store/reduxstore';
import { generateAISummary, clearAISummary } from '@/store/pipelineSlice';
import { useAppStore, useConfig } from '@/store/appStore';
import { useHaptic, useCopyToClipboard, useTransition, useKeyboardShortcuts, useLocalStorage, useToast } from '@/hooks';
import { cn, formatters, uid, exportCsv } from '@/lib/utils';
import { 
  Card, Button, Badge, Divider, 
  ScoreChip, Input, ProgressBar, Tooltip, Kbd, Alert
} from '@/components/ui';

// ── Configuration ─────────────────────────────────────────────────────────
const INTERVIEW_ROUNDS = [
  { id: 'r1', label: 'Screening', icon: '🔍', blindMode: true },
  { id: 'r2', label: 'Technical', icon: '🧪', blindMode: false },
  { id: 'r3', label: 'Culture Fit', icon: '🤝', blindMode: false },
];

// Key untuk localStorage
const STORAGE_KEY = 'pulse_scorecard_drafts';

// ── UI Component: Intelligent Note Field (Enhanced) ──────────────────────
interface IntelligentNoteFieldProps {
  competency: any;
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
        
        {/* Score Selector Pins */}
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
  const { t } = useTranslation();
  const config = useConfig();
  const dispatch = useAppDispatch();
  const triggerHaptic = useHaptic();
  const toast = useToast();
  const [copied, copy] = useCopyToClipboard();

  // Redux AI State
  const { aiSummary, aiSummaryStatus } = useAppSelector(s => s.pipeline);

  // Local UI State
  const [activeRound, setActiveRound] = useState('r1');
  const [isBlindActive, setIsBlindActive] = useState(true);
  
  // Persist evaluasi per round (dengan localStorage)
  const [evaluations, setEvaluations] = useLocalStorage<Record<string, Record<string, { score: number; note: string }>>>(
    STORAGE_KEY,
    { r1: {}, r2: {}, r3: {} }
  );

  // Evaluasi untuk round aktif
  const currentEvaluations = evaluations[activeRound] || {};
  const setCurrentEvaluations = useCallback((updater: (prev: Record<string, { score: number; note: string }>) => Record<string, { score: number; note: string }>) => {
    setEvaluations(prev => ({
      ...prev,
      [activeRound]: updater(prev[activeRound] || {})
    }));
  }, [activeRound, setEvaluations]);

  // ── Handlers untuk skor dan catatan ──
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

  // Reset evaluasi untuk round aktif
  const resetCurrentRound = useCallback(() => {
    triggerHaptic('medium');
    setCurrentEvaluations(() => ({}));
    toast.info(`Reset evaluation for ${INTERVIEW_ROUNDS.find(r => r.id === activeRound)?.label} round`);
  }, [activeRound, setCurrentEvaluations, triggerHaptic, toast]);

  // ── Completion Statistics ──
  const completionStats = useMemo(() => {
    const total = config.competencies.length;
    const filled = Object.values(currentEvaluations).filter(e => e.score > 0).length;
    const avgNoteLength = Object.values(currentEvaluations).reduce((acc, e) => acc + (e.note?.length || 0), 0) / (filled || 1);
    const biasRisk = avgNoteLength < 50 ? 'HIGH' : avgNoteLength < 150 ? 'MEDIUM' : 'LOW';
    return { 
      pct: total ? (filled / total) * 100 : 0, 
      isReady: filled === total,
      biasRisk,
      filledCount: filled,
      totalCount: total
    };
  }, [currentEvaluations, config.competencies]);

  // ── Blind Mask Helper ──
  const generateBlindMask = useCallback((val: string) => {
    if (!isBlindActive || !val) return val;
    return `[RESTRICTED_DATA_${val.length}]`;
  }, [isBlindActive]);

  // ── AI Synthesis Trigger ──
  const triggerAISynthesis = useCallback(() => {
    if (!completionStats.isReady) {
      toast.warning(`Please score all ${completionStats.totalCount} competencies before generating AI summary.`);
      triggerHaptic('error');
      return;
    }
    triggerHaptic('medium');
    // Simulasi data kandidat (bisa diambil dari store global)
    const candidateName = "Alex Riviera";
    const notesSummary = Object.entries(currentEvaluations)
      .map(([id, data]) => `${config.competencies.find(c => c.id === id)?.label}: Score ${data.score} - ${data.note?.slice(0, 100)}`)
      .join('\n');
    dispatch(generateAISummary({
      candidate: candidateName,
      round: activeRound,
      notes: notesSummary
    }));
  }, [completionStats.isReady, completionStats.totalCount, currentEvaluations, config.competencies, activeRound, dispatch, toast, triggerHaptic]);

  // ── Export to CSV ──
  const exportToCSV = useCallback(() => {
    const rows = config.competencies.map(comp => ({
      Competency: comp.label,
      Score: currentEvaluations[comp.id]?.score || 0,
      Notes: currentEvaluations[comp.id]?.note || '',
      Critical: comp.isCritical ? 'Yes' : 'No',
      Category: comp.category,
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

  // ── Keyboard Shortcuts ──
  useKeyboardShortcuts({
    s: () => toast.info('Draft auto-saved (localStorage)'),
    Enter: () => { if (completionStats.isReady) triggerAISynthesis(); },
  }, { ctrl: true });

  // Simpan ke localStorage sudah otomatis via useLocalStorage

  // ── Render Blind Mode Toggle ──
  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 pb-32">
      
      {/* ── Left Column: Active Scorecard (7/12) ── */}
      <div className="xl:col-span-7 space-y-8">
        
        {/* Module Header & Round Switcher */}
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

        {/* Candidate Context (Blind-ready) */}
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

        {/* Dynamic Evaluation List */}
        <div className="space-y-4">
          {config.competencies.map(comp => (
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

        {/* Round Actions */}
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

      {/* ── Right Column: Synthesis & Compliance (5/12) ── */}
      <div className="xl:col-span-5 space-y-8 sticky top-24 h-fit">
        
        {/* Compliance & Bias Monitor */}
        <Card className="p-8 space-y-6">
          <h3 className="font-mono text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-center">Evaluation Health Monitor</h3>
          
          <div className="space-y-4">
            <div className="flex justify-between text-[11px] font-bold uppercase">
              <span className="text-zinc-400">Score Completion</span>
              <span className="text-white">{completionStats.pct.toFixed(0)}%</span>
            </div>
            <ProgressBar value={completionStats.pct} color={config.branding.primaryColor} />
            
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

        {/* AI Executive Synthesis */}
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
                    <Button variant="ghost" size="sm" onClick={() => copy(aiSummary)}>
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

        {/* Print & Export Actions */}
        <div className="flex gap-4">
          <Button variant="secondary" className="flex-1" onClick={() => window.print()}>
            🖨 Print Scorecard
          </Button>
          <Button variant="secondary" className="flex-1" onClick={exportToCSV}>
            📄 Export to CSV
          </Button>
        </div>

        {/* Draft saved indicator */}
        <div className="text-center text-2xs text-zinc-600">
          Auto-saved to browser storage
        </div>
      </div>
    </div>
  );
}     <label htmlFor={`sc-${field}`} className="block font-mono text-2xs text-pulse-text-faint uppercase tracking-widest mb-1.5">
                    {label}
                  </label>
                  <input
                    id={`sc-${field}`}
                    {...form.register(field)}
                    disabled={isBlindMode && canUseBlind && (field === 'university' || field === 'prevCompany')}
                    placeholder={placeholder}
                    className={cn(
                      'w-full border rounded px-3 py-2.5 font-sans text-sm focus:outline-none transition-colors',
                      isBlindMode && canUseBlind && (field === 'university' || field === 'prevCompany')
                        ? 'bg-pulse-mint/10 border-pulse-mint/30 text-pulse-mint cursor-not-allowed'
                        : 'bg-pulse-elevated border-pulse-border text-pulse-text-primary focus:border-pulse-gold'
                    )}
                  />
                </div>
              ))}
            </div>
          </Card>

          {/* Hard competency scoring */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-mono text-xs text-pulse-gold uppercase tracking-widest">
                [ Core Competency Scoring ]
              </h3>
              <ScoreSummaryRing
                filled={filledCount}
                total={hardComps.length}
                color={filledCount === hardComps.length ? '#74C476' : '#C8A97E'}
              />
            </div>
            <div className="space-y-3">
              {hardComps.map((c) => (
                <NoteField
                  key={c.id}
                  compId={c.id}
                  label={c.label}
                  icon={c.icon}
                  color={c.color}
                  note={notes[c.id] ?? ''}
                  score={scores[c.id]}
                  onNoteChange={handleNoteChange}
                  onScoreChange={handleScoreChange}
                  rubric={getRubricContent(c.id, scores[c.id], config)}
                  isBlind={isBlindMode && canUseBlind}
                />
              ))}
            </div>
          </Card>

          {/* Soft skills */}
          <Card>
            <h3 className="font-mono text-xs text-pulse-gold uppercase tracking-widest mb-4">
              [ Culture & Soft Skills ]
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {softComps.map((c) => (
                <NoteField
                  key={c.id}
                  compId={c.id}
                  label={c.label}
                  icon={c.icon}
                  color={c.color}
                  note={notes[c.id] ?? ''}
                  score={scores[c.id]}
                  onNoteChange={handleNoteChange}
                  onScoreChange={handleScoreChange}
                  rubric={getRubricContent(c.id, scores[c.id], config)}
                  isBlind={false}
                />
              ))}
            </div>
          </Card>
        </div>

        {/* ── Right: Summary + AI ── */}
        <div className="space-y-5">
          {/* Score summary */}
          <Card>
            <h3 className="font-mono text-xs text-pulse-gold uppercase tracking-widest mb-4">
              [ Live Score Summary ]
            </h3>
            <div className="space-y-2">
              {hardComps.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-2">
                  <span className="font-sans text-xs text-pulse-text-secondary truncate">{c.short}</span>
                  <div className="flex items-center gap-2">
                    {c.critical && <span className="w-1.5 h-1.5 rounded-full bg-pulse-coral" title="Critical" />}
                    <span
                      className="font-mono text-xs font-bold w-6 text-right"
                      style={{ color: scores[c.id] >= 4 ? '#74C476' : scores[c.id] <= 2 ? '#E8835A' : '#C8A97E' }}
                    >
                      {scores[c.id] ?? '—'}
                    </span>
                    <span className="font-mono text-2xs text-pulse-text-faint">/5</span>
                  </div>
                </div>
              ))}
            </div>

            <Divider className="my-3" />

            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-pulse-text-faint uppercase">Weighted Score</span>
              <span className="font-display text-2xl font-bold text-pulse-gold">
                {allFilled ? weightedScore.toFixed(2) : '—'}
              </span>
            </div>

            {/* Decision */}
            <AnimatePresence>
              {decisionBanner && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-3 p-3 rounded border text-center"
                  style={{ borderColor: `${decisionBanner.color}40`, background: `${decisionBanner.color}10` }}
                  role="status"
                  aria-live="polite"
                >
                  <p className="font-mono text-xs font-bold" style={{ color: decisionBanner.color }}>
                    {decisionBanner.label}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>

          {/* AI Summary */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-mono text-xs text-pulse-gold uppercase tracking-widest">
                [ AI Summary ]
              </h3>
              <Badge variant={aiSummaryStatus === 'success' ? 'success' : 'default'}>
                {aiSummaryStatus === 'loading' ? 'Generating…' : aiSummaryStatus === 'success' ? 'Ready' : 'AI'}
              </Badge>
            </div>

            <Button
              variant={allFilled ? 'primary' : 'secondary'}
              size="sm"
              className="w-full mb-3"
              onClick={handleGenerateSummary}
              disabled={!allFilled || aiSummaryStatus === 'loading'}
              loading={aiSummaryStatus === 'loading'}
              aria-label="Generate AI summary"
            >
              {aiSummaryStatus === 'loading' ? 'Generating…' : '✦ Generate AI Summary'}
            </Button>

            {!allFilled && (
              <p className="font-mono text-2xs text-pulse-text-faint text-center">
                Score all {hardComps.length} competencies to unlock
              </p>
            )}

            <AnimatePresence>
              {aiSummaryStatus === 'error' && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="font-mono text-2xs text-pulse-coral mt-2"
                  role="alert"
                >
                  {aiSummaryError ?? 'Error generating summary. Check API connection.'}
                </motion.p>
              )}

              {aiSummaryStatus === 'success' && aiSummary && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 p-3 bg-pulse-surface rounded border border-pulse-border space-y-3"
                >
                  <p className="font-sans text-xs text-pulse-text-secondary leading-relaxed">
                    {aiSummary}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => { copyToClipboard(aiSummary); haptic('light'); toast.success(t('toast.copied')); }}
                    >
                      {copied ? '✓ Copied' : '📋 Copy'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => dispatch(clearAISummary())}
                    >
                      ✕ Clear
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>

          {/* Bias checklist */}
          <Card>
            <h3 className="font-mono text-xs text-pulse-gold uppercase tracking-widest mb-3">
              [ Bias Mitigation Checklist ]
            </h3>
            <div className="space-y-2">
              {[
                { label: 'Score independently before group discussion', done: true },
                { label: 'Use evidence, not impressions, in notes', done: Object.values(notes).some((n) => n.length > 20) },
                { label: 'Critical hurdles applied consistently', done: true },
                { label: 'Blind mode active for Round 1', done: isBlindMode && canUseBlind },
                { label: 'All competencies scored before deciding', done: allFilled },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className={cn('flex-shrink-0 w-4 h-4 rounded border mt-0.5 flex items-center justify-center text-2xs',
                    item.done ? 'border-pulse-mint bg-pulse-mint/20 text-pulse-mint' : 'border-pulse-border text-pulse-text-faint'
                  )}>
                    {item.done ? '✓' : ''}
                  </span>
                  <span className={cn('font-sans text-xs leading-relaxed', item.done ? 'text-pulse-text-secondary' : 'text-pulse-text-faint')}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}
