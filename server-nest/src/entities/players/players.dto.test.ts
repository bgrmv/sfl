import { describe, expect, it } from 'vitest';

import { CreatePlayersDTO, UpdatePlayerDTO } from './players.dto';

describe('UpdatePlayerDTO (the whitelist of PATCH /players/:id)', () => {
  it('keeps the allowed fields of the player and of the user', () => {
    expect(
      UpdatePlayerDTO.parse({
        nickname: ' Bomber ',
        number: 9,
        user: { name: 'Gerd', email: 'gerd@sfl.test', age: 30 },
      }),
    ).toEqual({
      nickname: 'Bomber',
      number: 9,
      user: { name: 'Gerd', email: 'gerd@sfl.test', age: 30 },
    });
  });

  it('drops what is not on the list: roles, password, id, metadata', () => {
    const parsed = UpdatePlayerDTO.parse({
      nickname: 'x',
      metadata: { hacked: true },
      user: { id: 'other', password: 'plain', roles: [], name: 'A' },
    });

    expect(parsed).toEqual({ nickname: 'x', user: { name: 'A' } });
  });

  it.each([
    ['an empty nickname', { nickname: '' }],
    ['number 0', { number: 0 }],
    ['an unknown status', { status: 'FLYING' }],
    ['an invalid email', { user: { email: 'nope' } }],
    ['age 200', { user: { age: 200 } }],
  ])('rejects %s', (_name, body) => {
    expect(UpdatePlayerDTO.safeParse(body).success).toBe(false);
  });
});

describe('CreatePlayersDTO (POST /players)', () => {
  const person = {
    nickname: 'Keeper',
    number: 1,
    user: { email: 'k@sfl.test' },
  };

  it('accepts a list of players with their users', () => {
    expect(CreatePlayersDTO.parse([person])).toEqual([person]);
  });

  it.each([
    ['an empty list', []],
    ['not a list', person],
    ['no user', [{ nickname: 'x' }]],
    ['an invalid email', [{ nickname: 'x', user: { email: 'nope' } }]],
    ['an empty nickname', [{ nickname: '', user: { email: 'a@b.co' } }]],
    ['101 players', Array.from({ length: 101 }, () => person)],
  ])('rejects %s', (_name, body) => {
    expect(CreatePlayersDTO.safeParse(body).success).toBe(false);
  });
});
