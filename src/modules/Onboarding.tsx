// ═══════════════════════════════════════════════════════════════════════════
// ONBOARDING MODULE — 30/60/90 Day Tracker
// Interactive checklist, SVG timeline, milestone celebrations,
// progress rings, day-counter, idb persistence, printable plan
// ═══════════════════════════════════════════════════════════════════════════
import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useConfig, useAppStore } from '@/store/appStore';
import { idbGetOnboarding, idbSetOnboarding } from '@/lib/idb';
import { useHaptic } from '@/hooks';
import { cn, formatDate } from '@/lib/utils';
import { Card, Button, Badge, Divider, SVGDefs, Modal } from '@/components/ui';
import { useToast } from '@/components/Toast';
import type { OnboardingWeek, OnboardingItem } from '@/types';

// ── Derived progress helpers ──────────────────────────────────────────────
function weekProgress(week: OnboardingWeek, checked: Record<string, boolean>) {
  if (!week.items.length) return 0;
  const done = week.items.filter((i) => checked[i.id]).length;
  return Math.round((done / week.items.length) * 100);
}

function totalProgress(weeks: OnboardingWeek[], checked: Record<string, boolean>) {
  const all  = weeks.flatMap((w) => w.items);
  if (!all.length) return 0;
  const done = all.filter((i) => checked[i.id]).length;
  return { done, total: all.length, pct: Math.round((done / all.length) * 100) };
}

// ── SVG Progress ring ─────────────────────────────────────────────────────
function ProgressRing({ pct, color, size = 80, stroke = 7 }: { pct: number; color: string; size?: number; stroke?: number }) {
  const r     = (size - stroke * 2) / 2;
  const cx    = size / 2;
  const circ  = 2 * Math.PI * r;
  const dash  = (pct / 100) * circ;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      aria-label={`Progress: ${pct}%`} role="img">
      <defs>
        <filter id={`ring-glow-${color.replace('#', '')}`}>
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor={color} floodOpacity="0.5" />
        </filter>
      </defs>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="#1E1E1E" strokeWidth={stroke} />
      <motion.circle
        cx={cx} cy={cx} r={r}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeLinecap="round"
        strokeDashoffset={circ / 4}  // start at top
        initial={{ strokeDasharray: `0 ${circ}` }}
        animate={{ strokeDasharray: `${dash} ${circ - dash}` }}
        transition={{ duration: 1.0, ease: 'easeOut' }}
        filter={`url(#ring-glow-${color.replace('#', '')})`}
      />
      <text x={cx} y={cx + 5} textAnchor="middle" fill={color}
        fontSize={size > 60 ? '16' : '12'} fontWeight="700" fontFamily="'Playfair Display', serif">
        {pct}%
      </text>
    </svg>
  );
}

// ── Day counter badge ─────────────────────────────────────────────────────
function DayCounterBadge({ startDate }: { startDate: string | null }) {
  const days = useMemo(() => {
    if (!startDate) return null;
    const diff = Math.floor((Date.now() - new Date(startDate).getTime()) / 86_400_000);
    return Math.max(0, diff);
  }, [startDate]);

  if (days === null) return null;

  const phase = days < 30 ? { label: '30-Day Phase', color: '#C8A97E' }
    : days < 60 ? { label: '60-Day Phase', color: '#7EB5A6' }
    : days < 90 ? { label: '90-Day Phase', color: '#9B8EC4' }
    : { label: 'Post-Onboarding', color: '#74C476' };

  return (
    <div className="flex items-center gap-3 p-4 bg-pulse-elevated border rounded-xl" style={{ borderColor: `${phase.color}40` }}>
      <div className="text-center">
        <p className="font-display text-4xl font-bold" style={{ color: phase.color }}>{days}</p>
        <p className="font-mono text-2xs text-pulse-text-faint">days since start</p>
      </div>
      <div>
        <Badge style={{ borderColor: `${phase.color}40`, color: phase.color, background: `${phase.color}15` } as React.CSSProperties}>
          {phase.label}
        </Badge>
        <p className="font-mono text-2xs text-pulse-text-faint mt-1">
          Started {formatDate(startDate, 'en-US')}
        </p>
      </div>
    </div>
  );
}

