import { hash, verify } from '@node-rs/argon2';
import { timingSafeEqual } from 'node:crypto';
import { sha512Legacy } from './string';

export type PasswordAlgorithm = 'sha512' | 'argon2id';

// OWASP minimum for argon2id: 19 MiB, 2 iterations, 1 lane. The algorithm is argon2id by default.
const OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1 };

export function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS);
}

/** A stored value is either an argon2id string or a legacy SHA-512 hex (S8.7, ADR 0020). */
export function algorithmOf(stored: string): PasswordAlgorithm {
  return stored.startsWith('$argon2id$') ? 'argon2id' : 'sha512';
}

/** True only for a match; a broken stored value is a mismatch, not an error. */
export async function verifyPassword(
  stored: string,
  password: string,
): Promise<boolean> {
  if (algorithmOf(stored) === 'argon2id') {
    try {
      return await verify(stored, password);
    } catch {
      return false;
    }
  }
  const expected = Buffer.from(stored);
  const actual = Buffer.from(sha512Legacy(password));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
