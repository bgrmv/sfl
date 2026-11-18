import { sha512Legacy } from './string';
import { algorithmOf, hashPassword, verifyPassword } from './password';

describe('password hashing (S8.7)', () => {
  it('hashes with argon2id and a salt: the same password gives two different hashes', async () => {
    const a = await hashPassword('correct horse');
    const b = await hashPassword('correct horse');

    expect(a).toMatch(/^\$argon2id\$/);
    expect(a).not.toBe(b);
    expect(algorithmOf(a)).toBe('argon2id');
  });

  it('verifies an argon2id hash, rejects a wrong password', async () => {
    const stored = await hashPassword('correct horse');

    expect(await verifyPassword(stored, 'correct horse')).toBe(true);
    expect(await verifyPassword(stored, 'wrong horse')).toBe(false);
  });

  it('still verifies a legacy SHA-512 hash and names its algorithm', async () => {
    const stored = sha512Legacy('old password');

    expect(algorithmOf(stored)).toBe('sha512');
    expect(await verifyPassword(stored, 'old password')).toBe(true);
    expect(await verifyPassword(stored, 'other')).toBe(false);
  });

  it.each(['', 'not a hash', '$argon2id$broken'])(
    'answers false, not an error, for a broken stored value %j',
    async stored => {
      expect(await verifyPassword(stored, 'anything')).toBe(false);
    },
  );
});
