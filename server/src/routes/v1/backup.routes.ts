import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import { BackupController } from '../../controllers/backup.controller.js';


export const backupRouter = Router();


// All backup routes: authenticated Super Admin only
backupRouter.use(authenticate, authorize(['SUPER_ADMIN']));

/**
 * GET /api/v1/backups
 * List backup history records.
 */
backupRouter.get('/', BackupController.listBackups);

/**
 * POST /api/v1/backups
 * Create and download an encrypted backup (.ubak).
 */
backupRouter.post('/', BackupController.createBackup);

/**
 * POST /api/v1/backups/validate
 * Validate a .ubak file (no restore). Body: raw binary (application/octet-stream).
 */
backupRouter.post(
  '/validate',
  (req: Request, res: Response, next: NextFunction) => {
    // Accept raw binary body as the "file" so we don't add multer as a dependency.
    // Client sends the .ubak file as application/octet-stream body.
    if (!req.is('application/octet-stream')) {
      res.status(400).json({
        success: false,
        error: 'Content-Type must be application/octet-stream',
        code: 'INVALID_CONTENT_TYPE',
      });
      return;
    }

    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      req.file = { buffer: Buffer.concat(chunks) };
      next();
    });
    req.on('error', next);
  },
  BackupController.validateBackup,
);

/**
 * POST /api/v1/backups/restore
 * Restore from a .ubak file. Body: raw binary (application/octet-stream).
 * A safety backup is automatically created before restore.
 */
backupRouter.post(
  '/restore',
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.is('application/octet-stream')) {
      res.status(400).json({
        success: false,
        error: 'Content-Type must be application/octet-stream',
        code: 'INVALID_CONTENT_TYPE',
      });
      return;
    }

    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      req.file = { buffer: Buffer.concat(chunks) };
      next();
    });
    req.on('error', next);
  },
  BackupController.restoreBackup,
);
