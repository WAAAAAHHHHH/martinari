import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Plus, File, Image, Video, Music, Archive } from 'lucide-react';
import { Button } from './ui/Button.js';
import { useLocale } from '../i18n/useLocale.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function FileTypeIcon({ type }: { type: string }) {
  if (type.startsWith('image/')) return <Image className="w-5 h-5 text-blue-400" />;
  if (type.startsWith('video/')) return <Video className="w-5 h-5 text-purple-400" />;
  if (type.startsWith('audio/')) return <Music className="w-5 h-5 text-green-400" />;
  if (type.includes('zip') || type.includes('tar') || type.includes('rar') || type.includes('7z') || type.includes('gzip'))
    return <Archive className="w-5 h-5 text-yellow-400" />;
  return <File className="w-5 h-5 text-secondary" />;
}

// ─── Thumbnail preview ────────────────────────────────────────────────────────

function FileThumbnail({ file }: { file: File }) {
  const [url, setUrl] = useState<string | null>(null);

  React.useEffect(() => {
    if (!file.type.startsWith('image/')) return;
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  if (url) {
    return (
      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border border-white/10">
        <img src={url} alt={file.name} className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div className="w-10 h-10 rounded-lg bg-bg-elevated border border-border flex items-center justify-center flex-shrink-0">
      <FileTypeIcon type={file.type} />
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface FileStagingModalProps {
  files: File[];
  onSend: (files: File[]) => void;
  onClose: () => void;
}

export function FileStagingModal({ files: initialFiles, onSend, onClose }: FileStagingModalProps) {
  const { t } = useLocale();
  const [files, setFiles] = useState<File[]>(initialFiles);
  const addMoreRef = useRef<HTMLInputElement>(null);

  const handleRemove = (index: number) => {
    const next = files.filter((_, i) => i !== index);
    if (next.length === 0) {
      onClose();
    } else {
      setFiles(next);
    }
  };

  const handleAddMore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files ?? []);
    if (newFiles.length > 0) {
      setFiles((prev) => [...prev, ...newFiles]);
    }
    e.target.value = '';
  };

  const totalSize = files.reduce((acc, f) => acc + f.size, 0);

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm pointer-events-auto"
      />

      {/* Modal */}
      <motion.div
        key="modal"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
      >
        <div className="card w-full max-w-md pointer-events-auto overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-border">
            <div>
              <h2 className="text-base font-semibold text-primary">{t('staging_title')}</h2>
              <p className="text-xs text-muted mt-0.5">{t('staging_subtitle')} · {formatSize(totalSize)}</p>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-secondary hover:text-primary hover:bg-white/5 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* File list */}
          <div className="p-3 flex flex-col gap-2 max-h-72 overflow-y-auto">
            <AnimatePresence initial={false}>
              {files.map((file, i) => (
                <motion.div
                  key={`${file.name}-${file.size}-${i}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-bg-elevated/60 border border-border/50 group"
                >
                  <FileThumbnail file={file} />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary truncate">{file.name}</p>
                    <p className="text-[11px] text-muted mt-0.5">{formatSize(file.size)}</p>
                  </div>

                  <button
                    onClick={() => handleRemove(i)}
                    className="w-6 h-6 rounded-md flex items-center justify-center text-muted hover:text-danger hover:bg-danger/10 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-2 p-4 border-t border-border">
            <input
              ref={addMoreRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleAddMore}
            />
            <Button
              variant="ghost"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => addMoreRef.current?.click()}
            >
              {t('staging_add_more')}
            </Button>
            <div className="flex-1" />
            <Button variant="ghost" size="sm" onClick={onClose}>
              {t('staging_cancel')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Send className="w-3.5 h-3.5" />}
              onClick={() => onSend(files)}
            >
              {t('staging_send')} ({files.length} {files.length === 1 ? t('staging_file') : t('staging_files')})
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
