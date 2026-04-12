// ═══════════════════════════════════════════════════════════════════════════
// HERO — Premium animated landing page
// ═══════════════════════════════════════════════════════════════════════════
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAppStore, useStats, useConfig } from '@/store/appStore';
import { useHaptic } from '@/hooks';
import { formatNumber } from '@/lib/utils';
import { Button, Badge, SVGDefs } from '@/components/ui';

// Stagger animation variants
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
};
const item = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 28 } },
};

interface StatCardProps { label: string; value: string | number; color?: string; }
function StatCard({ label, value, color = '#C8A97E' }: StatCardProps) {
  return (
    <motion.div
      variants={item}
      className="flex flex-col items-center gap-1 px-6 py-4 bg-pulse-surface border border-pulse-border rounded-lg"
      whileHover={{ borderColor: color, scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <span className="font-display text-3xl font-bold" style={{ color }}>
        {value}
      </span>
      <span className="font-mono text-2xs text-pulse-text-faint uppercase tracking-widest">
        {label}
      </span>
    </motion.div>
  );
}

// Floating orbit particles (purely decorative)
function OrbitParticles() {
  const particles = useMemo(() =>
    Array.from({ length: 6 }, (_, i) => ({
      id: i,
      angle: (i / 6) * 360,
      radius: 180 + i * 20,
      color: ['#C8A97E', '#74C476', '#6BAED6', '#9B8EC4', '#E8835A', '#E8C35A'][i],
      size:  3 + i % 3,
      duration: 12 + i * 4,
    })), []
  );
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full opacity-30"
          style={{ width: p.size, height: p.size, background: p.color }}
          animate={{
            x: [
              Math.cos((p.angle * Math.PI) / 180) * p.radius,
              Math.cos(((p.angle + 180) * Math.PI) / 180) * p.radius,
              Math.cos((p.angle * Math.PI) / 180) * p.radius,
            ],
            y: [
              Math.sin((p.angle * Math.PI) / 180) * p.radius,
              Math.sin(((p.angle + 180) * Math.PI) / 180) * p.radius,
              Math.sin((p.angle * Math.PI) / 180) * p.radius,
            ],
          }}
          transition={{ duration: p.duration, repeat: Infinity, ease: 'linear' }}
        />
      ))}
    </div>
  );
}

export function Hero() {
  const { t } = useTranslation();
  const setShowApp  = useAppStore((s) => s.setShowApp);
  const resetStats  = useAppStore((s) => s.resetStats);
  const stats       = useStats();
  const config      = useConfig();
  const haptic      = useHaptic();

  const handleLaunch = () => {
    haptic('medium');
    setShowApp(true);
  };

  return (
    <div className="relative min-h-screen bg-pulse-bg overflow-hidden flex flex-col items-center justify-center px-6">
      <SVGDefs />

      {/* Background mesh */}
      <div className="absolute inset-0 bg-dark-mesh opacity-60" aria-hidden="true" />

      {/* Grid lines */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(#C8A97E 1px, transparent 1px), linear-gradient(90deg, #C8A97E 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }}
        aria-hidden="true"
      />

      <OrbitParticles />

      {/* Main content */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 text-center max-w-3xl mx-auto"
      >
        {/* Badge */}
        <motion.div variants={item} className="flex justify-center mb-6">
          <Badge variant="default" dot className="border-pulse-gold/30 text-pulse-gold bg-pulse-gold/5">
            {t('hero.badge')}
          </Badge>
        </motion.div>

        {/* Company name */}
        <motion.p variants={item} className="font-mono text-xs text-pulse-gold tracking-[0.3em] uppercase mb-3">
          {config.companyName}
        </motion.p>

        {/* Headline */}
        <motion.h1
          variants={item}
          className="font-display text-5xl sm:text-6xl md:text-7xl font-bold text-pulse-text-primary leading-tight mb-4"
        >
          {t('hero.headline')}
        </motion.h1>

        {/* SVG accent line */}
        <motion.div variants={item} className="flex justify-center mb-5">
          <svg width="120" height="2" aria-hidden="true">
            <defs>
              <linearGradient id="line-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#C8A97E" stopOpacity="0" />
                <stop offset="50%" stopColor="#C8A97E" stopOpacity="1" />
                <stop offset="100%" stopColor="#C8A97E" stopOpacity="0" />
              </linearGradient>
            </defs>
            <rect width="120" height="2" fill="url(#line-grad)" />
          </svg>
        </motion.div>

        {/* Subline */}
        <motion.p variants={item} className="font-sans text-lg text-pulse-text-secondary max-w-xl mx-auto mb-10 leading-relaxed">
          {t('hero.subline')}
        </motion.p>

        {/* CTA */}
        <motion.div variants={item} className="flex flex-col sm:flex-row gap-3 justify-center mb-14">
          <Button
            variant="primary"
            size="lg"
            onClick={handleLaunch}
            className="min-w-[200px] animate-pulse-glow"
            aria-label="Launch platform"
          >
            {t('hero.cta')} →
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => window.open('https://github.com', '_blank')}
            aria-label="View documentation"
          >
            Documentation
          </Button>
        </motion.div>

        {/* Stats */}
        {stats.total > 0 && (
          <motion.div
            variants={item}
            className="grid grid-cols-3 gap-3 max-w-sm mx-auto"
          >
            <StatCard
              label={t('hero.stats_total')}
              value={formatNumber(stats.total)}
              color="#C8A97E"
            />
            <StatCard
              label={t('hero.stats_strong')}
              value={formatNumber(stats.strongHires)}
              color="#74C476"
            />
            <StatCard
              label={t('hero.stats_avg')}
              value={stats.avgScore.toFixed(2)}
              color="#6BAED6"
            />
          </motion.div>
        )}

        {/* Reset link */}
        {stats.total > 0 && (
          <motion.div variants={item} className="mt-4">
            <button
              onClick={() => { resetStats(); haptic('light'); }}
              className="font-mono text-2xs text-pulse-text-faint hover:text-pulse-coral transition-colors underline underline-offset-2"
              aria-label="Reset statistics"
            >
              Reset statistics
            </button>
          </motion.div>
        )}
      </motion.div>

      {/* Footer credits */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-6 left-0 right-0 text-center"
      >
        <p className="font-mono text-2xs text-pulse-text-faint">
          Schmidt & Hunter (2016) · Bertrand & Mullainathan (2004) · McKinsey (2023)
        </p>
      </motion.div>
    </div>
  );
}
