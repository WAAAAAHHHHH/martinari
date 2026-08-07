import type { SignalMessage } from '../types/index.js';

type MessageHandler = (msg: SignalMessage) => void;
type StatusHandler = (status: 'connected' | 'disconnected' | 'error') => void;

const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 15000]; // ms
const PING_INTERVAL_MS = 25_000;

export class SignalingService {
  private ws: WebSocket | null = null;
  private url: string;
  private messageHandlers: Set<MessageHandler> = new Set();
  private statusHandlers: Set<StatusHandler> = new Set();
  private sendQueue: string[] = [];
  private reconnectAttempt = 0;
  private shouldReconnect = true;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isConnected = false;

  constructor(url: string) {
    this.url = url;
  }

  connect(): void {
    this.shouldReconnect = true;
    this.openSocket();
  }

  disconnect(): void {
    this.shouldReconnect = false;
    this.clearTimers();
    if (this.ws) {
      this.ws.close(1000, 'Client disconnected');
      this.ws = null;
    }
    this.isConnected = false;
  }

  send(msg: SignalMessage): void {
    const data = JSON.stringify(msg);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    } else {
      this.sendQueue.push(data);
    }
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onStatus(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  get connected(): boolean {
    return this.isConnected;
  }

  private openSocket(): void {
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.close();
      this.ws = null;
    }

    try {
      this.ws = new WebSocket(this.url);
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.isConnected = true;
      this.reconnectAttempt = 0;
      this.notifyStatus('connected');
      this.startPing();
      this.flushQueue();
    };

    this.ws.onclose = () => {
      this.isConnected = false;
      this.stopPing();
      this.notifyStatus('disconnected');
      if (this.shouldReconnect) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = () => {
      this.notifyStatus('error');
    };

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data as string) as SignalMessage;
        if (msg.type === 'pong') return; // ignore pong heartbeats
        this.messageHandlers.forEach((h) => h(msg));
      } catch {
        // ignore malformed messages
      }
    };
  }

  private scheduleReconnect(): void {
    const delay = RECONNECT_DELAYS[Math.min(this.reconnectAttempt, RECONNECT_DELAYS.length - 1)];
    this.reconnectAttempt++;
    this.reconnectTimer = setTimeout(() => {
      if (this.shouldReconnect) {
        this.openSocket();
      }
    }, delay);
  }

  private startPing(): void {
    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, PING_INTERVAL_MS);
  }

  private stopPing(): void {
    if (this.pingTimer !== null) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private flushQueue(): void {
    while (this.sendQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(this.sendQueue.shift()!);
    }
  }

  private clearTimers(): void {
    this.stopPing();
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private notifyStatus(status: 'connected' | 'disconnected' | 'error'): void {
    this.statusHandlers.forEach((h) => h(status));
  }
}
