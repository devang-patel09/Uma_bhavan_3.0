import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../src/app.js';
import { prisma } from '../src/db/prisma.js';

describe('Auth Endpoints & Business Logic', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/v1/auth/login validation', () => {
    it('should fail with 400 when username or password is too short', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'a', password: '123' });

      expect(response.status).toBe(400);
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
      expect(response.body.error.details).toHaveProperty('username');
      expect(response.body.error.details).toHaveProperty('password');
    });
  });

  describe('POST /api/v1/auth/login credentials & locking', () => {
    it('should return 401 for non-existent user', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null as any);
      vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as any);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'nonexistent', password: 'Password123' });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should return 429 when account is temporarily locked', async () => {
      const lockUntil = new Date(Date.now() + 4 * 60 * 1000); // 4 mins remaining
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'usr_1',
        username: 'admin',
        passwordHash: 'hash',
        role: 'SUPER_ADMIN',
        active: true,
        failedLoginAttempts: 5,
        lockUntil,
      } as any);
      vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as any);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'admin', password: 'Password123' });

      expect(response.status).toBe(429);
      expect(response.body.error.code).toBe('ACCOUNT_TEMPORARILY_LOCKED');
    });

    it('should trigger temporary lock on 5th consecutive failed attempt', async () => {
      const userRecord = {
        id: 'usr_1',
        username: 'admin',
        passwordHash: await bcrypt.hash('CorrectPassword123', 10),
        role: 'SUPER_ADMIN',
        active: true,
        failedLoginAttempts: 4, // 4 prior failed attempts
        lockUntil: null,
      };

      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(userRecord as any);
      const updateSpy = vi.spyOn(prisma.user, 'update').mockResolvedValue({} as any);
      vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as any);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'admin', password: 'WrongPassword123' });

      expect(response.status).toBe(429);
      expect(response.body.error.code).toBe('ACCOUNT_TEMPORARILY_LOCKED');
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            failedLoginAttempts: 0,
            lockUntil: expect.any(Date),
          }),
        })
      );
    });

    it('should successfully log in with valid credentials and return JWT', async () => {
      const password = 'AdminPassword123';
      const passwordHash = await bcrypt.hash(password, 10);
      const userRecord = {
        id: 'usr_1',
        username: 'admin',
        passwordHash,
        role: 'SUPER_ADMIN',
        active: true,
        failedLoginAttempts: 2,
        lockUntil: null,
        lastLoginAt: new Date(),
      };

      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(userRecord as any);
      vi.spyOn(prisma.user, 'update').mockResolvedValue({
        ...userRecord,
        failedLoginAttempts: 0,
      } as any);
      vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as any);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'admin', password, rememberMe: true });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user.username).toBe('admin');
      expect(response.headers['set-cookie']).toBeDefined();
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should reject unauthenticated request with 401', async () => {
      const response = await request(app).get('/api/v1/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should accept valid Bearer token', async () => {
      const password = 'AdminPassword123';
      const passwordHash = await bcrypt.hash(password, 10);
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'usr_1',
        username: 'admin',
        passwordHash,
        role: 'SUPER_ADMIN',
        active: true,
        failedLoginAttempts: 0,
        lockUntil: null,
      } as any);
      vi.spyOn(prisma.user, 'update').mockResolvedValue({
        id: 'usr_1',
        username: 'admin',
        role: 'SUPER_ADMIN',
      } as any);
      vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as any);

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'admin', password });

      const token = loginRes.body.data.token;

      const meRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(meRes.status).toBe(200);
      expect(meRes.body.data.user.username).toBe('admin');
      expect(meRes.body.data.user.role).toBe('SUPER_ADMIN');
    });
  });
});
