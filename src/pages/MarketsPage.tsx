import React, { useState, useEffect } from 'react';
import { Market } from '../types';
import { api } from '../services/api';
import { MarketCard } from '../components/markets/MarketCard';
import { Search, Filter, RefreshCw, TrendingUp } from 'lucide-react';
import { getSocket } from '../services/socket';

interface MarketsPageProps {
  onSelectEntry: (market: Market) => void;
}

export const MarketsPage: React.FC<MarketsPageProps> = ({ onSelectEntry }) => {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  const fetchMarkets = async () => {
    setLoading(true);
    try {
      const res = await api.getMarkets();
      setMarkets(res.markets);
    } catch (err) {
      console.error('Failed to fetch markets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarkets();

    const socket = getSocket();
    const handleMarketUpdated = (updated: Market) => {
      setMarkets(prev => {
        const idx = prev.findIndex(m => m._id === updated._id);
        if (idx >= 0) {
          const clone = [...prev];
          clone[idx] = updated;
          return clone;
        }
        return [...prev, updated];
      });
    };

    socket.on('market:updated', handleMarketUpdated);
    return () => {
      socket.off('market:updated', handleMarketUpdated);
    };
  }, []);

  const categories = ['ALL', 'Regular', 'Starline', 'King'];

  const filteredMarkets = markets.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase()) ||
                          m.code.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || m.category === selectedCategory;
    const isCurrentlyOpen = m.isCurrentlyOpen;
    const matchesStatus =
      selectedStatus === 'ALL' ||
      (selectedStatus === 'OPEN' && isCurrentlyOpen) ||
      (selectedStatus === 'SETTLED' && m.status === 'SETTLED');

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-amber-400" />
            <span>Virtual Prediction Markets</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Real-time market sessions, closing times, and configurable demo payout multipliers.
          </p>
        </div>

        <button
          onClick={fetchMarkets}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded-xl text-xs font-semibold border border-neutral-800 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filters bar */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between gap-4">
        
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by market name or code..."
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Category Pills & Status Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  selectedCategory === cat
                    ? 'bg-amber-500 text-neutral-950'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-neutral-950 border border-neutral-800 text-neutral-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open Only</option>
            <option value="SETTLED">Settled Only</option>
          </select>
        </div>
      </div>

      {/* Markets Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-64 bg-neutral-900/60 rounded-2xl animate-pulse border border-neutral-800" />
          ))}
        </div>
      ) : filteredMarkets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMarkets.map(market => (
            <MarketCard
              key={market._id}
              market={market}
              onSelectEntry={onSelectEntry}
            />
          ))}
        </div>
      ) : (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-12 text-center text-neutral-500 text-sm">
          No markets found matching the active filters.
        </div>
      )}
    </div>
  );
};
