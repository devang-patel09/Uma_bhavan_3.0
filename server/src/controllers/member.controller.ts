import { Request, Response, NextFunction } from 'express';
import { MemberService } from '../services/member.service.js';
import {
  createFamilySchema,
  updateFamilySchema,
  individualMemberInputSchema,
  updateIndividualMemberSchema,
  migrateFamilySchema,
} from '../schemas/member.schema.js';

export class MemberController {
  public static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const search = req.query.search as string | undefined;
      const memberType = req.query.memberType as ('PERMANENT' | 'NOMINAL') | undefined;
      const surnameId = req.query.surnameId as string | undefined;
      const firmId = req.query.firmId as string | undefined;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

      const result = await MemberService.getAll({
        search,
        memberType,
        surnameId,
        firmId,
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
      const result = await MemberService.getById(id);
      return res.status(200).json({ data: result });
    } catch (error) {
      next(error);
    }
  }

  public static async createFamily(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = createFamilySchema.parse(req.body);
      const result = await MemberService.createFamily(validated, req.user?.id);
      return res.status(201).json({ data: result });
    } catch (error) {
      next(error);
    }
  }

  public static async updateFamily(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const validated = updateFamilySchema.parse(req.body);
      const result = await MemberService.updateFamily(id, validated, req.user?.id);
      return res.status(200).json({ data: result });
    } catch (error) {
      next(error);
    }
  }

  public static async deleteFamily(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await MemberService.deleteFamily(id, req.user?.id);
      return res.status(200).json({ data: result });
    } catch (error) {
      next(error);
    }
  }

  public static async addIndividual(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: familyRecordId } = req.params;
      const validated = individualMemberInputSchema.parse(req.body);
      const result = await MemberService.addIndividualMember(familyRecordId, validated, req.user?.id);
      return res.status(201).json({ data: result });
    } catch (error) {
      next(error);
    }
  }

  public static async updateIndividual(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: familyRecordId, individualId } = req.params;
      const validated = updateIndividualMemberSchema.parse(req.body);
      const result = await MemberService.updateIndividualMember(
        familyRecordId,
        individualId,
        validated,
        req.user?.id
      );
      return res.status(200).json({ data: result });
    } catch (error) {
      next(error);
    }
  }

  public static async deleteIndividual(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: familyRecordId, individualId } = req.params;
      const result = await MemberService.deleteIndividualMember(
        familyRecordId,
        individualId,
        req.user?.id
      );
      return res.status(200).json({ data: result });
    } catch (error) {
      next(error);
    }
  }

  public static async migrateFamily(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: sourceFamilyRecordId } = req.params;
      const validated = migrateFamilySchema.parse(req.body);
      const result = await MemberService.migrateFamily(sourceFamilyRecordId, validated, req.user?.id);
      return res.status(200).json({ data: result });
    } catch (error) {
      next(error);
    }
  }
}
