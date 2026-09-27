import { Router, Response } from 'express';
import { db } from '../db/mongo';
import { EntryService } from '../services/entryService';
import { requireAuth, AuthenticatedRequest } from '../services/authService';

export const entryRouter = Router();

// POST /api/entries - Place a new virtual entry
entryRouter.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { marketId, entryType, selection, virtualStake } = req.body;

    if (!marketId || !entryType || selection === undefined || !virtualStake) {
      return res.status(400).json({
        error: 'marketId, entryType, selection, and virtualStake are required.'
      });
    }

    const numericStake = Number(virtualStake);
    if (isNaN(numericStake) || numericStake <= 0) {
      return res.status(400).json({ error: 'virtualStake must be a valid positive number.' });
    }

    const { entry, user } = await EntryService.createEntry({
      userId: req.user!.userId,
      marketId,
      entryType,
      selection: String(selection),
      virtualStake: numericStake
    });

    return res.status(201).json({
      message: 'Virtual entry placed successfully into pending queue.',
      entry,
      userWallet: {
        virtualBalance: user.virtualBalance,
        lockedBalance: user.lockedBalance
      }
    });
  } catch (err: any) {
    console.error('Error placing virtual entry:', err);
    return res.status(400).json({ error: err.message || 'Failed to place virtual entry.' });
  }
});

// GET /api/entries - List user's entries
entryRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, marketId, limit = '50' } = req.query;
    const filter: Record<string, any> = { userId: req.user!.userId };

    if (status && typeof status === 'string') {
      filter.status = status;
    }
    if (marketId && typeof marketId === 'string') {
      filter.marketId = marketId;
    }

    const entries = await db.entries.find(filter, {
      sort: { createdAt: -1 },
      limit: parseInt(limit as string, 10)
    });

    return res.json({ entries });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/entries/:id
entryRouter.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const entry = await db.entries.findOne({ _id: req.params.id });
    if (!entry) {
      return res.status(404).json({ error: 'Entry not found.' });
    }

    // Only owner or admin can view
    if (entry.userId !== req.user!.userId && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized to view this entry.' });
    }

    return res.json({ entry });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
