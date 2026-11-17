import { Request, Response, NextFunction } from 'express';
import { FirmService } from '../services/firm.service.js';
import { createFirmSchema, updateFirmSchema } from '../schemas/master.schema.js';
import { parsePagination } from '../utils/pagination.js';

export class FirmController {
  public static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const search = req.query.search as string | undefined;
      const areaId = req.query.areaId as string | undefined;
      const firmType = req.query.firmType as 'PERMANENT' | 'NOMINAL' | undefined;
      const { page, limit } = parsePagination(req.query);

      const result = await FirmService.getAll({ search, areaId, firmType, page, limit });
      return res.status(200).json({ data: result });
    } catch (error) {
      next(error);
    }
  }

  public static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const firm = await FirmService.getById(id);
      return res.status(200).json({ data: firm });
    } catch (error) {
      next(error);
    }
  }

  public static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = createFirmSchema.parse(req.body);
      const firm = await FirmService.create(validated, req.user?.id);
      return res.status(201).json({ data: firm });
    } catch (error) {
      next(error);
    }
  }

  public static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const validated = updateFirmSchema.parse(req.body);
      const firm = await FirmService.update(id, validated, req.user?.id);
      return res.status(200).json({ data: firm });
    } catch (error) {
      next(error);
    }
  }

  public static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await FirmService.delete(id, req.user?.id);
      return res.status(200).json({ data: result });
    } catch (error) {
      next(error);
    }
  }
}
