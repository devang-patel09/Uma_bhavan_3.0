import { Request, Response, NextFunction } from 'express';
import { BackupService } from '../services/backup.service.js';
import { AppError } from '../middleware/errorHandler.js';
import { listBackupsQuerySchema } from '../schemas/backup.schema.js';

export class BackupController {
  /**
   * POST /api/v1/backups
   * Creates an encrypted backup and streams the .ubak file to the client.
   * Super Admin only.
   */
  static async createBackup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const result = await BackupService.createBackup(userId, 'MANUAL');

      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
      res.setHeader('Content-Length', result.sizeBytes);
      res.setHeader('X-Backup-Checksum', result.checksum);
      res.setHeader('X-Backup-Schema-Version', result.schemaVersion);
      res.end(result.encryptedBuffer);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/backups/validate
   * Validates an uploaded .ubak file without restoring.
   * Super Admin only.
   * Expects multipart file upload with field name "backup".
   */
  static async validateBackup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        throw new AppError('No backup file provided. Upload a .ubak file in the "backup" field.', 400, 'NO_FILE');
      }
      const result = await BackupService.validateBackup(req.file.buffer);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/backups/restore
   * Restores from an uploaded .ubak file.
   * Creates a safety backup first, then restores.
   * Super Admin only.
   * Expects multipart file upload with field name "backup".
   */
  static async restoreBackup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        throw new AppError('No backup file provided. Upload a .ubak file in the "backup" field.', 400, 'NO_FILE');
      }

      const userId = req.user!.id;
      const result = await BackupService.restoreBackup(userId, req.file.buffer);

      res.json({
        success: true,
        message: 'Database restored successfully. A pre-restore safety backup was created.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/backups
   * Lists backup metadata records (most recent first).
   * Super Admin only.
   */
  static async listBackups(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { limit, offset } = listBackupsQuerySchema.parse(req.query);
      const { records, total } = await BackupService.listBackups(limit, offset);

      res.json({
        success: true,
        data: records,
        meta: { total, limit, offset },
      });
    } catch (error) {
      next(error);
    }
  }
}
