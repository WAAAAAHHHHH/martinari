import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
} from 'react';
import { nanoid } from 'nanoid';
import { SignalingService } from '../services/signalingService.js';
import { PeerService } from '../services/peerService.js';
import { TransferService } from '../services/transferService.js';
import type {
  RoomState,
  FileTransfer,
  Peer,
  SignalMessage,
  RoomConnectionStatus,
  IncomingBatch,
  TransferProtocolMessage,
} from '../types/index.js';

// ─── State ────────────────────────────────────────────────────────────────────

const initialState: RoomState = {
  code: '',
  connectionStatus: 'idle',
  peers: [],
  transfers: [],
  incomingBatches: [],
  localPeerId: '',
};

type Action =
  | { type: 'SET_STATUS'; status: RoomConnectionStatus }
  | { type: 'SET_ROOM'; code: string; localPeerId: string }
  | { type: 'ADD_PEER'; peer: Peer }
  | { type: 'REMOVE_PEER'; peerId: string }
  | { type: 'UPDATE_PEER'; peerId: string; updates: Partial<Peer> }
  | { type: 'UPSERT_TRANSFER'; transfer: FileTransfer }
  | { type: 'CLEAR_TRANSFERS' }
  | { type: 'ADD_INCOMING_BATCH'; batch: Omit<IncomingBatch, 'peerLabel'> }
  | { type: 'REMOVE_INCOMING_BATCH'; batchId: string }
  | { type: 'SET_ERROR'; message: string };

