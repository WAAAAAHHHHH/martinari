import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { RoomProvider, useRoomContext } from '../context/RoomContext.js';
import { RoomHeader } from '../components/RoomHeader.js';
import { DropZone } from '../components/DropZone.js';
import { PeerList } from '../components/PeerList.js';
import { TransferList } from '../components/TransferList.js';
import { FileStagingModal } from '../components/FileStagingModal.js';
import { IncomingTransferModal } from '../components/IncomingTransferModal.js';
import { CompletedTransferModal } from '../components/CompletedTransferModal.js';
import { isValidRoomCode } from '../utils/validateCode.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { AdBanner } from '../components/AdBanner.js';
import { useLocale } from '../i18n/useLocale.js';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

function RoomPageInner({ code, password, creatorToken }: { code: string, password?: string, creatorToken?: string }) {
  const navigate = useNavigate();
  const { t } = useLocale();
  const { state, joinRoom, leaveRoom, sendFiles, cancelTransfer, pauseTransfer, resumeTransfer, clearTransfers, acceptTransfer } =
    useRoomContext();

  // ─── Staging state ───────────────────────────────────────────────────────
  const [stagedFiles, setStagedFiles] = useState<File[] | null>(null);

  // ─── Completed Prompts state ─────────────────────────────────────────────
  const [completedPrompts, setCompletedPrompts] = useState<string[]>([]);
  const [completedTransferToPrompt, setCompletedTransferToPrompt] = useState<any | null>(null);

  // Find incoming pending transfer
  const pendingIncoming = state.transfers.find(
    (t) => t.direction === 'receive' && t.status === 'pending'
  );

  // Trigger modal when a transfer completes
  useEffect(() => {
    const completedReceive = state.transfers.find(
      (t) => t.direction === 'receive' && t.status === 'completed' && t.objectUrl && !completedPrompts.includes(t.id)
    );
    if (completedReceive) {
      setCompletedTransferToPrompt(completedReceive);
      setCompletedPrompts((prev) => [...prev, completedReceive.id]);
    }
  }, [state.transfers, completedPrompts]);

  const handleDownload = (transfer: any) => {
    if (transfer.objectUrl) {
      const a = document.createElement('a');
      a.href = transfer.objectUrl;
      a.download = transfer.fileName;
      a.click();
    }
  };

  const hasRemotePeer = state.peers.some((p) => !p.isLocal);
  const isBroadcast = state.type === 'broadcast';
  const isDropDisabled = (!hasRemotePeer) || (isBroadcast && !state.isCreator);
  const disabledMessage = isBroadcast && !state.isCreator ? t('dropzone_broadcast_only') : undefined;

  useEffect(() => {
    let active = true;
    // StrictMode calls effect twice — only join if still mounted
    const t = setTimeout(() => {
      if (active) joinRoom(code, password, creatorToken);
    }, 0);
    return () => {
      active = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const handleLeave = () => { leaveRoom(); navigate('/'); };

  // When DropZone selects files, open staging modal instead of sending directly
  const handleFilesStaged = (files: File[]) => {
    if (hasRemotePeer && files.length > 0) {
      setStagedFiles(files);
    }
  };

  // User confirmed send from modal
  const handleConfirmSend = async (files: File[]) => {
    setStagedFiles(null);
    await sendFiles(files);
  };

  // User updated the list from inside the modal (add/remove)
  const handleUpdateStaged = (files: File[]) => {
    setStagedFiles(files.length > 0 ? files : null);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <RoomHeader roomCode={state.code || code} connectionStatus={state.connectionStatus} onLeave={handleLeave} />

      {/* File staging modal */}
      {stagedFiles && (
        <FileStagingModal
          files={stagedFiles}
          onSend={handleConfirmSend}
          onClose={() => setStagedFiles(null)}
        />
      )}

      {/* Incoming file prompt modal */}
      {pendingIncoming && (
        <IncomingTransferModal
          transfer={pendingIncoming}
          onAccept={() => acceptTransfer(pendingIncoming.id)}
          onDecline={() => cancelTransfer(pendingIncoming.id)}
        />
      )}

      {/* Completed file prompt modal */}
      {completedTransferToPrompt && (
        <CompletedTransferModal
          transfer={completedTransferToPrompt}
          onSave={() => {
            handleDownload(completedTransferToPrompt);
            setCompletedTransferToPrompt(null);
          }}
          onClose={() => setCompletedTransferToPrompt(null)}
        />
      )}

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
              <DropZone 
                onFiles={handleFilesStaged} 
                disabled={isDropDisabled} 
                hasRecipient={hasRemotePeer} 
                disabledMessage={disabledMessage} 
              />
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
                  {t('room_share_hint')}
                </p>
              </motion.div>
            )}
            
            <div className="mt-2">
              <AdBanner />
            </div>
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
              onAccept={acceptTransfer}
            />
          </motion.div>
        </div>
      </main>
    </div>
  );
}

export default function RoomPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { t } = useLocale();
  const [isValidating, setIsValidating] = React.useState(true);
  const [isProtected, setIsProtected] = React.useState(false);
  const [passwordEntered, setPasswordEntered] = React.useState(false);
  const [password, setPassword] = React.useState('');

  useEffect(() => {
    if (!code || !isValidRoomCode(code)) { navigate('/', { replace: true }); return; }
    const upper = code.toUpperCase();
    fetch(`${API_BASE}/api/rooms/${upper}`)
      .then((r) => r.json())
      .then((d: { exists?: boolean; isPasswordProtected?: boolean }) => { 
        if (!d.exists) { navigate('/?error=not_found', { replace: true }); return; }
        if (d.isPasswordProtected) {
          setIsProtected(true);
        } else {
          setPasswordEntered(true);
        }
        setIsValidating(false);
      })
      .catch(() => { setIsValidating(false); setPasswordEntered(true); });
  }, [code, navigate]);

  if (!code || !isValidRoomCode(code) || isValidating) return null;

  if (isProtected && !passwordEntered) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-6 w-full max-w-sm flex flex-col gap-4">
          <h2 className="text-xl font-semibold text-primary">{t('room_password_title')}</h2>
          <p className="text-sm text-secondary">{t('room_password_subtitle')}</p>
          <Input
            type="password"
            placeholder={t('room_password_placeholder')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setPasswordEntered(true)}
          />
          <Button variant="primary" onClick={() => setPasswordEntered(true)}>{t('room_join_btn')}</Button>
        </motion.div>
      </div>
    );
  }

  const creatorToken = sessionStorage.getItem(`creatorToken_${code.toUpperCase()}`) || undefined;

  return (
    <RoomProvider>
      <RoomPageInner code={code.toUpperCase()} password={password} creatorToken={creatorToken} />
    </RoomProvider>
  );
}
