/* ═══════════════════════════════════════════════════════════════════════════
   PULSE NAVIGATION SYSTEM — ENTERPRISE NAVBAR v2.0
   Adaptive | Animated | Accessible | Keyboard-driven | Theme-aware
   ═══════════════════════════════════════════════════════════════════════════ */

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAppStore, useConfig } from '@/store/appStore';
import { useKeyboardShortcuts, useHaptic, useIsMobile, useViewTransition } from '@/hooks';
import { cn } from '@/lib/utils';
import type { TabId } from '@/types';

// ============================================================================
// 1. TAB CONFIGURATION
// ============================================================================
interface TabItem {
  id: TabId;
  i18nKey: string;
  icon: string;
  shortcut: string;     // nomor 1-9
  altShortcut?: string; // opsional
}

const TABS: TabItem[] = [
  { id: 'calculator', i18nKey: 'nav.calculator', icon: '⚡', shortcut: '1' },
  { id: 'funnel',     i18nKey: 'nav.funnel',     icon: '🔻', shortcut: '2' },
  { id: 'salary',     i18nKey: 'nav.salary',     icon: '💴', shortcut: '3' },
  { id: 'scorecard',  i18nKey: 'nav.scorecard',  icon: '📋', shortcut: '4' },
  { id: 'di',         i18nKey: 'nav.di',         icon: '🌐', shortcut: '5' },
  { id: 'onboarding', i18nKey: 'nav.onboarding', icon: '🗓', shortcut: '6' },
  { id: 'questions',  i18nKey: 'nav.questions',  icon: '💬', shortcut: '7' },
  { id: 'bi',         i18nKey: 'nav.bi',         icon: '📈', shortcut: '8' },
  { id: 'settings',   i18nKey: 'nav.settings',   icon: '⚙️', shortcut: '9' },
];

// ============================================================================
// 2. MAIN COMPONENT
// ============================================================================
export function NavBar() {
  const { t } = useTranslation();
  const config = useConfig();
  const activeTab = useAppStore((s) => s.activeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  
  const haptic = useHaptic();
  const viewTransition = useViewTransition();
  const isMobile = useIsMobile();

  // Refs untuk indikator dan scroll
  const navRef = useRef<HTMLElement>(null);
  const btnRefs = useRef<Record<TabId, HTMLButtonElement | null>>({} as any);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  // ── Update posisi indikator (pill & line) ─────────────────────────────
  const updateIndicator = useCallback(() => {
    const btn = btnRefs.current[activeTab];
    const nav = navRef.current;
    if (!btn || !nav) return;

    const navRect = nav.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    const scrollLeft = nav.scrollLeft;
    
    setIndicatorStyle({
      left: btnRect.left - navRect.left + scrollLeft,
      width: btnRect.width,
    });
  }, [activeTab]);

  // Update saat resize / scroll
  useEffect(() => {
    updateIndicator();
    const resizeObserver = new ResizeObserver(() => updateIndicator());
    if (navRef.current) resizeObserver.observe(navRef.current);
    window.addEventListener('resize', updateIndicator);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateIndicator);
    };
  }, [updateIndicator]);

  // Scroll tab aktif ke tengah saat activeTab berubah
  useEffect(() => {
    const btn = btnRefs.current[activeTab];
    if (btn) {
      btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [activeTab]);

  // ── Navigasi handler (dengan view transition & haptic) ────────────────
  const navigate = useCallback((tabId: TabId) => {
    if (tabId === activeTab) return;
    haptic('light');
    viewTransition(() => setActiveTab(tabId));
  }, [activeTab, haptic, viewTransition, setActiveTab]);

  // ── Keyboard Shortcuts (Ctrl/Cmd + number, atau Alt + number) ─────────
  const shortcuts = useMemo(() => {
    const map: Record<string, () => void> = {};
    for (const tab of TABS) {
      map[tab.shortcut] = () => navigate(tab.id);
      if (tab.altShortcut) map[tab.altShortcut] = () => navigate(tab.id);
    }
    return map;
  }, [navigate]);

  useKeyboardShortcuts(shortcuts, { ctrl: true }); // Ctrl/Cmd + number
  // juga dukung Alt + number (opsional)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const num = e.key;
        const tab = TABS.find(t => t.shortcut === num);
        if (tab) {
          e.preventDefault();
          navigate(tab.id);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);

  // Warna utama dari theme config
  const primaryColor = config.branding.primaryColor;

  return (
    <nav
      ref={navRef}
      role="tablist"
      aria-label="Main navigation"
      className="relative bg-black/40 backdrop-blur-xl border-b border-white/5 flex overflow-x-auto flex-shrink-0 scroll-smooth"
      style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
    >
      {/* Fade edges (efek gradasi di ujung kiri/kanan) */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-black/60 to-transparent z-20" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black/60 to-transparent z-20" />

      {/* ── INDICATOR PILL (background aktif) ── */}
      <motion.div
        className="absolute inset-y-1 rounded-xl -z-10"
        style={{ backgroundColor: `${primaryColor}15`, border: `1px solid ${primaryColor}40` }}
        animate={{ left: indicatorStyle.left, width: indicatorStyle.width }}
        transition={{ type: 'spring', stiffness: 500, damping: 40 }}
      />

      {/* ── INDICATOR LINE (bawah, gradient gold) ── */}
      <motion.div
        className="absolute bottom-0 h-0.5 rounded-t-full"
        style={{ background: `linear-gradient(90deg, ${primaryColor}, ${primaryColor}80)` }}
        animate={{ left: indicatorStyle.left, width: indicatorStyle.width }}
        transition={{ type: 'spring', stiffness: 500, damping: 40 }}
      />

      {/* Tombol navigasi */}
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            ref={(el) => { if (el) btnRefs.current[tab.id] = el; }}
            role="tab"
            aria-selected={isActive}
            aria-controls={`panel-${tab.id}`}
            id={`tab-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => navigate(tab.id)}
            className={cn(
              'relative flex items-center gap-2 px-4 py-3 font-mono text-2xs uppercase tracking-widest whitespace-nowrap transition-all duration-200 flex-shrink-0',
              'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 rounded-lg',
              isActive
                ? 'text-white'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
            )}
          >
            {/* Ikon dengan animasi scale saat hover */}
            <span
              className={cn(
                'text-lg transition-transform duration-200',
                !isActive && 'group-hover:scale-110'
              )}
              aria-hidden="true"
            >
              {tab.icon}
            </span>

            {/* Label (sembunyikan di mobile kecuali aktif) */}
            {(!isMobile || isActive) && (
              <span className={cn(
                'font-display text-[11px] font-bold tracking-[0.15em]',
                isMobile && isActive ? 'block' : 'hidden sm:block'
              )}>
                {t(tab.i18nKey)}
              </span>
            )}

            {/* Shortcut hint (desktop) */}
            {!isMobile && (
              <span className="hidden xl:inline-block font-mono text-[9px] text-zinc-600 group-hover:text-zinc-400 transition-colors ml-1">
                ⌘{tab.shortcut}
              </span>
            )}
          </button>
        );
      })}

      {/* Glow line bawah (dekorasi) */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
    </nav>
  );
}
