import React, { useState } from 'react';
import { AlertTriangle, ShieldCheck, X } from 'lucide-react';

export const DemoNoticeBanner: React.FC = () => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="bg-amber-950/70 border-b border-amber-600/40 text-amber-200 px-4 py-2 text-xs md:text-sm backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
          <span>
            <strong className="font-semibold text-amber-300">DEMO SIMULATOR ONLY:</strong> All balances are
            <span className="font-bold underline decoration-amber-400 ml-1">Non-Real-Money Virtual Credits (VC)</span>.
            No cash betting, no real money deposits, no withdrawals, and no payment gateways.
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden sm:inline-flex items-center gap-1 bg-amber-900/60 border border-amber-700/50 text-amber-300 px-2 py-0.5 rounded text-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Virtual Credits Demo
          </span>
          <button
            onClick={() => setDismissed(true)}
            className="text-amber-400 hover:text-amber-100 p-0.5 rounded hover:bg-amber-800/40 transition-colors"
            title="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
