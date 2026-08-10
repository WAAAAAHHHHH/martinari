import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FolderOpen } from 'lucide-react';
import { useDropZone } from '../hooks/useDropZone.js';
import { Button } from './ui/Button.js';

interface DropZoneProps {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  hasRecipient?: boolean;
  disabledMessage?: string;
}

export function DropZone({ onFiles, disabled = false, hasRecipient = false, disabledMessage }: DropZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const { isDragging, onDragEnter, onDragOver, onDragLeave, onDrop } = useDropZone({ onFiles });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) onFiles(files);
    e.target.value = '';
  };

  return (
    <div
      onDragEnter={disabled ? undefined : onDragEnter}
      onDragOver={disabled ? undefined : onDragOver}
      onDragLeave={disabled ? undefined : onDragLeave}
      onDrop={disabled ? undefined : onDrop}
      className={[
        'relative rounded-2xl transition-all duration-200',
        'border-2 border-dashed',
        isDragging && !disabled
          ? 'drag-active'
          : disabled
          ? 'border-[rgba(200,74,15,0.06)] bg-bg-card/40 opacity-60'
          : 'border-border hover:border-border-strong bg-bg-card',
        'cursor-default',
      ].filter(Boolean).join(' ')}
      style={{ minHeight: 220 }}
    >
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} id="file-picker" />
      <input
        ref={folderInputRef} type="file" multiple
        // @ts-expect-error webkitdirectory non-standard
        webkitdirectory="true"
        className="hidden" onChange={handleFileChange} id="folder-picker"
      />

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8">
        <AnimatePresence mode="wait">
          {isDragging ? (
            <motion.div
              key="drag"
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              className="flex flex-col items-center justify-center gap-3 py-16 text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                <Upload className="w-7 h-7 text-white" strokeWidth={1.5} />
              </div>
              <p className="text-primary font-semibold">Drop to send</p>
            </motion.div>
          ) : (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-bg-elevated border border-border flex items-center justify-center">
                <Upload className="w-6 h-6 text-secondary" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-primary/80 font-medium text-sm mb-0.5">
                  {disabled ? (disabledMessage || 'Waiting for someone to join...') : 'Drag & drop files here'}
                </p>
                {!disabled && <p className="text-muted text-xs">Images, videos, archives — any file type</p>}
              </div>
              {!disabled && (
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" icon={<Upload className="w-3.5 h-3.5" />}
                    onClick={() => fileInputRef.current?.click()} id="btn-browse-files">
                    Browse files
                  </Button>
                  <Button variant="ghost" size="sm" icon={<FolderOpen className="w-3.5 h-3.5" />}
                    onClick={() => folderInputRef.current?.click()} id="btn-browse-folder">
                    Folder
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
