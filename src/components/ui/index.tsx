/* ═══════════════════════════════════════════════════════════════════════════
   PULSE DESIGN SYSTEM — ENTERPRISE UI PRIMITIVES v3.0
   Accessible | Motion-rich | Theme-aware | Type-safe | Production-ready
   ═══════════════════════════════════════════════════════════════════════════ */

import React, { forwardRef, useMemo, useState, useRef, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useScrollLock, useHaptic } from '@/hooks';

// ============================================================================
// 1. MOTION PRESETS (centralized)
// ============================================================================
const MOTION = {
  fadeIn: { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } },
  scaleIn: { initial: { opacity: 0, scale: 0.95 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.95 } },
  slideUp: { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 12 } },
  slideDown: { initial: { opacity: 0, y: -12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -12 } },
};

// ============================================================================
// 2. BUTTON (gabungan A + B + fitur tambahan)
// ============================================================================
type ButtonVariant = 'primary' | 'secondary' | 'glass' | 'ghost' | 'danger' | 'success';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  glow?: boolean;
}

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-[var(--primary)] text-black font-black hover:brightness-110 shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]',
  secondary: 'bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/20',
  glass: 'bg-white/5 backdrop-blur-md border border-white/10 text-white hover:bg-white/15',
  ghost: 'bg-transparent text-zinc-500 hover:text-white hover:bg-white/5',
  danger: 'bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white',
  success: 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-white',
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  xs: 'px-2 py-1 text-[10px] rounded-md',
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-5 py-2.5 text-xs rounded-xl',
  lg: 'px-8 py-4 text-sm rounded-2xl',
  xl: 'px-10 py-5 text-base rounded-[1.5rem]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'md', loading, leftIcon, rightIcon, glow, className, children, disabled, ...props }, ref) => {
    const triggerHaptic = useHaptic();
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!disabled && !loading) triggerHaptic('light');
      props.onClick?.(e);
    };

    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        disabled={disabled || loading}
        onClick={handleClick}
        className={cn(
          'relative inline-flex items-center justify-center gap-2.5 font-display uppercase tracking-[0.15em] transition-all duration-300',
          'disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20',
          BUTTON_VARIANTS[variant],
          BUTTON_SIZES[size],
          glow && 'animate-pulse-glow',
          className
        )}
        {...props}
      >
        {/* Shimmer effect for primary */}
        {variant === 'primary' && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full hover:animate-shimmer" />
        )}
        {loading ? <Spinner size={16} /> : leftIcon}
        <span className="relative z-10">{children}</span>
        {!loading && rightIcon}
      </motion.button>
    );
  }
);
Button.displayName = 'Button';

// ============================================================================
// 3. CARD (gabungan A + B)
// ============================================================================
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'outline';
  hover?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', hover, className, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        {...MOTION.fadeIn}
        className={cn(
          'relative rounded-[2rem] overflow-hidden transition-all duration-500',
          variant === 'default' && 'bg-zinc-900/50 border border-white/5',
          variant === 'glass' && 'bg-black/40 backdrop-blur-3xl border border-white/10',
          variant === 'outline' && 'bg-transparent border border-white/5',
          hover && 'hover:bg-white/[0.03] hover:border-white/10 hover:-translate-y-1',
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
Card.displayName = 'Card';

// ============================================================================
// 4. BADGE (gabungan A + B)
// ============================================================================
type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'gold';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

const BADGE_STYLES: Record<BadgeVariant, string> = {
  default: 'bg-white/5 text-zinc-400 border-white/5',
  success: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  danger: 'bg-red-500/10 text-red-500 border-red-500/20',
  info: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  purple: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  gold: 'bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20',
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ children, variant = 'default', dot, className, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border font-mono text-[9px] font-bold uppercase tracking-widest',
          BADGE_STYLES[variant],
          className
        )}
        {...props}
      >
        {dot && <span className="w-1 h-1 rounded-full bg-current animate-pulse" />}
        {children}
      </span>
    );
  }
);
Badge.displayName = 'Badge';

