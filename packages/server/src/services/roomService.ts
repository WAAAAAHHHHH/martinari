import type WebSocket from 'ws';
import type { Room, Peer, RateLimitEntry } from '../types/index.js';
import { generateRoomCode } from '../utils/generateCode.js';

// In-memory room store
const rooms = new Map<string, Room>();

// Rate limiting: IP -> { count, resetAt }
const rateLimitMap = new Map<string, RateLimitEntry>();

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const MAX_PEERS_PER_ROOM = 10;
const ROOM_EMPTY_TTL_MS = 30_000; // delete room 30s after last peer leaves

// Pending cleanup timers for empty rooms
const cleanupTimers = new Map<string, ReturnType<typeof setTimeout>>();

// ─── Rate Limiting ────────────────────────────────────────────────────────────

export function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

// ─── Room CRUD ───────────────────────────────────────────────────────────────

import crypto from 'node:crypto';

export function createRoom(password?: string, type: 'normal' | 'broadcast' = 'normal'): { code: string; room: Room } {
  // Ensure uniqueness
  let code = generateRoomCode();
  let attempts = 0;
  while (rooms.has(code) && attempts < 10) {
    code = generateRoomCode();
    attempts++;
  }

  const creatorToken = crypto.randomUUID();

  const room: Room = {
    code,
    peers: new Map(),
    createdAt: Date.now(),
    password,
    type,
    creatorToken,
  };

  rooms.set(code, room);
  return { code, room };
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code.toUpperCase());
}

export function roomExists(code: string): boolean {
  return rooms.has(code.toUpperCase());
}

export function getRoomPeerCount(code: string): number {
  return rooms.get(code.toUpperCase())?.peers.size ?? 0;
}

// ─── Peer Management ─────────────────────────────────────────────────────────

export function joinRoom(
  code: string,
  peerId: string,
  socket: WebSocket,
  ip: string,
  password?: string,
  creatorToken?: string
): { success: boolean; room?: Room; existingPeers?: string[]; error?: string } {
  const normalizedCode = code.toUpperCase();
  const room = rooms.get(normalizedCode);

  if (!room) {
    return { success: false, error: 'ROOM_NOT_FOUND' };
  }

  if (room.password && room.password !== password) {
    return { success: false, error: 'INVALID_PASSWORD' };
  }

  if (room.peers.size >= MAX_PEERS_PER_ROOM) {
    return { success: false, error: 'ROOM_FULL' };
  }

  if (room.peers.has(peerId)) {
    return { success: false, error: 'PEER_ALREADY_IN_ROOM' };
  }

  if (creatorToken && creatorToken === room.creatorToken) {
    room.creatorPeerId = peerId;
  }

  // Cancel any pending cleanup for this room
  const timer = cleanupTimers.get(normalizedCode);
  if (timer) {
    clearTimeout(timer);
    cleanupTimers.delete(normalizedCode);
  }

  const existingPeers = Array.from(room.peers.keys());

  const peer: Peer = {
    id: peerId,
    socket,
    joinedAt: Date.now(),
    ip,
  };

  room.peers.set(peerId, peer);

  return { success: true, room, existingPeers };
}

export function leaveRoom(code: string, peerId: string): { room?: Room; peerCount: number } {
  const normalizedCode = code.toUpperCase();
  const room = rooms.get(normalizedCode);

  if (!room) return { peerCount: 0 };

  room.peers.delete(peerId);

  const peerCount = room.peers.size;

  if (peerCount === 0) {
    // Schedule deletion after TTL (allows quick rejoin)
    const timer = setTimeout(() => {
      if (rooms.get(normalizedCode)?.peers.size === 0) {
        rooms.delete(normalizedCode);
      }
      cleanupTimers.delete(normalizedCode);
    }, ROOM_EMPTY_TTL_MS);

    cleanupTimers.set(normalizedCode, timer);
  }

  return { room, peerCount };
}

export function getPeer(code: string, peerId: string): Peer | undefined {
  return rooms.get(code.toUpperCase())?.peers.get(peerId);
}

export function broadcastToRoom(
  code: string,
  message: object,
  excludePeerId?: string
): void {
  const room = rooms.get(code.toUpperCase());
  if (!room) return;

  const data = JSON.stringify(message);
  for (const [peerId, peer] of room.peers) {
    if (peerId === excludePeerId) continue;
    const ws = peer.socket as WebSocket;
    if (ws.readyState === 1 /* OPEN */) {
      ws.send(data);
    }
  }
}

export function sendToPeer(code: string, peerId: string, message: object): boolean {
  const peer = getPeer(code, peerId);
  if (!peer) return false;
  const ws = peer.socket as WebSocket;
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(message));
    return true;
  }
  return false;
}

// ─── Stats ───────────────────────────────────────────────────────────────────

export function getRoomStats(): { totalRooms: number; totalPeers: number } {
  let totalPeers = 0;
  for (const room of rooms.values()) {
    totalPeers += room.peers.size;
  }
  return { totalRooms: rooms.size, totalPeers };
}
