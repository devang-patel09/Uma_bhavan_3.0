import { Request, Response, NextFunction } from 'express';
import { SurnameService } from '../services/surname.service.js';
import { createSurnameSchema } from '../schemas/master.schema.js';

export class SurnameController {
  public static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const surnames = await SurnameService.getAll();
      return res.status(200).json({ data: surnames });
    } catch (error) {
      next(error);
    }
  }

  public static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = createSurnameSchema.parse(req.body);
      const surname = await SurnameService.create(validated, req.user?.id);
      return res.status(201).json({ data: surname });
    } catch (error) {
      next(error);
    }
  }

  public static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await SurnameService.delete(id, req.user?.id);
      return res.status(200).json({ data: result });
    } catch (error) {
      next(error);
    }
  }
}
