// ═══════════════════════════════════════════════════════════════════════════
// CUSTOM HOOKS — Reusable reactive logic
// ═══════════════════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback, useRef } from 'react';
import { useDebouncedValue } from 'use-debounce';
import { haptic, withViewTransition } from '@/lib/utils';

export { useDebouncedValue };

// ── useHaptic ─────────────────────────────────────────────────────────────
export function useHaptic() {
  return useCallback(
    (pattern: Parameters<typeof haptic>[0] = 'light') => haptic(pattern),
    []
  );
}

// ── useViewTransition ─────────────────────────────────────────────────────
export function useViewTransition() {
  return useCallback((fn: () => void) => withViewTransition(fn), []);
}

// ── useMediaQuery ─────────────────────────────────────────────────────────
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => window.matchMedia(query).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [query]);
  return matches;
}

export const useIsMobile  = () => useMediaQuery('(max-width: 767px)');
export const useIsTablet  = () => useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)');

// ── useOnline ─────────────────────────────────────────────────────────────
export function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on  = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  return online;
}

// ── useKeyboardShortcuts ──────────────────────────────────────────────────
export function useKeyboardShortcuts(
  shortcuts: Record<string, () => void>
): void {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const key = e.key.toUpperCase();
      if (key in shortcuts) {
        e.preventDefault();
        shortcuts[key]();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcuts]);
}

// ── useIntersectionObserver ───────────────────────────────────────────────
export function useIntersectionObserver<T extends Element>(
  options?: IntersectionObserverInit
): [React.RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), options);
    obs.observe(el);
    return () => obs.disconnect();
  }, [options]);
  return [ref, inView];
}

// ── useLocalStorage ───────────────────────────────────────────────────────
export function useLocalStorage<T>(key: string, initialValue: T): [T, (v: T) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });
  const set = useCallback((value: T) => {
    setState(value);
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota exceeded */ }
  }, [key]);
  return [state, set];
}

// ── useCopyToClipboard ────────────────────────────────────────────────────
export function useCopyToClipboard(): [boolean, (text: string) => Promise<void>] {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, []);
  return [copied, copy];
}

// ── useScrollLock ─────────────────────────────────────────────────────────
export function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (active) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [active]);
}
