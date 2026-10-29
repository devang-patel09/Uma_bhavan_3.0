import { Request, Response, NextFunction } from 'express';
import { ReceiptService } from '../services/receipt.service.js';
import {
  generateReceiptSchema,
  validateEligibilitySchema,
  batchReceiptSchema,
  receiptConfigUpdateSchema,
} from '../schemas/receipt.schema.js';

export class ReceiptController {
  public static async getConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const config = await ReceiptService.getConfig();
      return res.status(200).json({ data: config });
    } catch (error) {
      next(error);
    }
  }

  public static async updateConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = receiptConfigUpdateSchema.parse(req.body);
      const config = await ReceiptService.updateConfig(validated, req.user?.id);
      return res.status(200).json({ data: config });
    } catch (error) {
      next(error);
    }
  }

  public static async getBatchPreview(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = batchReceiptSchema.parse(req.body);
      const preview = await ReceiptService.getBatchPreview(validated);
      return res.status(200).json({ data: preview });
    } catch (error) {
      next(error);
    }
  }

  public static async generateBatch(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = batchReceiptSchema.parse(req.body);
      const receipts = await ReceiptService.generateBatch(validated, req.user?.id || 'system');
      return res.status(201).json({ data: receipts });
    } catch (error) {
      next(error);
    }
  }

  public static async getTypes(req: Request, res: Response, next: NextFunction) {
    try {
      const types = await ReceiptService.getReceiptTypes();
      return res.status(200).json({ data: types });
    } catch (error) {
      next(error);
    }
  }

  public static async validateEligibility(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = validateEligibilitySchema.parse(req.body);
      const result = await ReceiptService.validateEligibility(validated);
      return res.status(200).json({ data: result });
    } catch (error) {
      next(error);
    }
  }

  public static async generate(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = generateReceiptSchema.parse(req.body);
      const receipt = await ReceiptService.generateReceipt(validated, req.user?.id || 'system');
      return res.status(201).json({ data: receipt });
    } catch (error) {
      next(error);
    }
  }

  public static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const search = req.query.search as string | undefined;
      const receiptTypeId = req.query.receiptTypeId as string | undefined;
      const periodType = req.query.periodType as ('MONTHLY' | 'YEARLY') | undefined;
      const periodYear = req.query.periodYear ? parseInt(req.query.periodYear as string, 10) : undefined;
      const fromDate = req.query.fromDate as string | undefined;
      const toDate = req.query.toDate as string | undefined;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

      const result = await ReceiptService.getAll({
        search,
        receiptTypeId,
        periodType,
        periodYear,
        fromDate,
        toDate,
        page,
        limit,
      });

      return res.status(200).json({ data: result });
    } catch (error) {
      next(error);
    }
  }

  public static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await ReceiptService.getById(id);
      return res.status(200).json({ data: result });
    } catch (error) {
      next(error);
    }
  }

  public static async verifyPublic(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await ReceiptService.verifyReceipt(id);
      return res.status(200).json({ data: result });
    } catch (error) {
      next(error);
    }
  }

  public static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await ReceiptService.delete(id, req.user?.id);
      return res.status(200).json({ data: result });
    } catch (error) {
      next(error);
    }
  }
}