// ============================================================================
// 5. MODAL (gabungan A + B + ESC handler)
// ============================================================================
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'full';
}

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  useScrollLock(open);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    full: 'max-w-[95vw] h-[90vh]',
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <motion.div
            {...MOTION.fadeIn}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div
            {...MOTION.scaleIn}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              'relative w-full bg-zinc-950 border border-white/10 rounded-[2.5rem] shadow-[0_50px_100px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col',
              sizes[size]
            )}
          >
            {title && (
              <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                <h2 className="font-display text-xl font-bold text-white tracking-tight">{title}</h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors text-zinc-500 hover:text-white"
                  aria-label="Close modal"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// 6. INPUT (dengan label, error, icon)
// ============================================================================
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, leftIcon, rightIcon, className, ...props }, ref) => {
    return (
      <div className="space-y-2 w-full">
        {label && (
          <label className="block font-mono text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">{leftIcon}</div>}
          <input
            ref={ref}
            className={cn(
              'w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white placeholder:text-zinc-600',
              'focus:outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10 transition-all',
              leftIcon && 'pl-12',
              rightIcon && 'pr-12',
              error && 'border-red-500/50 focus:ring-red-500/10',
              className
            )}
            {...props}
          />
          {rightIcon && <div className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500">{rightIcon}</div>}
        </div>
        {error && <p className="text-[10px] text-red-500 font-medium ml-1 uppercase tracking-wider">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

// ============================================================================
// 7. TEXTAREA (auto-resize opsional)
// ============================================================================
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  autoResize?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, autoResize, className, ...props }, ref) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const combinedRef = (ref as React.RefCallback<HTMLTextAreaElement>) || textareaRef;

    useEffect(() => {
      if (autoResize && textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      }
    }, [props.value, autoResize]);

    return (
      <div className="space-y-2 w-full">
        {label && (
          <label className="block font-mono text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">
            {label}
          </label>
        )}
        <textarea
          ref={combinedRef}
          className={cn(
            'w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white placeholder:text-zinc-600',
            'focus:outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10 transition-all resize-y',
            error && 'border-red-500/50 focus:ring-red-500/10',
            className
          )}
          rows={props.rows || 3}
          {...props}
        />
        {error && <p className="text-[10px] text-red-500 font-medium ml-1 uppercase tracking-wider">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

// ============================================================================
// 8. SELECT (dengan floating label style)
// ============================================================================
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className, ...props }, ref) => {
    return (
      <div className="space-y-2 w-full">
        {label && (
          <label className="block font-mono text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={cn(
            'w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white',
            'focus:outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10 transition-all',
            error && 'border-red-500/50 focus:ring-red-500/10',
            className
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-black">
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-[10px] text-red-500 font-medium ml-1 uppercase tracking-wider">{error}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';

// ============================================================================
// 9. SWITCH (toggle)
// ============================================================================
interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
}

export function Switch({ checked, onCheckedChange, disabled, label }: SwitchProps) {
  const triggerHaptic = useHaptic();
  const handleClick = () => {
    if (disabled) return;
    triggerHaptic('light');
    onCheckedChange(!checked);
  };

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={handleClick}
        className={cn(
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20',
          checked ? 'bg-[var(--primary)]' : 'bg-white/20',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <span
          className={cn(
            'inline-block h-5 w-5 transform rounded-full bg-white transition-transform',
            checked ? 'translate-x-6' : 'translate-x-0.5'
          )}
        />
      </button>
      {label && <span className="text-sm text-white">{label}</span>}
    </div>
  );
}

// ============================================================================
// 10. CHECKBOX
// ============================================================================
interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className, ...props }, ref) => {
    return (
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          ref={ref}
          className={cn(
            'w-4 h-4 rounded border border-white/30 bg-white/5 text-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20',
            className
          )}
          {...props}
        />
        {label && <span className="text-sm text-white">{label}</span>}
      </label>
    );
  }
);
Checkbox.displayName = 'Checkbox';

// ============================================================================
// 11. RADIO GROUP
// ============================================================================
interface RadioOption {
  value: string;
  label: string;
}

interface RadioGroupProps {
  name: string;
  options: RadioOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

export function RadioGroup({ name, options, value, onChange, label }: RadioGroupProps) {
  return (
    <div className="space-y-2">
      {label && <span className="block font-mono text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{label}</span>}
      <div className="flex flex-wrap gap-4">
        {options.map((opt) => (
          <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="w-3.5 h-3.5 accent-[var(--primary)]"
            />
            <span className="text-sm text-white">{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// 12. TABS (untuk sub-navigasi)
// ============================================================================
interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
}

export function Tabs({ tabs, activeTab, onTabChange }: TabsProps) {
  return (
    <div>
      <div className="flex gap-1 border-b border-white/10">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'px-4 py-2 text-xs font-mono uppercase tracking-wider transition-all',
              activeTab === tab.id
                ? 'text-[var(--primary)] border-b-2 border-[var(--primary)]'
                : 'text-zinc-500 hover:text-white'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="mt-4">{tabs.find((t) => t.id === activeTab)?.content}</div>
    </div>
  );
}

// ============================================================================
// 13. TOOLTIP (dengan delay)
// ============================================================================
interface TooltipProps {
  content: string;
  children: React.ReactNode;
  delay?: number;
}

export function Tooltip({ content, children, delay = 300 }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const show = () => {
    timeoutRef.current = setTimeout(() => setIsVisible(true), delay);
  };
  const hide = () => {
    clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  return (
    <div className="relative inline-flex" onMouseEnter={show} onMouseLeave={hide}>
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            {...MOTION.slideUp}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/90 backdrop-blur border border-white/10 rounded text-xs font-mono whitespace-nowrap z-50"
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// 14. PROGRESS BAR
// ============================================================================
interface ProgressBarProps {
  value: number;
  max?: number;
  showLabel?: boolean;
  className?: string;
}

export function ProgressBar({ value, max = 100, showLabel, className }: ProgressBarProps) {
  const percent = useMemo(() => Math.min((value / max) * 100, 100), [value, max]);
  return (
    <div className={cn('w-full', className)}>
      <div className="flex justify-between items-center mb-1">
        {showLabel && <span className="text-2xs text-zinc-400">{Math.round(percent)}%</span>}
      </div>
      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.5 }}
          className="h-full bg-[var(--primary)] rounded-full"
        />
      </div>
    </div>
  );
}

// ============================================================================
// 15. SCORE CHIP
// ============================================================================
interface ScoreChipProps {
  score: number;
  size?: 'sm' | 'md';
}

export function ScoreChip({ score, size = 'md' }: ScoreChipProps) {
  const color =
    score >= 4
      ? 'text-emerald-500 border-emerald-500/40 bg-emerald-500/10'
      : score >= 3
      ? 'text-amber-500 border-amber-500/40 bg-amber-500/10'
      : 'text-red-500 border-red-500/40 bg-red-500/10';

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
  };

  return (
    <span className={cn('flex items-center justify-center rounded-full font-bold border', color, sizeClasses[size])}>
      {score}
    </span>
  );
}

// ============================================================================
// 16. AVATAR
// ============================================================================
interface AvatarProps {
  src?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg';
  fallback?: string;
}

export function Avatar({ src, name, size = 'md', fallback }: AvatarProps) {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  };
  const initials = name
    ? name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : fallback || '?';

  return (
    <div className={cn('relative rounded-full overflow-hidden bg-white/10 flex items-center justify-center', sizeClasses[size])}>
      {src ? (
        <img src={src} alt={name || 'avatar'} className="w-full h-full object-cover" />
      ) : (
        <span className="font-mono font-bold text-zinc-400">{initials}</span>
      )}
    </div>
  );
}

// ============================================================================
// 17. KBD (keyboard shortcut display)
// ============================================================================
export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-white/10 border border-white/20 text-[10px] font-mono font-bold text-zinc-300',
        className
      )}
    >
      {children}
    </kbd>
  );
}

// ============================================================================
// 18. TABLE (responsive wrapper)
// ============================================================================
export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className={cn('w-full text-sm', className)}>{children}</table>
    </div>
  );
}

// ============================================================================
// 19. ALERT (inline notification)
// ============================================================================
interface AlertProps {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
}

const ALERT_STYLES = {
  info: 'border-blue-500/20 bg-blue-500/5 text-blue-400',
  success: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400',
  warning: 'border-amber-500/20 bg-amber-500/5 text-amber-400',
  error: 'border-red-500/20 bg-red-500/5 text-red-400',
};

export function Alert({ variant = 'info', title, children, onClose }: AlertProps) {
  return (
    <div className={cn('relative border rounded-xl p-4 pr-8', ALERT_STYLES[variant])}>
      {title && <div className="font-bold text-sm mb-1">{title}</div>}
      <div className="text-xs">{children}</div>
      {onClose && (
        <button onClick={onClose} className="absolute top-3 right-3 text-current opacity-60 hover:opacity-100">
          ✕
        </button>
      )}
    </div>
  );
}

// ============================================================================
// 20. SPINNER & SKELETON (dari kedua versi)
// ============================================================================
export function Spinner({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('animate-spin', className)}
      aria-label="Loading"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Skeleton({ className, lines = 1 }: { className?: string; lines?: number }) {
  return (
    <>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'rounded bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:200%_100%] animate-skeleton',
            i > 0 && 'mt-2',
            className ?? 'h-4 w-full'
          )}
        />
      ))}
    </>
  );
}

