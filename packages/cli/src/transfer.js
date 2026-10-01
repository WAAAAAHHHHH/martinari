const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');
const { generateId, getSafeFilePath } = require('./utils');

const CHUNK_SIZE = 64 * 1024; // 64KB chunks (compatible with web client)
const SPEED_WINDOW_MS = 1000;

class TransferManager extends EventEmitter {
  constructor(peerManager, options = {}) {
    super();
    this.peerManager = peerManager;
    this.downloadDir = options.downloadDir || path.join(process.cwd(), 'downloads');
    this.autoAccept = options.autoAccept ?? true;

    this.sendStates = new Map(); // fileId -> state
    this.receiveStates = new Map(); // fileId -> state
    this.speedWindows = new Map(); // fileId -> [{ bytes, time }]

    // Listen to messages from PeerManager
    this.peerManager.on('message', (peerId, message) => {
      this.handlePeerMessage(peerId, message);
    });

    this.peerManager.on('peer-disconnected', (peerId) => {
      this.handlePeerDisconnect(peerId);
    });
  }

  // -- Send File -------------------------------------------------------------

  async sendFile(filePath, targetPeerId = null) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const stats = fs.statSync(filePath);
    if (!stats.isFile()) {
      throw new Error(`Target is not a regular file: ${filePath}`);
    }

    const fileName = path.basename(filePath);
    const fileSize = stats.size;
    const totalChunks = Math.max(1, Math.ceil(fileSize / CHUNK_SIZE));
    const fileId = generateId(16);

    const connectedPeers = this.peerManager.getConnectedPeers();
    if (connectedPeers.length === 0) {
      throw new Error('No peers connected to send file to.');
    }

    const recipients = targetPeerId ? [targetPeerId] : connectedPeers;

    const metadata = {
      kind: 'metadata',
      fileId,
      fileName,
      fileSize,
      fileType: 'application/octet-stream',
      totalChunks,
      thumbnail: null,
    };

    const sendState = {
      fileId,
      filePath,
      fileName,
      fileSize,
      totalChunks,
      recipients,
      acceptedPeers: new Set(),
      isSending: false,
      cancelled: false,
      startedAt: Date.now(),
      bytesTransferred: 0,
    };

    this.sendStates.set(fileId, sendState);
    this.speedWindows.set(fileId, []);

    // Broadcast metadata to recipients
    for (const peerId of recipients) {
      this.peerManager.sendToPeer(peerId, metadata);
    }

    this.emit('send-started', {
      fileId,
      fileName,
      fileSize,
      totalChunks,
      recipients,
    });

