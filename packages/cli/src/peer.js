const EventEmitter = require('events');
const { RTCPeerConnection, RTCSessionDescription, RTCIceCandidate } = require('werift');

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

class PeerManager extends EventEmitter {
  constructor(localPeerId, signalingClient) {
    super();
    this.localPeerId = localPeerId;
    this.signaling = signalingClient;

    this.connections = new Map(); // peerId -> RTCPeerConnection
    this.dataChannels = new Map(); // peerId -> RTCDataChannel
    this.pendingIce = new Map(); // peerId -> candidate[]
  }

  createPeerConnection(remotePeerId) {
    this.closePeer(remotePeerId);

    const pc = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
      maxMessageSize: 262144, // 256KB to support 64KB binary chunks in base64
    });

    pc.onicecandidate = (event) => {
      const c = event && (event.candidate || event);
      if (c && c.candidate) {
        this.signaling.sendIceCandidate(remotePeerId, {
          candidate: c.candidate,
          sdpMid: c.sdpMid !== undefined && c.sdpMid !== null ? String(c.sdpMid) : '0',
          sdpMLineIndex: typeof c.sdpMLineIndex === 'number' ? c.sdpMLineIndex : 0,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'connected') {
        // Connection established
      } else if (state === 'disconnected' || state === 'closed' || state === 'failed') {
        this.emit('peer-disconnected', remotePeerId);
        this.closePeer(remotePeerId);
      }
    };

    this.connections.set(remotePeerId, pc);
    return pc;
  }

  setupDataChannel(remotePeerId, dc) {
    dc.bufferedAmountLowThreshold = 256 * 1024;

    dc.onopen = () => {
      this.dataChannels.set(remotePeerId, dc);
      this.emit('peer-connected', remotePeerId);
    };

    dc.onclose = () => {
      this.dataChannels.delete(remotePeerId);
      this.emit('peer-disconnected', remotePeerId);
    };

    dc.onmessage = (event) => {
      try {
        const raw = event.data;
        const msg = JSON.parse(typeof raw === 'string' ? raw : raw.toString());
        this.emit('message', remotePeerId, msg);
      } catch (err) {
        // ignore malformed message
      }
    };

    dc.onerror = (err) => {
      this.emit('peer-error', remotePeerId, err);
    };
  }

  // Initiated when joining an existing room and peers already exist
  async initiateConnection(remotePeerId) {
    const pc = this.createPeerConnection(remotePeerId);
    const dc = pc.createDataChannel('transfer', { ordered: true });
    this.setupDataChannel(remotePeerId, dc);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    this.signaling.sendOffer(remotePeerId, {
      type: offer.type,
      sdp: offer.sdp,
    });
  }

  // Responding to an offer initiated by another peer
  async handleOffer(remotePeerId, sdp) {
    const pc = this.createPeerConnection(remotePeerId);

    pc.ondatachannel = (event) => {
      this.setupDataChannel(remotePeerId, event.channel);
    };

    const sdpString = typeof sdp === 'string' ? sdp : sdp.sdp;
    const sdpType = (sdp && sdp.type) || 'offer';
    const sessionDesc = new RTCSessionDescription(sdpString, sdpType);
    await pc.setRemoteDescription(sessionDesc);

    // Drain any pending ICE candidates
    const pending = this.pendingIce.get(remotePeerId) || [];
    for (const c of pending) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(c));
      } catch {
        // ignore candidate apply failure
      }
    }
    this.pendingIce.delete(remotePeerId);

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    this.signaling.sendAnswer(remotePeerId, {
      type: answer.type,
      sdp: answer.sdp,
    });
  }

  async handleAnswer(remotePeerId, sdp) {
    const pc = this.connections.get(remotePeerId);
    if (!pc) return;

    const sdpString = typeof sdp === 'string' ? sdp : sdp.sdp;
    const sdpType = (sdp && sdp.type) || 'answer';
    const sessionDesc = new RTCSessionDescription(sdpString, sdpType);
    await pc.setRemoteDescription(sessionDesc);

    // Drain any pending ICE candidates
    const pending = this.pendingIce.get(remotePeerId) || [];
    for (const c of pending) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(c));
      } catch {
        // ignore candidate apply failure
      }
    }
    this.pendingIce.delete(remotePeerId);
  }

  async handleIceCandidate(remotePeerId, candidate) {
    const pc = this.connections.get(remotePeerId);
    if (!pc || !pc.remoteDescription) {
      if (!this.pendingIce.has(remotePeerId)) {
        this.pendingIce.set(remotePeerId, []);
      }
      this.pendingIce.get(remotePeerId).push(candidate);
      return;
    }

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch {
      // ignore candidate apply failure
    }
  }

  sendToPeer(peerId, message) {
    const dc = this.dataChannels.get(peerId);
    if (!dc || dc.readyState !== 'open') return false;

    try {
      const payload = typeof message === 'string' ? message : JSON.stringify(message);
      dc.send(payload);
      return true;
    } catch (err) {
      return false;
    }
  }

  broadcast(message) {
    let sentCount = 0;
    for (const peerId of this.dataChannels.keys()) {
      if (this.sendToPeer(peerId, message)) {
        sentCount++;
      }
    }
    return sentCount;
  }

  getDataChannel(peerId) {
    return this.dataChannels.get(peerId);
  }

  getConnectedPeers() {
    return Array.from(this.dataChannels.keys());
  }

  isConnectedTo(peerId) {
    return this.dataChannels.get(peerId)?.readyState === 'open';
  }

  closePeer(peerId) {
    const dc = this.dataChannels.get(peerId);
    if (dc) {
      try { dc.close(); } catch {}
      this.dataChannels.delete(peerId);
    }

    const pc = this.connections.get(peerId);
    if (pc) {
      try { pc.close(); } catch {}
      this.connections.delete(peerId);
    }
    this.pendingIce.delete(peerId);
  }

  closeAll() {
    for (const peerId of Array.from(this.connections.keys())) {
      this.closePeer(peerId);
    }
  }
}

module.exports = { PeerManager };
