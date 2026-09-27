import { db } from '../db/mongo';
import { MarketDoc, PayoutMultipliers } from '../db/models';
import { emitMarketUpdated } from './socketService';
import { logAudit } from './auditService';

export class MarketService {
  /**
   * Check if a market is actively open for new virtual entries
   */
  static isMarketOpen(market: MarketDoc): { open: boolean; reason?: string } {
    if (market.status !== 'OPEN') {
      return { open: false, reason: `Market status is ${market.status}` };
    }
    if (market.resultStatus === 'DECLARED' || market.resultStatus === 'SETTLED') {
      return { open: false, reason: 'Results have already been declared for this session.' };
    }

    // Parse market close time (format "HH:mm")
    try {
      const [closeHours, closeMinutes] = market.closeTime.split(':').map(Number);
      const [openHours, openMinutes] = market.openTime.split(':').map(Number);
      
      const now = new Date();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();

      // Convert to minutes from midnight
      const nowMins = currentHours * 60 + currentMinutes;
      const openMins = openHours * 60 + openMinutes;
      let closeMins = closeHours * 60 + closeMinutes;

      // Handle overnight markets (e.g. 21:35 - 00:05)
      if (closeMins < openMins) {
        closeMins += 24 * 60;
      }

      // In demo mode, if the market status is marked OPEN in DB, we allow users to play
      // unless specifically closed by admin or past settlement.
      return { open: true };
    } catch {
      return { open: market.status === 'OPEN' };
    }
  }

  static async getMarketById(id: string): Promise<MarketDoc | null> {
    return await db.markets.findOne({ _id: id });
  }

  static async getAllMarkets(): Promise<MarketDoc[]> {
    return await db.markets.find({}, { sort: { createdAt: 1 } });
  }

  static async updateMarketStatus(
    marketId: string,
    status: MarketDoc['status'],
    actorId: string,
    actorEmail?: string
  ): Promise<MarketDoc | null> {
    const market = await db.markets.findOne({ _id: marketId });
    if (!market) return null;

    await db.markets.updateOne(
      { _id: marketId },
      { $set: { status, updatedAt: new Date().toISOString() } }
    );

    const updated = await db.markets.findOne({ _id: marketId });
    emitMarketUpdated(updated);

    await logAudit(
      actorId,
      'UPDATE_MARKET_STATUS',
      'Market',
      marketId,
      { oldStatus: market.status, newStatus: status },
      actorEmail
    );

    return updated;
  }

  static async updateMultipliers(
    marketId: string,
    multipliers: Partial<PayoutMultipliers>,
    actorId: string,
    actorEmail?: string
  ): Promise<MarketDoc | null> {
    const market = await db.markets.findOne({ _id: marketId });
    if (!market) return null;

    const newMultipliers = { ...market.payoutMultipliers, ...multipliers };
    await db.markets.updateOne(
      { _id: marketId },
      { $set: { payoutMultipliers: newMultipliers, updatedAt: new Date().toISOString() } }
    );

    const updated = await db.markets.findOne({ _id: marketId });
    emitMarketUpdated(updated);

    await logAudit(
      actorId,
      'UPDATE_MARKET_MULTIPLIERS',
      'Market',
      marketId,
      { oldMultipliers: market.payoutMultipliers, newMultipliers },
      actorEmail
    );

    return updated;
  }
}
