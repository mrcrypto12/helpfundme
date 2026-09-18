import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';

// user is already typed correctly via the global Express.User augmentation
// (see src/types/express.d.ts). AuthRequest is kept only so existing imports
// across the codebase don't need to change.
export interface AuthRequest extends Request {}

// Verify JWT token
export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    // Check Authorization header
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // Check cookies
    else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      res.status(401).json({ message: 'Not authorized, no token provided' });
      return;
    }

    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_ACCESS_SECRET as string
    ) as { id: string; role: string };

    // Get user from database
    const user = await User.findById(decoded.id);
    if (!user) {
      res.status(401).json({ message: 'User not found' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ message: 'Token expired', code: 'TOKEN_EXPIRED' });
      return;
    }
    res.status(401).json({ message: 'Not authorized, invalid token' });
  }
};

// Optional auth — attach user if token exists but don't block
export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (token) {
      const decoded = jwt.verify(
        token,
        process.env.JWT_ACCESS_SECRET as string
      ) as { id: string };
      const user = await User.findById(decoded.id);
      if (user) {
        req.user = user;
      }
    }
  } catch {
    // Silently continue without auth
  }
  next();
};

// Restrict to specific roles
export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ message: 'Not authorized for this action' });
      return;
    }
    next();
  };
};