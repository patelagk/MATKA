import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db/mongo';
import { UserDoc } from '../db/models';

const JWT_SECRET = process.env.JWT_SECRET || 'matkavibe_demo_jwt_secret_key_2026';

export interface AuthUserPayload {
  userId: string;
  email: string;
  role: 'user' | 'admin';
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUserPayload;
  currentUser?: UserDoc;
}

export function generateToken(user: UserDoc): string {
  return jwt.sign(
    {
      userId: user._id,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication token is required.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUserPayload;

    const user = await db.users.findOne({ _id: decoded.userId });
    if (!user) {
      return res.status(401).json({ error: 'User account no longer exists.' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ error: 'This demo account is suspended.' });
    }

    req.user = decoded;
    req.currentUser = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session token.' });
  }
}

export async function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  await requireAuth(req, res, () => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin privilege required for this resource.' });
    }
    next();
  });
}

export async function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET) as AuthUserPayload;
      const user = await db.users.findOne({ _id: decoded.userId });
      if (user) {
        req.user = decoded;
        req.currentUser = user;
      }
    }
  } catch {
    // Ignore invalid optional tokens
  }
  next();
}
