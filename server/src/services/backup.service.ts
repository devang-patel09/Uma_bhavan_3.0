/**
 * BackupService — Phase 7 Recovery
 *
 * Backup package format (.ubak):
 *   The file is AES-256-CBC encrypted.
 *   When decrypted, the payload is a JSON object:
 *   {
 *     "version": "1",
 *     "schemaVersion": "<prisma migration name>",
 *     "createdAt": "<ISO8601>",
 *     "checksum": "<SHA-256 of dump>",
 *     "dump": "<mysqldump output as UTF-8 string>"
 *   }
 *
 * Encryption key comes from env.BACKUP_ENCRYPTION_KEY.
 * If not set, the server refuses to create or restore backups (fail-safe).
 */
import { execFile, spawn } from 'child_process';
import { promisify } from 'util';
import { prisma } from '../db/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { AuditService } from './audit.service.js';
import { logger } from '../utils/logger.js';
import { encrypt, decrypt, sha256 } from '../utils/crypto.js';
import { env } from '../config/env.js';

const execFileAsync = promisify(execFile);

/** Parsed DATABASE_URL components */
interface DbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

/**
 * Parse a mysql connection URL of the form:
 *   mysql://user:password@host:port/database
 */
function parseDbUrl(url: string): DbConfig {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname || 'localhost',
      port: parsed.port ? parseInt(parsed.port, 10) : 3306,
      user: parsed.username,
      password: parsed.password,
      database: parsed.pathname.replace(/^\//, ''),
    };
  } catch {
    throw new AppError('Invalid DATABASE_URL format', 500, 'CONFIG_ERROR');
  }
}

/** Payload embedded in every backup file */
interface BackupPayload {
  version: '1';
  schemaVersion: string;
  createdAt: string;
  checksum: string;
  dump: string;
}

export interface BackupResult {
  fileName: string;
  checksum: string;
  schemaVersion: string;
  sizeBytes: number;
  encryptedBuffer: Buffer;
}

export class BackupService {
  // ─── Helpers ────────────────────────────────────────────────────────────────

  private static getEncryptionKey(): string {
    const key =
      process.env.BACKUP_ENCRYPTION_KEY !== undefined
        ? process.env.BACKUP_ENCRYPTION_KEY
        : env.BACKUP_ENCRYPTION_KEY;
    if (!key || key.length < 16) {
      throw new AppError(
        'BACKUP_ENCRYPTION_KEY is not configured or is too short (min 16 chars). Set it in your .env file.',
        500,
        'CONFIG_ERROR',
      );
    }
    return key;
  }

  /**
   * Run mysqldump and return the SQL dump as a string.
   */
  private static async runMysqldump(db: DbConfig): Promise<string> {
    const args = [
      `--host=${db.host}`,
      `--port=${db.port}`,
      `--user=${db.user}`,
      `--password=${db.password}`,
      '--single-transaction',
      '--routines',
      '--triggers',
      '--add-drop-table',
      '--skip-lock-tables',
      db.database,
    ];

    try {
      const { stdout } = await execFileAsync('mysqldump', args, {
        maxBuffer: 100 * 1024 * 1024, // 100 MB max
        env: { ...process.env, MYSQL_PWD: db.password }, // suppress password warning on newer clients
      });
      return stdout;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error('mysqldump failed', { error: msg });
      throw new AppError(
        `Database dump failed. Ensure mysqldump is installed and DATABASE_URL is correct. Detail: ${msg}`,
        500,
        'BACKUP_DUMP_FAILED',
      );
    }
  }

