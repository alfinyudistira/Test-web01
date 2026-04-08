import type { AppEvent, EventType, UserId, ISODate, JSONValue } from '@/types';
import { safeParseJSON, isResultOk } from '@/lib/utils'; // Tambahan utilitas aman

export type ConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'fallback'
  | 'error'
  | 'disconnected';

export interface LiveServiceConfig {
  baseUrl?: string;      
  authToken?: string;          
  maxRetries?: number;      
  backoffBase?: number;      
  backoffMax?: number;      
  jitter?: boolean;         
  heartbeatInterval?: number;  
  heartbeatTimeout?: number;  
  enableMock?: boolean;    
  debug?: boolean;     
}

type EventListener<T = JSONValue> = (event: AppEvent<T>) => void;
type StatusListener = (status: ConnectionStatus, mode: 'ws' | 'sse' | 'mock') => void;

class PulseLiveService {
  private ws: WebSocket | null = null;
  private sse: EventSource | null = null;
  private status: ConnectionStatus = 'idle';
  private mode: 'ws' | 'sse' | 'mock' = 'mock';

  private listeners = new Map<EventType | '*', Set<EventListener<JSONValue>>>();
  private statusListeners = new Set<StatusListener>();

  private retryCount = 0;
  private maxRetries = 10;
  private backoffBase = 1000;
  private backoffMax = 30000;
  private jitter = true;
  private heartbeatIntervalMs = 30000;
  private heartbeatTimeoutMs = 5000;
  private enableMock = true;
  private debug = false;

  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatExpectingPong = false;
  private mockTimer: ReturnType<typeof setInterval> | null = null;

  private currentUrl = '';
  private authToken = '';

  public connect(config: LiveServiceConfig = {}): void {
    this.applyConfig(config);
    if (this.status === 'connected' || this.status === 'connecting') return;

    this.currentUrl = config.baseUrl || '';
    this.authToken = config.authToken || '';

    this.log(`Connecting to ${this.currentUrl || 'no endpoint'}...`);
    this.setState('connecting');

    if (this.currentUrl.startsWith('ws')) {
      this.connectWebSocket();
    } else if (this.currentUrl.startsWith('http') || this.currentUrl.startsWith('/')) {
      this.connectSSE();
    } else if (this.enableMock) {
      this.startMock();
    } else {
      this.setState('error');
      this.log('No valid endpoint and mock disabled', 'error');
    }
  }

  public disconnect(): void {
    this.cleanup();
    this.setState('disconnected');
    this.log('Disconnected manually');
  }

