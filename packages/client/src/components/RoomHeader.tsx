import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, Check, LogOut, Loader2, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from './ui/Button.js';
import { Badge } from './ui/Badge.js';
import type { RoomConnectionStatus } from '../types/index.js';
import { useLocale } from '../i18n/useLocale.js';

interface RoomHeaderProps {
  roomCode: string;
  connectionStatus: RoomConnectionStatus;
  onLeave: () => void;
}

export function RoomHeader({ roomCode, connectionStatus, onLeave }: RoomHeaderProps) {
  const [copied, setCopied] = useState(false);
  const { t, toggleLocale } = useLocale();

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* fallback */ }
  };

  const statusBadge = () => {
    switch (connectionStatus) {
      case 'connected': return <Badge variant="success" dot pulse>{t('header_status_connected')}</Badge>;
      case 'connecting': return <Badge variant="gold" dot>{t('header_status_connecting')}</Badge>;
      case 'reconnecting': return <Badge variant="gold" dot pulse>{t('header_status_reconnecting')}</Badge>;
      case 'disconnected': case 'error': return <Badge variant="danger" dot>{t('header_status_error')}</Badge>;
      default: return null;
    }
  };

  return (
    <header className="bg-bg-elevated border-b border-border sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity flex-shrink-0" id="header-logo">
          <img src="/icon.jpg" alt="Martinari" className="w-6 h-6 rounded-md object-cover" />
          <span className="font-semibold text-primary text-sm tracking-tight hidden sm:block">Martinari</span>
        </Link>

        <div className="w-px h-4 bg-border" />

        {/* Room code */}
        <button
          onClick={copyCode}
          id="btn-copy-room-code"
          aria-label={`Copy room code ${roomCode}`}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bg-card border border-border hover:border-border-strong transition-all group"
        >
          <span className="text-xs text-muted group-hover:text-secondary transition-colors">Room</span>
          <span className="room-code text-primary text-sm">{roomCode}</span>
          <motion.span animate={{ scale: copied ? 1.2 : 1 }} className="text-muted">
            {copied
              ? <Check className="w-3.5 h-3.5 text-success" />
              : <Copy className="w-3.5 h-3.5" />}
          </motion.span>
        </button>

        <div className="flex-1" />

        <div className="hidden sm:block">{statusBadge()}</div>
        <div className="sm:hidden">
          {connectionStatus === 'connecting' || connectionStatus === 'reconnecting'
            ? <Loader2 className="w-4 h-4 text-gold animate-spin" />
            : connectionStatus === 'connected'
            ? <span className="w-2 h-2 rounded-full bg-success inline-block" />
            : <span className="w-2 h-2 rounded-full bg-danger inline-block" />}
        </div>

        <button
          onClick={toggleLocale}
          id="btn-lang-toggle-room"
          className="flex items-center gap-1 text-xs text-secondary hover:text-primary transition-colors px-1.5 py-1 rounded-md hover:bg-white/5"
          title="Change language"
        >
          <Globe className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t('lang_toggle')}</span>
        </button>
        <Button variant="ghost" size="sm" icon={<LogOut className="w-3.5 h-3.5" />} onClick={onLeave}
          id="btn-leave-room" className="hidden sm:inline-flex">
          {t('header_leave')}
        </Button>
        <Button variant="ghost" size="sm" onClick={onLeave} id="btn-leave-mobile" className="sm:hidden !px-2">
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}