    return fileId;
  }

  // -- Receive File ----------------------------------------------------------

  handlePeerMessage(peerId, message) {
    if (!message || typeof message !== 'object') return;

    if (message.kind === 'metadata') {
      this.handleMetadata(peerId, message);
    } else if (message.kind === 'chunk') {
      this.handleChunk(peerId, message);
    } else if (message.kind === 'control') {
      this.handleControl(peerId, message);
    }
  }

  handleMetadata(peerId, meta) {
    const { fileId, fileName, fileSize, totalChunks } = meta;

    const destPath = getSafeFilePath(this.downloadDir, fileName);

    let fd;
    try {
      fd = fs.openSync(destPath, 'w+');
    } catch (err) {
      this.emit('error', new Error(`Failed to create file ${destPath}: ${err.message}`));
      this.peerManager.sendToPeer(peerId, {
        kind: 'control',
        fileId,
        action: 'cancel',
      });
      return;
    }

    const receiveState = {
      fileId,
      fileName,
      fileSize,
      totalChunks,
      peerId,
      destPath,
      fd,
      receivedChunks: new Set(),
      bytesReceived: 0,
      cancelled: false,
      startedAt: Date.now(),
    };

    this.receiveStates.set(fileId, receiveState);
    this.speedWindows.set(fileId, []);

    const accept = () => {
      this.peerManager.sendToPeer(peerId, {
        kind: 'control',
        fileId,
        action: 'accept',
      });
      this.emit('receive-accepted', { fileId, fileName, fileSize, peerId, destPath });
    };

    const decline = () => {
      receiveState.cancelled = true;
      try { fs.closeSync(fd); } catch {}
      try { fs.unlinkSync(destPath); } catch {}
      this.receiveStates.delete(fileId);
      this.peerManager.sendToPeer(peerId, {
        kind: 'control',
        fileId,
        action: 'cancel',
      });
      this.emit('receive-declined', { fileId, fileName, peerId });
    };

    this.emit('incoming-file', {
      fileId,
      fileName,
      fileSize,
      peerId,
      destPath,
      accept,
      decline,
    });

    if (this.autoAccept) {
      accept();
    }
  }

  handleControl(peerId, control) {
    const { fileId, action } = control;

    if (action === 'accept') {
      const sendState = this.sendStates.get(fileId);
      if (sendState && !sendState.cancelled) {
        sendState.acceptedPeers.add(peerId);
        if (!sendState.isSending) {
          sendState.isSending = true;
          this.streamFileChunks(fileId);
        }
      }
    } else if (action === 'cancel') {
      const sendState = this.sendStates.get(fileId);
      if (sendState) {
        sendState.cancelled = true;
        this.emit('send-cancelled', { fileId, fileName: sendState.fileName, peerId });
        this.sendStates.delete(fileId);
      }

      const receiveState = this.receiveStates.get(fileId);
      if (receiveState) {
        receiveState.cancelled = true;
        try { fs.closeSync(receiveState.fd); } catch {}
        try { fs.unlinkSync(receiveState.destPath); } catch {}
        this.emit('receive-cancelled', { fileId, fileName: receiveState.fileName, peerId });
        this.receiveStates.delete(fileId);
      }
    }
  }

  async streamFileChunks(fileId) {
    const state = this.sendStates.get(fileId);
    if (!state) return;

    let fd;
    try {
      fd = fs.openSync(state.filePath, 'r');
    } catch (err) {
      this.emit('error', new Error(`Failed to read file ${state.filePath}: ${err.message}`));
      return;
    }

    const buffer = Buffer.alloc(CHUNK_SIZE);
    let chunkIndex = 0;

    try {
      while (chunkIndex < state.totalChunks) {
        if (state.cancelled) break;

        const offset = chunkIndex * CHUNK_SIZE;
        const bytesToRead = Math.min(CHUNK_SIZE, state.fileSize - offset);

        const bytesRead = fs.readSync(fd, buffer, 0, bytesToRead, offset);
        if (bytesRead <= 0) break;

        const chunkSlice = buffer.subarray(0, bytesRead);
        const base64Data = chunkSlice.toString('base64');

        const chunkMsg = {
          kind: 'chunk',
          fileId,
          chunkIndex,
          data: base64Data,
        };

        for (const peerId of state.acceptedPeers) {
          const dc = this.peerManager.getDataChannel ? this.peerManager.getDataChannel(peerId) : null;
          if (dc) {
            while (dc.bufferedAmount > 256 * 1024) {
              await new Promise((r) => setTimeout(r, 10));
            }
          }
          this.peerManager.sendToPeer(peerId, chunkMsg);
        }

        chunkIndex++;
        state.bytesTransferred = Math.min(state.fileSize, chunkIndex * CHUNK_SIZE);

        // Speed & ETA tracking
        const now = Date.now();
        const window = this.speedWindows.get(fileId) || [];
        window.push({ bytes: bytesRead, time: now });
        const cutoff = now - SPEED_WINDOW_MS;
        const recentWindow = window.filter((e) => e.time > cutoff);
        this.speedWindows.set(fileId, recentWindow);

        const speed = recentWindow.reduce((acc, e) => acc + e.bytes, 0);
        const remainingBytes = state.fileSize - state.bytesTransferred;
        const eta = speed > 0 ? remainingBytes / speed : -1;
        const percent = Math.min(100, (state.bytesTransferred / state.fileSize) * 100);

        this.emit('send-progress', {
          fileId,
          fileName: state.fileName,
          bytesTransferred: state.bytesTransferred,
          fileSize: state.fileSize,
          chunkIndex,
          totalChunks: state.totalChunks,
          speed,
          eta,
          percent,
        });

        // Yield execution and pace sending to avoid flooding buffer
        if (chunkIndex % 8 === 0) {
          await new Promise((r) => setImmediate(r));
        }
      }

      if (!state.cancelled) {
        this.emit('send-completed', {
          fileId,
          fileName: state.fileName,
          fileSize: state.fileSize,
          duration: (Date.now() - state.startedAt) / 1000,
        });
      }
    } finally {
      try { fs.closeSync(fd); } catch {}
      this.sendStates.delete(fileId);
    }
  }

  handleChunk(peerId, chunk) {
    const { fileId, chunkIndex, data } = chunk;
    const state = this.receiveStates.get(fileId);
    if (!state || state.cancelled) return;

    if (state.receivedChunks.has(chunkIndex)) return; // Duplicate chunk

    try {
      const buffer = Buffer.from(data, 'base64');
      const offset = chunkIndex * CHUNK_SIZE;

      fs.writeSync(state.fd, buffer, 0, buffer.length, offset);
      state.receivedChunks.add(chunkIndex);
      state.bytesReceived += buffer.length;

      // Speed & ETA tracking
      const now = Date.now();
      const window = this.speedWindows.get(fileId) || [];
      window.push({ bytes: buffer.length, time: now });
      const cutoff = now - SPEED_WINDOW_MS;
      const recentWindow = window.filter((e) => e.time > cutoff);
      this.speedWindows.set(fileId, recentWindow);

      const speed = recentWindow.reduce((acc, e) => acc + e.bytes, 0);
      const remainingBytes = state.fileSize - state.bytesReceived;
      const eta = speed > 0 ? remainingBytes / speed : -1;
      const percent = state.fileSize > 0 ? Math.min(100, (state.bytesReceived / state.fileSize) * 100) : 100;

      this.emit('receive-progress', {
        fileId,
        fileName: state.fileName,
        bytesReceived: state.bytesReceived,
        fileSize: state.fileSize,
        chunkIndex,
        totalChunks: state.totalChunks,
        speed,
        eta,
        percent,
      });

      // Check if all chunks received
      if (state.receivedChunks.size === state.totalChunks || state.bytesReceived >= state.fileSize) {
        try { fs.closeSync(state.fd); } catch {}

        this.emit('receive-completed', {
          fileId,
          fileName: state.fileName,
          fileSize: state.fileSize,
          destPath: state.destPath,
          peerId,
          duration: (Date.now() - state.startedAt) / 1000,
        });

        this.receiveStates.delete(fileId);
      }
    } catch (err) {
      this.emit('error', new Error(`Failed writing chunk ${chunkIndex} for ${state.fileName}: ${err.message}`));
    }
  }

  handlePeerDisconnect(peerId) {
    // Notify any active transfers for this peer
    for (const [fileId, state] of this.sendStates.entries()) {
      state.acceptedPeers.delete(peerId);
    }
    for (const [fileId, state] of this.receiveStates.entries()) {
      if (state.peerId === peerId) {
        state.cancelled = true;
        try { fs.closeSync(state.fd); } catch {}
        this.emit('receive-cancelled', { fileId, fileName: state.fileName, peerId, reason: 'Peer disconnected' });
        this.receiveStates.delete(fileId);
      }
    }
  }
}

module.exports = { TransferManager };
