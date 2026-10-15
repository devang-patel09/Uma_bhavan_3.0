import { Request, Response, NextFunction } from 'express';
import { DataOpsService } from '../services/dataOps.service.js';
import { importTypeSchema, validateImportSchema, commitImportSchema } from '../schemas/dataOps.schema.js';

export class DataOpsController {
  public static async getTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const type = importTypeSchema.parse(req.params.type);
      const template = DataOpsService.getTemplate(type);
      return res.status(200).json({ data: template });
    } catch (error) {
      next(error);
    }
  }

  public static async validateImport(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = validateImportSchema.parse(req.body);
      const result = await DataOpsService.validateImport(validated.type, validated.rows);
      return res.status(200).json({ data: result });
    } catch (error) {
      next(error);
    }
  }

  public static async commitImport(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = commitImportSchema.parse(req.body);
      const result = await DataOpsService.commitImport(validated.type, validated.rows, req.user?.id);
      return res.status(200).json({ data: result });
    } catch (error) {
      next(error);
    }
  }

  public static async exportData(req: Request, res: Response, next: NextFunction) {
    try {
      const type = req.params.type as string;
      const { filename, csv } = await DataOpsService.exportData(type, req.user?.id);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.status(200).send(csv);
    } catch (error) {
      next(error);
    }
  }
}
