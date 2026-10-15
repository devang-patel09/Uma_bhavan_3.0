import { Router } from 'express';
import { MemberController } from '../../controllers/member.controller.js';
import { authenticate, authorize } from '../../middleware/auth.js';

export const memberRouter = Router();

// Family Level Endpoints
memberRouter.get('/', authenticate, MemberController.getAll);
memberRouter.post('/', authenticate, authorize(['SUPER_ADMIN']), MemberController.createFamily);
memberRouter.get('/:id', authenticate, MemberController.getById);
memberRouter.patch('/:id', authenticate, authorize(['SUPER_ADMIN']), MemberController.updateFamily);
memberRouter.delete('/:id', authenticate, authorize(['SUPER_ADMIN']), MemberController.deleteFamily);

// Individual Member Level Endpoints
memberRouter.post('/:id/individuals', authenticate, authorize(['SUPER_ADMIN']), MemberController.addIndividual);
memberRouter.patch(
  '/:id/individuals/:individualId',
  authenticate,
  authorize(['SUPER_ADMIN']),
  MemberController.updateIndividual
);
memberRouter.delete(
  '/:id/individuals/:individualId',
  authenticate,
  authorize(['SUPER_ADMIN']),
  MemberController.deleteIndividual
);

// Transactional Migration / Family Splitting
memberRouter.post('/:id/migrate', authenticate, authorize(['SUPER_ADMIN']), MemberController.migrateFamily);
