/**
 * Crypto utilities for backup encryption / decryption.
 * Uses AES-256-CBC with a random IV prepended to the ciphertext.
 * The backup encryption key is derived from BACKUP_ENCRYPTION_KEY in env.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

/** Algorithm constants */
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // AES block size
const _KEY_LENGTH = 32; // AES-256 → 32 bytes

/**
 * Derive a 32-byte key from an arbitrary-length passphrase using SHA-256.
 */
export function deriveKey(passphrase: string): Buffer {
  return createHash('sha256').update(passphrase).digest();
}

/**
 * Encrypt a Buffer using AES-256-CBC.
 * Returns a Buffer: [16-byte IV][ciphertext].
 */
export function encrypt(plaintext: Buffer, passphrase: string): Buffer {
  const key = deriveKey(passphrase);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return Buffer.concat([iv, encrypted]);
}

/**
 * Decrypt a Buffer produced by `encrypt`.
 * Expects [16-byte IV][ciphertext].
 */
export function decrypt(ciphertext: Buffer, passphrase: string): Buffer {
  const key = deriveKey(passphrase);
  const iv = ciphertext.subarray(0, IV_LENGTH);
  const data = ciphertext.subarray(IV_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  return Buffer.concat([decipher.update(data), decipher.final()]);
}

/**
 * Compute a SHA-256 hex digest of a Buffer.
 */
export function sha256(data: Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}
