import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Plus, Hash, Instagram } from 'lucide-react';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

function isValidCode(code: string): boolean {
  return /^[A-HJ-NP-Z2-9]{6}$/i.test(code.trim());
}

const TEAM = [
  { handle: 'aboredloner', url: 'https://www.instagram.com/aboredloner/' },
  { handle: 'mertisyoo', url: 'https://www.instagram.com/mertisyoo/' },
  { handle: 'whyruevencheckinmyname', url: 'https://www.instagram.com/whyruevencheckinmyname/' },
];

function Logo({ size = 32 }: { size?: number }) {
  return (
    <img
      src="/icon.jpg"
      alt="Martinari"
      width={size}
      height={size}
      className="rounded-lg object-cover"
    />
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [transfers, setTransfers] = useState<number>(1437);

  useEffect(() => {
    fetch(`${API_BASE}/api/stats`)
      .then(res => res.json())
      .then(data => {
        if (data && typeof data.totalTransfers === 'number') {
          setTransfers(data.totalTransfers);
        }
      })
      .catch(err => console.error('Failed to fetch stats', err));
  }, []);

  const incrementStats = () => {
    // Optimistically update
    setTransfers(prev => prev + 1);
    fetch(`${API_BASE}/api/stats/increment`, { method: 'POST' }).catch(err => console.error('Failed to increment stats', err));
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/gi, '').slice(0, 6);
    setCode(val);
    setError('');
  };

  const handleCreate = async () => {
    setCreating(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/rooms`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to create room');
      const data = await res.json() as { code: string };
      
      incrementStats();

      navigate(`/room/${data.code}`);
    } catch {
      setError('Failed to create room');
      setCreating(false);
    }
  };

  const handleJoin = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) { setError('Enter a room code'); return; }
    if (!isValidCode(trimmed)) { setError('Invalid code — must be 6 characters'); return; }
    setJoining(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/rooms/${trimmed}`);
      const data = await res.json() as { exists?: boolean };
      if (!data.exists) { setError('Room not found'); setJoining(false); return; }
      
      incrementStats();

      navigate(`/room/${trimmed}`);
    } catch {
      navigate(`/room/${trimmed}`);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <nav className="border-b border-border bg-bg-elevated sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size={24} />
            <span className="font-semibold text-primary text-sm">Martinari</span>
          </div>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer"
            className="text-xs text-secondary hover:text-primary transition-colors">
            GitHub
          </a>
        </div>
      </nav>

      <main className="flex-1 flex flex-col justify-center max-w-4xl mx-auto px-6 py-20 w-full">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-16"
        >          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-6">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
            <span className="text-xs font-medium text-secondary">Transfers did since the launch: {transfers.toLocaleString()}</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-primary tracking-tight mb-4">
            Share files instantly.
          </h1>
          <p className="text-secondary text-base max-w-lg mx-auto">
            Direct browser-to-browser transfer using WebRTC. No servers, no accounts, no limits.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="card max-w-md mx-auto w-full p-6 sm:p-8"
        >
          <Button
            variant="primary"
            size="lg"
            fullWidth
            loading={creating}
            disabled={creating || joining}
            icon={<Plus className="w-4 h-4" />}
            onClick={handleCreate}
          >
            Create new room
          </Button>

          <div className="my-6 flex items-center gap-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted font-medium uppercase tracking-wider">Or join</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="flex flex-col gap-3">
            <Input
              placeholder="Room code"
              value={code}
              onChange={handleCodeChange}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              error={error}
              icon={<Hash className="w-4 h-4 text-muted" />}
              className="room-code text-center tracking-widest text-lg"
              maxLength={6}
            />
            <Button
              variant="secondary"
              size="lg"
              fullWidth
              loading={joining}
              disabled={creating || joining}
              iconRight={<ArrowRight className="w-4 h-4" />}
              onClick={handleJoin}
            >
              Join room
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-auto pt-20 pb-6 flex flex-col items-center gap-4 text-center"
        >
          <div className="flex flex-wrap items-center justify-center gap-1.5 text-[10px] text-muted/40 hover:text-muted transition-colors">
            <span>made by</span>
            {TEAM.map((member, i) => (
              <React.Fragment key={member.handle}>
                <a href={member.url} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                  {member.handle}
                </a>
                {i < TEAM.length - 1 && <span>·</span>}
              </React.Fragment>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/terms')} className="text-[10px] text-muted/40 hover:text-primary px-2 h-6">Terms of Service</Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/privacy')} className="text-[10px] text-muted/40 hover:text-primary px-2 h-6">Privacy Policy</Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/acceptable-use')} className="text-[10px] text-muted/40 hover:text-primary px-2 h-6">Acceptable Use</Button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
