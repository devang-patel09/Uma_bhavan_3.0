import { Router } from 'express';
import { AuthController } from '../../controllers/auth.controller.js';
import { authenticate } from '../../middleware/auth.js';

export const authRouter = Router();

authRouter.post('/login', AuthController.login);
authRouter.post('/logout', AuthController.logout);
authRouter.get('/me', authenticate, AuthController.me);
authRouter.post('/recovery-code/verify', AuthController.verifyRecoveryCode);
authRouter.post('/password-reset/request', AuthController.requestPasswordReset);
