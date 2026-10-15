import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/prisma.js';
import { env } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';
import { AuditService } from './audit.service.js';
import { LoginInput, RecoveryCodeVerifyInput } from '../schemas/auth.schema.js';

export class AuthService {
  public static async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { username: input.username },
    });

    if (!user || !user.active) {
      await AuditService.log({
        module: 'AUTH',
        action: 'FAILED_LOGIN',
        metadata: { usernameAttempt: input.username, reason: 'USER_NOT_FOUND_OR_INACTIVE' },
      });
      throw new AppError('Invalid username or password.', 401, 'INVALID_CREDENTIALS');
    }

    // Check temporary brute force lock (5 attempts -> 5 minutes lock)
    if (user.lockUntil && user.lockUntil > new Date()) {
      const remainingSeconds = Math.ceil((user.lockUntil.getTime() - Date.now()) / 1000);
      const remainingMinutes = Math.ceil(remainingSeconds / 60);

      await AuditService.log({
        userId: user.id,
        module: 'AUTH',
        action: 'LOCKED_LOGIN_ATTEMPT',
        metadata: { lockRemainingSeconds: remainingSeconds },
      });

      throw new AppError(
        `Account temporarily locked due to 5 consecutive failed attempts. Please try again in ${remainingMinutes} minute(s).`,
        429,
        'ACCOUNT_TEMPORARILY_LOCKED',
        { remainingSeconds }
      );
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);

    if (!isPasswordValid) {
      const nextAttempts = user.failedLoginAttempts + 1;
      const willLock = nextAttempts >= 5;
      const lockUntil = willLock ? new Date(Date.now() + 5 * 60 * 1000) : null;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: willLock ? 0 : nextAttempts,
          lockUntil,
        },
      });

      await AuditService.log({
        userId: user.id,
        module: 'AUTH',
        action: 'FAILED_LOGIN',
        metadata: { attemptCount: nextAttempts, locked: willLock },
      });

      if (willLock) {
        throw new AppError(
          '5 consecutive failed login attempts detected. Account temporarily locked for 5 minutes.',
          429,
          'ACCOUNT_TEMPORARILY_LOCKED',
          { remainingSeconds: 300 }
        );
      }

      throw new AppError('Invalid username or password.', 401, 'INVALID_CREDENTIALS');
    }

    // Reset failed attempts on successful login
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockUntil: null,
        lastLoginAt: new Date(),
      },
    });

    // Token expiration: 72 hours per PRD, 30 days if rememberMe
    const expiresIn = input.rememberMe ? '30d' : env.JWT_EXPIRES_IN;
    const token = jwt.sign(
      {
        id: updatedUser.id,
        username: updatedUser.username,
        role: updatedUser.role,
      },
      env.JWT_SECRET,
      { expiresIn: expiresIn as jwt.SignOptions['expiresIn'] }
    );

    await AuditService.log({
      userId: updatedUser.id,
      module: 'AUTH',
      action: 'LOGIN',
      metadata: { rememberMe: input.rememberMe, role: updatedUser.role },
    });

    return {
      token,
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        role: updatedUser.role,
        lastLoginAt: updatedUser.lastLoginAt,
      },
    };
  }

  public static async verifyRecoveryCode(input: RecoveryCodeVerifyInput) {
    const user = await prisma.user.findUnique({
      where: { username: input.username },
    });

    if (!user || !user.recoveryCodeHash) {
      throw new AppError('Invalid recovery details.', 400, 'INVALID_RECOVERY_CODE');
    }

    const isCodeValid = await bcrypt.compare(input.recoveryCode, user.recoveryCodeHash);
    if (!isCodeValid) {
      await AuditService.log({
        userId: user.id,
        module: 'AUTH',
        action: 'FAILED_RECOVERY_CODE',
      });
      throw new AppError('Invalid recovery code provided.', 400, 'INVALID_RECOVERY_CODE');
    }

    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(input.newPassword, salt);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        failedLoginAttempts: 0,
        lockUntil: null,
      },
    });

    await AuditService.log({
      userId: user.id,
      module: 'AUTH',
      action: 'PASSWORD_RESET_RECOVERY_CODE',
    });

    return {
      success: true,
      message: 'Password has been reset successfully. You can now login with your new password.',
    };
  }
}
