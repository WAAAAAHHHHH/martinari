import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { TransferCard } from './TransferCard.js';
import { Button } from './ui/Button.js';
import type { FileTransfer } from '../types/index.js';
import { useLocale } from '../i18n/useLocale.js';

type FilterTab = 'all' | 'send' | 'receive';

interface TransferListProps {
  transfers: FileTransfer[];
  onCancel: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onClear: () => void;
}

export function TransferList({ transfers, onCancel, onPause, onResume, onClear }: TransferListProps) {
  const [tab, setTab] = useState<FilterTab>('all');
  const { t } = useLocale();

  const filtered = tab === 'all' ? transfers : transfers.filter((t) => t.direction === tab);
  const hasFinished = transfers.some((t) =>
    t.status === 'completed' || t.status === 'cancelled' || t.status === 'failed'
  );

  const handleDownload = (id: string) => {
    const t = transfers.find((x) => x.id === id);
    if (t?.objectUrl) {
      const a = document.createElement('a');
      a.href = t.objectUrl;
      a.download = t.fileName;
      a.click();
    }
  };

  const tabItems: { key: FilterTab; label: string; icon?: React.ReactNode; count?: number }[] = [
    { key: 'all', label: t('transfer_all') },
    { key: 'send', label: t('transfer_sent'), icon: <ArrowUp className="w-3 h-3" />, count: transfers.filter((t) => t.direction === 'send').length },
    { key: 'receive', label: t('transfer_received'), icon: <ArrowDown className="w-3 h-3" />, count: transfers.filter((t) => t.direction === 'receive').length },
  ];

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-0.5">
          {tabItems.map(({ key, label, icon, count }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              id={`tab-transfers-${key}`}
              className={[
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150',
                tab === key
                  ? 'bg-white/10 text-white border border-white/20'
                  : 'text-secondary hover:text-white/80 hover:bg-white/5',
              ].join(' ')}
            >
              {icon}
              {label}
              {typeof count === 'number' && count > 0 && (
                <span className={tab === key ? 'text-accent/60' : 'text-muted'}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>
        {hasFinished && (
          <Button variant="ghost" size="sm" icon={<Trash2 className="w-3.5 h-3.5" />} onClick={onClear} id="btn-clear">
            {t('transfer_clear')}
          </Button>
        )}
      </div>

      {/* List */}
      <div className="flex flex-col gap-2 flex-1 overflow-y-auto no-scrollbar">
        {filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center gap-3 py-16 text-center"
          >
            <div className="w-10 h-10 rounded-xl bg-bg-elevated border border-border flex items-center justify-center text-xl">
              {tab === 'send' ? '↑' : tab === 'receive' ? '↓' : '⇅'}
            </div>
            <p className="text-secondary text-sm">
              {tab === 'all' ? t('transfer_none') : tab === 'send' ? t('transfer_none_sent') : t('transfer_none_received')}
            </p>
          </motion.div>
        ) : (
          <AnimatePresence initial={false}>
            {filtered.map((t) => (
              <TransferCard
                key={t.id}
                transfer={t}
                onCancel={t.status === 'transferring' || t.status === 'paused' ? onCancel : undefined}
                onPause={t.status === 'transferring' && t.direction === 'send' ? onPause : undefined}
                onResume={t.status === 'paused' && t.direction === 'send' ? onResume : undefined}
                onDownload={handleDownload}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
