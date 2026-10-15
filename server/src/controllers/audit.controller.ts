import { Request, Response, NextFunction } from 'express';
import { AuditService } from '../services/audit.service.js';

export class AuditController {
  public static async getLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const module = req.query.module as string | undefined;

      const result = await AuditService.getLogs({ page, limit, module });
      return res.status(200).json({ data: result });
    } catch (error) {
      next(error);
    }
  }
}
