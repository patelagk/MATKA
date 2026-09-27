import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Coins,
  Lock,
  PlusCircle,
  Shield,
  User as UserIcon,
  LogOut,
  LogIn,
  Menu,
  X,
  History,
  TrendingUp,
  LayoutGrid,
  FileText
} from 'lucide-react';

interface HeaderProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenAuth: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, onSelectTab, onOpenAuth }) => {
  const { user, wallet, logout, claimDailyFaucet } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [faucetLoading, setFaucetLoading] = useState(false);

  const handleFaucet = async () => {
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

  const navLinks = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
    { id: 'markets', label: 'Markets', icon: TrendingUp },
    { id: 'entries', label: 'My Entries', icon: FileText },
    { id: 'results', label: 'Results History', icon: History },
    { id: 'wallet', label: 'Virtual Wallet & P&L', icon: Coins },
  ];

  if (user?.role === 'admin') {
    navLinks.push({ id: 'admin', label: 'Admin Panel', icon: Shield });
  }

  return (
    <header className="bg-neutral-900/90 border-b border-neutral-800 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onSelectTab('dashboard')}
              className="flex items-center gap-2.5 text-left group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 p-0.5 shadow-lg shadow-amber-500/20 group-hover:scale-105 transition">
                <div className="w-full h-full bg-neutral-950 rounded-[10px] flex items-center justify-center">
                  <span className="font-black text-transparent bg-clip-text bg-gradient-to-tr from-amber-400 to-yellow-200 text-lg">
                    MV
                  </span>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-white text-base tracking-tight group-hover:text-amber-300 transition">
                    MatkaVibe
                  </span>
                  <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-bold px-1.5 py-0.2 rounded uppercase">
                    DEMO
                  </span>
                </div>
                <p className="text-[10px] text-neutral-400 hidden sm:block">Virtual Result & Prediction Arena</p>
              </div>
            </button>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = currentTab === link.id;
              const isAdmin = link.id === 'admin';
              return (
                <button
                  key={link.id}
                  onClick={() => onSelectTab(link.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    isActive
                      ? isAdmin
                        ? 'bg-purple-950/80 text-purple-300 border border-purple-700/60'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : isAdmin
                      ? 'text-purple-400 hover:text-purple-200 hover:bg-neutral-800'
                      : 'text-neutral-300 hover:text-white hover:bg-neutral-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {link.label}
                </button>
              );
            })}
          </nav>

          {/* User Controls & Virtual Wallet Pill */}
          <div className="flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-2">
                {/* Virtual Balance Badge */}
                <div className="bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1.5 flex items-center gap-2.5 shadow-inner">
                  <Coins className="w-4 h-4 text-amber-400 shrink-0" />
                  <div className="text-left">
                    <div className="flex items-baseline gap-1">
                      <span className="font-bold text-white text-xs sm:text-sm">
                        {(user.virtualBalance || 0).toLocaleString()}
                      </span>
                      <span className="text-[10px] font-semibold text-amber-400">VC</span>
                    </div>
                    {user.lockedBalance > 0 && (
                      <div className="flex items-center gap-1 text-[10px] text-neutral-400">
                        <Lock className="w-2.5 h-2.5 text-neutral-500" />
                        <span>{user.lockedBalance.toLocaleString()} locked</span>
                      </div>
                    )}
                  </div>

                  {/* Faucet Reload Button */}
                  <button
                    onClick={handleFaucet}
                    disabled={faucetLoading}
                    title="Claim Free Demo Virtual Credits (+5,000 VC)"
                    className="ml-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 p-1 rounded-lg text-xs flex items-center gap-1 transition active:scale-95 disabled:opacity-50"
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-amber-400" />
                    <span className="hidden lg:inline text-[10px] font-bold">+5k VC</span>
                  </button>
                </div>

                {/* User menu / Signout */}
                <div className="relative group">
                  <button
                    onClick={logout}
                    title="Sign Out"
                    className="p-2 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-red-300 border border-neutral-700/60 transition"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 py-1.5 px-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 text-xs font-bold rounded-xl shadow-md shadow-amber-500/20 transition active:scale-95"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In (Demo)</span>
              </button>
            )}

            {/* Mobile burger button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl bg-neutral-800 text-neutral-300 border border-neutral-700 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-neutral-800 space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = currentTab === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => {
                    onSelectTab(link.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'text-neutral-300 hover:bg-neutral-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
};
