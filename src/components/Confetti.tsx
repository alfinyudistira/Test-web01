// ═══════════════════════════════════════════════════════════════════════════
// CONFETTI — Physics-based celebration particles
// ═══════════════════════════════════════════════════════════════════════════
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/store/appStore';

const COLORS = ['#C8A97E', '#74C476', '#6BAED6', '#9B8EC4', '#E8835A', '#E8C35A', '#F48FB1'];
const SHAPES = ['square', 'circle', 'triangle'] as const;

interface Piece {
  id: number;
  x: number;
  delay: number;
  color: string;
  shape: typeof SHAPES[number];
  size: number;
  rotate: number;
  rotateSpeed: number;
}

export function Confetti() {
  const showConfetti = useAppStore((s) => s.showConfetti);

  const pieces = useMemo<Piece[]>(
    () =>
      Array.from({ length: 48 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 0.8,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
        size: 6 + Math.random() * 8,
        rotate: Math.random() * 360,
        rotateSpeed: 360 + Math.random() * 720,
      })),
    []
  );

  if (!showConfetti) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none z-[9998] overflow-hidden"
      aria-hidden="true"
    >
      {pieces.map((p) => (
        <motion.div
          key={p.id}
          initial={{ y: -20, x: `${p.x}vw`, opacity: 1, rotate: p.rotate }}
          animate={{ y: '115vh', opacity: [1, 1, 0], rotate: p.rotate + p.rotateSpeed }}
          transition={{ duration: 2.5 + Math.random() * 1, delay: p.delay, ease: 'easeIn' }}
          style={{
            position: 'absolute',
            width: p.size,
            height: p.shape === 'triangle' ? 0 : p.size,
            background: p.shape === 'triangle' ? 'transparent' : p.color,
            borderRadius: p.shape === 'circle' ? '50%' : p.shape === 'square' ? '2px' : 0,
            borderLeft: p.shape === 'triangle' ? `${p.size / 2}px solid transparent` : undefined,
            borderRight: p.shape === 'triangle' ? `${p.size / 2}px solid transparent` : undefined,
            borderBottom: p.shape === 'triangle' ? `${p.size}px solid ${p.color}` : undefined,
          }}
        />
      ))}
    </div>
  );
}
