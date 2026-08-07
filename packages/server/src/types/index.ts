// Shared message types for WebRTC signaling

export type SignalType =
  | 'join'
  | 'offer'
  | 'answer'
  | 'ice-candidate'
  | 'user-joined'
  | 'user-left'
  | 'room-state'
  | 'error'
  | 'ping'
  | 'pong';

export interface BaseMessage {
  type: SignalType;
}

export interface JoinMessage extends BaseMessage {
  type: 'join';
  roomCode: string;
  peerId: string;
}

// Plain SDP/ICE object types (avoid browser-only RTCSessionDescriptionInit etc.)
export interface SdpInit {
  type: string;
  sdp?: string;
}

export interface IceCandidateInit {
  candidate: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
}

export interface OfferMessage extends BaseMessage {
  type: 'offer';
  from: string;
  to: string;
  sdp: SdpInit;
}

export interface AnswerMessage extends BaseMessage {
  type: 'answer';
  from: string;
  to: string;
  sdp: SdpInit;
}

export interface IceCandidateMessage extends BaseMessage {
  type: 'ice-candidate';
  from: string;
  to: string;
  candidate: IceCandidateInit;
}

export interface UserJoinedMessage extends BaseMessage {
  type: 'user-joined';
  peerId: string;
  peerCount: number;
}

export interface UserLeftMessage extends BaseMessage {
  type: 'user-left';
  peerId: string;
  peerCount: number;
}

export interface RoomStateMessage extends BaseMessage {
  type: 'room-state';
  roomCode: string;
  peers: string[]; // list of peer IDs already in room
}

export interface ErrorMessage extends BaseMessage {
  type: 'error';
  code: string;
  message: string;
}

export interface PingMessage extends BaseMessage {
  type: 'ping';
}

export interface PongMessage extends BaseMessage {
  type: 'pong';
}

export type SignalMessage =
  | JoinMessage
  | OfferMessage
  | AnswerMessage
  | IceCandidateMessage
  | UserJoinedMessage
  | UserLeftMessage
  | RoomStateMessage
  | ErrorMessage
  | PingMessage
  | PongMessage;

// Server-side data structures
export interface Peer {
  id: string;
  socket: unknown; // typed as WebSocket in runtime
  joinedAt: number;
  ip: string;
}

export interface Room {
  code: string;
  peers: Map<string, Peer>;
  createdAt: number;
}

export interface RateLimitEntry {
  count: number;
  resetAt: number;
}
