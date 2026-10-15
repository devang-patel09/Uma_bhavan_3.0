import { Router } from 'express';
import { ReportController } from '../../controllers/report.controller.js';
import { authenticate } from '../../middleware/auth.js';

export const reportRouter = Router();

reportRouter.get('/niyari', authenticate, ReportController.getNiyari);
reportRouter.get('/summary', authenticate, ReportController.getSummary);
