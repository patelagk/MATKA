import React from 'react';
import { Market } from '../../types';
import { Clock, Play, CheckCircle, AlertOctagon, TrendingUp, Sparkles } from 'lucide-react';

interface MarketCardProps {
  market: Market;
  onSelectEntry: (market: Market) => void;
  onViewDetails?: (market: Market) => void;
}

export const MarketCard: React.FC<MarketCardProps> = ({ market, onSelectEntry, onViewDetails }) => {
  const isSettled = market.status === 'SETTLED' || market.resultStatus === 'SETTLED';
  const isOpen = market.isCurrentlyOpen ?? (market.status === 'OPEN' && !isSettled);

  // Format result display
  const resultParts = market.result ? market.result.split('-') : ['***', '**', '***'];
  const openPana = resultParts[0] || '***';
  const jodi = resultParts[1] || '**';
  const closePana = resultParts[2] || '***';

  return (
    <div className="bg-neutral-900 border border-neutral-800 hover:border-neutral-700/80 rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-all duration-200 hover:shadow-xl hover:shadow-amber-500/5 group relative overflow-hidden">
      {/* Glow highlight */}
      <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16 transition ${
        isOpen ? 'bg-emerald-500/10' : isSettled ? 'bg-purple-500/10' : 'bg-red-500/5'
      }`} />

      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded bg-neutral-800 text-neutral-400 border border-neutral-700/50 uppercase">
            {market.category || 'Regular'}
          </span>

          {isOpen ? (
            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-0.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              MARKET OPEN
            </span>
          ) : isSettled ? (
            <span className="flex items-center gap-1 text-xs font-bold text-purple-300 bg-purple-950/60 border border-purple-800/60 px-2.5 py-0.5 rounded-full">
              <CheckCircle className="w-3.5 h-3.5 text-purple-400" />
              SETTLED
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-bold text-rose-400 bg-rose-950/60 border border-rose-800/60 px-2.5 py-0.5 rounded-full">
              <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
              CLOSED
            </span>
          )}
        </div>

        <h3 className="font-extrabold text-white text-lg group-hover:text-amber-300 transition-colors">
          {market.name}
        </h3>

        <div className="flex items-center gap-3 text-xs text-neutral-400 mt-1 mb-4">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-neutral-500" />
            Open: <strong className="text-neutral-300">{market.openTime}</strong>
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            Close: <strong className="text-neutral-300">{market.closeTime}</strong>
          </span>
        </div>

        {/* Live Result Board Display */}
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-xl p-3 my-2 text-center">
          <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold mb-1">
            Declared Demo Result
          </div>
          <div className="flex items-center justify-center gap-2 font-mono">
            {/* Open Pana */}
            <span className={`text-sm sm:text-base font-bold px-2 py-0.5 rounded ${
              openPana !== '***' ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30' : 'text-neutral-600'
            }`}>
              {openPana}
            </span>
            <span className="text-neutral-600 font-bold">-</span>
            {/* Center Jodi */}
            <span className={`text-base sm:text-xl font-black px-2.5 py-0.5 rounded ${
              jodi !== '**' ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20' : 'bg-neutral-900 text-neutral-500 border border-neutral-800'
            }`}>
              {jodi}
            </span>
            <span className="text-neutral-600 font-bold">-</span>
            {/* Close Pana */}
            <span className={`text-sm sm:text-base font-bold px-2 py-0.5 rounded ${
              closePana !== '***' ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30' : 'text-neutral-600'
            }`}>
              {closePana}
            </span>
          </div>
        </div>

        {/* Multipliers Bar */}
        <div className="grid grid-cols-3 gap-1 py-2 text-center text-[10px] text-neutral-400 border-t border-neutral-800/60 mt-3">
          <div className="bg-neutral-950/60 rounded p-1 border border-neutral-800/40">
            <span className="block text-neutral-500">Single</span>
            <strong className="text-amber-400">{market.payoutMultipliers.SINGLE_ANK}x</strong>
          </div>
          <div className="bg-neutral-950/60 rounded p-1 border border-neutral-800/40">
            <span className="block text-neutral-500">Jodi</span>
            <strong className="text-amber-400">{market.payoutMultipliers.JODI}x</strong>
          </div>
          <div className="bg-neutral-950/60 rounded p-1 border border-neutral-800/40">
            <span className="block text-neutral-500">Patti</span>
            <strong className="text-amber-400">{market.payoutMultipliers.SINGLE_PATTI}x+</strong>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="mt-4 pt-3 border-t border-neutral-800/80">
        {isOpen ? (
          <button
            onClick={() => onSelectEntry(market)}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-bold rounded-xl text-xs sm:text-sm shadow-md shadow-amber-500/10 transition active:scale-[0.98] flex items-center justify-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Place Virtual Entry</span>
          </button>
        ) : (
          <button
            onClick={() => onSelectEntry(market)}
            disabled={!isOpen}
            className="w-full py-2.5 px-4 bg-neutral-800 text-neutral-500 cursor-not-allowed font-semibold rounded-xl text-xs sm:text-sm border border-neutral-700/40 flex items-center justify-center gap-1.5"
          >
            <span>Market Session Closed</span>
          </button>
        )}
      </div>
    </div>
  );
};
