export type UserRole = 'user' | 'admin';
export type UserStatus = 'active' | 'suspended';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  virtualBalance: number;
  lockedBalance: number;
  status: UserStatus;
  createdAt: string;
}

export type MarketStatus = 'OPEN' | 'CLOSED' | 'SETTLED' | 'DISABLED';
export type MarketResultStatus = 'PENDING' | 'OPEN_DECLARED' | 'DECLARED' | 'SETTLED';

export interface PayoutMultipliers {
  SINGLE_ANK: number;
  JODI: number;
  SINGLE_PATTI: number;
  DOUBLE_PATTI: number;
  TRIPLE_PATTI: number;
}

export interface NormalizedResult {
  openPana: string;
  openDigit: string;
  closeDigit: string;
  closePana: string;
  jodi: string;
  display: string;
}

export interface Market {
  _id: string;
  name: string;
  code: string;
  category: string;
  status: MarketStatus;
  openTime: string;
  closeTime: string;
  result: string;
  resultStatus: MarketResultStatus;
  normalizedResult?: NormalizedResult;
  payoutMultipliers: PayoutMultipliers;
  isCurrentlyOpen?: boolean;
  closeReason?: string;
  createdAt: string;
  updatedAt: string;
}

export type EntryType =
  | 'SINGLE_ANK_OPEN'
  | 'SINGLE_ANK_CLOSE'
  | 'JODI'
  | 'PATTI_OPEN'
  | 'PATTI_CLOSE';

export type EntryStatus = 'PENDING' | 'WON' | 'LOST' | 'CANCELLED';

export interface EntryResultDetail {
  virtualReturn: number;
  matchedDetail?: string;
  settledMultiplier?: number;
}

export interface Entry {
  _id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  marketId: string;
  marketName: string;
  entryType: EntryType;
  selection: string;
  virtualStake: number;
  payoutMultiplier: number;
  potentialReturn: number;
  status: EntryStatus;
  result?: EntryResultDetail;
  settledAt?: string;
  createdAt: string;
}

export type WalletTransactionType =
  | 'INITIAL_GRANT'
  | 'DAILY_FAUCET'
  | 'ENTRY_LOCK'
  | 'ENTRY_REFUND'
  | 'WIN_PAYOUT'
  | 'ADMIN_ADJUSTMENT';

export interface WalletTransaction {
  _id: string;
  userId: string;
  type: WalletTransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceId: string;
  description: string;
  createdAt: string;
}

export interface ResultRecord {
  _id: string;
  marketId: string;
  marketName: string;
  externalResultId: string;
  normalizedResult: NormalizedResult;
  publishedAt: string;
  rawResponse: Record<string, any>;
  createdAt: string;
}

export interface AuditLog {
  _id: string;
  actorId: string;
  actorEmail?: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface WalletSummary {
  userId: string;
  virtualBalance: number;
  lockedBalance: number;
  realizedPnL: number;
  totalWonVirtual: number;
  totalSettledStakes: number;
  totalFaucetVirtual: number;
  totalInitialGrants: number;
  lastFaucetAt?: string;
}

export interface AdminDashboardMetrics {
  totalUsers: number;
  totalMarkets: number;
  openMarkets: number;
  pendingEntries: number;
  wonEntries: number;
  lostEntries: number;
  totalVirtualStakes: number;
  totalVirtualPayouts: number;
  platformVirtualPnL: number;
}
