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
 *
 * The SQL dump is generated and restored in-process through Prisma, so no
 * `mysqldump` / `mysql` CLI is required (they are not available on Render or
 * most dev machines). Values are rendered by MySQL's own QUOTE() so escaping
 * is exact. Every backup file is also kept on the server in BACKUP_DIR
 * (default: ./backups) so safety backups can be downloaded later.
 */
import { promises as fs, existsSync } from 'fs';
import path from 'path';
import { prisma } from '../db/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { AuditService } from './audit.service.js';
import { logger } from '../utils/logger.js';
import { encrypt, decrypt, sha256 } from '../utils/crypto.js';
import { env } from '../config/env.js';

/** Where backup files are kept on the server. */
export function getBackupDir(): string {
  return path.resolve(process.env.BACKUP_DIR || path.join(process.cwd(), 'backups'));
}

/** Rows per INSERT statement in generated dumps. */
const INSERT_BATCH = 200;
const BINARY_TYPES = new Set(['binary', 'varbinary', 'blob', 'tinyblob', 'mediumblob', 'longblob', 'bit']);

/**
 * Split a SQL script into individual statements.
 * Understands '...', "...", `...` quoting (with backslash and doubled-quote
 * escapes), `-- ` / `#` line comments and block comments. MySQL versioned
 * comments (`/*!40101 ... *\/`) are kept because the server executes them.
 */
