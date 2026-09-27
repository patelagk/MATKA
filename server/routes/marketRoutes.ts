import { Router, Response } from 'express';
import { db } from '../db/mongo';
import { MarketService } from '../services/marketService';
import { requireAdmin, AuthenticatedRequest } from '../services/authService';
import { emitMarketUpdated } from '../services/socketService';
import { logAudit } from '../services/auditService';

export const marketRouter = Router();

// GET /api/markets
marketRouter.get('/', async (_req, res) => {
  try {
    const markets = await MarketService.getAllMarkets();
    const enriched = markets.map(m => {
      const openStatus = MarketService.isMarketOpen(m);
      return {
        ...m,
        isCurrentlyOpen: openStatus.open,
        closeReason: openStatus.reason
      };
    });
    return res.json({ markets: enriched });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/markets/:id
marketRouter.get('/:id', async (req, res) => {
  try {
    const market = await MarketService.getMarketById(req.params.id);
    if (!market) {
      return res.status(404).json({ error: 'Market not found' });
    }
    const openStatus = MarketService.isMarketOpen(market);
    return res.json({
      market: {
        ...market,
        isCurrentlyOpen: openStatus.open,
        closeReason: openStatus.reason
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/markets
marketRouter.post('/', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, code, category, openTime, closeTime, payoutMultipliers } = req.body;

    if (!name || !code || !openTime || !closeTime) {
      return res.status(400).json({ error: 'Name, code, openTime, and closeTime are required.' });
    }

    const defaultMultipliers = {
      SINGLE_ANK: 9.5,
      JODI: 95,
      SINGLE_PATTI: 145,
      DOUBLE_PATTI: 290,
      TRIPLE_PATTI: 650
    };

    const newMarket = await db.markets.insertOne({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      category: category || 'Regular',
      status: 'OPEN',
      openTime: openTime.trim(),
      closeTime: closeTime.trim(),
      result: '***-**-***',
      resultStatus: 'PENDING',
      payoutMultipliers: { ...defaultMultipliers, ...payoutMultipliers },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    await logAudit(
      req.user!.userId,
      'CREATE_MARKET',
      'Market',
      newMarket._id,
      { name: newMarket.name, code: newMarket.code },
      req.user!.email
    );

    emitMarketUpdated(newMarket);

    return res.status(201).json({ market: newMarket });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/markets/:id
marketRouter.patch('/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const market = await db.markets.findOne({ _id: req.params.id });
    if (!market) {
      return res.status(404).json({ error: 'Market not found' });
    }

    const { status, openTime, closeTime, name, payoutMultipliers } = req.body;
    const updateFields: Record<string, any> = { updatedAt: new Date().toISOString() };

    if (status) updateFields.status = status;
    if (openTime) updateFields.openTime = openTime;
    if (closeTime) updateFields.closeTime = closeTime;
    if (name) updateFields.name = name;
    if (payoutMultipliers) {
      updateFields.payoutMultipliers = {
        ...market.payoutMultipliers,
        ...payoutMultipliers
      };
    }

    await db.markets.updateOne({ _id: market._id }, { $set: updateFields });
    const updated = await db.markets.findOne({ _id: market._id });

    emitMarketUpdated(updated);

    await logAudit(
      req.user!.userId,
      'UPDATE_MARKET_CONFIG',
      'Market',
      market._id,
      { changes: updateFields },
      req.user!.email
    );

    return res.json({ market: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/markets/:id/reset (Resets market to OPEN for re-testing)
marketRouter.post('/:id/reset', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const market = await db.markets.findOne({ _id: req.params.id });
    if (!market) return res.status(404).json({ error: 'Market not found' });

    await db.markets.updateOne(
      { _id: market._id },
      {
        $set: {
          status: 'OPEN',
          result: '***-**-***',
          resultStatus: 'PENDING',
          normalizedResult: null,
          updatedAt: new Date().toISOString()
        }
      }
    );

    const updated = await db.markets.findOne({ _id: market._id });
    emitMarketUpdated(updated);

    await logAudit(
      req.user!.userId,
      'RESET_MARKET_SESSION',
      'Market',
      market._id,
      { marketName: market.name },
      req.user!.email
    );

    return res.json({ message: 'Market session reset to OPEN successfully', market: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
