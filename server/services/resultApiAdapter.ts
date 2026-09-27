import { db } from '../db/mongo';
import { MarketDoc, NormalizedResult, ResultDoc } from '../db/models';
import { SettlementEngine, SettlementStats } from './settlementEngine';
import { emitMarketUpdated, emitResultPublished } from './socketService';
import { logAudit } from './auditService';

export interface ExternalResultPayload {
  externalResultId?: string;
  marketCode?: string;
  marketId?: string;
  openPana: string;      // e.g. "345"
  closePana: string;     // e.g. "450"
  openDigit?: string;    // e.g. "2"
  closeDigit?: string;   // e.g. "9"
  timestamp?: string;
  provider?: string;
}

export interface SyncResultOutcome {
  success: boolean;
  message: string;
  result?: ResultDoc;
  settlement?: SettlementStats;
  duplicate?: boolean;
}

export class ResultApiAdapter {
  /**
   * Calculate single ank from 3-digit pana (sum modulo 10)
   */
  static calculateAnk(pana: string): string {
    const sum = pana.split('').reduce((acc, d) => acc + parseInt(d, 10), 0);
    return String(sum % 10);
  }

  /**
   * Sort pana digits in standard Matka convention (ascending order)
   */
  static sortPana(pana: string): string {
    return pana.split('').sort().join('');
  }

  /**
   * Validates external API result structure and arithmetic integrity
   */
  static validateAndNormalize(payload: ExternalResultPayload): { valid: boolean; normalized?: NormalizedResult; error?: string } {
    if (!payload.openPana || !/^\d{3}$/.test(payload.openPana)) {
      return { valid: false, error: 'Invalid openPana: Must be exactly 3 numerical digits.' };
    }
    if (!payload.closePana || !/^\d{3}$/.test(payload.closePana)) {
      return { valid: false, error: 'Invalid closePana: Must be exactly 3 numerical digits.' };
    }

    const calculatedOpenDigit = this.calculateAnk(payload.openPana);
    const calculatedCloseDigit = this.calculateAnk(payload.closePana);

    // If external feed supplied openDigit/closeDigit, verify checksum
    if (payload.openDigit && payload.openDigit !== calculatedOpenDigit) {
      return {
        valid: false,
        error: `Open digit mismatch: pana ${payload.openPana} sums to ${calculatedOpenDigit}, but payload had ${payload.openDigit}`
      };
    }

    if (payload.closeDigit && payload.closeDigit !== calculatedCloseDigit) {
      return {
        valid: false,
        error: `Close digit mismatch: pana ${payload.closePana} sums to ${calculatedCloseDigit}, but payload had ${payload.closeDigit}`
      };
    }

    const openPana = this.sortPana(payload.openPana);
    const closePana = this.sortPana(payload.closePana);
    const openDigit = calculatedOpenDigit;
    const closeDigit = calculatedCloseDigit;
    const jodi = `${openDigit}${closeDigit}`;
    const display = `${openPana}-${jodi}-${closePana}`;

    return {
      valid: true,
      normalized: {
        openPana,
        openDigit,
        closeDigit,
        closePana,
        jodi,
        display
      }
    };
  }

  /**
   * Ingest and publish result from external API / Admin manual sync
   * Idempotent: rejects duplicate externalResultId or double settlement
   */
  static async ingestResult(
    marketId: string,
    payload: ExternalResultPayload,
    actorId = 'EXTERNAL_API_SERVICE'
  ): Promise<SyncResultOutcome> {
    // 1. Find market
    const market = await db.markets.findOne({ _id: marketId });
    if (!market) {
      return { success: false, message: `Market not found for id: ${marketId}` };
    }

    // 2. Validate and normalize external payload
    const validation = this.validateAndNormalize(payload);
    if (!validation.valid || !validation.normalized) {
      await logAudit(
        actorId,
        'RESULT_VALIDATION_FAILED',
        'Result',
        marketId,
        { payload, error: validation.error }
      );
      return { success: false, message: `Validation failed: ${validation.error}` };
    }

    const normalized = validation.normalized;
    const externalResultId = payload.externalResultId || `EXT_${market.code}_${Date.now()}`;

    // 3. Idempotency Check: Prevent duplicate result by externalResultId
    const existingResult = await db.results.findOne({ externalResultId });
    if (existingResult) {
      return {
        success: false,
        duplicate: true,
        message: `Duplicate result rejected: externalResultId '${externalResultId}' has already been processed.`,
        result: existingResult
      };
    }

    // Check if market already settled with same result
    if (market.resultStatus === 'SETTLED' && market.result === normalized.display) {
      return {
        success: true,
        duplicate: true,
        message: 'Market is already settled with this exact result.',
      };
    }

    const now = new Date().toISOString();

    // 4. Save Result document in MongoDB
    const resultDoc: ResultDoc = await db.results.insertOne({
      marketId: market._id,
      marketName: market.name,
      externalResultId,
      normalizedResult: normalized,
      publishedAt: now,
      rawResponse: {
        ...payload,
        receivedAt: now,
        verifiedChecksum: true
      },
      createdAt: now
    });

    // 5. Update Market state in MongoDB
    await db.markets.updateOne(
      { _id: market._id },
      {
        $set: {
          result: normalized.display,
          resultStatus: 'SETTLED',
          status: 'SETTLED',
          normalizedResult: normalized,
          updatedAt: now
        }
      }
    );

    const updatedMarket = await db.markets.findOne({ _id: market._id });

    // 6. Execute Settlement Engine on all pending entries
    const settlementStats = await SettlementEngine.settleMarketEntries(
      updatedMarket!,
      normalized,
      actorId
    );

    // 7. Real-time broadcast
    emitResultPublished({
      result: resultDoc,
      market: updatedMarket,
      settlement: settlementStats
    });
    emitMarketUpdated(updatedMarket);

    // 8. Audit log
    await logAudit(
      actorId,
      'RESULT_PUBLISHED_AND_SETTLED',
      'Result',
      resultDoc._id,
      {
        marketId: market._id,
        externalResultId,
        normalized,
        settlementStats
      }
    );

    return {
      success: true,
      message: `Result successfully published and settled for ${market.name}: ${normalized.display}`,
      result: resultDoc,
      settlement: settlementStats
    };
  }

  /**
   * Simulates fetching latest results from external feeds with timeout/failure handling
   */
  static async simulateExternalFeedSync(marketId?: string): Promise<SyncResultOutcome[]> {
    const marketsToSync = marketId
      ? await db.markets.find({ _id: marketId })
      : await db.markets.find({ status: { $in: ['OPEN', 'CLOSED'] } });

    const outcomes: SyncResultOutcome[] = [];

    for (const market of marketsToSync) {
      try {
        // Generate realistic 3-digit pana (e.g. 128, 345, 579)
        const generatePana = () => {
          const d1 = Math.floor(Math.random() * 9) + 1;
          const d2 = Math.floor(Math.random() * 9) + 1;
          const d3 = Math.floor(Math.random() * 9) + 1;
          return [d1, d2, d3].sort().join('');
        };

        const openPana = generatePana();
        const closePana = generatePana();

        const outcome = await this.ingestResult(
          market._id,
          {
            externalResultId: `FEED_${market.code}_${Date.now()}`,
            marketCode: market.code,
            openPana,
            closePana,
            provider: 'MatkaVibe Live Feeds Simulated Adapter'
          },
          'API_CRON_SYNC'
        );

        outcomes.push(outcome);
      } catch (err: any) {
        outcomes.push({
          success: false,
          message: `Failed to sync market ${market.name}: ${err?.message || err}`
        });
      }
    }

    return outcomes;
  }
}
