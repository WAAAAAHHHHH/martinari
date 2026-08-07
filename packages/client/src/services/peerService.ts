import type { SignalingService } from './signalingService.js';
import type { TransferProtocolMessage } from '../types/index.js';

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  // Placeholder for TURN: uncomment and configure for production
  // {
  //   urls: 'turn:your-turn-server.com:3478',
  //   username: import.meta.env.VITE_TURN_USERNAME,
  //   credential: import.meta.env.VITE_TURN_CREDENTIAL,
  // },
];

type DataChannelMessageHandler = (
  peerId: string,
  message: TransferProtocolMessage
) => void;

type PeerConnectionStatusHandler = (
  peerId: string,
  status: 'connected' | 'disconnected' | 'failed'
) => void;

export class PeerService {
  private localPeerId: string;
  private roomCode: string;
  private signaling: SignalingService;
  private connections: Map<string, RTCPeerConnection> = new Map();
  private dataChannels: Map<string, RTCDataChannel> = new Map();
  private onMessage: DataChannelMessageHandler;
  private onStatus: PeerConnectionStatusHandler;
  private pendingIce: Map<string, RTCIceCandidateInit[]> = new Map();

  constructor(
    localPeerId: string,
    roomCode: string,
    signaling: SignalingService,
    onMessage: DataChannelMessageHandler,
    onStatus: PeerConnectionStatusHandler
  ) {
    this.localPeerId = localPeerId;
    this.roomCode = roomCode;
    this.signaling = signaling;
    this.onMessage = onMessage;
    this.onStatus = onStatus;
  }

  // Called when a new peer joins — we initiate the offer
  async initiateConnection(remotePeerId: string): Promise<void> {
    const pc = this.createPeerConnection(remotePeerId);
    const dc = pc.createDataChannel('transfer', {
      ordered: true,
    });
    this.setupDataChannel(remotePeerId, dc);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    this.signaling.send({
      type: 'offer',
      from: this.localPeerId,
      to: remotePeerId,
      sdp: offer,
    });
  }

  // Called when we receive an offer — we respond with an answer
  async handleOffer(
    remotePeerId: string,
    sdp: RTCSessionDescriptionInit
  ): Promise<void> {
    const pc = this.createPeerConnection(remotePeerId);

    pc.ondatachannel = (event) => {
      this.setupDataChannel(remotePeerId, event.channel);
    };

    await pc.setRemoteDescription(new RTCSessionDescription(sdp));

    // Apply any buffered ICE candidates
    const pending = this.pendingIce.get(remotePeerId) ?? [];
    for (const candidate of pending) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
    this.pendingIce.delete(remotePeerId);

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    this.signaling.send({
      type: 'answer',
      from: this.localPeerId,
      to: remotePeerId,
      sdp: answer,
    });
  }

  // Called when we receive an answer to our offer
  async handleAnswer(
    remotePeerId: string,
    sdp: RTCSessionDescriptionInit
  ): Promise<void> {
    const pc = this.connections.get(remotePeerId);
    if (!pc) return;

    await pc.setRemoteDescription(new RTCSessionDescription(sdp));

    // Apply buffered ICE candidates
    const pending = this.pendingIce.get(remotePeerId) ?? [];
    for (const candidate of pending) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
    this.pendingIce.delete(remotePeerId);
  }

  // Called when we receive an ICE candidate
  async handleIceCandidate(
    remotePeerId: string,
    candidate: RTCIceCandidateInit
  ): Promise<void> {
    const pc = this.connections.get(remotePeerId);

    if (!pc || !pc.remoteDescription) {
      // Buffer until remote description is set
      if (!this.pendingIce.has(remotePeerId)) {
        this.pendingIce.set(remotePeerId, []);
      }
      this.pendingIce.get(remotePeerId)!.push(candidate);
      return;
    }

    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  }

  // Send data to a specific peer
  sendToPeer(peerId: string, message: TransferProtocolMessage): boolean {
    const dc = this.dataChannels.get(peerId);
    if (!dc || dc.readyState !== 'open') return false;

    // Use binary for chunks, JSON for control messages
    if (message.kind === 'chunk') {
      // Send as structured JSON for simplicity; can optimize to binary later
      dc.send(JSON.stringify(message));
    } else {
      dc.send(JSON.stringify(message));
    }
    return true;
  }

  // Broadcast data to all connected peers
  broadcast(message: TransferProtocolMessage): void {
    for (const peerId of this.dataChannels.keys()) {
      this.sendToPeer(peerId, message);
    }
  }

  // Close connection to a specific peer
  closePeer(peerId: string): void {
    const dc = this.dataChannels.get(peerId);
    if (dc) {
      dc.close();
      this.dataChannels.delete(peerId);
    }
    const pc = this.connections.get(peerId);
    if (pc) {
      pc.close();
      this.connections.delete(peerId);
    }
  }

  // Close all peer connections
  closeAll(): void {
    for (const peerId of [...this.connections.keys()]) {
      this.closePeer(peerId);
    }
  }

  isConnectedTo(peerId: string): boolean {
    return this.dataChannels.get(peerId)?.readyState === 'open';
  }

  private createPeerConnection(remotePeerId: string): RTCPeerConnection {
    // Clean up any existing connection first
    this.closePeer(remotePeerId);

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.signaling.send({
          type: 'ice-candidate',
          from: this.localPeerId,
          to: remotePeerId,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'connected') {
        this.onStatus(remotePeerId, 'connected');
      } else if (state === 'disconnected' || state === 'closed') {
        this.onStatus(remotePeerId, 'disconnected');
      } else if (state === 'failed') {
        this.onStatus(remotePeerId, 'failed');
        // Attempt ICE restart
        pc.restartIce();
      }
    };

    this.connections.set(remotePeerId, pc);
    return pc;
  }

  private setupDataChannel(peerId: string, dc: RTCDataChannel): void {
    // Use larger buffer for performance
    dc.bufferedAmountLowThreshold = 256 * 1024; // 256KB

    dc.onopen = () => {
      this.dataChannels.set(peerId, dc);
    };

    dc.onclose = () => {
      this.dataChannels.delete(peerId);
    };

    dc.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as TransferProtocolMessage;
        this.onMessage(peerId, msg);
      } catch {
        // ignore malformed
      }
    };

    dc.onerror = (e) => {
      console.error('DataChannel error', e);
    };
  }
}
