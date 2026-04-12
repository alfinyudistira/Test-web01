/* ═══════════════════════════════════════════════════════════════════════════
   PULSE CELEBRATION ENGINE — ENTERPRISE CONFETTI v2.0
   Physics-based | Accessible | Responsive | Dual trigger
   ═══════════════════════════════════════════════════════════════════════════ */

import { useMemo, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/appStore';

// ============================================================================
// 1. CONSTANTS & TYPES
// ============================================================================
const DEFAULT_COLORS = [
  '#C8A97E', // Pulse Gold
  '#74C476', // Success Green
  '#3B82F6', // Intelligence Blue
  '#F59E0B', // Warning Amber
  '#FFFFFF', // Pure White
  '#9B8EC4', // Violet
  '#E8835A', // Coral
];

const SHAPES = ['square', 'circle', 'triangle', 'rect'] as const;
type Shape = typeof SHAPES[number];

export type ConfettiType = 'full' | 'mini' | 'none';

interface Particle {
  id: string;
  x: number;
  y: number;
  size: number;
  color: string;
  shape: Shape;
  rotate: number;
  rotateSpeed: number;
  driftX: number;    // horizontal drift (px)
  driftY: number;    // vertical drift offset
  duration: number;
  delay: number;
  opacityFade: boolean;
}

interface ConfettiProps {
  type?: ConfettiType;
  duration?: number; // ms sebelum auto clear
  onComplete?: () => void;
}

// ============================================================================
// 2. PARTICLE GENERATOR (responsive count & shape)
// ============================================================================
function generateParticles(
  count: number,
  type: ConfettiType
): Particle[] {
  const isMini = type === 'mini';
  const sizeMin = isMini ? 4 : 6;
  const sizeMax = isMini ? 10 : 16;
  const durationMin = isMini ? 1.8 : 2.2;
  const durationMax = isMini ? 2.8 : 4.0;

  return Array.from({ length: count }, (_, i) => {
    const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    const size = Math.random() * (sizeMax - sizeMin) + sizeMin;
    return {
      id: `c-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 6)}`,
      x: Math.random() * 100,                       // posisi horizontal (vw)
      y: -20 - Math.random() * 30,                  // mulai di atas viewport
      size: size,
      color: DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)],
      shape: shape,
      rotate: Math.random() * 360,
      rotateSpeed: (Math.random() * 720 + 360) * (Math.random() > 0.5 ? 1 : -1),
      driftX: (Math.random() - 0.5) * (isMini ? 60 : 100), // horizontal sway
      driftY: Math.random() * 40 + 20,              // sedikit variasi vertikal
      duration: Math.random() * (durationMax - durationMin) + durationMin,
      delay: Math.random() * 0.6,
      opacityFade: Math.random() > 0.3,              // sebagian partikel fade out
    };
  });
}

// Mendeteksi preferensi reduced motion
const prefersReducedMotion = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// Hitung jumlah partikel berdasarkan device dan tipe
function getParticleCount(type: ConfettiType): number {
  if (type === 'mini') return 32;
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  return isMobile ? 48 : 80;
}

// ============================================================================
// 3. MAIN CONFETTI COMPONENT
// ============================================================================
export function Confetti({ type = 'full', duration = 5000, onComplete }: ConfettiProps) {
  // Zustand store triggers
  const triggerCounter = useAppStore((s) => s.confettiTrigger);
  const showConfettiFlag = useAppStore((s) => s.showConfetti);
  
  const [active, setActive] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);

  // Fungsi untuk memulai konfeti
  const start = useCallback(() => {
    if (prefersReducedMotion()) return;
    const count = getParticleCount(type);
    const newParticles = generateParticles(count, type);
    setParticles(newParticles);
    setActive(true);

    const timer = setTimeout(() => {
      setActive(false);
      onComplete?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [type, duration, onComplete]);

  // Trigger dari store (counter atau boolean flag)
  useEffect(() => {
    if (triggerCounter > 0 || showConfettiFlag === true) {
      start();
    }
  }, [triggerCounter, showConfettiFlag, start]);

  if (!active) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden"
      aria-hidden="true"
    >
      <AnimatePresence>
        {particles.map((p) => {
          // Tentukan style khusus untuk bentuk triangle
          const isTriangle = p.shape === 'triangle';
          const isCircle = p.shape === 'circle';
          const isRect = p.shape === 'rect';
          
          const baseStyle: React.CSSProperties = {
            position: 'absolute',
            width: isTriangle ? 0 : p.size,
            height: isTriangle ? 0 : p.size,
            backgroundColor: isTriangle ? 'transparent' : p.color,
            borderRadius: isCircle ? '50%' : isRect ? '2px' : 0,
            boxShadow: `0 0 8px ${p.color}80`,
            willChange: 'transform, opacity',
          };

          // Triangle menggunakan border
          if (isTriangle) {
            const borderSize = p.size / 2;
            Object.assign(baseStyle, {
              borderLeft: `${borderSize}px solid transparent`,
              borderRight: `${borderSize}px solid transparent`,
              borderBottom: `${p.size}px solid ${p.color}`,
              width: 0,
              height: 0,
              boxShadow: 'none',
            });
          }

          return (
            <motion.div
              key={p.id}
              initial={{
                top: '-10vh',
                left: `${p.x}vw`,
                rotate: p.rotate,
                opacity: 1,
              }}
              animate={{
                top: `calc(110vh + ${p.driftY}px)`,
                left: `calc(${p.x}vw + ${p.driftX}px)`,
                rotate: p.rotate + p.rotateSpeed,
                opacity: p.opacityFade ? [1, 1, 0.8, 0] : [1, 1, 1, 0],
              }}
              transition={{
                duration: p.duration,
                delay: p.delay,
                ease: [0.23, 1.2, 0.32, 1], // custom gravity ease
              }}
              style={baseStyle}
            >
              {/* Efek shimmer/gloss (hanya untuk non-triangle) */}
              {!isTriangle && (
                <div
                  className="absolute inset-0 bg-gradient-to-tr from-white/30 to-transparent rounded-[inherit]"
                  style={{ borderRadius: isCircle ? '50%' : 'inherit' }}
                />
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// 4. HOOK UNTUK MEMUDAHKAN TRIGGER DARI MANA SAJA
// ============================================================================
export function useConfetti() {
  const trigger = useAppStore((s) => s.triggerConfetti);
  const fire = useCallback(
    (type: ConfettiType = 'full') => {
      // triggerConfetti akan increment counter, komponen Confetti akan merespon
      trigger();
      // Optional: set flag showConfetti juga (sudah dilakukan di store)
    },
    [trigger]
  );
  return { fire };
}
