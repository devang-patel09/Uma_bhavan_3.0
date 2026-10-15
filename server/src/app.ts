import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { env } from './config/env.js';
import { healthRouter } from './routes/health.routes.js';
import { v1Router } from './routes/v1/index.js';
import { errorHandler } from './middleware/errorHandler.js';

export const app = express();

// Security headers
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
);

// Body and Cookie Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser(env.COOKIE_SECRET));

// Request logging (skip in test environment)
if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Request ID middleware
app.use((req, res, next) => {
  const requestId = (req.headers['x-request-id'] as string) || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
});

// Root / Healthcheck Route
app.use('/api', healthRouter);

// API v1 Routes
app.use('/api/v1', v1Router);

// Centralized error handler
app.use(errorHandler);
