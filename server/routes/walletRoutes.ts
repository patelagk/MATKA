import { Router, Response } from 'express';
import { db } from '../db/mongo';
import { WalletService } from '../services/walletService';
import { requireAuth, AuthenticatedRequest } from '../services/authService';

export const walletRouter = Router();

// GET /api/wallet - Get current user wallet state and calculated P&L
walletRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await db.users.findOne({ _id: req.user!.userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Calculate Realized P&L strictly from ledger transactions
    // Realized P&L = Sum of win payouts minus sum of entry stakes for settled entries
    const transactions = await db.walletTransactions.find({ userId: user._id });

    let totalWonVirtual = 0;
    let totalInitialGrants = 0;
    let totalFaucetVirtual = 0;

    for (const tx of transactions) {
      if (tx.type === 'WIN_PAYOUT') {
        totalWonVirtual += tx.amount;
      } else if (tx.type === 'INITIAL_GRANT') {
        totalInitialGrants += tx.amount;
      } else if (tx.type === 'DAILY_FAUCET') {
        totalFaucetVirtual += tx.amount;
      }
    }

    // User's settled entries
    const settledEntries = await db.entries.find({
      userId: user._id,
      status: { $in: ['WON', 'LOST'] }
    });

    let totalSettledStakes = 0;
    for (const entry of settledEntries) {
      totalSettledStakes += entry.virtualStake;
    }

    const realizedPnL = totalWonVirtual - totalSettledStakes;

    return res.json({
      wallet: {
        userId: user._id,
        virtualBalance: user.virtualBalance,
        lockedBalance: user.lockedBalance || 0,
        realizedPnL,
        totalWonVirtual,
        totalSettledStakes,
        totalFaucetVirtual,
        totalInitialGrants,
        lastFaucetAt: user.lastFaucetAt
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/wallet/transactions - Immutable ledger transactions history
walletRouter.get('/transactions', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { limit = '50', type } = req.query;
    const filter: Record<string, any> = { userId: req.user!.userId };
    if (type && typeof type === 'string') {
      filter.type = type;
    }

    const transactions = await db.walletTransactions.find(filter, {
      sort: { createdAt: -1 },
      limit: parseInt(limit as string, 10)
    });

    return res.json({ transactions });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/wallet/faucet - Claim free virtual credits
walletRouter.post('/faucet', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const amount = 5000;
    const { user, transaction } = await WalletService.claimFaucet(req.user!.userId, amount);

    return res.json({
      message: `Successfully received ${amount} demo Virtual Credits!`,
      virtualBalance: user.virtualBalance,
      lockedBalance: user.lockedBalance,
      transaction
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});
