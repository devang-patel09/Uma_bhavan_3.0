import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
import { AuditService } from '../services/audit.service.js';
import { loginSchema, recoveryCodeVerifySchema } from '../schemas/auth.schema.js';
import { env } from '../config/env.js';

export class AuthController {
  public static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = loginSchema.parse(req.body);
      const { user, token } = await AuthService.login(validated);

      // Set HTTP-only secure cookie
      res.cookie('token', token, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: validated.rememberMe ? 30 * 24 * 60 * 60 * 1000 : 72 * 60 * 60 * 1000,
      });

      return res.status(200).json({
        data: {
          user,
          token,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      if (req.user) {
        await AuditService.log({
          userId: req.user.id,
          module: 'AUTH',
          action: 'LOGOUT',
        });
      }

      res.clearCookie('token');

      return res.status(200).json({
        data: {
          message: 'Logged out successfully.',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async me(req: Request, res: Response, next: NextFunction) {
    try {
      return res.status(200).json({
        data: {
          user: req.user,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async verifyRecoveryCode(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = recoveryCodeVerifySchema.parse(req.body);
      const result = await AuthService.verifyRecoveryCode(validated);

      return res.status(200).json({
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async requestPasswordReset(req: Request, res: Response) {
    // Scaffolded for configured email/SMS OTP when enabled per PRD Section 24
    return res.status(200).json({
      data: {
        message: 'If an account exists with this username, recovery instructions or OTP will be dispatched.',
      },
    });
  }
}
