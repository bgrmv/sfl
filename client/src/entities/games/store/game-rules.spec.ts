import { EnumGameStatus, EnumPlayerPosition } from '@sfl/schemas';
import { describe, expect, it } from 'vitest';

import { validateGameRules } from './game-rules';

const teams = [
  { id: 't1', name: 'White' },
  { id: 't2', name: 'Red' },
];

const row = (
  playerId: string,
  teamId: string,
  overrides: Record<string, unknown> = {},
) => ({
  playerId,
  teamId,
  isCaptain: false,
  position: EnumPlayerPosition.Midfielder as EnumPlayerPosition | null,
  playerData: { nickname: `Nick ${playerId}` },
  ...overrides,
});

const good = [
  row('p1', 't1', { isCaptain: true }),
  row('p2', 't2', { isCaptain: true }),
];

describe('validateGameRules (the rules of the server, as form messages)', () => {
  it('a good game has no errors', () => {
    expect(
      validateGameRules({
        status: EnumGameStatus.Published,
        teams,
        statistics: good,
      }).size,
    ).toBe(0);
  });

  it('names the team that has no captain', () => {
    const errors = validateGameRules({
      status: EnumGameStatus.Draft,
      teams,
      statistics: [row('p1', 't1', { isCaptain: true }), row('p2', 't2')],
    });

    expect([...errors.values()]).toEqual([
      'Team Red needs exactly one captain',
    ]);
  });

  it('names the team that has two captains', () => {
    const errors = validateGameRules({
      status: EnumGameStatus.Draft,
      teams,
      statistics: [...good, row('p3', 't1', { isCaptain: true })],
    });

    expect([...errors.values()]).toEqual([
      'Team White needs exactly one captain',
    ]);
  });

  it('a team without players is not reported twice', () => {
    const errors = validateGameRules({
      status: EnumGameStatus.Draft,
      teams,
      statistics: [row('p1', 't1', { isCaptain: true })],
    });

    expect(errors.size).toBe(0);
  });

  it('a published game names every player without a position', () => {
    const errors = validateGameRules({
      status: EnumGameStatus.Published,
      teams,
      statistics: [
        ...good,
        row('p3', 't1', { position: null }),
        row('p4', 't2', { position: null }),
      ],
    });

    expect([...errors.values()]).toEqual([
      'Nick p3 needs a position: a published game requires it',
      'Nick p4 needs a position: a published game requires it',
    ]);
  });

  it('a draft and a new game may have players without a position', () => {
    for (const status of [EnumGameStatus.Draft, EnumGameStatus.New]) {
      expect(
        validateGameRules({
          status,
          teams,
          statistics: [...good, row('p3', 't1', { position: null })],
        }).size,
      ).toBe(0);
    }
  });

  it('the same game becomes valid when it is turned back into a draft', () => {
    const statistics = [...good, row('p3', 't1', { position: null })];

    expect(
      validateGameRules({ status: EnumGameStatus.Published, teams, statistics })
        .size,
    ).toBe(1);
    expect(
      validateGameRules({ status: EnumGameStatus.Draft, teams, statistics })
        .size,
    ).toBe(0);
  });
});
