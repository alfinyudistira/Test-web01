import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useLayoutEffect,
  useMemo,
  useReducer,
} from 'react';
import { useDebouncedValue } from 'use-debounce';
import { haptic, withViewTransition, debounce, throttle as throttleFn, uid } from '@/lib/utils';
import { liveService } from '@/lib/liveService';
import { db } from '@/lib/idb';
import type { AppEvent, EventType, Candidate, PlatformConfig } from '@/types';

export { useDebouncedValue };

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export { useDebouncedValue };

export function useLiveEvent<T = unknown>(
  type: EventType | '*',
  callback: (event: AppEvent<T>) => void
): void {
  const savedCallback = useRef(callback);
  useIsomorphicLayoutEffect(() => {
    savedCallback.current = callback;
  }, [callback]);
  useEffect(() => {
    const unsubscribe = liveService.subscribe(type, (event) => savedCallback.current(event as AppEvent<T>));
    return unsubscribe;
  }, [type]);
}

export function useEnterpriseStorage<T>(key: keyof typeof db.candidates, initialValue: T) {
  const [data, setData] = useState<T>(initialValue);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        let result: unknown;
        if (key === 'candidates') result = await db.candidates.getAll();
        else result = await db.config.get();
        if (mounted && result !== undefined) setData(result as T);
      } catch (err) {
        console.error(`Failed to load ${key} from IDB`, err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    load();
    const unsubscribe = db.onDataChange((event) => {
      if (event.key === `core::${key}`) load();
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [key]);
  const set = useCallback(async (value: T) => {
    if (key === 'candidates') await db.candidates.set(value as Candidate[]);
    else if (key === 'config') await db.config.set(value as PlatformConfig);
    setData(value);
  }, [key]);
  return { data, set, isLoading };
}

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
}
export function useKeyboardShortcuts(
  shortcuts: ShortcutConfig[] | Record<string, () => void>,
  options?: { ctrl?: boolean; shift?: boolean }
): void {
  const shortcutsArray = useMemo(() => {
    if (Array.isArray(shortcuts)) return shortcuts;
    return Object.entries(shortcuts).map(([key, action]) => ({ key, action }));
  }, [shortcuts]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      for (const sc of shortcutsArray) {
        const keyMatch = e.key.toLowerCase() === sc.key.toLowerCase();
        const ctrlMatch = sc.ctrl !== undefined ? sc.ctrl === (e.ctrlKey || e.metaKey) : true;
        const shiftMatch = sc.shift !== undefined ? sc.shift === e.shiftKey : true;
        const altMatch = sc.alt !== undefined ? sc.alt === e.altKey : true;
        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          e.preventDefault();
          haptic('light');
          sc.action();
          break;
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcutsArray]);
}

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const read = useCallback(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  }, [key, initialValue]);
  const [state, setState] = useState<T>(read);
  const set = useCallback((value: T) => {
    setState(value);
    try {
      localStorage.setItem(key, JSON.stringify(value));
      window.dispatchEvent(new Event('local-storage-sync'));
    } catch {}
  }, [key]);
  useEffect(() => {
    const handleSync = () => setState(read());
    window.addEventListener('local-storage-sync', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('local-storage-sync', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [read]);
  return [state, set];
}

export function useSessionStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const read = useCallback(() => {
    try {
      const item = sessionStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  }, [key, initialValue]);
  const [state, setState] = useState<T>(read);
  const set = useCallback((value: T) => {
    setState(value);
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key]);
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === key && e.storageArea === sessionStorage) setState(read());
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [key, read]);
  return [state, set];
}

export function useIdle(timeoutMs: number = 300000): boolean {
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      setIdle(false);
      clearTimeout(timer);
      timer = setTimeout(() => setIdle(true), timeoutMs);
    };
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(ev => window.addEventListener(ev, reset));
    reset();
    return () => {
      events.forEach(ev => window.removeEventListener(ev, reset));
      clearTimeout(timer);
    };
  }, [timeoutMs]);
  return idle;
}