function reducer(state: RoomState, action: Action): RoomState {
  switch (action.type) {
    case 'SET_STATUS':
      return { ...state, connectionStatus: action.status, errorMessage: undefined };
    case 'SET_ROOM':
      return { ...state, code: action.code, localPeerId: action.localPeerId };
    case 'ADD_PEER':
      if (state.peers.find((p) => p.id === action.peer.id)) return state;
      return { ...state, peers: [...state.peers, action.peer] };
    case 'REMOVE_PEER':
      return { ...state, peers: state.peers.filter((p) => p.id !== action.peerId) };
    case 'UPDATE_PEER':
      return {
        ...state,
        peers: state.peers.map((p) =>
          p.id === action.peerId ? { ...p, ...action.updates } : p
        ),
      };
    case 'UPSERT_TRANSFER': {
      const existing = state.transfers.findIndex((t) => t.id === action.transfer.id);
      if (existing >= 0) {
        const next = [...state.transfers];
        next[existing] = { ...next[existing], ...action.transfer };
        return { ...state, transfers: next };
      }
      return { ...state, transfers: [action.transfer, ...state.transfers] };
    }
    case 'CLEAR_TRANSFERS':
      return {
        ...state,
        transfers: state.transfers.filter(
          (t) => t.status === 'transferring' || t.status === 'paused'
        ),
      };
    case 'ADD_INCOMING_BATCH': {
      const peer = state.peers.find(p => p.id === action.batch.peerId);
      const batch: IncomingBatch = { ...action.batch, peerLabel: peer?.label || 'Peer' };
      // Prevent duplicates
      if (state.incomingBatches.find(b => b.batchId === batch.batchId)) return state;
      return { ...state, incomingBatches: [...state.incomingBatches, batch] };
    }
    case 'REMOVE_INCOMING_BATCH':
      return {
        ...state,
        incomingBatches: state.incomingBatches.filter(b => b.batchId !== action.batchId)
      };
    case 'SET_ERROR':
      return { ...state, connectionStatus: 'error', errorMessage: action.message };
    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface RoomContextValue {
  state: RoomState;
  joinRoom: (code: string) => void;
  leaveRoom: () => void;
  sendFiles: (files: File[], targetPeerId?: string) => Promise<void>;
  cancelTransfer: (id: string) => void;
  pauseTransfer: (id: string) => void;
  resumeTransfer: (id: string) => void;
  clearTransfers: () => void;
  requestSendFiles: (files: File[], targetPeerId?: string) => void;
  acceptBatch: (batchId: string, peerId: string) => void;
  rejectBatch: (batchId: string, peerId: string) => void;
}

const RoomContext = createContext<RoomContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

function getWsUrl(): string {
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL as string;
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}

let peerCounter = 0;
function getPeerLabel(isLocal: boolean): string {
  if (isLocal) return 'You';
  peerCounter++;
  return `Peer ${peerCounter}`;
}

export function RoomProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const signalingRef = useRef<SignalingService | null>(null);
  const peerServiceRef = useRef<PeerService | null>(null);
  const transferServiceRef = useRef<TransferService | null>(null);
  const localPeerIdRef = useRef<string>('');
  const roomCodeRef = useRef<string>('');
  const outgoingBatchesRef = useRef<Map<string, { files: File[]; targetPeerId?: string }>>(new Map());

  // ── Transfer callbacks ───────────────────────────────────────────────────

  const handleTransferUpdate = useCallback((transfer: FileTransfer) => {
    dispatch({ type: 'UPSERT_TRANSFER', transfer });
  }, []);

  const handleTransferComplete = useCallback(
    (transferId: string, objectUrl: string, fileName: string) => {
      // Trigger auto-download
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = fileName;
      a.click();
      // Clean up URL after short delay
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);

      dispatch({
        type: 'UPSERT_TRANSFER',
        transfer: {
          id: transferId,
          objectUrl,
          status: 'completed',
        } as FileTransfer,
      });
    },
    []
  );

  // ── Signaling message handler ─────────────────────────────────────────────

  const handleSignalMessage = useCallback(
    async (msg: SignalMessage) => {
      const ps = peerServiceRef.current;
      if (!ps) return;

      if (msg.type === 'room-state') {
        // Connect to each existing peer
        for (const peerId of msg.peers) {
          if (peerId === localPeerIdRef.current) continue;
          const label = getPeerLabel(false);
          dispatch({
            type: 'ADD_PEER',
            peer: {
              id: peerId,
              label,
              isLocal: false,
              connectionStatus: 'connecting',
              joinedAt: Date.now(),
            },
          });
          await ps.initiateConnection(peerId);
        }
      } else if (msg.type === 'user-joined') {
        const label = getPeerLabel(false);
        dispatch({
          type: 'ADD_PEER',
          peer: {
            id: msg.peerId,
            label,
            isLocal: false,
            connectionStatus: 'connecting',
            joinedAt: Date.now(),
          },
        });
      } else if (msg.type === 'user-left') {
        ps.closePeer(msg.peerId);
        dispatch({ type: 'REMOVE_PEER', peerId: msg.peerId });
      } else if (msg.type === 'offer') {
        await ps.handleOffer(msg.from, msg.sdp);
      } else if (msg.type === 'answer') {
        await ps.handleAnswer(msg.from, msg.sdp);
      } else if (msg.type === 'ice-candidate') {
        await ps.handleIceCandidate(msg.from, msg.candidate);
      } else if (msg.type === 'error') {
        dispatch({ type: 'SET_ERROR', message: msg.message });
      }
    },
    []
  );

  // ── Join room ─────────────────────────────────────────────────────────────

  const joinRoom = useCallback(
    (code: string) => {
      const upperCode = code.toUpperCase();
      const localPeerId = nanoid(12);
      localPeerIdRef.current = localPeerId;
      roomCodeRef.current = upperCode;
      peerCounter = 0; // reset peer numbering per room

      dispatch({ type: 'SET_ROOM', code: upperCode, localPeerId });
      dispatch({ type: 'SET_STATUS', status: 'connecting' });

      // Add self to peers
      dispatch({
        type: 'ADD_PEER',
        peer: {
          id: localPeerId,
          label: 'You',
          isLocal: true,
          connectionStatus: 'connected',
          joinedAt: Date.now(),
        },
      });

      // Init signaling
      const signaling = new SignalingService(getWsUrl());
      signalingRef.current = signaling;

      signaling.onStatus((status) => {
        if (status === 'connected') {
          // Join room via signaling
          signaling.send({ type: 'join', roomCode: upperCode, peerId: localPeerId });
          dispatch({ type: 'SET_STATUS', status: 'connected' });
        } else if (status === 'disconnected') {
          dispatch({ type: 'SET_STATUS', status: 'reconnecting' });
        } else if (status === 'error') {
          dispatch({ type: 'SET_STATUS', status: 'error' });
        }
      });

      signaling.onMessage(handleSignalMessage);

      // Init peer service
      const peerService = new PeerService(
        localPeerId,
        upperCode,
        signaling,
        // onMessage from data channel
        (peerId, msg) => {
          if (msg.kind === 'batch-request') {
            dispatch({
              type: 'ADD_INCOMING_BATCH',
              batch: {
                batchId: msg.batchId,
                peerId,
                fileCount: msg.fileCount,
                totalSize: msg.totalSize
              }
            });
            return;
          }
          if (msg.kind === 'batch-response') {
            const batch = outgoingBatchesRef.current.get(msg.batchId);
            if (batch && msg.accept) {
              const ts = transferServiceRef.current;
              // We need peerLabel. We can just use 'Peer' for now, or maybe look it up.
              if (ts) ts.sendFiles(batch.files, peerId, 'Peer');
            }
            return;
          }

          const transfer = transferServiceRef.current;
          if (!transfer) return;
          transfer.handleIncoming(peerId, `Peer`, msg);
        },
        // onStatus
        (peerId, status) => {
          dispatch({
            type: 'UPDATE_PEER',
            peerId,
            updates: {
              connectionStatus: status === 'connected' ? 'connected' :
                status === 'failed' ? 'failed' : 'disconnected',
            },
          });
        }
      );
      peerServiceRef.current = peerService;

      // Init transfer service
      const transferSvc = new TransferService(
        peerService,
        handleTransferUpdate,
        handleTransferComplete
      );
      transferServiceRef.current = transferSvc;

      signaling.connect();
    },
    [handleSignalMessage, handleTransferUpdate, handleTransferComplete]
  );

  // ── Leave room ────────────────────────────────────────────────────────────

  const leaveRoom = useCallback(() => {
    signalingRef.current?.disconnect();
    peerServiceRef.current?.closeAll();
    signalingRef.current = null;
    peerServiceRef.current = null;
    transferServiceRef.current = null;
    localPeerIdRef.current = '';
    roomCodeRef.current = '';
    dispatch({ type: 'SET_STATUS', status: 'idle' });
  }, []);

  // ── Send files ────────────────────────────────────────────────────────────

  const requestSendFiles = useCallback((files: File[], targetPeerId?: string) => {
    const ps = peerServiceRef.current;
    if (!ps) return;

    const batchId = nanoid();
    outgoingBatchesRef.current.set(batchId, { files, targetPeerId });

    const totalSize = files.reduce((acc, f) => acc + f.size, 0);
    const msg: TransferProtocolMessage = {
      kind: 'batch-request',
      batchId,
      fileCount: files.length,
      totalSize,
    };

    if (targetPeerId) {
      ps.sendToPeer(targetPeerId, msg);
    } else {
      // Send to all connected peers
      const allPeers = Array.from(ps['dataChannels'].keys());
      for (const p of allPeers) {
        ps.sendToPeer(p, msg);
      }
    }
  }, []);

  const acceptBatch = useCallback((batchId: string, peerId: string) => {
    dispatch({ type: 'REMOVE_INCOMING_BATCH', batchId });
    peerServiceRef.current?.sendToPeer(peerId, { kind: 'batch-response', batchId, accept: true });
  }, []);

  const rejectBatch = useCallback((batchId: string, peerId: string) => {
    dispatch({ type: 'REMOVE_INCOMING_BATCH', batchId });
    peerServiceRef.current?.sendToPeer(peerId, { kind: 'batch-response', batchId, accept: false });
  }, []);

  const sendFiles = useCallback(async (files: File[], targetPeerId?: string) => {
    const ts = transferServiceRef.current;
    const ps = peerServiceRef.current;

    if (!ts || !ps) return;

    if (targetPeerId) {
      if (!ps.isConnectedTo(targetPeerId)) return;
      // We don't have peer label here easily, but TransferService will update it.
      await ts.sendFiles(files, targetPeerId, 'Peer');
    } else {
      // Send to all connected peers
      for (const peer of state.peers) {
        if (peer.isLocal || peer.connectionStatus !== 'connected') continue;
        await ts.sendFiles(files, peer.id, peer.label);
      }
    }
  }, [state.peers]);

  const cancelTransfer = useCallback((id: string) => {
    transferServiceRef.current?.cancelTransfer(id);
  }, []);

  const pauseTransfer = useCallback((id: string) => {
    transferServiceRef.current?.pauseTransfer(id);
  }, []);

  const resumeTransfer = useCallback((id: string) => {
    transferServiceRef.current?.resumeTransfer(id);
  }, []);

  const clearTransfers = useCallback(() => {
    dispatch({ type: 'CLEAR_TRANSFERS' });
  }, []);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      signalingRef.current?.disconnect();
      peerServiceRef.current?.closeAll();
    };
  }, []);

  return (
      <RoomContext.Provider
      value={{
        state,
        joinRoom,
        leaveRoom,
        sendFiles,
        requestSendFiles,
        acceptBatch,
        rejectBatch,
        cancelTransfer,
        pauseTransfer,
        resumeTransfer,
        clearTransfers,
      }}
    >
      {children}
    </RoomContext.Provider>
  );
}

export function useRoomContext(): RoomContextValue {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error('useRoomContext must be used inside RoomProvider');
  return ctx;
}