  /**
   * Determine the latest applied migration name as schemaVersion.
   * Falls back to 'unknown' if the _prisma_migrations table is unavailable.
   */
  private static async getSchemaVersion(): Promise<string> {
    try {
      const rows = await prisma.$queryRaw<{ migration_name: string }[]>`
        SELECT migration_name FROM _prisma_migrations
        WHERE finished_at IS NOT NULL
        ORDER BY finished_at DESC
        LIMIT 1
      `;
      return rows[0]?.migration_name ?? 'unknown';
    } catch {
      return 'unknown';
    }
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  /**
   * Create an encrypted backup.
   * Returns the encrypted buffer (to be streamed to the client) and metadata.
   */
  public static async createBackup(
    userId: string,
    backupType: 'MANUAL' | 'PRE_RESTORE_SAFETY' = 'MANUAL',
  ): Promise<BackupResult> {
    const key = BackupService.getEncryptionKey();
    const dbUrl = env.DATABASE_URL;
    if (!dbUrl) throw new AppError('DATABASE_URL not configured', 500, 'CONFIG_ERROR');

    const db = parseDbUrl(dbUrl);
    const schemaVersion = await BackupService.getSchemaVersion();
    const createdAt = new Date().toISOString();

    logger.info(`[Backup] Starting ${backupType} backup`, { userId, schemaVersion });

    const dump = await BackupService.runMysqldump(db);
    const checksum = sha256(Buffer.from(dump, 'utf8'));

    const payload: BackupPayload = {
      version: '1',
      schemaVersion,
      createdAt,
      checksum,
      dump,
    };

    const payloadBuffer = Buffer.from(JSON.stringify(payload), 'utf8');
    const encryptedBuffer = encrypt(payloadBuffer, key);

    const timestamp = createdAt.replace(/[:.]/g, '-');
    const fileName = `uma-bhavan-backup-${timestamp}.ubak`;

    // Persist metadata record in DB
    await prisma.backupRecord.create({
      data: {
        createdById: userId,
        backupType,
        checksum,
        schemaVersion,
        fileName,
      },
    });

    await AuditService.log({
      userId,
      module: 'Backup',
      action: backupType === 'MANUAL' ? 'BACKUP_CREATED' : 'SAFETY_BACKUP_CREATED',
      metadata: { fileName, schemaVersion, checksum },
    });

    logger.info(`[Backup] ${backupType} backup complete`, { fileName, checksum });

    return {
      fileName,
      checksum,
      schemaVersion,
      sizeBytes: encryptedBuffer.length,
      encryptedBuffer,
    };
  }

  /**
   * Validate and restore from an encrypted backup file buffer.
   *
   * Steps:
   *  1. Decrypt and parse the backup payload.
   *  2. Validate checksum of the embedded dump.
   *  3. Verify schema version compatibility.
   *  4. Automatically create a safety backup of the current DB.
   *  5. Execute the SQL dump against the live database.
   *  6. Audit the restore event.
   */
  public static async restoreBackup(
    userId: string,
    fileBuffer: Buffer,
  ): Promise<{ schemaVersion: string; safetyBackupFileName: string }> {
    const key = BackupService.getEncryptionKey();
    const dbUrl = env.DATABASE_URL;
    if (!dbUrl) throw new AppError('DATABASE_URL not configured', 500, 'CONFIG_ERROR');

    // 1. Decrypt
    let payload: BackupPayload;
    try {
      const decrypted = decrypt(fileBuffer, key);
      payload = JSON.parse(decrypted.toString('utf8')) as BackupPayload;
    } catch {
      throw new AppError(
        'Failed to decrypt backup file. The file may be corrupt, tampered with, or encrypted with a different key.',
        400,
        'BACKUP_DECRYPT_FAILED',
      );
    }

    // 2. Validate payload structure
    if (payload.version !== '1' || !payload.dump || !payload.checksum || !payload.schemaVersion) {
      throw new AppError('Backup file has an invalid or unrecognised format.', 400, 'BACKUP_INVALID_FORMAT');
    }

    // 3. Verify checksum
    const actualChecksum = sha256(Buffer.from(payload.dump, 'utf8'));
    if (actualChecksum !== payload.checksum) {
      throw new AppError(
        'Backup integrity check failed: checksum mismatch. The file may be corrupted.',
        400,
        'BACKUP_CHECKSUM_MISMATCH',
      );
    }

    // 4. Schema version compatibility check
    const currentSchemaVersion = await BackupService.getSchemaVersion();
    if (payload.schemaVersion !== currentSchemaVersion) {
      logger.warn('[Restore] Schema version mismatch', {
        backupSchema: payload.schemaVersion,
        currentSchema: currentSchemaVersion,
      });
      // Non-blocking warning — restore proceeds but we surface this in audit.
    }

    // 5. Safety backup before restore
    logger.info('[Restore] Creating pre-restore safety backup', { userId });
    const safetyResult = await BackupService.createBackup(userId, 'PRE_RESTORE_SAFETY');

    // 6. Execute restore
    const db = parseDbUrl(dbUrl);
    await BackupService.executeSqlRestore(db, payload.dump);

    await AuditService.log({
      userId,
      module: 'Backup',
      action: 'RESTORE_COMPLETED',
      metadata: {
        backupSchemaVersion: payload.schemaVersion,
        currentSchemaVersion,
        backupCreatedAt: payload.createdAt,
        safetyBackup: safetyResult.fileName,
      },
    });

    logger.info('[Restore] Restore completed successfully', {
      backupSchemaVersion: payload.schemaVersion,
      safetyBackup: safetyResult.fileName,
    });

    return {
      schemaVersion: payload.schemaVersion,
      safetyBackupFileName: safetyResult.fileName,
    };
  }

  /**
   * Validate a backup file without restoring it.
   * Returns metadata from the backup payload.
   */
  public static async validateBackup(fileBuffer: Buffer): Promise<{
    valid: boolean;
    schemaVersion: string;
    createdAt: string;
    checksum: string;
    checksumMatch: boolean;
  }> {
    const key = BackupService.getEncryptionKey();

    let payload: BackupPayload;
    try {
      const decrypted = decrypt(fileBuffer, key);
      payload = JSON.parse(decrypted.toString('utf8')) as BackupPayload;
    } catch {
      throw new AppError(
        'Failed to decrypt/parse backup file. File may be corrupt or encrypted with a different key.',
        400,
        'BACKUP_DECRYPT_FAILED',
      );
    }

    if (payload.version !== '1' || !payload.dump || !payload.checksum) {
      throw new AppError('Backup file has an invalid format.', 400, 'BACKUP_INVALID_FORMAT');
    }

    const actualChecksum = sha256(Buffer.from(payload.dump, 'utf8'));
    const checksumMatch = actualChecksum === payload.checksum;

    return {
      valid: checksumMatch,
      schemaVersion: payload.schemaVersion,
      createdAt: payload.createdAt,
      checksum: payload.checksum,
      checksumMatch,
    };
  }

  /**
   * List all backup metadata records (most recent first).
   */
  public static async listBackups(limit = 50, offset = 0) {
    const [records, total] = await Promise.all([
      prisma.backupRecord.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          createdBy: { select: { id: true, username: true } },
        },
      }),
      prisma.backupRecord.count(),
    ]);

    return { records, total };
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  /**
   * Execute a SQL dump string against the target database using the mysql CLI.
   */
  private static async executeSqlRestore(db: DbConfig, sql: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = [
        `--host=${db.host}`,
        `--port=${db.port}`,
        `--user=${db.user}`,
        `--password=${db.password}`,
        db.database,
      ];

      const child = spawn('mysql', args, {
        env: { ...process.env, MYSQL_PWD: db.password },
      });

      let stderr = '';
      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      child.on('error', (err) => {
        logger.error('[Restore] mysql process spawn error', { error: err.message });
        reject(
          new AppError(
            `Database restore failed to start mysql CLI. Detail: ${err.message}`,
            500,
            'RESTORE_FAILED',
          ),
        );
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          logger.error('[Restore] mysql restore failed', { exitCode: code, stderr });
          reject(
            new AppError(
              `Database restore failed (exit code ${code}). Detail: ${stderr}`,
              500,
              'RESTORE_FAILED',
            ),
          );
        }
      });

      child.stdin.write(sql);
      child.stdin.end();
    });
  }
}
