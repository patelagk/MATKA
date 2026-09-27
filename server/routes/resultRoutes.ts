import { Router, Response } from 'express';
import { db } from '../db/mongo';
import { ResultApiAdapter } from '../services/resultApiAdapter';
import { requireAdmin, AuthenticatedRequest } from '../services/authService';

export const resultRouter = Router();

// GET /api/results - Get declared results history
resultRouter.get('/', async (req, res) => {
  try {
    const { limit = '30' } = req.query;
    const results = await db.results.find({}, {
      sort: { publishedAt: -1 },
      limit: parseInt(limit as string, 10)
    });
    return res.json({ results });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/results/:marketId
resultRouter.get('/:marketId', async (req, res) => {
  try {
    const results = await db.results.find(
      { marketId: req.params.marketId },
      { sort: { publishedAt: -1 }, limit: 10 }
    );
    return res.json({ results });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/results/sync - Trigger External Result API sync
resultRouter.post('/sync', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { marketId } = req.body;
    const outcomes = await ResultApiAdapter.simulateExternalFeedSync(marketId);
    return res.json({
      message: 'External API sync cycle executed.',
      outcomes
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/results/declare - Admin manually declares demo result
resultRouter.post('/declare', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { marketId, openPana, closePana, externalResultId } = req.body;

    if (!marketId || !openPana || !closePana) {
      return res.status(400).json({
        error: 'marketId, openPana (3 digits), and closePana (3 digits) are required.'
      });
    }

    const outcome = await ResultApiAdapter.ingestResult(
      marketId,
      {
        externalResultId: externalResultId || `ADMIN_DECLARATION_${Date.now()}`,
        openPana: String(openPana).trim(),
        closePana: String(closePana).trim(),
        provider: 'Manual Admin Portal'
      },
      req.user!.userId
    );

    if (!outcome.success) {
      return res.status(400).json(outcome);
    }

    return res.json(outcome);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