  public subscribe<T = JSONValue>(
    type: EventType | '*',
    callback: EventListener<T>
  ): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback as unknown as EventListener<JSONValue>);
    return () => this.listeners.get(type)?.delete(callback as unknown as EventListener<JSONValue>);
  }

  public onStatusChange(callback: StatusListener): () => void {
    this.statusListeners.add(callback);
    callback(this.status, this.mode);
    return () => this.statusListeners.delete(callback);
  }

  public send<T = JSONValue>(event: Omit<AppEvent<T>, 'timestamp' | 'id'>): boolean {
    if (this.mode === 'ws' && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(event));
      return true;
    }
    this.log('Cannot send message: WebSocket not open', 'warn');
    return false;
  }

  public getStatus(): { status: ConnectionStatus; mode: 'ws' | 'sse' | 'mock' } {
    return { status: this.status, mode: this.mode };
  }

  private applyConfig(config: LiveServiceConfig): void {
    this.maxRetries = config.maxRetries ?? 10;
    this.backoffBase = config.backoffBase ?? 1000;
    this.backoffMax = config.backoffMax ?? 30000;
    this.jitter = config.jitter ?? true;
    this.heartbeatIntervalMs = config.heartbeatInterval ?? 30000;
    this.heartbeatTimeoutMs = config.heartbeatTimeout ?? 5000;
    this.enableMock = config.enableMock ?? true;
    this.debug = config.debug ?? false;
  }

  private connectWebSocket(): void {
    this.cleanupConnection();
    this.mode = 'ws';
    this.setState('connecting');

    try {
      const protocols = this.authToken ? ['json', this.authToken] : undefined;
      this.ws = new WebSocket(this.currentUrl, protocols);

      this.ws.onopen = () => {
        this.log('WebSocket connected');
        this.retryCount = 0;
        this.setState('connected');
        this.startHeartbeat();
      };

      this.ws.onmessage = (ev) => {
        this.handleRawMessage(ev.data);
      };

      this.ws.onerror = (err) => {
        this.log('WebSocket error', 'error', err);
        if (this.status !== 'reconnecting') {
          this.handleFailure();
        }
      };

      this.ws.onclose = (event) => {
        this.log(`WebSocket closed: ${event.code} ${event.reason}`);
        this.stopHeartbeat();
        if (!event.wasClean && this.status !== 'disconnected') {
          this.handleReconnect();
        }
      };
    } catch (err) {
      this.log('WebSocket creation failed', 'error', err);
      this.handleFailure();
    }
  }

  private connectSSE(): void {
    this.cleanupConnection();
    this.mode = 'sse';
    this.setState('connecting');

    try {
      const url = this.authToken
        ? `${this.currentUrl}?token=${encodeURIComponent(this.authToken)}`
        : this.currentUrl;
      this.sse = new EventSource(url);

      this.sse.onopen = () => {
        this.log('SSE connected');
        this.retryCount = 0;
        this.setState('connected');
      };

      this.sse.onmessage = (ev) => {
        this.handleRawMessage(ev.data);
      };

      this.sse.onerror = () => {
        this.log('SSE error', 'error');
        this.cleanupConnection();
        this.handleFailure();
      };
    } catch (err) {
      this.log('SSE creation failed', 'error', err);
      this.handleFailure();
    }
  }

  private startMock(): void {
    this.cleanupConnection();
    this.mode = 'mock';
    this.setState('connected');
    this.log('Running in MOCK mode (no real-time server)');

    if (this.mockTimer) clearInterval(this.mockTimer);
    
    const getIsoDate = () => new Date().toISOString() as ISODate;
    const mockEvents: AppEvent<JSONValue>[] = [
      {
        id: 'mock-1',
        type: 'CANDIDATE_CREATED',
        payload: { candidateId: 'cand-001', name: 'Emma Watson' },
        timestamp: getIsoDate(),
        actor: { id: 'mock-user' as UserId, name: 'Mock System' }
      },
      {
        id: 'mock-2',
        type: 'SCORE_SUBMITTED',
        payload: { candidateId: 'cand-001', competencyId: 'comp-1', score: 4 },
        timestamp: getIsoDate(),
        actor: { id: 'mock-user' as UserId, name: 'Mock Evaluator' }
      },
      {
        id: 'mock-3',
        type: 'DECISION_FINALIZED',
        payload: { candidateId: 'cand-001', decision: 'STRONG_HIRE' },
        timestamp: getIsoDate(),
        actor: { id: 'mock-user' as UserId, name: 'Mock System' }
      }
    ];
    
    let idx = 0;
    this.mockTimer = setInterval(() => {
      const event = mockEvents[idx % mockEvents.length]!;
      this.broadcast({ ...event, id: `mock-${Date.now()}-${idx}` });
      idx++;
    }, 15000);
  }

  private handleReconnect(): void {
    if (this.retryCount >= this.maxRetries) {
      this.log(`Max retries (${this.maxRetries}) reached, falling back to mock`);
      if (this.enableMock) {
        this.startMock();
      } else {
        this.setState('error');
      }
      return;
    }

    this.setState('reconnecting');
    let delay = Math.min(this.backoffBase * Math.pow(2, this.retryCount), this.backoffMax);
    if (this.jitter) {
      delay = delay * (0.8 + Math.random() * 0.4);
    }

    this.log(`Reconnecting in ${Math.round(delay)}ms (attempt ${this.retryCount + 1}/${this.maxRetries})`);

    this.reconnectTimer = setTimeout(() => {
      this.retryCount++;
      if (this.currentUrl.startsWith('ws')) {
        this.connectWebSocket();
      } else if (this.currentUrl.startsWith('http')) {
        this.connectSSE();
      } else if (this.enableMock) {
        this.startMock();
      } else {
        this.setState('error');
      }
    }, delay);
  }

  private handleFailure(): void {
    if (this.mode === 'ws' && this.currentUrl.startsWith('http')) {
      this.log('WebSocket failed, falling back to SSE');
      this.connectSSE();
    } else if (this.enableMock) {
      this.startMock();
    } else {
      this.setState('error');
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        if (this.heartbeatExpectingPong) {
          this.log('Heartbeat timeout: no PONG received', 'warn');
          this.ws.close(4000, 'Heartbeat timeout');
          return;
        }
        this.heartbeatExpectingPong = true;
        this.ws.send(JSON.stringify({ type: 'PING', ts: Date.now() }));
        
        setTimeout(() => {
          if (this.heartbeatExpectingPong && this.ws?.readyState === WebSocket.OPEN) {
            this.ws.close(4000, 'Heartbeat PONG missing');
          }
        }, this.heartbeatTimeoutMs);
      }
    }, this.heartbeatIntervalMs);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.heartbeatExpectingPong = false;
  }

  private handleRawMessage(raw: string): void {
    const parseResult = safeParseJSON<{ type?: string } & Record<string, unknown>>(raw);
    
    if (!isResultOk(parseResult)) {
      this.log('Failed to parse message', 'error', parseResult.error);
      return;
    }

    const data = parseResult.value;

    if (data.type === 'PONG') {
      this.heartbeatExpectingPong = false;
      return;
    }
    
    if (data.type && typeof data.type === 'string') {
      const event = data as AppEvent<JSONValue>;
      this.broadcast(event);
    } else {
      this.log('Received non-event message', 'debug', data);
    }
  }

  private broadcast(event: AppEvent<JSONValue>): void {
    this.listeners.get(event.type)?.forEach(cb => cb(event));
    this.listeners.get('*')?.forEach(cb => cb(event));
  }

  private setState(status: ConnectionStatus): void {
    if (this.status === status) return;
    this.status = status;
    this.log(`Status changed to ${status} (mode: ${this.mode})`);
    this.statusListeners.forEach(cb => cb(status, this.mode));
  }

  private cleanupConnection(): void {
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      this.ws.close();
      this.ws = null;
    }
    if (this.sse) {
      this.sse.onmessage = null;
      this.sse.onerror = null;
      this.sse.close();
      this.sse = null;
    }
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private cleanup(): void {
    this.cleanupConnection();
    if (this.mockTimer) {
      clearInterval(this.mockTimer);
      this.mockTimer = null;
    }
    this.listeners.clear();
    this.statusListeners.clear();
    this.retryCount = 0;
    this.setState('idle');
  }

  private log(message: string, level: 'log' | 'warn' | 'error' | 'debug' = 'log', ...args: unknown[]): void {
    if (!this.debug && level === 'debug') return;
    const prefix = `[PulseLiveService]`;
    switch (level) {
      case 'warn': console.warn(prefix, message, ...args); break;
      case 'error': console.error(prefix, message, ...args); break;
      default: console.log(prefix, message, ...args);
    }
  }
}

export const liveService = new PulseLiveService();
