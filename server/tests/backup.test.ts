/**
 * Phase 7 — Recovery Tests
 *
 * Unit tests for the crypto utilities and BackupService validation logic.
 * Integration tests for the backup API routes.
 *
 * NOTE: Backup creation/restore run in-process against the live DB and are
 * verified manually / end-to-end. The SQL splitter, validation, decryption,
 * checksum and route authorization paths are tested here without a DB.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { encrypt, decrypt, sha256, deriveKey } from '../src/utils/crypto.js';
import { BackupService, splitSqlStatements, assertRestorableDump } from '../src/services/backup.service.js';

// ──────────────────────────────────────────────────────────────────────────────
// Unit tests: crypto.ts
// ──────────────────────────────────────────────────────────────────────────────
describe('crypto utilities', () => {
  const passphrase = 'test-passphrase-for-unit-tests';
  const plaintext = Buffer.from('Hello, Uma Bhavan!', 'utf8');

  it('deriveKey produces a 32-byte buffer', () => {
    const key = deriveKey(passphrase);
    expect(key).toBeInstanceOf(Buffer);
    expect(key.byteLength).toBe(32);
  });

  it('deriveKey is deterministic for the same passphrase', () => {
    expect(deriveKey(passphrase).toString('hex')).toBe(deriveKey(passphrase).toString('hex'));
  });

  it('encrypt produces a buffer longer than the plaintext', () => {
    const ciphertext = encrypt(plaintext, passphrase);
    expect(ciphertext.byteLength).toBeGreaterThan(plaintext.byteLength);
  });

  it('encrypt then decrypt recovers original plaintext', () => {
    const ciphertext = encrypt(plaintext, passphrase);
    const recovered = decrypt(ciphertext, passphrase);
    expect(recovered.toString('utf8')).toBe('Hello, Uma Bhavan!');
  });

  it('decrypt with wrong key throws', () => {
    const ciphertext = encrypt(plaintext, passphrase);
    expect(() => decrypt(ciphertext, 'wrong-key')).toThrow();
  });

  it('sha256 returns a 64-char hex string', () => {
    const hash = sha256(Buffer.from('abc', 'utf8'));
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[a-f0-9]+$/);
  });

  it('sha256 is deterministic', () => {
    expect(sha256(Buffer.from('abc'))).toBe(sha256(Buffer.from('abc')));
  });

  it('two encryptions of same data produce different ciphertexts (random IV)', () => {
    const a = encrypt(plaintext, passphrase);
    const b = encrypt(plaintext, passphrase);
    expect(a.toString('hex')).not.toBe(b.toString('hex'));
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Unit tests: BackupService.validateBackup (no DB required)
// ──────────────────────────────────────────────────────────────────────────────
describe('BackupService.validateBackup', () => {
  const KEY = 'test-backup-key-16chars';

  /** Build a minimal valid .ubak buffer for testing */
  function buildValidBackupBuffer(overrides: Partial<Record<string, unknown>> = {}): Buffer {
    const dump = 'DROP TABLE IF EXISTS `t`;\nCREATE TABLE `t` (id int);\nINSERT INTO `t` (`id`) VALUES\n(\'1\');';
    const checksum = sha256(Buffer.from(dump, 'utf8'));
    const payload = {
      version: '1',
      schemaVersion: '20240101_init',
      createdAt: new Date().toISOString(),
      checksum,
      dump,
      ...overrides,
    };
    return encrypt(Buffer.from(JSON.stringify(payload), 'utf8'), KEY);
  }

  beforeEach(() => {
    // Patch env to inject a test key
    vi.stubEnv('BACKUP_ENCRYPTION_KEY', KEY);
    vi.spyOn(BackupService as any, 'getSchemaVersion').mockResolvedValue('20240101_init');
  });

  it('validates a well-formed backup file successfully', async () => {
    const buffer = buildValidBackupBuffer();
    const result = await BackupService.validateBackup(buffer);
    expect(result.valid).toBe(true);
    expect(result.checksumMatch).toBe(true);
    expect(result.schemaVersion).toBe('20240101_init');
    expect(result.schemaMatches).toBe(true);
  });

  it('returns checksumMatch=false when dump is tampered', async () => {
    const dump = 'SELECT 1; -- original dump';
    const tamperedChecksum = sha256(Buffer.from('different content', 'utf8'));
    const payload = {
      version: '1',
      schemaVersion: '20240101_init',
      createdAt: new Date().toISOString(),
      checksum: tamperedChecksum,
      dump,
    };
    const buffer = encrypt(Buffer.from(JSON.stringify(payload), 'utf8'), KEY);
    const result = await BackupService.validateBackup(buffer);
    expect(result.valid).toBe(false);
    expect(result.checksumMatch).toBe(false);
  });

  it('throws BACKUP_DECRYPT_FAILED for corrupt/wrong-key buffer', async () => {
    const corruptBuffer = Buffer.from('not-a-valid-ubak-file');
    await expect(BackupService.validateBackup(corruptBuffer)).rejects.toMatchObject({
      code: 'BACKUP_DECRYPT_FAILED',
    });
  });

  it('throws BACKUP_INVALID_FORMAT when version field is wrong', async () => {
    const buffer = buildValidBackupBuffer({ version: '99' });
    await expect(BackupService.validateBackup(buffer)).rejects.toMatchObject({
      code: 'BACKUP_INVALID_FORMAT',
    });
  });

  it('throws BACKUP_INVALID_FORMAT when dump field is missing', async () => {
    const buffer = buildValidBackupBuffer({ dump: undefined });
    await expect(BackupService.validateBackup(buffer)).rejects.toMatchObject({
      code: 'BACKUP_INVALID_FORMAT',
    });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Integration tests: Backup API routes — authorization boundary
// ──────────────────────────────────────────────────────────────────────────────
describe('Backup API routes — authorization', () => {
  it('GET /api/v1/backups returns 401 without authentication', async () => {
    const res = await request(app).get('/api/v1/backups');
    expect(res.status).toBe(401);
  });

  it('POST /api/v1/backups returns 401 without authentication', async () => {
    const res = await request(app).post('/api/v1/backups');
    expect(res.status).toBe(401);
  });

  it('POST /api/v1/backups/validate returns 401 without authentication', async () => {
    const res = await request(app)
      .post('/api/v1/backups/validate')
      .set('Content-Type', 'application/octet-stream')
      .send(Buffer.from('dummy'));
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/backups/:id/download returns 401 without authentication', async () => {
    const res = await request(app).get('/api/v1/backups/some-id/download');
    expect(res.status).toBe(401);
  });

  it('POST /api/v1/backups/restore returns 401 without authentication', async () => {
    const res = await request(app)
      .post('/api/v1/backups/restore')
      .set('Content-Type', 'application/octet-stream')
      .send(Buffer.from('dummy'));
    expect(res.status).toBe(401);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Boundary: BACKUP_ENCRYPTION_KEY guard
// ──────────────────────────────────────────────────────────────────────────────
describe('BackupService — missing BACKUP_ENCRYPTION_KEY', () => {
  beforeEach(() => {
    vi.stubEnv('BACKUP_ENCRYPTION_KEY', '');
  });

  it('createBackup throws CONFIG_ERROR when key is not configured', async () => {
    await expect(BackupService.createBackup('user-id', 'MANUAL')).rejects.toMatchObject({
      code: 'CONFIG_ERROR',
    });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Unit tests: SQL statement splitter used by restore
// ──────────────────────────────────────────────────────────────────────────────
describe('splitSqlStatements', () => {
  it('splits simple statements and drops empty ones', () => {
    expect(splitSqlStatements('SET A=1;\n\nSET B=2;;')).toEqual(['SET A=1', 'SET B=2']);
  });

  it('keeps semicolons, newlines and escaped quotes inside string literals', () => {
    const sql = "INSERT INTO t VALUES ('a;b','it\\'s','line1\nline2;','O''Brien');\nSELECT 1;";
    const out = splitSqlStatements(sql);
    expect(out).toHaveLength(2);
    expect(out[0]).toBe("INSERT INTO t VALUES ('a;b','it\\'s','line1\nline2;','O''Brien')");
  });

  it('handles backtick identifiers containing semicolons', () => {
    expect(splitSqlStatements('CREATE TABLE `we;ird` (id int);')).toEqual(['CREATE TABLE `we;ird` (id int)']);
  });

  it('strips line and block comments but keeps MySQL versioned comments', () => {
    const sql = [
      '-- Uma Bhavan backup',
      '# hash comment',
      '/* plain block; comment */',
      "/*!40101 SET NAMES utf8mb4 */;",
      'DROP TABLE IF EXISTS `t`;',
    ].join('\n');
    expect(splitSqlStatements(sql)).toEqual(['/*!40101 SET NAMES utf8mb4 */', 'DROP TABLE IF EXISTS `t`']);
  });

  it('does not treat "--" without a following space as a comment', () => {
    expect(splitSqlStatements('SELECT 5--3;')).toEqual(['SELECT 5--3']);
  });
});

describe('assertRestorableDump', () => {
  const ok = ['SET NAMES utf8mb4', 'DROP TABLE IF EXISTS `t`', 'CREATE TABLE `t` (id int)', "INSERT INTO `t` VALUES ('1')"];

  it('accepts a well-formed dump', () => {
    expect(() => assertRestorableDump(ok)).not.toThrow();
  });

  it('accepts mysqldump-style SET comments between DROP and CREATE', () => {
    expect(() =>
      assertRestorableDump(['DROP TABLE IF EXISTS `t`', '/*!40101 SET @saved_cs_client = @@character_set_client */', 'CREATE TABLE `t` (id int)'])
    ).not.toThrow();
  });

  it('rejects a DROP that is not followed by its CREATE (the "undefined" case)', () => {
    expect(() => assertRestorableDump(['DROP TABLE IF EXISTS `t`', 'undefined'])).toThrow(/invalid statement|never recreated/);
    expect(() => assertRestorableDump(['DROP TABLE IF EXISTS `a`', 'CREATE TABLE `b` (id int)'])).toThrow(/never recreated/);
  });

  it('rejects a dump with no tables', () => {
    expect(() => assertRestorableDump(['SELECT 1'])).toThrow(/no tables/);
  });
});
