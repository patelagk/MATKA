import { db, generateObjectId } from '../db/mongo';
import { EntryDoc, EntryType, MarketDoc, UserDoc } from '../db/models';
import { WalletService } from './walletService';
import { MarketService } from './marketService';
import { logAudit } from './auditService';
import { getIO } from './socketService';

export class EntryService {
  /**
   * Determine exact payout multiplier based on entry type and selection
   */
  static resolveMultiplier(market: MarketDoc, entryType: EntryType, selection: string): number {
    const multipliers = market.payoutMultipliers;
    if (entryType === 'SINGLE_ANK_OPEN' || entryType === 'SINGLE_ANK_CLOSE') {
      return multipliers.SINGLE_ANK || 9.5;
    }
    if (entryType === 'JODI') {
      return multipliers.JODI || 95;
    }
    if (entryType === 'PATTI_OPEN' || entryType === 'PATTI_CLOSE') {
      // Validate patti digits
      const digits = selection.split('');
      const uniqueDigits = new Set(digits);
      if (uniqueDigits.size === 1) {
        return multipliers.TRIPLE_PATTI || 650;
      }
      if (uniqueDigits.size === 2) {
        return multipliers.DOUBLE_PATTI || 290;
      }
      return multipliers.SINGLE_PATTI || 145;
    }
    return 1;
  }

  /**
   * Validate selection syntax
   */
  static validateSelection(entryType: EntryType, selection: string): { valid: boolean; error?: string } {
    const cleanSelection = selection.trim();
    if (!cleanSelection) {
      return { valid: false, error: 'Selection is required.' };
    }

    if (entryType === 'SINGLE_ANK_OPEN' || entryType === 'SINGLE_ANK_CLOSE') {
      if (!/^\d{1}$/.test(cleanSelection)) {
        return { valid: false, error: 'Single Ank must be a single digit between 0 and 9.' };
      }
    } else if (entryType === 'JODI') {
      if (!/^\d{2}$/.test(cleanSelection)) {
        return { valid: false, error: 'Jodi selection must be exactly two digits (00-99).' };
      }
    } else if (entryType === 'PATTI_OPEN' || entryType === 'PATTI_CLOSE') {
      if (!/^\d{3}$/.test(cleanSelection)) {
        return { valid: false, error: 'Patti/Pana selection must be exactly 3 digits (e.g. 123, 224, 777).' };
      }
    }
    return { valid: true };
  }

  /**
   * Place a new virtual entry
   */
  static async createEntry(params: {
    userId: string;
    marketId: string;
    entryType: EntryType;
    selection: string;
    virtualStake: number;
  }): Promise<{ entry: EntryDoc; user: UserDoc }> {
    const { userId, marketId, entryType, selection, virtualStake } = params;

    if (!virtualStake || virtualStake <= 0) {
      throw new Error('Virtual stake must be a positive number.');
    }
    if (virtualStake < 10) {
      throw new Error('Minimum virtual stake is 10 VC.');
    }
    if (virtualStake > 100000) {
      throw new Error('Maximum virtual stake per entry is 100,000 VC.');
    }

    // 1. Verify selection syntax
    const validation = this.validateSelection(entryType, selection);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // 2. Verify market exists and is open
    const market = await MarketService.getMarketById(marketId);
    if (!market) {
      throw new Error('Selected market does not exist.');
    }
    const marketStatus = MarketService.isMarketOpen(market);
    if (!marketStatus.open) {
      throw new Error(marketStatus.reason || 'This market is currently closed for virtual entries.');
    }

    // 3. Verify user and balance
    const user = await db.users.findOne({ _id: userId });
    if (!user) {
      throw new Error('User not found.');
    }
    if (user.virtualBalance < virtualStake) {
      throw new Error(`Insufficient virtual balance. You have ${user.virtualBalance} VC, needed ${virtualStake} VC.`);
    }

    // 4. Calculate payout multiplier and potential return
    const payoutMultiplier = this.resolveMultiplier(market, entryType, selection.trim());
    const potentialReturn = Math.round(virtualStake * payoutMultiplier);

    // 5. Generate unique entry ID
    const entryId = generateObjectId();
    const now = new Date().toISOString();

    // 6. Lock virtual balance via immutable wallet ledger
    const { user: updatedUser } = await WalletService.lockBalanceForEntry(
      userId,
      virtualStake,
      entryId,
      market.name
    );

    // 7. Create PENDING entry
    const entryDoc: EntryDoc = await db.entries.insertOne({
      _id: entryId,
      userId: user._id,
      userName: user.name,
      userEmail: user.email,
      marketId: market._id,
      marketName: market.name,
      entryType,
      selection: selection.trim(),
      virtualStake,
      payoutMultiplier,
      potentialReturn,
      status: 'PENDING',
      createdAt: now
    });

    // 8. Log audit trail
    await logAudit(
      userId,
      'CREATE_VIRTUAL_ENTRY',
      'Entry',
      entryId,
      {
        marketId: market._id,
        entryType,
        selection,
        virtualStake,
        payoutMultiplier,
        potentialReturn
      },
      user.email
    );

    // 9. Real-time broadcast to admin monitor
    const io = getIO();
    if (io) {
      io.emit('admin:entry:created', entryDoc);
    }

    return { entry: entryDoc, user: updatedUser };
  }
}
