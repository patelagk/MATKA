import React, { useState, useEffect } from 'react';
import { Market, Entry, WalletSummary } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { MarketCard } from '../components/markets/MarketCard';
import {
  Coins,
  TrendingUp,
  Sparkles,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  PlusCircle,
  History
} from 'lucide-react';

interface DashboardPageProps {
  onSelectEntry: (market: Market) => void;
  onNavigateTab: (tab: string) => void;
  onOpenAuth: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onSelectEntry,
  onNavigateTab,
  onOpenAuth
}) => {
  const { user, wallet, claimDailyFaucet } = useAuth();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [recentEntries, setRecentEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [faucetLoading, setFaucetLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [marketsRes, entriesRes] = await Promise.all([
          api.getMarkets(),
          user ? api.getMyEntries({ limit: 5 }) : Promise.resolve({ entries: [] })
        ]);
        setMarkets(marketsRes.markets);
        setRecentEntries(entriesRes.entries);
      } catch (err) {
        console.error('Dashboard data fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleClaimFaucet = async () => {
    if (!user) {
      onOpenAuth();
      return;
    }
    setFaucetLoading(true);
    try {
      await claimDailyFaucet();
    } finally {
      setFaucetLoading(false);
    }
  };

  const openMarkets = markets.filter(m => m.isCurrentlyOpen);
  const settledMarkets = markets.filter(m => m.status === 'SETTLED' || m.resultStatus === 'SETTLED');

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      
      {/* Hero Virtual Credit Status Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-neutral-900 via-neutral-900 to-amber-950/60 border border-neutral-800 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-xl space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>100% Non-Real-Money Virtual Demo Simulator</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              MatkaVibe <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-200">Demo Arena</span>
            </h1>
            <p className="text-neutral-400 text-xs sm:text-sm">
              Practice prediction algorithms and test live result settlement pipelines with
              virtual credits. All ledger transactions, locks, and win multipliers are mathematically authentic.
            </p>
          </div>

          {/* Quick Wallet Stats Widget */}
          <div className="bg-neutral-950/80 border border-neutral-800/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:gap-6 items-start sm:items-center shadow-inner">
            <div>
              <div className="text-xs text-neutral-400 font-medium flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-amber-400" />
                Available Virtual Balance
              </div>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl sm:text-3xl font-black text-white font-mono">
                  {user ? (user.virtualBalance || 0).toLocaleString() : '10,000'}
                </span>
                <span className="text-xs font-bold text-amber-400">VC</span>
              </div>
              {user && user.lockedBalance > 0 && (
                <div className="text-[11px] text-neutral-400 mt-0.5">
                  Locked in pending: <strong className="text-neutral-200">{user.lockedBalance.toLocaleString()} VC</strong>
                </div>
              )}
            </div>

            <div className="flex sm:flex-col gap-2 w-full sm:w-auto">
              <button
                onClick={handleClaimFaucet}
                disabled={faucetLoading}
                className="flex-1 sm:flex-initial py-2.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-bold rounded-xl text-xs shadow-md shadow-amber-500/20 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+5,000 Demo VC</span>
              </button>
              <button
                onClick={() => onNavigateTab('wallet')}
                className="flex-1 sm:flex-initial py-2 px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-xl border border-neutral-700 transition flex items-center justify-center gap-1"
              >
                <History className="w-3.5 h-3.5 text-neutral-400" />
                <span>Ledger & P&L</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Live Results Ticker */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h2 className="font-bold text-white text-base sm:text-lg">Today's Declared Results Ticker</h2>
          </div>
          <button
            onClick={() => onNavigateTab('results')}
            className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
          >
            <span>Full Archives</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {settledMarkets.length > 0 ? (
            settledMarkets.slice(0, 3).map((m) => (
              <div
                key={m._id}
                className="bg-neutral-900 border border-neutral-800 rounded-xl p-3.5 flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-bold text-white">{m.name}</div>
                  <div className="text-[10px] text-neutral-400">Closed: {m.closeTime}</div>
                </div>
                <div className="bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1 font-mono text-xs sm:text-sm font-bold text-amber-300">
                  {m.result}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 text-center text-xs text-neutral-400">
              Session results are currently pending. Admin can sync or declare results anytime.
            </div>
          )}
        </div>
      </div>

      {/* Open Markets for Virtual Entries */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h2 className="font-bold text-white text-base sm:text-lg">Active Demo Markets</h2>
            <span className="text-xs bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 px-2 py-0.5 rounded-full font-bold">
              {openMarkets.length} Open Now
            </span>
          </div>
          <button
            onClick={() => onNavigateTab('markets')}
            className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
          >
            <span>View All ({markets.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-neutral-900/60 rounded-2xl animate-pulse border border-neutral-800" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {markets.slice(0, 6).map((market) => (
              <MarketCard
                key={market._id}
                market={market}
                onSelectEntry={onSelectEntry}
              />
            ))}
          </div>
        )}
      </div>

      {/* Recent User Entries Section */}
      {user && (
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Your Recent Virtual Entries</span>
            </h3>
            <button
              onClick={() => onNavigateTab('entries')}
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
            >
              <span>See All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentEntries.length > 0 ? (
            <div className="divide-y divide-neutral-800/80">
              {recentEntries.map((e) => (
                <div key={e._id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-2 font-semibold text-neutral-100">
                      <span>{e.marketName}</span>
                      <span className="font-mono bg-neutral-800 px-1.5 py-0.5 rounded text-[11px] text-amber-300">
                        {e.selection}
                      </span>
                      <span className="text-[10px] text-neutral-500 font-normal">
                        ({e.entryType.replace(/_/g, ' ')})
                      </span>
                    </div>
                    <div className="text-[11px] text-neutral-400 mt-0.5">
                      Stake: <strong className="text-neutral-200">{e.virtualStake} VC</strong> • Mult: {e.payoutMultiplier}x
                    </div>
                  </div>

                  <div className="text-right">
                    {e.status === 'PENDING' && (
                      <span className="inline-flex items-center gap-1 bg-amber-950/80 text-amber-300 border border-amber-800/60 px-2 py-0.5 rounded-full font-bold text-[10px]">
                        <Clock className="w-3 h-3 text-amber-400" /> Pending
                      </span>
                    )}
                    {e.status === 'WON' && (
                      <span className="inline-flex items-center gap-1 bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 px-2 py-0.5 rounded-full font-bold text-[10px]">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Won +{e.result?.virtualReturn} VC
                      </span>
                    )}
                    {e.status === 'LOST' && (
                      <span className="inline-flex items-center gap-1 bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded-full font-medium text-[10px]">
                        Not Matched
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-neutral-500 text-xs">
              No virtual entries placed yet. Select any open market above to practice!
            </div>
          )}
        </div>
      )}

      {/* Educational & Rules Guide */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-5 sm:p-6 space-y-3 text-xs text-neutral-400">
        <h4 className="font-bold text-white text-sm flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-amber-400" />
          <span>How Virtual Matka Prediction & Settlement Works</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          <div className="bg-neutral-950/60 p-3 rounded-xl border border-neutral-800/40">
            <strong className="text-neutral-200 block mb-1">1. Single Ank (0-9)</strong>
            <span>
              The unit digit of sum of 3-digit Pana. e.g. Pana 3+4+5=12, the Single Ank is <strong>2</strong>. Multiplier: 9.5x.
            </span>
          </div>
          <div className="bg-neutral-950/60 p-3 rounded-xl border border-neutral-800/40">
            <strong className="text-neutral-200 block mb-1">2. Jodi (00-99)</strong>
            <span>
              The two digits formed by Open Single Ank + Close Single Ank (e.g. Open 2, Close 9 = Jodi <strong>29</strong>). Multiplier: 95x.
            </span>
          </div>
          <div className="bg-neutral-950/60 p-3 rounded-xl border border-neutral-800/40">
            <strong className="text-neutral-200 block mb-1">3. Pana / Patti (100-999)</strong>
            <span>
              3 ascending digits (e.g. 128, 224, 777). Single Patti pays 145x, Double Patti pays 290x, and Triple Patti pays 650x.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
