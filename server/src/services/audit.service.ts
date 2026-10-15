import { prisma } from '../db/prisma.js';
import { logger } from '../utils/logger.js';

export interface CreateAuditLogParams {
  userId?: string | null;
  module: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

export class AuditService {
  public static async log(params: CreateAuditLogParams): Promise<void> {
    try {
      // Ensure no IP, device, old/new diffs, or passwords are included in metadata
      const cleanMetadata = params.metadata ? JSON.stringify(params.metadata) : null;

      await prisma.auditLog.create({
        data: {
          userId: params.userId || null,
          module: params.module,
          action: params.action,
          entityType: params.entityType || null,
          entityId: params.entityId || null,
          metadata: cleanMetadata,
          occurredAt: new Date(),
        },
      });

      logger.info(`[Audit] ${params.module} - ${params.action}`, {
        userId: params.userId,
        entityType: params.entityType,
        entityId: params.entityId,
      });
    } catch (error) {
      // Operational resilience: log error to system logger without failing calling operation
      logger.error('Failed to create audit log entry', { error, params });
    }
  }
  public static async getLogs(params: { page?: number; limit?: number; module?: string }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const skip = (page - 1) * limit;
    const where: { module?: string } = {};
    if (params.module) where.module = params.module;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        take: limit,
        skip,
        include: {
          user: { select: { id: true, username: true, role: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
