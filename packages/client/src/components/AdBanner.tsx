import React from 'react';
import { Instagram } from 'lucide-react';

export function AdBanner() {
  return (
    <a 
      href="https://www.instagram.com/martinari.ad/" 
      target="_blank" 
      rel="noopener noreferrer"
      className="flex flex-col items-center justify-center p-4 border border-dashed border-border hover:border-primary/50 transition-colors rounded-xl bg-bg-elevated/50 hover:bg-bg-elevated text-center w-full max-w-[320px] mx-auto my-4 min-h-[100px] group cursor-pointer"
    >
      <p className="text-sm font-semibold text-secondary group-hover:text-primary transition-colors">
        Advertise Here
      </p>
      <p className="text-xs text-muted mt-2 flex items-center gap-1.5 group-hover:text-secondary transition-colors">
        <Instagram className="w-3 h-3" />
        DM @martinari.ad on Instagram
      </p>
    </a>
  );
}
