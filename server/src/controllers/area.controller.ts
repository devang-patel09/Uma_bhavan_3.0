import { Request, Response, NextFunction } from 'express';
import { AreaService } from '../services/area.service.js';
import { createAreaSchema } from '../schemas/master.schema.js';

export class AreaController {
  public static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const areas = await AreaService.getAll();
      return res.status(200).json({ data: areas });
    } catch (error) {
      next(error);
    }
  }

  public static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = createAreaSchema.parse(req.body);
      const area = await AreaService.create(validated, req.user?.id);
      return res.status(201).json({ data: area });
    } catch (error) {
      next(error);
    }
  }

  public static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await AreaService.delete(id, req.user?.id);
      return res.status(200).json({ data: result });
    } catch (error) {
      next(error);
    }
  }
}