export function splitSqlStatements(sql: string): string[] {
  const out: string[] = [];
  let buf = '';
  let i = 0;
  const n = sql.length;
  while (i < n) {
    const ch = sql[i];
    const next = sql[i + 1];
    // line comments
    if ((ch === '-' && next === '-' && (sql[i + 2] === ' ' || sql[i + 2] === '\t' || sql[i + 2] === '\n' || sql[i + 2] === undefined)) || ch === '#') {
      while (i < n && sql[i] !== '\n') i++;
      continue;
    }
    // block comments (drop plain ones, keep versioned /*! ... */)
    if (ch === '/' && next === '*') {
      const end = sql.indexOf('*/', i + 2);
      const stop = end === -1 ? n : end + 2;
      if (sql[i + 2] === '!') buf += sql.slice(i, stop);
      i = stop;
      continue;
    }
    // quoted strings / identifiers
    if (ch === "'" || ch === '"' || ch === '`') {
      const quote = ch;
      let j = i + 1;
      while (j < n) {
        if (sql[j] === '\\' && quote !== '`') { j += 2; continue; }
        if (sql[j] === quote) {
          if (sql[j + 1] === quote) { j += 2; continue; } // doubled quote escape
          break;
        }
        j++;
      }
      buf += sql.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    if (ch === ';') {
      if (buf.trim()) out.push(buf.trim());
      buf = '';
      i++;
      continue;
    }
    buf += ch;
    i++;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

/**
 * Structural check run before a dump is saved or restored: there must be at
 * least one table, every `DROP TABLE x` must be followed by `CREATE TABLE x`,
 * and no statement may be a stray JS value. This guarantees a restore never
 * drops a table it can't recreate.
 */
export function assertRestorableDump(statements: string[]): void {
  const tableName = (stmt: string, re: RegExp) => stmt.match(re)?.[1]?.replace(/``/g, '`');
  let creates = 0;
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    if (/^(undefined|null|NaN|\[object Object\])$/i.test(stmt)) {
      throw new AppError('Backup contains an invalid statement and cannot be restored.', 400, 'BACKUP_INVALID_FORMAT');
    }
    const dropped = tableName(stmt, /^DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?`((?:[^`]|``)+)`/i);
    if (dropped) {
      // Skip versioned-comment SET statements mysqldump puts in between.
      let j = i + 1;
      while (j < statements.length && /^(\/\*!|SET\s)/i.test(statements[j])) j++;
      const created = statements[j] ? tableName(statements[j], /^CREATE\s+TABLE\s+`((?:[^`]|``)+)`/i) : undefined;
      if (created !== dropped) {
        throw new AppError(
          `Backup is incomplete: table "${dropped}" is dropped but never recreated. Restore refused.`,
          400,
          'BACKUP_INVALID_FORMAT',
        );
      }
    }
    if (/^CREATE\s+TABLE\s/i.test(stmt)) creates++;
  }
  if (creates === 0) {
    throw new AppError('Backup contains no tables and cannot be restored.', 400, 'BACKUP_INVALID_FORMAT');
  }
}

/** Statements that can't run through the prepared-statement protocol and aren't needed. */
function isSkippableStatement(stmt: string): boolean {
  return /^(LOCK\s+TABLES|UNLOCK\s+TABLES)\b/i.test(stmt);
}

const qid = (name: string) => `\`${name.replace(/`/g, '``')}\``;

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
   * Produce a full SQL dump (DROP/CREATE + INSERTs for every table) in-process.
   */
  private static async dumpDatabase(): Promise<string> {
    try {
      const tables = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
        `SELECT TABLE_NAME AS name FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME`
      );
      const parts: string[] = [
        `-- Uma Bhavan backup generated ${new Date().toISOString()}`,
        'SET NAMES utf8mb4;',
        'SET FOREIGN_KEY_CHECKS=0;',
      ];
      for (const { name } of tables) {
        const [create] = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(`SHOW CREATE TABLE ${qid(name)}`);
        // Column names vary by driver (e.g. "Create Table" vs f1) — read it positionally.
        const createSql = create ? Object.values(create)[1] : undefined;
        if (typeof createSql !== 'string' || !/^CREATE TABLE/i.test(createSql)) {
          throw new Error(`Could not read the table definition for "${name}".`);
        }
        const columns = await prisma.$queryRawUnsafe<Array<{ col: string; type: string }>>(
          `SELECT COLUMN_NAME AS col, DATA_TYPE AS type FROM information_schema.COLUMNS
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION`,
          name
        );
        parts.push('', `-- Table ${name}`, `DROP TABLE IF EXISTS ${qid(name)};`, `${createSql};`);
        if (columns.length === 0) continue;

        // MySQL renders each value as an exact SQL literal (QUOTE gives 'NULL' for NULL).
        const exprs = columns.map(({ col, type }) =>
          BINARY_TYPES.has(type.toLowerCase())
            ? `IF(${qid(col)} IS NULL, 'NULL', CONCAT('0x', HEX(${qid(col)})))`
            : `QUOTE(${qid(col)})`
        );
        const colList = columns.map((c) => qid(c.col)).join(', ');
        const rows = await prisma.$queryRawUnsafe<Array<{ v: string }>>(
          `SELECT CONCAT('(', CONCAT_WS(',', ${exprs.join(', ')}), ')') AS v FROM ${qid(name)}`
        );
        for (let i = 0; i < rows.length; i += INSERT_BATCH) {
          const chunk = rows.slice(i, i + INSERT_BATCH).map((r) => r.v);
          parts.push(`INSERT INTO ${qid(name)} (${colList}) VALUES\n${chunk.join(',\n')};`);
        }
      }
      parts.push('', 'SET FOREIGN_KEY_CHECKS=1;', '');
      return parts.join('\n');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error('Database dump failed', { error: msg });
      throw new AppError(`Database dump failed. Detail: ${msg}`, 500, 'BACKUP_DUMP_FAILED');
    }
  }

  /** Saves a backup file into BACKUP_DIR. Failure to save is logged, not fatal for manual backups. */
  private static async saveBackupFile(fileName: string, data: Buffer): Promise<boolean> {
    try {
      const dir = getBackupDir();
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, path.basename(fileName)), data);
      return true;
    } catch (error: unknown) {
      logger.error('[Backup] Could not save backup file to disk', {
        fileName,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
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

    const schemaVersion = await BackupService.getSchemaVersion();
    const createdAt = new Date().toISOString();

    logger.info(`[Backup] Starting ${backupType} backup`, { userId, schemaVersion });

    const dump = await BackupService.dumpDatabase();
    // Never hand out a backup that couldn't be restored.
    assertRestorableDump(splitSqlStatements(dump));
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
    const prefix = backupType === 'MANUAL' ? 'uma-bhavan-backup' : 'uma-bhavan-safety-backup';
    const fileName = `${prefix}-${timestamp}.ubak`;

    // Keep a copy on the server. A safety backup that can't be saved is useless,
    // so that case aborts the restore.
    const saved = await BackupService.saveBackupFile(fileName, encryptedBuffer);
    if (!saved && backupType === 'PRE_RESTORE_SAFETY') {
      throw new AppError(
        'Could not save the safety backup to disk, so the restore was cancelled. Check BACKUP_DIR permissions.',
        500,
        'SAFETY_BACKUP_FAILED',
      );
    }

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

    // 4b. Structural check BEFORE touching anything
    const statements = splitSqlStatements(payload.dump).filter((s) => !isSkippableStatement(s));
    assertRestorableDump(statements);

    // 5. Safety backup before restore
    logger.info('[Restore] Creating pre-restore safety backup', { userId });
    const safetyResult = await BackupService.createBackup(userId, 'PRE_RESTORE_SAFETY');

    // 6. Execute restore
    await BackupService.executeSqlRestore(statements);

    // The restore replaced backup_records with the backup's copy; re-register the
    // safety backup so it stays visible (and downloadable) in history.
    await prisma.backupRecord
      .create({
        data: {
          createdById: userId,
          backupType: 'PRE_RESTORE_SAFETY',
          checksum: safetyResult.checksum,
          schemaVersion: safetyResult.schemaVersion,
          fileName: safetyResult.fileName,
        },
      })
      .catch((e: unknown) =>
        logger.warn('[Restore] Could not re-register safety backup record', {
          error: e instanceof Error ? e.message : String(e),
        }),
      );

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
    restorable: boolean;
    schemaMatches: boolean;
    currentSchemaVersion: string;
    tableCount: number;
    sizeBytes: number;
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
    const currentSchemaVersion = await BackupService.getSchemaVersion();
    const stmts = splitSqlStatements(payload.dump);
    const tableCount = stmts.filter((st) => /^CREATE\s+TABLE\s/i.test(st)).length;
    let restorable = true;
    try {
      assertRestorableDump(stmts.filter((st) => !isSkippableStatement(st)));
    } catch {
      restorable = false;
    }

    return {
      valid: checksumMatch && restorable,
      schemaVersion: payload.schemaVersion,
      createdAt: payload.createdAt,
      checksum: payload.checksum,
      checksumMatch,
      restorable,
      schemaMatches: payload.schemaVersion === currentSchemaVersion,
      currentSchemaVersion,
      tableCount,
      sizeBytes: fileBuffer.length,
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

    const dir = getBackupDir();
    return {
      records: records.map((r) => ({ ...r, fileAvailable: existsSync(path.join(dir, path.basename(r.fileName))) })),
      total,
    };
  }

  /** Reads a stored backup file by record id (for download). */
  public static async getBackupFile(id: string): Promise<{ fileName: string; data: Buffer }> {
    const record = await prisma.backupRecord.findUnique({ where: { id } });
    if (!record) throw new AppError('Backup record not found.', 404, 'NOT_FOUND');
    const fileName = path.basename(record.fileName);
    try {
      const data = await fs.readFile(path.join(getBackupDir(), fileName));
      return { fileName, data };
    } catch {
      throw new AppError('This backup file is no longer stored on the server.', 404, 'BACKUP_FILE_MISSING');
    }
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  /**
   * Execute a SQL dump against the live database, in-process.
   * All statements run on one pinned connection (interactive transaction) so
   * session settings like FOREIGN_KEY_CHECKS apply to the whole script.
   * Note: DDL (DROP/CREATE TABLE) auto-commits in MySQL, which is why a safety
   * backup is always taken first.
   */
  private static async executeSqlRestore(statements: string[]): Promise<void> {
    let current = '';
    try {
      await prisma.$transaction(
        async (tx) => {
          await tx.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS=0');
          for (const stmt of statements) {
            current = stmt;
            await tx.$executeRawUnsafe(stmt);
          }
          await tx.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS=1');
        },
        { maxWait: 10_000, timeout: 10 * 60_000 },
      );
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error('[Restore] SQL restore failed', { error: msg, statement: current.slice(0, 200) });
      throw new AppError(`Database restore failed. Detail: ${msg.slice(0, 500)}`, 500, 'RESTORE_FAILED');
    }
  }
}
