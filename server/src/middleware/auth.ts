import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from './errorHandler.js';

export interface AuthUserPayload {
  id: string;
  username: string;
  role: 'SUPER_ADMIN' | 'OPERATOR';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
      requestId?: string;
      /** Raw binary upload attached by backup routes body parser */
      file?: { buffer: Buffer };
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : req.cookies?.token;

  if (!token) {
    return next(new AppError('Authentication required.', 401, 'UNAUTHORIZED'));
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthUserPayload;
    req.user = decoded;
    next();
  } catch {
    return next(new AppError('Invalid or expired authentication session.', 401, 'INVALID_TOKEN'));
  }
};

export const authorize = (allowedRoles: ('SUPER_ADMIN' | 'OPERATOR')[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401, 'UNAUTHORIZED'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action.', 403, 'FORBIDDEN'));
    }

    next();
  };
};
