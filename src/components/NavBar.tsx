// ═══════════════════════════════════════════════════════════════════════════
// NAVBAR — Animated tab navigation with sliding indicator
// ═══════════════════════════════════════════════════════════════════════════
import { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/appStore';
import { useKeyboardShortcuts, useHaptic, useIsMobile } from '@/hooks';
import { withViewTransition, cn } from '@/lib/utils';
import type { TabId } from '@/types';

interface TabConfig {
  id: TabId;
  i18nKey: string;
  icon: string;
  shortcut: string;
}

const TABS: TabConfig[] = [
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

export function NavBar() {
  const { t } = useTranslation();
  const activeTab  = useAppStore((s) => s.activeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const haptic     = useHaptic();
  const vt         = useViewTransition();
  const isMobile   = useIsMobile();

  const navRef     = useRef<HTMLElement>(null);
  const btnRefs    = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  // Recompute indicator position
  useEffect(() => {
    const btn = btnRefs.current[activeTab];
    const nav = navRef.current;
    if (!btn || !nav) return;
    const navRect = nav.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    setIndicator({
      left:  btnRect.left - navRect.left + nav.scrollLeft,
      width: btnRect.width,
    });
    // Scroll active into view on mobile
    btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [activeTab]);

  const navigate = useCallback((tab: TabId) => {
    haptic('light');
    vt(() => setActiveTab(tab));
  }, [haptic, vt, setActiveTab]);

  // Keyboard shortcuts
  const shortcuts = Object.fromEntries(
    TABS.map((t) => [t.shortcut, () => navigate(t.id)])
  );
  useKeyboardShortcuts(shortcuts);

  return (
    <nav
      ref={navRef}
      role="tablist"
      aria-label="Main navigation"
      className="relative bg-pulse-bg border-b border-pulse-border flex gap-0 overflow-x-auto flex-shrink-0 scroll-smooth"
      style={{ scrollbarWidth: 'none' }}
    >
      {/* Animated sliding indicator */}
      <motion.div
        className="absolute bottom-0 h-0.5 rounded-t-sm"
        style={{ background: 'linear-gradient(90deg, #C8A97E, #E2C9A0)' }}
        animate={{ left: indicator.left, width: indicator.width }}
        transition={{ type: 'spring', stiffness: 500, damping: 40 }}
        aria-hidden="true"
      />

      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            ref={(el) => { btnRefs.current[tab.id] = el; }}
            role="tab"
            aria-selected={isActive}
            aria-controls={`panel-${tab.id}`}
            id={`tab-${tab.id}`}
            onClick={() => navigate(tab.id)}
            title={`${t(tab.i18nKey)} (${tab.shortcut})`}
            className={cn(
              'relative flex items-center gap-1.5 px-4 py-3.5 font-mono text-2xs uppercase tracking-widest whitespace-nowrap transition-colors duration-200 border-b-2 border-transparent z-10 flex-shrink-0 focus-visible:outline-none focus-visible:bg-pulse-surface',
              isActive
                ? 'text-pulse-gold bg-pulse-surface'
                : 'text-pulse-text-faint hover:text-pulse-text-secondary hover:bg-pulse-surface/50'
            )}
          >
            <span aria-hidden="true">{tab.icon}</span>
            {!isMobile && <span>{t(tab.i18nKey)}</span>}
            {isMobile && isActive && (
              <span className="text-2xs">{t(tab.i18nKey)}</span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
