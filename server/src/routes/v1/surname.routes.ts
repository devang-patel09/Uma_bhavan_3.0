import { Router } from 'express';
import { SurnameController } from '../../controllers/surname.controller.js';
import { authenticate, authorize } from '../../middleware/auth.js';

export const surnameRouter = Router();

surnameRouter.get('/', authenticate, SurnameController.getAll);
surnameRouter.post('/', authenticate, authorize(['SUPER_ADMIN']), SurnameController.create);
surnameRouter.delete('/:id', authenticate, authorize(['SUPER_ADMIN']), SurnameController.delete);
