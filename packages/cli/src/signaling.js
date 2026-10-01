const WebSocket = require('ws');
const EventEmitter = require('events');

class SignalingClient extends EventEmitter {
  constructor(serverUrl) {
    super();
    // Normalize URL to ws:// or wss://
    let wsUrl = serverUrl.replace(/^http:\/\//i, 'ws://').replace(/^https:\/\//i, 'wss://');
    if (!wsUrl.endsWith('/ws')) {
      wsUrl = wsUrl.replace(/\/+$/, '') + '/ws';
    }
    this.url = wsUrl;
    this.ws = null;
    this.pingInterval = null;
    this.peerId = null;
    this.roomCode = null;
    this.isOpen = false;
  }

  connect() {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);
      } catch (err) {
        return reject(err);
      }

      const connectionTimeout = setTimeout(() => {
        if (!this.isOpen) {
          this.close();
          reject(new Error(`Connection to signaling server (${this.url}) timed out`));
        }
      }, 10000);

      this.ws.on('open', () => {
        clearTimeout(connectionTimeout);
        this.isOpen = true;
        this.emit('open');

        // Setup ping/pong heartbeat
        this.pingInterval = setInterval(() => {
          this.send({ type: 'ping' });
        }, 20000);

        resolve();
      });

      this.ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          if (msg.type === 'pong') return;
          this.emit(msg.type, msg);
          this.emit('message', msg);
        } catch (err) {
          // ignore malformed message
        }
      });

      this.ws.on('error', (err) => {
        if (!this.isOpen) {
          clearTimeout(connectionTimeout);
          reject(err);
        }
        this.emit('error', err);
      });

      this.ws.on('close', (code, reason) => {
        this.isOpen = false;
        clearInterval(this.pingInterval);
        this.emit('close', { code, reason: reason ? reason.toString() : '' });
      });
    });
  }

  send(msg) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
      return true;
    }
    return false;
  }

  join(roomCode, peerId, { password, creatorToken, privateKey } = {}) {
    this.roomCode = roomCode.toUpperCase();
    this.peerId = peerId;
    return this.send({
      type: 'join',
      roomCode: this.roomCode,
      peerId: this.peerId,
      password: password || undefined,
      creatorToken: creatorToken || undefined,
      privateKey: privateKey || undefined,
    });
  }

  sendOffer(to, sdp) {
    return this.send({
      type: 'offer',
      from: this.peerId,
      to,
      sdp,
    });
  }

  sendAnswer(to, sdp) {
    return this.send({
      type: 'answer',
      from: this.peerId,
      to,
      sdp,
    });
  }

  sendIceCandidate(to, candidate) {
    return this.send({
      type: 'ice-candidate',
      from: this.peerId,
      to,
      candidate,
    });
  }

  close() {
    this.isOpen = false;
    clearInterval(this.pingInterval);
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
    }
  }
}

module.exports = { SignalingClient };
