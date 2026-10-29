import { Request, Response, NextFunction } from 'express';
import { AreaService } from '../services/area.service.js';
import { createAreaSchema, createSubAreaSchema } from '../schemas/master.schema.js';

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

  public static async getSubAreas(req: Request, res: Response, next: NextFunction) {
    try {
      const { areaId } = req.params;
      const subAreas = await AreaService.getSubAreas(areaId);
      return res.status(200).json({ data: subAreas });
    } catch (error) {
      next(error);
    }
  }

  public static async createSubArea(req: Request, res: Response, next: NextFunction) {
    try {
      const { areaId } = req.params;
      const validated = createSubAreaSchema.parse(req.body);
      const subArea = await AreaService.createSubArea(areaId, validated, req.user?.id);
      return res.status(201).json({ data: subArea });
    } catch (error) {
      next(error);
    }
  }

  public static async deleteSubArea(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await AreaService.deleteSubArea(id, req.user?.id);
      return res.status(200).json({ data: result });
    } catch (error) {
      next(error);
    }
  }
}