export function useDynamicTheme(primaryColor: string): void {
  useIsomorphicLayoutEffect(() => {
    document.documentElement.style.setProperty('--color-primary', primaryColor);
    document.documentElement.style.setProperty('--color-primary-rgb', hexToRgb(primaryColor));
  }, [primaryColor]);
}
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}` : '200 169 126';
}

export function useMediaQuery(query: string): boolean {
  const getMatch = () => (typeof window !== 'undefined' ? window.matchMedia(query).matches : false);
  const [matches, setMatches] = useState(getMatch);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [query]);
  return matches;
}
export const useIsMobile = () => useMediaQuery('(max-width: 767px)');
export const useIsTablet = () => useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)');

export function useOnline(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  return online;
}

export function useCopyToClipboard(): [boolean, (text: string) => Promise<void>] {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);
  return [copied, copy];
}

export function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [active]);
}

export function useToggle(initial = false): [boolean, () => void] {
  const [state, setState] = useState(initial);
  const toggle = useCallback(() => setState(s => !s), []);
  return [state, toggle];
}

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fn()
      .then(res => { if (mounted) setData(res); })
      .catch(err => { if (mounted) setError(err); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, deps);
  return { data, loading, error, refetch: () => fn().then(setData).catch(setError) };
}

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  useIsomorphicLayoutEffect(() => { ref.current = value; });
  return ref.current;
}

export function useEventListener<K extends keyof WindowEventMap>(
  event: K,
  handler: (e: WindowEventMap[K]) => void,
  target: Window | HTMLElement | null = window
): void {
  useEffect(() => {
    if (!target) return;
    const el = target as EventTarget;
    el.addEventListener(event, handler as EventListener);
    return () => el.removeEventListener(event, handler as EventListener);
  }, [event, handler, target]);
}

export function useIntersectionObserver<T extends Element>(
  options?: IntersectionObserverInit
): [React.RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), options);
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [options]);
  return [ref, inView];
}

export const useHaptic = () => useCallback((pattern: Parameters<typeof haptic>[0] = 'light') => haptic(pattern), []);
export const useViewTransition = () => useCallback((fn: () => void) => withViewTransition(fn), []);
export function useThrottle<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  const throttledFn = useCallback(throttleFn(fn, delay), [fn, delay]);
  return throttledFn;
}

interface WindowSize {
  width: number;
  height: number;
}
export function useWindowSize(): WindowSize {
  const [size, setSize] = useState<WindowSize>(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  }));
  useEffect(() => {
    const handler = debounce(() => {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    }, 100);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return size;
}

export function useClickOutside<T extends HTMLElement = HTMLElement>(
  handler: (event: MouseEvent | TouchEvent) => void
): React.RefObject<T> {
  const ref = useRef<T>(null);
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) return;
      handler(event);
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [handler]);
  return ref;
}

export function useFocusTrap(active: boolean): React.RefObject<HTMLElement> {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!active || !ref.current) return;
    const trap = ref.current;
    const focusable = trap.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    trap.addEventListener('keydown', handleKeydown);
    first?.focus();
    return () => trap.removeEventListener('keydown', handleKeydown);
  }, [active]);
  return ref as React.RefObject<HTMLElement>;
}

export function useRaf(callback: (time: number) => void, deps: unknown[] = []) {
  const frameRef = useRef<number>();
  const savedCallback = useRef(callback);
  useIsomorphicLayoutEffect(() => {
    savedCallback.current = callback;
  }, [callback]);
  useEffect(() => {
    let active = true;
    const tick = (time: number) => {
      if (!active) return;
      savedCallback.current(time);
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      active = false;
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, deps);
}

import { isEqual } from 'lodash-es';
function useDeepCompareMemoize(value: any) {
  const ref = useRef<any>();
  if (!isEqual(value, ref.current)) ref.current = value;
  return ref.current;
}
export function useDeepCompareEffect(effect: React.EffectCallback, deps: React.DependencyList) {
  useEffect(effect, deps.map(useDeepCompareMemoize));
}

export function usePreviousDistinct<T>(value: T): T | undefined {
  const prevRef = useRef<T>();
  const curRef = useRef<T>(value);
  if (!isEqual(value, curRef.current)) {
    prevRef.current = curRef.current;
    curRef.current = value;
  }
  return prevRef.current;
}

export function useCounter(initial = 0, step = 1) {
  const [count, setCount] = useState(initial);
  const increment = useCallback(() => setCount(c => c + step), [step]);
  const decrement = useCallback(() => setCount(c => c - step), [step]);
  const reset = useCallback(() => setCount(initial), [initial]);
  return { count, increment, decrement, reset };
}

interface UndoState<T> {
  past: T[];
  present: T;
  future: T[];
}
export function useUndo<T>(initial: T): {
  state: T;
  set: (newState: T) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
} {
  const [history, setHistory] = useState<UndoState<T>>({
    past: [],
    present: initial,
    future: [],
  });
  const set = useCallback((newState: T) => {
    setHistory(prev => ({
      past: [...prev.past, prev.present],
      present: newState,
      future: [],
    }));
  }, []);
  const undo = useCallback(() => {
    setHistory(prev => {
      if (prev.past.length === 0) return prev;
      const previous = prev.past[prev.past.length - 1];
      const newPast = prev.past.slice(0, -1);
      return {
        past: newPast,
        present: previous,
        future: [prev.present, ...prev.future],
      };
    });
  }, []);
  const redo = useCallback(() => {
    setHistory(prev => {
      if (prev.future.length === 0) return prev;
      const next = prev.future[0];
      const newFuture = prev.future.slice(1);
      return {
        past: [...prev.past, prev.present],
        present: next,
        future: newFuture,
      };
    });
  }, []);
  return {
    state: history.present,
    set,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  };
}

export function useLiveQuery<T>(
  query: () => Promise<T>,
  deps: unknown[] = []
): { data: T | null; loading: boolean; error: unknown; refetch: () => Promise<void> } {
  const { data, loading, error, refetch } = useAsync(query, deps);
  useLiveEvent('*', useCallback(() => { refetch(); }, [refetch]));
  return { data, loading, error, refetch };
}

export type { EventType, AppEvent };
