import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger.js';

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details?: unknown;

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR', details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) => {
  const requestId = (req.headers['x-request-id'] as string) || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  if (err instanceof ZodError) {
    logger.warn('Validation error', {
      requestId,
      path: req.path,
      errors: err.errors,
    });

    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Please correct the highlighted fields.',
        requestId,
        details: err.flatten().fieldErrors,
      },
    });
  }

  if (err instanceof AppError) {
    logger.warn(`Operational error: ${err.message}`, {
      requestId,
      code: err.code,
      path: req.path,
      statusCode: err.statusCode,
    });

    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        requestId,
        details: err.details,
      },
    });
  }

  logger.error(`Unhandled exception: ${err.message}`, {
    requestId,
    path: req.path,
    stack: err.stack,
  });

  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred. Please try again later.',
      requestId,
    },
  });
};
