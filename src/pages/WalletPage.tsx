import React, { useState, useEffect } from 'react';
import { WalletSummary, WalletTransaction } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Coins,
  Lock,
  TrendingUp,
  TrendingDown,
  History,
  PlusCircle,
  ShieldCheck,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  FileCheck2,
  DollarSign
} from 'lucide-react';

interface WalletPageProps {
  onOpenAuth: () => void;
}

export const WalletPage: React.FC<WalletPageProps> = ({ onOpenAuth }) => {
  const { user, wallet, refreshWallet, claimDailyFaucet } = useAuth();
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  const fetchLedger = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      await refreshWallet();
      const res = await api.getTransactions(100);
      setTransactions(res.transactions);
    } catch (err) {
      console.error('Failed to load ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [user]);

  const handleClaim = async () => {
    setFaucetLoading(true);
    try {
      await claimDailyFaucet();
      await fetchLedger();
    } finally {
      setFaucetLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-12 text-center max-w-lg mx-auto space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto">
          <Coins className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white">Sign In to View Virtual Wallet</h2>
        <p className="text-xs text-neutral-400">
          Review your immutable virtual credit ledger, realized P&L, locked amounts, and claim daily test reloads.
        </p>
        <button
          onClick={onOpenAuth}
          className="py-2.5 px-6 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl text-sm transition"
        >
          Sign In (Demo)
        </button>
      </div>
    );
  }

  const pnl = wallet?.realizedPnL || 0;
  const isPositivePnL = pnl >= 0;

  const filteredTransactions = transactions.filter(t => {
    if (typeFilter === 'ALL') return true;
    return t.type === typeFilter;
  });

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Coins className="w-6 h-6 text-amber-400" />
            <span>Virtual Credits Wallet & Ledger</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Strict double-entry accounting. Realized P&L is calculated strictly from immutable ledger transactions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleClaim}
            disabled={faucetLoading}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 rounded-xl text-xs font-bold shadow-md shadow-amber-500/20 transition active:scale-95 disabled:opacity-50"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Claim Demo Reload (+5,000 VC)</span>
          </button>
          <button
            onClick={fetchLedger}
            className="flex items-center gap-1.5 px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded-xl text-xs font-semibold border border-neutral-800 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Balances & Calculated P&L Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Available VC */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 relative overflow-hidden">
          <div className="text-xs font-semibold text-neutral-400 flex items-center justify-between">
            <span>Available Virtual Balance</span>
            <Coins className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono">
              {(wallet?.virtualBalance ?? user.virtualBalance).toLocaleString()}
            </span>
            <span className="text-xs font-bold text-amber-400">VC</span>
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">Available for new entries</div>
        </div>

        {/* Locked Balance */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 relative overflow-hidden">
          <div className="text-xs font-semibold text-neutral-400 flex items-center justify-between">
            <span>Locked in Pending</span>
            <Lock className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-neutral-200 font-mono">
              {(wallet?.lockedBalance ?? user.lockedBalance).toLocaleString()}
            </span>
            <span className="text-xs font-bold text-neutral-400">VC</span>
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">Awaiting session results</div>
        </div>

        {/* Realized Virtual P&L */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 relative overflow-hidden">
          <div className="text-xs font-semibold text-neutral-400 flex items-center justify-between">
            <span>Realized Virtual P&L</span>
            {isPositivePnL ? (
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-rose-400" />
            )}
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className={`text-2xl sm:text-3xl font-black font-mono ${
              isPositivePnL ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {isPositivePnL ? `+${pnl.toLocaleString()}` : pnl.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-neutral-400">VC</span>
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">
            Total Won: +{(wallet?.totalWonVirtual || 0).toLocaleString()} VC
          </div>
        </div>

        {/* Total Grants & Faucet */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 relative overflow-hidden">
          <div className="text-xs font-semibold text-neutral-400 flex items-center justify-between">
            <span>Total Reloads Received</span>
            <PlusCircle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-amber-300 font-mono">
              {((wallet?.totalFaucetVirtual || 0) + (wallet?.totalInitialGrants || 0)).toLocaleString()}
            </span>
            <span className="text-xs font-bold text-amber-400">VC</span>
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">Demo test grants provided</div>
        </div>
      </div>

      {/* Ledger Table Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">Immutable Ledger Audit Trail</h2>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800 overflow-x-auto">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'WIN_PAYOUT', label: 'Winnings' },
              { id: 'ENTRY_LOCK', label: 'Locks' },
              { id: 'DAILY_FAUCET', label: 'Reloads' },
              { id: 'INITIAL_GRANT', label: 'Sign-up' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setTypeFilter(tab.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  typeFilter === tab.id
                    ? 'bg-amber-500 text-neutral-950'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-16 bg-neutral-900/60 rounded-xl animate-pulse border border-neutral-800" />
            ))}
          </div>
        ) : filteredTransactions.length > 0 ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-neutral-300">
                <thead className="bg-neutral-950 border-b border-neutral-800 text-neutral-400 uppercase tracking-wider text-[10px] font-bold">
                  <tr>
                    <th className="px-5 py-3.5">Transaction ID</th>
                    <th className="px-5 py-3.5">Type & Reason</th>
                    <th className="px-5 py-3.5 text-right">Delta Amount</th>
                    <th className="px-5 py-3.5 text-right">Before → After</th>
                    <th className="px-5 py-3.5">Reference ID</th>
                    <th className="px-5 py-3.5">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {filteredTransactions.map((tx) => {
                    const isCredit = tx.amount > 0;
                    return (
                      <tr key={tx._id} className="hover:bg-neutral-800/40 transition">
                        <td className="px-5 py-3.5 font-mono text-[10px] text-amber-400">
                          {tx._id.slice(-8)}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-white">
                            {tx.type.replace(/_/g, ' ')}
                          </div>
                          <div className="text-[11px] text-neutral-400 truncate max-w-xs">
                            {tx.description}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono font-bold whitespace-nowrap">
                          <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-xs ${
                            isCredit
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                              : 'bg-rose-950/60 text-rose-400 border border-rose-800/60'
                          }`}>
                            {isCredit ? (
                              <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <ArrowDownLeft className="w-3 h-3 text-rose-400" />
                            )}
                            {isCredit ? `+${tx.amount.toLocaleString()}` : tx.amount.toLocaleString()} VC
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-neutral-400 whitespace-nowrap">
                          {tx.balanceBefore.toLocaleString()} → <strong className="text-white">{tx.balanceAfter.toLocaleString()} VC</strong>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-[10px] text-neutral-500">
                          {tx.referenceId}
                        </td>
                        <td className="px-5 py-3.5 text-neutral-400 text-[11px] whitespace-nowrap">
                          {new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-12 text-center text-neutral-500 text-sm">
            No transactions found for the selected filter.
          </div>
        )}
      </div>
    </div>
  );
};
