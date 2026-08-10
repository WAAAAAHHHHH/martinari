import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { RoomProvider, useRoomContext } from '../context/RoomContext.js';
import { RoomHeader } from '../components/RoomHeader.js';
import { DropZone } from '../components/DropZone.js';
import { PeerList } from '../components/PeerList.js';
import { TransferList } from '../components/TransferList.js';
import { isValidRoomCode } from '../utils/validateCode.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { AdBanner } from '../components/AdBanner.js';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

function RoomPageInner({ code, password, creatorToken }: { code: string, password?: string, creatorToken?: string }) {
  const navigate = useNavigate();
  const { state, joinRoom, leaveRoom, sendFiles, cancelTransfer, pauseTransfer, resumeTransfer, clearTransfers } =
    useRoomContext();

  const hasRemotePeer = state.peers.some((p) => !p.isLocal);
  const isBroadcast = state.type === 'broadcast';
  const isDropDisabled = (!hasRemotePeer) || (isBroadcast && !state.isCreator);
  const disabledMessage = isBroadcast && !state.isCreator ? 'Only the creator can send files in this broadcast room.' : undefined;

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
  const handleFiles = (files: File[]) => { if (hasRemotePeer) sendFiles(files); };

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
              <DropZone 
                onFiles={handleFiles} 
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
                  Share the room code above — your peer can join from any browser.
                </p>
              </motion.div>
            )}
            
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <AdBanner />
            </motion.div>
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
    </div>
  );
}

export default function RoomPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
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
          <h2 className="text-xl font-semibold text-primary">Room Password</h2>
          <p className="text-sm text-secondary">This room is protected by a password.</p>
          <Input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setPasswordEntered(true)}
          />
          <Button variant="primary" onClick={() => setPasswordEntered(true)}>Join Room</Button>
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
