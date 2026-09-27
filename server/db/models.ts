import { BaseDocument } from './mongo';

export type UserRole = 'user' | 'admin';
export type UserStatus = 'active' | 'suspended';

export interface UserDoc extends BaseDocument {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  virtualBalance: number; // Available virtual credits (VC)
  lockedBalance: number;  // Virtual credits locked in pending entries
  status: UserStatus;
  lastFaucetAt?: string;
  createdAt: string;
}

export type MarketStatus = 'OPEN' | 'CLOSED' | 'SETTLED' | 'DISABLED';
export type MarketResultStatus = 'PENDING' | 'OPEN_DECLARED' | 'DECLARED' | 'SETTLED';

export interface PayoutMultipliers {
  SINGLE_ANK: number;      // e.g. 9.5x
  JODI: number;            // e.g. 95x
  SINGLE_PATTI: number;    // e.g. 145x
  DOUBLE_PATTI: number;    // e.g. 290x
  TRIPLE_PATTI: number;    // e.g. 650x
}

export interface MarketDoc extends BaseDocument {
  name: string;
  code: string;            // e.g. 'KALYAN_DAY'
  category: string;        // e.g. 'Regular', 'Starline', 'King'
  status: MarketStatus;
  openTime: string;        // Format 'HH:mm', e.g. '15:30'
  closeTime: string;       // Format 'HH:mm', e.g. '17:30'
  result: string;          // Formatted e.g. '345-29-450' or '***-**-***'
  resultStatus: MarketResultStatus;
  normalizedResult?: {
    openPana?: string;
    openDigit?: string;
    closeDigit?: string;
    closePana?: string;
    jodi?: string;
  };
  payoutMultipliers: PayoutMultipliers;
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

export interface EntryDoc extends BaseDocument {
  userId: string;
  userName?: string;
  userEmail?: string;
  marketId: string;
  marketName: string;
  entryType: EntryType;
  selection: string;        // e.g. '2' for Single Ank, '29' for Jodi, '345' for Patti
  virtualStake: number;     // Virtual credits committed
  payoutMultiplier: number; // Multiplier locked at creation
  potentialReturn: number;  // virtualStake * payoutMultiplier
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

export interface WalletTransactionDoc extends BaseDocument {
  userId: string;
  type: WalletTransactionType;
  amount: number;           // Delta: negative for locks/deductions, positive for grants/wins
  balanceBefore: number;
  balanceAfter: number;
  referenceId: string;      // Entry ID, Faucet ID, or Admin reference
  description: string;
  createdAt: string;
}

export interface NormalizedResult {
  openPana: string;         // 3 digits e.g. "345"
  openDigit: string;        // 1 digit e.g. "2"
  closeDigit: string;       // 1 digit e.g. "9"
  closePana: string;        // 3 digits e.g. "450"
  jodi: string;             // 2 digits e.g. "29"
  display: string;          // "345-29-450"
}

export interface ResultDoc extends BaseDocument {
  marketId: string;
  marketName: string;
  externalResultId: string;
  normalizedResult: NormalizedResult;
  publishedAt: string;
  rawResponse: Record<string, any>;
  createdAt: string;
}

export type AuditEntityType = 'Market' | 'Entry' | 'Result' | 'Wallet' | 'User' | 'System';

export interface AuditLogDoc extends BaseDocument {
  actorId: string;
  actorEmail?: string;
  action: string;
  entityType: AuditEntityType;
  entityId: string;
  metadata: Record<string, any>;
  createdAt: string;
}
