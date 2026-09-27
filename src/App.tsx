import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DemoNoticeBanner } from './components/common/DemoNoticeBanner';
import { Header } from './components/common/Header';
import { EntryModal } from './components/markets/EntryModal';
import { AuthModal } from './components/auth/AuthModal';
import { DashboardPage } from './pages/DashboardPage';
import { MarketsPage } from './pages/MarketsPage';
import { MyEntriesPage } from './pages/MyEntriesPage';
import { ResultHistoryPage } from './pages/ResultHistoryPage';
import { WalletPage } from './pages/WalletPage';
import { AdminPage } from './pages/AdminPage';
import { Market } from './types';
import { ShieldCheck, Trophy, Sparkles, X } from 'lucide-react';

function AppContent() {
  const { user, notification, clearNotification } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [entryModalMarket, setEntryModalMarket] = useState<Market | null>(null);

  const handleSelectEntry = (market: Market) => {
    setEntryModalMarket(market);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-amber-500 selection:text-neutral-950">
      
      {/* 1. Mandatory Non-Real-Money Demo Disclaimer Banner */}
      <DemoNoticeBanner />

      {/* 2. Main Navigation Header */}
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenAuth={() => setAuthModalOpen(true)}
      />

      {/* 3. Global Floating Real-Time Settlement Notification Toast */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full animate-in slide-in-from-bottom duration-300">
          <div className={`p-4 rounded-2xl border shadow-2xl backdrop-blur-md flex items-start justify-between gap-3 ${
            notification.type === 'win'
              ? 'bg-amber-950/90 border-amber-500/70 text-amber-200'
              : notification.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/70 text-emerald-200'
              : 'bg-neutral-900/90 border-neutral-700 text-neutral-200'
          }`}>
            <div className="flex items-start gap-2.5">
              {notification.type === 'win' ? (
                <Trophy className="w-5 h-5 text-yellow-400 shrink-0 animate-bounce" />
              ) : (
                <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
              )}
              <div>
                <h4 className="font-bold text-sm text-white">{notification.title}</h4>
                <p className="text-xs mt-0.5 opacity-90">{notification.message}</p>
              </div>
            </div>
            <button
              onClick={clearNotification}
              className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 4. Main Page View Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {currentTab === 'dashboard' && (
          <DashboardPage
            onSelectEntry={handleSelectEntry}
            onNavigateTab={setCurrentTab}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        )}

        {currentTab === 'markets' && (
          <MarketsPage onSelectEntry={handleSelectEntry} />
        )}

        {currentTab === 'entries' && (
          <MyEntriesPage
            onOpenAuth={() => setAuthModalOpen(true)}
            onNavigateTab={setCurrentTab}
          />
        )}

        {currentTab === 'results' && (
          <ResultHistoryPage />
        )}

        {currentTab === 'wallet' && (
          <WalletPage onOpenAuth={() => setAuthModalOpen(true)} />
        )}

        {currentTab === 'admin' && (
          <AdminPage />
        )}
      </div>

      {/* 5. Modals */}
      <EntryModal
        market={entryModalMarket}
        isOpen={!!entryModalMarket}
        onClose={() => setEntryModalMarket(null)}
        onOpenAuth={() => setAuthModalOpen(true)}
        onEntrySuccess={() => {}}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />

      {/* 6. Footer with Demo Guarantees */}
      <footer className="border-t border-neutral-900 bg-neutral-950/80 py-8 px-4 text-center text-xs text-neutral-500 mt-auto">
        <div className="max-w-4xl mx-auto space-y-2">
          <div className="flex items-center justify-center gap-2 text-neutral-400 font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>MatkaVibe Non-Real-Money Virtual Demo Simulator</span>
          </div>
          <p className="text-[11px] text-neutral-600">
            For demonstration, algorithmic practice, and prediction visualization purposes only.
            All balances are non-transferable Virtual Credits (VC). No real-money gambling, deposits, cash prizes, or financial settlement.
          </p>
          <div className="text-[10px] text-neutral-700 pt-2">
            Built with React 19, TypeScript, Tailwind CSS, Express, MongoDB Architecture & Socket.IO.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
