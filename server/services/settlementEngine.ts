import { db } from '../db/mongo';
import { EntryDoc, MarketDoc, NormalizedResult } from '../db/models';
import { WalletService } from './walletService';
import { emitEntrySettled } from './socketService';
import { logAudit } from './auditService';

export interface SettlementStats {
  marketId: string;
  marketName: string;
  totalEntries: number;
  wonEntries: number;
  lostEntries: number;
  totalVirtualStakes: number;
  totalVirtualPayouts: number;
  netVirtualPnL: number; // For platform/admin: stakes - payouts
}

export class SettlementEngine {
  /**
   * Evaluates if a given entry selection matches the declared result
   */
  static evaluateEntry(entry: EntryDoc, result: NormalizedResult): { won: boolean; matchDescription: string } {
    const sel = entry.selection;

    switch (entry.entryType) {
      case 'SINGLE_ANK_OPEN':
        if (sel === result.openDigit) {
          return { won: true, matchDescription: `Open Ank matched: ${sel} === ${result.openDigit}` };
        }
        return { won: false, matchDescription: `Open Ank missed: selected ${sel}, actual ${result.openDigit}` };

      case 'SINGLE_ANK_CLOSE':
        if (sel === result.closeDigit) {
          return { won: true, matchDescription: `Close Ank matched: ${sel} === ${result.closeDigit}` };
        }
        return { won: false, matchDescription: `Close Ank missed: selected ${sel}, actual ${result.closeDigit}` };

      case 'JODI':
        if (sel === result.jodi) {
          return { won: true, matchDescription: `Jodi matched: ${sel} === ${result.jodi}` };
        }
        return { won: false, matchDescription: `Jodi missed: selected ${sel}, actual ${result.jodi}` };

      case 'PATTI_OPEN':
        // Handle sorting if needed or direct match
        if (sel === result.openPana) {
          return { won: true, matchDescription: `Open Patti matched: ${sel} === ${result.openPana}` };
        }
        return { won: false, matchDescription: `Open Patti missed: selected ${sel}, actual ${result.openPana}` };

      case 'PATTI_CLOSE':
        if (sel === result.closePana) {
          return { won: true, matchDescription: `Close Patti matched: ${sel} === ${result.closePana}` };
        }
        return { won: false, matchDescription: `Close Patti missed: selected ${sel}, actual ${result.closePana}` };

      default:
        return { won: false, matchDescription: 'Unknown entry type' };
    }
  }

  /**
   * Idempotent settlement of all pending entries for a market
   */
  static async settleMarketEntries(market: MarketDoc, result: NormalizedResult, actorId: string): Promise<SettlementStats> {
    const marketId = market._id;

    // Fetch all PENDING entries for this market
    // IDEMPOTENCY: We filter strictly by status === 'PENDING'
    const pendingEntries: EntryDoc[] = await db.entries.find({
      marketId,
      status: 'PENDING'
    });

    let wonCount = 0;
    let lostCount = 0;
    let totalVirtualStakes = 0;
    let totalVirtualPayouts = 0;

    const settledAt = new Date().toISOString();

    for (const entry of pendingEntries) {
      // Re-verify status in case of concurrent processing
      const currentEntry = await db.entries.findOne({ _id: entry._id });
      if (!currentEntry || currentEntry.status !== 'PENDING') {
        continue; // Skip already settled
      }

      totalVirtualStakes += entry.virtualStake;
      const evaluation = this.evaluateEntry(entry, result);

      if (evaluation.won) {
        wonCount++;
        const virtualReturn = Math.round(entry.virtualStake * entry.payoutMultiplier);
        totalVirtualPayouts += virtualReturn;

        // Credit payout & release locked balance through ledger
        await WalletService.creditWinPayout(
          entry.userId,
          entry.virtualStake,
          virtualReturn,
          entry._id,
          market.name
        );

        // Update entry status
        await db.entries.updateOne(
          { _id: entry._id },
          {
            $set: {
              status: 'WON',
              result: {
                virtualReturn,
                matchedDetail: evaluation.matchDescription,
                settledMultiplier: entry.payoutMultiplier
              },
              settledAt
            }
          }
        );

        const settledEntry = {
          ...entry,
          status: 'WON' as const,
          result: {
            virtualReturn,
            matchedDetail: evaluation.matchDescription,
            settledMultiplier: entry.payoutMultiplier
          },
          settledAt
        };

        // Notify client
        emitEntrySettled(entry.userId, settledEntry);

      } else {
        lostCount++;
        // Release locked balance
        await WalletService.releaseLossLock(entry.userId, entry.virtualStake, entry._id);

        // Update entry status
        await db.entries.updateOne(
          { _id: entry._id },
          {
            $set: {
              status: 'LOST',
              result: {
                virtualReturn: 0,
                matchedDetail: evaluation.matchDescription
              },
              settledAt
            }
          }
        );

        const settledEntry = {
          ...entry,
          status: 'LOST' as const,
          result: {
            virtualReturn: 0,
            matchedDetail: evaluation.matchDescription
          },
          settledAt
        };

        emitEntrySettled(entry.userId, settledEntry);
      }
    }

    const netVirtualPnL = totalVirtualStakes - totalVirtualPayouts;

    const stats: SettlementStats = {
      marketId,
      marketName: market.name,
      totalEntries: pendingEntries.length,
      wonEntries: wonCount,
      lostEntries: lostCount,
      totalVirtualStakes,
      totalVirtualPayouts,
      netVirtualPnL
    };

    await logAudit(
      actorId,
      'SETTLEMENT_BATCH_COMPLETED',
      'Market',
      marketId,
      stats
    );

    return stats;
  }
}
