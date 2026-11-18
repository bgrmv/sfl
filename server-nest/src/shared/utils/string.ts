import { createHash } from 'crypto';

/**
 * The old, unsalted password hash. New passwords use argon2id ({@link ./password});
 * this stays only to check the hashes that are not moved yet (S8.7, ADR 0020).
 */
export function sha512Legacy(str: string): string {
  return createHash('sha-512').update(str).digest('hex');
}
