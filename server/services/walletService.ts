import { db, generateObjectId } from '../db/mongo';
import { UserDoc, WalletTransactionDoc, WalletTransactionType } from '../db/models';
import { emitWalletUpdated } from './socketService';
import { logAudit } from './auditService';

export class WalletService {
  /**
   * Execute atomic virtual ledger balance change
   */
  static async recordTransaction(params: {
    userId: string;
    type: WalletTransactionType;
    deltaAvailable: number; // positive = credit to virtualBalance, negative = debit from virtualBalance
    deltaLocked?: number;   // delta to lockedBalance (e.g. +amount on entry lock, -amount on settlement/refund)
    referenceId: string;
    description: string;
  }): Promise<{ user: UserDoc; transaction: WalletTransactionDoc }> {
    const user = await db.users.findOne({ _id: params.userId });
    if (!user) {
      throw new Error(`User not found: ${params.userId}`);
    }

    const balanceBefore = user.virtualBalance;
    const newVirtualBalance = balanceBefore + params.deltaAvailable;

    if (newVirtualBalance < 0) {
      throw new Error(`Insufficient virtual credits. Current: ${balanceBefore} VC, Required: ${Math.abs(params.deltaAvailable)} VC`);
    }

    const currentLocked = user.lockedBalance || 0;
    const newLockedBalance = Math.max(0, currentLocked + (params.deltaLocked || 0));

    // Create immutable ledger transaction record
    const transactionId = generateObjectId();
    const now = new Date().toISOString();

    const transaction: WalletTransactionDoc = await db.walletTransactions.insertOne({
      _id: transactionId,
      userId: user._id,
      type: params.type,
      amount: params.deltaAvailable,
      balanceBefore,
      balanceAfter: newVirtualBalance,
      referenceId: params.referenceId,
      description: params.description,
      createdAt: now
    });

    // Update user balance in storage
    await db.users.updateOne(
      { _id: user._id },
      {
        $set: {
          virtualBalance: newVirtualBalance,
          lockedBalance: newLockedBalance
        }
      }
    );

    const updatedUser: UserDoc = {
      ...user,
      virtualBalance: newVirtualBalance,
      lockedBalance: newLockedBalance
    };

    // Emit real-time wallet update via Socket.IO
    emitWalletUpdated(user._id, {
      userId: user._id,
      virtualBalance: newVirtualBalance,
      lockedBalance: newLockedBalance,
      transaction
    });

    return { user: updatedUser, transaction };
  }

  /**
   * Locks virtual balance when placing a virtual entry
   */
  static async lockBalanceForEntry(userId: string, amount: number, entryId: string, marketName: string) {
    if (amount <= 0) {
      throw new Error('Virtual stake must be greater than zero');
    }

    return await this.recordTransaction({
      userId,
      type: 'ENTRY_LOCK',
      deltaAvailable: -amount,
      deltaLocked: amount,
      referenceId: entryId,
      description: `Virtual entry locked for market: ${marketName} (Stake: ${amount} VC)`
    });
  }

  /**
   * Releases locked balance and credits winnings when an entry wins
   */
  static async creditWinPayout(userId: string, stake: number, winReturn: number, entryId: string, marketName: string) {
    return await this.recordTransaction({
      userId,
      type: 'WIN_PAYOUT',
      deltaAvailable: winReturn,
      deltaLocked: -stake,
      referenceId: entryId,
      description: `Demo win payout credited for market: ${marketName} (Return: ${winReturn} VC, Stake: ${stake} VC)`
    });
  }

  /**
   * Releases locked balance when an entry loses (stake is forfeit)
   */
  static async releaseLossLock(userId: string, stake: number, entryId: string) {
    const user = await db.users.findOne({ _id: userId });
    if (!user) return;

    const currentLocked = user.lockedBalance || 0;
    const newLocked = Math.max(0, currentLocked - stake);

    await db.users.updateOne(
      { _id: userId },
      { $set: { lockedBalance: newLocked } }
    );

    emitWalletUpdated(userId, {
      userId,
      virtualBalance: user.virtualBalance,
      lockedBalance: newLocked
    });
  }

  /**
   * Refunds virtual balance if market or entry is cancelled
   */
  static async refundEntry(userId: string, stake: number, entryId: string, reason: string) {
    return await this.recordTransaction({
      userId,
      type: 'ENTRY_REFUND',
      deltaAvailable: stake,
      deltaLocked: -stake,
      referenceId: entryId,
      description: `Virtual entry refund for entry ${entryId}: ${reason}`
    });
  }

  /**
   * Claim free daily/demo faucet reload (5,000 VC)
   */
  static async claimFaucet(userId: string, customAmount = 5000) {
    const user = await db.users.findOne({ _id: userId });
    if (!user) throw new Error('User not found');

    const result = await this.recordTransaction({
      userId,
      type: 'DAILY_FAUCET',
      deltaAvailable: customAmount,
      deltaLocked: 0,
      referenceId: `FAUCET_${Date.now()}`,
      description: `Claimed demo virtual reload (+${customAmount} VC for prediction practice)`
    });

    await db.users.updateOne(
      { _id: userId },
      { $set: { lastFaucetAt: new Date().toISOString() } }
    );

    await logAudit(
      userId,
      'CLAIM_DEMO_FAUCET',
      'Wallet',
      userId,
      { amount: customAmount, newBalance: result.user.virtualBalance },
      user.email
    );

    return result;
  }
}
