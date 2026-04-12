/* ═══════════════════════════════════════════════════════════════════════════
   PULSE EXECUTIVE HERO — THE COMMAND CENTER v3.0
   Cursor-aware lighting | Kinetic typography | Dual-layer FX | Enterprise stats
   ═══════════════════════════════════════════════════════════════════════════ */

import { useMemo, useEffect, useState, useCallback } from 'react';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAppStore, useStats, useConfig } from '@/store/appStore';
import { useHaptic, useViewTransition, useMediaQuery } from '@/hooks';
import { formatNumber, haptic } from '@/lib/utils';
import { Button, Badge } from '@/components/ui'; // asumsikan sudah ada

// ============================================================================
// 1. BACKGROUND LAYERS
// ============================================================================

// ── Cyber Grid (dari Versi B) ─────────────────────────────────────────────
function CyberGrid({ primaryColor }: { primaryColor: string }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { damping: 30, stiffness: 200 });
  const springY = useSpring(mouseY, { damping: 30, stiffness: 200 });

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, [mouseX, mouseY]);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      {/* Dynamic cursor glow */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full opacity-30 blur-[100px]"
        style={{
          left: springX,
          top: springY,
          translateX: '-50%',
          translateY: '-50%',
          background: `radial-gradient(circle, ${primaryColor}, transparent 70%)`,
        }}
      />
      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(${primaryColor} 1px, transparent 1px), linear-gradient(90deg, ${primaryColor} 1px, transparent 1px)`,
          backgroundSize: '80px 80px',
        }}
      />
      {/* Vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/60" />
    </div>
  );
}

// ── Orbit Particles (dari Versi A) ───────────────────────────────────────
function OrbitParticles() {
  const particles = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        id: i,
        angle: (i / 16) * 360,
        radius: 140 + (i % 8) * 25,
        color: ['#C8A97E', '#74C476', '#6BAED6', '#9B8EC4', '#E8835A', '#E8C35A'][i % 6],
        size: 2 + (i % 6),
        duration: 12 + (i % 12),
        reverse: i % 2 === 0,
      })),
    []
  );

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            background: p.color,
            boxShadow: `0 0 6px ${p.color}`,
          }}
          animate={{
            x: [
              Math.cos((p.angle * Math.PI) / 180) * p.radius,
              Math.cos(((p.angle + (p.reverse ? -180 : 180)) * Math.PI) / 180) * p.radius,
              Math.cos((p.angle * Math.PI) / 180) * p.radius,
            ],
            y: [
              Math.sin((p.angle * Math.PI) / 180) * p.radius,
              Math.sin(((p.angle + (p.reverse ? -180 : 180)) * Math.PI) / 180) * p.radius,
              Math.sin((p.angle * Math.PI) / 180) * p.radius,
            ],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      ))}
    </div>
  );
}

// ============================================================================
// 2. STAT CARD COMPONENT (glassmorphic + hover)
// ============================================================================
interface StatCardProps {
  label: string;
  value: string | number;
  color: string;
  delay?: number;
}

function StatCard({ label, value, color, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 300, damping: 25 }}
      whileHover={{ y: -6, borderColor: `${color}80`, scale: 1.02 }}
      className="group relative flex flex-col items-center justify-center p-5 bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl transition-all duration-300"
    >
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-op duration-500 blur-xl rounded-2xl"
        style={{ backgroundColor: color }}
      />
      <span className="font-display text-3xl md:text-4xl font-black tracking-tighter text-white mb-1">
        {value}
      </span>
      <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400">
        {label}
      </span>
    </motion.div>
  );
}

// ============================================================================
// 3. MAIN HERO COMPONENT
// ============================================================================
export function Hero() {
  const { t } = useTranslation();
  const config = useConfig();
  const stats = useStats();
  const setShowApp = useAppStore((s) => s.setShowApp);
  const resetStats = useAppStore((s) => s.resetStats);
  const triggerHaptic = useHaptic();
  const startTransition = useViewTransition();
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [showOrbits, setShowOrbits] = useState(!prefersReducedMotion);

  // Aktifkan orbit hanya jika tidak reduced motion dan device tidak low-end (optional)
  useEffect(() => {
    if (prefersReducedMotion) setShowOrbits(false);
  }, [prefersReducedMotion]);

  const primaryColor = config.branding.primaryColor;

  const handleLaunch = useCallback(() => {
    triggerHaptic('medium');
    startTransition(() => setShowApp(true));
  }, [triggerHaptic, startTransition, setShowApp]);

  const handleReset = useCallback(() => {
    triggerHaptic('light');
    resetStats();
  }, [triggerHaptic, resetStats]);

  // Keyboard shortcut: Enter atau Space untuk launch
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const activeEl = document.activeElement;
        if (activeEl?.closest('[role="button"]')) return; // jangan override tombol
        e.preventDefault();
        handleLaunch();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleLaunch]);

  return (
    <section
      className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-black px-4 sm:px-6"
      aria-label="Hero section"
    >
      {/* Background layers */}
      <CyberGrid primaryColor={primaryColor} />
      {showOrbits && <OrbitParticles />}

      {/* Main content container */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 w-full max-w-5xl text-center"
      >
        {/* Enterprise badge */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring' }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-6 sm:mb-8"
        >
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ backgroundColor: primaryColor }}
          />
          <span className="font-mono text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
            {t('hero.badge', 'Enterprise HR Intelligence')}
          </span>
        </motion.div>

        {/* Company name line */}
        <motion.p
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="font-mono text-xs uppercase tracking-[0.4em] text-zinc-500 mb-3"
          style={{ color: primaryColor }}
        >
          {config.companyName}
        </motion.p>

        {/* Animated gradient headline */}
        <motion.h1
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 100 }}
          className="font-display text-5xl sm:text-7xl md:text-8xl font-black leading-[1.1] tracking-tight bg-gradient-to-r from-white via-pulse-gold to-white bg-clip-text text-transparent bg-[length:200%] animate-gradient"
        >
          {t('hero.headline', 'Hire with Precision.')}
        </motion.h1>

        {/* Subline */}
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="font-sans text-base sm:text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed mt-5"
        >
          {t('hero.subline', 'Science-backed decisions, zero bias.')}
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10 mb-16"
        >
          <Button
            variant="primary"
            size="lg"
            onClick={handleLaunch}
            className="group relative px-8 py-4 rounded-xl font-display font-black text-xs uppercase tracking-widest overflow-hidden transition-all hover:scale-105 active:scale-95 min-w-[200px]"
            style={{ backgroundColor: primaryColor, color: '#000' }}
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/40 to-white/0 -translate-x-full group-hover:animate-shimmer" />
            <span className="relative z-10 flex items-center justify-center gap-2">
              {t('hero.cta', 'Launch Platform')}
              <span className="text-base">→</span>
            </span>
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => window.open('https://docs.pulse.app', '_blank')}
            className="px-8 py-4 rounded-xl bg-white/5 border border-white/10 font-display font-black text-xs uppercase tracking-widest text-white hover:bg-white/10 transition-all"
          >
            Documentation
          </Button>
        </motion.div>

        {/* Stats Section (only if data exists) */}
        <AnimatePresence>
          {stats.total > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto"
            >
              <StatCard
                label={t('hero.stats_total', 'Evaluations')}
                value={formatNumber(stats.total)}
                color={primaryColor}
                delay={0.6}
              />
              <StatCard
                label={t('hero.stats_strong', 'Strong Hires')}
                value={formatNumber(stats.strongHires)}
                color="#74C476"
                delay={0.7}
              />
              <StatCard
                label={t('hero.stats_avg', 'Avg Score')}
                value={stats.avgScore.toFixed(2)}
                color="#6BAED6"
                delay={0.8}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reset link (if stats exist) */}
        {stats.total > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="mt-6"
          >
            <button
              onClick={handleReset}
              className="font-mono text-2xs text-zinc-500 hover:text-pulse-coral transition-colors underline underline-offset-2"
              aria-label="Reset statistics"
            >
              Reset statistics
            </button>
          </motion.div>
        )}
      </motion.div>

      {/* Academic footer (dari Versi A + B) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.0 }}
        className="absolute bottom-6 left-0 right-0 flex flex-wrap justify-center gap-4 sm:gap-8 px-4 border-t border-white/5 pt-6 text-center"
      >
        {['Schmidt & Hunter (2016)', 'Bertrand & Mullainathan (2004)', 'McKinsey (2023)'].map((credit) => (
          <span
            key={credit}
            className="font-mono text-[9px] text-zinc-600 uppercase tracking-widest hover:text-zinc-400 transition-colors cursor-default"
          >
            {credit}
          </span>
        ))}
      </motion.div>
    </section>
  );
}
