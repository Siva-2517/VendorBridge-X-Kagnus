import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db/store';
import { Role, User } from '../types';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

import { getJwtSecret } from '../controllers/authController';

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    // 1. Try cookie
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    // 2. Try Authorization header
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      res.status(401).json({ error: 'Authentication required', message: 'Please log in to continue' });
      return;
    }

    const decoded = jwt.verify(token, getJwtSecret()) as { id: string; email: string; role: Role };

    const user = await db.findUserById(decoded.id);
    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Invalid session', message: 'User account not found or disabled' });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token', message: 'Session expired or invalid. Please log in again.' });
  }
};

export const requireRole = (allowedRoles: Role[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: 'Forbidden',
        message: `Access denied. Role '${req.user.role}' is not authorized to perform this action.`,
      });
      return;
    }

    next();
  };
};
