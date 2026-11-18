import { describe, expect, it } from 'vitest';

import { CreatePlayersDTO, UpdatePlayerDTO } from './players.dto';

describe('UpdatePlayerDTO (the whitelist of PATCH /players/:id)', () => {
  it('keeps the allowed fields of the player and of the user', () => {
    expect(
      UpdatePlayerDTO.parse({
        nickname: ' Bomber ',
        number: 9,
        user: { name: 'Gerd', email: 'gerd@sfl.test' },
      }),
    ).toEqual({
      nickname: 'Bomber',
      number: 9,
      user: { name: 'Gerd', email: 'gerd@sfl.test' },
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
    ['a birth date that is not a date', { user: { birthDate: '1990-13-40' } }],
    ['a birth date in the future', { user: { birthDate: '2999-01-01' } }],
    ['a birth date before 1900', { user: { birthDate: '1899-12-31' } }],
    ['a country in lower case', { user: { country: 'lv' } }],
    ['a three-letter country', { user: { country: 'LVA' } }],
  ])('rejects %s', (_name, body) => {
    expect(UpdatePlayerDTO.safeParse(body).success).toBe(false);
  });
});

describe('UpdatePlayerDTO: personal fields of the user (S3.33)', () => {
  it('turns the birth date into a date and keeps the country code', () => {
    const { user } = UpdatePlayerDTO.parse({
      user: { birthDate: '1990-05-17', country: 'LV' },
    });

    expect(user?.birthDate).toEqual(new Date('1990-05-17T00:00:00.000Z'));
    expect(user?.country).toBe('LV');
  });

  it('lets null clear both fields: many dates are lost for good', () => {
    expect(
      UpdatePlayerDTO.parse({ user: { birthDate: null, country: null } }).user,
    ).toEqual({ birthDate: null, country: null });
  });

  it('no longer knows the old age', () => {
    expect(UpdatePlayerDTO.parse({ user: { age: 30 } }).user).toEqual({});
  });
});

describe('CreatePlayersDTO (POST /players)', () => {
  const person = {
    nickname: 'Keeper',
    number: 1,
    user: { email: 'k@sfl.test' },
  };

  it('accepts a list of players with their users', () => {
    expect(CreatePlayersDTO.parse({ players: [person] })).toEqual({
      players: [person],
    });
  });

  it.each([
    ['an empty list', { players: [] }],
    ['not a list', { players: person }],
    ['a bare array (the old shape)', [person]],
    ['no user', { players: [{ nickname: 'x' }] }],
    [
      'an invalid email',
      { players: [{ nickname: 'x', user: { email: 'nope' } }] },
    ],
    [
      'an empty nickname',
      { players: [{ nickname: '', user: { email: 'a@b.co' } }] },
    ],
    ['101 players', { players: Array.from({ length: 101 }, () => person) }],
  ])('rejects %s', (_name, body) => {
    expect(CreatePlayersDTO.safeParse(body).success).toBe(false);
  });
});