// ── Item checklist ────────────────────────────────────────────────────────
interface CheckItemProps {
  item: OnboardingItem;
  checked: boolean;
  onToggle: (id: string) => void;
  weekColor: string;
  currentDay: number | null;
}

function CheckItem({ item, checked, onToggle, weekColor, currentDay }: CheckItemProps) {
  const haptic = useHaptic();
  const isDue  = currentDay !== null && item.dueDay !== undefined && currentDay >= item.dueDay;
  const isLate = isDue && !checked;

  return (
    <motion.div
      layout
      whileHover={{ x: 2 }}
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border transition-all duration-200 cursor-pointer group',
        checked
          ? 'border-pulse-border/30 bg-pulse-surface/50 opacity-75'
          : isLate
          ? 'border-pulse-coral/30 bg-pulse-coral/5'
          : 'border-pulse-border hover:border-pulse-muted bg-pulse-elevated'
      )}
      onClick={() => { haptic('light'); onToggle(item.id); }}
      role="checkbox"
      aria-checked={checked}
      tabIndex={0}
      onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && onToggle(item.id)}
    >
      {/* Checkbox */}
      <motion.div
        className={cn(
          'flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 transition-all duration-200'
        )}
        style={{
          borderColor: checked ? weekColor : isLate ? '#E8835A' : '#2A2A2A',
          background:  checked ? weekColor : 'transparent',
        }}
        whileTap={{ scale: 0.9 }}
      >
        <AnimatePresence>
          {checked && (
            <motion.svg
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              width="10" height="8" viewBox="0 0 10 8" fill="none"
            >
              <path d="M1 4l3 3 5-6" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </motion.svg>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          'font-sans text-sm leading-snug transition-all duration-200',
          checked ? 'line-through text-pulse-text-faint' : 'text-pulse-text-primary'
        )}>
          {item.text}
        </p>
        {item.dueDay !== undefined && (
          <p className={cn('font-mono text-2xs mt-0.5', isLate && !checked ? 'text-pulse-coral' : 'text-pulse-text-faint')}>
            {isLate && !checked ? '⚠ Overdue — ' : ''}Day {item.dueDay}
          </p>
        )}
      </div>

      {/* Late badge */}
      {isLate && !checked && (
        <Badge variant="danger" className="flex-shrink-0 text-2xs">Late</Badge>
      )}
    </motion.div>
  );
}

// ── Week card ─────────────────────────────────────────────────────────────
interface WeekCardProps {
  week: OnboardingWeek;
  checked: Record<string, boolean>;
  onToggle: (id: string) => void;
  currentDay: number | null;
  isExpanded: boolean;
  onExpandToggle: () => void;
}

