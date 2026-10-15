import { Request, Response, NextFunction } from 'express';
import { ReportService } from '../services/report.service.js';
import { niyariFilterSchema } from '../schemas/receipt.schema.js';

export class ReportController {
  public static async getNiyari(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = niyariFilterSchema.parse(req.query);
      const result = await ReportService.getNiyariReport(validated);
      return res.status(200).json({ data: result });
    } catch (error) {
      next(error);
    }
  }

  public static async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ReportService.getReportsSummary();
      return res.status(200).json({ data: result });
    } catch (error) {
      next(error);
    }
  }
}
