import { describe, expect, it } from 'vitest';

import { SetPasswordDTO } from './users.dto';

describe('SetPasswordDTO', () => {
  it('accepts 8 to 128 characters', () => {
    expect(SetPasswordDTO.safeParse({ password: '12345678' }).success).toBe(
      true,
    );
    expect(
      SetPasswordDTO.safeParse({ password: 'x'.repeat(128) }).success,
    ).toBe(true);
  });

  it.each([
    ['too short', { password: '1234567' }],
    ['too long', { password: 'x'.repeat(129) }],
    ['missing', {}],
    ['not a string', { password: 12345678 }],
  ])('rejects a password that is %s', (_name, body) => {
    expect(SetPasswordDTO.safeParse(body).success).toBe(false);
  });
});
