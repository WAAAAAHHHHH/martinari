import { nanoid } from 'nanoid';
import { generateThumbnail } from '../utils/thumbnail.js';
import type { PeerService } from './peerService.js';
import type {
  FileTransfer,
  TransferStatus,
  TransferMetadata,
  TransferChunk,
  TransferControl,
  TransferProtocolMessage,
} from '../types/index.js';

const CHUNK_SIZE = 64 * 1024; // 64KB
const SPEED_WINDOW_MS = 1000; // 1-second rolling window for speed calculation

type TransferUpdateHandler = (transfer: FileTransfer) => void;
type TransferCompleteHandler = (transferId: string, objectUrl: string, fileName: string) => void;

interface SendState {
  file: File;
  transfer: FileTransfer;
  paused: boolean;
  cancelled: boolean;
  chunkIndex: number;
  totalChunks: number;
  peerId: string;
}

interface ReceiveState {
  transfer: FileTransfer;
  chunks: Map<number, string>; // chunkIndex -> base64 data
  totalChunks: number;
  cancelled: boolean;
}

export class TransferService {
  private peerService: PeerService;
  private onUpdate: TransferUpdateHandler;
  private onComplete: TransferCompleteHandler;

  private transfers: Map<string, FileTransfer> = new Map();
  private sendStates: Map<string, SendState> = new Map(); // fileId -> state
  private receiveStates: Map<string, ReceiveState> = new Map(); // fileId -> state
  private speedWindows: Map<string, { bytes: number; time: number }[]> = new Map();

  constructor(
    peerService: PeerService,
    onUpdate: TransferUpdateHandler,
    onComplete: TransferCompleteHandler
  ) {
    this.peerService = peerService;
    this.onUpdate = onUpdate;
    this.onComplete = onComplete;
  }

  // ─── Send ─────────────────────────────────────────────────────────────────

  async sendFiles(files: File[], peerId: string, peerLabel: string): Promise<void> {
    for (const file of files) {
      await this.sendFile(file, peerId, peerLabel);
    }
  }

  private async sendFile(file: File, peerId: string, peerLabel: string): Promise<void> {
    const fileId = nanoid();
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const thumbnail = await generateThumbnail(file);

    const transfer: FileTransfer = {
      id: nanoid(),
      fileId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type || 'application/octet-stream',
      direction: 'send',
      peerId,
      peerLabel,
      status: 'connecting',
      bytesTransferred: 0,
      speed: 0,
      eta: -1,
      startedAt: Date.now(),
      thumbnail,
    };

    this.transfers.set(transfer.id, transfer);
    this.speedWindows.set(transfer.id, []);
    this.onUpdate({ ...transfer });

    const sendState: SendState = {
      file,
      transfer,
      paused: false,
      cancelled: false,
      chunkIndex: 0,
      totalChunks,
      peerId,
    };

    this.sendStates.set(fileId, sendState);

    // Send metadata first
    const metadata: TransferMetadata = {
      kind: 'metadata',
      fileId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type || 'application/octet-stream',
      totalChunks,
      thumbnail,
    };

    this.peerService.sendToPeer(peerId, metadata);
    this.updateTransfer(transfer.id, { status: 'transferring' });

    // Start chunked send
    await this.sendChunks(fileId);
  }

