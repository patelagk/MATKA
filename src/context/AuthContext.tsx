import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, WalletSummary } from '../types';
import { api } from '../services/api';
import { getSocket, registerSocketUser } from '../services/socket';

interface AuthContextType {
  user: User | null;
  wallet: WalletSummary | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  claimDailyFaucet: () => Promise<void>;
  refreshWallet: () => Promise<void>;
  notification: { title: string; message: string; type: 'success' | 'info' | 'win' | 'error' } | null;
  clearNotification: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{
    title: string;
    message: string;
    type: 'success' | 'info' | 'win' | 'error';
  } | null>(null);

  const clearNotification = () => setNotification(null);

  const fetchWallet = useCallback(async () => {
    try {
      const res = await api.getWallet();
      setWallet(res.wallet);
      if (user) {
        setUser(prev => prev ? {
          ...prev,
          virtualBalance: res.wallet.virtualBalance,
          lockedBalance: res.wallet.lockedBalance
        } : null);
      }
    } catch (err) {
      // Ignored if unauthenticated
    }
  }, [user]);

  const initAuth = useCallback(async () => {
    const token = localStorage.getItem('matkavibe_token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await api.getMe();
      setUser(res.user);
      registerSocketUser(res.user._id);
      await fetchWallet();
    } catch (err) {
      console.warn('Failed to restore session:', err);
      localStorage.removeItem('matkavibe_token');
      localStorage.removeItem('matkavibe_user');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [fetchWallet]);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Listen to socket events for real-time wallet & entry settlement
  useEffect(() => {
    const socket = getSocket();

    const handleWalletUpdated = (data: any) => {
      if (user && data.userId === user._id) {
        setUser(prev => prev ? {
          ...prev,
          virtualBalance: data.virtualBalance,
          lockedBalance: data.lockedBalance
        } : null);
        setWallet(prev => prev ? {
          ...prev,
          virtualBalance: data.virtualBalance,
          lockedBalance: data.lockedBalance
        } : null);

        if (data.transaction) {
          if (data.transaction.type === 'WIN_PAYOUT') {
            setNotification({
              title: '🏆 Demo Win Declared!',
              message: `+${data.transaction.amount} Virtual Credits returned! ${data.transaction.description}`,
              type: 'win'
            });
          }
        }
      }
    };

    const handleEntrySettled = (entry: any) => {
      if (user && entry.userId === user._id) {
        if (entry.status === 'WON') {
          setNotification({
            title: '🎉 Entry Won (Demo)',
            message: `Your entry for ${entry.marketName} [${entry.selection}] won +${entry.result?.virtualReturn} VC!`,
            type: 'win'
          });
        } else if (entry.status === 'LOST') {
          setNotification({
            title: 'Entry Settled (Demo)',
            message: `Your entry for ${entry.marketName} [${entry.selection}] was not matched.`,
            type: 'info'
          });
        }
        fetchWallet();
      }
    };

    socket.on('wallet:updated', handleWalletUpdated);
    socket.on('entry:settled', handleEntrySettled);

    return () => {
      socket.off('wallet:updated', handleWalletUpdated);
      socket.off('entry:settled', handleEntrySettled);
    };
  }, [user, fetchWallet]);

  const login = async (email: string, password: string) => {
    const res = await api.login({ email, password });
    localStorage.setItem('matkavibe_token', res.token);
    localStorage.setItem('matkavibe_user', JSON.stringify(res.user));
    setUser(res.user);
    registerSocketUser(res.user._id);
    await fetchWallet();
    setNotification({
      title: 'Welcome Back!',
      message: `Signed in as ${res.user.name}. Virtual balance: ${res.user.virtualBalance.toLocaleString()} VC.`,
      type: 'success'
    });
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await api.register({ name, email, password });
    localStorage.setItem('matkavibe_token', res.token);
    localStorage.setItem('matkavibe_user', JSON.stringify(res.user));
    setUser(res.user);
    registerSocketUser(res.user._id);
    await fetchWallet();
    setNotification({
      title: 'Demo Account Created!',
      message: 'You received 10,000 welcome Virtual Credits (VC).',
      type: 'success'
    });
  };

  const logout = () => {
    localStorage.removeItem('matkavibe_token');
    localStorage.removeItem('matkavibe_user');
    setUser(null);
    setWallet(null);
    setNotification({
      title: 'Signed Out',
      message: 'You have been safely signed out of your demo account.',
      type: 'info'
    });
  };

  const claimDailyFaucet = async () => {
    try {
      const res = await api.claimFaucet();
      setUser(prev => prev ? {
        ...prev,
        virtualBalance: res.virtualBalance,
        lockedBalance: res.lockedBalance
      } : null);
      setWallet(prev => prev ? {
        ...prev,
        virtualBalance: res.virtualBalance,
        lockedBalance: res.lockedBalance
      } : null);
      setNotification({
        title: 'Virtual Reload Claimed!',
        message: '+5,000 Virtual Credits added to your demo practice wallet.',
        type: 'success'
      });
    } catch (err: any) {
      setNotification({
        title: 'Faucet Error',
        message: err.message || 'Unable to claim faucet right now.',
        type: 'error'
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        wallet,
        loading,
        login,
        register,
        logout,
        claimDailyFaucet,
        refreshWallet: fetchWallet,
        notification,
        clearNotification
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
