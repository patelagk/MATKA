import {
  User,
  Market,
  Entry,
  WalletTransaction,
  ResultRecord,
  WalletSummary,
  AdminDashboardMetrics,
  AuditLog,
  PayoutMultipliers
} from '../types';

const API_BASE = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('matkavibe_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...options.headers
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.message || 'API request failed');
  }

  return data;
}

export const api = {
  // Auth
  register: (payload: { name: string; email: string; password: string }) =>
    request<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  login: (payload: { email: string; password: string }) =>
    request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  getMe: () => request<{ user: User }>('/auth/me'),

  // Markets
  getMarkets: () => request<{ markets: Market[] }>('/markets'),
  getMarketById: (id: string) => request<{ market: Market }>(`/markets/${id}`),

  createMarket: (data: {
    name: string;
    code: string;
    category?: string;
    openTime: string;
    closeTime: string;
    payoutMultipliers?: Partial<PayoutMultipliers>;
  }) =>
    request<{ market: Market }>('/admin/markets', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  updateMarket: (id: string, data: Partial<Market>) =>
    request<{ market: Market }>(`/admin/markets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    }),

  resetMarket: (id: string) =>
    request<{ message: string; market: Market }>(`/admin/markets/${id}/reset`, {
      method: 'POST'
    }),

  // Entries
  createEntry: (data: {
    marketId: string;
    entryType: string;
    selection: string;
    virtualStake: number;
  }) =>
    request<{
      message: string;
      entry: Entry;
      userWallet: { virtualBalance: number; lockedBalance: number };
    }>('/entries', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  getMyEntries: (params: { status?: string; marketId?: string; limit?: number } = {}) => {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.marketId) query.append('marketId', params.marketId);
    if (params.limit) query.append('limit', String(params.limit));
    return request<{ entries: Entry[] }>(`/entries?${query.toString()}`);
  },

  getEntryById: (id: string) => request<{ entry: Entry }>(`/entries/${id}`),

  // Results
  getResults: (limit = 30) => request<{ results: ResultRecord[] }>(`/results?limit=${limit}`),
  getMarketResults: (marketId: string) => request<{ results: ResultRecord[] }>(`/results/${marketId}`),

  syncResults: (marketId?: string) =>
    request<{ message: string; outcomes: any[] }>('/admin/results/sync', {
      method: 'POST',
      body: JSON.stringify({ marketId })
    }),

  declareResult: (data: { marketId: string; openPana: string; closePana: string }) =>
    request<{ success: boolean; message: string; result?: ResultRecord; settlement?: any }>(
      '/admin/results/declare',
      {
        method: 'POST',
        body: JSON.stringify(data)
      }
    ),

  // Wallet
  getWallet: () => request<{ wallet: WalletSummary }>('/wallet'),
  getTransactions: (limit = 50, type?: string) => {
    const query = new URLSearchParams();
    query.append('limit', String(limit));
    if (type) query.append('type', type);
    return request<{ transactions: WalletTransaction[] }>(`/wallet/transactions?${query.toString()}`);
  },
  claimFaucet: () => request<{ message: string; virtualBalance: number; lockedBalance: number; transaction: WalletTransaction }>('/wallet/faucet', {
    method: 'POST'
  }),

  // Admin
  getAdminDashboard: () =>
    request<{
      metrics: AdminDashboardMetrics;
      recentTransactions: WalletTransaction[];
      recentAuditLogs: AuditLog[];
    }>('/admin/dashboard'),

  getAdminUsers: () => request<{ users: User[] }>('/admin/users'),

  updateAdminUser: (id: string, data: { status?: string; adjustBalance?: number; reason?: string }) =>
    request<{ user: User }>(`/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    }),

  getAdminEntries: (params: { status?: string; marketId?: string; limit?: number } = {}) => {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.marketId) query.append('marketId', params.marketId);
    if (params.limit) query.append('limit', String(params.limit));
    return request<{ entries: Entry[] }>(`/admin/entries?${query.toString()}`);
  },

  getAdminTransactions: (limit = 100, type?: string) => {
    const query = new URLSearchParams();
    query.append('limit', String(limit));
    if (type) query.append('type', type);
    return request<{ transactions: WalletTransaction[] }>(`/admin/transactions?${query.toString()}`);
  },

  getAdminPnL: () => request<{ pnlReport: any[] }>('/admin/pnl'),

  getAdminApiStatus: () => request<{ apiStatus: any }>('/admin/api-status'),

  getAdminAuditLogs: (limit = 100) => request<{ auditLogs: AuditLog[] }>(`/admin/audit-logs?limit=${limit}`)
};
