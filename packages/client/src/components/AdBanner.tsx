import React from 'react';
import { Twitch } from 'lucide-react';

export function AdBanner() {
  return (
    <div className="flex flex-col gap-4 w-full max-w-[320px] mx-auto my-4">
      <a 
        href="https://www.twitch.tv/nuveii" 
        target="_blank" 
        rel="noopener noreferrer"
        className="flex flex-col items-center justify-center p-4 border border-dashed border-border hover:border-primary/50 transition-colors rounded-xl bg-bg-elevated/50 hover:bg-bg-elevated text-center w-full min-h-[80px] group cursor-pointer"
      >
        <p className="text-sm font-semibold text-secondary group-hover:text-primary transition-colors">
          Support nuveii!
        </p>
        <p className="text-xs text-muted mt-2 flex items-center gap-1.5 group-hover:text-secondary transition-colors">
          <Twitch className="w-3 h-3" />
          Twitch
        </p>
      </a>

      <a 
        href="https://www.twitch.tv/abolishegirls" 
        target="_blank" 
        rel="noopener noreferrer"
        className="flex flex-col items-center justify-center p-4 border border-dashed border-border hover:border-primary/50 transition-colors rounded-xl bg-bg-elevated/50 hover:bg-bg-elevated text-center w-full min-h-[80px] group cursor-pointer"
      >
        <p className="text-sm font-semibold text-secondary group-hover:text-primary transition-colors">
          Support abolishegirls!
        </p>
        <p className="text-xs text-muted mt-2 flex items-center gap-1.5 group-hover:text-secondary transition-colors">
          <Twitch className="w-3 h-3" />
          Twitch
        </p>
      </a>
    </div>
  );
}
