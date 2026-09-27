import { Router, Response } from 'express';
import { db } from '../db/mongo';
import { requireAdmin, AuthenticatedRequest } from '../services/authService';
import { WalletService } from '../services/walletService';
import { logAudit } from '../services/auditService';

export const adminRouter = Router();

adminRouter.use(requireAdmin);

// GET /api/admin/dashboard - High-level metrics
adminRouter.get('/dashboard', async (_req, res) => {
  try {
    const totalUsers = await db.users.countDocuments();
    const totalMarkets = await db.markets.countDocuments();
    const openMarkets = await db.markets.countDocuments({ status: 'OPEN' });
    const pendingEntries = await db.entries.countDocuments({ status: 'PENDING' });
    const wonEntries = await db.entries.countDocuments({ status: 'WON' });
    const lostEntries = await db.entries.countDocuments({ status: 'LOST' });

    // Calculate total virtual stakes and total virtual payouts from all entries
    const allEntries = await db.entries.find({});
    let totalVirtualStakes = 0;
    let totalVirtualPayouts = 0;

    for (const e of allEntries) {
      totalVirtualStakes += e.virtualStake || 0;
      if (e.status === 'WON' && e.result?.virtualReturn) {
        totalVirtualPayouts += e.result.virtualReturn;
      }
    }

    // Platform Net Virtual P&L = Stakes minus Payouts
    const platformVirtualPnL = totalVirtualStakes - totalVirtualPayouts;

    // Recent 10 transactions
    const recentTransactions = await db.walletTransactions.find({}, {
      sort: { createdAt: -1 },
      limit: 10
    });

    // Recent 10 audit logs
    const recentAuditLogs = await db.auditLogs.find({}, {
      sort: { createdAt: -1 },
      limit: 10
    });

    return res.json({
      metrics: {
        totalUsers,
        totalMarkets,
        openMarkets,
        pendingEntries,
        wonEntries,
        lostEntries,
        totalVirtualStakes,
        totalVirtualPayouts,
        platformVirtualPnL
      },
      recentTransactions,
      recentAuditLogs
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/users - User management
adminRouter.get('/users', async (_req, res) => {
  try {
    const users = await db.users.find({}, { sort: { createdAt: -1 } });
    const sanitized = users.map(u => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      virtualBalance: u.virtualBalance,
      lockedBalance: u.lockedBalance,
      status: u.status,
      createdAt: u.createdAt
    }));
    return res.json({ users: sanitized });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/users/:id - Suspend/Activate or Virtual Balance Grant
adminRouter.patch('/users/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await db.users.findOne({ _id: req.params.id });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { status, adjustBalance, reason } = req.body;

    if (status && (status === 'active' || status === 'suspended')) {
      await db.users.updateOne({ _id: user._id }, { $set: { status } });
      await logAudit(
        req.user!.userId,
        'UPDATE_USER_STATUS',
        'User',
        user._id,
        { previousStatus: user.status, newStatus: status },
        req.user!.email
      );
    }

    if (adjustBalance && typeof adjustBalance === 'number') {
      await WalletService.recordTransaction({
        userId: user._id,
        type: 'ADMIN_ADJUSTMENT',
        deltaAvailable: adjustBalance,
        deltaLocked: 0,
        referenceId: `ADMIN_ADJ_${Date.now()}`,
        description: reason || `Admin virtual credit adjustment by ${req.user!.email}`
      });
    }

    const updated = await db.users.findOne({ _id: user._id });
    return res.json({
      user: {
        _id: updated._id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        virtualBalance: updated.virtualBalance,
        lockedBalance: updated.lockedBalance,
        status: updated.status
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/entries - Entry inspector
adminRouter.get('/entries', async (req, res) => {
  try {
    const { status, marketId, limit = '100' } = req.query;
    const filter: Record<string, any> = {};
    if (status && typeof status === 'string') filter.status = status;
    if (marketId && typeof marketId === 'string') filter.marketId = marketId;

    const entries = await db.entries.find(filter, {
      sort: { createdAt: -1 },
      limit: parseInt(limit as string, 10)
    });
    return res.json({ entries });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/transactions - Ledger inspector
adminRouter.get('/transactions', async (req, res) => {
  try {
    const { limit = '100', type } = req.query;
    const filter: Record<string, any> = {};
    if (type && typeof type === 'string') filter.type = type;

    const transactions = await db.walletTransactions.find(filter, {
      sort: { createdAt: -1 },
      limit: parseInt(limit as string, 10)
    });
    return res.json({ transactions });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/pnl - Market level P&L reports
adminRouter.get('/pnl', async (_req, res) => {
  try {
    const markets = await db.markets.find({});
    const entries = await db.entries.find({});

    const marketPnlMap: Record<string, {
      marketId: string;
      marketName: string;
      totalEntries: number;
      pendingCount: number;
      wonCount: number;
      lostCount: number;
      totalVirtualStakes: number;
      totalVirtualPayouts: number;
      platformVirtualPnL: number;
    }> = {};

    for (const m of markets) {
      marketPnlMap[m._id] = {
        marketId: m._id,
        marketName: m.name,
        totalEntries: 0,
        pendingCount: 0,
        wonCount: 0,
        lostCount: 0,
        totalVirtualStakes: 0,
        totalVirtualPayouts: 0,
        platformVirtualPnL: 0
      };
    }

    for (const e of entries) {
      if (!marketPnlMap[e.marketId]) {
        marketPnlMap[e.marketId] = {
          marketId: e.marketId,
          marketName: e.marketName || 'Unknown Market',
          totalEntries: 0,
          pendingCount: 0,
          wonCount: 0,
          lostCount: 0,
          totalVirtualStakes: 0,
          totalVirtualPayouts: 0,
          platformVirtualPnL: 0
        };
      }
      const item = marketPnlMap[e.marketId];
      item.totalEntries++;
      item.totalVirtualStakes += e.virtualStake || 0;

      if (e.status === 'PENDING') item.pendingCount++;
      if (e.status === 'WON') {
        item.wonCount++;
        item.totalVirtualPayouts += e.result?.virtualReturn || 0;
      }
      if (e.status === 'LOST') item.lostCount++;

      item.platformVirtualPnL = item.totalVirtualStakes - item.totalVirtualPayouts;
    }

    const report = Object.values(marketPnlMap);
    return res.json({ pnlReport: report });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/api-status - External Result API connection monitor
adminRouter.get('/api-status', async (_req, res) => {
  try {
    const lastResult = await db.results.find({}, { sort: { publishedAt: -1 }, limit: 1 });
    const failedLogs = await db.auditLogs.find(
      { action: { $in: ['RESULT_VALIDATION_FAILED', 'EXTERNAL_API_ERROR'] } },
      { sort: { createdAt: -1 }, limit: 10 }
    );

    const apiStatus = {
      service: 'MatkaVibe Result API Ingestion Pipeline',
      status: 'ONLINE',
      adapterMode: 'LIVE_SIMULATION_&_WEBHOOK_READY',
      idempotencyEngine: 'ACTIVE',
      validationRules: 'STRICT_MATKA_MODULO10_CHECKSUM',
      lastSyncTimestamp: lastResult[0]?.publishedAt || 'N/A',
      lastResultId: lastResult[0]?.externalResultId || 'N/A',
      totalResultsStored: await db.results.countDocuments(),
      recentFailedRequests: failedLogs
    };

    return res.json({ apiStatus });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/audit-logs
adminRouter.get('/audit-logs', async (req, res) => {
  try {
    const { limit = '100' } = req.query;
    const logs = await db.auditLogs.find({}, {
      sort: { createdAt: -1 },
      limit: parseInt(limit as string, 10)
    });
    return res.json({ auditLogs: logs });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
