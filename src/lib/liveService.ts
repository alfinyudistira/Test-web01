// ═══════════════════════════════════════════════════════════════════════════
// LIVE UPDATE SERVICE — WebSocket with SSE fallback
// Simulates real-time pipeline notifications for multi-user HR teams
// ═══════════════════════════════════════════════════════════════════════════
import type { LiveUpdate } from '@/types';

type Listener = (update: LiveUpdate) => void;

class LiveUpdateService {
  private ws: WebSocket | null = null;
  private sse: EventSource | null = null;
  private listeners: Set<Listener> = new Set();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private mockTimer: ReturnType<typeof setInterval> | null = null;
  private mode: 'ws' | 'sse' | 'mock' = 'mock';

  connect(endpoint?: string): void {
    if (endpoint?.startsWith('ws')) {
      this.connectWS(endpoint);
    } else if (endpoint?.startsWith('http') || endpoint?.startsWith('/')) {
      this.connectSSE(endpoint);
    } else {
      // Dev mode: mock live updates
      this.startMock();
    }
  }

  private connectWS(url: string): void {
    try {
      this.ws = new WebSocket(url);
      this.mode = 'ws';
      this.ws.onmessage = (e) => {
        try {
          const update = JSON.parse(e.data) as LiveUpdate;
          this.emit(update);
        } catch { /* malformed */ }
      };
      this.ws.onerror = () => this.scheduleReconnect(url);
      this.ws.onclose = () => this.scheduleReconnect(url);
    } catch {
      this.startMock();
    }
  }

  private connectSSE(url: string): void {
    try {
      this.sse = new EventSource(url);
      this.mode = 'sse';
      this.sse.onmessage = (e) => {
        try {
          const update = JSON.parse(e.data) as LiveUpdate;
          this.emit(update);
        } catch { /* malformed */ }
      };
      this.sse.onerror = () => this.startMock();
    } catch {
      this.startMock();
    }
  }

  private startMock(): void {
    this.mode = 'mock';
    const MOCK_EVENTS: LiveUpdate[] = [
      { type: 'NEW_CANDIDATE', payload: { name: 'Jordan Smith', position: 'Sr. Growth Marketer' }, timestamp: new Date().toISOString() },
      { type: 'PIPELINE_CHANGE', payload: { stage: 'Phone Screen → Team Interview', candidate: 'A. Rivera' }, timestamp: new Date().toISOString() },
      { type: 'SCORE_UPDATE', payload: { candidateId: 'demo-1', field: 'analytics', score: 4 }, timestamp: new Date().toISOString() },
      { type: 'NEW_CANDIDATE', payload: { name: 'Priya Patel', position: 'Performance Marketing Lead' }, timestamp: new Date().toISOString() },
    ];

    let idx = 0;
    this.mockTimer = setInterval(() => {
      const event = MOCK_EVENTS[idx % MOCK_EVENTS.length];
      this.emit({ ...event, timestamp: new Date().toISOString() });
      idx++;
    }, 12_000);
  }

  private scheduleReconnect(url: string): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connectWS(url);
    }, 5_000);
  }

  private emit(update: LiveUpdate): void {
    this.listeners.forEach((l) => l(update));
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  disconnect(): void {
    this.ws?.close();
    this.sse?.close();
    if (this.mockTimer) clearInterval(this.mockTimer);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.listeners.clear();
  }

  getMode(): string { return this.mode; }
}

export const liveService = new LiveUpdateService();
