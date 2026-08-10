import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users } from 'lucide-react';
import { Avatar } from './ui/Avatar.js';
import type { Peer } from '../types/index.js';
import { useLocale } from '../i18n/useLocale.js';

interface PeerListProps {
  peers: Peer[];
}

export function PeerList({ peers }: PeerListProps) {
  const { t } = useLocale();

  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-3.5 h-3.5 text-secondary" strokeWidth={2} />
        <span className="section-label">{t('peer_participants')}</span>
        <span className="ml-auto text-xs font-mono text-muted">{peers.length}</span>
      </div>

      <div className="flex flex-col gap-1">
        <AnimatePresence initial={false}>
          {peers.map((peer) => (
            <motion.div
              key={peer.id}
              layout
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-surface transition-colors"
            >
              <Avatar label={peer.label} isLocal={peer.isLocal} size="sm" status={peer.connectionStatus} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-primary font-medium truncate">{peer.label}</p>
                <p className="text-xs text-muted capitalize leading-none mt-0.5">
                  {peer.isLocal ? t('peer_this_device') : (peer.connectionStatus === 'connecting' ? t('peer_connecting') : peer.connectionStatus === 'failed' ? t('peer_failed') : t('peer_connected'))}
                </p>
              </div>
              {peer.isLocal && (
                <span className="chip">{t('peer_you')}</span>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {peers.length <= 1 && (
          <p className="text-xs text-muted text-center py-2 px-2 mt-1">
            {t('peer_invite_hint')}
          </p>
        )}
      </div>
    </div>
  );
}
