// ─── Signal Types (mirrors server) ───────────────────────────────────────────

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

export interface JoinMessage {
  type: 'join';
  roomCode: string;
  peerId: string;
}

export interface OfferMessage {
  type: 'offer';
  from: string;
  to: string;
  sdp: RTCSessionDescriptionInit;
}

export interface AnswerMessage {
  type: 'answer';
  from: string;
  to: string;
  sdp: RTCSessionDescriptionInit;
}

export interface IceCandidateMessage {
  type: 'ice-candidate';
  from: string;
  to: string;
  candidate: RTCIceCandidateInit;
}

export interface UserJoinedMessage {
  type: 'user-joined';
  peerId: string;
  peerCount: number;
}

export interface UserLeftMessage {
  type: 'user-left';
  peerId: string;
  peerCount: number;
}

export interface RoomStateMessage {
  type: 'room-state';
  roomCode: string;
  peers: string[];
}

export interface ErrorMessage {
  type: 'error';
  code: string;
  message: string;
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
  | { type: 'ping' }
  | { type: 'pong' };

// ─── Transfer Types ───────────────────────────────────────────────────────────

export type TransferStatus =
  | 'pending'
  | 'connecting'
  | 'transferring'
  | 'paused'
  | 'completed'
  | 'cancelled'
  | 'failed';

export type TransferDirection = 'send' | 'receive';

export interface FileTransfer {
  id: string;
  fileId: string; // unique identifier for the file across peers
  fileName: string;
  fileSize: number;
  fileType: string;
  direction: TransferDirection;
  peerId: string;
  peerLabel: string;
  status: TransferStatus;
  bytesTransferred: number;
  speed: number; // bytes/second
  eta: number; // seconds remaining, -1 if unknown
  startedAt: number;
  completedAt?: number;
  error?: string;
  thumbnail?: string; // base64 preview image
  // For receiving: accumulate chunks here
  objectUrl?: string; // download URL once complete
}

// ─── Peer Types ───────────────────────────────────────────────────────────────

export type PeerConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'failed';

export interface Peer {
  id: string;
  label: string; // display name: "You", "Peer 1", etc.
  isLocal: boolean;
  connectionStatus: PeerConnectionStatus;
  joinedAt: number;
}

// ─── Room Types ───────────────────────────────────────────────────────────────

export type RoomConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'error';

export interface RoomState {
  code: string;
  connectionStatus: RoomConnectionStatus;
  peers: Peer[];
  transfers: FileTransfer[];
  localPeerId: string;
  errorMessage?: string;
}

// ─── Transfer Protocol (sent over DataChannel) ────────────────────────────────

export interface TransferMetadata {
  kind: 'metadata';
  fileId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  totalChunks: number;
  thumbnail?: string;
}

export interface TransferChunk {
  kind: 'chunk';
  fileId: string;
  chunkIndex: number;
  data: string; // base64-encoded chunk
}

export interface TransferControl {
  kind: 'control';
  fileId: string;
  action: 'cancel' | 'pause' | 'resume' | 'ack';
}

export type TransferProtocolMessage = TransferMetadata | TransferChunk | TransferControl;
