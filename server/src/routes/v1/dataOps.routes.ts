import { Router } from 'express';
import { DataOpsController } from '../../controllers/dataOps.controller.js';
import { authenticate, authorize } from '../../middleware/auth.js';

export const dataOpsRouter = Router();

// Templates & Validation
dataOpsRouter.get('/templates/:type', authenticate, DataOpsController.getTemplate);
dataOpsRouter.post('/validate', authenticate, DataOpsController.validateImport);
dataOpsRouter.post('/commit', authenticate, authorize(['SUPER_ADMIN']), DataOpsController.commitImport);

// Exports
dataOpsRouter.get('/export/:type', authenticate, DataOpsController.exportData);
