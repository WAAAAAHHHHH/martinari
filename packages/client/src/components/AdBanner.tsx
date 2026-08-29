import React from 'react';
import { Twitch } from 'lucide-react';

export function AdBanner() {
  return (
    <div className="flex flex-col items-center justify-center p-4 border border-dashed border-border rounded-xl bg-bg-elevated/50 text-center w-full max-w-[320px] mx-auto my-4 min-h-[100px]">
      <p className="text-sm font-semibold text-secondary mb-3">
        Support these creators!
      </p>
      <div className="flex gap-4 w-full">
        <a 
          href="https://www.twitch.tv/nuveii" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex-1 flex flex-col items-center justify-center p-3 rounded-lg bg-bg-hover hover:bg-white/10 transition-colors group cursor-pointer"
        >
          <p className="text-xs font-medium text-secondary group-hover:text-primary transition-colors truncate w-full px-1">
            nuveii
          </p>
          <p className="text-[10px] text-muted mt-1 flex items-center gap-1 group-hover:text-secondary transition-colors">
            <Twitch className="w-3 h-3" />
            Twitch
          </p>
        </a>

        <a 
          href="https://www.twitch.tv/abolishegirls" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex-1 flex flex-col items-center justify-center p-3 rounded-lg bg-bg-hover hover:bg-white/10 transition-colors group cursor-pointer"
        >
          <p className="text-xs font-medium text-secondary group-hover:text-primary transition-colors truncate w-full px-1">
            abolishegirls
          </p>
          <p className="text-[10px] text-muted mt-1 flex items-center gap-1 group-hover:text-secondary transition-colors">
            <Twitch className="w-3 h-3" />
            Twitch
          </p>
        </a>
      </div>
    </div>
  );
}
