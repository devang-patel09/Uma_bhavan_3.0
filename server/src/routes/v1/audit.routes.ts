import { Router } from 'express';
import { AuditController } from '../../controllers/audit.controller.js';
import { authenticate, authorize } from '../../middleware/auth.js';

export const auditRouter = Router();

// Audit log viewer requires super admin authentication
auditRouter.get('/', authenticate, authorize(['SUPER_ADMIN']), AuditController.getLogs);

