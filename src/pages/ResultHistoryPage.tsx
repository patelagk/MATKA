import React, { useState, useEffect } from 'react';
import { ResultRecord } from '../types';
import { api } from '../services/api';
import { History, Search, RefreshCw, Sparkles, CheckCircle2, ShieldCheck } from 'lucide-react';
import { getSocket } from '../services/socket';

export const ResultHistoryPage: React.FC = () => {
  const [results, setResults] = useState<ResultRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchResults = async () => {
    setLoading(true);
    try {
      const res = await api.getResults(50);
      setResults(res.results);
    } catch (err) {
      console.error('Failed to fetch results:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();

    const socket = getSocket();
    const handleResultPublished = (data: any) => {
      if (data.result) {
        setResults(prev => [data.result, ...prev]);
      }
    };

    socket.on('result:published', handleResultPublished);
    return () => {
      socket.off('result:published', handleResultPublished);
    };
  }, []);

  const filteredResults = results.filter(r => {
    return (
      r.marketName.toLowerCase().includes(search.toLowerCase()) ||
      r.normalizedResult.display.includes(search) ||
      r.normalizedResult.jodi.includes(search)
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <History className="w-6 h-6 text-amber-400" />
            <span>Declared Demo Results Archive</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Verified arithmetic checksums, normalized Open/Close Pana, and immutable external reference IDs.
          </p>
        </div>

        <button
          onClick={fetchResults}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded-xl text-xs font-semibold border border-neutral-800 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by market name or numbers (e.g. Kalyan, 34, 128)..."
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
          />
        </div>
        <div className="text-xs text-neutral-400 hidden sm:block">
          Showing {filteredResults.length} records
        </div>
      </div>

      {/* Results Table / Cards */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 bg-neutral-900/60 rounded-2xl animate-pulse border border-neutral-800" />
          ))}
        </div>
      ) : filteredResults.length > 0 ? (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-neutral-300">
              <thead className="bg-neutral-950 border-b border-neutral-800 text-neutral-400 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="px-5 py-3.5">Market Name</th>
                  <th className="px-5 py-3.5 text-center">Open Pana</th>
                  <th className="px-5 py-3.5 text-center">Jodi (Center)</th>
                  <th className="px-5 py-3.5 text-center">Close Pana</th>
                  <th className="px-5 py-3.5 text-center">Full Result</th>
                  <th className="px-5 py-3.5">Declared At</th>
                  <th className="px-5 py-3.5">External Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {filteredResults.map((r) => {
                  const norm = r.normalizedResult;
                  return (
                    <tr key={r._id} className="hover:bg-neutral-800/40 transition">
                      <td className="px-5 py-4 font-bold text-white">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{r.marketName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center font-mono font-bold text-amber-300 bg-amber-500/5">
                        {norm.openPana}
                        <span className="block text-[9px] text-neutral-500 font-sans">
                          (Sum: {norm.openDigit})
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center font-mono">
                        <span className="bg-amber-500 text-neutral-950 font-black px-2 py-0.5 rounded text-sm shadow-sm">
                          {norm.jodi}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center font-mono font-bold text-amber-300 bg-amber-500/5">
                        {norm.closePana}
                        <span className="block text-[9px] text-neutral-500 font-sans">
                          (Sum: {norm.closeDigit})
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center font-mono font-bold text-white">
                        {norm.display}
                      </td>
                      <td className="px-5 py-4 text-neutral-400 text-[11px] whitespace-nowrap">
                        {new Date(r.publishedAt).toLocaleDateString()} {new Date(r.publishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-5 py-4 font-mono text-[10px] text-neutral-500">
                        {r.externalResultId}
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
          No declared results found in archives.
        </div>
      )}
    </div>
  );
};
