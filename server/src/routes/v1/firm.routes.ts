import { Router } from 'express';
import { FirmController } from '../../controllers/firm.controller.js';
import { authenticate, authorize } from '../../middleware/auth.js';

export const firmRouter = Router();

firmRouter.get('/', authenticate, FirmController.getAll);
firmRouter.post('/', authenticate, authorize(['SUPER_ADMIN']), FirmController.create);
firmRouter.get('/:id', authenticate, FirmController.getById);
firmRouter.patch('/:id', authenticate, authorize(['SUPER_ADMIN']), FirmController.update);
firmRouter.delete('/:id', authenticate, authorize(['SUPER_ADMIN']), FirmController.delete);
