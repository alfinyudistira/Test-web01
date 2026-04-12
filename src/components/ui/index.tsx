// ═══════════════════════════════════════════════════════════════════════════
// DESIGN SYSTEM — Reusable primitive UI components
// All styled with Tailwind + Framer Motion, no inline styles
// ═══════════════════════════════════════════════════════════════════════════
import React, { forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useScrollLock } from '@/hooks';

// ── Button ────────────────────────────────────────────────────────────────
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type ButtonSize    = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:   'bg-pulse-gold text-black font-bold hover:bg-pulse-gold-light border border-pulse-gold',
  secondary: 'bg-transparent border border-pulse-muted text-pulse-text-secondary hover:border-pulse-gold hover:text-pulse-gold',
  ghost:     'bg-transparent border border-transparent text-pulse-text-muted hover:text-pulse-text-primary',
  danger:    'bg-transparent border border-pulse-coral text-pulse-coral hover:bg-pulse-coral hover:text-black',
  success:   'bg-transparent border border-pulse-mint text-pulse-mint hover:bg-pulse-mint hover:text-black',
};
const BUTTON_SIZES: Record<ButtonSize, string> = {
  xs: 'px-2 py-1 text-2xs',
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-xs',
  lg: 'px-6 py-3 text-sm',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'md', loading, leftIcon, rightIcon, className, children, disabled, ...rest }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded font-mono uppercase tracking-widest transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pulse-gold focus-visible:ring-offset-2 focus-visible:ring-offset-pulse-bg disabled:opacity-40 disabled:cursor-not-allowed',
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className
      )}
      {...rest}
    >
      {loading ? <Spinner size={14} /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  )
);
Button.displayName = 'Button';

// ── Spinner ───────────────────────────────────────────────────────────────
export function Spinner({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="animate-spin" aria-label="Loading">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────
type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
const BADGE_STYLES: Record<BadgeVariant, string> = {
  default: 'border-pulse-muted text-pulse-text-muted bg-pulse-surface',
  success: 'border-pulse-mint/40 text-pulse-mint bg-pulse-mint/10',
  warning: 'border-pulse-amber/40 text-pulse-amber bg-pulse-amber/10',
  danger:  'border-pulse-coral/40 text-pulse-coral bg-pulse-coral/10',
  info:    'border-pulse-sky/40 text-pulse-sky bg-pulse-sky/10',
  purple:  'border-pulse-violet/40 text-pulse-violet bg-pulse-violet/10',
};

interface BadgeProps { children: React.ReactNode; variant?: BadgeVariant; className?: string; dot?: boolean; }
export function Badge({ children, variant = 'default', className, dot }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center gap-1 border rounded px-1.5 py-0.5 font-mono text-2xs uppercase tracking-wider', BADGE_STYLES[variant], className)}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />}
      {children}
    </span>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glow?: boolean;
  noPad?: boolean;
}
export function Card({ className, glow, noPad, children, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        'bg-pulse-surface border border-pulse-border rounded-lg transition-all duration-300',
        !noPad && 'p-6',
        glow && 'animate-pulse-glow',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────
interface SkeletonProps { className?: string; lines?: number; }
export function Skeleton({ className, lines = 1 }: SkeletonProps) {
  return (
    <>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'rounded bg-skeleton-gradient bg-[length:200%_100%] animate-skeleton',
            i > 0 && 'mt-2',
            className ?? 'h-4 w-full'
          )}
          aria-hidden="true"
        />
      ))}
    </>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────
export function Divider({ label, className }: { label?: string; className?: string }) {
  return (
    <div className={cn('flex items-center gap-3 my-4', className)}>
      <div className="flex-1 h-px bg-pulse-border" />
      {label && <span className="font-mono text-2xs text-pulse-text-faint tracking-widest uppercase">{label}</span>}
      <div className="flex-1 h-px bg-pulse-border" />
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}
const MODAL_SIZES = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-4xl', full: 'max-w-[95vw]' };

export function Modal({ open, onClose, title, children, size = 'lg' }: ModalProps) {
  useScrollLock(open);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog" aria-modal="true" aria-label={title}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={cn('relative w-full bg-pulse-elevated border border-pulse-border rounded-xl shadow-2xl overflow-hidden', MODAL_SIZES[size])}
          >
            {title && (
              <div className="flex items-center justify-between px-6 py-4 border-b border-pulse-border">
                <h2 className="font-display text-lg text-pulse-text-primary">{title}</h2>
                <button
                  onClick={onClose}
                  className="text-pulse-text-faint hover:text-pulse-text-primary transition-colors"
                  aria-label="Close modal"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
            <div className="max-h-[80vh] overflow-y-auto p-6">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Tooltip ───────────────────────────────────────────────────────────────
interface TooltipProps { content: string; children: React.ReactNode; position?: 'top' | 'bottom' | 'left' | 'right'; }
export function Tooltip({ content, children, position = 'top' }: TooltipProps) {
  const posClass = { top: 'bottom-full left-1/2 -translate-x-1/2 mb-2', bottom: 'top-full left-1/2 -translate-x-1/2 mt-2', left: 'right-full top-1/2 -translate-y-1/2 mr-2', right: 'left-full top-1/2 -translate-y-1/2 ml-2' }[position];
  return (
    <div className="relative inline-flex group">
      {children}
      <div className={cn('absolute z-50 hidden group-hover:block px-2 py-1 bg-pulse-elevated border border-pulse-muted rounded text-2xs font-mono text-pulse-text-secondary whitespace-nowrap pointer-events-none', posClass)}>
        {content}
      </div>
    </div>
  );
}

// ── Progress Bar ──────────────────────────────────────────────────────────
interface ProgressBarProps { value: number; max?: number; color?: string; className?: string; label?: string; animated?: boolean; }
export function ProgressBar({ value, max = 100, color = '#C8A97E', className, label, animated }: ProgressBarProps) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className={cn('w-full', className)} role="progressbar" aria-valuenow={value} aria-valuemax={max} aria-label={label}>
      <div className="w-full h-1.5 bg-pulse-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: animated ? 1.2 : 0.4, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
    </div>
  );
}

// ── Score Chip ────────────────────────────────────────────────────────────
export function ScoreChip({ score, color }: { score: number; color?: string }) {
  const c = color ?? (score >= 4 ? '#74C476' : score >= 3 ? '#E8C35A' : '#E8835A');
  return (
    <span
      className="inline-flex items-center justify-center w-8 h-8 rounded text-sm font-bold font-mono border"
      style={{ color: c, borderColor: `${c}40`, background: `${c}15` }}
    >
      {score}
    </span>
  );
}

// ── SVG Defs (shared gradients/filters) ──────────────────────────────────
export function SVGDefs() {
  return (
    <svg width="0" height="0" className="absolute pointer-events-none" aria-hidden="true">
      <defs>
        <linearGradient id="gold-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#C8A97E" />
          <stop offset="100%" stopColor="#E2C9A0" />
        </linearGradient>
        <linearGradient id="mint-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#74C476" />
          <stop offset="100%" stopColor="#A8E6A8" />
        </linearGradient>
        <linearGradient id="coral-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#E8835A" />
          <stop offset="100%" stopColor="#F4A47A" />
        </linearGradient>
        <filter id="glow-gold">
          <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#C8A97E" floodOpacity="0.5" />
        </filter>
        <filter id="glow-mint">
          <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#74C476" floodOpacity="0.5" />
        </filter>
        <filter id="glow-coral">
          <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#E8835A" floodOpacity="0.5" />
        </filter>
      </defs>
    </svg>
  );
}
