import React from 'react';

export function AdBanner() {
  const adUnitId = import.meta.env.VITE_AADS_UNIT_ID;

  if (!adUnitId) {
    return (
      <div className="flex flex-col items-center justify-center p-4 border border-dashed border-border rounded-xl bg-bg-elevated/50 text-center w-full max-w-[320px] mx-auto my-4 h-[100px]">
        <p className="text-sm font-medium text-secondary">Advertisement Space</p>
        <p className="text-[10px] text-muted mt-1 px-4 leading-tight">Configure VITE_AADS_UNIT_ID to show ads</p>
      </div>
    );
  }

  return (
    <div className="flex justify-center w-full my-4 min-h-[100px]">
      <iframe 
        data-aa={adUnitId}
        src={`//ad.a-ads.com/${adUnitId}?size=320x100`}
        style={{ width: '320px', height: '100px', border: '0px', padding: 0, overflow: 'hidden', backgroundColor: 'transparent' }}
        title="A-Ads Banner"
        sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-top-navigation"
      />
    </div>
  );
}
