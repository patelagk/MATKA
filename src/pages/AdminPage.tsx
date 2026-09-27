import React, { useState, useEffect } from 'react';
import {
  Market,
  Entry,
  User,
  WalletTransaction,
  AuditLog,
  AdminDashboardMetrics,
  PayoutMultipliers
} from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  TrendingUp,
  FileText,
  History,
  Users,
  Coins,
  Shield,
  Activity,
  ClipboardList,
  RefreshCw,
  Plus,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Check,
  Zap,
  Sliders,
  Sparkles
} from 'lucide-react';

type AdminTab =
  | 'dashboard'
  | 'markets'
  | 'entries'
  | 'results'
  | 'users'
  | 'transactions'
  | 'pnl'
  | 'api_status'
  | 'audit_logs';

export const AdminPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');

  // Data states
  const [metrics, setMetrics] = useState<AdminDashboardMetrics | null>(null);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [pnlReport, setPnlReport] = useState<any[]>([]);
  const [apiStatus, setApiStatus] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Form states for adding market
  const [showAddMarket, setShowAddMarket] = useState(false);
  const [newMarket, setNewMarket] = useState({
    name: '',
    code: '',
    category: 'Regular',
    openTime: '15:00',
    closeTime: '17:00'
  });

  // Result manual declare states
  const [declareMarketId, setDeclareMarketId] = useState('');
  const [openPana, setOpenPana] = useState('');
  const [closePana, setClosePana] = useState('');
  const [declaring, setDeclaring] = useState(false);
  const [settlementReport, setSettlementReport] = useState<any | null>(null);

  // User adjustment modal
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<number>(5000);
  const [adjustReason, setAdjustReason] = useState<string>('Demo balance refill');

  const loadData = async () => {
    setLoading(true);
    setActionMessage(null);
    try {
      if (activeTab === 'dashboard') {
        const [dashRes, marketsRes] = await Promise.all([
          api.getAdminDashboard(),
          api.getMarkets()
        ]);
        setMetrics(dashRes.metrics);
        setMarkets(marketsRes.markets);
      } else if (activeTab === 'markets') {
        const res = await api.getMarkets();
        setMarkets(res.markets);
      } else if (activeTab === 'entries') {
        const res = await api.getAdminEntries({ limit: 100 });
        setEntries(res.entries);
      } else if (activeTab === 'results') {
        const [marketsRes, statusRes] = await Promise.all([
          api.getMarkets(),
          api.getAdminApiStatus()
        ]);
        setMarkets(marketsRes.markets);
        setApiStatus(statusRes.apiStatus);
        if (marketsRes.markets.length > 0 && !declareMarketId) {
          setDeclareMarketId(marketsRes.markets[0]._id);
        }
      } else if (activeTab === 'users') {
        const res = await api.getAdminUsers();
        setUsersList(res.users);
      } else if (activeTab === 'transactions') {
        const res = await api.getAdminTransactions(100);
        setTransactions(res.transactions);
      } else if (activeTab === 'pnl') {
        const res = await api.getAdminPnL();
        setPnlReport(res.pnlReport);
      } else if (activeTab === 'api_status') {
        const res = await api.getAdminApiStatus();
        setApiStatus(res.apiStatus);
      } else if (activeTab === 'audit_logs') {
        const res = await api.getAdminAuditLogs(100);
        setAuditLogs(res.auditLogs);
      }
    } catch (err: any) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  // Action handlers
  const handleToggleMarketStatus = async (market: Market) => {
    const nextStatus = market.status === 'OPEN' ? 'CLOSED' : 'OPEN';
    try {
      await api.updateMarket(market._id, { status: nextStatus });
      setActionMessage(`Updated ${market.name} status to ${nextStatus}`);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleResetMarket = async (marketId: string) => {
    try {
      await api.resetMarket(marketId);
      setActionMessage('Market session reset to OPEN. Ready for new entries.');
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateMarket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createMarket(newMarket);
      setShowAddMarket(false);
      setNewMarket({
        name: '',
        code: '',
        category: 'Regular',
        openTime: '15:00',
        closeTime: '17:00'
      });
      setActionMessage('Market created successfully.');
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSyncResults = async () => {
    try {
      const res = await api.syncResults();
      setActionMessage('Triggered External Result API sync and automatic settlement cycle.');
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeclareResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!declareMarketId || !openPana || !closePana) {
      alert('Please fill market, open pana, and close pana');
      return;
    }
    setDeclaring(true);
    setSettlementReport(null);
    try {
      const res = await api.declareResult({
        marketId: declareMarketId,
        openPana,
        closePana
      });
      setSettlementReport(res.settlement);
      setActionMessage(res.message);
      loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeclaring(false);
    }
  };

  const handleAdjustBalance = async () => {
    if (!selectedUser) return;
    try {
      await api.updateAdminUser(selectedUser._id, {
        adjustBalance: adjustAmount,
        reason: adjustReason
      });
      setSelectedUser(null);
      setActionMessage(`Adjusted balance for ${selectedUser.email} with immutable transaction.`);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleUserStatus = async (targetUser: User) => {
    const nextStatus = targetUser.status === 'active' ? 'suspended' : 'active';
    try {
      await api.updateAdminUser(targetUser._id, { status: nextStatus });
      setActionMessage(`Updated user status to ${nextStatus}`);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const navItems: { id: AdminTab; label: string; icon: any }[] = [
    { id: 'dashboard', label: 'Dashboard Overview', icon: LayoutDashboard },
    { id: 'markets', label: 'Markets Manager', icon: TrendingUp },
    { id: 'entries', label: 'Entries Live Inspector', icon: FileText },
    { id: 'results', label: 'Results & Settlement', icon: Zap },
    { id: 'users', label: 'Users & Virtual Wallets', icon: Users },
    { id: 'transactions', label: 'Ledger Audit Table', icon: Coins },
    { id: 'pnl', label: 'Platform P&L Reports', icon: Activity },
    { id: 'api_status', label: 'External API Monitor', icon: Sliders },
    { id: 'audit_logs', label: 'System Audit Logs', icon: ClipboardList }
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-6 animate-in fade-in duration-200">
      
      {/* Sidebar Navigation */}
      <aside className="w-full lg:w-64 bg-neutral-900 border border-neutral-800 rounded-3xl p-4 shrink-0 space-y-1 h-fit">
        <div className="p-3 mb-2 bg-gradient-to-r from-purple-950/60 to-neutral-900 rounded-2xl border border-purple-800/40">
          <div className="flex items-center gap-2 text-purple-300 font-bold text-sm">
            <Shield className="w-4 h-4 text-purple-400" />
            <span>Admin Center</span>
          </div>
          <p className="text-[10px] text-neutral-400 mt-0.5">SaaS Management & Settlement</p>
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                isActive
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </aside>

      {/* Main Admin Area */}
      <main className="flex-1 space-y-6">
        
        {/* Top Notification / Action message */}
        {actionMessage && (
          <div className="p-3.5 bg-emerald-950/80 border border-emerald-800/80 rounded-2xl text-emerald-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{actionMessage}</span>
            </div>
            <button
              onClick={() => setActionMessage(null)}
              className="text-emerald-400 hover:text-emerald-100 font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* TAB 1: DASHBOARD OVERVIEW */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white">System Platform Overview</h2>
                <p className="text-xs text-neutral-400">Real-time virtual exposure, platform P&L, and queue status.</p>
              </div>
              <button
                onClick={loadData}
                className="p-2 bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-300 hover:text-white"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {metrics && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
                  <div className="text-xs font-semibold text-neutral-400">Total Users Registered</div>
                  <div className="text-2xl font-black text-white font-mono mt-1">{metrics.totalUsers}</div>
                  <div className="text-[10px] text-neutral-500 mt-1">Virtual demo accounts</div>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
                  <div className="text-xs font-semibold text-neutral-400">Active Open Markets</div>
                  <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
                    {metrics.openMarkets} <span className="text-xs text-neutral-500">/ {metrics.totalMarkets} total</span>
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-1">Receiving virtual entries</div>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
                  <div className="text-xs font-semibold text-neutral-400">Pending Entries in Queue</div>
                  <div className="text-2xl font-black text-amber-400 font-mono mt-1">{metrics.pendingEntries}</div>
                  <div className="text-[10px] text-neutral-500 mt-1">
                    Won: {metrics.wonEntries} | Lost: {metrics.lostEntries}
                  </div>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
                  <div className="text-xs font-semibold text-neutral-400">Platform Virtual P&L</div>
                  <div className={`text-2xl font-black font-mono mt-1 ${
                    metrics.platformVirtualPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {metrics.platformVirtualPnL >= 0 ? `+${metrics.platformVirtualPnL.toLocaleString()}` : metrics.platformVirtualPnL.toLocaleString()} VC
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-1">
                    Stakes: {metrics.totalVirtualStakes.toLocaleString()} | Payouts: {metrics.totalVirtualPayouts.toLocaleString()}
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions Panel */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-3">
              <h3 className="font-bold text-white text-sm">Quick Administrative Triggers</h3>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleSyncResults}
                  className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-purple-600/20"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Run External Result API Sync</span>
                </button>
                <button
                  onClick={() => setActiveTab('results')}
                  className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs font-semibold border border-neutral-700 transition flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Declare Result Manually</span>
                </button>
                <button
                  onClick={() => { setActiveTab('markets'); setShowAddMarket(true); }}
                  className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs font-semibold border border-neutral-700 transition flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Demo Market</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MARKETS MANAGER */}
        {activeTab === 'markets' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white">Markets Configuration Manager</h2>
                <p className="text-xs text-neutral-400">Configure timings, toggle open/close status, and edit multipliers.</p>
              </div>
              <button
                onClick={() => setShowAddMarket(!showAddMarket)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition"
              >
                <Plus className="w-4 h-4" />
                <span>{showAddMarket ? 'Cancel' : 'New Market'}</span>
              </button>
            </div>

            {/* Create Market Form */}
            {showAddMarket && (
              <form onSubmit={handleCreateMarket} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
                <h3 className="font-bold text-white text-sm">Add New Demo Market</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[11px] text-neutral-400 block mb-1">Market Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Goa Day"
                      value={newMarket.name}
                      onChange={(e) => setNewMarket({ ...newMarket, name: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-neutral-400 block mb-1">Market Code</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. GOA_DAY"
                      value={newMarket.code}
                      onChange={(e) => setNewMarket({ ...newMarket, code: e.target.value.toUpperCase() })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-neutral-400 block mb-1">Open Time (HH:mm)</label>
                    <input
                      type="text"
                      required
                      value={newMarket.openTime}
                      onChange={(e) => setNewMarket({ ...newMarket, openTime: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-neutral-400 block mb-1">Close Time (HH:mm)</label>
                    <input
                      type="text"
                      required
                      value={newMarket.closeTime}
                      onChange={(e) => setNewMarket({ ...newMarket, closeTime: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="py-2 px-5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs transition"
                >
                  Create Market
                </button>
              </form>
            )}

            {/* Markets Table */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-lg">
              <table className="w-full text-left text-xs text-neutral-300">
                <thead className="bg-neutral-950 border-b border-neutral-800 text-neutral-400 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="px-5 py-3.5">Market Name & Code</th>
                    <th className="px-5 py-3.5">Timing (Open - Close)</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Latest Result</th>
                    <th className="px-5 py-3.5">Multipliers</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {markets.map((m) => (
                    <tr key={m._id} className="hover:bg-neutral-800/40 transition">
                      <td className="px-5 py-4">
                        <div className="font-bold text-white">{m.name}</div>
                        <div className="text-[10px] text-neutral-500 font-mono">{m.code}</div>
                      </td>
                      <td className="px-5 py-4 font-mono">
                        {m.openTime} - {m.closeTime}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          m.status === 'OPEN'
                            ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                            : m.status === 'SETTLED'
                            ? 'bg-purple-950/80 text-purple-300 border border-purple-800/60'
                            : 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                        }`}>
                          {m.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-mono font-bold text-amber-300">
                        {m.result}
                      </td>
                      <td className="px-5 py-4 text-[10px] text-neutral-400">
                        Single: {m.payoutMultipliers.SINGLE_ANK}x | Jodi: {m.payoutMultipliers.JODI}x | Patti: {m.payoutMultipliers.SINGLE_PATTI}x
                      </td>
                      <td className="px-5 py-4 text-right space-x-2">
                        <button
                          onClick={() => handleToggleMarketStatus(m)}
                          className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-xs font-semibold border border-neutral-700"
                        >
                          {m.status === 'OPEN' ? 'Close' : 'Open'}
                        </button>
                        <button
                          onClick={() => handleResetMarket(m._id)}
                          title="Reset settled session back to OPEN"
                          className="px-2.5 py-1 bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 rounded-lg text-xs font-semibold border border-purple-800/60"
                        >
                          Reset Session
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: ENTRIES LIVE INSPECTOR */}
        {activeTab === 'entries' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white">Live Entries Inspector</h2>
                <p className="text-xs text-neutral-400">Global queue of all user virtual entries and settlement outcomes.</p>
              </div>
              <button
                onClick={loadData}
                className="p-2 bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-300 hover:text-white"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-lg">
              <table className="w-full text-left text-xs text-neutral-300">
                <thead className="bg-neutral-950 border-b border-neutral-800 text-neutral-400 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="px-5 py-3.5">Entry ID</th>
                    <th className="px-5 py-3.5">User</th>
                    <th className="px-5 py-3.5">Market</th>
                    <th className="px-5 py-3.5">Type & Selection</th>
                    <th className="px-5 py-3.5 text-right">Virtual Stake</th>
                    <th className="px-5 py-3.5 text-right">Potential / Settled</th>
                    <th className="px-5 py-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {entries.map((e) => (
                    <tr key={e._id} className="hover:bg-neutral-800/40 transition">
                      <td className="px-5 py-3.5 font-mono text-[10px] text-amber-400">
                        {e._id.slice(-8)}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-white">{e.userName || 'User'}</div>
                        <div className="text-[10px] text-neutral-500 truncate max-w-xs">{e.userEmail}</div>
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-white">
                        {e.marketName}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-mono bg-neutral-800 px-1.5 py-0.5 rounded text-amber-300 font-bold">
                          {e.selection}
                        </span>{' '}
                        <span className="text-[10px] text-neutral-500">
                          ({e.entryType.replace(/_/g, ' ')})
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-neutral-200">
                        {e.virtualStake.toLocaleString()} VC
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono">
                        {e.status === 'WON' ? (
                          <span className="text-emerald-400 font-bold">+{e.result?.virtualReturn.toLocaleString()} VC</span>
                        ) : e.status === 'PENDING' ? (
                          <span className="text-amber-400">+{e.potentialReturn.toLocaleString()} VC</span>
                        ) : (
                          <span className="text-neutral-500">0 VC</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          e.status === 'WON'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : e.status === 'PENDING'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-neutral-800 text-neutral-400'
                        }`}>
                          {e.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: RESULTS & SETTLEMENT ENGINE */}
        {activeTab === 'results' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-black text-white">Result API & Settlement Engine</h2>
              <p className="text-xs text-neutral-400">
                Trigger simulated upstream feeds or manually declare verified Pana numbers with instant idempotent settlement.
              </p>
            </div>

            {/* External API Simulator Card */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" />
                  <h3 className="font-bold text-white text-sm">External Result API Ingestion Service</h3>
                </div>
                <p className="text-xs text-neutral-400 mt-1">
                  Fetches live result feeds, validates 3-digit modulo 10 checksums, stores raw external reference ID, and settles pending entries.
                </p>
              </div>
              <button
                onClick={handleSyncResults}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-bold rounded-xl text-xs shadow-md shadow-amber-500/20 transition active:scale-95 flex items-center justify-center gap-1.5 shrink-0"
              >
                <Zap className="w-4 h-4" />
                <span>Simulate External API Sync</span>
              </button>
            </div>

            {/* Manual Result Declaration Form */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Manual Result Declaration Portal</span>
              </h3>

              <form onSubmit={handleDeclareResult} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-neutral-400 block mb-1">Select Market</label>
                    <select
                      value={declareMarketId}
                      onChange={(e) => setDeclareMarketId(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      {markets.map((m) => (
                        <option key={m._id} value={m._id}>
                          {m.name} ({m.status})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-neutral-400 block mb-1">
                      Open Pana (3 digits, e.g. 345)
                    </label>
                    <input
                      type="text"
                      maxLength={3}
                      placeholder="e.g. 345"
                      value={openPana}
                      onChange={(e) => setOpenPana(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 font-mono text-center text-sm font-bold text-amber-300"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-neutral-400 block mb-1">
                      Close Pana (3 digits, e.g. 450)
                    </label>
                    <input
                      type="text"
                      maxLength={3}
                      placeholder="e.g. 450"
                      value={closePana}
                      onChange={(e) => setClosePana(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 font-mono text-center text-sm font-bold text-amber-300"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="text-[11px] text-neutral-500">
                    Checksum validation: Sum modulo 10 generates Open & Close Single Ank automatically.
                  </div>
                  <button
                    type="submit"
                    disabled={declaring}
                    className="py-2.5 px-6 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs transition disabled:opacity-50"
                  >
                    {declaring ? 'Settling Entries...' : 'Declare & Settle Market'}
                  </button>
                </div>
              </form>

              {settlementReport && (
                <div className="mt-4 p-4 bg-purple-950/40 border border-purple-800/60 rounded-xl space-y-2 text-xs">
                  <div className="font-bold text-purple-300 text-sm">Settlement Engine Execution Summary:</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-neutral-300">
                    <div>Total Settled: <strong className="text-white">{settlementReport.totalEntries}</strong></div>
                    <div>Won: <strong className="text-emerald-400">{settlementReport.wonEntries}</strong></div>
                    <div>Lost: <strong className="text-neutral-400">{settlementReport.lostEntries}</strong></div>
                    <div>Net Platform P&L: <strong className="text-amber-400">{settlementReport.netVirtualPnL.toLocaleString()} VC</strong></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: USERS & VIRTUAL WALLETS */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white">Users & Virtual Credit Balances</h2>
                <p className="text-xs text-neutral-400">Account status, virtual balances, and administrative adjustments.</p>
              </div>
              <button
                onClick={loadData}
                className="p-2 bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-300 hover:text-white"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-lg">
              <table className="w-full text-left text-xs text-neutral-300">
                <thead className="bg-neutral-950 border-b border-neutral-800 text-neutral-400 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="px-5 py-3.5">User</th>
                    <th className="px-5 py-3.5">Role</th>
                    <th className="px-5 py-3.5 text-right">Available Balance</th>
                    <th className="px-5 py-3.5 text-right">Locked Balance</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {usersList.map((u) => (
                    <tr key={u._id} className="hover:bg-neutral-800/40 transition">
                      <td className="px-5 py-4">
                        <div className="font-bold text-white">{u.name}</div>
                        <div className="text-[10px] text-neutral-500">{u.email}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          u.role === 'admin'
                            ? 'bg-purple-950 text-purple-300 border border-purple-800'
                            : 'bg-neutral-800 text-neutral-400'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right font-mono font-bold text-white">
                        {u.virtualBalance.toLocaleString()} VC
                      </td>
                      <td className="px-5 py-4 text-right font-mono text-neutral-400">
                        {u.lockedBalance.toLocaleString()} VC
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.status === 'active'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-rose-950 text-rose-400 border border-rose-800'
                        }`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right space-x-2">
                        <button
                          onClick={() => setSelectedUser(u)}
                          className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-xs font-semibold border border-neutral-700"
                        >
                          Adjust Balance
                        </button>
                        <button
                          onClick={() => handleToggleUserStatus(u)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                            u.status === 'active'
                              ? 'bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60'
                              : 'bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/60'
                          }`}
                        >
                          {u.status === 'active' ? 'Suspend' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Adjust Balance Modal */}
            {selectedUser && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md p-5 space-y-4">
                  <h3 className="font-bold text-white text-base">
                    Adjust Virtual Balance: {selectedUser.email}
                  </h3>
                  <div>
                    <label className="text-xs text-neutral-400 block mb-1">
                      Delta Amount (Positive for grant, Negative for deduction)
                    </label>
                    <input
                      type="number"
                      value={adjustAmount}
                      onChange={(e) => setAdjustAmount(parseInt(e.target.value) || 0)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-400 block mb-1">Reason / Description</label>
                    <input
                      type="text"
                      value={adjustReason}
                      onChange={(e) => setAdjustReason(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedUser(null)}
                      className="flex-1 py-2 bg-neutral-800 text-neutral-300 rounded-xl text-xs font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAdjustBalance}
                      className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold"
                    >
                      Record Transaction
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: LEDGER AUDIT TABLE */}
        {activeTab === 'transactions' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white">System-Wide Immutable Ledger</h2>
                <p className="text-xs text-neutral-400">Complete double-entry accounting records with delta amounts and balances.</p>
              </div>
              <button
                onClick={loadData}
                className="p-2 bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-300 hover:text-white"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-lg">
              <table className="w-full text-left text-xs text-neutral-300">
                <thead className="bg-neutral-950 border-b border-neutral-800 text-neutral-400 uppercase text-[10px] font-bold">
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
                  {transactions.map((tx) => (
                    <tr key={tx._id} className="hover:bg-neutral-800/40 transition">
                      <td className="px-5 py-3.5 font-mono text-[10px] text-amber-400">
                        {tx._id.slice(-8)}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-white">{tx.type}</div>
                        <div className="text-[10px] text-neutral-500 truncate max-w-xs">{tx.description}</div>
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono font-bold">
                        <span className={tx.amount > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {tx.amount > 0 ? `+${tx.amount.toLocaleString()}` : tx.amount.toLocaleString()} VC
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-neutral-400">
                        {tx.balanceBefore.toLocaleString()} → <strong className="text-white">{tx.balanceAfter.toLocaleString()} VC</strong>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[10px] text-neutral-500">
                        {tx.referenceId}
                      </td>
                      <td className="px-5 py-3.5 text-neutral-400 text-[11px] whitespace-nowrap">
                        {new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 7: PLATFORM P&L REPORTS */}
        {activeTab === 'pnl' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-black text-white">Platform Virtual P&L Reports</h2>
              <p className="text-xs text-neutral-400">Market-level breakdown of total stakes collected, virtual returns paid, and net margin.</p>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-lg">
              <table className="w-full text-left text-xs text-neutral-300">
                <thead className="bg-neutral-950 border-b border-neutral-800 text-neutral-400 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="px-5 py-3.5">Market Name</th>
                    <th className="px-5 py-3.5 text-center">Entries Count</th>
                    <th className="px-5 py-3.5 text-center">Won / Lost</th>
                    <th className="px-5 py-3.5 text-right">Stakes Collected</th>
                    <th className="px-5 py-3.5 text-right">Virtual Returns Paid</th>
                    <th className="px-5 py-3.5 text-right">Net Virtual Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {pnlReport.map((r) => (
                    <tr key={r.marketId} className="hover:bg-neutral-800/40 transition">
                      <td className="px-5 py-4 font-bold text-white">
                        {r.marketName}
                      </td>
                      <td className="px-5 py-4 text-center font-mono font-semibold">
                        {r.totalEntries}
                      </td>
                      <td className="px-5 py-4 text-center font-mono">
                        <span className="text-emerald-400">{r.wonCount} won</span> / <span className="text-neutral-500">{r.lostCount} lost</span>
                      </td>
                      <td className="px-5 py-4 text-right font-mono text-neutral-200">
                        {r.totalVirtualStakes.toLocaleString()} VC
                      </td>
                      <td className="px-5 py-4 text-right font-mono text-amber-400 font-bold">
                        {r.totalVirtualPayouts.toLocaleString()} VC
                      </td>
                      <td className="px-5 py-4 text-right font-mono font-black">
                        <span className={r.platformVirtualPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {r.platformVirtualPnL >= 0 ? `+${r.platformVirtualPnL.toLocaleString()}` : r.platformVirtualPnL.toLocaleString()} VC
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 8: API STATUS & LOGS */}
        {activeTab === 'api_status' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-black text-white">External Result API Health Monitor</h2>
              <p className="text-xs text-neutral-400">Connection status, checksum validation rules, and failed request logs.</p>
            </div>

            {apiStatus && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-3">
                  <h3 className="font-bold text-white text-sm">Service Status</h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-neutral-800">
                      <span className="text-neutral-400">Service:</span>
                      <span className="font-bold text-white">{apiStatus.service}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-neutral-800">
                      <span className="text-neutral-400">Status:</span>
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        {apiStatus.status}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-neutral-800">
                      <span className="text-neutral-400">Validation:</span>
                      <span className="font-mono text-amber-300">{apiStatus.validationRules}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-neutral-400">Total Results Ingested:</span>
                      <span className="font-bold text-white">{apiStatus.totalResultsStored}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-3">
                  <h3 className="font-bold text-white text-sm">Checksum Validation Logic</h3>
                  <p className="text-xs text-neutral-400">
                    External API payload arithmetic integrity is enforced before saving to MongoDB:
                  </p>
                  <pre className="bg-neutral-950 p-3 rounded-xl font-mono text-[11px] text-amber-300 overflow-x-auto border border-neutral-800">
{`openDigit  === sum(openPana) % 10
closeDigit === sum(closePana) % 10
jodi       === \`\${openDigit}\${closeDigit}\`
display    === \`\${openPana}-\${jodi}-\${closePana}\``}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 9: AUDIT LOGS */}
        {activeTab === 'audit_logs' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white">System-Wide Audit Trail</h2>
                <p className="text-xs text-neutral-400">Tamper-evident logs of all administrative and financial actions.</p>
              </div>
              <button
                onClick={loadData}
                className="p-2 bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-300 hover:text-white"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-lg">
              <table className="w-full text-left text-xs text-neutral-300">
                <thead className="bg-neutral-950 border-b border-neutral-800 text-neutral-400 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="px-5 py-3.5">Actor</th>
                    <th className="px-5 py-3.5">Action</th>
                    <th className="px-5 py-3.5">Entity</th>
                    <th className="px-5 py-3.5">Metadata</th>
                    <th className="px-5 py-3.5">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {auditLogs.map((log) => (
                    <tr key={log._id} className="hover:bg-neutral-800/40 transition">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-white">{log.actorEmail || log.actorId}</div>
                      </td>
                      <td className="px-5 py-3.5 font-mono font-bold text-amber-300">
                        {log.action}
                      </td>
                      <td className="px-5 py-3.5 text-neutral-400">
                        {log.entityType} ({log.entityId.slice(-6)})
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[10px] text-neutral-400 truncate max-w-xs">
                        {JSON.stringify(log.metadata)}
                      </td>
                      <td className="px-5 py-3.5 text-neutral-400 text-[11px] whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleDateString()} {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};
