import React from 'react';
import { motion } from 'framer-motion';
import { X, Pause, Play, CheckCircle2, XCircle, AlertCircle, ArrowUp, ArrowDown } from 'lucide-react';
import { ProgressBar } from './ui/ProgressBar.js';
import { Button } from './ui/Button.js';
import type { FileTransfer } from '../types/index.js';

interface TransferCardProps {
  transfer: FileTransfer;
  onCancel?: (id: string) => void;
  onPause?: (id: string) => void;
  onResume?: (id: string) => void;
  onDownload?: (id: string) => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}
function formatSpeed(bps: number): string { return `${formatBytes(bps)}/s`; }
function formatEta(s: number): string {
  if (s < 0) return '—';
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.ceil(s / 60)}m`;
  return `${Math.ceil(s / 3600)}h`;
}

function getFileEmoji(type: string, name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (type.startsWith('image/')) return '🖼';
  if (type.startsWith('video/')) return '🎬';
  if (type.startsWith('audio/')) return '🎵';
  if (ext === 'pdf') return '📄';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return '🗜';
  if (['doc', 'docx'].includes(ext)) return '📝';
  if (['xls', 'xlsx'].includes(ext)) return '📊';
  return '📁';
}

export function TransferCard({ transfer, onCancel, onPause, onResume, onDownload }: TransferCardProps) {
  const progress = transfer.fileSize === 0 ? 100 : Math.round((transfer.bytesTransferred / transfer.fileSize) * 100);
  const isActive = transfer.status === 'transferring';
  const isPaused = transfer.status === 'paused';
  const isCompleted = transfer.status === 'completed';
  const isCancelled = transfer.status === 'cancelled';
  const isFailed = transfer.status === 'failed';
  const isFinished = isCompleted || isCancelled || isFailed;

  const pbVariant = isFailed ? 'danger' : isCompleted ? 'success' : 'accent';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ type: 'spring', stiffness: 350, damping: 32 }}
      className="card p-4 flex flex-col gap-3"
    >
      <div className="flex items-start gap-3">
        {/* File icon */}
        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-bg-elevated border border-border flex items-center justify-center text-base leading-none select-none overflow-hidden">
          {transfer.thumbnail ? (
            <img src={transfer.thumbnail} alt="" className="w-full h-full object-cover" />
          ) : (
            getFileEmoji(transfer.fileType, transfer.fileName)
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className={transfer.direction === 'send' ? 'text-accent' : 'text-success'}>
              {transfer.direction === 'send' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            </span>
            <p className="text-primary text-sm font-medium truncate" title={transfer.fileName}>
              {transfer.fileName}
            </p>
          </div>
          <p className="text-muted text-xs">
            {transfer.direction === 'send' ? 'To' : 'From'} {transfer.peerLabel} · {formatBytes(transfer.fileSize)}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {isCompleted && <CheckCircle2 className="w-4 h-4 text-success" />}
          {isFailed && <AlertCircle className="w-4 h-4 text-danger" />}
          {isCancelled && <XCircle className="w-4 h-4 text-secondary" />}

          {isActive && onPause && (
            <Button variant="ghost" size="sm" onClick={() => onPause(transfer.id)}
              id={`btn-pause-${transfer.id}`} aria-label="Pause"
              className="!h-7 !w-7 !px-0">
              <Pause className="w-3.5 h-3.5" />
            </Button>
          )}
          {isPaused && onResume && (
            <Button variant="ghost" size="sm" onClick={() => onResume(transfer.id)}
              id={`btn-resume-${transfer.id}`} aria-label="Resume"
              className="!h-7 !w-7 !px-0">
              <Play className="w-3.5 h-3.5" />
            </Button>
          )}
          {!isFinished && onCancel && (
            <Button variant="ghost" size="sm" onClick={() => onCancel(transfer.id)}
              id={`btn-cancel-${transfer.id}`} aria-label="Cancel"
              className="!h-7 !w-7 !px-0 hover:!text-danger">
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
          {isCompleted && transfer.direction === 'receive' && transfer.objectUrl && onDownload && (
            <Button variant="ghost" size="sm" onClick={() => onDownload(transfer.id)}
              id={`btn-dl-${transfer.id}`} className="!h-7 text-accent">
              Save
            </Button>
          )}
        </div>
      </div>

      {/* Progress */}
      {!isCancelled && !isFailed && (
        <div className="flex flex-col gap-1.5">
          <ProgressBar value={progress} variant={pbVariant} height="xs" />
          <div className="flex items-center justify-between text-xs text-muted">
            <span>{formatBytes(transfer.bytesTransferred)} / {formatBytes(transfer.fileSize)}</span>
            <div className="flex gap-3">
              {isActive && transfer.speed > 0 && (
                <><span>{formatSpeed(transfer.speed)}</span><span>{formatEta(transfer.eta)} left</span></>
              )}
              {isPaused && <span className="text-gold">Paused</span>}
              {isCompleted && <span className="text-success">Done</span>}
            </div>
          </div>
        </div>
      )}
      {isFailed && transfer.error && <p className="text-xs text-danger">{transfer.error}</p>}
      {isCancelled && <p className="text-xs text-muted">Cancelled</p>}
    </motion.div>
  );
}
