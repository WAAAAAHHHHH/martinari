import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, File, Image, Video, Music, Archive } from 'lucide-react';
import { Button } from './ui/Button.js';
import { useLocale } from '../i18n/useLocale.js';
import type { FileTransfer } from '../types/index.js';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function FileTypeIcon({ type }: { type: string }) {
  if (type.startsWith('image/')) return <Image className="w-6 h-6 text-blue-400" />;
  if (type.startsWith('video/')) return <Video className="w-6 h-6 text-purple-400" />;
  if (type.startsWith('audio/')) return <Music className="w-6 h-6 text-green-400" />;
  if (type.includes('zip') || type.includes('tar') || type.includes('rar') || type.includes('7z') || type.includes('gzip'))
    return <Archive className="w-6 h-6 text-yellow-400" />;
  return <File className="w-6 h-6 text-secondary" />;
}

interface IncomingTransferModalProps {
  transfer: FileTransfer;
  onAccept: () => void;
  onDecline: () => void;
}

export function IncomingTransferModal({ transfer, onAccept, onDecline }: IncomingTransferModalProps) {
  const { t } = useLocale();

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onDecline}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm pointer-events-auto"
      />

      <motion.div
        key="modal"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
      >
        <div className="card w-full max-w-sm pointer-events-auto overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-success-dim border border-success/20 flex items-center justify-center">
                <Download className="w-4 h-4 text-success animate-bounce" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-primary">{t('incoming_title')}</h2>
                <p className="text-xs text-muted">{t('transfer_from')} {transfer.peerLabel}</p>
              </div>
            </div>
            <button
              onClick={onDecline}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-secondary hover:text-primary hover:bg-white/5 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 flex flex-col items-center gap-4 text-center">
            {transfer.thumbnail ? (
              <div className="w-20 h-20 rounded-xl overflow-hidden border border-white/10 shadow-lg">
                <img src={transfer.thumbnail} alt="" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-xl bg-bg-elevated border border-border flex items-center justify-center">
                <FileTypeIcon type={transfer.fileType} />
              </div>
            )}

            <div className="w-full">
              <p className="text-sm font-semibold text-primary truncate max-w-xs mx-auto" title={transfer.fileName}>
                {transfer.fileName}
              </p>
              <p className="text-xs text-muted mt-1">{formatSize(transfer.fileSize)}</p>
            </div>
            
            <p className="text-xs text-secondary leading-relaxed bg-white/5 border border-white/5 px-3 py-2 rounded-lg">
              {t('incoming_subtitle')}
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
            <Button variant="ghost" size="sm" onClick={onDecline}>
              {t('incoming_decline')}
            </Button>
            <Button variant="primary" size="sm" onClick={onAccept}>
              {t('incoming_accept')}
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