function WeekCard({ week, checked, onToggle, currentDay, isExpanded, onExpandToggle }: WeekCardProps) {
  const pct  = weekProgress(week, checked);
  const done = week.items.filter((i) => checked[i.id]).length;
  const isComplete = pct === 100;

  return (
    <motion.div layout className="rounded-xl border overflow-hidden" style={{ borderColor: isComplete ? `${week.color}50` : '#1E1E1E' }}>
      {/* Week header — clickable */}
      <button
        onClick={onExpandToggle}
        className={cn(
          'w-full flex items-center gap-4 p-4 transition-all duration-200 text-left',
          isComplete ? 'bg-pulse-surface' : 'bg-pulse-elevated hover:bg-pulse-surface/80'
        )}
        aria-expanded={isExpanded}
        aria-controls={`week-${week.id}`}
      >
        {/* Ring */}
        <ProgressRing pct={pct} color={week.color} size={60} stroke={5} />

        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-display text-base font-bold" style={{ color: week.color }}>{week.week}</p>
            {isComplete && <Badge variant="success">✓ Complete</Badge>}
          </div>
          <p className="font-sans text-sm text-pulse-text-secondary">{week.theme}</p>
          <p className="font-mono text-2xs text-pulse-text-faint mt-0.5">
            {done}/{week.items.length} tasks · {pct}%
          </p>
        </div>

        {/* Expand arrow */}
        <motion.span
          animate={{ rotate: isExpanded ? 180 : 0 }}
          className="text-pulse-text-faint flex-shrink-0 text-sm"
          aria-hidden="true"
        >
          ▼
        </motion.span>
      </button>

      {/* Items */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            id={`week-${week.id}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 space-y-2 border-t border-pulse-border">
              {week.items.map((item) => (
                <CheckItem
                  key={item.id}
                  item={item}
                  checked={!!checked[item.id]}
                  onToggle={onToggle}
                  weekColor={week.color}
                  currentDay={currentDay}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── SVG Timeline ──────────────────────────────────────────────────────────
function OnboardingTimeline({ weeks, checked, currentDay }: {
  weeks: OnboardingWeek[];
  checked: Record<string, boolean>;
  currentDay: number | null;
}) {
  const MILESTONES = [
    { day: 1,  label: 'Day 1',    icon: '🚀' },
    { day: 7,  label: 'Week 1',   icon: '📅' },
    { day: 14, label: 'Week 2',   icon: '📈' },
    { day: 21, label: 'Week 3',   icon: '⚡' },
    { day: 30, label: '30-Day',   icon: '🎯' },
    { day: 60, label: '60-Day',   icon: '💡' },
    { day: 90, label: '90-Day',   icon: '🏆' },
  ];

  const maxDay = 90;
  const w = 700;

  return (
    <Card>
      <h3 className="font-mono text-xs text-pulse-gold uppercase tracking-widest mb-4">
        [ Onboarding Timeline — Day 1 to 90 ]
      </h3>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${w} 100`} className="w-full min-w-[500px]" aria-label="Onboarding timeline" role="img">
          {/* Track */}
          <line x1="30" y1="50" x2={w - 30} y2="50" stroke="#1E1E1E" strokeWidth="3" strokeLinecap="round" />

          {/* Progress fill */}
          {currentDay !== null && (
            <motion.line
              x1="30" y1="50"
              x2={30 + (Math.min(currentDay, maxDay) / maxDay) * (w - 60)}
              y2="50"
              stroke="#C8A97E"
              strokeWidth="3"
              strokeLinecap="round"
              initial={{ x2: 30 }}
              animate={{ x2: 30 + (Math.min(currentDay, maxDay) / maxDay) * (w - 60) }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
            />
          )}

          {/* Milestones */}
          {MILESTONES.map((m) => {
            const x    = 30 + (m.day / maxDay) * (w - 60);
            const isPast = currentDay !== null && currentDay >= m.day;
            const isCurr = currentDay !== null && Math.abs(currentDay - m.day) <= 3;
            return (
              <g key={m.day}>
                <motion.circle
                  cx={x} cy={50} r={isCurr ? 12 : 8}
                  fill={isPast ? '#C8A97E' : '#1E1E1E'}
                  stroke={isPast ? '#C8A97E' : '#2A2A2A'}
                  strokeWidth="2"
                  animate={{ r: isCurr ? 12 : 8 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                />
                <text x={x} y={54} textAnchor="middle" fill={isPast ? '#000' : '#444'}
                  fontSize="8" fontFamily="'DM Mono', monospace">{m.day}</text>
                <text x={x} y={30} textAnchor="middle" fill={isPast ? '#C8A97E' : '#444'} fontSize="14">{m.icon}</text>
                <text x={x} y={78} textAnchor="middle" fill={isPast ? '#888' : '#333'}
                  fontSize="8" fontFamily="'DM Mono', monospace">{m.label}</text>
              </g>
            );
          })}

          {/* Today marker */}
          {currentDay !== null && currentDay <= maxDay && (
            <g transform={`translate(${30 + (currentDay / maxDay) * (w - 60)}, 50)`}>
              <circle r="5" fill="#74C476" />
              <line y1="-22" y2="-8" stroke="#74C476" strokeWidth="2" />
              <text y="-26" textAnchor="middle" fill="#74C476" fontSize="8" fontFamily="'DM Mono', monospace">TODAY</text>
            </g>
          )}
        </svg>
      </div>
    </Card>
  );
}

// ── Add custom item modal ─────────────────────────────────────────────────
function AddItemModal({
  weeks,
  onAdd,
  onClose,
}: {
  weeks: OnboardingWeek[];
  onAdd: (weekId: string, text: string, dueDay?: number) => void;
  onClose: () => void;
}) {
  const [weekId, setWeekId]  = useState(weeks[0]?.id ?? '');
  const [text,   setText]    = useState('');
  const [dueDay, setDueDay]  = useState('');
  const haptic = useHaptic();

  const handleSubmit = () => {
    if (!text.trim()) return;
    onAdd(weekId, text.trim(), dueDay ? parseInt(dueDay) : undefined);
    haptic('success');
    onClose();
  };

  return (
    <Modal open onClose={onClose} title="Add Custom Onboarding Task" size="sm">
      <div className="space-y-4">
        <div>
          <label className="block font-mono text-2xs text-pulse-text-faint uppercase tracking-widest mb-1.5">Week / Phase</label>
          <select
            value={weekId}
            onChange={(e) => setWeekId(e.target.value)}
            className="w-full bg-pulse-elevated border border-pulse-border rounded px-3 py-2.5 font-mono text-sm text-pulse-text-primary focus:outline-none focus:border-pulse-gold"
          >
            {weeks.map((w) => <option key={w.id} value={w.id}>{w.week} — {w.theme}</option>)}
          </select>
        </div>
        <div>
          <label className="block font-mono text-2xs text-pulse-text-faint uppercase tracking-widest mb-1.5">Task Description *</label>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. Shadow senior designer for a day"
            className="w-full bg-pulse-elevated border border-pulse-border rounded px-3 py-2.5 font-sans text-sm text-pulse-text-primary focus:outline-none focus:border-pulse-gold"
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
        </div>
        <div>
          <label className="block font-mono text-2xs text-pulse-text-faint uppercase tracking-widest mb-1.5">Due Day (optional)</label>
          <input
            type="number"
            min={1} max={90}
            value={dueDay}
            onChange={(e) => setDueDay(e.target.value)}
            placeholder="e.g. 14"
            className="w-full bg-pulse-elevated border border-pulse-border rounded px-3 py-2.5 font-mono text-sm text-pulse-text-primary focus:outline-none focus:border-pulse-gold"
          />
        </div>
        <Button variant="primary" size="md" className="w-full" onClick={handleSubmit} disabled={!text.trim()}>
          + Add Task
        </Button>
      </div>
    </Modal>
  );
}

// ── Main Onboarding ───────────────────────────────────────────────────────
export function Onboarding() {
  const { t }  = useTranslation();
  const config  = useConfig();
  const updateConfig = useAppStore((s) => s.updateConfig);
  const haptic  = useHaptic();
  const toast   = useToast();
  const fireConfetti = useAppStore((s) => s.fireConfetti);

  const [checked,      setChecked]      = useState<Record<string, boolean>>({});
  const [expandedWeeks,setExpandedWeeks]= useState<Set<string>>(new Set([config.onboardingWeeks[0]?.id]));
  const [startDate,    setStartDate]    = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [view,         setView]         = useState<'cards' | 'timeline'>('cards');

  // Load persisted state from IndexedDB
  useEffect(() => {
    idbGetOnboarding().then((saved) => {
      if (Object.keys(saved).length) setChecked(saved);
    });
    const saved = localStorage.getItem('pulse-onboarding-start');
    if (saved) setStartDate(saved);
  }, []);

  // Persist to IndexedDB whenever checked changes
  useEffect(() => {
    if (Object.keys(checked).length) {
      idbSetOnboarding(checked);
    }
  }, [checked]);

  const weeks = config.onboardingWeeks;
  const allItems = useMemo(() => weeks.flatMap((w) => w.items), [weeks]);
  const progress = useMemo(() => totalProgress(weeks, checked), [weeks, checked]);

  // Current day derived from startDate
  const currentDay = useMemo(() => {
    if (!startDate) return null;
    return Math.floor((Date.now() - new Date(startDate).getTime()) / 86_400_000);
  }, [startDate]);

  const handleToggle = useCallback((id: string) => {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      // Check for milestone completions
      weeks.forEach((w) => {
        const allDone = w.items.every((i) => next[i.id]);
        const wasDone = w.items.every((i) => prev[i.id]);
        if (allDone && !wasDone) {
          setTimeout(() => {
            fireConfetti();
            toast.success(`🎉 ${w.week} complete! "${w.theme}"`);
          }, 300);
        }
      });
      return next;
    });
  }, [weeks, fireConfetti, toast]);

  const handleExpandToggle = useCallback((id: string) => {
    setExpandedWeeks((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleExpandAll  = useCallback(() => setExpandedWeeks(new Set(weeks.map((w) => w.id))), [weeks]);
  const handleCollapseAll = useCallback(() => setExpandedWeeks(new Set()), []);

  const handleAddItem = useCallback((weekId: string, text: string, dueDay?: number) => {
    const newItem: OnboardingItem = {
      id: `custom-${Date.now()}`,
      text,
      dueDay,
    };
    const updated = weeks.map((w) =>
      w.id === weekId ? { ...w, items: [...w.items, newItem] } : w
    );
    updateConfig({ onboardingWeeks: updated });
    toast.success('Task added to onboarding plan');
  }, [weeks, updateConfig, toast]);

  const handleResetAll = useCallback(() => {
    setChecked({});
    idbSetOnboarding({});
    toast.info('Progress reset');
    haptic('light');
  }, [toast, haptic]);

  const handleSetStartDate = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
    localStorage.setItem('pulse-onboarding-start', today);
    toast.success('Start date set to today');
    haptic('success');
  }, [toast, haptic]);

  // Print plan
  const handlePrint = useCallback(() => window.print(), []);

  // Overdue items — derived
  const overdueItems = useMemo(() => {
    if (currentDay === null) return [];
    return allItems.filter((i) =>
      i.dueDay !== undefined && currentDay > i.dueDay && !checked[i.id]
    );
  }, [allItems, currentDay, checked]);

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
            Module 06 — Employee Integration
          </p>
          <h2 className="font-display text-3xl sm:text-4xl text-pulse-text-primary font-bold">
            30/60/90 Day Onboarding Tracker
          </h2>
          <p className="font-sans text-sm text-pulse-text-muted mt-2 max-w-2xl leading-relaxed">
            Structured integration plan for new hires. Tasks auto-populate from your
            configured onboarding template — fully customizable in Settings.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap flex-shrink-0">
          <Button variant="secondary" size="sm" onClick={() => setShowAddModal(true)}>+ Task</Button>
          <Button variant="secondary" size="sm" onClick={handlePrint}>🖨 Print</Button>
          <Button variant="ghost" size="sm" onClick={handleResetAll}>↺ Reset</Button>
        </div>
      </div>

      {/* Overall progress + day counter */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Master progress ring */}
        <Card className="flex flex-col items-center justify-center gap-2 py-6">
          <ProgressRing pct={progress.pct} color="#C8A97E" size={96} stroke={8} />
          <p className="font-mono text-xs text-pulse-text-faint text-center">
            {progress.done}/{progress.total} tasks complete
          </p>
        </Card>

        {/* Day counter */}
        <Card className="sm:col-span-2 flex flex-col justify-center gap-4">
          {startDate ? (
            <DayCounterBadge startDate={startDate} />
          ) : (
            <div className="text-center space-y-3">
              <p className="font-sans text-sm text-pulse-text-muted">Set the new hire's start date to enable day-tracking.</p>
              <Button variant="primary" size="sm" onClick={handleSetStartDate}>
                📅 Set Start Date (Today)
              </Button>
            </div>
          )}

          {/* Per-week progress row */}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 pt-2 border-t border-pulse-border">
            {weeks.map((w) => {
              const pct = weekProgress(w, checked);
              return (
                <div key={w.id} className="text-center">
                  <ProgressRing pct={pct} color={w.color} size={44} stroke={4} />
                  <p className="font-mono text-2xs text-pulse-text-faint mt-1 truncate">{w.week}</p>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Overdue alert */}
      <AnimatePresence>
        {overdueItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-xl border border-pulse-coral/40 bg-pulse-coral/5 p-4"
            role="alert"
          >
            <div className="flex items-start gap-3">
              <span className="text-xl flex-shrink-0" aria-hidden="true">⚠️</span>
              <div>
                <p className="font-mono text-xs text-pulse-coral font-bold uppercase tracking-widest mb-1">
                  {overdueItems.length} Overdue Task{overdueItems.length > 1 ? 's' : ''}
                </p>
                <ul className="space-y-0.5">
                  {overdueItems.slice(0, 4).map((i) => (
                    <li key={i.id} className="font-sans text-xs text-pulse-text-muted">
                      · {i.text} <span className="text-pulse-coral">(Day {i.dueDay})</span>
                    </li>
                  ))}
                  {overdueItems.length > 4 && (
                    <li className="font-sans text-xs text-pulse-text-faint">
                      + {overdueItems.length - 4} more…
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View switcher + controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 p-1 bg-pulse-surface rounded-lg border border-pulse-border">
          {(['cards', 'timeline'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                'px-4 py-1.5 rounded font-mono text-xs transition-all duration-200 capitalize',
                view === v ? 'bg-pulse-gold text-black font-bold' : 'text-pulse-text-muted hover:text-pulse-text-secondary'
              )}
              aria-selected={view === v}
            >
              {v === 'cards' ? '📋 Checklist' : '📅 Timeline'}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="xs" onClick={handleExpandAll}>Expand All</Button>
          <Button variant="ghost" size="xs" onClick={handleCollapseAll}>Collapse All</Button>
        </div>
      </div>

      {/* Main content */}
      <AnimatePresence mode="wait">
        {view === 'cards' ? (
          <motion.div key="cards" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="space-y-4">
            {weeks.map((week) => (
              <WeekCard
                key={week.id}
                week={week}
                checked={checked}
                onToggle={handleToggle}
                currentDay={currentDay}
                isExpanded={expandedWeeks.has(week.id)}
                onExpandToggle={() => handleExpandToggle(week.id)}
              />
            ))}
          </motion.div>
        ) : (
          <motion.div key="timeline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <OnboardingTimeline weeks={weeks} checked={checked} currentDay={currentDay} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Completion celebration */}
      <AnimatePresence>
        {progress.pct === 100 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border border-pulse-mint/40 bg-pulse-mint/10 p-8 text-center space-y-3"
            role="status"
          >
            <p className="text-5xl">🏆</p>
            <h3 className="font-display text-2xl font-bold text-pulse-mint">
              Full Onboarding Complete!
            </h3>
            <p className="font-sans text-sm text-pulse-text-muted max-w-md mx-auto">
              This hire has completed all {progress.total} onboarding tasks across all phases.
              Schedule their 90-day comprehensive review now.
            </p>
            <Button variant="success" size="md" onClick={() => toast.info('Schedule 90-day review in your calendar!')}>
              📅 Schedule 90-Day Review
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add task modal */}
      {showAddModal && (
        <AddItemModal weeks={weeks} onAdd={handleAddItem} onClose={() => setShowAddModal(false)} />
      )}
    </motion.div>
  );
}