// ============================================================================
// 21. DIVIDER
// ============================================================================
export function Divider({ label, className }: { label?: string; className?: string }) {
  return (
    <div className={cn('flex items-center gap-3 my-4', className)}>
      <div className="flex-1 h-px bg-white/10" />
      {label && <span className="font-mono text-2xs text-zinc-500 uppercase tracking-widest">{label}</span>}
      <div className="flex-1 h-px bg-white/10" />
    </div>
  );
}

// ============================================================================
// 22. SVG DEFS (untuk gradient dll)
// ============================================================================
export function SVGDefs() {
  return (
    <svg width="0" height="0" className="absolute pointer-events-none">
      <defs>
        <linearGradient id="gold-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C8A97E" />
          <stop offset="100%" stopColor="#E2C9A0" />
        </linearGradient>
        <linearGradient id="hero-line" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#C8A97E" stopOpacity="0" />
          <stop offset="50%" stopColor="#C8A97E" stopOpacity="1" />
          <stop offset="100%" stopColor="#C8A97E" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ============================================================================
// 23. RE-EXPORT SEMUA KOMPONEN (untuk kemudahan import)
// ============================================================================
export type { ButtonVariant, ButtonSize, BadgeVariant, ModalProps, InputProps, SelectProps, SwitchProps, CheckboxProps, RadioGroupProps, TabsProps, TooltipProps, ProgressBarProps, ScoreChipProps, AvatarProps, AlertProps };
