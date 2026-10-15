import { Router } from 'express';
import { AreaController } from '../../controllers/area.controller.js';
import { authenticate, authorize } from '../../middleware/auth.js';

export const areaRouter = Router();

areaRouter.get('/', authenticate, AreaController.getAll);
areaRouter.post('/', authenticate, authorize(['SUPER_ADMIN']), AreaController.create);
areaRouter.delete('/:id', authenticate, authorize(['SUPER_ADMIN']), AreaController.delete);
