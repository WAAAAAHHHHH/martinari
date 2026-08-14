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
                className="card p-4 text-center flex flex-col gap-3"
              >
                <p className="text-xs text-muted leading-relaxed">
                  {t('room_share_hint')}
                </p>
                <div className="flex flex-col gap-2 mt-1">
                  <div className="grid grid-cols-2 gap-2">
                    {/* WhatsApp */}
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(t('room_share_message') + `${window.location.origin}/room/${code}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 transition-all border border-[#25D366]/20"
                    >
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-11.507c-.124-.208-.464-.33-.978-.588-.514-.258-3.04-1.502-3.515-1.673-.475-.171-.822-.258-1.169.258-.347.515-1.345 1.672-1.649 2.018-.303.344-.607.387-1.12.129-.514-.258-2.172-.8-4.137-2.555-1.53-1.366-2.563-3.053-2.863-3.568-.3-.515-.032-.793.226-1.05.232-.23.514-.599.771-.899.258-.3.343-.515.514-.859.172-.343.086-.644-.043-.901-.129-.258-1.169-2.813-1.602-3.854-.423-1.017-.852-.876-1.169-.893-.303-.016-.65-.017-1-.017-.347 0-.912.13-1.389.654-.477.524-1.822 1.782-1.822 4.347 0 2.565 1.864 5.044 2.123 5.387.259.343 3.669 5.602 8.89 7.857 1.242.536 2.212.856 2.969 1.096 1.248.396 2.384.341 3.282.206.997-.15 3.04-1.242 3.47-2.443.43-1.202.43-2.233.3-2.447z" />
                      </svg>
                      {t('room_share_whatsapp')}
                    </a>

                    {/* Telegram */}
                    <a
                      href={`https://t.me/share/url?url=${encodeURIComponent(`${window.location.origin}/room/${code}`)}&text=${encodeURIComponent(t('room_share_message'))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold bg-[#0088cc]/10 text-[#0088cc] hover:bg-[#0088cc]/20 transition-all border border-[#0088cc]/20"
                    >
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M9.78 18.65l.28-4.28 7.68-6.92c.34-.31-.07-.47-.52-.17L7.69 13.2 3.53 11.9c-.9-.28-.92-.9.19-1.33l16.27-6.27c.75-.28 1.4.17 1.15 1.28l-2.77 13.05c-.21 1.03-.82 1.28-1.68.8l-4.22-3.11-2.03 1.95c-.23.23-.42.42-.85.42z" />
                      </svg>
                      {t('room_share_telegram')}
                    </a>

                    {/* X */}
                    <a
                      href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(t('room_share_message') + `${window.location.origin}/room/${code}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold bg-white/5 text-primary hover:bg-white/10 transition-all border border-border"
                    >
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                      {t('room_share_x')}
                    </a>

                    {/* SMS */}
                    <a
                      href={`sms:?body=${encodeURIComponent(t('room_share_message') + `${window.location.origin}/room/${code}`)}`}
                      className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold bg-[#007AFF]/10 text-[#007AFF] hover:bg-[#007AFF]/20 transition-all border border-[#007AFF]/20"
                    >
                      <svg className="w-3.5 h-3.5 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                      </svg>
                      {t('room_share_sms')}
                    </a>
                  </div>
                  
                  {/* Share / Copy Link button */}
                  <button
                    onClick={async () => {
                      const shareUrl = `${window.location.origin}/room/${code}`;
                      const shareText = t('room_share_message');
                      if (navigator.share) {
                        try {
                          await navigator.share({
                            title: 'Martinari P2P Room',
                            text: shareText,
                            url: shareUrl,
                          });
                        } catch (err) { /* ignore cancel */ }
                      } else {
                        try {
                          await navigator.clipboard.writeText(`${shareText}${shareUrl}`);
                          alert(t('room_share_copied'));
                        } catch (err) {
                          console.error(err);
                        }
                      }
                    }}
                    className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-white/5 text-primary hover:bg-white/10 transition-all border border-border"
                  >
                    <svg className="w-3.5 h-3.5 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2">
                      <circle cx="18" cy="5" r="3"/>
                      <circle cx="6" cy="12" r="3"/>
                      <circle cx="18" cy="19" r="3"/>
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                    </svg>
                    {t('room_share_native')}
                  </button>
                </div>
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

function Loading({ text }: { text: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F1115]">
      <div className="flex flex-col items-center gap-3 text-secondary animate-pulse-slow">
        <svg className="w-8 h-8 animate-spin text-white/70" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-sm font-medium">{text}</span>
      </div>
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

  if (!code || !isValidRoomCode(code) || isValidating) {
    return <Loading text={t('header_status_connecting')} />;
  }

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
