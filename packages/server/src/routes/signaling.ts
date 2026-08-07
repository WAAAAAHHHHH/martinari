import type { FastifyInstance } from 'fastify';
import type WebSocket from 'ws';
import type { RawData } from 'ws';
import { z } from 'zod';
import { isValidRoomCode } from '../utils/generateCode.js';
import {
  joinRoom,
  leaveRoom,
  sendToPeer,
  broadcastToRoom,
  roomExists,
} from '../services/roomService.js';

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const JoinSchema = z.object({
  type: z.literal('join'),
  roomCode: z.string(),
  peerId: z.string().min(1).max(64),
});

const OfferSchema = z.object({
  type: z.literal('offer'),
  from: z.string().min(1).max(64),
  to: z.string().min(1).max(64),
  sdp: z.object({
    type: z.string(),
    sdp: z.string(),
  }),
});

const AnswerSchema = z.object({
  type: z.literal('answer'),
  from: z.string().min(1).max(64),
  to: z.string().min(1).max(64),
  sdp: z.object({
    type: z.string(),
    sdp: z.string(),
  }),
});

const IceCandidateSchema = z.object({
  type: z.literal('ice-candidate'),
  from: z.string().min(1).max(64),
  to: z.string().min(1).max(64),
  candidate: z.object({
    candidate: z.string(),
    sdpMid: z.string().nullable().optional(),
    sdpMLineIndex: z.number().nullable().optional(),
  }),
});

const PingSchema = z.object({ type: z.literal('ping') });

// Each WS connection tracks which room/peer it belongs to
interface ConnectionState {
  roomCode: string | null;
  peerId: string | null;
}

export async function signalingRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/ws', { websocket: true }, (socket: WebSocket, request) => {
    const state: ConnectionState = { roomCode: null, peerId: null };
    const ip = request.ip ?? 'unknown';

    const send = (msg: object) => {
      if (socket.readyState === socket.OPEN) {
        socket.send(JSON.stringify(msg));
      }
    };

    const sendError = (code: string, message: string) => {
      send({ type: 'error', code, message });
    };

    socket.on('message', (raw: RawData) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw.toString());
      } catch {
        sendError('INVALID_JSON', 'Message must be valid JSON.');
        return;
      }

      if (typeof parsed !== 'object' || parsed === null || !('type' in parsed)) {
        sendError('INVALID_MESSAGE', 'Message must have a type field.');
        return;
      }

      const msgType = (parsed as { type: unknown }).type;

      // ── join ───────────────────────────────────────────────────────────────
      if (msgType === 'join') {
        const result = JoinSchema.safeParse(parsed);
        if (!result.success) {
          sendError('INVALID_JOIN', 'Invalid join message.');
          return;
        }

        const { roomCode, peerId } = result.data;
        const upperCode = roomCode.toUpperCase();

        if (!isValidRoomCode(upperCode)) {
          sendError('INVALID_ROOM_CODE', 'Room code format is invalid.');
          return;
        }

        if (!roomExists(upperCode)) {
          sendError('ROOM_NOT_FOUND', `Room ${upperCode} does not exist.`);
          return;
        }

        const joinResult = joinRoom(upperCode, peerId, socket, ip);
        if (!joinResult.success) {
          sendError(joinResult.error ?? 'JOIN_FAILED', 'Failed to join room.');
          return;
        }

        state.roomCode = upperCode;
        state.peerId = peerId;

        // Tell this peer about the existing room state
        send({
          type: 'room-state',
          roomCode: upperCode,
          peers: joinResult.existingPeers,
        });

        // Tell all other peers that this peer joined
        broadcastToRoom(upperCode, {
          type: 'user-joined',
          peerId,
          peerCount: joinResult.room!.peers.size,
        }, peerId);

        return;
      }

      // ── offer ─────────────────────────────────────────────────────────────
      if (msgType === 'offer') {
        const result = OfferSchema.safeParse(parsed);
        if (!result.success || !state.roomCode) {
          sendError('INVALID_OFFER', 'Invalid offer message or not in a room.');
          return;
        }
        const { to, sdp, from } = result.data;
        sendToPeer(state.roomCode, to, { type: 'offer', from, to, sdp });
        return;
      }

      // ── answer ────────────────────────────────────────────────────────────
      if (msgType === 'answer') {
        const result = AnswerSchema.safeParse(parsed);
        if (!result.success || !state.roomCode) {
          sendError('INVALID_ANSWER', 'Invalid answer message or not in a room.');
          return;
        }
        const { to, sdp, from } = result.data;
        sendToPeer(state.roomCode, to, { type: 'answer', from, to, sdp });
        return;
      }

      // ── ice-candidate ─────────────────────────────────────────────────────
      if (msgType === 'ice-candidate') {
        const result = IceCandidateSchema.safeParse(parsed);
        if (!result.success || !state.roomCode) {
          sendError('INVALID_ICE', 'Invalid ICE candidate message or not in a room.');
          return;
        }
        const { to, candidate, from } = result.data;
        sendToPeer(state.roomCode, to, { type: 'ice-candidate', from, to, candidate });
        return;
      }

      // ── ping ──────────────────────────────────────────────────────────────
      if (msgType === 'ping') {
        const result = PingSchema.safeParse(parsed);
        if (result.success) {
          send({ type: 'pong' });
        }
        return;
      }

      sendError('UNKNOWN_TYPE', `Unknown message type: ${String(msgType)}`);
    });

    socket.on('close', () => {
      if (state.roomCode && state.peerId) {
        const { peerCount } = leaveRoom(state.roomCode, state.peerId);

        broadcastToRoom(state.roomCode, {
          type: 'user-left',
          peerId: state.peerId,
          peerCount,
        });
      }
    });

    socket.on('error', (err: Error) => {
      fastify.log.error({ err }, 'WebSocket error');
    });
  });
}
