import React, { useState, useEffect } from 'react';
import { Entry } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Coins,
  Search,
  Filter,
  RefreshCw,
  Sparkles
} from 'lucide-react';

interface MyEntriesPageProps {
  onOpenAuth: () => void;
  onNavigateTab: (tab: string) => void;
}

export const MyEntriesPage: React.FC<MyEntriesPageProps> = ({ onOpenAuth, onNavigateTab }) => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  const fetchEntries = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api.getMyEntries({ limit: 100 });
      setEntries(res.entries);
    } catch (err) {
      console.error('Failed to fetch user entries:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [user]);

  if (!user) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-12 text-center max-w-lg mx-auto space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto">
          <FileText className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white">Sign In to View Entries</h2>
        <p className="text-xs text-neutral-400">
          Track your pending virtual entries, settled win/loss status, and realized virtual P&L.
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

  // Filter entries
  const filteredEntries = entries.filter((e) => {
    const matchesStatus = statusFilter === 'ALL' || e.status === statusFilter;
    const matchesSearch =
      e.marketName.toLowerCase().includes(search.toLowerCase()) ||
      e.selection.toLowerCase().includes(search.toLowerCase()) ||
      e._id.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const pendingCount = entries.filter(e => e.status === 'PENDING').length;
  const wonCount = entries.filter(e => e.status === 'WON').length;
  const lostCount = entries.filter(e => e.status === 'LOST').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-amber-400" />
            <span>Virtual Entry Portfolio</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Review active predictions locked in pending queue and complete settlement history.
          </p>
        </div>

        <button
          onClick={fetchEntries}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded-xl text-xs font-semibold border border-neutral-800 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 text-center">
          <div className="text-xs text-amber-400 font-bold uppercase tracking-wider">Pending Entries</div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono mt-1">{pendingCount}</div>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 text-center">
          <div className="text-xs text-emerald-400 font-bold uppercase tracking-wider">Won Entries</div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono mt-1">{wonCount}</div>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 text-center">
          <div className="text-xs text-neutral-400 font-bold uppercase tracking-wider">Not Matched</div>
          <div className="text-xl sm:text-2xl font-black text-neutral-300 font-mono mt-1">{lostCount}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        
        {/* Status Tab buttons */}
        <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800 overflow-x-auto">
          {[
            { id: 'ALL', label: 'All Entries' },
            { id: 'PENDING', label: `Pending (${pendingCount})` },
            { id: 'WON', label: `Won (${wonCount})` },
            { id: 'LOST', label: `Lost (${lostCount})` }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                statusFilter === tab.id
                  ? 'bg-amber-500 text-neutral-950'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-xs w-full">
          <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search market, selection, ID..."
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Entries List / Cards */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-neutral-900/60 rounded-2xl animate-pulse border border-neutral-800" />
          ))}
        </div>
      ) : filteredEntries.length > 0 ? (
        <div className="space-y-3">
          {filteredEntries.map((e) => (
            <div
              key={e._id}
              className="bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition"
            >
              {/* Left Details */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-white text-sm sm:text-base">
                    {e.marketName}
                  </span>
                  <span className="text-[10px] text-neutral-500 font-mono">
                    #{e._id.slice(-6)}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                    {e.entryType.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-400">
                  <span>
                    Selection:{' '}
                    <strong className="text-amber-400 font-mono text-sm px-1.5 py-0.5 bg-amber-500/10 rounded">
                      {e.selection}
                    </strong>
                  </span>
                  <span>
                    Stake: <strong className="text-neutral-200">{e.virtualStake.toLocaleString()} VC</strong>
                  </span>
                  <span>
                    Multiplier: <strong className="text-amber-400">{e.payoutMultiplier}x</strong>
                  </span>
                  <span className="text-neutral-500 text-[11px]">
                    {new Date(e.createdAt).toLocaleDateString()} {new Date(e.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {e.result?.matchedDetail && (
                  <div className="text-[11px] text-neutral-400 italic pt-1">
                    {e.result.matchedDetail}
                  </div>
                )}
              </div>

              {/* Right Status & Financial Result */}
              <div className="sm:text-right shrink-0 flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-neutral-800">
                {e.status === 'PENDING' && (
                  <div>
                    <span className="inline-flex items-center gap-1.5 bg-amber-950/80 text-amber-300 border border-amber-800/80 px-2.5 py-1 rounded-full text-xs font-bold">
                      <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                      Pending Result
                    </span>
                    <div className="text-[11px] text-emerald-400 font-semibold mt-1">
                      Potential: +{e.potentialReturn.toLocaleString()} VC
                    </div>
                  </div>
                )}

                {e.status === 'WON' && (
                  <div>
                    <span className="inline-flex items-center gap-1.5 bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 px-2.5 py-1 rounded-full text-xs font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      WON RESULT
                    </span>
                    <div className="text-sm font-black text-emerald-400 mt-1">
                      +{e.result?.virtualReturn.toLocaleString()} VC
                    </div>
                  </div>
                )}

                {e.status === 'LOST' && (
                  <div>
                    <span className="inline-flex items-center gap-1 bg-neutral-800 text-neutral-400 px-2.5 py-1 rounded-full text-xs font-medium">
                      <XCircle className="w-3.5 h-3.5 text-neutral-500" />
                      Not Matched
                    </span>
                    <div className="text-[11px] text-neutral-500 mt-1">
                      Return: 0 VC
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-12 text-center space-y-3">
          <p className="text-neutral-500 text-sm">No entries found matching this view.</p>
          <button
            onClick={() => onNavigateTab('markets')}
            className="py-2 px-4 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl text-xs transition"
          >
            Explore Open Markets
          </button>
        </div>
      )}
    </div>
  );
};
