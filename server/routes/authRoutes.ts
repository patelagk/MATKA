import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/mongo';
import { generateToken, requireAuth, AuthenticatedRequest } from '../services/authService';
import { WalletService } from '../services/walletService';
import { logAudit } from '../services/auditService';

export const authRouter = Router();

// POST /api/auth/register
authRouter.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await db.users.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const initialBonus = 10000; // 10,000 Demo Virtual Credits

    const user = await db.users.insertOne({
      name: name.trim(),
      email: cleanEmail,
      passwordHash,
      role: 'user',
      virtualBalance: initialBonus,
      lockedBalance: 0,
      status: 'active',
      createdAt: new Date().toISOString()
    });

    // Immutable ledger transaction for initial grant
    await db.walletTransactions.insertOne({
      userId: user._id,
      type: 'INITIAL_GRANT',
      amount: initialBonus,
      balanceBefore: 0,
      balanceAfter: initialBonus,
      referenceId: 'REGISTRATION_SIGNUP',
      description: 'Welcome virtual demo credits package (Non-real-money credits)',
      createdAt: new Date().toISOString()
    });

    await logAudit(
      user._id,
      'USER_REGISTERED',
      'User',
      user._id,
      { email: user.email, initialBonus },
      user.email
    );

    const token = generateToken(user);

    return res.status(201).json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        virtualBalance: user.virtualBalance,
        lockedBalance: user.lockedBalance,
        status: user.status
      }
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error during registration.' });
  }
});

// POST /api/auth/login
authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await db.users.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ error: 'This demo account is currently suspended.' });
    }

    const token = generateToken(user);

    return res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        virtualBalance: user.virtualBalance,
        lockedBalance: user.lockedBalance,
        status: user.status
      }
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error during login.' });
  }
});

// GET /api/auth/me
authRouter.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.currentUser!;
  return res.json({
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      virtualBalance: user.virtualBalance,
      lockedBalance: user.lockedBalance,
      status: user.status,
      createdAt: user.createdAt
    }
  });
});
