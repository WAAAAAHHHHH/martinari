import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { RoomProvider, useRoomContext } from '../context/RoomContext.js';
import { RoomHeader } from '../components/RoomHeader.js';
import { DropZone } from '../components/DropZone.js';
import { PeerList } from '../components/PeerList.js';
import { TransferList } from '../components/TransferList.js';
import { isValidRoomCode } from '../utils/validateCode.js';
import { Button } from '../components/ui/Button.js';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

function RoomPageInner({ code }: { code: string }) {
  const navigate = useNavigate();
  const { 
    state, joinRoom, leaveRoom, sendFiles, requestSendFiles, 
    acceptBatch, rejectBatch, cancelTransfer, pauseTransfer, 
    resumeTransfer, clearTransfers 
  } = useRoomContext();

  const hasRemotePeer = state.peers.some((p) => !p.isLocal);

  useEffect(() => {
    let active = true;
    // StrictMode calls effect twice — only join if still mounted
    const t = setTimeout(() => {
      if (active) joinRoom(code);
    }, 0);
    return () => {
      active = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const [pendingSend, setPendingSend] = useState<File[] | null>(null);

  const handleLeave = () => { leaveRoom(); navigate('/'); };
  const handleFiles = (files: File[]) => { if (hasRemotePeer) setPendingSend(files); };

  const confirmSend = () => {
    if (pendingSend) {
      requestSendFiles(pendingSend);
      setPendingSend(null);
    }
  };

  const cancelSend = () => {
    setPendingSend(null);
  };

  const incomingBatch = state.incomingBatches?.[0];

  return (
    <div className="flex flex-col min-h-screen">
      <RoomHeader roomCode={state.code || code} connectionStatus={state.connectionStatus} onLeave={handleLeave} />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6">
        {/* Error banner */}
        {state.connectionStatus === 'error' && state.errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 rounded-xl bg-danger-dim border border-danger/20 text-danger text-sm"
          >
            {state.errorMessage}
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5">
          {/* Left */}
          <div className="flex flex-col gap-4">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <DropZone onFiles={handleFiles} disabled={!hasRemotePeer} hasRecipient={hasRemotePeer} />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <PeerList peers={state.peers} />
            </motion.div>
            {!hasRemotePeer && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="card p-4 text-center"
              >
                <p className="text-xs text-muted leading-relaxed">
                  Share the room code above — your peer can join from any browser.
                </p>
              </motion.div>
            )}
          </div>

          {/* Right — transfers */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="card p-5"
            style={{ minHeight: 400 }}
          >
            <TransferList
              transfers={state.transfers}
              onCancel={cancelTransfer}
              onPause={pauseTransfer}
              onResume={resumeTransfer}
              onClear={clearTransfers}
            />
          </motion.div>
        </div>
      </main>

      {/* Sender Confirmation Modal */}
      <AnimatePresence>
        {pendingSend && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="card p-6 max-w-sm w-full text-center"
            >
              <h3 className="text-lg font-semibold text-primary mb-2">Send Files</h3>
              <p className="text-sm text-secondary mb-6">
                You are about to send {pendingSend.length} files. Do you want to proceed?
              </p>
              <div className="flex gap-3">
                <Button variant="secondary" fullWidth onClick={cancelSend}>Cancel</Button>
                <Button variant="primary" fullWidth onClick={confirmSend}>Proceed</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Receiver Confirmation Modal */}
      <AnimatePresence>
        {incomingBatch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="card p-6 max-w-sm w-full text-center"
            >
              <h3 className="text-lg font-semibold text-primary mb-2">Receive Files</h3>
              <p className="text-sm text-secondary mb-6">
                {incomingBatch.peerLabel} wants to send you {incomingBatch.fileCount} files. Do you want to proceed?
              </p>
              <div className="flex gap-3">
                <Button variant="secondary" fullWidth onClick={() => rejectBatch(incomingBatch.batchId, incomingBatch.peerId)}>Reject</Button>
                <Button variant="primary" fullWidth onClick={() => acceptBatch(incomingBatch.batchId, incomingBatch.peerId)}>Proceed</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function RoomPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (!code || !isValidRoomCode(code)) { navigate('/', { replace: true }); return; }
    const upper = code.toUpperCase();
    fetch(`${API_BASE}/api/rooms/${upper}`)
      .then((r) => r.json())
      .then((d: { exists?: boolean }) => { if (!d.exists) navigate('/?error=not_found', { replace: true }); })
      .catch(() => { /* proceed */ });
  }, [code, navigate]);

  if (!code || !isValidRoomCode(code)) return null;

  return (
    <RoomProvider>
      <RoomPageInner code={code.toUpperCase()} />
    </RoomProvider>
  );
}