  private async sendChunks(fileId: string): Promise<void> {
    const state = this.sendStates.get(fileId);
    if (!state) return;

    const { file, transfer, totalChunks, peerId } = state;

    while (state.chunkIndex < totalChunks) {
      if (state.cancelled) {
        this.updateTransfer(transfer.id, { status: 'cancelled' });
        return;
      }

      if (state.paused) {
        // Wait until resumed
        await new Promise<void>((resolve) => {
          const check = () => {
            if (!state.paused || state.cancelled) {
              resolve();
            } else {
              setTimeout(check, 200);
            }
          };
          check();
        });
        continue;
      }

      const start = state.chunkIndex * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const slice = file.slice(start, end);
      const arrayBuffer = await slice.arrayBuffer();
      const base64 = this.arrayBufferToBase64(arrayBuffer);

      const chunk: TransferChunk = {
        kind: 'chunk',
        fileId,
        chunkIndex: state.chunkIndex,
        data: base64,
      };

      const sent = this.peerService.sendToPeer(peerId, chunk);
      if (!sent) {
        this.updateTransfer(transfer.id, { status: 'failed', error: 'Connection lost' });
        this.sendStates.delete(fileId);
        return;
      }

      state.chunkIndex++;
      const bytes = end - start;
      const newBytesTransferred = state.chunkIndex * CHUNK_SIZE;
      const actualBytes = Math.min(newBytesTransferred, file.size);

      // Update speed window
      const window = this.speedWindows.get(transfer.id) ?? [];
      const now = Date.now();
      window.push({ bytes, time: now });
      // Keep only last second
      const cutoff = now - SPEED_WINDOW_MS;
      const recentWindow = window.filter((e) => e.time > cutoff);
      this.speedWindows.set(transfer.id, recentWindow);

      const speed = recentWindow.reduce((acc, e) => acc + e.bytes, 0); // bytes/sec
      const remaining = file.size - actualBytes;
      const eta = speed > 0 ? Math.ceil(remaining / speed) : -1;

      this.updateTransfer(transfer.id, {
        bytesTransferred: actualBytes,
        speed,
        eta,
      });

      // Yield to event loop to prevent UI freezing
      if (state.chunkIndex % 16 === 0) {
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    if (!state.cancelled) {
      this.updateTransfer(transfer.id, {
        status: 'completed',
        bytesTransferred: file.size,
        speed: 0,
        eta: 0,
        completedAt: Date.now(),
      });
    }

    this.sendStates.delete(fileId);
  }

  // ─── Receive ──────────────────────────────────────────────────────────────

  handleIncoming(peerId: string, peerLabel: string, msg: TransferProtocolMessage): void {
    if (msg.kind === 'metadata') {
      this.handleMetadata(peerId, peerLabel, msg);
    } else if (msg.kind === 'chunk') {
      this.handleChunk(msg);
    } else if (msg.kind === 'control') {
      this.handleControl(peerId, msg);
    }
  }

  private handleMetadata(
    peerId: string,
    peerLabel: string,
    meta: TransferMetadata
  ): void {
    const transfer: FileTransfer = {
      id: nanoid(),
      fileId: meta.fileId,
      fileName: meta.fileName,
      fileSize: meta.fileSize,
      fileType: meta.fileType,
      direction: 'receive',
      peerId,
      peerLabel,
      status: 'transferring',
      bytesTransferred: 0,
      speed: 0,
      eta: -1,
      startedAt: Date.now(),
      thumbnail: meta.thumbnail,
    };

    this.transfers.set(transfer.id, transfer);
    this.speedWindows.set(transfer.id, []);
    this.onUpdate({ ...transfer });

    this.receiveStates.set(meta.fileId, {
      transfer,
      chunks: new Map(),
      totalChunks: meta.totalChunks,
      cancelled: false,
    });
  }

  private handleChunk(chunk: TransferChunk): void {
    const state = this.receiveStates.get(chunk.fileId);
    if (!state || state.cancelled) return;

    state.chunks.set(chunk.chunkIndex, chunk.data);

    const bytesTransferred = state.chunks.size * CHUNK_SIZE;
    const actualBytes = Math.min(bytesTransferred, state.transfer.fileSize);

    // Speed tracking
    const window = this.speedWindows.get(state.transfer.id) ?? [];
    const now = Date.now();
    const chunkBytes = Math.ceil(
      state.transfer.fileSize / state.totalChunks
    );
    window.push({ bytes: chunkBytes, time: now });
    const cutoff = now - SPEED_WINDOW_MS;
    const recentWindow = window.filter((e) => e.time > cutoff);
    this.speedWindows.set(state.transfer.id, recentWindow);
    const speed = recentWindow.reduce((acc, e) => acc + e.bytes, 0);
    const remaining = state.transfer.fileSize - actualBytes;
    const eta = speed > 0 ? Math.ceil(remaining / speed) : -1;

    this.updateTransfer(state.transfer.id, {
      bytesTransferred: actualBytes,
      speed,
      eta,
    });

    if (state.chunks.size === state.totalChunks) {
      this.assembleFile(state);
    }
  }

  private handleControl(_peerId: string, control: TransferControl): void {
    if (control.action === 'cancel') {
      const state = this.receiveStates.get(control.fileId);
      if (state) {
        state.cancelled = true;
        this.updateTransfer(state.transfer.id, { status: 'cancelled' });
        this.receiveStates.delete(control.fileId);
      }
    }
  }

  private assembleFile(state: ReceiveState): void {
    const { transfer, chunks, totalChunks } = state;

    const binaryChunks: ArrayBuffer[] = [];
    for (let i = 0; i < totalChunks; i++) {
      const base64 = chunks.get(i);
      if (!base64) {
        this.updateTransfer(transfer.id, { status: 'failed', error: 'Missing chunk' });
        return;
      }
      binaryChunks.push(this.base64ToUint8Array(base64).buffer as ArrayBuffer);
    }

    const blob = new Blob(binaryChunks, { type: transfer.fileType });
    const objectUrl = URL.createObjectURL(blob);

    this.updateTransfer(transfer.id, {
      status: 'completed',
      bytesTransferred: transfer.fileSize,
      speed: 0,
      eta: 0,
      completedAt: Date.now(),
      objectUrl,
    });

    this.receiveStates.delete(transfer.fileId);
    this.onComplete(transfer.id, objectUrl, transfer.fileName);
  }

  // ─── Control ─────────────────────────────────────────────────────────────

  cancelTransfer(transferId: string): void {
    const transfer = this.transfers.get(transferId);
    if (!transfer) return;

    if (transfer.direction === 'send') {
      const state = this.sendStates.get(transfer.fileId);
      if (state) {
        state.cancelled = true;
        // Notify receiver
        const control: TransferControl = {
          kind: 'control',
          fileId: transfer.fileId,
          action: 'cancel',
        };
        this.peerService.sendToPeer(transfer.peerId, control);
      }
    } else {
      const state = this.receiveStates.get(transfer.fileId);
      if (state) {
        state.cancelled = true;
        this.receiveStates.delete(transfer.fileId);
      }
    }

    this.updateTransfer(transferId, { status: 'cancelled' });
  }

  pauseTransfer(transferId: string): void {
    const transfer = this.transfers.get(transferId);
    if (!transfer || transfer.direction !== 'send') return;
    const state = this.sendStates.get(transfer.fileId);
    if (state) {
      state.paused = true;
      this.updateTransfer(transferId, { status: 'paused' });
    }
  }

  resumeTransfer(transferId: string): void {
    const transfer = this.transfers.get(transferId);
    if (!transfer || transfer.direction !== 'send') return;
    const state = this.sendStates.get(transfer.fileId);
    if (state) {
      state.paused = false;
      this.updateTransfer(transferId, { status: 'transferring' });
    }
  }

  getTransfer(transferId: string): FileTransfer | undefined {
    return this.transfers.get(transferId);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private updateTransfer(id: string, updates: Partial<FileTransfer>): void {
    const transfer = this.transfers.get(id);
    if (!transfer) return;
    Object.assign(transfer, updates);
    this.onUpdate({ ...transfer });
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToUint8Array(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
}
