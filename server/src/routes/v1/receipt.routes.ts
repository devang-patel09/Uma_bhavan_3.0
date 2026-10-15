import { Router } from 'express';
import { ReceiptController } from '../../controllers/receipt.controller.js';
import { authenticate, authorize } from '../../middleware/auth.js';

export const receiptRouter = Router();

// Public QR Code verification endpoint
receiptRouter.get('/:id/verify', ReceiptController.verifyPublic);

// Authenticated receipt operations
receiptRouter.get('/types', authenticate, ReceiptController.getTypes);
receiptRouter.post('/validate-eligibility', authenticate, ReceiptController.validateEligibility);
receiptRouter.post('/', authenticate, authorize(['SUPER_ADMIN']), ReceiptController.generate);
receiptRouter.get('/', authenticate, ReceiptController.getAll);
receiptRouter.get('/:id', authenticate, ReceiptController.getById);
receiptRouter.delete('/:id', authenticate, authorize(['SUPER_ADMIN']), ReceiptController.delete);
